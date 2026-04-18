#!/usr/bin/env node
/**
 * Generate HTML from post.md + slides.md, screenshot each page with Playwright, write render_report.json.
 *
 * CLI:
 *   node render-assets.mjs --runId=<id> --backendRoot=<abs> --packageRoot=<abs> [--viewport=1080x1920] [--deviceScaleFactor=1]
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const out = {};
  for (const a of argv.slice(2)) {
    if (!a.startsWith("--")) continue;
    const eq = a.indexOf("=");
    if (eq === -1) out[a.slice(2)] = true;
    else out[a.slice(2, eq)] = a.slice(eq + 1);
  }
  return out;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {string} slidesMd
 * @returns {{ index: number; title: string; body: string }[]}
 */
function parseSlideCards(slidesMd) {
  const lines = slidesMd.split(/\r?\n/);
  /** @type {{ index: number; title: string; body: string }[]} */
  const cards = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^##\s+Card\s+(\d+)/i);
    if (m) {
      const index = Number.parseInt(m[1], 10);
      const after = lines[i].replace(/^##\s+Card\s+\d+\s*/i, "").trim();
      const title =
        after.replace(/^[—\-–]\s*/, "").trim() || `Card ${index}`;
      i++;
      const bodyLines = [];
      while (i < lines.length && !/^##\s+Card\s+/i.test(lines[i])) {
        bodyLines.push(lines[i]);
        i++;
      }
      const body = bodyLines.join("\n").trim();
      cards.push({ index, title, body });
    } else {
      i++;
    }
  }
  return cards.sort((a, b) => a.index - b.index);
}

async function main() {
  const args = parseArgs(process.argv);
  const runId = /** @type {string} */ (args.runId);
  const backendRoot = /** @type {string} */ (args.backendRoot);
  const packageRoot = /** @type {string} */ (args.packageRoot || backendRoot);
  const viewportSpec = /** @type {string} */ (args.viewport || "1080x1920");
  const [vwRaw, vhRaw] = viewportSpec.split("x");
  const vw = Number.parseInt(vwRaw, 10) || 1080;
  const vh = Number.parseInt(vhRaw, 10) || 1920;
  const dsf = Number.parseFloat(String(args.deviceScaleFactor || "1")) || 1;

  /** @type {{ status: string; runId: string | null; startedAt: string; finishedAt: string | null; viewport: { width: number; height: number }; pages: object[]; errors: string[] }} */
  const report = {
    status: "ok",
    runId: runId ?? null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    viewport: { width: vw, height: vh },
    pages: [],
    errors: [],
  };

  if (!runId || !backendRoot) {
    report.status = "error";
    report.errors.push("Missing --runId or --backendRoot");
    report.finishedAt = new Date().toISOString();
    console.log(JSON.stringify({ ok: false, report }));
    process.exit(1);
  }

  const outDir = path.join(backendRoot, "output", runId);
  const htmlDir = path.join(outDir, "html");
  const shotDir = path.join(outDir, "screenshots");
  const tmplDir = path.join(
    packageRoot,
    "skills",
    "xhs-workplace-english",
    "assets",
    "templates",
    "html",
  );

  const postMdPath = path.join(outDir, "post.md");
  const slidesMdPath = path.join(outDir, "slides.md");

  try {
    fs.mkdirSync(htmlDir, { recursive: true });
    fs.mkdirSync(shotDir, { recursive: true });

    for (const p of ["styles.css", "slide_card.html", "post_page.html"]) {
      if (!fs.existsSync(path.join(tmplDir, p))) {
        throw new Error(`Missing template file: ${path.join(tmplDir, p)}`);
      }
    }

    const styles = fs.readFileSync(path.join(tmplDir, "styles.css"), "utf8");
    const slideShell = fs.readFileSync(
      path.join(tmplDir, "slide_card.html"),
      "utf8",
    );
    const postShell = fs.readFileSync(
      path.join(tmplDir, "post_page.html"),
      "utf8",
    );

    if (!fs.existsSync(postMdPath)) {
      throw new Error(`Missing post.md: ${postMdPath}`);
    }
    if (!fs.existsSync(slidesMdPath)) {
      throw new Error(`Missing slides.md: ${slidesMdPath}`);
    }

    const postMd = fs.readFileSync(postMdPath, "utf8");
    const slidesMd = fs.readFileSync(slidesMdPath, "utf8");

    const cards = parseSlideCards(slidesMd);
    if (cards.length === 0) {
      throw new Error(
        "No ## Card sections found in slides.md (expected ## Card n — title)",
      );
    }

    /** @type {{ rel: string; abs: string; shot: string }[]} */
    const htmlFiles = [];

    const postHtml = postShell
      .replaceAll("__XHS_STYLES__", styles)
      .replaceAll("__XHS_CONTENT__", escapeHtml(postMd));
    const postHtmlPath = path.join(htmlDir, "post.html");
    fs.writeFileSync(postHtmlPath, postHtml, "utf8");
    htmlFiles.push({
      rel: "html/post.html",
      abs: postHtmlPath,
      shot: "screenshots/post.png",
    });

    for (const card of cards) {
      const n = String(card.index).padStart(2, "0");
      const fn = `slide-${n}.html`;
      const html = slideShell
        .replaceAll("__XHS_STYLES__", styles)
        .replaceAll("__XHS_TITLE__", escapeHtml(card.title))
        .replaceAll("__XHS_BODY__", escapeHtml(card.body));
      const abs = path.join(htmlDir, fn);
      fs.writeFileSync(abs, html, "utf8");
      htmlFiles.push({
        rel: `html/${fn}`,
        abs,
        shot: `screenshots/slide-${n}.png`,
      });
    }

    let chromium;
    try {
      ({ chromium } = await import("playwright"));
    } catch (e) {
      throw new Error(
        `Playwright import failed (${String(e)}). Run: npx playwright install chromium`,
      );
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: vw, height: vh },
      deviceScaleFactor: dsf,
    });
    const page = await context.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        report.errors.push(`console:${msg.text()}`);
      }
    });

    for (const item of htmlFiles) {
      const url = pathToFileURL(item.abs).href;
      await page.goto(url, { waitUntil: "load", timeout: 120_000 });
      const pngAbs = path.join(outDir, item.shot);
      fs.mkdirSync(path.dirname(pngAbs), { recursive: true });
      await page.screenshot({
        path: pngAbs,
        fullPage: true,
      });
      const stat = fs.statSync(pngAbs);
      report.pages.push({
        html: path.posix.join("output", runId, item.rel.replace(/\\/g, "/")),
        png: path.posix.join("output", runId, item.shot.replace(/\\/g, "/")),
        bytes: stat.size,
      });
    }

    await browser.close();
  } catch (e) {
    report.status = "error";
    report.errors.push(
      e instanceof Error ? e.message : typeof e === "string" ? e : String(e),
    );
  }

  report.finishedAt = new Date().toISOString();
  fs.mkdirSync(outDir, { recursive: true });
  const reportPath = path.join(outDir, "render_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  const ok = report.status === "ok";
  console.log(
    JSON.stringify({
      ok,
      reportPath: path.posix.join("output", runId, "render_report.json"),
      report,
    }),
  );
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  const report = {
    status: "error",
    errors: [String(e)],
    finishedAt: new Date().toISOString(),
  };
  console.log(JSON.stringify({ ok: false, report }));
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Generate HTML from post.md + slides.md (Markdown → HTML via marked), screenshot with Playwright, write render_report.json.
 * Strips skeleton instruction labels (e.g. **标题：**、**开头钩子**) and 【配图建议】lines — they are author hints, not final copy.
 *
 * CLI:
 *   node render-assets.mjs --runId=<id> --backendRoot=<abs> --packageRoot=<abs> [--viewport=1080x1920] [--deviceScaleFactor=1]
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { marked } from "marked";

marked.use({
  gfm: true,
  breaks: true,
});

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
 * Remove pack-level title line from slides.md (not shown on cards).
 * @param {string} md
 */
function stripSlidesPreamble(md) {
  return md.replace(/^#\s+Slides[^\n]*\s*\n?/im, "").trim();
}

/**
 * Strip skeleton field labels from post.md; first line becomes markdown H1.
 * Labels match skills/xhs-workplace-english/assets/references/post_skeleton.md
 * @param {string} md
 */
function sanitizePostMarkdown(md) {
  let s = md.replace(/^#\s*小红书笔记[^\n]*\s*\n?/m, "").trim();
  s = s.replace(/^>\s*\*\*Render note:\*\*[^\n]*\n?/gm, "");
  s = s.replace(/\*\*标题：\*\*\s*/g, "# ");
  s = s.replace(/\*\*开头钩子[^*]*\*\*\s*/g, "");
  s = s.replace(/\*\*本期学到：\*\*\s*/g, "");
  s = s.replace(/\*\*对话速览：\*\*\s*/g, "");
  s = s.replace(/\*\*收藏向 CTA：\*\*\s*/g, "");
  s = s.replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

/**
 * Remove 【配图建议】lines and list prefixes like "大标题："/"副标：" (skeleton hints).
 * @param {string} body
 */
function sanitizeSlideBody(body) {
  const lines = body.split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^【配图建议】/.test(t)) continue;
    let m = line.match(/^(\s*-\s*)大标题[：:]\s*(.*)$/);
    if (m) {
      out.push(`${m[1]}${m[2]}`);
      continue;
    }
    m = line.match(/^(\s*-\s*)副标[：:]\s*(.*)$/);
    if (m) {
      out.push(`${m[1]}${m[2]}`);
      continue;
    }
    out.push(line);
  }
  return out.join("\n").trim();
}

/**
 * @param {string} md
 */
function renderMarkdown(md) {
  const src = (md || "").trim();
  if (!src) return "<p></p>";
  return marked.parse(src);
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

    const postMdRaw = fs.readFileSync(postMdPath, "utf8");
    const slidesMdRaw = fs.readFileSync(slidesMdPath, "utf8");

    const postMd = sanitizePostMarkdown(postMdRaw);
    const slidesMd = stripSlidesPreamble(slidesMdRaw);

    const cards = parseSlideCards(slidesMd);
    if (cards.length === 0) {
      throw new Error(
        "No ## Card sections found in slides.md (expected ## Card n — title)",
      );
    }

    /** @type {{ rel: string; abs: string; shot: string }[]} */
    const htmlFiles = [];

    const postHtmlInner = renderMarkdown(postMd);
    const postHtml = postShell
      .replaceAll("__XHS_STYLES__", styles)
      .replaceAll("__XHS_CONTENT_HTML__", postHtmlInner);
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
      const bodyMd = sanitizeSlideBody(card.body);
      const bodyHtml = renderMarkdown(bodyMd);
      const titleEsc = escapeHtml(card.title);
      const html = slideShell
        .replaceAll("__XHS_STYLES__", styles)
        .replaceAll("__XHS_TITLE_ESC__", titleEsc)
        .replaceAll("__XHS_BODY_HTML__", bodyHtml);
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

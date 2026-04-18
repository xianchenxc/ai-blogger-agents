import { spawnSync } from "node:child_process";
import path from "node:path";
import { tool } from "langchain";
import { z } from "zod";
import { PACKAGE_ROOT } from "../paths.js";

const RENDER_SCRIPT = path.join(
  PACKAGE_ROOT,
  "skills",
  "xhs-workplace-english",
  "assets",
  "scripts",
  "render-assets.mjs",
);

/**
 * Tool that runs the bundled render-assets.mjs (HTML + Playwright screenshots + render_report.json).
 */
export function createAssetsRenderTool(backendRoot: string) {
  return tool(
    async ({ runId, viewport }) => {
      const vp = viewport ?? "1080x1920";
      const args = [
        RENDER_SCRIPT,
        `--runId=${runId}`,
        `--backendRoot=${backendRoot}`,
        `--packageRoot=${PACKAGE_ROOT}`,
        `--viewport=${vp}`,
      ];
      const r = spawnSync(process.execPath, args, {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
        windowsHide: true,
      });
      if (r.error) {
        return JSON.stringify({
          ok: false,
          error: String(r.error),
          stderr: (r.stderr ?? "").slice(-4000),
        });
      }
      if (r.status !== 0) {
        return JSON.stringify({
          ok: false,
          exitCode: r.status,
          stdout: (r.stdout ?? "").slice(-8000),
          stderr: (r.stderr ?? "").slice(-8000),
        });
      }
      const out = (r.stdout ?? "").trim();
      const lastLine = out.includes("\n") ? out.split("\n").pop() ?? out : out;
      return lastLine || out;
    },
    {
      name: "xhs_assets_render",
      description:
        "After post.md and slides.md exist under /output/<runId>/, run the bundled script to write html/*.html, screenshots/*.png, and render_report.json (Playwright). Requires local install: npx playwright install chromium. Review stage does not judge pixels; use this for fixed-template renders.",
      schema: z.object({
        runId: z.string().min(1),
        viewport: z
          .string()
          .regex(/^\d+x\d+$/)
          .optional()
          .describe('Viewport WxH, default "1080x1920"'),
      }),
    },
  );
}

import { spawnSync } from "node:child_process";
import path from "node:path";
import { tool } from "langchain";
import { z } from "zod";
import { getRuntimeContext } from "../../../runtime/context.js";

const RENDER_SCRIPT = path.join(
  getRuntimeContext().packageRoot,
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
    async ({ runId, viewport, xhsAccount, deviceScaleFactor }, config) => {
      const runtimeCtx = (
        config?.configurable as
          | {
              agentRuntimeContext?: {
                user?: { xhsAccountName?: string };
              };
            }
          | undefined
      )?.agentRuntimeContext;
      const accountFromRuntime = runtimeCtx?.user?.xhsAccountName?.trim() ?? "";
      const acct = xhsAccount?.trim() || accountFromRuntime;
      if (!acct) {
        return JSON.stringify({
          ok: false,
          error:
            "Missing xhsAccount. Set it in user settings or pass xhsAccount to xhs_assets_render.",
        });
      }

      const vp = viewport ?? "540x720";
      const args = [
        RENDER_SCRIPT,
        `--runId=${runId}`,
        `--backendRoot=${backendRoot}`,
        `--packageRoot=${getRuntimeContext().packageRoot}`,
        `--viewport=${vp}`,
        `--xhsAccount=${acct}`,
      ];
      if (
        deviceScaleFactor !== undefined &&
        Number.isFinite(deviceScaleFactor)
      ) {
        args.push(`--deviceScaleFactor=${deviceScaleFactor}`);
      }
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
        "After slides.md exists under /output/<runId>/, run the bundled script to write html/*.html, screenshots/*.png, and render_report.json (Playwright). post.png reuses Card 1 and slide-01 is skipped. Requires local install: npx playwright install chromium. Review stage does not judge pixels; use this for fixed-template renders.",
      schema: z.object({
        runId: z.string().min(1),
        viewport: z
          .string()
          .regex(/^\d+x\d+$/)
          .optional()
          .describe('Viewport WxH, default "540x720"'),
        deviceScaleFactor: z
          .number()
          .positive()
          .optional()
          .describe(
            "Playwright deviceScaleFactor for PNG output (2 = 2× pixels). Omit for renderer default (2).",
          ),
        xhsAccount: z
          .string()
          .min(1)
          .optional()
          .describe(
            'Xiaohongshu account watermark on cover slide (e.g. "@MyHandle"). Optional override; otherwise uses agentRuntimeContext.user.xhsAccountName.',
          ),
      }),
    },
  );
}

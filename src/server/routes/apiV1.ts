import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { createLogger } from "../logger.js";
import { enqueueInvocation, getInvocation } from "../jobs/invocations.js";
import {
  deleteRun,
  getRun,
  listRunFiles,
  listRuns,
  readRunAssetPath,
  readRunTextFile,
  writeRunMarkdown,
  isReadableTextBasename,
  isEditableMarkdownBasename,
  isAssetBasename,
} from "../history/runs.js";
import type { XhsMessage } from "../../xhs/xhsAgent.js";

function p(v: string | string[] | undefined): string {
  if (v == null) return "";
  return Array.isArray(v) ? (v[0] ?? "") : v;
}

const PostInvocationBodySchema = z
  .object({
    input: z.string().min(1).optional(),
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant", "system"]),
          content: z.string(),
        }),
      )
      .optional(),
    thread_id: z.string().min(1).optional(),
  })
  .refine((b) => Boolean(b.input?.trim()) || Boolean(b.messages?.length), {
    message: "Provide non-empty `input` or `messages`",
  });

export function createV1Router(): Router {
  const r = Router();

  r.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  r.post("/invocations", (req: Request, res: Response) => {
    const log = createLogger(req.correlationId);
    const parsed = PostInvocationBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const { input, messages, thread_id } = parsed.data;
    let invokeInput: string | { messages: XhsMessage[] };
    if (messages?.length) {
      invokeInput = { messages: messages as XhsMessage[] };
    } else if (input) {
      invokeInput = input;
    } else {
      res.status(400).json({ error: "Missing input" });
      return;
    }
    const id = enqueueInvocation(invokeInput, thread_id);
    log.info("invocation_enqueued", { id });
    res.status(202).json({ id });
  });

  r.get("/invocations/:id", (req: Request, res: Response) => {
    const job = getInvocation(p(req.params.id));
    if (!job) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(job);
  });

  r.get("/runs", async (req: Request, res: Response) => {
    const limit = Math.min(
      200,
      Math.max(1, Number.parseInt(String(req.query.limit ?? "50"), 10) || 50),
    );
    const offset = Math.max(
      0,
      Number.parseInt(String(req.query.offset ?? "0"), 10) || 0,
    );
    try {
      const { runs, total } = await listRuns({ limit, offset });
      res.json({ runs, total, limit, offset });
    } catch (e) {
      res.status(500).json({
        error: e instanceof Error ? e.message : "list_runs_failed",
      });
    }
  });

  r.get("/runs/:runId", async (req: Request, res: Response) => {
    const run = await getRun(p(req.params.runId));
    if (!run) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    let files: Awaited<ReturnType<typeof listRunFiles>> = [];
    try {
      files = await listRunFiles(run.runId);
    } catch {
      files = [];
    }
    res.json({ ...run, files });
  });

  r.get("/runs/:runId/files/:basename", async (req: Request, res: Response) => {
    const basename = p(req.params.basename);
    if (!isReadableTextBasename(basename)) {
      res.status(400).json({ error: "File not allowed" });
      return;
    }
    const content = await readRunTextFile(p(req.params.runId), basename);
    if (content === null) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.type("text/plain; charset=utf-8").send(content);
  });

  r.put("/runs/:runId/files/:basename", async (req: Request, res: Response) => {
    const basename = p(req.params.basename);
    if (!isEditableMarkdownBasename(basename)) {
      res.status(400).json({ error: "File not editable" });
      return;
    }
    const body = z.object({ content: z.string() }).safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.flatten() });
      return;
    }
    const ok = await writeRunMarkdown(
      p(req.params.runId),
      basename,
      body.data.content,
    );
    if (!ok) {
      res.status(404).json({ error: "Not found or write failed" });
      return;
    }
    res.json({ ok: true });
  });

  r.get(
    "/runs/:runId/assets/:basename",
    async (req: Request, res: Response) => {
      const basename = p(req.params.basename);
      if (!isAssetBasename(basename)) {
        res.status(400).json({ error: "Asset not allowed" });
        return;
      }
      const abs = await readRunAssetPath(p(req.params.runId), basename);
      if (!abs) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.sendFile(abs);
    },
  );

  r.delete("/runs/:runId", async (req: Request, res: Response) => {
    const ok = await deleteRun(p(req.params.runId));
    if (!ok) {
      res.status(404).json({ error: "Not found or delete failed" });
      return;
    }
    res.status(204).send();
  });

  return r;
}

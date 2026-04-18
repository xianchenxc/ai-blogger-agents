import { randomUUID } from "node:crypto";
import PQueue from "p-queue";
import { xhsAgent, type XhsInvokeInput } from "../../xhs/xhsAgent.js";
import { invocationConcurrency } from "../config.js";

export type InvocationStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export type InvocationJob = {
  id: string;
  status: InvocationStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  /** Best-effort parse from agent result JSON. */
  runIdGuess?: string;
  /** Truncated JSON string for debugging (optional). */
  resultSummary?: string;
};

const jobs = new Map<string, InvocationJob>();

const queue = new PQueue({ concurrency: invocationConcurrency() });

function guessRunIdFromResult(data: unknown): string | undefined {
  let s: string;
  try {
    s = JSON.stringify(data);
  } catch {
    return undefined;
  }
  const matches = s.match(/run-\d{8}-\d{6}/g);
  if (matches?.length) return matches[matches.length - 1];
  const loose = s.match(/run-[\w-]+/g);
  if (loose?.length) return loose[loose.length - 1];
  return undefined;
}

function summarizeResult(data: unknown): string | undefined {
  try {
    const s = JSON.stringify(data);
    const max = 16_000;
    return s.length > max ? `${s.slice(0, max)}…` : s;
  } catch {
    return undefined;
  }
}

/**
 * Enqueues xhsAgent.invoke. Returns invocation id immediately.
 */
export function enqueueInvocation(
  input: XhsInvokeInput,
  threadId?: string,
): string {
  const id = randomUUID();
  const job: InvocationJob = {
    id,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  jobs.set(id, job);

  void queue.add(async () => {
    const j = jobs.get(id);
    if (!j) return;
    j.status = "running";
    j.startedAt = new Date().toISOString();
    try {
      const result = await xhsAgent.invoke(input, {
        configurable: threadId ? { thread_id: threadId } : {},
      });
      j.status = "completed";
      j.finishedAt = new Date().toISOString();
      j.runIdGuess = guessRunIdFromResult(result);
      j.resultSummary = summarizeResult(result);
    } catch (e) {
      j.status = "failed";
      j.finishedAt = new Date().toISOString();
      j.error = e instanceof Error ? e.message : String(e);
    }
  });

  return id;
}

export function getInvocation(id: string): InvocationJob | undefined {
  return jobs.get(id);
}

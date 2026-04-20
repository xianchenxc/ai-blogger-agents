import PQueue from "p-queue";
import type { AgentInvokeInput } from "./agentManager.js";
import { agentManager } from "./agentManager.js";
import { DEFAULT_AGENT_ID } from "./registerDefaultAgents.js";
import { invocationConcurrency } from "../runtime/context.js";

/** Separates agent id from thread key inside invocation ids (must not appear in agent ids). */
const INVOCATION_ID_SEP = "|";

export type InvocationStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export type InvocationJob = {
  id: string;
  agentId: string;
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

export function makeInvocationId(agentId: string, threadId: string): string {
  return `${agentId}${INVOCATION_ID_SEP}${threadId.trim()}`;
}

export type EnqueueInvocationOptions = {
  /** LangGraph / agent thread; must be non-empty (HTTP API generates one if omitted). */
  threadId: string;
  /** Defaults to {@link DEFAULT_AGENT_ID}. */
  agentId?: string;
  /** Per-invocation context passed into runnable configurable.agentRuntimeContext. */
  agentRuntimeContext?: Record<string, unknown>;
};

/**
 * Enqueues `agentManager.runAgent`. Invocation `id` is `agentId|threadId`.
 * @throws if agent is unknown, `threadId` is empty, or a job with the same id is already pending/running.
 */
export function enqueueInvocation(
  input: AgentInvokeInput,
  options: EnqueueInvocationOptions,
): string {
  const agentId = options.agentId?.trim() || DEFAULT_AGENT_ID;
  if (!agentManager.has(agentId)) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  const threadId = options.threadId.trim();
  if (!threadId) {
    throw new Error("threadId is required and must be non-empty");
  }
  const id = makeInvocationId(agentId, threadId);

  const existing = jobs.get(id);
  if (existing?.status === "pending" || existing?.status === "running") {
    throw new Error(
      `Invocation already in progress for agent ${agentId} and this thread`,
    );
  }
  if (existing) {
    jobs.delete(id);
  }

  const job: InvocationJob = {
    id,
    agentId,
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
      const result = await agentManager.runAgent(
        agentId,
        input,
        threadId,
        options.agentRuntimeContext,
      );
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

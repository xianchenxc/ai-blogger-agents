import type { RunnableConfig } from "@langchain/core/runnables";
import { createXhsAgent, type CreateXhsAgentOptions } from "./createXhsAgent.js";

export type XhsMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type XhsInvokeInput =
  | string
  | {
      messages: XhsMessage[];
    };

let cachedAgent: ReturnType<typeof createXhsAgent> | null = null;
let cachedKey = "";

function cacheKey(opts: CreateXhsAgentOptions) {
  return JSON.stringify({
    rootDir: opts.rootDir ?? process.env.XHS_BACKEND_ROOT ?? "",
    memoryPath: opts.memoryPath ?? process.env.XHS_MEMORY_PATH ?? "",
    model: opts.model ?? process.env.XHS_MODEL ?? "",
  });
}

function getAgent(options?: CreateXhsAgentOptions) {
  const opts = options ?? {};
  const key = cacheKey(opts);
  if (!cachedAgent || key !== cachedKey) {
    cachedAgent = createXhsAgent(opts);
    cachedKey = key;
  }
  return cachedAgent;
}

/**
 * Xiaohongshu workplace-English Deep Agent facade.
 * Pass a string (user text) or { messages }.
 */
export const xhsAgent = {
  invoke(
    input: XhsInvokeInput,
    config?: RunnableConfig & {
      /** Agent factory options when first creating the singleton. */
      agentOptions?: CreateXhsAgentOptions;
    },
  ) {
    const { agentOptions, ...runnableConfig } = config ?? {};
    const agent = getAgent(agentOptions);
    const messages =
      typeof input === "string"
        ? [{ role: "user" as const, content: input }]
        : input.messages;
    const threadId =
      (runnableConfig.configurable as { thread_id?: string } | undefined)
        ?.thread_id ?? `xhs-${Date.now()}`;
    return agent.invoke(
      { messages },
      {
        ...runnableConfig,
        recursionLimit: runnableConfig.recursionLimit ?? 80,
        configurable: {
          ...runnableConfig.configurable,
          thread_id: threadId,
        },
      },
    );
  },
};

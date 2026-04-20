import type { RunnableConfig } from "@langchain/core/runnables";
import { MemorySaver } from "@langchain/langgraph";
import { ChatDeepSeek } from "@langchain/deepseek";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { deepseekFlattenMiddleware } from "../../middlewares/deepseekFlattenMiddleware.js";
import { JsonlGenerationMemory } from "../../memory/generationMemoryPort.js";
import { getRuntimeContext } from "../../runtime/context.js";
import { createAssetsRenderTool } from "./tools/assetsRender.js";
import { createMemoryTools } from "./tools/memory.js";

export type XhsMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type XhsInvokeInput =
  | string
  | {
      messages: XhsMessage[];
    };

/** Default LangGraph recursion limit; override via `recursionLimit` or env `XHS_RECURSION_LIMIT`. */
export function defaultXhsRecursionLimit(): number {
  const raw = process.env.XHS_RECURSION_LIMIT;
  if (raw == null || raw.trim() === "") return 160;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 160;
  return Math.min(500, Math.max(20, n));
}

const XHS_SYSTEM_PROMPT = `You are the Xiaohongshu (小红书) "职场英语" production agent.

Pipeline: read **once** \`/skills/xhs-workplace-english/orchestration/SKILL.md\` via read_file, then execute that file end-to-end. Do **not** read other \`*/SKILL.md\` under that pack unless the user explicitly asks to fix one stage.

Hard rules:
- Workplace English for 小红书 only; virtual paths use leading / (\`/skills/...\`, \`/output/...\`).
- After \`post.md\` and \`slides.md\` exist, call \`xhs_assets_render\` once per successful assets batch (Playwright HTML → PNG + \`render_report.json\`).
- On review fail: resume only from \`resume_from\`; do not redo untouched upstream stages.
- On review pass: call \`memory_record_generation\` exactly once with a stable fingerprint.
- Keep artifacts under \`/output/<runId>/\` and \`state.json\` current.`;

const XHS_SKILL_VIRTUAL_ROOTS = ["/skills/xhs-workplace-english/"] as const;

type BuildOptions = {
  rootDir?: string;
  memoryPath?: string;
  model?: string;
};

function buildDeepAgentGraph(options: BuildOptions = {}) {
  const ctx = getRuntimeContext();
  const rootDir = options.rootDir ?? ctx.backendRoot;
  const memoryPath = options.memoryPath ?? ctx.memoryFilePath;
  const modelName = options.model ?? process.env.XHS_MODEL ?? "deepseek-chat";
  const model = new ChatDeepSeek({
    model: modelName,
    temperature: 0.35,
  });
  const memoryTools = createMemoryTools(new JsonlGenerationMemory(memoryPath));
  const assetsRenderTool = createAssetsRenderTool(rootDir);

  return createDeepAgent({
    name: "xhs-workplace-english",
    model,
    middleware: [deepseekFlattenMiddleware],
    tools: [...memoryTools, assetsRenderTool],
    systemPrompt: XHS_SYSTEM_PROMPT,
    checkpointer: new MemorySaver(),
    backend: new FilesystemBackend({ rootDir, virtualMode: true }),
    skills: [...XHS_SKILL_VIRTUAL_ROOTS],
  });
}

let graphSingleton: ReturnType<typeof buildDeepAgentGraph> | null = null;

/** Shared LangGraph deep agent (lazy, from env + runtime context). */
export function getXhsAgent(): ReturnType<typeof buildDeepAgentGraph> {
  if (!graphSingleton) graphSingleton = buildDeepAgentGraph();
  return graphSingleton;
}

/**
 * HTTP / AgentManager entry: normalizes input and thread, then invokes the deep graph.
 * For CLI, `thread_id` may be omitted (auto `xhs-<timestamp>`).
 */
export const xhsAgent = {
  invoke(input: XhsInvokeInput, config?: RunnableConfig) {
    const runnableConfig = config ?? {};
    const graph = getXhsAgent();
    const messages =
      typeof input === "string"
        ? [{ role: "user" as const, content: input }]
        : input.messages;
    const threadId =
      (runnableConfig.configurable as { thread_id?: string } | undefined)
        ?.thread_id ?? `xhs-${Date.now()}`;
    return graph.invoke(
      { messages },
      {
        ...runnableConfig,
        recursionLimit:
          runnableConfig.recursionLimit ?? defaultXhsRecursionLimit(),
        configurable: {
          ...runnableConfig.configurable,
          thread_id: threadId,
        },
      },
    );
  },
};

import path from "node:path";
import { MemorySaver } from "@langchain/langgraph";
import { ChatDeepSeek } from "@langchain/deepseek";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { deepseekFlattenMiddleware } from "../middlewares/deepseekFlattenMiddleware.js";
import { PACKAGE_ROOT } from "../paths.js";
import { createAssetsRenderTool } from "./assetsRenderTool.js";
import { createMemoryTools } from "./memoryTools.js";

export type CreateXhsAgentOptions = {
  /** Virtual FS root; defaults to package root or `XHS_BACKEND_ROOT`. */
  rootDir?: string;
  /** Long-term memory JSONL path; defaults to `XHS_MEMORY_PATH` or package `data/memory/generations.jsonl`. */
  memoryPath?: string;
  /** DeepSeek model id, e.g. `deepseek-chat`. */
  model?: string;
};

const XHS_SYSTEM_PROMPT = `You are the Xiaohongshu (小红书) "职场英语" production agent.

Pipeline: read **once** \`/skills/xhs-workplace-english/orchestration/SKILL.md\` via read_file, then execute that file end-to-end. Do **not** read other \`*/SKILL.md\` under that pack unless the user explicitly asks to fix one stage.

Hard rules:
- Workplace English for 小红书 only; virtual paths use leading / (\`/skills/...\`, \`/output/...\`).
- After \`post.md\` and \`slides.md\` exist, call \`xhs_assets_render\` once per successful assets batch (Playwright HTML → PNG + \`render_report.json\`).
- On review fail: resume only from \`resume_from\`; do not redo untouched upstream stages.
- On review pass: call \`memory_record_generation\` exactly once with a stable fingerprint.
- Keep artifacts under \`/output/<runId>/\` and \`state.json\` current.`;

export function createXhsAgent(options: CreateXhsAgentOptions = {}) {
  const rootDir =
    options.rootDir ?? process.env.XHS_BACKEND_ROOT ?? PACKAGE_ROOT;
  const memoryPath =
    options.memoryPath ??
    process.env.XHS_MEMORY_PATH ??
    path.join(PACKAGE_ROOT, "data", "memory", "generations.jsonl");

  const modelName = options.model ?? process.env.XHS_MODEL ?? "deepseek-chat";
  const model = new ChatDeepSeek({
    model: modelName,
    temperature: 0.35,
  });

  const memoryTools = createMemoryTools(memoryPath);
  const assetsRenderTool = createAssetsRenderTool(rootDir);

  return createDeepAgent({
    name: "xhs-workplace-english",
    model,
    middleware: [deepseekFlattenMiddleware],
    tools: [...memoryTools, assetsRenderTool],
    systemPrompt: XHS_SYSTEM_PROMPT,
    checkpointer: new MemorySaver(),
    backend: new FilesystemBackend({ rootDir, virtualMode: true }),
    skills: ["/skills/xhs-workplace-english/"],
  });
}

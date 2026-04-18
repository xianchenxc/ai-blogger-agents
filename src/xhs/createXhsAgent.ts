import path from "node:path";
import { MemorySaver } from "@langchain/langgraph";
import { ChatDeepSeek } from "@langchain/deepseek";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { deepseekFlattenMiddleware } from "../middlewares/deepseekFlattenMiddleware.js";
import { PACKAGE_ROOT } from "../paths.js";
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

Always prefer the bundled skills under /skills/xhs-workplace-english/ (orchestration, topic, knowledge, dialogue, assets, review). Match the user task to skill descriptions, read the full SKILL.md via read_file, then execute.

Hard rules:
- Category is workplace English only; output is for 小红书-style short learning posts.
- Use virtual paths starting with / (e.g. /skills/..., /output/...) when reading or writing files.
- For a full new post: follow orchestration → topic → knowledge → dialogue → assets → review.
- On review fail: resume only from resume_from; do not redo untouched upstream stages.
- On review pass: call memory_record_generation exactly once with a stable fingerprint.
- Keep run artifacts under /output/<runId>/ and keep state.json updated.`;

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

  return createDeepAgent({
    name: "xhs-workplace-english",
    model,
    middleware: [deepseekFlattenMiddleware],
    tools: [...memoryTools],
    systemPrompt: XHS_SYSTEM_PROMPT,
    checkpointer: new MemorySaver(),
    backend: new FilesystemBackend({ rootDir, virtualMode: true }),
    skills: ["/skills/xhs-workplace-english/"],
  });
}

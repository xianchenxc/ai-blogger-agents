import { resolvePackageRoot } from "./runtime/context.js";

/** Repository root (contains package.json, skills/, web/). */
export const PACKAGE_ROOT = resolvePackageRoot();

export { deepseekFlattenMiddleware } from "./middlewares/deepseekFlattenMiddleware.js";
export {
  getXhsAgent,
  xhsAgent,
  type XhsInvokeInput,
  type XhsMessage,
} from "./agents/index.js";
export type { RuntimeContext } from "./runtime/context.js";
export {
  createRuntimeContextFromEnv,
  getRuntimeContext,
  resolvePackageRoot,
} from "./runtime/context.js";
export type {
  GenerationMemoryPort,
  GenerationRecord,
} from "./memory/generationMemoryPort.js";
export type { AgentInvokeInput, InvokableAgent } from "./application/agentManager.js";
export { AgentManager, agentManager } from "./application/agentManager.js";
export {
  DEFAULT_AGENT_ID,
  registerDefaultAgents,
} from "./application/registerDefaultAgents.js";
export { makeInvocationId } from "./application/invocations.js";

import { xhsAgent } from "../agents/index.js";
import { agentManager } from "./agentManager.js";

/** Default agent when API omits `agent_id`. */
export const DEFAULT_AGENT_ID = "xhs-workplace-english";

/**
 * Registers built-in agents. Call once at process startup (e.g. from server main).
 */
export function registerDefaultAgents(): void {
  agentManager.register(DEFAULT_AGENT_ID, xhsAgent);
}

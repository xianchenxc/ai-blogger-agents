import type { RunnableConfig } from "@langchain/core/runnables";

/** Input accepted by registered agents (string user turn or full message list). */
export type AgentInvokeInput =
  | string
  | {
      messages: Array<{
        role: "user" | "assistant" | "system";
        content: string;
      }>;
    };

/** Minimal contract for anything the invocation queue can run. */
export interface InvokableAgent {
  invoke(
    input: AgentInvokeInput,
    config?: RunnableConfig,
  ): Promise<unknown>;
}

/**
 * Registers agents and runs them by id (used by the invocation queue and HTTP API).
 */
export class AgentManager {
  private readonly agents = new Map<string, InvokableAgent>();

  register(id: string, agent: InvokableAgent): void {
    if (this.agents.has(id)) {
      throw new Error(`Agent already registered: ${id}`);
    }
    this.agents.set(id, agent);
  }

  get(id: string): InvokableAgent | undefined {
    return this.agents.get(id);
  }

  has(id: string): boolean {
    return this.agents.has(id);
  }

  listIds(): string[] {
    return [...this.agents.keys()];
  }

  /**
   * Resolves a registered agent and invokes it with a LangGraph thread id.
   */
  async runAgent(
    agentId: string,
    input: AgentInvokeInput,
    threadId: string,
  ): Promise<unknown> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Unknown agent: ${agentId}`);
    }
    return agent.invoke(input, {
      configurable: { thread_id: threadId },
    });
  }
}

/** Process-wide agent registry and runner. */
export const agentManager = new AgentManager();

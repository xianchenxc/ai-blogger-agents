import { tool } from "langchain";
import { z } from "zod";
import type {
  GenerationMemoryPort,
  GenerationRecord,
} from "../../../memory/generationMemoryPort.js";

export type { GenerationRecord } from "../../../memory/generationMemoryPort.js";

export function createMemoryTools(memory: GenerationMemoryPort) {
  const memory_search_recent = tool(
    async ({ limit, query }) => {
      const lim = limit ?? 30;
      const entries = memory.searchRecent({ limit: lim, query });
      return JSON.stringify({ entries });
    },
    {
      name: "memory_search_recent",
      description:
        "Read recent XHS generation records from long-term memory (JSONL). Call before picking a new topic to avoid duplicates. Optional query filters title/tags/fingerprint.",
      schema: z.object({
        limit: z.number().int().min(1).max(200).optional(),
        query: z.string().optional(),
      }),
    },
  );

  const memory_record_generation = tool(
    async ({ fingerprint, title, tags, paths }) => {
      const rec: GenerationRecord = {
        fingerprint,
        title,
        tags: tags ?? [],
        paths: paths ?? [],
        createdAt: new Date().toISOString(),
      };
      memory.append(rec);
      return JSON.stringify({ ok: true, recorded: rec });
    },
    {
      name: "memory_record_generation",
      description:
        "Append one generation record after review PASS, for cross-run deduplication. Use stable fingerprint (e.g. normalized title + key tags).",
      schema: z.object({
        fingerprint: z.string().min(1),
        title: z.string().min(1),
        tags: z.array(z.string()).optional(),
        paths: z.array(z.string()).optional(),
      }),
    },
  );

  return [memory_search_recent, memory_record_generation] as const;
}

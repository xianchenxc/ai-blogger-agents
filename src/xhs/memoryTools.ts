import fs from "node:fs";
import { tool } from "langchain";
import { z } from "zod";
import {
  ensureDirForFile,
  parseJsonl,
  type GenerationRecord,
} from "../memory/generationsJsonl.js";

export type { GenerationRecord } from "../memory/generationsJsonl.js";

export function createMemoryTools(memoryPath: string) {
  const memory_search_recent = tool(
    async ({ limit, query }) => {
      const lim = limit ?? 30;
      if (!fs.existsSync(memoryPath)) {
        return JSON.stringify({ entries: [] as GenerationRecord[] });
      }
      const raw = fs.readFileSync(memoryPath, "utf8");
      let entries = parseJsonl(raw).sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : -1,
      );
      if (query?.trim()) {
        const q = query.trim().toLowerCase();
        entries = entries.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            e.fingerprint.toLowerCase().includes(q) ||
            (e.tags ?? []).some((t) => t.toLowerCase().includes(q)),
        );
      }
      return JSON.stringify({
        entries: entries.slice(0, Math.min(Math.max(lim, 1), 200)),
      });
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
      ensureDirForFile(memoryPath);
      const rec: GenerationRecord = {
        fingerprint,
        title,
        tags: tags ?? [],
        paths: paths ?? [],
        createdAt: new Date().toISOString(),
      };
      fs.appendFileSync(memoryPath, `${JSON.stringify(rec)}\n`, "utf8");
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

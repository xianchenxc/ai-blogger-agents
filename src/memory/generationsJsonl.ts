import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

export const GenerationRecordSchema = z.object({
  fingerprint: z.string(),
  title: z.string(),
  tags: z.array(z.string()).optional(),
  paths: z.array(z.string()).optional(),
  createdAt: z.string(),
});

export type GenerationRecord = z.infer<typeof GenerationRecordSchema>;

/** Parse JSONL content into validated records (skips bad lines). */
export function parseJsonl(content: string): GenerationRecord[] {
  const out: GenerationRecord[] = [];
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const row = GenerationRecordSchema.safeParse(JSON.parse(t));
      if (row.success) out.push(row.data);
    } catch {
      // skip bad lines
    }
  }
  return out;
}

export function readGenerationRecords(memoryPath: string): GenerationRecord[] {
  if (!fs.existsSync(memoryPath)) return [];
  const raw = fs.readFileSync(memoryPath, "utf8");
  return parseJsonl(raw);
}

/** True if any path in the record references this run directory. */
export function recordReferencesRunId(
  rec: GenerationRecord,
  runId: string,
): boolean {
  const needle = `/output/${runId}/`;
  const paths = rec.paths ?? [];
  return paths.some((p) => p.includes(needle) || p.endsWith(`/${runId}`));
}

/** Rewrite JSONL file without lines whose paths reference runId. */
export function removeRecordsReferencingRunId(
  memoryPath: string,
  runId: string,
): void {
  if (!fs.existsSync(memoryPath)) return;
  const raw = fs.readFileSync(memoryPath, "utf8");
  const kept = parseJsonl(raw).filter((r) => !recordReferencesRunId(r, runId));
  const lines = kept.map((r) => JSON.stringify(r)).join("\n");
  const out = lines ? `${lines}\n` : "";
  fs.writeFileSync(memoryPath, out, "utf8");
}

export function ensureDirForFile(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

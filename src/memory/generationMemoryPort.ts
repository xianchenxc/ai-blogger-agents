import fs from "node:fs";
import { getRuntimeContext } from "../runtime/context.js";
import {
  ensureDirForFile,
  parseJsonl,
  readGenerationRecords,
  removeRecordsReferencingRunId as removeRecordsByRunIdFromFile,
  type GenerationRecord,
} from "./generationsJsonl.js";

export type { GenerationRecord } from "./generationsJsonl.js";

/** Long-term generation memory (read / filter / append / prune by run). */
export interface GenerationMemoryPort {
  readAll(): GenerationRecord[];
  searchRecent(options: { limit: number; query?: string }): GenerationRecord[];
  append(record: GenerationRecord): void;
  removeRecordsReferencingRunId(runId: string): void;
}

export class JsonlGenerationMemory implements GenerationMemoryPort {
  constructor(private readonly filePath: string) {}

  readAll(): GenerationRecord[] {
    return readGenerationRecords(this.filePath);
  }

  searchRecent(options: { limit: number; query?: string }): GenerationRecord[] {
    const lim = options.limit;
    if (!fs.existsSync(this.filePath)) {
      return [];
    }
    const raw = fs.readFileSync(this.filePath, "utf8");
    let entries = parseJsonl(raw).sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1,
    );
    const query = options.query;
    if (query?.trim()) {
      const q = query.trim().toLowerCase();
      entries = entries.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.fingerprint.toLowerCase().includes(q) ||
          (e.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }
    return entries.slice(0, Math.min(Math.max(lim, 1), 200));
  }

  append(record: GenerationRecord): void {
    ensureDirForFile(this.filePath);
    fs.appendFileSync(this.filePath, `${JSON.stringify(record)}\n`, "utf8");
  }

  removeRecordsReferencingRunId(runId: string): void {
    removeRecordsByRunIdFromFile(this.filePath, runId);
  }
}

let sharedPort: GenerationMemoryPort | null = null;

/** Process-wide JSONL memory (path from runtime context). */
export function getGenerationMemoryPort(): GenerationMemoryPort {
  if (!sharedPort) {
    sharedPort = new JsonlGenerationMemory(getRuntimeContext().memoryFilePath);
  }
  return sharedPort;
}

import fs from "node:fs/promises";
import path from "node:path";
import { recordReferencesRunId, type GenerationRecord } from "../../memory/generationsJsonl.js";
import { getGenerationMemoryPort } from "../../memory/generationMemoryPort.js";
import { backendRoot } from "../config.js";

const EDITABLE_MD = new Set([
  "topic.md",
  "knowledge.md",
  "dialogue.md",
  "post.md",
  "slides.md",
]);

const READABLE_TEXT = new Set([...EDITABLE_MD, "state.json"]);

function outputRoot(): string {
  return path.join(backendRoot(), "output");
}

function safeBasename(name: string): boolean {
  if (!name || name.length > 240) return false;
  if (name.includes("/") || name.includes("\\") || name.includes(".."))
    return false;
  return true;
}

export function isReadableTextBasename(basename: string): boolean {
  return safeBasename(basename) && READABLE_TEXT.has(basename);
}

export function isEditableMarkdownBasename(basename: string): boolean {
  return safeBasename(basename) && EDITABLE_MD.has(basename);
}

/** PNG under screenshots/ only; basename e.g. slide-01.png */
export function isAssetBasename(basename: string): boolean {
  if (!safeBasename(basename)) return false;
  if (!basename.toLowerCase().endsWith(".png")) return false;
  return /^[\w.-]+\.png$/i.test(basename);
}

export type RunListItem = {
  runId: string;
  updatedAt: string;
  state: Record<string, unknown> | null;
  memory?: Pick<GenerationRecord, "title" | "tags" | "fingerprint" | "createdAt">;
};

function stripPreviewFields(
  state: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!state) return null;
  const next: Record<string, unknown> = { ...state };
  delete next.preview;
  delete next.previews;
  delete next.review;
  return next;
}

function memoryMatchForRun(
  records: GenerationRecord[],
  runId: string,
): GenerationRecord | undefined {
  return records.find((r) => recordReferencesRunId(r, runId));
}

export async function listRuns(options: {
  limit: number;
  offset: number;
}): Promise<{ runs: RunListItem[]; total: number }> {
  const root = outputRoot();
  let names: string[] = [];
  try {
    names = await fs.readdir(root);
  } catch {
    return { runs: [], total: 0 };
  }
  const memory = getGenerationMemoryPort().readAll();
  const items: RunListItem[] = [];
  for (const name of names) {
    const runDir = path.join(root, name);
    const st = await fs.stat(runDir).catch(() => null);
    if (!st?.isDirectory()) continue;
    const statePath = path.join(runDir, "state.json");
    const stateStat = await fs.stat(statePath).catch(() => null);
    if (!stateStat?.isFile()) continue;
    let state: Record<string, unknown> | null = null;
    try {
      const raw = await fs.readFile(statePath, "utf8");
      state = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      state = null;
    }
    const runId = (state?.runId as string | undefined) ?? name;
    const mem = memoryMatchForRun(memory, runId);
    items.push({
      runId,
      updatedAt: stateStat.mtime.toISOString(),
      state: stripPreviewFields(state),
      memory: mem
        ? {
            title: mem.title,
            tags: mem.tags,
            fingerprint: mem.fingerprint,
            createdAt: mem.createdAt,
          }
        : undefined,
    });
  }
  items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const total = items.length;
  const slice = items.slice(
    options.offset,
    options.offset + Math.max(1, options.limit),
  );
  return { runs: slice, total };
}

export async function getRun(runId: string): Promise<RunListItem | null> {
  const runDir = path.join(outputRoot(), runId);
  const statePath = path.join(runDir, "state.json");
  try {
    await fs.access(statePath);
  } catch {
    return null;
  }
  const stateStat = await fs.stat(statePath);
  let state: Record<string, unknown> | null = null;
  try {
    const raw = await fs.readFile(statePath, "utf8");
    state = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    state = null;
  }
  const memory = getGenerationMemoryPort().readAll();
  const mem = memoryMatchForRun(memory, runId);
  return {
    runId: (state?.runId as string | undefined) ?? runId,
    updatedAt: stateStat.mtime.toISOString(),
    state: stripPreviewFields(state),
    memory: mem
      ? {
          title: mem.title,
          tags: mem.tags,
          fingerprint: mem.fingerprint,
          createdAt: mem.createdAt,
        }
      : undefined,
  };
}

export type RunFileEntry = {
  name: string;
  kind: "file" | "dir";
  size?: number;
};

export async function listRunFiles(runId: string): Promise<RunFileEntry[]> {
  const runDir = path.join(outputRoot(), runId);
  const entries = await fs.readdir(runDir, { withFileTypes: true }).catch(() => []);
  const out: RunFileEntry[] = [];
  for (const e of entries) {
    const full = path.join(runDir, e.name);
    if (e.isDirectory()) {
      out.push({ name: `${e.name}/`, kind: "dir" });
    } else if (e.isFile()) {
      const st = await fs.stat(full);
      out.push({ name: e.name, kind: "file", size: st.size });
    }
  }

  const shotDir = path.join(runDir, "screenshots");
  try {
    const dirSt = await fs.stat(shotDir);
    if (dirSt.isDirectory()) {
      const shots = await fs.readdir(shotDir, { withFileTypes: true });
      for (const e of shots) {
        if (!e.isFile()) continue;
        if (!e.name.toLowerCase().endsWith(".png")) continue;
        const full = path.join(shotDir, e.name);
        const st = await fs.stat(full);
        out.push({ name: e.name, kind: "file", size: st.size });
      }
    }
  } catch {
    // no screenshots dir
  }

  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export async function readRunTextFile(
  runId: string,
  basename: string,
): Promise<string | null> {
  if (!isReadableTextBasename(basename)) return null;
  const p = path.join(outputRoot(), runId, basename);
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

export async function writeRunMarkdown(
  runId: string,
  basename: string,
  content: string,
): Promise<boolean> {
  if (!isEditableMarkdownBasename(basename)) return false;
  const p = path.join(outputRoot(), runId, basename);
  try {
    await fs.writeFile(p, content, "utf8");
    return true;
  } catch {
    return false;
  }
}

export async function readRunAssetPath(
  runId: string,
  basename: string,
): Promise<string | null> {
  if (!isAssetBasename(basename)) return null;
  const p = path.join(outputRoot(), runId, "screenshots", basename);
  try {
    await fs.access(p);
    return p;
  } catch {
    return null;
  }
}

export async function deleteRun(runId: string): Promise<boolean> {
  if (!safeBasename(runId)) return false;
  const runDir = path.join(outputRoot(), runId);
  try {
    await fs.rm(runDir, { recursive: true, force: true });
  } catch {
    return false;
  }
  getGenerationMemoryPort().removeRecordsReferencingRunId(runId);
  return true;
}

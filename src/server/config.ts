import path from "node:path";
import { PACKAGE_ROOT } from "../paths.js";

export function backendRoot(): string {
  return process.env.XHS_BACKEND_ROOT?.trim() || PACKAGE_ROOT;
}

export function memoryPathDefault(): string {
  const raw = process.env.XHS_MEMORY_PATH?.trim();
  if (raw) return raw;
  return path.join(PACKAGE_ROOT, "data", "memory", "generations.jsonl");
}

export function apiPort(): number {
  const raw = process.env.API_PORT;
  const n = raw ? Number.parseInt(raw, 10) : 3840;
  return Number.isFinite(n) && n > 0 && n < 65536 ? n : 3840;
}

export function adminApiToken(): string | undefined {
  const t = process.env.ADMIN_API_TOKEN?.trim();
  return t || undefined;
}

/** Comma-separated origins; * allows any (dev only). */
export function corsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) return ["http://localhost:5173", "http://127.0.0.1:5173"];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function invocationConcurrency(): number {
  const raw = process.env.XHS_INVOCATION_CONCURRENCY;
  const n = raw ? Number.parseInt(raw, 10) : 1;
  if (!Number.isFinite(n)) return 1;
  return Math.min(8, Math.max(1, n));
}

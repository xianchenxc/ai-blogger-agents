import { getRuntimeContext } from "../runtime/context.js";

export function backendRoot(): string {
  return getRuntimeContext().backendRoot;
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

export { invocationConcurrency } from "../runtime/context.js";

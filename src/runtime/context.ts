import path from "node:path";
import { fileURLToPath } from "node:url";

/** Resolved filesystem layout for the Node process (package vs backend vs memory). */
export type RuntimeContext = {
  readonly packageRoot: string;
  readonly backendRoot: string;
  readonly memoryFilePath: string;
};

let cached: RuntimeContext | null = null;

/** Repository root (package.json, skills/, web/). */
export function resolvePackageRoot(): string {
  return path.resolve(
    fileURLToPath(new URL("../..", import.meta.url)),
  );
}

/**
 * Build paths from environment. Call once at startup or use `getRuntimeContext()`.
 */
export function createRuntimeContextFromEnv(
  overrides?: Partial<
    Pick<RuntimeContext, "packageRoot" | "backendRoot" | "memoryFilePath">
  >,
): RuntimeContext {
  const packageRoot = overrides?.packageRoot ?? resolvePackageRoot();
  const backendRoot =
    overrides?.backendRoot ??
    (process.env.XHS_BACKEND_ROOT?.trim() || packageRoot);
  const memoryFilePath =
    overrides?.memoryFilePath ??
    (process.env.XHS_MEMORY_PATH?.trim() ||
      path.join(packageRoot, "data", "memory", "generations.jsonl"));
  return Object.freeze({ packageRoot, backendRoot, memoryFilePath });
}

/** Singleton context for the process (lazy, from env at first access). */
export function getRuntimeContext(): RuntimeContext {
  if (!cached) cached = createRuntimeContextFromEnv();
  return cached;
}

export function invocationConcurrency(): number {
  const raw = process.env.XHS_INVOCATION_CONCURRENCY;
  const n = raw ? Number.parseInt(raw, 10) : 1;
  if (!Number.isFinite(n)) return 1;
  return Math.min(8, Math.max(1, n));
}

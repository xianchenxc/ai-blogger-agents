import path from "node:path";
import { fileURLToPath } from "node:url";

/** Repository root (contains package.json, skills/, output/). */
export const PACKAGE_ROOT = path.resolve(
  fileURLToPath(new URL("..", import.meta.url)),
);

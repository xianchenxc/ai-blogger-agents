import fs from "node:fs/promises";
import path from "node:path";
import { backendRoot } from "../config.js";

export type UserSettings = {
  xhsAccountName: string;
};

const DEFAULT_USER_SETTINGS: UserSettings = Object.freeze({
  xhsAccountName: "",
});

function settingsPath(): string {
  return path.join(backendRoot(), "data", "user-settings.json");
}

export async function readUserSettings(): Promise<UserSettings> {
  const p = settingsPath();
  try {
    const raw = await fs.readFile(p, "utf8");
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      xhsAccountName:
        typeof parsed.xhsAccountName === "string" ? parsed.xhsAccountName : "",
    };
  } catch {
    return { ...DEFAULT_USER_SETTINGS };
  }
}

export async function writeUserSettings(
  incoming: Partial<UserSettings>,
): Promise<UserSettings> {
  const p = settingsPath();
  const next: UserSettings = {
    xhsAccountName:
      typeof incoming.xhsAccountName === "string"
        ? incoming.xhsAccountName.trim()
        : "",
  };
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

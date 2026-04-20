const API = "/api/v1";

export function authHeaders(): HeadersInit {
  const t = localStorage.getItem("admin_api_token")?.trim();
  if (!t) return {};
  return { Authorization: `Bearer ${t}` };
}

export type InvocationJob = {
  id: string;
  agentId: string;
  status: "pending" | "running" | "completed" | "failed";
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  runIdGuess?: string;
  resultSummary?: string;
};

export type RunListItem = {
  runId: string;
  updatedAt: string;
  state: Record<string, unknown> | null;
  memory?: {
    title: string;
    tags?: string[];
    fingerprint: string;
    createdAt: string;
  };
};

export type RunFileEntry = {
  name: string;
  kind: "file" | "dir";
  size?: number;
};

export type UserSettings = {
  xhsAccountName: string;
};

export async function postInvocation(body: {
  input?: string;
  messages?: { role: "user" | "assistant" | "system"; content: string }[];
  thread_id?: string;
  agent_id?: string;
}): Promise<{ id: string; thread_id: string }> {
  const r = await fetch(`${API}/invocations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ id: string; thread_id: string }>;
}

export async function getInvocation(id: string): Promise<InvocationJob> {
  const r = await fetch(`${API}/invocations/${encodeURIComponent(id)}`, {
    headers: { ...authHeaders() },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<InvocationJob>;
}

export async function listRuns(params?: {
  limit?: number;
  offset?: number;
}): Promise<{
  runs: RunListItem[];
  total: number;
  limit: number;
  offset: number;
}> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const r = await fetch(`${API}/runs?${q}`, { headers: { ...authHeaders() } });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{
    runs: RunListItem[];
    total: number;
    limit: number;
    offset: number;
  }>;
}

export async function getRun(runId: string): Promise<
  RunListItem & { files: RunFileEntry[] }
> {
  const r = await fetch(`${API}/runs/${encodeURIComponent(runId)}`, {
    headers: { ...authHeaders() },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<RunListItem & { files: RunFileEntry[] }>;
}

export async function getRunFileText(
  runId: string,
  basename: string,
): Promise<string> {
  const r = await fetch(
    `${API}/runs/${encodeURIComponent(runId)}/files/${encodeURIComponent(basename)}`,
    { headers: { ...authHeaders() } },
  );
  if (!r.ok) throw new Error(await r.text());
  return r.text();
}

export async function putRunFile(
  runId: string,
  basename: string,
  content: string,
): Promise<void> {
  const r = await fetch(
    `${API}/runs/${encodeURIComponent(runId)}/files/${encodeURIComponent(basename)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ content }),
    },
  );
  if (!r.ok) throw new Error(await r.text());
}

export async function deleteRun(runId: string): Promise<void> {
  const r = await fetch(`${API}/runs/${encodeURIComponent(runId)}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!r.ok && r.status !== 204) throw new Error(await r.text());
}

export function assetUrl(runId: string, basename: string): string {
  return `${API}/runs/${encodeURIComponent(runId)}/assets/${encodeURIComponent(basename)}`;
}

/** Use for <img> when ADMIN_API_TOKEN is set (plain img src cannot send Bearer). */
export async function fetchAssetBlob(
  runId: string,
  basename: string,
): Promise<Blob> {
  const r = await fetch(assetUrl(runId, basename), {
    headers: { ...authHeaders() },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.blob();
}

export async function getUserSettings(): Promise<UserSettings> {
  const r = await fetch(`${API}/user-settings`, {
    headers: { ...authHeaders() },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<UserSettings>;
}

export async function putUserSettings(input: UserSettings): Promise<UserSettings> {
  const r = await fetch(`${API}/user-settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<UserSettings>;
}

import { API_BASE } from "./api"; // 👈 añade esta línea

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class HttpError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function request<TResp = unknown>(
  path: string,
  opts?: { method?: HttpMethod; headers?: Record<string, string> }
): Promise<TResp> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts?.method ?? "GET",
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
  });

  const ct = res.headers.get("content-type") ?? "";
  const data = ct.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) throw new HttpError(`HTTP ${res.status}`, res.status, data);
  return data as TResp;
}

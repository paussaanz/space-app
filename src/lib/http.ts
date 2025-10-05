// src/lib/http.ts
import { API_BASE } from "./api";

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

// --- util qs
function toQuery(params?: Record<string, unknown>) {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// --- factory de clientes (multi-base)
export function createHttpClient(base: string) {
  const isAbsBase = /^https?:\/\//i.test(base);
  const baseURL = isAbsBase ? base.replace(/\/+$/, "") : base; // trim '/'

  async function core<T>(
    pathOrUrl: string,
    opts?: { method?: HttpMethod; headers?: Record<string, string> }
  ): Promise<T> {
    const isAbsolute = /^https?:\/\//i.test(pathOrUrl);
    const url = isAbsolute
      ? pathOrUrl
      : `${baseURL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;

    const res = await fetch(url, {
      method: opts?.method ?? "GET",
      headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    });

    const ct = res.headers.get("content-type") ?? "";
    const data = ct.includes("application/json") ? await res.json() : await res.text();

    if (!res.ok) throw new HttpError(`HTTP ${res.status}`, res.status, data);
    return data as T;
  }

  return {
    get<T>(path: string, params?: Record<string, unknown>) {
      return core<T>(`${path}${toQuery(params)}`);
    },
    request: core,
  };
}

/**
 * Clientes listos
 * - aqi: tu backend en AWS (IP y puerto 8000 con HTTPS)
 * - meteo: Open-Meteo
 * Nota: si prefieres controlarlo por env, define VITE_AQI_BASE y úsalo aquí.
 */
export const aqi = createHttpClient(
  // Prioriza env > API_BASE > fallback a tu IP
  (import.meta as any).env?.VITE_AQI_BASE ||
    API_BASE
);
export const meteo = createHttpClient("https://api.open-meteo.com");

// --- compat: tu función request principal (usa el cliente AQI)
export async function request<TResp = unknown>(
  path: string,
  opts?: { method?: HttpMethod; headers?: Record<string, string> }
): Promise<TResp> {
  return aqi.request<TResp>(path, opts);
}

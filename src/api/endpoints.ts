import { request } from "@/lib/http";

export type Health = { status: "ok" | string };

export const getHealth = () => request<Health>("/health");

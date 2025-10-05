import { getHealth, type Health } from "@/api/endpoints";
import { useEffect, useState } from "react";

export default function HealthBadge() {
  const [data, setData] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then(setData)
      .catch((e) => setError(e?.message ?? "Error"));
  }, []);

  if (error) return <span>❌ {error}</span>;
  if (!data) return <span>Cargando…</span>;
  return <span>✅ API: {data.status}</span>;
}

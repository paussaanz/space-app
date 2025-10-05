// src/notifications/NotificationContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type NotificationItem = {
  id: string;
  title: string;
  body?: string;
  ts: number; // timestamp
  read?: boolean;
  level?: "info" | "warn" | "error";
  meta?: Record<string, any>;
};

type Ctx = {
  items: NotificationItem[];
  unread: number;
  add: (n: Omit<NotificationItem, "id" | "ts" | "read">) => void;
  markAllRead: () => void;
  clearAll: () => void;
  remove: (id: string) => void;
  requestBrowserPerm: () => Promise<NotificationPermission>;
};

const NotificationContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "app.notifications.v1";

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<NotificationItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as NotificationItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const add: Ctx["add"] = useCallback((n) => {
    const item: NotificationItem = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      read: false,
      level: n.level ?? "warn",
      title: n.title,
      body: n.body,
      meta: n.meta,
    };
    setItems((prev) => [item, ...prev].slice(0, 200)); // límite
    // Push nativo si está permitido
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(n.title, { body: n.body });
      } catch {}
    }
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  }, []);

  const clearAll = useCallback(() => setItems([]), []);
  const remove = useCallback(
    (id: string) => setItems((p) => p.filter((i) => i.id !== id)),
    []
  );

  const unread = useMemo(() => items.filter((i) => !i.read).length, [items]);

  const requestBrowserPerm = useCallback(async () => {
    if (!("Notification" in window)) return "denied";
    if (Notification.permission !== "granted") {
      return await Notification.requestPermission();
    }
    return "granted";
  }, []);

  const value: Ctx = {
    items,
    unread,
    add,
    markAllRead,
    clearAll,
    remove,
    requestBrowserPerm,
  };
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  return ctx;
}

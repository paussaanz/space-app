// src/notifications/NotificationBell.tsx
import React, { useEffect, useRef, useState } from "react";
import { useNotifications } from "../providers/NotificationsProvider";

export default function NotificationBell() {
  const { unread, items, markAllRead, clearAll, remove, requestBrowserPerm } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(t) &&
        btnRef.current &&
        !btnRef.current.contains(t)
      ) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div className="notif">
      <button
        ref={btnRef}
        aria-label="Notifications"
        className="notif__bell"
        onClick={() => setOpen((o) => !o)}
      >
        {/* simple bell svg */}
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2m6-6V11a6 6 0 0 0-5-5.91V4a1 1 0 1 0-2 0v1.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1z"
          />
        </svg>
        {unread > 0 && (
          <span className="notif__badge" aria-label={`${unread} unread`}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="notif__panel"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="notif__panel-header">
            <strong>Notifications</strong>
            <div className="notif__panel-actions">
              <button onClick={markAllRead} className="notif__action">
                Mark all read
              </button>
              <button onClick={clearAll} className="notif__action">
                Clear
              </button>
              <button
                onClick={() => requestBrowserPerm()}
                className="notif__action"
              >
                Enable Push
              </button>
            </div>
          </div>

          <ul className="notif__list">
            {items.length === 0 && (
              <li className="notif__empty">No notifications</li>
            )}
            {items.map((it) => (
              <li
                key={it.id}
                className={`notif__item ${it.read ? "is-read" : ""}`}
              >
                <div className="notif__dot" data-level={it.level} />
                <div className="notif__content">
                  <div className="notif__title">{it.title}</div>
                  {it.body && <div className="notif__body">{it.body}</div>}
                  <div className="notif__meta">
                    {new Date(it.ts).toLocaleString()}
                  </div>
                </div>
                <button
                  className="notif__remove"
                  aria-label="Remove"
                  onClick={() => remove(it.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

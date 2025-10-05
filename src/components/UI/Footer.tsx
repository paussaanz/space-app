{
  open && (
    <div
      ref={panelRef}
      className="notif__panel"
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
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

      {/* List */}
      <ul className="notif__list">
        {items.length === 0 && (
          <li className="notif__empty">No notifications</li>
        )}
        {items.map((it) => (
          <li key={it.id} className={`notif__item ${it.read ? "is-read" : ""}`}>
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

      {/* Footer */}
      <div className="notif__panel-footer">
        <button onClick={markAllRead} className="notif__footer-btn">
          Mark all read
        </button>
        <button onClick={clearAll} className="notif__footer-btn">
          Clear all
        </button>
        <button
          onClick={() => requestBrowserPerm()}
          className="notif__footer-btn"
        >
          Enable push
        </button>
      </div>
    </div>
  );
}

import React, {
  KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

export type TabItem = {
  id: string;
  label: string;
  content: React.ReactNode;
};

interface TabsProps {
  items: TabItem[];
  defaultTabId?: string;
  onChange?: (id: string) => void;
}

export default function Tabs({ items, defaultTabId, onChange }: TabsProps) {
  const [active, setActive] = useState<string>(defaultTabId || items[0]?.id);
  const baseId = useId();

  useEffect(() => {
    if (!items.find((i) => i.id === active) && items[0]) setActive(items[0].id);
  }, [items, active]);

  useEffect(() => {
    onChange?.(active);
  }, [active, onChange]);

  const activeIndex = useMemo(
    () => items.findIndex((i) => i.id === active),
    [items, active]
  );

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key))
      e.preventDefault();
    const last = items.length - 1;
    let next = activeIndex;
    if (e.key === "ArrowRight")
      next = activeIndex === last ? 0 : activeIndex + 1;
    if (e.key === "ArrowLeft")
      next = activeIndex === 0 ? last : activeIndex - 1;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = last;
    if (next !== activeIndex) setActive(items[next].id);
  };

  return (
    <div className="tabs">
      <div
        role="tablist"
        aria-label="Secciones del dashboard"
        className="tabs__list"
        onKeyDown={onKeyDown}
      >
        {items.map((it) => {
          const selected = it.id === active;
          return (
            <button
              key={it.id}
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${it.id}`}
              id={`${baseId}-tab-${it.id}`}
              tabIndex={selected ? 0 : -1}
              className={`tabs__tab ${selected ? "is-active" : ""}`}
              onClick={() => setActive(it.id)}
            >
              {it.label}
            </button>
          );
        })}
      </div>

      {items.map((it) => {
        const selected = it.id === active;
        return (
          <div
            key={it.id}
            role="tabpanel"
            id={`${baseId}-panel-${it.id}`}
            aria-labelledby={`${baseId}-tab-${it.id}`}
            hidden={!selected}
            className="tabs__panel"
          >
            {selected ? it.content : null}
          </div>
        );
      })}
    </div>
  );
}

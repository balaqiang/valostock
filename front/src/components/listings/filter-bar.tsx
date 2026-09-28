"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type FilterDef = {
  key: string;
  label: string;
  options: string[];
  /** Multi-select (checkbox behaviour). Single-select closes on pick. */
  multi?: boolean;
  /** Pre-selected option for single-select filters (not counted as active). */
  defaultValue?: string;
  /** Trigger prefix, e.g. "Urutkan" → "Urutkan: Terbaru". */
  prefix?: string;
};

function DropdownPanel({
  filter,
  selected,
  onPick,
  onReset,
}: {
  filter: FilterDef;
  selected: Set<string>;
  onPick: (option: string) => void;
  onReset: () => void;
}) {
  // Mounted fresh on every open, so the query resets naturally.
  const [query, setQuery] = useState("");

  const visible = filter.options.filter((option) =>
    option.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="dropdown-panel absolute left-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-background shadow-xl shadow-black/10">
      <div className="relative border-b border-border">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Cari ${filter.label.toLowerCase()}…`}
          aria-label={`Cari ${filter.label}`}
          className="h-10 w-full bg-transparent pl-9 pr-8 text-sm text-text placeholder:text-text-secondary focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Hapus pencarian"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-secondary hover:text-text"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <ul className="max-h-56 overflow-y-auto p-1.5">
        {visible.map((option) => {
          const isSelected = selected.has(option);
          return (
            <li key={option}>
              <button
                type="button"
                onClick={() => onPick(option)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-200 ${
                  isSelected
                    ? "bg-primary/10 font-medium text-text"
                    : "text-text-secondary hover:bg-surface-elevated hover:text-text"
                }`}
              >
                <span className="flex-1 truncate">{option}</span>
                {isSelected && (
                  <Check className="h-4 w-4 flex-none text-primary" />
                )}
              </button>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-text-secondary">
            Tidak ada hasil untuk “{query}”
          </li>
        )}
      </ul>

      {filter.multi && selected.size > 0 && (
        <div className="border-t border-border p-1.5">
          <button
            type="button"
            onClick={onReset}
            className="w-full rounded-lg px-2.5 py-2 text-center text-xs font-medium text-text-secondary transition-colors duration-200 hover:bg-surface-elevated hover:text-text"
          >
            Reset ({selected.size} dipilih)
          </button>
        </div>
      )}
    </div>
  );
}

function Dropdown({
  filter,
  open,
  onToggle,
  onClose,
}: {
  filter: FilterDef;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(filter.defaultValue ? [filter.defaultValue] : []),
  );

  const activeCount = filter.multi
    ? selected.size
    : [...selected].filter((v) => v !== filter.defaultValue).length;

  const singleValue = !filter.multi ? [...selected][0] : undefined;
  const triggerLabel = filter.prefix
    ? `${filter.prefix}: ${singleValue ?? ""}`
    : !filter.multi && singleValue && singleValue !== filter.defaultValue
      ? singleValue
      : filter.label;

  function pick(option: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (filter.multi) {
        if (next.has(option)) next.delete(option);
        else next.add(option);
        return next;
      }
      return new Set([option]);
    });
    if (!filter.multi) onClose();
  }

  function reset() {
    setSelected(new Set(filter.defaultValue ? [filter.defaultValue] : []));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`inline-flex h-9 max-w-52 items-center gap-1.5 rounded-lg border px-3.5 text-sm transition-colors duration-200 ${
          activeCount > 0 || open
            ? "border-primary/50 bg-primary/5 text-text"
            : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text"
        }`}
      >
        <span className="truncate">{triggerLabel}</span>
        {activeCount > 0 && filter.multi && (
          <span className="num flex h-4 min-w-4 flex-none items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
            {activeCount}
          </span>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 flex-none transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <DropdownPanel
          filter={filter}
          selected={selected}
          onPick={pick}
          onReset={reset}
        />
      )}
    </div>
  );
}

export function FilterBar({
  filters,
  sort,
}: {
  filters: FilterDef[];
  sort: FilterDef;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenKey(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenKey(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const toggle = (key: string) =>
    setOpenKey((current) => (current === key ? null : key));

  return (
    <div ref={rootRef} className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <Dropdown
          key={filter.key}
          filter={filter}
          open={openKey === filter.key}
          onToggle={() => toggle(filter.key)}
          onClose={() => setOpenKey(null)}
        />
      ))}
      <div className="ml-auto">
        <Dropdown
          filter={sort}
          open={openKey === sort.key}
          onToggle={() => toggle(sort.key)}
          onClose={() => setOpenKey(null)}
        />
      </div>
    </div>
  );
}

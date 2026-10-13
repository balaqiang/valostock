"use client";

import { useState } from "react";

type TabItem = { label: string; content: React.ReactNode };

/**
 * Simple tab switcher. Panels stay mounted (hidden) so nested state —
 * accordions, sliders — survives switching.
 */
export function Tabs({
  items,
  size = "md",
}: {
  items: TabItem[];
  size?: "md" | "sm";
}) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
        {items.map((item, i) => (
          <button
            key={item.label}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`-mb-px whitespace-nowrap border-b-2 font-medium transition-colors duration-200 ${
              size === "sm" ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm"
            } ${
              i === active
                ? "border-primary text-text"
                : "border-transparent text-text-secondary hover:text-text"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, i) => (
        <div key={item.label} role="tabpanel" hidden={i !== active} className="pt-5">
          {item.content}
        </div>
      ))}
    </div>
  );
}

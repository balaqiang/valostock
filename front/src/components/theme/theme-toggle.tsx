"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle({ over = false }: { over?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-200 ${
        over
          ? "text-white/80 hover:bg-white/10 hover:text-white"
          : "text-text-secondary hover:bg-surface-elevated hover:text-text"
      }`}
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

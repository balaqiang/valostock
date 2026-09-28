"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { AccountSidebar } from "@/components/account/sidebar";

/**
 * Etherscan-style profile panel: identity head + grouped nav in one card.
 * Desktop: always expanded. Mobile: collapsed behind a "Sidebar Menu" toggle.
 */
export function AccountPanel({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm">
      {/* Identity head */}
      <div className="flex items-center justify-between gap-3 border-b border-border p-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 font-display text-base font-bold text-white">
            {name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold text-text">
              {name}
            </p>
            <p className="truncate text-xs text-text-secondary">
              {email}
            </p>
          </div>
        </div>

        {/* Mobile toggle — like Etherscan's "Sidebar Menu" */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="account-nav"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex flex-none items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text transition-colors duration-200 hover:bg-surface-elevated lg:hidden"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          Menu Akun
        </button>
      </div>

      {/* Nav: collapsible on mobile, always visible on desktop */}
      <div className="hidden p-4 lg:block">
        <AccountSidebar />
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="account-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden lg:hidden"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            <div className="p-4">
              <AccountSidebar />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, MessageCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockNotifChannel } from "@/lib/mock/store-dashboard";

const icons: Record<MockNotifChannel["kind"], React.ComponentType<{ className?: string }>> = {
  WHATSAPP: MessageCircle,
  DISCORD: Bell,
  TELEGRAM: Send,
};

/** One-way notification channels (WA/Discord/Telegram) — connect via API later. */
export function ChannelToggles({ channels: notifChannels }: { channels: MockNotifChannel[] }) {
  const [channels, setChannels] = useState(notifChannels);

  const toggle = (kind: MockNotifChannel["kind"]) => {
    setChannels((current) =>
      current.map((channel) =>
        channel.kind === kind
          ? { ...channel, active: !channel.active }
          : channel,
      ),
    );
  };

  return (
    <ul className="space-y-2.5">
      {channels.map((channel) => {
        const Icon = icons[channel.kind];
        return (
          <li
            key={channel.kind}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-4"
          >
            <span className="flex min-w-0 items-center gap-3">
              <Icon className="h-4 w-4 flex-none text-primary" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-text">
                  {channel.label}
                </span>
                <span className="num block truncate text-xs text-text-secondary">
                  {channel.target}
                </span>
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={channel.active}
              aria-label={`${channel.active ? "Matikan" : "Aktifkan"} ${channel.label}`}
              onClick={() => toggle(channel.kind)}
              className={cn(
                "relative h-6 w-11 flex-none rounded-full transition-colors duration-200",
                channel.active ? "bg-primary" : "bg-border-strong",
              )}
            >
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm",
                  channel.active ? "left-[22px]" : "left-0.5",
                )}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

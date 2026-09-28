import { AlertCircle } from "lucide-react";

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
      <span>{message}</span>
    </div>
  );
}

/** Only allow same-site relative redirects (blocks `//evil.com` and absolute URLs). */
export function safeNextPath(value: string | null, fallback = "/account"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}

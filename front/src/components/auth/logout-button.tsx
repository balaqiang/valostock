"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { setSessionUser } from "@/lib/hooks/use-session";
import { apiFetch } from "@/lib/api";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Already logged out or API down — clear the local session anyway.
    } finally {
      setSessionUser(null);
      router.replace("/");
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="inline-flex flex-none items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/15 disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      Keluar
    </button>
  );
}

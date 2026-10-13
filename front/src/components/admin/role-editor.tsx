"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Pick admin roles: PUT /admin/admins/:id/roles, or POST /admin/admins (by email) for a new admin. */
export function RoleEditor({ userId, current, roles }: { userId?: string; current: string[]; roles: { key: string; name: string }[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(current);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      if (userId) await apiFetch(`/api/admin/admins/${userId}/roles`, { method: "PUT", body: JSON.stringify({ roles: picked }) });
      else await apiFetch("/api/admin/admins", { method: "POST", body: JSON.stringify({ email: email.trim(), roles: picked }) });
      setMsg({ ok: true, text: "Tersimpan." });
      if (!userId) {
        setEmail("");
        setPicked([]);
      }
      router.refresh();
    } catch (err: unknown) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Gagal." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {!userId && (
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email pengguna terdaftar"
          className="h-9 w-full max-w-sm rounded-lg border border-border bg-background px-3 text-sm"
        />
      )}
      <div className="flex flex-wrap gap-1.5">
        {roles.map((r) => {
          const on = picked.includes(r.key);
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => setPicked((p) => (on ? p.filter((x) => x !== r.key) : [...p, r.key]))}
              className={cn("rounded-full border px-3 py-1 text-xs", on ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary")}
            >
              {r.name}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <Button size="md" variant={userId ? "secondary" : "primary"} onClick={save} disabled={busy || picked.length === 0 || (!userId && !email.trim())}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {userId ? "Simpan peran" : "Jadikan admin"}
        </Button>
        {msg && <span className={`text-xs ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}

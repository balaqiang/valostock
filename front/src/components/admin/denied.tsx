import { ServerCrash, ShieldOff } from "lucide-react";
import { getApiStatus } from "@/lib/api-server";
import { API_DOWN_MESSAGE } from "@/components/system/api-status-banner";

/** Shown when an admin API call returned nothing: the server is down, or the session is no longer an admin one. */
export async function Denied() {
  const status = await getApiStatus();
  if (status !== "ok") {
    const message = API_DOWN_MESSAGE[status];
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-amber-500/40 py-16 text-center">
        <ServerCrash className="h-8 w-8 text-amber-600" />
        <p className="mt-3 text-sm font-medium text-text">{message.title}</p>
        <p className="mt-1 max-w-sm text-xs text-text-secondary">{message.hint}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-16 text-center">
      <ShieldOff className="h-8 w-8 text-text-secondary" />
      <p className="mt-3 text-sm font-medium text-text">Tidak ada akses</p>
      <p className="mt-1 max-w-sm text-xs text-text-secondary">Halaman ini khusus admin. Masuk ulang dengan akun admin.</p>
    </div>
  );
}

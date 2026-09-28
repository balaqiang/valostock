import { ServerCrash, ShieldOff } from "lucide-react";
import { getApiStatus } from "@/lib/api-server";
import { API_DOWN_MESSAGE } from "@/components/system/api-status-banner";

/** Shown when the admin API returned nothing: says whether it was a missing permission or a server that is down. */
export async function Denied({ permission }: { permission: string }) {
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
      <p className="mt-1 max-w-sm text-xs text-text-secondary">
        Halaman ini butuh izin <code className="num">{permission}</code>. Hubungi Super Admin untuk mengatur peran.
      </p>
    </div>
  );
}

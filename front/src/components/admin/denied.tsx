import { ShieldOff } from "lucide-react";

/** Shown when the API refused the admin page (missing permission) or is unreachable. */
export function Denied({ permission }: { permission: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-16 text-center">
      <ShieldOff className="h-8 w-8 text-text-secondary" />
      <p className="mt-3 text-sm font-medium text-text">Tidak ada akses</p>
      <p className="mt-1 max-w-sm text-xs text-text-secondary">
        Halaman ini butuh izin <code className="num">{permission}</code> (atau API tidak terhubung). Hubungi Super Admin untuk mengatur peran.
      </p>
    </div>
  );
}

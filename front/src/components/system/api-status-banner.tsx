import { ServerCrash } from "lucide-react";
import { getApiStatus } from "@/lib/api-server";

export const API_DOWN_MESSAGE = {
  "api-down": {
    title: "Server API tidak terhubung",
    hint: "Jalankan npm run dev di folder back/ (port 4000), lalu muat ulang halaman.",
  },
  "db-down": {
    title: "Database tidak terhubung",
    hint: "API berjalan, tetapi Supabase valostock tidak menjawab. Nyalakan Docker Desktop lalu npx supabase start.",
  },
} as const;

/**
 * Pages render an unreachable API as "no data", so without this a stopped
 * backend looks like an empty marketplace. Fixed to the bottom so it never
 * hides under the fixed navbar.
 */
export async function ApiStatusBanner() {
  const status = await getApiStatus();
  if (status === "ok") return null;
  const message = API_DOWN_MESSAGE[status];
  return (
    <div role="alert" className="fixed inset-x-0 bottom-0 z-[60] border-t border-amber-500/40 bg-amber-50 px-4 py-3 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <div className="mx-auto flex max-w-6xl items-start gap-3 text-sm">
        <ServerCrash className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          <strong className="font-semibold">{message.title}.</strong> Data tidak bisa dimuat dan transaksi tidak diproses. {message.hint}
        </p>
      </div>
    </div>
  );
}

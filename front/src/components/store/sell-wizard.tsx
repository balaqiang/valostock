"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Clock, Loader2, Store, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormAlert } from "@/components/auth/form-alert";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { paymentMethods } from "@/lib/fees";
import { apiFetch } from "@/lib/api";
import type { PaymentSession, StoreContext } from "@/types/api";

const gatewayMethods = paymentMethods.filter((method) => method.kind !== "BALANCE");

const steps = ["Profil toko", "Deposit Rp500.000", "Verifikasi admin", "Toko aktif"];

function stepOf(store: StoreContext | null): number {
  if (!store) return 0;
  if (store.status === "PENDING_DEPOSIT") return 1;
  if (store.status === "PENDING_REVIEW" || store.status === "REJECTED") return 2;
  return 3;
}

/**
 * Store onboarding (DFD 2.0, docs/ARCHITECTURE.md §7). No KYC provider: the
 * owner's legal name is checked manually by an admin after the deposit is paid.
 */
export function SellWizard({ store }: { store: StoreContext | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<string>("VA");
  const step = stepOf(store);

  const openStore = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/api/stores", {
        method: "POST",
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          type: String(form.get("type") ?? "OWNER"),
          ownerLegalName: String(form.get("ownerLegalName") ?? ""),
          description: String(form.get("description") ?? "") || undefined,
          acceptRules: form.get("acceptRules") === "on",
        }),
      });
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal membuat toko.");
    } finally {
      setLoading(false);
    }
  };

  const payDeposit = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ payment: PaymentSession }>("/api/stores/me/deposit", {
        method: "POST",
        body: JSON.stringify({ method }),
      });
      if (data.payment.mode === "MIDTRANS_SNAP") window.location.assign(data.payment.redirectUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal membuat pembayaran deposit.");
      setLoading(false);
    }
  };

  return (
    <div>
      <ol className="grid grid-cols-4 gap-2" aria-label="Tahap membuka toko">
        {steps.map((label, index) => (
          <li key={label}>
            <span className={cn("block h-1.5 rounded-full", index <= step ? "bg-primary" : "bg-border")} />
            <span className={cn("mt-2 block text-[11px] font-medium sm:text-xs", index === step ? "text-primary" : "text-text-secondary")}>
              {index + 1}. {label}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-2xl border border-border bg-surface p-6 sm:p-8">
        {!store && (
          <form onSubmit={openStore} className="space-y-4">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-text">
              <Store className="h-5 w-5 text-primary" />
              Profil toko
            </h2>
            <div>
              <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-text-secondary">Nama toko</label>
              <Input id="name" name="name" required minLength={3} maxLength={100} placeholder="cth: NusaGame" />
              <p className="mt-1 text-xs text-text-secondary">Jangan cantumkan nomor HP / kontak pribadi.</p>
            </div>
            <div>
              <label htmlFor="type" className="mb-1.5 block text-xs font-medium text-text-secondary">Tipe toko</label>
              <select
                id="type"
                name="type"
                className="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm text-text focus:border-primary focus:outline-none"
              >
                <option value="OWNER">Owner Store — menjual akun milik sendiri</option>
                <option value="RESELLER">Reseller Store — menjual akun titipan penjual lain</option>
              </select>
            </div>
            <div>
              <label htmlFor="ownerLegalName" className="mb-1.5 block text-xs font-medium text-text-secondary">
                Nama pemilik sesuai KTP
              </label>
              <Input id="ownerLegalName" name="ownerLegalName" required minLength={3} maxLength={100} placeholder="cth: Rizky Pratama" />
              <p className="mt-1 text-xs text-text-secondary">
                Diverifikasi manual oleh admin, dan dipakai untuk mencocokkan nama rekening saat tarik dana.
              </p>
            </div>
            <div>
              <label htmlFor="description" className="mb-1.5 block text-xs font-medium text-text-secondary">Deskripsi (opsional)</label>
              <textarea
                id="description"
                name="description"
                rows={3}
                maxLength={1000}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-text focus:border-primary focus:outline-none"
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-text-secondary">
              <input type="checkbox" name="acceptRules" required className="mt-1" />
              Saya menyetujui aturan toko, Syarat & Ketentuan, dan Kebijakan Privasi.
            </label>
            <FormAlert message={error} />
            <Button type="submit" variant="primary" size="lg" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Lanjut ke Deposit
            </Button>
          </form>
        )}

        {store?.status === "PENDING_DEPOSIT" && (
          <div>
            <h2 className="font-display text-xl font-bold text-text">Deposit keamanan {formatRupiah(store.depositAmount)}</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Deposit menjamin kepatuhan toko dan bisa dikembalikan saat toko tutup dengan akun bersih. Setelah lunas,
              admin memeriksa data tokomu.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {gatewayMethods.map((item) => (
                <button
                  key={item.kind}
                  type="button"
                  onClick={() => setMethod(item.kind)}
                  aria-pressed={method === item.kind}
                  className={cn(
                    "rounded-xl border p-3 text-left text-sm transition-colors",
                    method === item.kind ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40",
                  )}
                >
                  <span className="block font-semibold text-text">{item.label}</span>
                  <span className="block text-xs text-text-secondary">{item.detail}</span>
                </button>
              ))}
            </div>
            <div className="mt-4">
              <FormAlert message={error} />
            </div>
            <Button variant="primary" size="lg" className="mt-3" onClick={payDeposit} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Bayar Deposit
            </Button>
          </div>
        )}

        {store?.status === "PENDING_REVIEW" && (
          <div className="text-center">
            <Clock className="mx-auto h-10 w-10 text-amber-500" />
            <h2 className="mt-3 font-display text-xl font-bold text-text">Menunggu verifikasi admin</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
              Deposit sudah diterima. Admin sedang memeriksa data toko <b>{store.name}</b> (pemilik: {store.ownerLegalName}).
              Kamu akan mendapat notifikasi saat diputuskan.
            </p>
            <Button href="/store-dashboard/catalogs/new" variant="secondary" size="md" className="mt-5">
              Siapkan katalog (draf) sambil menunggu
            </Button>
          </div>
        )}

        {store?.status === "REJECTED" && (
          <div className="text-center">
            <XCircle className="mx-auto h-10 w-10 text-red-500" />
            <h2 className="mt-3 font-display text-xl font-bold text-text">Pengajuan toko ditolak</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
              Catatan admin: {store.reviewNote ?? "-"}. Deposit dikembalikan. Hubungi admin melalui halaman Kontak untuk
              mengajukan ulang.
            </p>
          </div>
        )}

        {store?.status === "SUSPENDED" && (
          <p className="text-center text-sm text-text-secondary">Toko ditangguhkan. Hubungi admin melalui halaman Kontak.</p>
        )}

        {store?.status === "ACTIVE" && (
          <div className="text-center">
            <BadgeCheck className="mx-auto h-10 w-10 text-emerald-500" />
            <h2 className="mt-3 font-display text-xl font-bold text-text">Toko {store.name} aktif</h2>
            <p className="mt-2 text-sm text-text-secondary">Identitas sudah diverifikasi admin. Kamu bisa mulai berjualan.</p>
            <Button href="/store-dashboard" variant="primary" size="lg" className="mt-5">
              Buka Dashboard Toko
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

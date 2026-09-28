import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Bagaimana saya menilai akun ini aman dibeli?",
    a: "Lihat tiga badge-nya: Identity Verified berarti identitas pemilik toko sudah diverifikasi admin, Store Verified berarti tokonya memenuhi standar operasional, dan Account Checked berarti akun sudah diinspeksi toko dengan checklist bertimestamp. Recovery Risk adalah deklarasi mandiri penjual (bukan verifikasi platform) — lengkap dengan Confidence Level dan bukti yang diunggah (Evidence Submitted). Tidak ada yang bisa menjamin 100%; yang kami berikan adalah akuntabilitas yang terukur.",
  },
  {
    q: "Bagaimana saya menerima detail akun setelah membayar?",
    a: "Pembayaranmu (harga akun + biaya pembeli) dibayar lewat Midtrans dan ditahan di escrow — tidak langsung ke penjual. Penjual menyerahkan detail akun lewat chat in-app yang tercatat sebagai bukti. Periksa akunnya; jika sesuai, klik Selesai dan dana baru diteruskan ke saldo toko penjual.",
  },
  {
    q: "Bagaimana jika ada masalah setelah pembelian?",
    a: "Sebelum klik Selesai, kamu bisa melapor atau membatalkan — platform menginvestigasi dengan bukti chat dan catatan inspeksi, dan dana yang masih di escrow dikembalikan jika laporanmu valid (pembatalan tanpa alasan valid dikenai biaya). Jika akun ditarik penjual setelah transaksi selesai, buka dispute: penjual ditekan lewat pemblokiran, pembekuan saldo, dan blacklist (identitas, perangkat, rekening). Priority Protection memberi penanganan prioritas.",
  },
];

export function FaqSection() {
  return (
    <section className="mt-12">
      <h2 className="font-display text-lg font-semibold text-text">FAQ</h2>
      <div className="mt-4 space-y-3">
        {faqs.map((faq) => (
          <details
            key={faq.q}
            className="group rounded-xl border border-border bg-surface"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-text [&::-webkit-details-marker]:hidden">
              {faq.q}
              <ChevronDown className="h-4 w-4 flex-none text-text-secondary transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="border-t border-border px-5 py-4 text-sm leading-relaxed text-text-secondary">
              {faq.a}
            </p>
          </details>
        ))}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-text-secondary">
        Listing ini dijual oleh toko pihak ketiga yang terverifikasi.
        valostock.id adalah penyedia layanan marketplace, verifikasi, dan
        escrow — bukan penjual akun. Seluruh transaksi wajib melalui escrow
        untuk perlindungan pembeli yang konsisten.
      </p>
    </section>
  );
}

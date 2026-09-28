import { Star } from "lucide-react";

const reviews = [
  {
    name: "T****r",
    since: "Apr 2025",
    date: "13 Jun 2026",
    text: "Sangat terpercaya. Akun dicek dulu bareng-bareng, dipandu sampai email, password, dan 2FA semua keganti. Ramah banget!",
    tags: ["Fast respon", "Ramah", "Terpercaya"],
  },
  {
    name: "C****1",
    since: "Sep 2023",
    date: "28 Jun 2026",
    text: "Aman banget, proses lewat escrow jadi tenang. Recommended.",
    tags: [],
  },
  {
    name: "C****0",
    since: "Jan 2024",
    date: "25 Mei 2026",
    text: "Sempat ada kendala kecil, toko langsung bantu sampai beres. Best seller di platform ini.",
    tags: ["Helpful"],
  },
  {
    name: "W****a",
    since: "Jun 2023",
    date: "15 Mei 2026",
    text: "Tanpa komentar.",
    tags: [],
  },
];

const filters = [
  { label: "Semua", count: 32 },
  { label: "Positif", count: 32 },
  { label: "Netral", count: 0 },
  { label: "Negatif", count: 0 },
];

export function ReviewsSection({
  store,
  rating,
}: {
  store: string;
  rating: number;
}) {
  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-text">
          Rating Toko{" "}
          <span className="num font-sans text-sm font-normal text-text-secondary">
            {store} · ★ {rating} · 32 ulasan
          </span>
        </h2>
        <div className="flex gap-1.5">
          {filters.map((filter, i) => (
            <button
              key={filter.label}
              type="button"
              className={`num rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 ${
                i === 0
                  ? "bg-primary text-white"
                  : "border border-border text-text-secondary hover:text-text"
              }`}
            >
              {filter.label} {filter.count}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-5 divide-y divide-border rounded-2xl border border-border bg-surface px-6">
        {reviews.map((review) => (
          <li key={review.name + review.date} className="py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {review.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text">{review.name}</p>
                <p className="text-xs text-text-secondary">
                  Member sejak {review.since}
                </p>
              </div>
              <span className="text-xs text-text-secondary">{review.date}</span>
            </div>
            <div className="mt-2.5 flex items-center gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                />
              ))}
            </div>
            {review.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {review.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {review.text}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-text-secondary transition-colors duration-200 hover:bg-surface-elevated hover:text-text"
        >
          Tampilkan Lebih Banyak
        </button>
      </div>
    </section>
  );
}

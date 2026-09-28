"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Gamepad2,
  ImageUp,
  Info,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import type { MockGame } from "@/lib/mock/games";
import type { MockStoreCatalog } from "@/lib/mock/store-dashboard";

// Game-specific listing fields — mirrors CATALOGS.attributes (JSONB) field
// templates (docs/SITEMAP.md §7: pick game → game-specific fields).
const gameFields: Record<string, { key: string; label: string; placeholder: string }[]> = {
  valorant: [
    { key: "rank", label: "Rank", placeholder: "cth: Immortal 2" },
    { key: "level", label: "Account Level", placeholder: "cth: 120" },
    { key: "server", label: "Server", placeholder: "cth: Indonesia" },
    { key: "region", label: "Region", placeholder: "cth: IDN" },
    { key: "skin_count", label: "Jumlah Skin", placeholder: "cth: 87" },
  ],
  "mobile-legends": [
    { key: "rank", label: "Rank", placeholder: "cth: Mythic" },
    { key: "level", label: "Level", placeholder: "cth: 45" },
    { key: "server", label: "Server", placeholder: "cth: Indonesia" },
    { key: "hero_count", label: "Jumlah Hero", placeholder: "cth: 98" },
    { key: "skin_count", label: "Jumlah Skin", placeholder: "cth: 120" },
  ],
};

// Sample of the API-synced SKINS master (skin picker → auto image + VP).
const skinMaster = [
  "Champions 2023 Vandal",
  "Kuronami Vandal",
  "Reaver Vandal",
  "Prime Vandal",
  "RGX 11z Pro Vandal",
  "Araxys Vandal",
  "Glitchpop Vandal",
  "Oni Phantom",
  "Singularity Phantom",
  "Recon Phantom",
  "Elderflame Operator",
  "Ion Sheriff",
  "Prelude to Chaos Vandal",
  "Sentinels of Light Vandal",
  "Neptune Vandal",
];

const steps = [
  { key: "game", label: "Game & Judul" },
  { key: "detail", label: "Detail Akun" },
  { key: "media", label: "Skin & Foto" },
  { key: "publish", label: "Harga & Publikasi" },
] as const;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

/**
 * Create/edit listing as a guided 4-step wizard: progress stepper, per-step
 * validation with inline errors, animated transitions, and a live preview of
 * the listing card. Display-only — drafts/publishing go through the API.
 */
export function CatalogForm({
  catalog,
  games: accountGames,
}: {
  catalog?: MockStoreCatalog;
  games: MockGame[];
}) {
  const getGame = (slug: string) => accountGames.find((item) => item.slug === slug);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [game, setGame] = useState(catalog?.game ?? "valorant");
  const [title, setTitle] = useState(catalog?.title ?? "");
  const [attrs, setAttrs] = useState<Record<string, string>>({});
  const [skins, setSkins] = useState<string[]>([]);
  const [skinQuery, setSkinQuery] = useState("");
  const [photos, setPhotos] = useState(0);
  const [price, setPrice] = useState(catalog ? String(catalog.price) : "");
  const [description, setDescription] = useState("");
  const [delivery, setDelivery] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<"draft" | "published" | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const fields = gameFields[game] ?? [];
  const numericPrice = Number(price) || 0;
  const matches = skinQuery.trim()
    ? skinMaster.filter(
        (skin) =>
          skin.toLowerCase().includes(skinQuery.trim().toLowerCase()) &&
          !skins.includes(skin),
      )
    : [];

  const validateStep = (index: number): Record<string, string> => {
    const issues: Record<string, string> = {};
    if (index === 0) {
      if (title.trim().length < 10)
        issues.title = "Judul minimal 10 karakter agar informatif di pencarian.";
    }
    if (index === 3) {
      if (numericPrice <= 0) issues.price = "Isi harga jual (angka, tanpa titik).";
      if (description.trim().length < 20)
        issues.description =
          "Deskripsi minimal 20 karakter — jelaskan persis apa yang pembeli terima.";
    }
    return issues;
  };

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setErrors({});
    // Move focus to the step heading for keyboard/screen-reader users.
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const next = () => {
    const issues = validateStep(step);
    if (Object.keys(issues).length > 0) {
      setErrors(issues);
      return;
    }
    goTo(Math.min(step + 1, steps.length - 1));
  };

  const submit = (mode: "draft" | "published") => {
    if (mode === "published") {
      const issues = validateStep(3);
      if (Object.keys(issues).length > 0) {
        setErrors(issues);
        return;
      }
    }
    setSaved(mode);
  };

  if (saved) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center"
      >
        <BadgeCheck className="mx-auto h-10 w-10 text-emerald-500" />
        <h2 className="mt-3 font-display text-xl font-bold text-text">
          {saved === "draft" ? "Draft tersimpan" : "Listing terpublikasi 🎉"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
          {saved === "draft"
            ? "Lanjutkan kapan saja dari halaman Katalog — draft belum terlihat pembeli."
            : `Platform menerbitkan ID katalog (VS)${catalog?.vsCode ? ` — ${catalog.vsCode}` : ""}. Satu akun satu katalog, tidak bisa dijual dua kali.`}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button href="/store-dashboard/catalogs" variant="primary" size="md">
            Ke Katalog
          </Button>
          <Button variant="secondary" size="md" onClick={() => setSaved(null)}>
            Edit lagi
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        {/* Stepper */}
        <ol className="grid grid-cols-4 gap-2" aria-label="Langkah pembuatan listing">
          {steps.map((item, index) => {
            const done = index < step;
            const current = index === step;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => index < step && goTo(index)}
                  disabled={index > step}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "w-full text-left",
                    index < step && "cursor-pointer",
                    index > step && "cursor-not-allowed",
                  )}
                >
                  <span
                    className={cn(
                      "block h-1.5 rounded-full transition-colors duration-300",
                      done || current ? "bg-primary" : "bg-border",
                    )}
                  />
                  <span
                    className={cn(
                      "mt-2 flex items-center gap-1.5 text-[11px] font-medium sm:text-xs",
                      current
                        ? "text-primary"
                        : done
                          ? "text-text"
                          : "text-text-secondary",
                    )}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5 flex-none text-primary" />
                    ) : (
                      <span className="num">{index + 1}.</span>
                    )}
                    <span className="hidden sm:inline">{item.label}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* Step content — keyed remount slides each step in (no exit
            animation: AnimatePresence-wait froze exiting steps here). */}
        <div className="relative mt-6 overflow-hidden">
          <motion.section
            key={step}
            initial={{ opacity: 0, x: 32 * direction }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="font-display text-lg font-bold tracking-tight text-text outline-none"
              >
                {steps[step].label}
              </h2>

              {step === 0 && (
                <div className="mt-4 space-y-5">
                  <div>
                    <span className="mb-2 block text-xs font-medium text-text-secondary">
                      Pilih game
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      {accountGames.map((item) => (
                        <button
                          key={item.slug}
                          type="button"
                          aria-pressed={game === item.slug}
                          onClick={() => setGame(item.slug)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors duration-200",
                            game === item.slug
                              ? "border-primary bg-primary/5"
                              : "border-border bg-surface hover:border-primary/40",
                          )}
                        >
                          <span
                            className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-gradient-to-br text-white ${item.gradient}`}
                          >
                            <Gamepad2 className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-text">
                              {item.name}
                            </span>
                            <span className="block truncate text-xs text-text-secondary">
                              {item.tagline}
                            </span>
                          </span>
                          {game === item.slug && (
                            <Check className="ml-auto h-4 w-4 flex-none text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="wz-title"
                      className="mb-1.5 block text-xs font-medium text-text-secondary"
                    >
                      Judul listing
                    </label>
                    <Input
                      id="wz-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      aria-invalid={!!errors.title}
                      placeholder="cth: Akun Valorant Immortal 2 — Reaver Set Lengkap"
                    />
                    <div className="mt-1.5 flex items-center justify-between gap-3">
                      <FieldError message={errors.title} />
                      <span
                        className={cn(
                          "num ml-auto text-[11px]",
                          title.trim().length >= 10
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-text-secondary",
                        )}
                      >
                        {title.trim().length}/10 min
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="mt-4">
                  <p className="flex items-start gap-2 rounded-xl bg-surface-elevated px-4 py-3 text-xs text-text-secondary">
                    <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
                    Field mengikuti game yang dipilih ({getGame(game)?.name}).
                    Isi seakurat mungkin — deskripsi tidak akurat memicu
                    sengketa.
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {fields.map((field) => (
                      <div key={field.key}>
                        <label
                          htmlFor={`wz-${field.key}`}
                          className="mb-1.5 block text-xs font-medium text-text-secondary"
                        >
                          {field.label}
                        </label>
                        <Input
                          id={`wz-${field.key}`}
                          value={attrs[field.key] ?? ""}
                          onChange={(event) =>
                            setAttrs((current) => ({
                              ...current,
                              [field.key]: event.target.value,
                            }))
                          }
                          placeholder={field.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="mt-4 space-y-6">
                  {game === "valorant" ? (
                    <div>
                      <span className="mb-1.5 block text-xs font-medium text-text-secondary">
                        Skin unggulan{" "}
                        <span className="font-normal">
                          (dari master data — gambar & harga VP otomatis)
                        </span>
                      </span>
                      <div className="relative max-w-md">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                        <Input
                          value={skinQuery}
                          onChange={(event) => setSkinQuery(event.target.value)}
                          placeholder="Cari skin… (cth: Reaver)"
                          className="pl-10"
                        />
                        {matches.length > 0 && (
                          <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-background shadow-xl shadow-black/10">
                            {matches.slice(0, 6).map((skin) => (
                              <li key={skin}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSkins((current) => [...current, skin]);
                                    setSkinQuery("");
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-text transition-colors duration-150 hover:bg-surface-elevated"
                                >
                                  {skin}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {skins.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {skins.map((skin) => (
                            <Badge key={skin} variant="outline">
                              {skin}
                              <button
                                type="button"
                                aria-label={`Hapus ${skin}`}
                                onClick={() =>
                                  setSkins((current) =>
                                    current.filter((s) => s !== skin),
                                  )
                                }
                                className="text-text-secondary hover:text-red-500"
                              >
                                <X />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-surface-elevated px-4 py-3 text-xs text-text-secondary">
                      Skin picker tersedia untuk game dengan master data skin
                      (Valorant). Cantumkan skin {getGame(game)?.name} di
                      deskripsi.
                    </p>
                  )}

                  <div>
                    <span className="mb-1.5 block text-xs font-medium text-text-secondary">
                      Foto akun ({photos}/8)
                    </span>
                    <div className="grid grid-cols-4 gap-2.5">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() =>
                            index === photos && setPhotos((count) => count + 1)
                          }
                          disabled={index > photos}
                          aria-label={
                            index < photos ? `Foto ${index + 1}` : "Tambah foto"
                          }
                          className={cn(
                            "flex aspect-square items-center justify-center rounded-xl border transition-colors duration-200",
                            index < photos
                              ? "border-primary/40 bg-primary/5 text-primary"
                              : index === photos
                                ? "border-dashed border-border-strong text-text-secondary hover:border-primary/40 hover:text-primary"
                                : "border-dashed border-border text-text-secondary/40",
                          )}
                        >
                          {index < photos ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <ImageUp className="h-5 w-5" />
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[11px] text-text-secondary">
                      Foto pertama menjadi sampul. Jangan tampilkan email/data
                      pribadi di screenshot.
                    </p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="mt-4 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="wz-price"
                        className="mb-1.5 block text-xs font-medium text-text-secondary"
                      >
                        Harga jual (Rp)
                      </label>
                      <Input
                        id="wz-price"
                        type="number"
                        value={price}
                        onChange={(event) => setPrice(event.target.value)}
                        aria-invalid={!!errors.price}
                        placeholder="cth: 2500000"
                        className="num"
                      />
                      <FieldError message={errors.price} />
                      {numericPrice > 0 && (
                        <p className="num mt-1.5 text-[11px] text-text-secondary">
                          Kamu terima ±{formatRupiah(Math.round(numericPrice * 0.955))}{" "}
                          setelah komisi 4,5% (Pro).
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="wz-delivery"
                        className="mb-1.5 block text-xs font-medium text-text-secondary"
                      >
                        Catatan pengiriman
                      </label>
                      <Input
                        id="wz-delivery"
                        value={delivery}
                        onChange={(event) => setDelivery(event.target.value)}
                        placeholder="cth: Akses email disertakan"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="wz-desc"
                      className="mb-1.5 block text-xs font-medium text-text-secondary"
                    >
                      Deskripsi
                    </label>
                    <textarea
                      id="wz-desc"
                      rows={4}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      aria-invalid={!!errors.description}
                      placeholder="Jelaskan persis apa yang pembeli terima: rank, skin/VP, akses email, dan kondisi akun. Klaim mutlak seperti '100% aman' dilarang."
                      className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-text placeholder:text-text-secondary transition-colors duration-200 focus:border-primary focus:outline-none"
                    />
                    <FieldError message={errors.description} />
                  </div>

                  {/* Review summary */}
                  <dl className="space-y-1.5 rounded-xl bg-surface-elevated p-4 text-sm">
                    <div className="flex justify-between text-text-secondary">
                      <dt>Game</dt>
                      <dd className="font-medium text-text">
                        {getGame(game)?.name}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-6 text-text-secondary">
                      <dt className="flex-none">Judul</dt>
                      <dd className="truncate font-medium text-text">
                        {title || "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <dt>Skin unggulan</dt>
                      <dd className="num font-medium text-text">{skins.length}</dd>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <dt>Foto</dt>
                      <dd className="num font-medium text-text">{photos}</dd>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1.5 text-text-secondary">
                      <dt>Harga</dt>
                      <dd className="num font-semibold text-text">
                        {numericPrice > 0 ? formatRupiah(numericPrice) : "—"}
                      </dd>
                    </div>
                  </dl>

                  <p className="flex items-start gap-2 text-[11px] text-text-secondary">
                    <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
                    Saat publish, platform menerbitkan ID katalog (VS) — satu
                    akun satu katalog, anti double-sell.
                  </p>
                </div>
              )}
          </motion.section>
        </div>

        {/* Nav buttons */}
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
          <Button
            variant="ghost"
            size="md"
            disabled={step === 0}
            onClick={() => goTo(step - 1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
          {step < steps.length - 1 ? (
            <Button variant="primary" size="md" onClick={next}>
              Lanjut
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => submit("draft")}
              >
                Simpan Draft
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => submit("published")}
              >
                <Sparkles className="h-4 w-4" />
                Publish
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Live preview — updates as the store types */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="eyebrow mb-2 text-text-secondary">Preview listing</p>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div
            className={`relative flex aspect-[4/3] items-end bg-gradient-to-br p-3 ${getGame(game)?.gradient ?? "from-zinc-500 to-zinc-700"}`}
          >
            <span className="absolute left-3 top-3 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              {attrs.rank || getGame(game)?.name}
            </span>
            <span className="rounded-md bg-black/55 px-2 py-1 text-[11px] text-white/85 backdrop-blur-sm">
              {photos > 0 ? `${photos} foto` : "Belum ada foto"}
            </span>
          </div>
          <div className="p-4">
            <p
              className={cn(
                "line-clamp-2 text-sm font-medium leading-snug",
                title ? "text-text" : "italic text-text-secondary",
              )}
            >
              {title || "Judul listing kamu tampil di sini…"}
            </p>
            {skins.length > 0 && (
              <p className="mt-1.5 truncate text-xs text-text-secondary">
                {skins.slice(0, 2).join(" · ")}
                {skins.length > 2 ? ` +${skins.length - 2}` : ""}
              </p>
            )}
            <p
              className={cn(
                "num mt-3 text-lg font-bold tracking-tight",
                numericPrice > 0 ? "text-text" : "text-text-secondary",
              )}
            >
              {numericPrice > 0 ? formatRupiah(numericPrice) : "Rp —"}
            </p>
            <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-text-secondary">
              <BadgeCheck className="h-4 w-4 flex-none text-primary" />
              <span className="font-medium text-text">NusaGame</span>
              <Badge variant="secondary" className="ml-auto">
                {catalog?.vsCode ? `VS: ${catalog.vsCode}` : "Draft"}
              </Badge>
            </div>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">
          Begini kira-kira tampilan listingmu di marketplace — foto sampul
          menggantikan gradien setelah diunggah.
        </p>
      </aside>
    </div>
  );
}

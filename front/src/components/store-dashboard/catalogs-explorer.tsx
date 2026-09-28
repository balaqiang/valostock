"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardCheck, Package, Pencil, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/account/bits";
import { cn } from "@/lib/utils";
import { formatDateShort, formatRupiah } from "@/lib/format";
import type { CatalogStatus, MockStoreCatalog } from "@/lib/mock/store-dashboard";
import { catalogStatusLabel } from "@/lib/labels";

const statusVariant: Record<
  CatalogStatus,
  "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
> = {
  DRAFT: "secondary",
  LISTED: "success",
  LOCKED: "warning",
  IN_ORDER: "default",
  SOLD: "outline",
  DELISTED: "destructive",
};

const tabs: ("ALL" | CatalogStatus)[] = [
  "ALL",
  "LISTED",
  "DRAFT",
  "LOCKED",
  "IN_ORDER",
  "SOLD",
  "DELISTED",
];

export function CatalogsExplorer({ catalogs: myCatalogs }: { catalogs: MockStoreCatalog[] }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("ALL");
  const [query, setQuery] = useState("");

  const shown = (() => {
    const term = query.trim().toLowerCase();
    return myCatalogs.filter((catalog) => {
      if (tab !== "ALL" && catalog.status !== tab) return false;
      if (!term) return true;
      return `${catalog.title} ${catalog.vsCode ?? ""}`
        .toLowerCase()
        .includes(term);
    });
  })();

  return (
    <div>
      {/* Status filter */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={tab === item}
            onClick={() => setTab(item)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors duration-200",
              tab === item
                ? "bg-primary text-white"
                : "border border-border bg-background text-text-secondary hover:border-primary/40 hover:text-text",
            )}
          >
            {item === "ALL" ? "Semua" : catalogStatusLabel[item]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mt-4 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari judul atau kode VS…"
          aria-label="Cari katalog"
          className="h-10 pl-10"
        />
      </div>

      {/* List */}
      {shown.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {shown.map((catalog) => (
            <li
              key={catalog.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="num flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                  {catalog.vsCode ? (
                    <span className="rounded bg-surface-elevated px-1.5 py-0.5 font-semibold tracking-wider text-text">
                      VS: {catalog.vsCode}
                    </span>
                  ) : (
                    <span className="rounded bg-surface-elevated px-1.5 py-0.5 italic">
                      VS terbit saat publish
                    </span>
                  )}
                  {formatDateShort(catalog.createdAt)} ·{" "}
                  <span className="num">{catalog.views.toLocaleString("id-ID")} dilihat</span>
                </p>
                <p className="mt-1 truncate text-sm font-medium text-text">
                  {catalog.title}
                </p>
                <p className="num mt-0.5 text-sm font-semibold text-text">
                  {formatRupiah(catalog.price)}
                </p>
              </div>

              <div className="flex flex-none items-center gap-2">
                {catalog.accountChecked && (
                  <Badge variant="success">
                    <ClipboardCheck />
                    Checked
                  </Badge>
                )}
                <Badge variant={statusVariant[catalog.status]}>
                  {catalogStatusLabel[catalog.status]}
                </Badge>
                {!catalog.accountChecked && catalog.status !== "SOLD" && (
                  <Link
                    href={`/store-dashboard/inspections/${catalog.id}`}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors duration-200 hover:border-primary/40 hover:text-primary"
                  >
                    Inspeksi
                  </Link>
                )}
                <Link
                  href={`/store-dashboard/catalogs/${catalog.id}`}
                  aria-label={`Edit ${catalog.title}`}
                  className="rounded-lg border border-border p-2 text-text-secondary transition-colors duration-200 hover:border-primary/40 hover:text-primary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-5">
          <EmptyState
            icon={Package}
            title="Tidak ada katalog"
            body="Coba ubah filter, atau buat listing baru."
          />
        </div>
      )}
    </div>
  );
}

import Image from "next/image";
import { ChevronDown } from "lucide-react";
import type { AccountCollection } from "@/app/(marketplace)/catalog/[id]/collection";
import type { Edition } from "@/lib/valorant/skins";

const EDITIONS: { key: Edition; label: string }[] = [
  { key: "exclusive", label: "Exclusive" },
  { key: "ultra", label: "Ultra" },
  { key: "premium", label: "Premium" },
  { key: "deluxe", label: "Deluxe" },
  { key: "select", label: "Select" },
];

export function CollectionView({
  collection,
}: {
  collection: AccountCollection;
}) {
  return (
    <div>
      {/* Edition summary (iGV-style rail, as a strip) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="num rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          Skins {collection.total}
        </span>
        {EDITIONS.map((edition) => (
          <span
            key={edition.key}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-secondary"
          >
            <Image
              src={`/images/icon/${edition.key}-icon.png`}
              alt=""
              width={14}
              height={14}
            />
            <span className="font-medium text-text">{edition.label}</span>
            <span className="num">{collection.editions[edition.key]}</span>
          </span>
        ))}
      </div>

      {/* Categories */}
      <div className="mt-5 space-y-3">
        {collection.categories.map((category, index) => (
          <details
            key={category.label}
            open={index === 0}
            className="group rounded-xl border border-border bg-surface"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 [&::-webkit-details-marker]:hidden">
              <span className="font-display text-sm font-semibold tracking-wide text-text">
                {category.label}{" "}
                <span className="num font-sans font-normal text-text-secondary">
                  (Skins:{category.count})
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-text-secondary transition-transform duration-200 group-open:rotate-180" />
            </summary>

            <div className="space-y-4 border-t border-border p-4">
              {category.weapons.map((group) => (
                <div key={group.weapon}>
                  <div className="flex items-center gap-3">
                    {/* White silhouettes need a dark tile in both themes */}
                    <span className="flex h-9 w-16 flex-none items-center justify-center rounded-md bg-[#12101a] px-2 py-1.5">
                      <Image
                        src={group.typeIcon}
                        alt=""
                        width={52}
                        height={20}
                        className="max-h-6 w-auto object-contain"
                      />
                    </span>
                    <span className="text-sm font-medium text-text">
                      {group.weapon}
                    </span>
                    <span className="num ml-auto text-xs text-text-secondary">
                      {group.skins.length} skin
                    </span>
                  </div>

                  {group.skins.length > 0 && (
                    <ul className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {group.skins.map((skin) => (
                        <li
                          key={skin.name}
                          className="overflow-hidden rounded-lg border border-border bg-background"
                        >
                          <div
                            className="relative h-16 bg-cover bg-center"
                            style={{
                              backgroundImage: `url(/images/icon/${skin.edition}-bg.jpg)`,
                            }}
                          >
                            {skin.icon && (
                              <Image
                                src={skin.icon}
                                alt={skin.name}
                                fill
                                sizes="180px"
                                className="object-contain p-2"
                              />
                            )}
                            <Image
                              src={`/images/icon/${skin.edition}-icon.png`}
                              alt={skin.edition}
                              width={12}
                              height={12}
                              className="absolute right-1.5 top-1.5"
                            />
                          </div>
                          <p className="truncate px-2 py-1.5 text-[11px] font-medium text-text">
                            {skin.name}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

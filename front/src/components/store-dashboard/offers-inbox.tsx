"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, HandCoins, Undo2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/account/bits";
import { formatDateShort, formatRupiah } from "@/lib/format";
import type { MockIncomingOffer } from "@/lib/mock/store-dashboard";

type Decision =
  | { kind: "ACCEPTED" }
  | { kind: "REJECTED" }
  | { kind: "COUNTERED"; amount: number };

/** Accept / counter / reject inbox — local state only; the API owns offers. */
export function OffersInbox({ offers: incomingOffers }: { offers: MockIncomingOffer[] }) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [countering, setCountering] = useState<string | null>(null);
  const [counterValue, setCounterValue] = useState("");

  const decide = (id: string, decision: Decision) => {
    setDecisions((current) => ({ ...current, [id]: decision }));
    setCountering(null);
    setCounterValue("");
  };

  const pending = incomingOffers.filter((offer) => !decisions[offer.id]);

  const renderOffer = (offer: MockIncomingOffer) => {
    const decision = decisions[offer.id];

    return (
      <li
        key={offer.id}
        className="rounded-xl border border-border bg-surface p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href={`/catalog/${offer.catalogId}`}
            className="truncate text-sm font-medium text-text transition-colors duration-200 hover:text-primary"
          >
            {offer.title}
          </Link>
          {decision ? (
            <Badge
              variant={
                decision.kind === "ACCEPTED"
                  ? "success"
                  : decision.kind === "COUNTERED"
                    ? "warning"
                    : "destructive"
              }
            >
              {decision.kind === "ACCEPTED"
                ? "Diterima — harga terkunci"
                : decision.kind === "COUNTERED"
                  ? `Ditawar balik ${formatRupiah(decision.amount)}`
                  : "Ditolak"}
            </Badge>
          ) : (
            <Badge variant="warning">
              Berlaku s.d. {formatDateShort(offer.expiresAt)}
            </Badge>
          )}
        </div>

        <dl className="num mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-secondary">
          <div>
            Pembeli:{" "}
            <span className="font-medium text-text">{offer.buyer}</span>{" "}
            (trust {offer.buyerTrust})
          </div>
          <div>
            Harga listing:{" "}
            <span className="font-medium text-text">
              {formatRupiah(offer.listPrice)}
            </span>
          </div>
          <div>
            Tawaran:{" "}
            <span className="font-semibold text-primary">
              {formatRupiah(offer.amount)}
            </span>{" "}
            ({Math.round((offer.amount / offer.listPrice) * 100)}%)
          </div>
        </dl>

        {!decision && (
          <div className="mt-3 border-t border-border pt-3">
            <AnimatePresence mode="wait">
              {countering === offer.id ? (
                <motion.div
                  key="counter"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex flex-wrap items-center gap-2"
                >
                  <Input
                    type="number"
                    value={counterValue}
                    onChange={(event) => setCounterValue(event.target.value)}
                    placeholder={`cth: ${offer.listPrice - 30_000}`}
                    aria-label="Harga tawaran balik"
                    className="num h-9 max-w-45"
                  />
                  <Button
                    variant="primary"
                    size="md"
                    disabled={!counterValue || Number(counterValue) <= 0}
                    onClick={() =>
                      decide(offer.id, {
                        kind: "COUNTERED",
                        amount: Number(counterValue),
                      })
                    }
                  >
                    Kirim
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => setCountering(null)}
                  >
                    Batal
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-wrap gap-2"
                >
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => decide(offer.id, { kind: "ACCEPTED" })}
                  >
                    <Check className="h-4 w-4" />
                    Terima
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setCountering(offer.id)}
                  >
                    <Undo2 className="h-4 w-4" />
                    Tawar Balik
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => decide(offer.id, { kind: "REJECTED" })}
                  >
                    <X className="h-4 w-4" />
                    Tolak
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </li>
    );
  };

  return (
    <div>
      {incomingOffers.length > 0 ? (
        <>
          <p className="text-sm text-text-secondary">
            <span className="num font-medium text-text">{pending.length}</span>{" "}
            penawaran menunggu keputusanmu. Menerima penawaran mengunci harga
            dan listing untuk pembeli tersebut.
          </p>
          <ul className="mt-4 space-y-3">{incomingOffers.map(renderOffer)}</ul>
        </>
      ) : (
        <EmptyState
          icon={HandCoins}
          title="Belum ada penawaran masuk"
          body="Penawaran dari pembeli (Tawar) akan muncul di sini."
        />
      )}
    </div>
  );
}

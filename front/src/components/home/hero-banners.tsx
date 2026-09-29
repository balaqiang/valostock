"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SiteBanner } from "@/lib/data/site";

const INTERVAL_MS = 6000;

/**
 * Home hero slider for the CMS banners (Admin → CMS Situs → Banner beranda).
 * Auto-advances, pauses on hover/focus, swipe on touch, arrow keys, dots.
 */
export function HeroBanners({ banners }: { banners: SiteBanner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = banners.length;
  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  const banner = banners[index] ?? banners[0]!;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Banner"
      className="relative overflow-hidden rounded-3xl bg-zinc-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        touchX.current = null;
        if (start === null || end === undefined || Math.abs(end - start) < 40) return;
        go(end < start ? index + 1 : index - 1);
      }}
    >
      <div className="relative aspect-[4/5] sm:aspect-[21/9]">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={banner.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} dari ${count}`}
          >
            <Image src={banner.imageUrl} alt="" fill priority={index === 0} sizes="(min-width: 1280px) 1200px, 100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/5 sm:bg-gradient-to-r sm:from-black/75 sm:via-black/35 sm:to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:inset-y-0 sm:flex sm:max-w-2xl sm:flex-col sm:justify-center sm:p-12">
              <h2 className="font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-4xl">{banner.title}</h2>
              {banner.subtitle && <p className="mt-3 max-w-xl text-sm text-white/85 sm:text-base">{banner.subtitle}</p>}
              {banner.ctaLabel && banner.linkUrl && (
                <Link
                  href={banner.linkUrl}
                  className="mt-5 inline-flex w-fit items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-white/90"
                >
                  {banner.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Banner sebelumnya"
            onClick={() => go(index - 1)}
            className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 sm:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Banner berikutnya"
            onClick={() => go(index + 1)}
            className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 sm:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute right-4 top-4 flex gap-1.5 sm:bottom-5 sm:left-12 sm:right-auto sm:top-auto">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-label={`Tampilkan banner ${i + 1}`}
                aria-current={i === index}
                onClick={() => go(i)}
                className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80")}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

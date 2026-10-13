"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ImageSlider({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);

  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  return (
    <div>
      {/* Main stage — images stacked, crossfaded */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-surface-elevated">
        {images.map((src, i) => (
          <Image
            key={src + i}
            src={src}
            alt={`${alt}, foto ${i + 1}`}
            fill
            priority={i === 0}
            sizes="(max-width: 1024px) 100vw, 640px"
            className={`object-cover transition-opacity duration-300 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        <button
          type="button"
          onClick={prev}
          aria-label="Foto sebelumnya"
          className="absolute left-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/75"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Foto berikutnya"
          className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/75"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <span className="num absolute bottom-3 right-3 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {index + 1}/{images.length}
        </span>
      </div>

      {/* Thumbnails */}
      <div className="mt-3 grid grid-cols-5 gap-2">
        {images.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Lihat foto ${i + 1}`}
            aria-current={i === index}
            className={`relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition-colors duration-200 ${
              i === index
                ? "border-primary"
                : "border-transparent opacity-70 hover:opacity-100"
            }`}
          >
            <Image
              src={src}
              alt=""
              fill
              sizes="120px"
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

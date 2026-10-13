import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Game banner background (CMS): the uploaded image with a dark scrim so white
 * text stays readable, or the game's gradient when no banner is set.
 */
export function GameBannerBackdrop({
  image,
  gradient,
  sizes,
  priority,
  className,
}: {
  image?: string | null;
  gradient: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", gradient, className)}>
      {image && (
        <>
          <Image src={image} alt="" fill sizes={sizes} priority={priority} className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
        </>
      )}
    </div>
  );
}

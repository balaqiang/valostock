import Link from "next/link";
import Image from "next/image";

// The wordmark SVG bundles both the astral mark and the "valostock" lettering.
// `white` forces the light wordmark (e.g. over a dark hero, regardless of theme).
export function Logo({
  className = "",
  white = false,
}: {
  className?: string;
  white?: boolean;
}) {
  if (white) {
    return (
      <Link
        href="/"
        aria-label="valostock, beranda"
        className={`inline-flex items-center ${className}`}
      >
        <Image
          src="/images/logo/logotext-white.svg"
          alt="valostock"
          width={146}
          height={30}
          priority
        />
      </Link>
    );
  }

  return (
    <Link
      href="/"
      aria-label="valostock, beranda"
      className={`inline-flex items-center ${className}`}
    >
      <Image
        src="/images/logo/logotext-black.svg"
        alt="valostock"
        width={146}
        height={30}
        priority
        className="block dark:hidden"
      />
      <Image
        src="/images/logo/logotext-white.svg"
        alt="valostock"
        width={146}
        height={30}
        priority
        className="hidden dark:block"
      />
    </Link>
  );
}

// Standalone astral mark (no wordmark) — for compact spots.
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <>
      <Image
        src="/images/logo/logo-black.svg"
        alt="valostock"
        width={28}
        height={28}
        className={`block dark:hidden ${className}`}
      />
      <Image
        src="/images/logo/logo-white.svg"
        alt="valostock"
        width={28}
        height={28}
        className={`hidden dark:block ${className}`}
      />
    </>
  );
}

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const compact = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Integer Rupiah → "Rp 1.850.000". Money values are always integer Rupiah. */
export function formatRupiah(value: number): string {
  return rupiah.format(value);
}

/** 4223 → "4,2 rb" — for sold counts and similar. */
export function formatCompact(value: number): string {
  return compact.format(value);
}

const dateShort = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

const dateLong = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "2026-07-10" → "10/7/2026" — news cards. */
export function formatDateShort(iso: string): string {
  return dateShort.format(new Date(iso));
}

/** "2026-07-10" → "10 Juli 2026" — article headers. */
export function formatDateLong(iso: string): string {
  return dateLong.format(new Date(iso));
}

const dateTime = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

/** API timestamps are UTC: ISO-8601, or MySQL "2026-09-18 13:21:49" without a zone. */
export function parseDbDate(value: string): Date {
  return new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
}

/** "2026-09-18 13:21:49" → "18 Sep 2026, 20.21" (WIB). */
export function formatDbDateTime(value: string): string {
  return dateTime.format(parseDbDate(value));
}

/** Short, human-readable customer ID derived from the user UUID. */
export function customerIdFor(userId: string): string {
  return `VSB-${userId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

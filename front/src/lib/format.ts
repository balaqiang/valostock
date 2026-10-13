const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/** Integer Rupiah → "Rp 1.850.000". Money values are always integer Rupiah. */
export function formatRupiah(value: number): string {
  return rupiah.format(value);
}

const dateTime = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

/** API timestamps are ISO-8601 UTC: "2026-09-18T13:21:49.000Z" → "18 Sep 2026, 20.21" (WIB). */
export function formatDbDateTime(value: string): string {
  return dateTime.format(new Date(value));
}

/** Short, human-readable customer ID derived from the user UUID. */
export function customerIdFor(userId: string): string {
  return `VSB-${userId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

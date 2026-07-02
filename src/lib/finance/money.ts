/** Money helpers. All internal amounts are integer cents. */

export function formatCents(
  cents: number,
  currency: string = "EUR",
  locale: string = "es-ES"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Compact form for chart axes: 1.2k, 15k ... */
export function formatCentsCompact(cents: number, currency: string = "EUR"): string {
  const euros = cents / 100;
  const abs = Math.abs(euros);
  const sign = euros < 0 ? "-" : "";
  const symbol = currency === "EUR" ? "€" : currency + " ";
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}${symbol}${Math.round(abs / 1000)}k`;
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1000).toFixed(1)}k`;
  return `${sign}${symbol}${Math.round(abs)}`;
}

/** Parse a user-entered decimal string ("12,50" or "12.50") into cents. */
export function parseToCents(value: string | number): number {
  if (typeof value === "number") return Math.round(value * 100);
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function centsToInput(cents: number): number {
  return Math.round(cents) / 100;
}

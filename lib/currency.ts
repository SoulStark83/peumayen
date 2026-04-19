const eurFmt = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const eurFmtShort = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatEUR(amount: number, short = false): string {
  return short ? eurFmtShort.format(amount) : eurFmt.format(amount);
}

export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/\s|€/g, "").replace(".", "").replace(",", ".");
  const n = parseFloat(cleaned);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100) / 100;
}

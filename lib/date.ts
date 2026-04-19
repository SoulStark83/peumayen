const TZ = "Europe/Madrid";

const timeFmt = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TZ,
});

const weekdayFmt = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  timeZone: TZ,
});

const fullDateFmt = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TZ,
});

const fullDateShortYearFmt = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  timeZone: TZ,
});

function toDate(d: Date | string): Date {
  return typeof d === "string" ? new Date(d) : d;
}

/** Returns "2026-04-17" in Europe/Madrid for grouping. */
export function dayKeyMadrid(d: Date | string): string {
  const date = toDate(d);
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TZ,
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${day}`;
}

export function messageTimeLabel(d: Date | string): string {
  return timeFmt.format(toDate(d));
}

/** "Hoy" | "Ayer" | "Lunes" | "5 de abril" | "5 de abril de 2024" */
export function relativeDayLabel(d: Date | string): string {
  const date = toDate(d);
  const today = dayKeyMadrid(new Date());
  const target = dayKeyMadrid(date);

  if (today === target) return "Hoy";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKeyMadrid(yesterday) === target) return "Ayer";

  // Within last 7 days: weekday name
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays > 0 && diffDays < 7) {
    return capitalize(weekdayFmt.format(date));
  }

  const currentYear = new Date().getFullYear();
  if (date.getFullYear() === currentYear) {
    return fullDateShortYearFmt.format(date);
  }
  return fullDateFmt.format(date);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const monthTitleFmt = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
  timeZone: TZ,
});

const dayNumFmt = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  timeZone: TZ,
});

const dayMonthFmt = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  timeZone: TZ,
});

/** Spanish short weekday labels (Monday first). */
export const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"] as const;

/** Build a 6x7 grid of dates covering the given month, starting on Monday. */
export function buildMonthGrid(year: number, month0: number): Date[][] {
  const first = new Date(Date.UTC(year, month0, 1));
  // JS getUTCDay: 0 Sun..6 Sat. Convert to Mon-first index.
  const firstWeekdayMonFirst = (first.getUTCDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setUTCDate(first.getUTCDate() - firstWeekdayMonFirst);

  const grid: Date[][] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    grid.push(week);
  }
  return grid;
}

export function formatMonthTitle(year: number, month0: number): string {
  const d = new Date(Date.UTC(year, month0, 1));
  return capitalize(monthTitleFmt.format(d));
}

export function formatDayNum(d: Date): string {
  return dayNumFmt.format(d);
}

export function formatDayMonth(d: Date | string): string {
  return dayMonthFmt.format(toDate(d));
}

export function isSameMonth(d: Date, year: number, month0: number): boolean {
  return d.getUTCFullYear() === year && d.getUTCMonth() === month0;
}

export function isToday(d: Date): boolean {
  return dayKeyMadrid(d) === dayKeyMadrid(new Date());
}

export function shiftMonth(
  year: number,
  month0: number,
  delta: number,
): { year: number; month0: number } {
  const total = year * 12 + month0 + delta;
  return { year: Math.floor(total / 12), month0: ((total % 12) + 12) % 12 };
}

/** ISO date ("YYYY-MM-DD") in Madrid tz — suitable for `presence.date` column. */
export function todayISODateMadrid(): string {
  return dayKeyMadrid(new Date());
}

/** Returns "YYYY-MM" in Madrid for the given date. */
export function monthKeyMadrid(d: Date | string): string {
  return dayKeyMadrid(d).slice(0, 7);
}

/** First/last ISO timestamps of a month, UTC bounds suitable for gte/lte. */
export function monthBounds(year: number, month0: number): { from: string; to: string } {
  const from = new Date(Date.UTC(year, month0, 1)).toISOString();
  const to = new Date(Date.UTC(year, month0 + 1, 0, 23, 59, 59)).toISOString();
  return { from, to };
}

/** Two messages in the same bubble group if same sender + within 5 min. */
export function shouldGroupWithPrevious(
  current: { sender_id: string; created_at: string },
  previous: { sender_id: string; created_at: string } | undefined,
): boolean {
  if (!previous) return false;
  if (current.sender_id !== previous.sender_id) return false;
  const diffMs =
    new Date(current.created_at).getTime() - new Date(previous.created_at).getTime();
  return diffMs >= 0 && diffMs < 5 * 60 * 1000;
}

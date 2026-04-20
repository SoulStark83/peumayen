import { dayKeyMadrid } from "@/lib/date";
import type { Item, PeriodDayData, HealthSettingsData, FlowLevel } from "@/lib/types";

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_DURATION = 5;
export const DEFAULT_RETAINER_DAYS = 10;

// ── Period parsing ─────────────────────────────────────────────────────────────

export type CycleInfo = {
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD or null if ongoing
  length: number | null; // days until next cycle start, null if last cycle
};

/** Extract sorted list of YYYY-MM-DD keys where is_period = true */
export function periodDayKeys(items: Item[]): string[] {
  return items
    .filter((i) => i.type === "period_day" && (i.data as PeriodDayData).is_period)
    .map((i) => i.due_at ? dayKeyMadrid(i.due_at) : null)
    .filter((d): d is string => d !== null)
    .sort();
}

/** Group consecutive period days into cycle objects */
export function buildCycles(periodItems: Item[]): CycleInfo[] {
  const days = periodDayKeys(periodItems);
  if (days.length === 0) return [];

  const cycles: CycleInfo[] = [];
  let start = days[0];
  let prev = days[0];

  for (let i = 1; i < days.length; i++) {
    const diffMs = new Date(days[i]).getTime() - new Date(prev).getTime();
    const diffDays = Math.round(diffMs / 86_400_000);

    // Gap > 2 days = new cycle
    if (diffDays > 2) {
      cycles.push({ startDate: start, endDate: prev, length: null });
      start = days[i];
    }
    prev = days[i];
  }
  cycles.push({ startDate: start, endDate: prev, length: null });

  // Fill cycle lengths
  for (let i = 0; i < cycles.length - 1; i++) {
    const diffMs =
      new Date(cycles[i + 1].startDate).getTime() -
      new Date(cycles[i].startDate).getTime();
    cycles[i].length = Math.round(diffMs / 86_400_000);
  }

  return cycles.reverse(); // most recent first
}

/** Average cycle length from completed cycles */
export function avgCycleLength(cycles: CycleInfo[]): number {
  const completed = cycles.filter((c) => c.length !== null);
  if (completed.length === 0) return DEFAULT_CYCLE_LENGTH;
  const sum = completed.reduce((acc, c) => acc + (c.length ?? 0), 0);
  return Math.round(sum / completed.length);
}

/** Average period duration from all cycles with known end dates */
export function avgPeriodDuration(cycles: CycleInfo[]): number {
  const known = cycles.filter((c) => c.endDate !== null);
  if (known.length === 0) return DEFAULT_PERIOD_DURATION;
  const durations = known.map((c) => {
    const diffMs =
      new Date(c.endDate!).getTime() - new Date(c.startDate).getTime();
    return Math.round(diffMs / 86_400_000) + 1;
  });
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}

// ── Current state ──────────────────────────────────────────────────────────────

export type CyclePhase =
  | "menstruation"
  | "follicular"
  | "ovulation"
  | "luteal"
  | "pms"
  | "unknown";

export type CycleState = {
  today: string;
  cycleDay: number | null;       // day number within current cycle (1-based)
  phase: CyclePhase;
  nextPeriodDate: string | null; // YYYY-MM-DD prediction
  ovulationDate: string | null;  // YYYY-MM-DD prediction
  fertileStart: string | null;
  fertileEnd: string | null;
  pmsStart: string | null;
  isOnPeriod: boolean;
  daysUntilNextPeriod: number | null;
  avgCycleDays: number;
  avgPeriodDays: number;
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  return Math.round(
    (new Date(b + "T12:00:00Z").getTime() - new Date(a + "T12:00:00Z").getTime()) /
      86_400_000,
  );
}

export function computeCycleState(
  periodItems: Item[],
  settings: HealthSettingsData | null,
): CycleState {
  const today = dayKeyMadrid(new Date());
  const cycles = buildCycles(periodItems);
  const avgCycleDays = settings?.cycle_length ?? avgCycleLength(cycles);
  const avgPeriodDays = settings?.period_duration ?? avgPeriodDuration(cycles);

  const todayData = periodItems.find(
    (i) =>
      i.type === "period_day" &&
      i.due_at &&
      dayKeyMadrid(i.due_at) === today,
  );
  const isOnPeriod = todayData
    ? !!(todayData.data as PeriodDayData).is_period
    : false;

  if (cycles.length === 0) {
    return {
      today, cycleDay: null, phase: "unknown",
      nextPeriodDate: null, ovulationDate: null,
      fertileStart: null, fertileEnd: null, pmsStart: null,
      isOnPeriod, daysUntilNextPeriod: null,
      avgCycleDays, avgPeriodDays,
    };
  }

  // Most recent cycle start
  const lastStart = cycles[0].startDate;
  const cycleDay = diffDays(lastStart, today) + 1;

  // Predictions from last known start
  const nextPeriodDate = addDays(lastStart, avgCycleDays);
  const ovulationDate = addDays(lastStart, avgCycleDays - 14);
  const fertileStart = addDays(ovulationDate, -3);
  const fertileEnd = addDays(ovulationDate, 1);
  const pmsStart = addDays(nextPeriodDate, -5);
  const daysUntilNextPeriod = diffDays(today, nextPeriodDate);

  // Phase
  let phase: CyclePhase = "follicular";
  if (isOnPeriod || cycleDay <= avgPeriodDays) {
    phase = "menstruation";
  } else if (today >= fertileStart && today <= fertileEnd) {
    phase = today === ovulationDate ? "ovulation" : "follicular";
  } else if (today >= pmsStart) {
    phase = "pms";
  } else if (today >= ovulationDate) {
    phase = "luteal";
  }

  return {
    today, cycleDay, phase,
    nextPeriodDate, ovulationDate,
    fertileStart, fertileEnd, pmsStart,
    isOnPeriod, daysUntilNextPeriod,
    avgCycleDays, avgPeriodDays,
  };
}

// ── Day classification for calendar ───────────────────────────────────────────

export type DayKind =
  | "period"
  | "fertile"
  | "ovulation"
  | "pms"
  | "luteal"
  | "follicular"
  | "none";

export function dayKindForDate(dateStr: string, state: CycleState): DayKind {
  const { fertileStart, fertileEnd, ovulationDate, pmsStart, nextPeriodDate, avgCycleDays } = state;
  if (!nextPeriodDate) return "none";

  // Check against logged period days handled by caller; here we use predictions
  if (dateStr === ovulationDate) return "ovulation";
  if (fertileStart && fertileEnd && dateStr >= fertileStart && dateStr <= fertileEnd) return "fertile";
  if (pmsStart && nextPeriodDate && dateStr >= pmsStart && dateStr < nextPeriodDate) return "pms";
  return "none";
}

// ── Phase labels ───────────────────────────────────────────────────────────────

export const PHASE_LABEL: Record<CyclePhase, string> = {
  menstruation: "Menstruación",
  follicular: "Fase folicular",
  ovulation: "Ovulación",
  luteal: "Fase lútea",
  pms: "SPM",
  unknown: "Sin datos",
};

export const PHASE_COLOR: Record<CyclePhase, string> = {
  menstruation: "text-rose-500",
  follicular: "text-sky-500",
  ovulation: "text-emerald-500",
  luteal: "text-violet-500",
  pms: "text-amber-500",
  unknown: "text-muted-foreground",
};

export const PHASE_BG: Record<CyclePhase, string> = {
  menstruation: "bg-rose-100 dark:bg-rose-900/30",
  follicular: "bg-sky-100 dark:bg-sky-900/30",
  ovulation: "bg-emerald-100 dark:bg-emerald-900/30",
  luteal: "bg-violet-100 dark:bg-violet-900/30",
  pms: "bg-amber-100 dark:bg-amber-900/30",
  unknown: "bg-muted",
};

// ── Flow labels ────────────────────────────────────────────────────────────────

export const FLOW_LABEL: Record<FlowLevel, string> = {
  spotting: "Manchado",
  light: "Leve",
  medium: "Moderado",
  heavy: "Abundante",
};

// ── Retainer helpers ───────────────────────────────────────────────────────────

export type RetainerState = {
  currentType: "A" | "B";
  startDate: string;       // YYYY-MM-DD
  dayNumber: number;       // 1-based
  totalDays: number;
  daysLeft: number;
  changeDate: string;      // YYYY-MM-DD when to change
  overdueBy: number;       // > 0 if overdue
};

export function computeRetainerState(
  retainerItems: Item[],
  settings: HealthSettingsData | null,
): RetainerState | null {
  if (retainerItems.length === 0) return null;

  const sorted = [...retainerItems].sort((a, b) =>
    (b.due_at ?? b.created_at).localeCompare(a.due_at ?? a.created_at),
  );
  const last = sorted[0];
  const data = last.data as { retainer_type: "A" | "B" };
  const startDate = dayKeyMadrid(last.due_at ?? last.created_at);
  const totalDays = settings?.retainer_change_days ?? DEFAULT_RETAINER_DAYS;
  const today = dayKeyMadrid(new Date());
  const dayNumber = diffDays(startDate, today) + 1;
  const daysLeft = totalDays - dayNumber + 1;
  const changeDate = addDays(startDate, totalDays - 1);
  const overdueBy = Math.max(0, -daysLeft);

  return {
    currentType: data.retainer_type,
    startDate,
    dayNumber,
    totalDays,
    daysLeft: Math.max(0, daysLeft),
    changeDate,
    overdueBy,
  };
}

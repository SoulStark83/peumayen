import Link from "next/link";
import { AlignJustify, ChevronRight, Sparkles } from "lucide-react";
import {
  computeCycleState,
  computeRetainerState,
  PHASE_BG,
  PHASE_COLOR,
  PHASE_LABEL,
  DEFAULT_RETAINER_DAYS,
} from "@/lib/salud/cycle-calc";
import type { HealthSettingsData, Item } from "@/lib/types";

export function HealthWidget({
  periodItems,
  retainerItems,
  settingsItem,
  memberId,
}: {
  periodItems: Item[];
  retainerItems: Item[];
  settingsItem: Item | null;
  memberId: string;
}) {
  const settings = settingsItem?.data as HealthSettingsData | null;

  const cycleState = computeCycleState(periodItems, settings);
  const retainerState = computeRetainerState(
    retainerItems.filter((i) => i.created_by === memberId),
    settings,
  );

  return (
    <div className="grid grid-cols-2 gap-2">
        {/* Cycle card */}
        <Link href="/salud" className="block">
          <div
            className={`hover:opacity-90 flex h-full flex-col gap-1 rounded-xl border p-3 transition ${PHASE_BG[cycleState.phase]}`}
          >
            <div className="flex items-center justify-between">
              <Sparkles className={`h-4 w-4 ${PHASE_COLOR[cycleState.phase]}`} />
              <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
            </div>
            <p className={`text-sm font-semibold leading-tight ${PHASE_COLOR[cycleState.phase]}`}>
              {PHASE_LABEL[cycleState.phase]}
            </p>
            {cycleState.cycleDay !== null ? (
              <p className="text-muted-foreground text-xs">Día {cycleState.cycleDay}</p>
            ) : (
              <p className="text-muted-foreground text-xs">Sin datos aún</p>
            )}
            {cycleState.daysUntilNextPeriod !== null &&
              cycleState.daysUntilNextPeriod >= 0 &&
              cycleState.phase !== "menstruation" && (
                <p className="text-muted-foreground mt-auto pt-1 text-[10px]">
                  {cycleState.daysUntilNextPeriod === 0
                    ? "Regla hoy"
                    : cycleState.daysUntilNextPeriod === 1
                    ? "Regla mañana"
                    : `Regla en ${cycleState.daysUntilNextPeriod}d`}
                </p>
              )}
          </div>
        </Link>

        {/* Retainer card */}
        <Link href="/salud?tab=retenedores" className="block">
          <div className="bg-card hover:bg-muted/40 flex h-full flex-col gap-1 rounded-xl border p-3 transition">
            <div className="flex items-center justify-between">
              <AlignJustify className="text-muted-foreground h-4 w-4" />
              <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
            </div>
            {retainerState ? (
              <>
                <p className="text-sm font-semibold">
                  Retenedor {retainerState.currentType}
                </p>
                <p className="text-muted-foreground text-xs">
                  Día {retainerState.dayNumber} de {retainerState.totalDays}
                </p>
                <div className="mt-auto pt-1">
                  {retainerState.overdueBy > 0 ? (
                    <span className="text-[10px] font-medium text-rose-500">
                      Vencido {retainerState.overdueBy}d
                    </span>
                  ) : retainerState.daysLeft <= 2 ? (
                    <span className="text-[10px] font-medium text-amber-500">
                      {retainerState.daysLeft === 0
                        ? "Cambiar hoy"
                        : `Cambiar en ${retainerState.daysLeft}d`}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-[10px]">
                      {retainerState.daysLeft}d restantes
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">Retenedor</p>
                <p className="text-muted-foreground text-xs">Sin registro</p>
              </>
            )}
          </div>
        </Link>
    </div>
  );
}

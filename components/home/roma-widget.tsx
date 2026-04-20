import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatDayMonth } from "@/lib/date";
import type { Item } from "@/lib/types";

function daysAgoLabel(isoDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(isoDate);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return "hoy";
  if (diff === 1) return "ayer";
  if (diff <= 6) return `hace ${diff} días`;
  return formatDayMonth(d);
}

function daysUntilLabel(isoDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(isoDate);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff <= 0) return "hoy";
  if (diff === 1) return "mañana";
  if (diff <= 13) return `en ${diff} días`;
  return formatDayMonth(d);
}

export function RomaWidget({
  lastWalk,
  nextVet,
}: {
  lastWalk: Item | null;
  nextVet: Item | null;
}) {
  return (
    <Link href="/roma" className="family-card flex items-center gap-4 p-4 hover:opacity-90 transition-opacity">
      {/* Avatar de Roma */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-2xl">
        🐕
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="font-bold">Roma</p>
        <div className="mt-0.5 flex flex-col gap-0.5">
          {lastWalk?.due_at ? (
            <p className="text-muted-foreground text-xs">
              Último paseo: <span className="font-medium text-foreground">{daysAgoLabel(lastWalk.due_at)}</span>
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">Sin paseos registrados aún</p>
          )}
          {nextVet?.due_at && (
            <p className="text-muted-foreground text-xs">
              Próxima cita vet: <span className="font-medium text-foreground">{daysUntilLabel(nextVet.due_at)}</span>
            </p>
          )}
        </div>
      </div>

      <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
    </Link>
  );
}

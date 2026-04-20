import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatEUR } from "@/lib/currency";
import type { Item } from "@/lib/types";

type SubData = {
  amount: number;
  cadence: "monthly" | "yearly";
  billing_day: number;
};

type NextBilling = {
  title: string;
  amount: number;
  daysUntil: number;
};

export function computeNextBilling(subs: Item[]): NextBilling | null {
  const now = new Date();
  const todayDay = now.getDate();
  const y = now.getFullYear();
  const m = now.getMonth();
  now.setHours(0, 0, 0, 0);

  let closest: NextBilling | null = null;

  for (const sub of subs) {
    const data = sub.data as SubData;
    if (!data?.billing_day || !sub.title) continue;

    const billingDate = data.billing_day >= todayDay
      ? new Date(y, m, data.billing_day)
      : new Date(y, m + 1, data.billing_day);

    billingDate.setHours(0, 0, 0, 0);
    const diff = Math.round((billingDate.getTime() - now.getTime()) / 86_400_000);

    if (closest === null || diff < closest.daysUntil) {
      closest = { title: sub.title, amount: data.amount, daysUntil: diff };
    }
  }

  return closest;
}

function daysLabel(d: number): string {
  if (d === 0) return "hoy";
  if (d === 1) return "mañana";
  return `en ${d} días`;
}

export function FinanceWidget({ subs }: { subs: Item[] }) {
  const next = computeNextBilling(subs);

  return (
    <Link href="/finances" className="family-card flex items-center gap-4 p-4 hover:opacity-90 transition-opacity">
      {/* Icono */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl">
        💳
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="font-bold">Finanzas</p>
        {next ? (
          <p className="text-muted-foreground mt-0.5 text-xs">
            <span className="font-medium text-foreground">{next.title}</span>
            {" · "}{formatEUR(next.amount)}
            {" · "}<span className="font-medium text-foreground">{daysLabel(next.daysUntil)}</span>
          </p>
        ) : (
          <p className="text-muted-foreground mt-0.5 text-xs">Sin suscripciones activas</p>
        )}
      </div>

      <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
    </Link>
  );
}

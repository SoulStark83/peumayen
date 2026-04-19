import Link from "next/link";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { requireHouseholdContext } from "@/lib/auth";
import { formatEUR } from "@/lib/currency";
import { formatMonthTitle, monthBounds } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";

type TxData = {
  amount: number;
  kind: "expense" | "income" | "transfer";
};

type SubData = {
  amount: number;
  cadence: "monthly" | "yearly";
};

export async function FinanceSummaryCard() {
  const { household } = await requireHouseholdContext();
  const supabase = await createClient();

  const now = new Date();
  const { from, to } = monthBounds(now.getUTCFullYear(), now.getUTCMonth());

  const [txRes, subRes] = await Promise.all([
    supabase
      .from("items")
      .select("data")
      .eq("household_id", household.id)
      .eq("type", "transaction")
      .gte("due_at", from)
      .lte("due_at", to),
    supabase
      .from("items")
      .select("data")
      .eq("household_id", household.id)
      .eq("type", "subscription"),
  ]);

  let income = 0;
  let expense = 0;
  for (const row of (txRes.data as { data: TxData }[] | null) ?? []) {
    const d = row.data;
    if (!d) continue;
    if (d.kind === "transfer") continue;
    if (d.kind === "income") income += Math.abs(d.amount);
    else expense += Math.abs(d.amount);
  }

  let subsMonthly = 0;
  for (const row of (subRes.data as { data: SubData }[] | null) ?? []) {
    const d = row.data;
    if (!d) continue;
    subsMonthly += d.cadence === "yearly" ? d.amount / 12 : d.amount;
  }

  const balance = income - expense;

  return (
    <Link
      href="/finances"
      className="bg-card hover:border-primary/40 block rounded-xl border p-4 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            {formatMonthTitle(now.getUTCFullYear(), now.getUTCMonth())}
          </p>
          <p className="text-lg font-semibold tabular-nums">
            {formatEUR(balance, true)}
          </p>
        </div>
        <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
          <Wallet className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Metric
          icon={<TrendingUp className="h-3 w-3" />}
          label="Ingresos"
          value={formatEUR(income, true)}
          tone="pos"
        />
        <Metric
          icon={<TrendingDown className="h-3 w-3" />}
          label="Gastos"
          value={formatEUR(expense, true)}
          tone="neg"
        />
        <Metric label="Subs/mes" value={formatEUR(subsMonthly, true)} />
      </div>
    </Link>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  tone?: "pos" | "neg";
}) {
  const toneClass =
    tone === "pos"
      ? "text-emerald-600"
      : tone === "neg"
        ? "text-rose-600"
        : "text-foreground";
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs font-medium">
        {icon}
        {label}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${toneClass}`}>
        {value}
      </span>
    </div>
  );
}

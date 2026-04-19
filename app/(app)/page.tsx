import Link from "next/link";
import {
  CalendarDays,
  CheckSquare,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { FinanceSummaryCard } from "@/components/finances/finance-summary-card";
import { HomeUpcomingEvents } from "@/components/home/home-upcoming-events";
import { HomeRomaStatus } from "@/components/home/home-roma-status";
import { PresenceWidget } from "@/components/presence/presence-widget";
import { requireHouseholdContext } from "@/lib/auth";
import { todayISODateMadrid } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import type { Item, Presence } from "@/lib/types";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const { household, currentMember, members } = await requireHouseholdContext();
  const supabase = await createClient();
  const today = todayISODateMadrid();
  const isAdmin = currentMember.role === "admin";

  const todayStart = new Date(`${today}T00:00:00+02:00`).toISOString();
  const todayEnd = new Date(`${today}T23:59:59+02:00`).toISOString();

  const baseQueries = [
    supabase
      .from("presence")
      .select("id, household_id, member_id, date, status, notes, updated_by, updated_at")
      .eq("household_id", household.id)
      .eq("date", today),
    supabase
      .from("items")
      .select("id, assigned_to, due_at")
      .eq("household_id", household.id)
      .eq("type", "task")
      .is("completed_at", null),
    supabase
      .from("items")
      .select("id")
      .eq("household_id", household.id)
      .eq("type", "event")
      .gte("due_at", todayStart)
      .lte("due_at", todayEnd),
    supabase
      .from("items")
      .select("id")
      .eq("household_id", household.id)
      .eq("type", "shopping")
      .is("completed_at", null),
  ] as const;

  const [presenceRes, openTasksRes, todayEventsRes, shoppingRes] =
    await Promise.all(baseQueries);

  const todayTxRes = isAdmin
    ? await supabase
        .from("items")
        .select("data")
        .eq("household_id", household.id)
        .eq("type", "transaction")
        .gte("due_at", todayStart)
        .lte("due_at", todayEnd)
    : null;

  const initialPresence = (presenceRes.data as Presence[] | null) ?? [];

  const openTasks = (openTasksRes.data as Pick<Item, "id" | "assigned_to" | "due_at">[] | null) ?? [];
  const tasksOpen = openTasks.length;
  const tasksMine = openTasks.filter((t) => t.assigned_to === currentMember.id).length;

  const eventsToday = todayEventsRes.data?.length ?? 0;

  const txToday = (todayTxRes?.data as { data: { amount?: number; kind?: "expense" | "income" } }[] | null) ?? [];
  let spentToday = 0;
  for (const row of txToday) {
    const d = row.data;
    if (!d || d.kind === "income") continue;
    spentToday += Math.abs(d.amount ?? 0);
  }

  const shoppingOpen = shoppingRes.data?.length ?? 0;

  const firstName = currentMember.display_name.split(" ")[0];

  return (
    <div className="flex h-full flex-col gap-7 overflow-y-auto px-4 pt-5 pb-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <p className="text-muted-foreground text-sm font-medium tracking-wide">
          {getGreeting()}
        </p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Hola, {firstName}
        </h2>
        <p className="text-muted-foreground text-sm">
          {members.length} {members.length === 1 ? "miembro" : "miembros"} en {household.name}
        </p>
      </header>

      <PresenceWidget date={today} initial={initialPresence} />

      <section aria-label="Resumen del día">
        <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
          Hoy
        </h3>
        <div
          className={cn(
            "grid grid-cols-2 gap-3",
            isAdmin ? "sm:grid-cols-4" : "sm:grid-cols-3",
          )}
        >
          <StatTile
            href="/tasks"
            icon={CheckSquare}
            label="Tareas"
            value={tasksOpen}
            hint={tasksMine > 0 ? `${tasksMine} para ti` : "abiertas"}
            emphasis={tasksMine > 0}
          />
          <StatTile
            href="/calendar"
            icon={CalendarDays}
            label="Eventos"
            value={eventsToday}
            hint="hoy"
            emphasis={eventsToday > 0}
          />
          <StatTile
            href="/provisions"
            icon={ShoppingCart}
            label="Compras"
            value={shoppingOpen}
            hint={shoppingOpen === 1 ? "pendiente" : "pendientes"}
            emphasis={shoppingOpen > 0}
          />
          {isAdmin && (
            <StatTile
              href="/finances"
              icon={Wallet}
              label="Gasto"
              value={spentToday === 0 ? "—" : formatShortEUR(spentToday)}
              hint="hoy"
            />
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <HomeUpcomingEvents householdId={household.id} members={members} />
        <HomeRomaStatus householdId={household.id} members={members} />
      </div>

      {isAdmin && <FinanceSummaryCard />}
    </div>
  );
}

function StatTile({
  href,
  icon: Icon,
  label,
  value,
  hint,
  emphasis,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint: string;
  emphasis?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "bg-card hover:border-primary/40 active:scale-[0.98] flex flex-col gap-2 rounded-xl border p-4 transition",
        emphasis && "border-primary/30 bg-primary/5",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          emphasis ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tabular-nums">{value}</span>
        <span className="text-muted-foreground text-xs">{hint}</span>
      </div>
      <span className="text-foreground text-sm font-medium">{label}</span>
    </Link>
  );
}

function formatShortEUR(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k€`;
  return `${Math.round(value)}€`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Madrugada";
  if (hour < 13) return "Buenos días";
  if (hour < 21) return "Buenas tardes";
  return "Buenas noches";
}

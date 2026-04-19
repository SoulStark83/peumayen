import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { colorForName } from "@/lib/colors";
import { relativeDayLabel } from "@/lib/date";
import type { EventData, Item, Member } from "@/lib/types";
import { cn } from "@/lib/utils";

export async function HomeUpcomingEvents({
  householdId,
  members,
}: {
  householdId: string;
  members: Member[];
}) {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("items")
    .select(
      "id, title, description, data, due_at, assigned_to, created_by, scope",
    )
    .eq("household_id", householdId)
    .eq("type", "event")
    .gte("due_at", nowIso)
    .order("due_at", { ascending: true })
    .limit(4);

  const events = (data as Pick<Item, "id" | "title" | "description" | "data" | "due_at" | "assigned_to" | "created_by" | "scope">[] | null) ?? [];
  const memberMap = new Map(members.map((m) => [m.id, m]));

  return (
    <section aria-label="Próximos eventos">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Próximos
        </h3>
        <Link href="/calendar" className="text-primary text-xs font-medium">
          Ver calendario
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="bg-card text-muted-foreground flex flex-col items-center gap-2 rounded-xl border p-6 text-center">
          <CalendarDays className="text-muted-foreground/60 h-6 w-6" />
          <p className="text-sm">No hay eventos próximos.</p>
          <Link
            href="/calendar"
            className="text-primary text-xs font-medium hover:underline"
          >
            Crear uno →
          </Link>
        </div>
      ) : (
        <ul className="bg-card flex flex-col rounded-xl border">
          {events.map((e, idx) => {
            const data = (e.data ?? {}) as EventData;
            const ownerId = e.assigned_to ?? e.created_by;
            const owner = ownerId ? memberMap.get(ownerId) : undefined;
            const time = data.all_day
              ? "Todo el día"
              : data.start_at
                ? data.start_at.slice(11, 16)
                : e.due_at?.slice(11, 16);

            return (
              <li
                key={e.id}
                className={cn(
                  "flex items-center gap-3 p-3",
                  idx !== events.length - 1 && "border-b",
                )}
              >
                {owner ? (
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      colorForName(owner.display_name),
                    )}
                    aria-hidden
                  >
                    {owner.display_name[0]?.toUpperCase()}
                  </div>
                ) : (
                  <div className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                    <span className="capitalize">
                      {e.due_at ? relativeDayLabel(e.due_at) : ""}
                    </span>
                    {time && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {time}
                      </span>
                    )}
                    {data.location && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{data.location}</span>
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

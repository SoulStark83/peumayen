"use client";

import { Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SCOPE_STYLES } from "@/lib/colors";
import { formatDayMonth } from "@/lib/date";
import type { EventData, Item } from "@/lib/types";
import { cn } from "@/lib/utils";

function extractEventData(item: Item): EventData {
  const d = item.data as EventData;
  return {
    start_at: d?.start_at,
    end_at: d?.end_at,
    location: d?.location,
    all_day: d?.all_day,
  };
}

function formatTime(iso: string): string {
  const [, time] = iso.split("T");
  if (!time) return "";
  return time.slice(0, 5);
}

export function DayEventsList({
  dayKey,
  events,
  schoolLabel,
}: {
  dayKey: string;
  events: Item[];
  schoolLabel: string | null;
}) {
  const date = new Date(`${dayKey}T12:00:00`);
  const label = formatDayMonth(date);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold capitalize">{label}</h2>
        {schoolLabel && (
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          >
            {schoolLabel}
          </Badge>
        )}
      </div>

      {events.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          Sin eventos este día.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((item) => {
            const data = extractEventData(item);
            const scopeStyle = SCOPE_STYLES[item.scope];
            return (
              <li
                key={item.id}
                className="bg-card flex flex-col gap-1 rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn("h-2 w-2 shrink-0 rounded-full", scopeStyle.dot)}
                        aria-hidden
                      />
                      <p className="truncate text-sm font-medium">{item.title}</p>
                    </div>
                    {item.description && (
                      <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 text-xs", scopeStyle.badge)}
                  >
                    {scopeStyle.label}
                  </Badge>
                </div>

                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  {data.all_day ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Todo el día
                    </span>
                  ) : data.start_at ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(data.start_at)}
                      {data.end_at ? ` – ${formatTime(data.end_at)}` : ""}
                    </span>
                  ) : null}
                  {data.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {data.location}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

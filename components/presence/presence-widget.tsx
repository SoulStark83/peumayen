"use client";

import { HelpCircle, Home, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useCurrentMember,
  useHousehold,
  useMembers,
} from "@/components/providers/household-provider";
import { colorForName, initialsFor } from "@/lib/colors";
import { useRealtimePresence } from "@/lib/hooks/use-realtime-presence";
import { createClient } from "@/lib/supabase/client";
import type { Presence, PresenceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  PresenceStatus,
  { label: string; ring: string; icon: typeof Home }
> = {
  home: {
    label: "En casa",
    ring: "ring-emerald-500",
    icon: Home,
  },
  away: {
    label: "Fuera",
    ring: "ring-neutral-400",
    icon: LogOut,
  },
  uncertain: {
    label: "No lo sé",
    ring: "ring-amber-500",
    icon: HelpCircle,
  },
};

const NEXT_STATUS: Record<PresenceStatus, PresenceStatus> = {
  home: "away",
  away: "uncertain",
  uncertain: "home",
};

export function PresenceWidget({
  date,
  initial,
}: {
  date: string;
  initial: Presence[];
}) {
  const household = useHousehold();
  const currentMember = useCurrentMember();
  const members = useMembers();
  const byMember = useRealtimePresence(household.id, date, initial);
  const [updating, setUpdating] = useState<string | null>(null);

  async function handleToggle(memberId: string) {
    if (updating) return;
    const current = byMember.get(memberId)?.status ?? "uncertain";
    const next = NEXT_STATUS[current];
    setUpdating(memberId);

    const supabase = createClient();
    const { error } = await supabase.from("presence").upsert(
      {
        household_id: household.id,
        member_id: memberId,
        date,
        status: next,
        updated_by: currentMember.id,
      },
      { onConflict: "member_id,date" },
    );

    setUpdating(null);
    if (error) {
      toast.error("No se pudo actualizar", { description: error.message });
    }
  }

  return (
    <div className="bg-card flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Hoy en casa</h3>
        <p className="text-muted-foreground text-xs">Toca para cambiar</p>
      </div>
      <ul className="flex flex-wrap gap-3">
        {members.map((m) => {
          const status: PresenceStatus = byMember.get(m.id)?.status ?? "uncertain";
          const meta = STATUS_META[status];
          const Icon = meta.icon;
          const isCurrent = m.id === currentMember.id;
          return (
            <li key={m.id} className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => handleToggle(m.id)}
                disabled={updating === m.id}
                className={cn(
                  "relative rounded-full ring-2 ring-offset-2 ring-offset-card transition",
                  meta.ring,
                  updating === m.id && "opacity-50",
                )}
                aria-label={`${m.display_name}: ${meta.label}. Cambiar estado.`}
              >
                <Avatar className="h-12 w-12">
                  {m.avatar_url && <AvatarImage src={m.avatar_url} alt={m.display_name} />}
                  <AvatarFallback className={cn("text-sm", colorForName(m.display_name))}>
                    {initialsFor(m.display_name)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card",
                    status === "home" && "bg-emerald-500",
                    status === "away" && "bg-neutral-400",
                    status === "uncertain" && "bg-amber-500",
                  )}
                  aria-hidden
                >
                  <Icon className="h-3 w-3 text-white" />
                </span>
              </button>
              <span
                className={cn(
                  "max-w-[4.5rem] truncate text-xs font-medium",
                  isCurrent ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {m.display_name.split(" ")[0]}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

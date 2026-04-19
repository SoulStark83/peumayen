"use client";

import { Check, Home, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

type Binary = "home" | "away";

function toBinary(status: PresenceStatus | undefined): Binary {
  return status === "home" ? "home" : "away";
}

const META: Record<Binary, { label: string; ring: string; dot: string; icon: typeof Home }> = {
  home: {
    label: "En casa",
    ring: "ring-emerald-500",
    dot: "bg-emerald-500",
    icon: Home,
  },
  away: {
    label: "Fuera",
    ring: "ring-muted-foreground/30",
    dot: "bg-muted-foreground/60",
    icon: LogOut,
  },
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

  return (
    <div className="bg-card flex flex-col gap-3 rounded-xl border p-4">
      <h3 className="text-base font-semibold">Hoy en casa</h3>
      <ul className="flex flex-wrap gap-x-4 gap-y-3">
        {members.map((m) => {
          const status = toBinary(byMember.get(m.id)?.status);
          const meta = META[status];
          const isCurrent = m.id === currentMember.id;
          return (
            <li key={m.id} className="flex flex-col items-center gap-1">
              <MemberAvatar
                member={m}
                status={status}
                ring={meta.ring}
                dot={meta.dot}
                canEdit={isCurrent}
                date={date}
              />
              <span
                className={cn(
                  "max-w-[5rem] truncate text-xs font-medium",
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

function MemberAvatar({
  member,
  status,
  ring,
  dot,
  canEdit,
  date,
}: {
  member: { id: string; display_name: string; avatar_url: string | null };
  status: Binary;
  ring: string;
  dot: string;
  canEdit: boolean;
  date: string;
}) {
  const household = useHousehold();
  const currentMember = useCurrentMember();
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function setStatus(next: Binary) {
    if (updating) return;
    setOpen(false);
    setUpdating(true);
    const supabase = createClient();
    const { error } = await supabase.from("presence").upsert(
      {
        household_id: household.id,
        member_id: member.id,
        date,
        status: next,
        updated_by: currentMember.id,
      },
      { onConflict: "member_id,date" },
    );
    setUpdating(false);
    if (error) toast.error("No se pudo actualizar", { description: error.message });
  }

  const avatar = (
    <div
      className={cn(
        "relative rounded-full ring-2 ring-offset-2 ring-offset-card transition",
        ring,
        updating && "opacity-50",
      )}
    >
      <Avatar className="h-14 w-14">
        {member.avatar_url && (
          <AvatarImage src={member.avatar_url} alt={member.display_name} />
        )}
        <AvatarFallback className={cn("text-base font-semibold", colorForName(member.display_name))}>
          {initialsFor(member.display_name)}
        </AvatarFallback>
      </Avatar>
      <span
        className={cn(
          "border-card absolute -right-1 -bottom-1 h-3.5 w-3.5 rounded-full border-2",
          dot,
        )}
        aria-hidden
      />
    </div>
  );

  if (!canEdit) return avatar;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={updating}
          className="rounded-full"
          aria-label={`Tu estado: ${META[status].label}. Tocar para cambiar.`}
        >
          {avatar}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-48 p-1.5">
        <div className="flex flex-col gap-0.5">
          {(["home", "away"] as const).map((option) => {
            const optMeta = META[option];
            const OptIcon = optMeta.icon;
            const isActive = option === status;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition",
                  isActive ? "bg-muted font-medium" : "hover:bg-muted/60",
                )}
              >
                <OptIcon className="h-4 w-4" />
                <span className="flex-1">{optMeta.label}</span>
                {isActive && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

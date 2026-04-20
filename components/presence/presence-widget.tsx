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
import type { Member, Presence, PresenceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Binary = "home" | "away";

function toBinary(status: PresenceStatus | undefined): Binary {
  return status === "home" ? "home" : "away";
}

/* ─────────────────────────────────────────────
   MODO COMPACT — fila de avatares pequeños
   Usado en la home: lectura en < 1 segundo
───────────────────────────────────────────── */
export function PresenceWidgetCompact({
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

  const atHome = members.filter((m) => toBinary(byMember.get(m.id)?.status) === "home");
  const away   = members.filter((m) => toBinary(byMember.get(m.id)?.status) === "away");

  return (
    <div className="family-card flex items-center justify-between gap-3 px-4 py-3">
      {/* Quién está */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-base leading-none">🏠</span>
        <div className="flex -space-x-2">
          {atHome.length === 0 ? (
            <span className="text-muted-foreground text-sm">Nadie en casa</span>
          ) : (
            atHome.map((m) => (
              <MemberBubble
                key={m.id}
                member={m}
                status="home"
                isCurrent={m.id === currentMember.id}
                date={date}
              />
            ))
          )}
        </div>
        {atHome.length > 0 && (
          <span className="text-muted-foreground truncate text-xs">
            {atHome.map((m) => m.display_name.split(" ")[0]).join(", ")}
          </span>
        )}
      </div>

      {/* Quién está fuera */}
      {away.length > 0 && (
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-sm leading-none">🚗</span>
          <div className="flex -space-x-2">
            {away.map((m) => (
              <MemberBubble
                key={m.id}
                member={m}
                status="away"
                isCurrent={m.id === currentMember.id}
                date={date}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberBubble({
  member,
  status,
  isCurrent,
  date,
}: {
  member: Member;
  status: Binary;
  isCurrent: boolean;
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

  const bubble = (
    <Avatar
      className={cn(
        "h-8 w-8 ring-2 ring-background transition-opacity",
        updating && "opacity-40",
        isCurrent && "ring-primary/40",
      )}
    >
      {member.avatar_url && (
        <AvatarImage src={member.avatar_url} alt={member.display_name} />
      )}
      <AvatarFallback
        className={cn("text-xs font-bold", colorForName(member.display_name))}
      >
        {initialsFor(member.display_name)}
      </AvatarFallback>
    </Avatar>
  );

  if (!isCurrent) return bubble;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={updating}
          aria-label={`Tu estado: ${status === "home" ? "En casa" : "Fuera"}. Toca para cambiar.`}
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {bubble}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 rounded-2xl p-2 shadow-md">
        <p className="text-muted-foreground mb-1.5 px-2 text-xs font-bold uppercase tracking-wider">
          ¿Dónde estás?
        </p>
        <div className="flex flex-col gap-1">
          {(["home", "away"] as const).map((option) => {
            const isActive = option === status;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "hover:bg-muted/60",
                )}
              >
                <span className="text-lg">{option === "home" ? "🏠" : "🚗"}</span>
                <span className="flex-1 text-sm">
                  {option === "home" ? "En casa" : "Estoy fuera"}
                </span>
                {isActive && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ─────────────────────────────────────────────
   MODO COMPLETO — tarjetas grandes
   Mantenido para uso futuro en /nosotros
───────────────────────────────────────────── */
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

  const atHome = members.filter((m) => toBinary(byMember.get(m.id)?.status) === "home");
  const away   = members.filter((m) => toBinary(byMember.get(m.id)?.status) === "away");

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {[...atHome, ...away].map((m) => {
          const status = toBinary(byMember.get(m.id)?.status);
          return (
            <li key={m.id} className="shrink-0">
              <MemberCard
                member={m}
                status={status}
                isCurrent={m.id === currentMember.id}
                date={date}
              />
            </li>
          );
        })}
      </ul>
      {away.length > 0 && atHome.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {away.map((m) => m.display_name.split(" ")[0]).join(" y ")}{" "}
          {away.length === 1 ? "está fuera" : "están fuera"}.
        </p>
      )}
      {atHome.length === 0 && (
        <p className="text-muted-foreground text-sm">Nadie en casa aún 🏡</p>
      )}
    </div>
  );
}

function MemberCard({
  member,
  status,
  isCurrent,
  date,
}: {
  member: Member;
  status: Binary;
  isCurrent: boolean;
  date: string;
}) {
  const household = useHousehold();
  const currentMember = useCurrentMember();
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const isHome = status === "home";
  const firstName = member.display_name.split(" ")[0];

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

  const card = (
    <div
      className={cn(
        "flex w-[5.5rem] flex-col items-center gap-2 rounded-2xl p-3 transition-all",
        isCurrent ? "bg-card shadow-sm border border-border/60" : "bg-card/60",
        !isHome && "opacity-60",
        updating && "opacity-40",
      )}
    >
      <div className="relative">
        <div
          className={cn(
            "rounded-full ring-[3px] ring-offset-2 ring-offset-background",
            isHome ? "ring-success/60" : "ring-border/40",
          )}
        >
          <Avatar className="h-14 w-14">
            {member.avatar_url && (
              <AvatarImage src={member.avatar_url} alt={member.display_name} />
            )}
            <AvatarFallback
              className={cn("text-lg font-bold", colorForName(member.display_name))}
            >
              {initialsFor(member.display_name)}
            </AvatarFallback>
          </Avatar>
        </div>
        <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-card text-sm shadow-sm">
          {isHome ? "🏠" : "🚗"}
        </span>
      </div>
      <p className={cn("truncate text-center text-xs font-bold", isCurrent ? "text-foreground" : "text-foreground/80")}>
        {firstName}
      </p>
      <span className={cn("status-pill", isHome ? "bg-success/12 text-success" : "bg-muted text-muted-foreground")}>
        {isHome ? "En casa" : "Fuera"}
      </span>
    </div>
  );

  if (!isCurrent) return card;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" disabled={updating} className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {card}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-52 rounded-2xl p-2 shadow-md">
        <p className="text-muted-foreground mb-1.5 px-2 text-xs font-bold uppercase tracking-wider">¿Dónde estás?</p>
        <div className="flex flex-col gap-1">
          {(["home", "away"] as const).map((option) => {
            const isActive = option === status;
            return (
              <button key={option} type="button" onClick={() => setStatus(option)}
                className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                  isActive ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/60")}>
                <span className="text-lg">{option === "home" ? "🏠" : "🚗"}</span>
                <span className="flex-1 text-sm">{option === "home" ? "En casa" : "Estoy fuera"}</span>
                {isActive && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

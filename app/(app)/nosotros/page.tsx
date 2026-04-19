import Link from "next/link";
import {
  ChevronRight,
  MessageCircle,
  PawPrint,
  Settings,
  User,
  Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PresenceWidget } from "@/components/presence/presence-widget";
import { requireHouseholdContext } from "@/lib/auth";
import { colorForName, initialsFor } from "@/lib/colors";
import { todayISODateMadrid } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import type { Presence } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Nosotros",
};

export default async function NosotrosPage() {
  const { household, currentMember } = await requireHouseholdContext();
  const supabase = await createClient();
  const today = todayISODateMadrid();
  const isAdmin = currentMember.role === "admin";

  const { data: presenceData } = await supabase
    .from("presence")
    .select("id, household_id, member_id, date, status, notes, updated_by, updated_at")
    .eq("household_id", household.id)
    .eq("date", today);

  const initialPresence = (presenceData as Presence[] | null) ?? [];

  const links = [
    { href: "/roma", icon: PawPrint, label: "Roma", hint: "Paseos, peso, veterinario" },
    ...(isAdmin
      ? [{ href: "/finances", icon: Wallet, label: "Finanzas", hint: "Gastos y suscripciones" }]
      : []),
    { href: "/chat", icon: MessageCircle, label: "Chat familiar", hint: "Conversación del hogar" },
    { href: "/me", icon: User, label: "Mi perfil", hint: "Cuenta, contraseña, miembros" },
  ];

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-4 pt-5 pb-8 sm:px-6">
      <header className="flex items-center gap-3">
        <Link href="/me" className="flex items-center gap-3 rounded-xl">
          <Avatar className="h-12 w-12">
            {currentMember.avatar_url && (
              <AvatarImage
                src={currentMember.avatar_url}
                alt={currentMember.display_name}
              />
            )}
            <AvatarFallback
              className={cn(
                "text-base font-semibold",
                colorForName(currentMember.display_name),
              )}
            >
              {initialsFor(currentMember.display_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-base font-semibold leading-tight">
              {currentMember.display_name}
            </p>
            <p className="text-muted-foreground text-sm">
              {household.name}
            </p>
          </div>
        </Link>
      </header>

      <PresenceWidget date={today} initial={initialPresence} />

      <section>
        <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wider">
          Accesos
        </h3>
        <ul className="bg-card overflow-hidden rounded-xl border">
          {links.map(({ href, icon: Icon, label, hint }, idx) => (
            <li
              key={href}
              className={cn(
                idx !== links.length - 1 && "border-b",
              )}
            >
              <Link
                href={href}
                className="hover:bg-muted/40 flex items-center gap-3 px-4 py-3.5 transition"
              >
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium">{label}</p>
                  <p className="text-muted-foreground text-sm">{hint}</p>
                </div>
                <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Link
        href="/me"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 self-start text-xs"
      >
        <Settings className="h-3.5 w-3.5" />
        Ajustes del hogar
      </Link>
    </div>
  );
}

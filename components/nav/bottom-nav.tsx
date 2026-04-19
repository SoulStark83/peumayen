"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  Home,
  MessageCircle,
  MoreHorizontal,
  PawPrint,
  Plus,
  Settings,
  ShoppingCart,
  User,
  Wallet,
} from "lucide-react";
import { QuickAddSheet } from "@/components/common/quick-add-sheet";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCurrentMember } from "@/components/providers/household-provider";
import { cn } from "@/lib/utils";

type PrimaryItem = {
  href: string;
  label: string;
  icon: typeof Home;
};

const PRIMARY: readonly PrimaryItem[] = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/provisions", label: "Compras", icon: ShoppingCart },
  { href: "/tasks", label: "Tareas", icon: CheckSquare },
];

type MoreSection = {
  href: string;
  label: string;
  icon: typeof ShoppingCart;
  hint: string;
  adminOnly?: boolean;
};

const MORE_SECTIONS: readonly MoreSection[] = [
  { href: "/chat", label: "Chat familiar", icon: MessageCircle, hint: "Conversación del hogar" },
  { href: "/finances", label: "Finanzas", icon: Wallet, hint: "Gastos y suscripciones", adminOnly: true },
  { href: "/roma", label: "Roma", icon: PawPrint, hint: "Paseos, peso, vet" },
  { href: "/me", label: "Mi perfil", icon: User, hint: "Ajustes y cuenta" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const currentMember = useCurrentMember();

  const moreSections = MORE_SECTIONS.filter(
    (s) => !s.adminOnly || currentMember.role === "admin",
  );

  // Highlight "Más" if pathname matches one of its subsections
  const moreActive = moreSections.some((s) =>
    s.href === "/" ? pathname === "/" : pathname.startsWith(s.href),
  );

  return (
    <>
      <nav
        className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-0 z-40 border-t backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-5xl items-stretch justify-between">
          {PRIMARY.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className={cn(
                    "relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="bg-primary absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-b"
                    />
                  )}
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                "relative flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                moreActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
            >
              {moreActive && (
                <span
                  aria-hidden
                  className="bg-primary absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-b"
                />
              )}
              <MoreHorizontal className="h-5 w-5" strokeWidth={moreActive ? 2.25 : 1.75} />
              <span>Más</span>
            </button>
          </li>
        </ul>
      </nav>

      <button
        type="button"
        onClick={() => setQuickAddOpen(true)}
        aria-label="Añadir rápido"
        className={cn(
          "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95",
          "fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition",
        )}
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 4.75rem)",
        }}
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl" showCloseButton={false}>
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
          <SheetHeader className="pb-1">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5" />
              Más
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-2 px-4 pb-6">
            {moreSections.map(({ href, label, icon: Icon, hint }) => (
              <button
                key={href}
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  router.push(href);
                }}
                className="bg-card hover:border-primary/40 active:scale-[0.99] flex items-center gap-3 rounded-xl border p-4 text-left transition"
              >
                <div className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold">{label}</p>
                  <p className="text-muted-foreground text-sm">{hint}</p>
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <QuickAddSheet open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </>
  );
}

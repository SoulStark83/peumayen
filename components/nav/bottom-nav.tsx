"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  Home,
  MessageCircle,
  PawPrint,
  Plus,
  ShoppingCart,
  User,
  Wallet,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const PRIMARY = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/tasks", label: "Tareas", icon: CheckSquare },
  { href: "/me", label: "Yo", icon: User },
] as const;

const QUICK_SECTIONS = [
  { href: "/provisions", label: "Compras y despensa", icon: ShoppingCart, hint: "Lista y despensa" },
  { href: "/finances", label: "Finanzas", icon: Wallet, hint: "Gastos y suscripciones" },
  { href: "/roma", label: "Roma", icon: PawPrint, hint: "Paseos, peso, vet" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <nav
        className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-0 z-40 border-t backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-2xl items-stretch justify-between">
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
        </ul>
      </nav>

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-label="Acciones rápidas"
        className={cn(
          "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95",
          "fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition",
        )}
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 4.5rem)",
        }}
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl" showCloseButton={false}>
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
          <SheetHeader className="pb-0">
            <SheetTitle className="text-lg">Atajos</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-2 px-4 pb-6">
            {QUICK_SECTIONS.map(({ href, label, icon: Icon, hint }) => (
              <button
                key={href}
                type="button"
                onClick={() => {
                  setSheetOpen(false);
                  router.push(href);
                }}
                className="bg-card hover:border-primary/40 active:scale-[0.99] flex items-center gap-3 rounded-xl border p-3 text-left transition"
              >
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-muted-foreground text-xs">{hint}</p>
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

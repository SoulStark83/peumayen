"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Home, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAlerts } from "@/components/providers/alerts-provider";

type TabDef = {
  href: string;
  label: string;
  icon: typeof Home;
  match: (pathname: string) => boolean;
};

const TABS: readonly TabDef[] = [
  {
    href: "/",
    label: "Inicio",
    icon: Home,
    match: (p) => p === "/",
  },
  {
    href: "/agenda",
    label: "Plan",
    icon: CalendarCheck,
    match: (p) =>
      p.startsWith("/agenda") ||
      p.startsWith("/tasks") ||
      p.startsWith("/calendar") ||
      p.startsWith("/provisions"),
  },
  {
    href: "/chat",
    label: "Chat",
    icon: MessageCircle,
    match: (p) => p.startsWith("/chat"),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { count } = useAlerts();

  return (
    <nav
      className="sticky bottom-0 z-40 bg-card/95 supports-[backdrop-filter]:bg-card/85 backdrop-blur border-t border-border/60 shadow-[0_-2px_16px_oklch(0.30_0.06_58/0.08)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-3">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 py-2.5 transition-all duration-150",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "absolute inset-x-4 inset-y-1.5 rounded-2xl transition-all duration-200",
                    active ? "bg-primary/10 scale-100 opacity-100" : "scale-90 opacity-0",
                  )}
                  aria-hidden
                />
                <div className="relative">
                  <Icon
                    className={cn(
                      "h-6 w-6 transition-all duration-200",
                      active && "scale-110",
                    )}
                    strokeWidth={active ? 2.5 : 1.75}
                  />
                  {href === "/" && count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <span
                  className={cn(
                    "relative text-[11px] leading-none transition-all duration-150",
                    active ? "font-bold" : "font-medium",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

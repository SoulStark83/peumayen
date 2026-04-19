"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  Home,
  MessageCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabDef = {
  href: string;
  label: string;
  icon: typeof Home;
  match: (pathname: string) => boolean;
};

const TABS: readonly TabDef[] = [
  {
    href: "/",
    label: "Hoy",
    icon: Home,
    match: (p) => p === "/",
  },
  {
    href: "/agenda",
    label: "Agenda",
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
  {
    href: "/nosotros",
    label: "Nosotros",
    icon: Users,
    match: (p) =>
      p.startsWith("/nosotros") ||
      p.startsWith("/me") ||
      p.startsWith("/roma") ||
      p.startsWith("/finances"),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-0 z-40 border-t backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-5xl items-stretch justify-between">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
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
  );
}

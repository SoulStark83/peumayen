"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAlerts } from "@/components/providers/alerts-provider";
import type { Alert } from "@/lib/alerts";

const ICONS: Record<Alert["type"], string> = {
  subscription: "💳",
  walk: "🐕",
  vet: "🏥",
  overdue: "⚠️",
};

export function AlertsSection({ alerts }: { alerts: Alert[] }) {
  const { setCount } = useAlerts();

  useEffect(() => {
    setCount(alerts.length);
    return () => setCount(0);
  }, [alerts.length, setCount]);

  if (alerts.length === 0) return null;

  return (
    <section aria-label="Avisos" className="px-5 pt-5">
      <p className="section-label mb-3">Avisos</p>
      <ul className="flex flex-col gap-2">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <Link
              href={alert.href}
              className="family-card flex items-center gap-3 p-3.5 hover:opacity-90 transition-opacity"
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg",
                  alert.severity === "warning"
                    ? "bg-amber-500/10"
                    : "bg-sky-500/10"
                )}
              >
                {ICONS[alert.type]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">
                  {alert.title}
                </p>
                <p className="text-muted-foreground text-xs">{alert.hint}</p>
              </div>
              <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

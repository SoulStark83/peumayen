import type { Item } from "./types";

export type AlertSeverity = "warning" | "info";
export type AlertType = "subscription" | "walk" | "vet" | "overdue";

export type Alert = {
  id: string;
  type: AlertType;
  title: string;
  hint: string;
  href: string;
  severity: AlertSeverity;
};

type SubData = { amount: number; billing_day: number };

export function computeAlerts({
  subs,
  lastWalk,
  nextVet,
  overdueTasks,
  isAdmin,
}: {
  subs: Item[];
  lastWalk: Item | null;
  nextVet: Item | null;
  overdueTasks: Item[];
  isAdmin: boolean;
}): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Tareas vencidas
  for (const task of overdueTasks) {
    if (!task.due_at) continue;
    const due = new Date(task.due_at);
    due.setHours(0, 0, 0, 0);
    const diff = Math.round((now.getTime() - due.getTime()) / 86_400_000);
    alerts.push({
      id: `overdue-${task.id}`,
      type: "overdue",
      title: task.title,
      hint: diff === 1 ? "Venció ayer" : `Venció hace ${diff} días`,
      href: "/agenda",
      severity: "warning",
    });
  }

  // Suscripciones próximas (solo admin, ≤5 días)
  if (isAdmin) {
    const todayDay = now.getDate();
    const y = now.getFullYear();
    const m = now.getMonth();
    for (const sub of subs) {
      const data = sub.data as SubData;
      if (!data?.billing_day || !sub.title) continue;
      const billingDate =
        data.billing_day >= todayDay
          ? new Date(y, m, data.billing_day)
          : new Date(y, m + 1, data.billing_day);
      billingDate.setHours(0, 0, 0, 0);
      const diff = Math.round(
        (billingDate.getTime() - now.getTime()) / 86_400_000
      );
      if (diff <= 5) {
        alerts.push({
          id: `sub-${sub.id}`,
          type: "subscription",
          title: sub.title,
          hint:
            diff === 0
              ? "Se cobra hoy"
              : diff === 1
                ? "Se cobra mañana"
                : `Se cobra en ${diff} días`,
          href: "/finances",
          severity: diff <= 1 ? "warning" : "info",
        });
      }
    }
  }

  // Roma sin paseo (≥1 día)
  if (lastWalk?.due_at) {
    const walkDate = new Date(lastWalk.due_at);
    walkDate.setHours(0, 0, 0, 0);
    const diff = Math.round((now.getTime() - walkDate.getTime()) / 86_400_000);
    if (diff >= 1) {
      alerts.push({
        id: "walk",
        type: "walk",
        title: "Roma necesita un paseo",
        hint: diff === 1 ? "Ayer fue el último" : `Hace ${diff} días sin paseo`,
        href: "/roma",
        severity: diff >= 2 ? "warning" : "info",
      });
    }
  }

  // Cita vet próxima (≤7 días)
  if (nextVet?.due_at) {
    const vetDate = new Date(nextVet.due_at);
    vetDate.setHours(0, 0, 0, 0);
    const diff = Math.round(
      (vetDate.getTime() - now.getTime()) / 86_400_000
    );
    if (diff <= 7) {
      alerts.push({
        id: "vet",
        type: "vet",
        title: nextVet.title || "Cita veterinaria",
        hint:
          diff === 0
            ? "Es hoy"
            : diff === 1
              ? "Es mañana"
              : `En ${diff} días`,
        href: "/roma",
        severity: diff <= 1 ? "warning" : "info",
      });
    }
  }

  return alerts;
}

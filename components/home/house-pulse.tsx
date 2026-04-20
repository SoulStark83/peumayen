import Link from "next/link";
import { CalendarClock, CheckSquare2, ShoppingBasket } from "lucide-react";

type Props = {
  shoppingOpen: number;
  tasksPending: number;
  nextEventTime: string | null;
};

export function HousePulse({ shoppingOpen, tasksPending, nextEventTime }: Props) {
  const badges: { icon: React.ElementType; text: string; href: string; style: string }[] = [];

  if (shoppingOpen > 0) {
    badges.push({
      icon: ShoppingBasket,
      text: `${shoppingOpen} en la lista`,
      href: "/agenda",
      style: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    });
  }
  if (tasksPending > 0) {
    badges.push({
      icon: CheckSquare2,
      text: `${tasksPending} ${tasksPending === 1 ? "tarea" : "tareas"} pendientes`,
      href: "/agenda",
      style: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    });
  }
  if (nextEventTime) {
    badges.push({
      icon: CalendarClock,
      text: `Próximo a las ${nextEventTime}`,
      href: "/agenda",
      style: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map(({ icon: Icon, text, href, style }) => (
        <Link
          key={text}
          href={href}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 ${style}`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          {text}
        </Link>
      ))}
    </div>
  );
}

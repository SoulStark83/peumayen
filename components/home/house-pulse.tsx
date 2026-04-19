import Link from "next/link";

type Props = {
  shoppingOpen: number;
  tasksPending: number;
  nextEventTime: string | null;
};

export function HousePulse({ shoppingOpen, tasksPending, nextEventTime }: Props) {
  const parts: { text: string; href: string }[] = [];

  if (shoppingOpen > 0) {
    parts.push({
      text: `${shoppingOpen} en la lista`,
      href: "/agenda",
    });
  }
  if (tasksPending > 0) {
    parts.push({
      text: `${tasksPending} ${tasksPending === 1 ? "tarea" : "tareas"}`,
      href: "/agenda",
    });
  }
  if (nextEventTime) {
    parts.push({
      text: `próximo ${nextEventTime}`,
      href: "/agenda",
    });
  }

  if (parts.length === 0) return null;

  return (
    <p className="text-muted-foreground text-sm">
      {parts.map((part, idx) => (
        <span key={idx}>
          <Link
            href={part.href}
            className="hover:text-foreground transition-colors"
          >
            {part.text}
          </Link>
          {idx !== parts.length - 1 && <span aria-hidden> · </span>}
        </span>
      ))}
    </p>
  );
}

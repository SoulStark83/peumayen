import type { LucideIcon } from "lucide-react";

export function PagePlaceholder({
  icon: Icon,
  title,
  description,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  hint?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 overflow-y-auto p-8 text-center">
      <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
        <Icon className="text-muted-foreground h-7 w-7" strokeWidth={1.75} />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {hint && (
        <p className="text-muted-foreground/80 max-w-xs text-xs italic">
          {hint}
        </p>
      )}
    </div>
  );
}

"use client";

import { useCurrentMember } from "@/components/providers/household-provider";
import { SCOPE_STYLES } from "@/lib/colors";
import type { Scope } from "@/lib/types";
import { cn } from "@/lib/utils";

const SCOPES: Scope[] = ["family", "couple", "personal"];

export function ScopePicker({
  value,
  onChange,
  allOption = false,
  size = "default",
}: {
  value: Scope | "all";
  onChange: (value: Scope | "all") => void;
  allOption?: boolean;
  size?: "sm" | "default";
}) {
  const currentMember = useCurrentMember();
  const visibleScopes: Scope[] =
    currentMember.role === "admin" ? SCOPES : SCOPES.filter((s) => s !== "couple");
  const options: Array<Scope | "all"> = allOption
    ? ["all", ...visibleScopes]
    : visibleScopes;

  return (
    <div
      role="radiogroup"
      className={cn(
        "bg-muted inline-flex rounded-lg p-0.5",
        "text-xs",
      )}
    >
      {options.map((opt) => {
        const active = value === opt;
        const label = opt === "all" ? "Todo" : SCOPE_STYLES[opt].label;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt)}
            className={cn(
              "rounded-md font-medium transition",
              size === "sm" ? "px-2 py-1" : "px-3 py-1.5",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

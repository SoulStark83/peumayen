"use client";

import * as chrono from "chrono-node";
import {
  CalendarDays,
  CheckSquare,
  Loader2,
  ShoppingCart,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useCurrentMember,
  useHousehold,
} from "@/components/providers/household-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { parseAmount } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Kind = "task" | "event" | "shopping" | "transaction";

type ParsedResult = {
  kind: Kind;
  title: string;
  dueAt: Date | null;
  hasExplicitTime: boolean;
  amount: number | null;
};

const KIND_META: Record<
  Kind,
  { label: string; icon: typeof CheckSquare; color: string }
> = {
  task: {
    label: "Tarea",
    icon: CheckSquare,
    color: "bg-primary/10 text-primary",
  },
  event: {
    label: "Evento",
    icon: CalendarDays,
    color: "bg-sky-500/10 text-sky-600",
  },
  shopping: {
    label: "Compra",
    icon: ShoppingCart,
    color: "bg-amber-500/10 text-amber-700",
  },
  transaction: {
    label: "Gasto",
    icon: Wallet,
    color: "bg-rose-500/10 text-rose-600",
  },
};

const EXAMPLES = [
  "Llamar al vet de Roma mañana",
  "Cena con Cris viernes 21h",
  "2kg de patatas",
  "35€ súper",
];

function detectAmount(text: string): { amount: number | null; matchedText: string | null } {
  // Match "35€", "35 €", "12,50€", "€35", "35 eur", "35 euros"
  const patterns = [
    /(?:^|[^0-9.,])(\d{1,3}(?:[.,]\d{1,3})?)\s*(?:€|eur(?:os?)?)\b/i,
    /€\s*(\d{1,3}(?:[.,]\d{1,3})?)/i,
  ];
  for (const p of patterns) {
    const match = p.exec(text);
    if (match) {
      const raw = match[1].replace(",", ".");
      const amount = parseFloat(raw);
      if (!isNaN(amount) && amount > 0) {
        return { amount, matchedText: match[0] };
      }
    }
  }
  return { amount: null, matchedText: null };
}

function detectKind(text: string, hasExplicitTime: boolean): Kind {
  const lower = text.toLowerCase();

  if (detectAmount(text).amount !== null) return "transaction";
  if (
    /^(compra|lista|añad[ie]r?|pide|pilla|coge)\b/i.test(lower) ||
    /\b\d+\s*(kg|g|gr|gramos?|kilos?|l|ml|cl|litros?|ud|uds|unidades?|docena|docenas|botellas?|paquetes?|latas?|bricks?)\b/i.test(
      lower,
    )
  ) {
    return "shopping";
  }
  if (
    hasExplicitTime ||
    /\b(cita|reunion|reunión|evento|fiesta|cumple|vet|m[eé]dic|doctor|cole|escuela|cena|comida|visita|partido|clase|almuerzo|desayuno)\b/i.test(
      lower,
    )
  ) {
    return "event";
  }
  return "task";
}

function parseText(input: string): ParsedResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { kind: "task", title: "", dueAt: null, hasExplicitTime: false, amount: null };
  }

  const now = new Date();
  const chronoResults = chrono.es.parse(trimmed, now, { forwardDate: true });
  const primary = chronoResults[0];
  const dueAt = primary?.start?.date() ?? null;
  const hasExplicitTime = !!primary?.start?.isCertain("hour");

  // Strip the chrono-matched text from the title for cleanliness
  let working = trimmed;
  if (primary) {
    working = (trimmed.slice(0, primary.index) + trimmed.slice(primary.index + primary.text.length))
      .replace(/\s+/g, " ")
      .trim();
  }

  const { amount, matchedText } = detectAmount(working);
  if (matchedText) {
    working = working.replace(matchedText, " ").replace(/\s+/g, " ").trim();
  }

  const kind = detectKind(trimmed, hasExplicitTime);
  return { kind, title: working || trimmed, dueAt, hasExplicitTime, amount };
}

function formatDueLabel(dueAt: Date, hasExplicitTime: boolean): string {
  const now = new Date();
  const sameDay =
    dueAt.getFullYear() === now.getFullYear() &&
    dueAt.getMonth() === now.getMonth() &&
    dueAt.getDate() === now.getDate();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    dueAt.getFullYear() === tomorrow.getFullYear() &&
    dueAt.getMonth() === tomorrow.getMonth() &&
    dueAt.getDate() === tomorrow.getDate();

  const dayLabel = sameDay
    ? "hoy"
    : isTomorrow
      ? "mañana"
      : dueAt.toLocaleDateString("es-ES", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });

  if (!hasExplicitTime) return dayLabel;
  const time = dueAt.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dayLabel} · ${time}`;
}

export function QuickAddSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const household = useHousehold();
  const currentMember = useCurrentMember();
  const isAdmin = currentMember.role === "admin";
  const [text, setText] = useState("");
  const [overrideKind, setOverrideKind] = useState<Kind | null>(null);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText("");
      setOverrideKind(null);
      // Focus textarea after animation
      setTimeout(() => textareaRef.current?.focus(), 120);
    }
  }, [open]);

  const parsed = useMemo(() => parseText(text), [text]);
  const kind = overrideKind ?? parsed.kind;
  const availableKinds: Kind[] = isAdmin
    ? ["task", "event", "shopping", "transaction"]
    : ["task", "event", "shopping"];

  // If user isn't admin and detected transaction, fall back to task
  const effectiveKind: Kind =
    !isAdmin && kind === "transaction" ? "task" : kind;

  async function handleSave() {
    if (!text.trim() || saving) return;
    const title = parsed.title.trim();
    if (!title) {
      toast.error("Escribe algo que guardar");
      return;
    }
    setSaving(true);
    const supabase = createClient();

    const baseScope = effectiveKind === "transaction" ? "couple" : "family";
    const dueAtIso = parsed.dueAt ? parsed.dueAt.toISOString() : null;

    const base = {
      household_id: household.id,
      type: effectiveKind,
      scope: baseScope,
      title,
      created_by: currentMember.id,
    };

    let result;
    if (effectiveKind === "task") {
      result = await supabase.from("items").insert({
        ...base,
        due_at: dueAtIso,
      });
    } else if (effectiveKind === "event") {
      const fallback = parsed.dueAt ?? new Date();
      result = await supabase.from("items").insert({
        ...base,
        due_at: (parsed.dueAt ?? fallback).toISOString(),
        data: {
          start_at: (parsed.dueAt ?? fallback).toISOString(),
          all_day: !parsed.hasExplicitTime,
        },
      });
    } else if (effectiveKind === "shopping") {
      result = await supabase.from("items").insert({
        ...base,
        data: {},
      });
    } else {
      const amount =
        parsed.amount ??
        parseAmount(text.match(/\d[\d.,]*/)?.[0] ?? "") ??
        0;
      if (!amount) {
        setSaving(false);
        toast.error("No detecto el importe", {
          description: "Añade el importe, ej: 35€",
        });
        return;
      }
      result = await supabase.from("items").insert({
        ...base,
        due_at: (parsed.dueAt ?? new Date()).toISOString(),
        data: {
          amount,
          kind: "expense",
          category: "otros",
        },
      });
    }

    const { error } = result;
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar", { description: error.message });
      return;
    }
    toast.success(`${KIND_META[effectiveKind].label} guardada`);
    onOpenChange(false);
  }

  const preview = parsed.title.trim();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-6" showCloseButton={false}>
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="text-primary h-5 w-5" />
            Añadir rápido
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setOverrideKind(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void handleSave();
              }
            }}
            placeholder={EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]}
            className="min-h-[72px] resize-none text-base leading-relaxed"
            rows={2}
          />

          {/* Parse preview */}
          {text.trim() && (
            <div className="bg-muted/40 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md",
                  KIND_META[effectiveKind].color,
                )}
              >
                {(() => {
                  const Icon = KIND_META[effectiveKind].icon;
                  return <Icon className="h-3.5 w-3.5" />;
                })()}
              </div>
              <span className="text-muted-foreground">Detecto:</span>
              <span className="font-medium">{KIND_META[effectiveKind].label}</span>
              {preview && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="truncate font-medium">{preview}</span>
                </>
              )}
              {parsed.dueAt && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-primary font-medium">
                    {formatDueLabel(parsed.dueAt, parsed.hasExplicitTime)}
                  </span>
                </>
              )}
              {parsed.amount !== null && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-rose-600 font-semibold tabular-nums">
                    {parsed.amount.toLocaleString("es-ES", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Kind override */}
          <div className="flex flex-wrap gap-2">
            {availableKinds.map((k) => {
              const Icon = KIND_META[k].icon;
              const active = effectiveKind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setOverrideKind(k)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {KIND_META[k].label}
                </button>
              );
            })}
          </div>

          {!text.trim() && (
            <div className="text-muted-foreground flex flex-col gap-1 text-xs">
              <p className="font-medium text-[11px] uppercase tracking-wider">Ejemplos</p>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setText(ex)}
                  className="text-left hover:text-foreground transition"
                >
                  → {ex}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-muted-foreground text-[11px]">
              ⌘↵ para guardar
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!text.trim() || saving}
                className="gap-1.5"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

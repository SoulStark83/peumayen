"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 2000;

export function MessageComposer({
  onSend,
  disabled,
}: {
  onSend: (body: string) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSend() {
    const body = value.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await onSend(body);
      setValue("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function autoGrow(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  }

  return (
    <div
      className="bg-background/95 supports-[backdrop-filter]:bg-background/80 border-t backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-2xl items-end gap-2 p-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={autoGrow}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje…"
          disabled={disabled || sending}
          rows={1}
          maxLength={MAX_LENGTH}
          className={cn(
            "min-h-0 flex-1 resize-none rounded-2xl border px-3 py-2 text-sm leading-snug",
          )}
        />
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={disabled || sending || value.trim().length === 0}
          className="h-10 w-10 rounded-full"
          aria-label="Enviar"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

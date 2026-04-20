"use client";

import { useRef, useState, useCallback, useEffect, type KeyboardEvent, type ClipboardEvent } from "react";
import { Send, Smile, ImagePlus, X } from "lucide-react";
import { EmojiPicker } from "@/components/chat/emoji-picker";
import { VoiceRecorder } from "@/components/chat/voice-recorder";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { colorForName, memberTextForName } from "@/lib/colors";
import type { ChatMessage, Member } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 2000;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function MessageComposer({
  onSend,
  onSendAudio,
  disabled,
  replyTo,
  replyToSender,
  editingMessage,
  onCancelReply,
  onCancelEdit,
}: {
  onSend: (body: string, imageFile?: File) => Promise<void> | void;
  onSendAudio: (blob: Blob, mimeType: string) => Promise<void>;
  disabled?: boolean;
  replyTo?: ChatMessage | null;
  replyToSender?: Member;
  editingMessage?: ChatMessage | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill textarea when entering edit mode
  useEffect(() => {
    if (editingMessage) {
      setValue(editingMessage.body);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
      });
    } else {
      setValue("");
    }
  }, [editingMessage]);

  const clearImage = useCallback(() => {
    setImageFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [previewUrl]);

  const attachImage = useCallback(
    (file: File) => {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return;
      if (file.size > MAX_IMAGE_BYTES) return;
      clearImage();
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    },
    [clearImage],
  );

  async function handleSend() {
    const body = value.trim();
    if ((!body && !imageFile) || sending) return;
    setSending(true);
    const fileCopy = imageFile ?? undefined;
    try {
      await onSend(body, fileCopy);
      setValue("");
      clearImage();
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
    if (e.key === "Escape") {
      if (editingMessage) onCancelEdit();
      else if (replyTo) onCancelReply();
    }
  }

  function autoGrow(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  }

  function handlePaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items);
    const imgItem = items.find((it) => it.kind === "file" && ACCEPTED_IMAGE_TYPES.includes(it.type));
    if (!imgItem) return;
    const file = imgItem.getAsFile();
    if (file) {
      e.preventDefault();
      attachImage(file);
    }
  }

  function insertEmoji(emoji: string) {
    const ta = textareaRef.current;
    if (!ta) { setValue((v) => v + emoji); return; }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const next = value.slice(0, start) + emoji + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      const pos = start + emoji.length;
      el.focus();
      el.setSelectionRange(pos, pos);
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    });
  }

  const isEmpty = value.trim().length === 0 && !imageFile;
  const canSend = !sending && !disabled && !isEmpty;
  const replyName = replyToSender?.display_name ?? "alguien";

  return (
    <div
      className="bg-background/95 supports-[backdrop-filter]:bg-background/80 border-t backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Edit banner */}
      {editingMessage && (
        <div className="mx-auto flex max-w-2xl items-center justify-between border-b px-3 py-1.5">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-primary font-medium">Editando mensaje</span>
            <span className="text-muted-foreground truncate max-w-[200px]">{editingMessage.body}</span>
          </div>
          <button type="button" onClick={onCancelEdit} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Reply banner */}
      {replyTo && !editingMessage && (
        <div className="mx-auto flex max-w-2xl items-center justify-between border-b px-3 py-1.5">
          <div className={cn("flex items-center gap-2 border-l-2 pl-2 text-sm", `border-[${colorForName(replyName)}]`)}>
            <div>
              <p className={cn("text-xs font-semibold", memberTextForName(replyName))}>
                {replyName.split(" ")[0]}
              </p>
              <p className="text-muted-foreground truncate max-w-[200px] text-xs">
                {replyTo.audio_url ? "🎤 Nota de voz" : replyTo.image_url ? "🖼 Imagen" : replyTo.body}
              </p>
            </div>
          </div>
          <button type="button" onClick={onCancelReply} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Image preview */}
      {previewUrl && (
        <div className="mx-auto max-w-2xl px-3 pt-2">
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Vista previa" className="max-h-32 max-w-[200px] rounded-xl object-cover shadow" />
            <button
              type="button"
              onClick={clearImage}
              className="bg-background/80 hover:bg-background absolute -right-2 -top-2 rounded-full p-0.5 shadow"
              aria-label="Quitar imagen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-2xl items-end gap-2 p-2">
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-10 w-10 shrink-0 rounded-full"
              aria-label="Emojis"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-auto p-2">
            <EmojiPicker onSelect={insertEmoji} />
          </PopoverContent>
        </Popover>

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={autoGrow}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={editingMessage ? "Edita el mensaje…" : "Escribe un mensaje…"}
          disabled={disabled || sending}
          rows={1}
          maxLength={MAX_LENGTH}
          className={cn("min-h-0 flex-1 resize-none rounded-2xl border px-3 py-2 text-sm leading-snug")}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) attachImage(f); }}
        />

        {!editingMessage && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || sending}
            className="text-muted-foreground hover:text-foreground h-10 w-10 shrink-0 rounded-full"
            aria-label="Adjuntar imagen"
          >
            <ImagePlus className="h-5 w-5" />
          </Button>
        )}

        {isEmpty && !editingMessage ? (
          <VoiceRecorder onSend={onSendAudio} disabled={disabled || sending} />
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={handleSend}
            disabled={!canSend}
            className="h-10 w-10 shrink-0 rounded-full"
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

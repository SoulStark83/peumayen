"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { colorForName, initialsFor } from "@/lib/colors";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_DIMENSION = 512;
const OUTPUT_MIME = "image/webp";
const OUTPUT_QUALITY = 0.85;

async function resizeToWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo convertir la imagen"))),
      OUTPUT_MIME,
      OUTPUT_QUALITY,
    );
  });
}

function extractStoragePath(publicUrl: string | null): string | null {
  if (!publicUrl) return null;
  const marker = "/object/public/avatars/";
  const i = publicUrl.indexOf(marker);
  if (i === -1) return null;
  return publicUrl.slice(i + marker.length).split("?")[0];
}

export function AvatarUpload({
  memberId,
  displayName,
  avatarUrl,
}: {
  memberId: string;
  displayName: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Tiene que ser una imagen");
      return;
    }
    setBusy(true);
    try {
      const blob = await resizeToWebp(file);
      const supabase = createClient();
      const path = `${memberId}/${crypto.randomUUID()}.webp`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: OUTPUT_MIME, upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const nextUrl = pub.publicUrl;

      const { error: dbErr } = await supabase
        .from("household_members")
        .update({ avatar_url: nextUrl })
        .eq("id", memberId);
      if (dbErr) throw dbErr;

      const oldPath = extractStoragePath(avatarUrl);
      if (oldPath && oldPath !== path) {
        await supabase.storage.from("avatars").remove([oldPath]);
      }

      toast.success("Foto actualizada");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo subir la foto";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!avatarUrl || busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: dbErr } = await supabase
        .from("household_members")
        .update({ avatar_url: null })
        .eq("id", memberId);
      if (dbErr) throw dbErr;

      const oldPath = extractStoragePath(avatarUrl);
      if (oldPath) {
        await supabase.storage.from("avatars").remove([oldPath]);
      }

      toast.success("Foto quitada");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo quitar";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="group relative rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label="Cambiar foto"
      >
        <Avatar className="h-16 w-16">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback
            className={cn("text-lg font-semibold", colorForName(displayName))}
          >
            {initialsFor(displayName)}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white transition",
            busy ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
          )}
          aria-hidden
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </span>
      </button>

      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          <Camera className="mr-1.5 h-4 w-4" />
          {avatarUrl ? "Cambiar foto" : "Subir foto"}
        </Button>
        {avatarUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={busy}
            className="text-muted-foreground hover:text-foreground justify-start"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Quitar
          </Button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="user"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}

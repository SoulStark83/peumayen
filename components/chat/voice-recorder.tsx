"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  onSend: (blob: Blob, mimeType: string) => Promise<void>;
  disabled?: boolean;
};

type State = "idle" | "recording" | "processing";

function fmtSeconds(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function getBestMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "audio/webm";
}

export function VoiceRecorder({ onSend, disabled }: Props) {
  const [state, setState] = useState<State>("idle");
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    chunksRef.current = [];
    stopTimer();
    setSeconds(0);
    setState("idle");
  }, [stopTimer]);

  useEffect(() => () => { cancelRecording(); }, [cancelRecording]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = getBestMime();
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => { stream.getTracks().forEach((t) => t.stop()); };

      recorder.start(100);
      setState("recording");

      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      // Permission denied or no mic — silently ignore
    }
  }

  async function stopAndSend() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    setState("processing");
    stopTimer();

    const mime = recorder.mimeType;
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    const blob = new Blob(chunksRef.current, { type: mime });
    chunksRef.current = [];
    recorderRef.current = null;

    await onSend(blob, mime);
    setSeconds(0);
    setState("idle");
  }

  if (state === "idle") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={startRecording}
        disabled={disabled}
        className="text-muted-foreground hover:text-foreground h-10 w-10 shrink-0 rounded-full"
        aria-label="Grabar nota de voz"
      >
        <Mic className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={cancelRecording}
        className="text-destructive h-10 w-10 shrink-0 rounded-full"
        aria-label="Cancelar"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1.5 px-1">
        <span className={cn("h-2 w-2 rounded-full bg-red-500", state === "recording" && "animate-pulse")} />
        <span className="w-10 text-center text-sm tabular-nums">{fmtSeconds(seconds)}</span>
      </div>

      <Button
        type="button"
        size="icon"
        onClick={stopAndSend}
        disabled={state === "processing"}
        className="h-10 w-10 shrink-0 rounded-full"
        aria-label="Enviar nota de voz"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}

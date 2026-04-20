"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ src, mine }: { src: string; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrent(el.currentTime);
    const onLoaded = () => setDuration(el.duration || 0);
    const onEnded = () => { setPlaying(false); setCurrent(0); };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("ended", onEnded);
    };
  }, []);

  function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play();
      setPlaying(true);
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    el.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  }

  const progress = duration > 0 ? current / duration : 0;

  return (
    <div className="flex w-[220px] items-center gap-2 px-2 py-2">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          mine ? "bg-primary-foreground/20 text-primary-foreground" : "bg-foreground/10 text-foreground",
        )}
        aria-label={playing ? "Pausar" : "Reproducir"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      <div className="flex flex-1 flex-col gap-1">
        <div
          className={cn(
            "h-1.5 w-full cursor-pointer rounded-full",
            mine ? "bg-primary-foreground/30" : "bg-foreground/20",
          )}
          onClick={seek}
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width]",
              mine ? "bg-primary-foreground" : "bg-foreground/60",
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className={cn("text-[11px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {playing || current > 0 ? fmtDuration(current) : fmtDuration(duration)}
        </span>
      </div>
    </div>
  );
}

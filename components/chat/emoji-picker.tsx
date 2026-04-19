"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const RECENT_KEY = "chat_recent_emojis";
const RECENT_MAX = 24;

type Category = { id: string; icon: string; label: string; emojis: readonly string[] };

const CATEGORIES: readonly Category[] = [
  {
    id: "smileys",
    icon: "😀",
    label: "Caras",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩",
      "😘","😗","☺️","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔",
      "🫡","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😔","😪","🤤","😴","😷",
      "🤒","🤕","🤢","🤮","🥴","😵","🤯","🥳","🥸","😎","🤓","🧐","😕","🙁","☹️","😮",
      "😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓",
      "😩","😫","🥱","😤","😡","😠","🤬","💀","🤡","👻","👽","🤖","🙈","🙉","🙊","💩",
    ],
  },
  {
    id: "hearts",
    icon: "❤️",
    label: "Corazones",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🤎","🖤","🤍","💔","❣️","💕","💞","💓","💗","💖",
      "💘","💝","💟","💌","💋","💍","💎",
    ],
  },
  {
    id: "gestures",
    icon: "👍",
    label: "Manos",
    emojis: [
      "👍","👎","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","👇","☝️",
      "👋","🤚","🖐️","✋","🖖","👏","🙌","🫶","🤝","🙏","💪","🦾","🫵","🤲","👐",
    ],
  },
  {
    id: "people",
    icon: "👪",
    label: "Gente",
    emojis: [
      "👶","🧒","👦","👧","🧑","👨","👩","🧓","👴","👵","👪","💃","🕺","🤰","🤱","🫂",
      "👯","💑","💏","🧑‍🎓","🧑‍💼","🧑‍⚕️","🧑‍🍳","🧑‍🌾","🧑‍🔧","🧑‍🎨","🧑‍🚀",
    ],
  },
  {
    id: "animals",
    icon: "🐶",
    label: "Animales",
    emojis: [
      "🐶","🐕","🐩","🐕‍🦺","🦮","🐱","🐈","🐈‍⬛","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯",
      "🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🦆","🦉","🐺","🐴","🦄","🐝","🦋","🐢",
      "🐍","🐙","🦀","🐠","🐬","🐳","🦈","🦒","🐘","🐑","🐐","🦌","🐇","🦔","🐿️",
    ],
  },
  {
    id: "nature",
    icon: "🌿",
    label: "Naturaleza",
    emojis: [
      "🌸","🌼","🌻","🌺","🌷","🌹","🥀","🌿","🍀","🍁","🍂","🍃","🌵","🌴","🌳","🌲",
      "🌞","🌝","🌚","🌛","🌜","🌙","⭐","🌟","✨","⚡","🔥","🌈","☀️","🌤️","⛅","☁️",
      "🌧️","⛈️","❄️","☃️","⛄","💨","💧","💦","☔","🌊",
    ],
  },
  {
    id: "food",
    icon: "🍕",
    label: "Comida",
    emojis: [
      "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥",
      "🥝","🍅","🍆","🥑","🥦","🥒","🌶️","🌽","🥕","🧄","🧅","🥔","🥐","🥯","🍞","🥖",
      "🧀","🥚","🍳","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🥪","🥙","🌮",
      "🌯","🥗","🥘","🍝","🍜","🍲","🍛","🍣","🍱","🍙","🍚","🍤","🥟","🍦","🍧","🍨",
      "🍰","🎂","🧁","🍩","🍪","🍫","🍬","🍭","🍯","🍼","☕","🫖","🍵","🥤","🧋","🍶",
      "🍺","🍷","🥂","🥃","🍸","🍹","🧉","🍾",
    ],
  },
  {
    id: "activities",
    icon: "⚽",
    label: "Actividades",
    emojis: [
      "⚽","🏀","🏈","⚾","🎾","🏐","🏉","🥏","🎱","🏓","🏸","⛳","🎣","🎯","🎮","🎲",
      "🧩","🧸","🪁","🎨","🎭","🎬","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","🎻","🏋️",
      "🏃","🚴","🏊","🧘","🎪","🎊","🎉","🎈","🎁","🎀","🪅",
    ],
  },
  {
    id: "travel",
    icon: "🏠",
    label: "Lugares",
    emojis: [
      "🏠","🏡","🏢","🏥","🏦","🏨","🏪","🏫","🏰","💒","⛪","🕌","⛩️","⛲","⛺","🌁",
      "🌃","🏙️","🌄","🌅","🌆","🌇","🌉","🎠","🎡","🎢","🚗","🚙","🚐","🚑","🚓","🚕",
      "🚌","🚎","🚲","🛴","🛹","✈️","🛫","🛬","🚀","⛵","🚢","🚂",
    ],
  },
  {
    id: "objects",
    icon: "💡",
    label: "Objetos",
    emojis: [
      "📱","💻","⌨️","🖥️","🖨️","📷","🎥","📺","📻","⏰","📞","🔋","💡","🔦","🛏️","🛋️",
      "🚪","🪑","🚽","🛁","🚿","🧹","🧺","🧼","🪥","💸","💵","💳","🔧","🔨","🛠️","⚙️",
      "🔬","🔭","📡","💊","🩺","📚","📖","📝","✏️","📌","📎","✂️","🔑","🔒","🔓","🔔",
      "📢","🎯","♻️","✅","❌","⭕","🚫","⚠️","🆗","🆕","💯",
    ],
  },
];

function loadRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function saveRecents(list: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {}
}

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [recents, setRecents] = useState<string[]>([]);
  const [active, setActive] = useState<string>("smileys");

  useEffect(() => {
    const r = loadRecents();
    setRecents(r);
    if (r.length > 0) setActive("recent");
  }, []);

  function choose(emoji: string) {
    onSelect(emoji);
    setRecents((prev) => {
      const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, RECENT_MAX);
      saveRecents(next);
      return next;
    });
  }

  const list =
    active === "recent"
      ? recents
      : CATEGORIES.find((c) => c.id === active)?.emojis ?? [];

  const activeLabel =
    active === "recent"
      ? "Recientes"
      : CATEGORIES.find((c) => c.id === active)?.label ?? "";

  return (
    <div className="flex w-72 flex-col gap-1.5 sm:w-80">
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {recents.length > 0 && (
          <TabButton active={active === "recent"} onClick={() => setActive("recent")} label="Recientes">
            🕒
          </TabButton>
        )}
        {CATEGORIES.map((c) => (
          <TabButton
            key={c.id}
            active={active === c.id}
            onClick={() => setActive(c.id)}
            label={c.label}
          >
            {c.icon}
          </TabButton>
        ))}
      </div>

      <div className="text-muted-foreground px-1 text-xs font-medium">{activeLabel}</div>

      <div
        className="grid grid-cols-8 gap-0.5 overflow-y-auto pr-0.5"
        style={{ maxHeight: 240 }}
      >
        {list.length === 0 ? (
          <div className="text-muted-foreground col-span-8 py-6 text-center text-xs">
            Aún no has usado ningún emoji.
          </div>
        ) : (
          list.map((e, i) => (
            <button
              key={`${e}-${i}`}
              type="button"
              onClick={() => choose(e)}
              aria-label={e}
              className="flex h-9 w-9 items-center justify-center rounded-md text-xl transition hover:bg-muted active:scale-90"
            >
              {e}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-base transition",
        active ? "bg-primary/10" : "hover:bg-muted",
      )}
    >
      {children}
      {active && (
        <span
          aria-hidden
          className="bg-primary absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full"
        />
      )}
    </button>
  );
}

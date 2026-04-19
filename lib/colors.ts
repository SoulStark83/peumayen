const PALETTE = [
  "bg-member-1 text-white",
  "bg-member-2 text-white",
  "bg-member-3 text-white",
  "bg-member-4 text-white",
  "bg-member-5 text-white",
  "bg-member-6 text-white",
  "bg-member-7 text-white",
  "bg-member-roma text-white",
] as const;

export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % PALETTE.length;
  return PALETTE[idx];
}

const BG_CLASSES = [
  "bg-member-1",
  "bg-member-2",
  "bg-member-3",
  "bg-member-4",
  "bg-member-5",
  "bg-member-6",
  "bg-member-7",
  "bg-member-roma",
] as const;

const TEXT_CLASSES = [
  "text-member-1",
  "text-member-2",
  "text-member-3",
  "text-member-4",
  "text-member-5",
  "text-member-6",
  "text-member-7",
  "text-member-roma",
] as const;

function slotIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % BG_CLASSES.length;
}

export function memberBgForName(name: string): string {
  return BG_CLASSES[slotIndex(name)];
}

export function memberTextForName(name: string): string {
  return TEXT_CLASSES[slotIndex(name)];
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export const SCOPE_STYLES = {
  family: {
    label: "Familia",
    badge: "bg-primary/10 text-primary border-primary/20",
    dot: "bg-primary",
  },
  couple: {
    label: "Pareja",
    badge: "bg-member-5/15 text-member-5 border-member-5/25",
    dot: "bg-member-5",
  },
  personal: {
    label: "Personal",
    badge: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
} as const;

export type Scope = keyof typeof SCOPE_STYLES;

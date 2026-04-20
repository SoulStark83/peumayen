export type Household = {
  id: string;
  name: string;
};

export type Member = {
  id: string;
  household_id: string;
  user_id: string | null;
  display_name: string;
  avatar_url: string | null;
  role: "admin" | "member";
  member_type: "adult" | "teen" | "child";
};

export type ChatMessage = {
  id: string;
  household_id: string;
  sender_id: string;
  body: string;
  image_url: string | null;
  audio_url: string | null;
  reply_to_id: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

export type MessageReaction = {
  id: string;
  household_id: string;
  message_id: string;
  member_id: string;
  emoji: string;
  created_at: string;
};

export type MessageRead = {
  household_id: string;
  member_id: string;
  last_read_at: string;
};

export type ReadStatus = "pending" | "sent" | "read";

export type Scope = "family" | "couple" | "personal";

export type ItemType =
  | "task"
  | "event"
  | "shopping"
  | "pantry"
  | "document"
  | "transaction"
  | "note"
  | "walk"
  | "weight"
  | "vet_visit"
  | "menu"
  | "recipe"
  | "subscription"
  | "vehicle_entry"
  | "retainer_change"
  | "period_day"
  | "health_settings";

// ── Salud ─────────────────────────────────────────────────────────────────────

export type RetainerType = "A" | "B";

export type RetainerChangeData = {
  retainer_type: RetainerType;
  notes?: string;
};

export type FlowLevel = "spotting" | "light" | "medium" | "heavy";

export type PeriodSymptom =
  | "cramps" | "headache" | "bloating" | "breast_tenderness"
  | "back_pain" | "acne" | "nausea" | "fatigue" | "insomnia"
  | "constipation" | "diarrhea" | "dizziness";

export type PeriodMood =
  | "happy" | "calm" | "energetic" | "mood_swings"
  | "irritable" | "sad" | "anxious" | "tired";

export type DischargeType = "none" | "white_creamy" | "clear_stretchy" | "yellow_green" | "brown";

export type PeriodDayData = {
  /** true = period is active this day */
  is_period: boolean;
  flow?: FlowLevel;
  symptoms?: PeriodSymptom[];
  mood?: PeriodMood[];
  sexual_activity?: boolean;
  discharge?: DischargeType;
  temperature?: number;
  notes?: string;
};

export type HealthSettingsData = {
  /** Expected cycle length in days, defaults to 28 */
  cycle_length: number;
  /** Expected period duration in days, defaults to 5 */
  period_duration: number;
  /** Retainer change interval in days, defaults to 10 */
  retainer_change_days: number;
  /** Which retainer type started first */
  retainer_start_type: RetainerType;
};

export type Item = {
  id: string;
  household_id: string;
  project_id: string | null;
  type: ItemType;
  scope: Scope;
  title: string;
  description: string | null;
  data: Record<string, unknown>;
  due_at: string | null;
  completed_at: string | null;
  recurrence: Record<string, unknown> | null;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

export type EventData = {
  start_at?: string;
  end_at?: string;
  location?: string;
  all_day?: boolean;
};

export type PresenceStatus = "home" | "away" | "uncertain";

export type Presence = {
  id: string;
  household_id: string;
  member_id: string;
  date: string;
  status: PresenceStatus;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
};

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
  reply_to_id: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

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
  | "vehicle_entry";

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

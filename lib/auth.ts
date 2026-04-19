import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Household, Member } from "@/lib/types";

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export type Membership = {
  id: string;
  household_id: string;
  display_name: string;
  role: "admin" | "member";
  member_type: "adult" | "teen" | "child";
};

export const getMembership = cache(async (): Promise<Membership | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("household_members")
    .select("id, household_id, display_name, role, member_type")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return (data as Membership | null) ?? null;
});

export async function requireMembership() {
  const user = await requireUser();
  const membership = await getMembership();
  if (!membership) redirect("/onboarding");
  return { user, membership };
}

export type HouseholdContext = {
  household: Household;
  currentMember: Member;
  members: Member[];
};

export const requireHouseholdContext = cache(async (): Promise<HouseholdContext> => {
  const { membership } = await requireMembership();
  const supabase = await createClient();

  const [householdRes, membersRes] = await Promise.all([
    supabase
      .from("households")
      .select("id, name")
      .eq("id", membership.household_id)
      .single(),
    supabase
      .from("household_members")
      .select("id, household_id, user_id, display_name, avatar_url, role, member_type")
      .eq("household_id", membership.household_id)
      .order("created_at", { ascending: true }),
  ]);

  const household = householdRes.data as Household | null;
  const members = (membersRes.data as Member[] | null) ?? [];
  if (!household) redirect("/onboarding");

  const currentMember = members.find((m) => m.id === membership.id);
  if (!currentMember) redirect("/onboarding");

  return { household, currentMember, members };
});

export { usernameToEmail } from "./auth-client";

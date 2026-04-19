"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Household, Member } from "@/lib/types";

type HouseholdContextValue = {
  household: Household;
  currentMember: Member;
  members: Member[];
};

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({
  household,
  currentMember,
  members,
  children,
}: HouseholdContextValue & { children: ReactNode }) {
  return (
    <HouseholdContext.Provider value={{ household, currentMember, members }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold(): Household {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error("useHousehold must be used within HouseholdProvider");
  return ctx.household;
}

export function useCurrentMember(): Member {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error("useCurrentMember must be used within HouseholdProvider");
  return ctx.currentMember;
}

export function useMembers(): Member[] {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error("useMembers must be used within HouseholdProvider");
  return ctx.members;
}

export function useMemberById(id: string | null | undefined): Member | undefined {
  const members = useMembers();
  if (!id) return undefined;
  return members.find((m) => m.id === id);
}

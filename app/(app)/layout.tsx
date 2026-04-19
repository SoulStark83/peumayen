import { requireHouseholdContext } from "@/lib/auth";
import { HouseholdProvider } from "@/components/providers/household-provider";
import { TopHeader } from "@/components/nav/top-header";
import { BottomNav } from "@/components/nav/bottom-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { household, currentMember, members } = await requireHouseholdContext();

  return (
    <HouseholdProvider household={household} currentMember={currentMember} members={members}>
      <div className="grid h-dvh grid-rows-[auto_1fr_auto]">
        <TopHeader />
        <main className="mx-auto w-full max-w-5xl overflow-hidden">{children}</main>
        <BottomNav />
      </div>
    </HouseholdProvider>
  );
}

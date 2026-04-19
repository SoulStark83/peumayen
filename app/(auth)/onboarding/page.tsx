import { redirect } from "next/navigation";
import { CreateHouseholdForm } from "@/components/onboarding/create-household-form";
import { getMembership, requireUser } from "@/lib/auth";

export const metadata = {
  title: "Crear hogar",
};

export default async function OnboardingPage() {
  await requireUser();
  const membership = await getMembership();
  if (membership) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <CreateHouseholdForm />
    </main>
  );
}

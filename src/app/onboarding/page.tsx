import { redirect } from "next/navigation";
import { OnboardingClient } from "@/components/OnboardingClient";
import { getOnboardingOptions, needsOnboarding } from "@/lib/kitchen/actions";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ force?: string }>;
}) {
  const params = await searchParams;
  if (params.force !== "1" && !(await needsOnboarding())) {
    redirect("/");
  }

  const options = await getOnboardingOptions();

  return (
    <main className="app-shell onboard-shell">
      <p className="brand brand-nav onboard-brand">StuMe</p>
      <OnboardingClient popular={options.popular} allIngredients={options.allIngredients} />
    </main>
  );
}

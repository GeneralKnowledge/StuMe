import { redirect } from "next/navigation";
import { OnboardingClient } from "@/components/OnboardingClient";
import { ThemeToggle } from "@/components/ThemeToggle";
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
      <div className="onboard-top">
        <p className="brand brand-nav onboard-brand">StuMe</p>
        <ThemeToggle />
      </div>
      <OnboardingClient popular={options.popular} allIngredients={options.allIngredients} />
    </main>
  );
}

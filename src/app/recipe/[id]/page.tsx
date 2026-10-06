import Link from "next/link";
import { notFound } from "next/navigation";
import { AddMissingButton } from "@/components/AddMissingButton";
import { BottomNav } from "@/components/BottomNav";
import { Nav } from "@/components/Nav";
import { getRecipeDetail } from "@/lib/kitchen/actions";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getRecipeDetail(id);
  if (!data) notFound();

  const { recipe, missingWithIds } = data;
  const mode = recipe.canMakeNow ? "now" : recipe.almostThere ? "almost" : "look";

  return (
    <main className="app-shell app-shell-nav">
      <Nav compact />

      <article className="recipe-detail">
        <header className="page-header recipe-detail-header">
          <Link href="/" className="back-link">
            Back to cook
          </Link>
          <div className="page-header-row">
            <h1>{recipe.title}</h1>
          </div>
          <div className="meta">
            <span className="chip">
              {mode === "now" ? "Make now" : mode === "almost" ? "Almost" : "Look"}
            </span>
            <span>{recipe.timeMinutes} min</span>
            <span className="meta-dot">·</span>
            <span>{recipe.kitLabel}</span>
            <span className="meta-dot">·</span>
            <span>{recipe.effort}</span>
            {recipe.usesExpiring && <span className="chip danger">Uses soon</span>}
          </div>
        </header>

        <section className="detail-block">
          <h2>You have</h2>
          <div className="need-list need-list-lg">
            {recipe.availableRequired.map((slug) => (
              <span className="need ok" key={`ok-${slug}`}>
                ✓ {slug.replaceAll("-", " ")}
              </span>
            ))}
            {recipe.availableOptional.map((slug) => (
              <span className="need" key={`opt-${slug}`}>
                Optional {slug.replaceAll("-", " ")}
              </span>
            ))}
          </div>
          {missingWithIds.length === 0 ? (
            <p className="detail-all-set">You don&apos;t need anything else.</p>
          ) : (
            <>
              <h2 className="detail-subhead">Missing</h2>
              <div className="need-list need-list-lg">
                {missingWithIds.map((item) => (
                  <AddMissingButton
                    key={item.slug}
                    ingredientId={item.ingredientId}
                    label={item.name}
                  />
                ))}
              </div>
              <p className="kitchen-hint">Tap “I have …” if it&apos;s already in your kitchen.</p>
            </>
          )}
        </section>

        <section className="detail-block">
          <h2>How to make it</h2>
          <ol className="steps steps-lg">
            {recipe.steps.map((step, index) => (
              <li key={`${index}-${step.slice(0, 24)}`}>
                <span className="step-num">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </article>

      <BottomNav />
    </main>
  );
}

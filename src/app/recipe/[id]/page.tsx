import Link from "next/link";
import { notFound } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Nav } from "@/components/Nav";
import { getRecipeDetail } from "@/lib/kitchen/actions";

export const dynamic = "force-dynamic";

function costLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getRecipeDetail(id);
  if (!data) notFound();

  const { recipe } = data;
  const mode = recipe.canMakeNow ? "now" : recipe.almostThere ? "almost" : "soon";

  return (
    <main className="app-shell app-shell-nav">
      <Nav compact />
      <Link href="/" className="back-link">
        Back to cook
      </Link>

      <article className="recipe-detail">
        <header className="recipe-detail-hero">
          <p className="eyebrow">
            {mode === "now" ? "Ready now" : mode === "almost" ? "Almost there" : "Worth a look"}
          </p>
          <h1>{recipe.title}</h1>
          <p className="recipe-detail-lead">{recipe.description}</p>
          <div className="meta">
            <span>{recipe.timeMinutes} min</span>
            <span className="meta-dot">·</span>
            <span style={{ textTransform: "capitalize" }}>{recipe.difficulty}</span>
            <span className="meta-dot">·</span>
            <span style={{ textTransform: "capitalize" }}>{costLabel(recipe.estimatedCost)}</span>
            {recipe.usesExpiring && <span className="chip danger">Uses expiring bits</span>}
            {mode === "almost" && recipe.missingRequired[0] && (
              <span className="chip warn">
                Needs {recipe.missingRequired[0].replaceAll("-", " ")}
              </span>
            )}
          </div>
        </header>

        <section className="detail-block">
          <h2>You need</h2>
          <div className="need-list need-list-lg">
            {recipe.availableRequired.map((slug) => (
              <span className="need ok" key={`ok-${slug}`}>
                Have {slug.replaceAll("-", " ")}
              </span>
            ))}
            {recipe.missingRequired.map((slug) => (
              <span className="need missing" key={`miss-${slug}`}>
                Get {slug.replaceAll("-", " ")}
              </span>
            ))}
            {recipe.availableOptional.map((slug) => (
              <span className="need" key={`opt-${slug}`}>
                Optional {slug.replaceAll("-", " ")}
              </span>
            ))}
          </div>
          {recipe.equipment.length > 0 && (
            <p className="detail-kit">
              Kit: {recipe.equipment.filter(Boolean).slice(0, 5).join(" · ") || "basic"}
            </p>
          )}
        </section>

        <section className="detail-block">
          <h2>Steps</h2>
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

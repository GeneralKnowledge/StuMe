import Link from "next/link";
import type { SerializedCandidate } from "@/lib/kitchen/actions";

function costLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function RecipeCard({
  recipe,
  mode,
}: {
  recipe: SerializedCandidate;
  mode: "now" | "almost" | "soon";
}) {
  const missingLabel = recipe.missingRequired[0]?.replaceAll("-", " ");

  return (
    <Link href={`/recipe/${recipe.id}`} className="recipe-card">
      <div className="recipe-card-main">
        <h3>{recipe.title}</h3>
        <div className="meta">
          <span>{recipe.timeMinutes} min</span>
          <span className="meta-dot">·</span>
          <span style={{ textTransform: "capitalize" }}>{costLabel(recipe.estimatedCost)}</span>
          {mode === "now" && <span className="chip">Ready</span>}
          {mode === "almost" && missingLabel && (
            <span className="chip warn">Needs {missingLabel}</span>
          )}
          {recipe.usesExpiring && <span className="chip danger">Expiring</span>}
        </div>
        <div className="need-list">
          {recipe.availableRequired.slice(0, 4).map((slug) => (
            <span className="need ok" key={`ok-${slug}`}>
              {slug.replaceAll("-", " ")}
            </span>
          ))}
          {recipe.missingRequired.slice(0, 2).map((slug) => (
            <span className="need missing" key={`miss-${slug}`}>
              + {slug.replaceAll("-", " ")}
            </span>
          ))}
          {recipe.availableRequired.length > 4 && (
            <span className="need">+{recipe.availableRequired.length - 4}</span>
          )}
        </div>
      </div>
      <div className="recipe-card-aside">
        <span className="recipe-card-cta">Cook</span>
      </div>
    </Link>
  );
}

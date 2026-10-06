import Link from "next/link";
import type { SerializedCandidate } from "@/lib/kitchen/actions";

export function RecipeCard({
  recipe,
  mode,
}: {
  recipe: SerializedCandidate;
  mode: "now" | "almost" | "soon" | "browse";
}) {
  const missingLabel = recipe.missingRequired[0]?.replaceAll("-", " ");

  return (
    <Link href={`/recipe/${recipe.id}`} className="recipe-card">
      <div className="recipe-card-main">
        <h3>{recipe.title}</h3>
        <div className="meta">
          <span>{recipe.timeMinutes} min</span>
          <span className="meta-dot">·</span>
          <span>{recipe.kitLabel}</span>
          {mode === "now" && <span className="chip">You have everything</span>}
          {mode === "almost" && missingLabel && (
            <span className="chip warn">
              Missing {missingLabel}
              {recipe.missingRequired.length > 1
                ? ` +${recipe.missingRequired.length - 1}`
                : ""}
            </span>
          )}
          {mode === "browse" && <span className="chip soft">Browse</span>}
          {mode !== "browse" && recipe.usesExpiring && (
            <span className="chip warn">Uses soon</span>
          )}
        </div>
        {mode === "almost" && missingLabel ? (
          <p className="recipe-card-miss">+1 ingredient</p>
        ) : null}
      </div>
      <div className="recipe-card-aside">
        <span className="recipe-card-cta">{mode === "browse" ? "View" : "Cook"}</span>
      </div>
    </Link>
  );
}

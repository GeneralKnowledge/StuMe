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
  return (
    <article className="recipe-row">
      <div>
        <h3>{recipe.title}</h3>
        <p style={{ margin: 0, color: "rgba(215,235,228,0.75)" }}>{recipe.description}</p>
        <div className="meta">
          <span>{recipe.timeMinutes} min</span>
          <span>·</span>
          <span>{recipe.equipment.slice(0, 3).join(" · ") || "no fancy kit"}</span>
          <span>·</span>
          <span style={{ textTransform: "capitalize" }}>{costLabel(recipe.estimatedCost)}</span>
          {mode === "now" && <span className="chip">You already have everything</span>}
          {mode === "almost" && recipe.missingRequired[0] && (
            <span className="chip warn">Needs {recipe.missingRequired[0].replaceAll("-", " ")}</span>
          )}
          {recipe.usesExpiring && <span className="chip danger">Uses expiring bits</span>}
        </div>
        <ol className="steps">
          {recipe.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <div className="need-list">
          {recipe.availableRequired.map((slug) => (
            <span className="need ok" key={`ok-${slug}`}>
              ✓ {slug.replaceAll("-", " ")}
            </span>
          ))}
          {recipe.missingRequired.map((slug) => (
            <span className="need missing" key={`miss-${slug}`}>
              + {slug.replaceAll("-", " ")}
            </span>
          ))}
          {recipe.availableOptional.slice(0, 4).map((slug) => (
            <span className="need" key={`opt-${slug}`}>
              ~ {slug.replaceAll("-", " ")}
            </span>
          ))}
        </div>
      </div>
      <div style={{ textAlign: "right", color: "rgba(215,235,228,0.55)", fontSize: "0.85rem" }}>
        score {Math.round(recipe.score)}
      </div>
    </article>
  );
}

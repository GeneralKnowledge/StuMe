import {
  DEFAULT_SCORE_WEIGHTS,
  type CostCategory,
  type GraphRecipe,
  type KitchenState,
  type RecipeCandidate,
  type ScoreWeights,
} from "@/lib/types";
import {
  deriveAvailableComponents,
  recipeIngredientCoverage,
  type FoodGraph,
} from "@/lib/graph/engine";

const COST_SCORE: Record<CostCategory, number> = {
  very_cheap: 1,
  cheap: 0.8,
  moderate: 0.45,
  expensive: 0.15,
};

const DIFFICULTY_SCORE: Record<string, number> = {
  easy: 1,
  medium: 0.55,
  hard: 0.2,
};

function washingUpBurden(equipment: string[]): number {
  const burdenItems = new Set(["pan", "tray", "bowl", "grill", "oven", "hob"]);
  const count = equipment.filter((item) => burdenItems.has(item)).length;
  if (count <= 1) return 1;
  if (count === 2) return 0.7;
  if (count === 3) return 0.4;
  return 0.2;
}

function nutritionProxy(recipe: GraphRecipe): number {
  const tags = new Set(recipe.tags);
  let score = 0.4;
  if (
    tags.has("vegetarian") ||
    recipe.ingredients.some((i) =>
      ["frozen-peas", "frozen-mixed-vegetables", "spinach", "mushrooms", "onions"].includes(
        i.ingredientSlug,
      ),
    )
  ) {
    score += 0.2;
  }
  if (
    recipe.ingredients.some((i) =>
      ["eggs", "tuna", "chickpeas", "baked-beans", "cooked-chicken", "cheese"].includes(
        i.ingredientSlug,
      ),
    )
  ) {
    score += 0.2;
  }
  if (
    recipe.ingredients.some((i) =>
      ["rice", "pasta", "bread", "noodles", "instant-noodles", "potatoes", "frozen-chips"].includes(
        i.ingredientSlug,
      ),
    )
  ) {
    score += 0.15;
  }
  return Math.min(score, 1);
}

export function scoreRecipe(
  graph: FoodGraph,
  recipe: GraphRecipe,
  kitchen: KitchenState,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS,
  options?: {
    seenSignatures?: Set<string>;
    /** Kitchen-constant derived components — hoist once in rankRecipes. */
    derivedSlugs?: Set<string>;
  },
): RecipeCandidate {
  const coverage = recipeIngredientCoverage(recipe, kitchen);
  const derivedSlugs =
    options?.derivedSlugs ??
    new Set(deriveAvailableComponents(graph, kitchen).map((item) => item.componentSlug));
  const usedDerived = recipe.componentSlugs.filter((slug) => derivedSlugs.has(slug));

  const timeScore =
    recipe.timeMinutes <= 10 ? 1 : recipe.timeMinutes <= 15 ? 0.8 : recipe.timeMinutes <= 25 ? 0.5 : 0.25;
  const equipmentScore =
    kitchen.equipment.size === 0
      ? 1
      : recipe.equipment.every((item) => item === "" || kitchen.equipment.has(item))
        ? 1
        : 0.35;

  const usesExpiring = recipe.ingredients.some((item) =>
    kitchen.expiringSlugs.has(item.ingredientSlug),
  );
  const foodWasteScore = usesExpiring ? 1 : 0.35;

  const varietyScore =
    options?.seenSignatures && options.seenSignatures.has(recipe.signature) ? 0.2 : 0.85;
  const exposureScore = 1 - Math.min(recipe.useCount / 20, 0.8);

  const breakdown = {
    availabilityPct: coverage.availabilityPct * weights.availabilityPct,
    availableCount: Math.min(coverage.availableRequired.length / 6, 1) * weights.availableCount,
    cost: COST_SCORE[recipe.estimatedCost] * weights.cost,
    time: timeScore * weights.time,
    difficulty: (DIFFICULTY_SCORE[recipe.difficulty] ?? 0.5) * weights.difficulty,
    equipment: equipmentScore * weights.equipment,
    washingUp: washingUpBurden(recipe.equipment) * weights.washingUp,
    foodWaste: foodWasteScore * weights.foodWaste,
    variety: varietyScore * weights.variety,
    exposure: exposureScore * weights.exposure,
    nutrition: nutritionProxy(recipe) * weights.nutrition,
  };

  const score = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const canMakeNow = coverage.missingRequired.length === 0 && coverage.availabilityPct >= 0.999;
  const almostThere =
    !canMakeNow && coverage.missingRequired.length === 1 && coverage.availabilityPct >= 0.5;

  if (options?.seenSignatures) {
    options.seenSignatures.add(recipe.signature);
  }

  return {
    recipe,
    availableRequired: coverage.availableRequired,
    missingRequired: coverage.missingRequired,
    availableOptional: coverage.availableOptional,
    missingOptional: coverage.missingOptional,
    availabilityPct: coverage.availabilityPct,
    score,
    scoreBreakdown: breakdown,
    canMakeNow,
    almostThere,
    usesExpiring,
    derivedComponents: usedDerived,
  };
}

export function rankRecipes(
  graph: FoodGraph,
  kitchen: KitchenState,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS,
): RecipeCandidate[] {
  // Kitchen-constant: derive once for the whole ranking pass.
  const derivedSlugs = new Set(
    deriveAvailableComponents(graph, kitchen).map((item) => item.componentSlug),
  );
  const seen = new Set<string>();
  const ranked = graph.recipes
    .map((recipe) =>
      scoreRecipe(graph, recipe, kitchen, weights, {
        seenSignatures: seen,
        derivedSlugs,
      }),
    )
    .sort((a, b) => {
      if (a.canMakeNow !== b.canMakeNow) return a.canMakeNow ? -1 : 1;
      if (a.usesExpiring !== b.usesExpiring) return a.usesExpiring ? -1 : 1;
      return b.score - a.score;
    });

  // Mild diversity: after sorting, demote near-identical signatures if many can-make-now exist.
  const emitted = new Set<string>();
  const diversified: RecipeCandidate[] = [];
  for (const candidate of ranked) {
    const key = candidate.recipe.signature.split("|").slice(0, 3).join("|");
    if (
      emitted.has(key) &&
      candidate.canMakeNow &&
      diversified.filter((c) => c.canMakeNow).length >= 4
    ) {
      diversified.push({ ...candidate, score: candidate.score * 0.92 });
    } else {
      emitted.add(key);
      diversified.push(candidate);
    }
  }
  return diversified.sort(
    (a, b) => b.score - a.score || Number(b.canMakeNow) - Number(a.canMakeNow),
  );
}

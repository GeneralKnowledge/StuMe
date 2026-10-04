import type { FoodGraph } from "@/lib/graph/engine";
import { createKitchenState, recipeIngredientCoverage } from "@/lib/graph/engine";
import type { CostCategory, GraphRecipe, KitchenState, ShoppingUnlock } from "@/lib/types";

const COST_BONUS: Record<CostCategory, number> = {
  very_cheap: 12,
  cheap: 9,
  moderate: 4,
  expensive: 0,
};

const LOW_EFFORT_COST: Record<CostCategory, number> = {
  very_cheap: 1,
  cheap: 0.85,
  moderate: 0.4,
  expensive: 0.1,
};

function lowEffortScore(input: {
  costCategory: CostCategory;
  shelfLifeDays: number;
  versatility: number;
  wasteRisk: number;
}): number {
  const shelf = Math.min(input.shelfLifeDays / 90, 1);
  return Number(
    (
      LOW_EFFORT_COST[input.costCategory] * 40 +
      shelf * 25 +
      input.versatility * 25 +
      (1 - input.wasteRisk) * 10
    ).toFixed(2),
  );
}

function superFoodScore(input: {
  mealUnlockValue: number;
  mealsFanciedUp: number;
  mealsImproved: number;
  lowEffort: number;
}): number {
  return Number(
    (
      input.mealUnlockValue * 12 +
      input.mealsFanciedUp * 8 +
      input.mealsImproved * 3 +
      input.lowEffort * 0.35
    ).toFixed(2),
  );
}

function canMakeFromCoverage(coverage: {
  missingRequired: string[];
  availabilityPct: number;
}): boolean {
  return coverage.missingRequired.length === 0 && coverage.availabilityPct >= 0.999;
}

/** Build ingredient → recipe index once so purchase scoring stays linear in corpus size. */
function indexRecipesByIngredient(recipes: GraphRecipe[]): Map<string, number[]> {
  const index = new Map<string, number[]>();
  for (let recipeIndex = 0; recipeIndex < recipes.length; recipeIndex += 1) {
    const seen = new Set<string>();
    for (const ingredient of recipes[recipeIndex]!.ingredients) {
      if (seen.has(ingredient.ingredientSlug)) continue;
      seen.add(ingredient.ingredientSlug);
      const list = index.get(ingredient.ingredientSlug);
      if (list) list.push(recipeIndex);
      else index.set(ingredient.ingredientSlug, [recipeIndex]);
    }
  }
  return index;
}

export function recommendPurchases(
  graph: FoodGraph,
  kitchen: KitchenState,
  limit = 8,
): ShoppingUnlock[] {
  return scorePurchaseCandidates(graph, kitchen)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Super foods: cheap/low-effort ingredients that either unlock the most meals
 * from what you already own, or fancy up meals you can already make.
 *
 * Future idea: pair unlock recommendations with a “shops near me” helper
 * (campus supermarket / corner shop proximity) once location UX exists.
 */
export function recommendSuperFoods(
  graph: FoodGraph,
  kitchen: KitchenState,
  limit = 6,
): ShoppingUnlock[] {
  return scorePurchaseCandidates(graph, kitchen)
    .filter((item) => item.isSuperFood)
    .sort((a, b) => b.superFoodScore - a.superFoodScore)
    .slice(0, limit);
}

/**
 * Score every unowned ingredient against recipes that actually list it.
 * Avoids O(ingredients × recipes) full re-ranks — critical at corpus scale.
 */
export function scorePurchaseCandidates(
  graph: FoodGraph,
  kitchen: KitchenState,
): ShoppingUnlock[] {
  const owned = kitchen.ingredientSlugs;

  const baseline = graph.recipes.map((recipe) => {
    const coverage = recipeIngredientCoverage(recipe, kitchen);
    return {
      recipe,
      coverage,
      canMakeNow: canMakeFromCoverage(coverage),
    };
  });

  const byIngredient = indexRecipesByIngredient(graph.recipes);

  const candidates = [...graph.ingredients.values()].filter(
    (ingredient) =>
      !owned.has(ingredient.slug) && ingredient.slug !== "salt" && ingredient.slug !== "pepper",
  );

  const unlocks: ShoppingUnlock[] = [];

  for (const ingredient of candidates) {
    const recipeIndexes = byIngredient.get(ingredient.slug) ?? [];
    if (recipeIndexes.length === 0 && !ingredient.isEssential) {
      continue;
    }

    const expanded = createKitchenState([...owned, ingredient.slug], {
      equipment: [...kitchen.equipment],
      expiringSlugs: [...kitchen.expiringSlugs],
      stapleSlugs: [...kitchen.stapleSlugs],
    });

    const unlockedRecipeTitles: string[] = [];
    const improvedRecipeTitles: string[] = [];
    const fanciedUpRecipeTitles: string[] = [];
    let mealUnlockValue = 0;
    let mealsImproved = 0;
    let mealsFanciedUp = 0;

    for (const recipeIndex of recipeIndexes) {
      const before = baseline[recipeIndex]!;
      if (before.canMakeNow) {
        if (before.coverage.missingOptional.includes(ingredient.slug)) {
          mealsFanciedUp += 1;
          if (fanciedUpRecipeTitles.length < 4) {
            fanciedUpRecipeTitles.push(before.recipe.title);
          }
        }
        continue;
      }

      const after = recipeIngredientCoverage(before.recipe, expanded);
      if (canMakeFromCoverage(after)) {
        mealUnlockValue += 1;
        if (unlockedRecipeTitles.length < 6) {
          unlockedRecipeTitles.push(before.recipe.title);
        }
      } else if (after.missingRequired.length < before.coverage.missingRequired.length) {
        mealsImproved += 1;
        if (improvedRecipeTitles.length < 4) {
          improvedRecipeTitles.push(before.recipe.title);
        }
      }
    }

    const lowEffort = lowEffortScore(ingredient);

    const score =
      mealUnlockValue * 10 +
      mealsImproved * 3 +
      mealsFanciedUp * 4 +
      Math.min(ingredient.shelfLifeDays / 60, 1) * 6 +
      ingredient.versatility * 8 +
      (COST_BONUS[ingredient.costCategory] ?? 0) -
      ingredient.wasteRisk * 7;

    const roles: Array<"unlock" | "fancy_up"> = [];
    if (mealUnlockValue > 0) roles.push("unlock");
    if (mealsFanciedUp > 0) roles.push("fancy_up");

    const composite = superFoodScore({
      mealUnlockValue,
      mealsFanciedUp,
      mealsImproved,
      lowEffort,
    });

    // Super food bar: meaningful unlock or fancy-up, and genuinely low effort.
    const isSuperFood =
      lowEffort >= 55 &&
      (mealUnlockValue >= 2 || mealsFanciedUp >= 2 || (mealUnlockValue >= 1 && mealsFanciedUp >= 1)) &&
      (ingredient.costCategory === "very_cheap" || ingredient.costCategory === "cheap");

    if (
      mealUnlockValue === 0 &&
      mealsImproved === 0 &&
      mealsFanciedUp === 0 &&
      !ingredient.isEssential
    ) {
      continue;
    }

    unlocks.push({
      ingredientSlug: ingredient.slug,
      ingredientName: ingredient.name,
      costCategory: ingredient.costCategory,
      mealUnlockValue,
      mealsImproved,
      mealsFanciedUp,
      shelfLifeDays: ingredient.shelfLifeDays,
      versatility: ingredient.versatility,
      wasteRisk: ingredient.wasteRisk,
      score,
      lowEffortScore: lowEffort,
      superFoodScore: composite,
      roles,
      isSuperFood,
      unlockedRecipeTitles,
      improvedRecipeTitles,
      fanciedUpRecipeTitles,
    });
  }

  return unlocks;
}

const SUBSTITUTE_GROUPS: string[][] = [
  ["rice", "microwave-rice"],
  ["butter", "oil"],
  ["cheese", "grated-cheese"],
  ["noodles", "instant-noodles"],
  ["potatoes", "microwave-potatoes"],
];

function overlapsSubstitute(pickedSlugs: Set<string>, candidate: string): boolean {
  for (const group of SUBSTITUTE_GROUPS) {
    if (!group.includes(candidate)) continue;
    if (group.some((slug) => pickedSlugs.has(slug))) return true;
  }
  return false;
}

export function topEssentialsBundle(
  graph: FoodGraph,
  kitchen: KitchenState,
  count = 3,
): ShoppingUnlock[] {
  const scoredOnce = scorePurchaseCandidates(graph, kitchen).sort((a, b) => b.score - a.score);
  const ranked = scoredOnce.slice(0, 20);
  const picked: ShoppingUnlock[] = [];
  const simulated = new Set(kitchen.ingredientSlugs);

  for (const item of ranked) {
    if (picked.length >= count) break;
    if (simulated.has(item.ingredientSlug)) continue;
    if (overlapsSubstitute(simulated, item.ingredientSlug)) continue;
    picked.push(item);
    simulated.add(item.ingredientSlug);
  }

  // Refresh unlock counts after each prior pick without re-scoring the whole catalog each time
  // beyond one pass per picked item (cheap after the indexed scorer).
  return picked.map((item, index) => {
    const ownedAfterPrevious = createKitchenState(
      [...kitchen.ingredientSlugs, ...picked.slice(0, index).map((p) => p.ingredientSlug)],
      {
        equipment: [...kitchen.equipment],
        expiringSlugs: [...kitchen.expiringSlugs],
      },
    );
    const fresh = scorePurchaseCandidates(graph, ownedAfterPrevious).find(
      (candidate) => candidate.ingredientSlug === item.ingredientSlug,
    );
    return fresh ?? item;
  });
}

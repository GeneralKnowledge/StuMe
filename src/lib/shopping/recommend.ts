import type { FoodGraph } from "@/lib/graph/engine";
import { createKitchenState, recipeIngredientCoverage } from "@/lib/graph/engine";
import { rankRecipes } from "@/lib/scoring/score";
import type { CostCategory, KitchenState, ShoppingUnlock } from "@/lib/types";

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

function scorePurchaseCandidates(
  graph: FoodGraph,
  kitchen: KitchenState,
): ShoppingUnlock[] {
  const owned = kitchen.ingredientSlugs;
  const rankedNow = rankRecipes(graph, kitchen);
  const currentMakeNow = rankedNow.filter((candidate) => candidate.canMakeNow);
  const currentMakeNowIds = new Set(currentMakeNow.map((candidate) => candidate.recipe.id));

  const candidates = [...graph.ingredients.values()].filter(
    (ingredient) => !owned.has(ingredient.slug) && ingredient.slug !== "salt" && ingredient.slug !== "pepper",
  );

  const unlocks: ShoppingUnlock[] = [];

  for (const ingredient of candidates) {
    const expanded = createKitchenState([...owned, ingredient.slug], {
      equipment: [...kitchen.equipment],
      expiringSlugs: [...kitchen.expiringSlugs],
      stapleSlugs: [...kitchen.stapleSlugs],
    });

    const ranked = rankRecipes(graph, expanded);
    const unlocked = ranked.filter(
      (candidate) => candidate.canMakeNow && !currentMakeNowIds.has(candidate.recipe.id),
    );
    const improved = ranked.filter((candidate) => {
      if (candidate.canMakeNow) return false;
      const before = recipeIngredientCoverage(candidate.recipe, kitchen);
      const after = recipeIngredientCoverage(candidate.recipe, expanded);
      return after.missingRequired.length < before.missingRequired.length;
    });

    // Fancy-up: already makeable recipes where this ingredient is a missing optional.
    const fancied = currentMakeNow.filter((candidate) =>
      candidate.missingOptional.includes(ingredient.slug),
    );

    const lowEffort = lowEffortScore(ingredient);
    const mealUnlockValue = unlocked.length;
    const mealsImproved = improved.length;
    const mealsFanciedUp = fancied.length;

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

    if (mealUnlockValue === 0 && mealsImproved === 0 && mealsFanciedUp === 0 && !ingredient.isEssential) {
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
      unlockedRecipeTitles: unlocked.slice(0, 6).map((item) => item.recipe.title),
      improvedRecipeTitles: improved.slice(0, 4).map((item) => item.recipe.title),
      fanciedUpRecipeTitles: fancied.slice(0, 4).map((item) => item.recipe.title),
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
  const ranked = recommendPurchases(graph, kitchen, 20);
  const picked: ShoppingUnlock[] = [];
  const simulated = new Set(kitchen.ingredientSlugs);

  for (const item of ranked) {
    if (picked.length >= count) break;
    if (simulated.has(item.ingredientSlug)) continue;
    if (overlapsSubstitute(simulated, item.ingredientSlug)) continue;
    picked.push(item);
    simulated.add(item.ingredientSlug);
  }

  return picked.map((item, index) => {
    const ownedAfterPrevious = createKitchenState(
      [...kitchen.ingredientSlugs, ...picked.slice(0, index).map((p) => p.ingredientSlug)],
      {
        equipment: [...kitchen.equipment],
        expiringSlugs: [...kitchen.expiringSlugs],
      },
    );
    const [fresh] = recommendPurchases(graph, ownedAfterPrevious, 30).filter(
      (candidate) => candidate.ingredientSlug === item.ingredientSlug,
    );
    return fresh ?? item;
  });
}

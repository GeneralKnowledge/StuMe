import type { FoodGraph } from "@/lib/graph/engine";
import { createKitchenState, recipeIngredientCoverage } from "@/lib/graph/engine";
import { rankRecipes } from "@/lib/scoring/score";
import type { KitchenState, ShoppingUnlock } from "@/lib/types";

const COST_BONUS: Record<string, number> = {
  very_cheap: 12,
  cheap: 9,
  moderate: 4,
  expensive: 0,
};

export function recommendPurchases(
  graph: FoodGraph,
  kitchen: KitchenState,
  limit = 8,
): ShoppingUnlock[] {
  const owned = kitchen.ingredientSlugs;
  const currentMakeNow = new Set(
    rankRecipes(graph, kitchen)
      .filter((candidate) => candidate.canMakeNow)
      .map((candidate) => candidate.recipe.id),
  );

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
      (candidate) => candidate.canMakeNow && !currentMakeNow.has(candidate.recipe.id),
    );
    const improved = ranked.filter((candidate) => {
      if (candidate.canMakeNow) return false;
      const before = recipeIngredientCoverage(candidate.recipe, kitchen);
      const after = recipeIngredientCoverage(candidate.recipe, expanded);
      return after.missingRequired.length < before.missingRequired.length;
    });

    const mealUnlockValue = unlocked.length * 10;
    const mealsImproved = improved.length * 3;
    const shelfLifeScore = Math.min(ingredient.shelfLifeDays / 60, 1) * 6;
    const versatilityScore = ingredient.versatility * 8;
    const lowCostScore = COST_BONUS[ingredient.costCategory] ?? 0;
    const wastePenalty = ingredient.wasteRisk * 7;

    const score =
      mealUnlockValue + mealsImproved + shelfLifeScore + versatilityScore + lowCostScore - wastePenalty;

    if (unlocked.length === 0 && improved.length === 0 && !ingredient.isEssential) {
      continue;
    }

    unlocks.push({
      ingredientSlug: ingredient.slug,
      ingredientName: ingredient.name,
      costCategory: ingredient.costCategory,
      mealUnlockValue: unlocked.length,
      mealsImproved: improved.length,
      shelfLifeDays: ingredient.shelfLifeDays,
      versatility: ingredient.versatility,
      wasteRisk: ingredient.wasteRisk,
      score,
      unlockedRecipeTitles: unlocked.slice(0, 6).map((item) => item.recipe.title),
      improvedRecipeTitles: improved.slice(0, 4).map((item) => item.recipe.title),
    });
  }

  return unlocks.sort((a, b) => b.score - a.score).slice(0, limit);
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

  // Re-score the bundle narrative against cumulative ownership for titles.
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

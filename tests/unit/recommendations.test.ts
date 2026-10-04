import { describe, expect, it } from "vitest";
import { buildGraphFromSeed } from "@/lib/graph/buildFromSeed";
import { createKitchenState } from "@/lib/graph/engine";
import { rankRecipes } from "@/lib/scoring/score";
import { recommendPurchases } from "@/lib/shopping/recommend";

const graph = buildGraphFromSeed();

describe("recommendations", () => {
  it("ranks recipes using available ingredients highly", () => {
    const kitchen = createKitchenState(["bread", "eggs", "butter", "cheese"]);
    const ranked = rankRecipes(graph, kitchen);
    const makeNow = ranked.filter((item) => item.canMakeNow);
    expect(makeNow.length).toBeGreaterThan(0);
    expect(makeNow[0]!.availabilityPct).toBeGreaterThan(0.99);
    expect(makeNow.some((item) => item.recipe.title.includes("Toast") || item.recipe.title.includes("Egg"))).toBe(
      true,
    );
  });

  it("ranks expensive or missing-heavy recipes lower", () => {
    const kitchen = createKitchenState(["bread", "butter"]);
    const ranked = rankRecipes(graph, kitchen);
    const makeNowIds = new Set(ranked.filter((item) => item.canMakeNow).map((item) => item.recipe.id));
    const missingHeavy = ranked.find((item) => item.missingRequired.length >= 3);
    expect(missingHeavy).toBeTruthy();
    expect(makeNowIds.has(missingHeavy!.recipe.id)).toBe(false);
    expect(missingHeavy!.score).toBeLessThan(ranked[0]!.score);
  });

  it("favours versatile cheap shopping unlocks", () => {
    const kitchen = createKitchenState(["rice", "eggs", "butter"]);
    const buys = recommendPurchases(graph, kitchen, 10);
    expect(buys.length).toBeGreaterThan(0);
    expect(["onions", "cheese", "soy-sauce", "oil", "frozen-peas"]).toEqual(
      expect.arrayContaining([buys[0]!.ingredientSlug]),
    );
    expect(["very_cheap", "cheap"]).toContain(buys[0]!.costCategory);
  });

  it("prioritises expiring ingredients in ranking", () => {
    const kitchen = createKitchenState(["mushrooms", "bread", "butter", "garlic", "cheese"], {
      expiringSlugs: ["mushrooms"],
    });
    const ranked = rankRecipes(graph, kitchen);
    const topExpiring = ranked.find((item) => item.canMakeNow && item.usesExpiring);
    expect(topExpiring).toBeTruthy();
    const firstNonExpiring = ranked.find((item) => item.canMakeNow && !item.usesExpiring);
    if (firstNonExpiring && topExpiring) {
      expect(ranked.indexOf(topExpiring)).toBeLessThanOrEqual(ranked.indexOf(firstNonExpiring));
    }
  });
});

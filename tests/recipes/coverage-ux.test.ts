import { describe, expect, it } from "vitest";
import { buildGraphFromSeed } from "@/lib/graph/buildFromSeed";
import { createKitchenState } from "@/lib/graph/engine";
import { getRecommendations } from "@/lib/cache/recommend";
import { DisabledRecipeGenerator } from "@/lib/llm/generator";
import { normalizeIngredientText } from "../../scripts/recipes/lib/normalize";
import { inferGraphPath } from "../../scripts/recipes/lib/refine";

describe("ingredient coverage upgrades", () => {
  it("maps RecipeNLG cup-abbreviation sugar / mince / worcestershire", () => {
    expect(normalizeIngredientText("1 c. sugar").stumeSlug).toBe("sugar");
    expect(normalizeIngredientText("c brown sugar").stumeSlug).toBe("brown-sugar");
    expect(normalizeIngredientText("1 lb ground beef").stumeSlug).toBe("mince");
    expect(normalizeIngredientText("worcestershire sauce").stumeSlug).toBe(
      "worcestershire-sauce",
    );
    expect(normalizeIngredientText("1 c water").normalizedName).toBe("water");
    expect(normalizeIngredientText("1 c water").stumeSlug).toBeNull();
    expect(normalizeIngredientText("1/2 c. cold water").normalizedName).toBe("water");
    expect(normalizeIngredientText("1/2 c. cold water").stumeSlug).toBeNull();
  });

  it("infers meal-relevant graph paths for mince + pasta kitchens", () => {
    const path = inferGraphPath(["mince", "onions", "oil", "pasta", "chopped-tomatoes", "cheese"], {
      title: "Student Mince Pasta",
      steps: ["Fry mince with onion.", "Boil pasta.", "Combine with tomatoes and cheese."],
    });
    expect(path.graphPath.length).toBeGreaterThan(0);
    expect(path.graphPath.some((slug) => slug.includes("mince") || slug.includes("pasta"))).toBe(
      true,
    );
    expect(path.componentSlugs.length).toBeGreaterThan(0);
  });
});

describe("corpus-scale recommendations", () => {
  it(
    "loads corpus recipes into the seed graph and recommends at scale",
    async () => {
      const graph = buildGraphFromSeed({ includeCorpus: true });
      expect(graph.recipes.length).toBeGreaterThan(100);
      expect(graph.recipes.some((recipe) => recipe.generationSource === "corpus")).toBe(true);
      expect(graph.ingredients.has("mince")).toBe(true);
      expect(graph.ingredients.has("sugar")).toBe(true);

      const kitchen = createKitchenState([
        "pasta",
        "mince",
        "onions",
        "chopped-tomatoes",
        "cheese",
        "oil",
        "eggs",
        "rice",
        "butter",
      ]);

      const result = await getRecommendations(graph, kitchen, {
        minMakeNow: 5,
        generator: new DisabledRecipeGenerator(),
      });

      expect(result.makeNow.length).toBeGreaterThanOrEqual(5);
      expect(result.almostThere.length + result.goodNextBuys.length).toBeGreaterThan(0);
      expect(result.superFoods.length).toBeGreaterThan(0);
      expect(result.usedGenerator).toBe(false);

      const corpusHits = result.makeNow.filter((item) => item.recipe.generationSource === "corpus");
      expect(corpusHits.length).toBeGreaterThan(0);
    },
    30_000,
  );
});

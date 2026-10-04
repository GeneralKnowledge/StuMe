import { describe, expect, it } from "vitest";
import { buildGraphFromSeed } from "@/lib/graph/buildFromSeed";
import { createKitchenState } from "@/lib/graph/engine";
import { getRecommendations } from "@/lib/cache/recommend";
import { DisabledRecipeGenerator } from "@/lib/llm/generator";

const graph = buildGraphFromSeed();

describe("end-to-end student kitchen", () => {
  it("returns several sensible meals for rice+eggs+mushrooms+onions+butter+cheese without LLM", async () => {
    const kitchen = createKitchenState([
      "rice",
      "eggs",
      "mushrooms",
      "onions",
      "butter",
      "cheese",
    ]);

    const result = await getRecommendations(graph, kitchen, {
      minMakeNow: 3,
      generator: new DisabledRecipeGenerator(),
    });

    expect(result.makeNow.length).toBeGreaterThanOrEqual(3);
    const titles = result.makeNow.map((item) => item.recipe.title).join(" | ").toLowerCase();
    expect(titles).toMatch(/rice|egg|mushroom|omelette|cheese/);
    expect(result.usedGenerator).toBe(false);
    expect(result.goodNextBuys.length).toBeGreaterThan(0);
  });
});

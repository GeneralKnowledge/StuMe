import { describe, expect, it, vi } from "vitest";
import { buildGraphFromSeed } from "@/lib/graph/buildFromSeed";
import { createKitchenState } from "@/lib/graph/engine";
import { getRecommendations } from "@/lib/cache/recommend";
import { HeuristicRecipeGenerator, DisabledRecipeGenerator } from "@/lib/llm/generator";
import { validateRecipeDraft, toGraphRecipe } from "@/lib/validation/recipes";
import { draftToSignature, isDuplicateOfExisting } from "@/lib/validation/signature";

const graph = buildGraphFromSeed();

describe("recipe cache and generation", () => {
  it("reuses cached recipes without generation when enough exist", async () => {
    const kitchen = createKitchenState([
      "rice",
      "eggs",
      "mushrooms",
      "onions",
      "butter",
      "cheese",
    ]);
    const generator = new HeuristicRecipeGenerator();
    const spy = vi.spyOn(generator, "generateBatch");

    const result = await getRecommendations(graph, kitchen, {
      minMakeNow: 3,
      generator,
      cache: {
        getRejectedSignatures: async () => new Set(),
        saveRecipes: async () => undefined,
        saveRejectedSignature: async () => undefined,
      },
    });

    expect(result.makeNow.length).toBeGreaterThanOrEqual(3);
    expect(spy).not.toHaveBeenCalled();
    expect(result.usedGenerator).toBe(false);
  });

  it("rejects duplicate recipes", () => {
    const existing = graph.recipes;
    const clone = {
      ...existing[0]!,
      title: `${existing[0]!.title} Deluxe`,
    };
    expect(isDuplicateOfExisting(clone, existing)).toBe(true);
  });

  it("triggers batch generation when cache is insufficient", async () => {
    const tinyGraph = {
      ...graph,
      recipes: graph.recipes.filter((recipe) => recipe.tags.includes("curry")),
    };
    const kitchen = createKitchenState([
      "instant-noodles",
      "eggs",
      "cheese",
      "oil",
      "bread",
      "butter",
      "microwave-rice",
      "soy-sauce",
    ]);
    const generator = new HeuristicRecipeGenerator();
    const saved: string[] = [];
    const rejected: string[] = [];

    const result = await getRecommendations(tinyGraph, kitchen, {
      minMakeNow: 3,
      generator,
      constraints: { batchSize: 5 },
      cache: {
        getRejectedSignatures: async () => new Set(rejected),
        saveRecipes: async (recipes) => {
          saved.push(...recipes.map((recipe) => recipe.title));
        },
        saveRejectedSignature: async (signature) => {
          rejected.push(signature);
        },
      },
    });

    expect(result.usedGenerator).toBe(true);
    expect(result.generatedCount).toBeGreaterThan(0);
    expect(saved.length).toBeGreaterThan(0);
    expect(saved.length).toBeLessThanOrEqual(5);
  });

  it("does not call a disabled generator", async () => {
    const kitchen = createKitchenState(["salt"]);
    const generator = new DisabledRecipeGenerator();
    const spy = vi.spyOn(generator, "generateBatch");
    await getRecommendations(graph, kitchen, {
      minMakeNow: 5,
      generator,
      cache: {
        getRejectedSignatures: async () => new Set(),
        saveRecipes: async () => undefined,
        saveRejectedSignature: async () => undefined,
      },
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("avoids repeatedly generating previously rejected signatures", () => {
    const draft = {
      title: "Impossible Truffle Pasta",
      description: "nope",
      steps: ["buy truffles"],
      timeMinutes: 10,
      difficulty: "easy" as const,
      equipment: ["pan"],
      estimatedCost: "expensive" as const,
      tags: ["pasta"],
      ingredients: [{ ingredientSlug: "pasta", optional: false }],
      componentSlugs: ["cooked-pasta"],
      graphPath: ["boil-pasta"],
    };
    const signature = draftToSignature(draft);
    const rejected = new Set([signature]);
    const result = validateRecipeDraft(graph, draft, graph.recipes, rejected);
    expect(result.ok).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/rejected|Unknown|Specialist|Duplicate|Missing|complicated|ingredients/i);
  });

  it("validates generated recipes against the graph", () => {
    const draft = {
      title: "Soy Egg Rice",
      description: "Quick",
      steps: ["Cook rice", "Add egg"],
      timeMinutes: 10,
      difficulty: "easy" as const,
      equipment: ["pan", "hob"],
      estimatedCost: "very_cheap" as const,
      tags: ["rice", "egg"],
      ingredients: [
        { ingredientSlug: "microwave-rice", optional: false },
        { ingredientSlug: "eggs", optional: false },
        { ingredientSlug: "butter", optional: false },
      ],
      componentSlugs: ["cooked-rice", "egg-rice"],
      graphPath: ["cook-microwave-rice", "egg-rice"],
    };
    const result = validateRecipeDraft(graph, draft, [], new Set());
    expect(result.ok).toBe(true);
    const recipe = toGraphRecipe(draft, "llm");
    expect(recipe.signature).toContain("cores:");
  });
});

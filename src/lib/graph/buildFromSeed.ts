import { readFileSync } from "node:fs";
import { INGREDIENTS } from "../../../prisma/seed/ingredients";
import { TRANSFORMATIONS } from "../../../prisma/seed/transformations";
import { RECIPES } from "../../../prisma/seed/recipes";
import { resolveCorpusCandidatesPath } from "@/lib/corpus/path";
import type { FoodGraph } from "@/lib/graph/engine";
import type { GraphComponent, GraphIngredient, GraphRecipe } from "@/lib/types";
import { buildRecipeSignature } from "@/lib/validation/signature";

interface RefinedCorpusRecipe {
  title: string;
  description: string;
  steps: string[];
  timeMinutes: number;
  difficulty: GraphRecipe["difficulty"];
  equipment: string[];
  estimatedCost: GraphRecipe["estimatedCost"];
  tags: string[];
  graphPath: string[];
  ingredients: Array<{ slug: string; quantity?: string; optional?: boolean }>;
  componentSlugs: string[];
  signature?: string;
}

export function buildGraphFromSeed(options?: { includeCorpus?: boolean }): FoodGraph {
  // Corpus is opt-in: unit/e2e tests stay on the curated seed graph.
  // Demo, DB seed, and corpus UX tests pass includeCorpus: true.
  const includeCorpus = options?.includeCorpus ?? false;
  const ingredients = new Map<string, GraphIngredient>();
  for (const item of INGREDIENTS) {
    ingredients.set(item.slug, {
      id: `ing-${item.slug}`,
      slug: item.slug,
      name: item.name,
      category: item.category,
      costCategory: item.costCategory,
      shelfLifeDays: item.shelfLifeDays,
      defaultStorage: item.defaultStorage,
      versatility: item.versatility,
      wasteRisk: item.wasteRisk,
      tags: item.tags,
      isEssential: Boolean(item.isEssential),
    });
  }

  const components = new Map<string, GraphComponent>();
  for (const transformation of TRANSFORMATIONS) {
    if (!components.has(transformation.outputSlug)) {
      components.set(transformation.outputSlug, {
        id: `comp-${transformation.outputSlug}`,
        slug: transformation.outputSlug,
        name: transformation.outputName,
        tags: transformation.outputTags ?? [],
        difficulty: transformation.difficulty,
        timeMinutes: transformation.timeMinutes,
        equipment: transformation.equipment,
      });
    }
  }

  const transformations = TRANSFORMATIONS.map((item) => ({
    id: `tr-${item.slug}`,
    slug: item.slug,
    name: item.name,
    method: item.method,
    timeMinutes: item.timeMinutes,
    difficulty: item.difficulty,
    equipment: item.equipment,
    tags: item.tags,
    inputs: item.inputs.map((input) => ({
      ingredientSlug: input.ingredientSlug,
      componentSlug: input.componentSlug,
      optional: Boolean(input.optional),
      role: input.role,
    })),
    outputSlugs: [item.outputSlug],
  }));

  const recipes: GraphRecipe[] = RECIPES.map((item, index) => {
    const ingredientsList = item.ingredients.map((ingredient) => ({
      ingredientSlug: ingredient.slug,
      quantity: ingredient.quantity,
      optional: Boolean(ingredient.optional),
    }));
    const signature = buildRecipeSignature({
      title: item.title,
      ingredients: ingredientsList,
      graphPath: item.graphPath,
      tags: item.tags,
      equipment: item.equipment,
      componentSlugs: item.componentSlugs,
    });

    return {
      id: `recipe-${index + 1}`,
      title: item.title,
      description: item.description,
      steps: item.steps,
      timeMinutes: item.timeMinutes,
      difficulty: item.difficulty,
      equipment: item.equipment,
      estimatedCost: item.estimatedCost,
      tags: item.tags,
      graphPath: item.graphPath,
      generationSource: "seed",
      signature,
      popularity: 0,
      useCount: 0,
      noveltyScore: 1,
      ingredients: ingredientsList,
      componentSlugs: item.componentSlugs,
    };
  });

  const signatures = new Set(recipes.map((recipe) => recipe.signature));

  const corpusPath = includeCorpus ? resolveCorpusCandidatesPath() : null;
  if (corpusPath) {
    const corpus = JSON.parse(readFileSync(corpusPath, "utf8")) as RefinedCorpusRecipe[];
    let corpusIndex = 0;
    for (const item of corpus) {
      const ingredientsList = item.ingredients
        .filter((ingredient) => ingredients.has(ingredient.slug))
        .map((ingredient) => ({
          ingredientSlug: ingredient.slug,
          quantity: ingredient.quantity,
          optional: Boolean(ingredient.optional),
        }));
      if (ingredientsList.length < 2) continue;

      const componentSlugs = (item.componentSlugs ?? []).filter((slug) => components.has(slug));
      const graphPath = (item.graphPath ?? []).filter((slug) =>
        transformations.some((transform) => transform.slug === slug),
      );
      const signature =
        item.signature ??
        buildRecipeSignature({
          title: item.title,
          ingredients: ingredientsList,
          graphPath,
          tags: item.tags,
          equipment: item.equipment,
          componentSlugs,
        });
      if (signatures.has(signature)) continue;
      signatures.add(signature);
      corpusIndex += 1;
      recipes.push({
        id: `corpus-${corpusIndex}`,
        title: item.title,
        description: item.description,
        steps: item.steps,
        timeMinutes: item.timeMinutes,
        difficulty: item.difficulty,
        equipment: item.equipment,
        estimatedCost: item.estimatedCost,
        tags: item.tags,
        graphPath,
        generationSource: "corpus",
        signature,
        popularity: 0,
        useCount: 0,
        noveltyScore: 1,
        ingredients: ingredientsList,
        componentSlugs,
      });
    }
  }

  return { ingredients, components, transformations, recipes };
}

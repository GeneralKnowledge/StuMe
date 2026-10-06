import type { PrismaClient } from "@prisma/client";
import type { CostCategory, Difficulty, GenerationSource } from "@/lib/types";

export type RecipeWriteIngredient = {
  slug: string;
  quantity?: string;
  optional?: boolean;
};

export type RecipeWriteInput = {
  title: string;
  description: string;
  steps: string[];
  timeMinutes: number;
  difficulty: Difficulty | string;
  equipment: string[];
  estimatedCost: CostCategory | string;
  tags: string[];
  graphPath: string[];
  generationSource: GenerationSource;
  signature: string;
  popularity?: number;
  useCount?: number;
  noveltyScore?: number;
  ingredients: RecipeWriteIngredient[];
  componentSlugs: string[];
};

export type RecipeWriteOptions = {
  ingredientIds?: Map<string, string>;
  componentIds?: Map<string, string>;
  /**
   * - throw: fail hard (seed hand recipes)
   * - skip_recipe: omit the whole recipe if any ingredient is unknown (corpus ingest)
   * - omit_ingredients: insert recipe, drop unknown ingredient rows (LLM drafts)
   */
  onMissingIngredient?: "throw" | "skip_recipe" | "omit_ingredients";
  /**
   * - throw: fail hard (seed)
   * - omit: skip unknown component links (corpus / LLM)
   */
  onMissingComponent?: "throw" | "omit";
};

export type RecipeWriteResult =
  | { ok: true; id: string }
  | { ok: false; reason: "missing_ingredient"; missing: string[] };

async function resolveIdMaps(
  prisma: PrismaClient,
  options?: RecipeWriteOptions,
): Promise<{ ingredientIds: Map<string, string>; componentIds: Map<string, string> }> {
  const ingredientIds =
    options?.ingredientIds ??
    new Map(
      (await prisma.ingredient.findMany({ select: { id: true, slug: true } })).map((row) => [
        row.slug,
        row.id,
      ]),
    );
  const componentIds =
    options?.componentIds ??
    new Map(
      (await prisma.component.findMany({ select: { id: true, slug: true } })).map((row) => [
        row.slug,
        row.id,
      ]),
    );
  return { ingredientIds, componentIds };
}

/**
 * Single write path for seed hand recipes, corpus ingest, and LLM-generated recipes.
 */
export async function writeRecipe(
  prisma: PrismaClient,
  recipe: RecipeWriteInput,
  options?: RecipeWriteOptions,
): Promise<RecipeWriteResult> {
  const onMissingIngredient = options?.onMissingIngredient ?? "omit_ingredients";
  const onMissingComponent = options?.onMissingComponent ?? "omit";
  const { ingredientIds, componentIds } = await resolveIdMaps(prisma, options);

  const missing = recipe.ingredients
    .map((item) => item.slug)
    .filter((slug) => !ingredientIds.has(slug));

  if (missing.length > 0) {
    if (onMissingIngredient === "throw") {
      throw new Error(
        `Missing ingredient for recipe ${recipe.title}: ${missing.join(", ")}`,
      );
    }
    if (onMissingIngredient === "skip_recipe") {
      return { ok: false, reason: "missing_ingredient", missing };
    }
  }

  const ingredientsToWrite =
    onMissingIngredient === "omit_ingredients"
      ? recipe.ingredients.filter((item) => ingredientIds.has(item.slug))
      : recipe.ingredients;

  const created = await prisma.recipe.create({
    data: {
      title: recipe.title,
      description: recipe.description,
      steps: JSON.stringify(recipe.steps),
      timeMinutes: recipe.timeMinutes,
      difficulty: recipe.difficulty,
      equipment: JSON.stringify(recipe.equipment),
      estimatedCost: recipe.estimatedCost,
      tags: JSON.stringify(recipe.tags),
      graphPath: JSON.stringify(recipe.graphPath),
      generationSource: recipe.generationSource,
      signature: recipe.signature,
      popularity: recipe.popularity ?? 0,
      useCount: recipe.useCount ?? 0,
      noveltyScore: recipe.noveltyScore ?? 1,
    },
  });

  for (const item of ingredientsToWrite) {
    const ingredientId = ingredientIds.get(item.slug);
    if (!ingredientId) continue;
    await prisma.recipeIngredient.create({
      data: {
        recipeId: created.id,
        ingredientId,
        quantity: item.quantity,
        optional: Boolean(item.optional),
      },
    });
  }

  for (const componentSlug of recipe.componentSlugs) {
    const componentId = componentIds.get(componentSlug);
    if (!componentId) {
      if (onMissingComponent === "throw") {
        throw new Error(`Missing component for recipe ${recipe.title}: ${componentSlug}`);
      }
      continue;
    }
    await prisma.recipeComponent.create({
      data: {
        recipeId: created.id,
        componentId,
      },
    });
  }

  return { ok: true, id: created.id };
}

/** Load slug→id maps once for bulk seed/ingest loops. */
export async function loadRecipeWriteMaps(prisma: PrismaClient): Promise<{
  ingredientIds: Map<string, string>;
  componentIds: Map<string, string>;
}> {
  return resolveIdMaps(prisma);
}

import { PrismaClient } from "@prisma/client";
import type { RefinedRecipe } from "./refine";

export interface IngestResult {
  inserted: number;
  skippedDuplicate: number;
  skippedMissingIngredient: number;
  totalRecipesInDb: number;
}

/**
 * Insert refined corpus recipes into the live SQLite graph without wiping seeds.
 * Skips signature collisions with existing recipes.
 */
export async function ingestRefinedRecipes(
  prisma: PrismaClient,
  recipes: RefinedRecipe[],
): Promise<IngestResult> {
  const ingredientRows = await prisma.ingredient.findMany({ select: { id: true, slug: true } });
  const ingredientIds = new Map(ingredientRows.map((row) => [row.slug, row.id]));
  const componentRows = await prisma.component.findMany({ select: { id: true, slug: true } });
  const componentIds = new Map(componentRows.map((row) => [row.slug, row.id]));

  const existing = await prisma.recipe.findMany({ select: { signature: true } });
  const signatures = new Set(existing.map((row) => row.signature));

  let inserted = 0;
  let skippedDuplicate = 0;
  let skippedMissingIngredient = 0;

  for (const recipe of recipes) {
    if (signatures.has(recipe.signature)) {
      skippedDuplicate += 1;
      continue;
    }

    const missing = recipe.ingredients.filter((item) => !ingredientIds.has(item.slug));
    if (missing.length > 0) {
      skippedMissingIngredient += 1;
      continue;
    }

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
        generationSource: "corpus",
        signature: recipe.signature,
        popularity: 0,
        useCount: 0,
        noveltyScore: 1,
      },
    });

    for (const item of recipe.ingredients) {
      await prisma.recipeIngredient.create({
        data: {
          recipeId: created.id,
          ingredientId: ingredientIds.get(item.slug)!,
          optional: Boolean(item.optional),
        },
      });
    }

    for (const componentSlug of recipe.componentSlugs) {
      const componentId = componentIds.get(componentSlug);
      if (!componentId) continue;
      await prisma.recipeComponent.create({
        data: {
          recipeId: created.id,
          componentId,
        },
      });
    }

    signatures.add(recipe.signature);
    inserted += 1;
  }

  const totalRecipesInDb = await prisma.recipe.count();
  return { inserted, skippedDuplicate, skippedMissingIngredient, totalRecipesInDb };
}

import { PrismaClient } from "@prisma/client";
import { loadRecipeWriteMaps, writeRecipe } from "@/lib/db/writeRecipe";
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
  const { ingredientIds, componentIds } = await loadRecipeWriteMaps(prisma);

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

    const result = await writeRecipe(
      prisma,
      {
        title: recipe.title,
        description: recipe.description,
        steps: recipe.steps,
        timeMinutes: recipe.timeMinutes,
        difficulty: recipe.difficulty,
        equipment: recipe.equipment,
        estimatedCost: recipe.estimatedCost,
        tags: recipe.tags,
        graphPath: recipe.graphPath,
        generationSource: "corpus",
        signature: recipe.signature,
        popularity: 0,
        useCount: 0,
        noveltyScore: 1,
        ingredients: recipe.ingredients.map((item) => ({
          slug: item.slug,
          optional: Boolean(item.optional),
        })),
        componentSlugs: recipe.componentSlugs,
      },
      {
        ingredientIds,
        componentIds,
        onMissingIngredient: "skip_recipe",
        onMissingComponent: "omit",
      },
    );

    if (!result.ok) {
      skippedMissingIngredient += 1;
      continue;
    }

    signatures.add(recipe.signature);
    inserted += 1;
  }

  const totalRecipesInDb = await prisma.recipe.count();
  return { inserted, skippedDuplicate, skippedMissingIngredient, totalRecipesInDb };
}

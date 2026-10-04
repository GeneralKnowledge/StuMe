import { INGREDIENTS } from "../../../prisma/seed/ingredients";
import { TRANSFORMATIONS } from "../../../prisma/seed/transformations";
import { RECIPES } from "../../../prisma/seed/recipes";
import type { FoodGraph } from "@/lib/graph/engine";
import type { GraphComponent, GraphIngredient, GraphRecipe } from "@/lib/types";
import { buildRecipeSignature } from "@/lib/validation/signature";

export function buildGraphFromSeed(): FoodGraph {
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

  return { ingredients, components, transformations, recipes };
}

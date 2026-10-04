import { prisma } from "@/lib/db/prisma";
import type { FoodGraph } from "@/lib/graph/engine";
import type {
  CostCategory,
  Difficulty,
  GenerationSource,
  GraphComponent,
  GraphIngredient,
  GraphRecipe,
  GraphTransformation,
  Storage,
} from "@/lib/types";

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function loadFoodGraph(): Promise<FoodGraph> {
  const [ingredients, components, transformations, recipes] = await Promise.all([
    prisma.ingredient.findMany(),
    prisma.component.findMany(),
    prisma.transformation.findMany({
      include: { inputs: { include: { ingredient: true, component: true } }, outputs: { include: { component: true } } },
    }),
    prisma.recipe.findMany({
      include: {
        ingredients: { include: { ingredient: true } },
        components: { include: { component: true } },
      },
    }),
  ]);

  const ingredientMap = new Map<string, GraphIngredient>();
  for (const item of ingredients) {
    ingredientMap.set(item.slug, {
      id: item.id,
      slug: item.slug,
      name: item.name,
      category: item.category,
      costCategory: item.costCategory as CostCategory,
      shelfLifeDays: item.shelfLifeDays,
      defaultStorage: item.defaultStorage as Storage,
      versatility: item.versatility,
      wasteRisk: item.wasteRisk,
      tags: parseJsonArray(item.tags),
      isEssential: item.isEssential,
    });
  }

  const componentMap = new Map<string, GraphComponent>();
  for (const item of components) {
    componentMap.set(item.slug, {
      id: item.id,
      slug: item.slug,
      name: item.name,
      tags: parseJsonArray(item.tags),
      difficulty: item.difficulty as Difficulty,
      timeMinutes: item.timeMinutes,
      equipment: parseJsonArray(item.equipment),
    });
  }

  const graphTransformations: GraphTransformation[] = transformations.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    method: item.method,
    timeMinutes: item.timeMinutes,
    difficulty: item.difficulty as Difficulty,
    equipment: parseJsonArray(item.equipment),
    tags: parseJsonArray(item.tags),
    inputs: item.inputs.map((input) => ({
      ingredientSlug: input.ingredient?.slug,
      componentSlug: input.component?.slug,
      optional: input.optional,
      role: input.role ?? undefined,
    })),
    outputSlugs: item.outputs.map((output) => output.component.slug),
  }));

  const graphRecipes: GraphRecipe[] = recipes.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    steps: parseJsonArray(item.steps),
    timeMinutes: item.timeMinutes,
    difficulty: item.difficulty as Difficulty,
    equipment: parseJsonArray(item.equipment),
    estimatedCost: item.estimatedCost as CostCategory,
    tags: parseJsonArray(item.tags),
    graphPath: parseJsonArray(item.graphPath),
    generationSource: item.generationSource as GenerationSource,
    signature: item.signature,
    popularity: item.popularity,
    useCount: item.useCount,
    noveltyScore: item.noveltyScore,
    ingredients: item.ingredients.map((ri) => ({
      ingredientSlug: ri.ingredient.slug,
      quantity: ri.quantity ?? undefined,
      optional: ri.optional,
    })),
    componentSlugs: item.components.map((rc) => rc.component.slug),
    createdAt: item.createdAt,
  }));

  return {
    ingredients: ingredientMap,
    components: componentMap,
    transformations: graphTransformations,
    recipes: graphRecipes,
  };
}

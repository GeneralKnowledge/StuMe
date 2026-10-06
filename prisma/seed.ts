import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { INGREDIENTS } from "./seed/ingredients";
import { TRANSFORMATIONS } from "./seed/transformations";
import { RECIPES } from "./seed/recipes";
import { corpusLabel, resolveCorpusCandidatesPath } from "../src/lib/corpus/path";
import { DEFAULT_SCORE_WEIGHTS } from "../src/lib/types";
import { writeRecipe } from "../src/lib/db/writeRecipe";
import { buildRecipeSignature } from "../src/lib/validation/signature";
import { ingestRefinedRecipes } from "../scripts/recipes/lib/ingest";
import type { RefinedRecipe } from "../scripts/recipes/lib/refine";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding StuMe food graph...");

  await prisma.rejectedRecipeSignature.deleteMany();
  await prisma.kitchenItem.deleteMany();
  await prisma.kitchen.deleteMany();
  await prisma.recipeComponent.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.transformationOutput.deleteMany();
  await prisma.transformationInput.deleteMany();
  await prisma.transformation.deleteMany();
  await prisma.component.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.scoreConfig.deleteMany();

  const ingredientIds = new Map<string, string>();
  for (const item of INGREDIENTS) {
    const created = await prisma.ingredient.create({
      data: {
        slug: item.slug,
        name: item.name,
        category: item.category,
        costCategory: item.costCategory,
        shelfLifeDays: item.shelfLifeDays,
        defaultStorage: item.defaultStorage,
        versatility: item.versatility,
        wasteRisk: item.wasteRisk,
        tags: JSON.stringify(item.tags),
        isEssential: Boolean(item.isEssential),
      },
    });
    ingredientIds.set(item.slug, created.id);
  }

  const componentIds = new Map<string, string>();
  for (const transformation of TRANSFORMATIONS) {
    if (componentIds.has(transformation.outputSlug)) continue;
    const created = await prisma.component.create({
      data: {
        slug: transformation.outputSlug,
        name: transformation.outputName,
        tags: JSON.stringify(transformation.outputTags ?? []),
        difficulty: transformation.difficulty,
        timeMinutes: transformation.timeMinutes,
        equipment: JSON.stringify(transformation.equipment),
      },
    });
    componentIds.set(transformation.outputSlug, created.id);
  }

  for (const transformation of TRANSFORMATIONS) {
    const created = await prisma.transformation.create({
      data: {
        slug: transformation.slug,
        name: transformation.name,
        method: transformation.method,
        timeMinutes: transformation.timeMinutes,
        difficulty: transformation.difficulty,
        equipment: JSON.stringify(transformation.equipment),
        tags: JSON.stringify(transformation.tags),
      },
    });

    for (const input of transformation.inputs) {
      await prisma.transformationInput.create({
        data: {
          transformationId: created.id,
          ingredientId: input.ingredientSlug
            ? ingredientIds.get(input.ingredientSlug)
            : undefined,
          componentId: input.componentSlug
            ? componentIds.get(input.componentSlug)
            : undefined,
          optional: Boolean(input.optional),
          role: input.role,
        },
      });
    }

    await prisma.transformationOutput.create({
      data: {
        transformationId: created.id,
        componentId: componentIds.get(transformation.outputSlug)!,
      },
    });
  }

  for (const recipe of RECIPES) {
    const ingredients = recipe.ingredients.map((item) => ({
      ingredientSlug: item.slug,
      quantity: item.quantity,
      optional: Boolean(item.optional),
    }));
    const signature = buildRecipeSignature({
      title: recipe.title,
      ingredients,
      graphPath: recipe.graphPath,
      tags: recipe.tags,
      equipment: recipe.equipment,
      componentSlugs: recipe.componentSlugs,
    });

    const written = await writeRecipe(
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
        generationSource: "seed",
        signature,
        popularity: 1,
        useCount: 0,
        noveltyScore: 1,
        ingredients: recipe.ingredients.map((item) => ({
          slug: item.slug,
          quantity: item.quantity,
          optional: Boolean(item.optional),
        })),
        componentSlugs: recipe.componentSlugs,
      },
      {
        ingredientIds,
        componentIds,
        onMissingIngredient: "throw",
        onMissingComponent: "throw",
      },
    );
    if (!written.ok) {
      throw new Error(`Failed to seed recipe ${recipe.title}`);
    }
  }

  let corpusInserted = 0;
  const corpusPath = resolveCorpusCandidatesPath();
  if (corpusPath) {
    const refined = JSON.parse(readFileSync(corpusPath, "utf8")) as RefinedRecipe[];
    const ingest = await ingestRefinedRecipes(prisma, refined);
    corpusInserted = ingest.inserted;
    console.log(
      `Ingested ${corpusLabel(corpusPath)} corpus (${refined.length} files): ${ingest.inserted} inserted, ${ingest.skippedDuplicate} signature skips.`,
    );
  } else {
    console.log("No corpus candidates found (STUME_CORPUS=none or missing files); seed recipes only.");
  }

  const kitchen = await prisma.kitchen.create({
    data: {
      name: "Demo Kitchen",
      equipment: JSON.stringify([
        "pan",
        "hob",
        "microwave",
        "toaster",
        "kettle",
        "bowl",
        "oven",
        "tray",
        "grill",
      ]),
    },
  });

  const demoSlugs = [
    "rice",
    "eggs",
    "mushrooms",
    "onions",
    "butter",
    "cheese",
    "oil",
    "salt",
    "pepper",
  ];

  for (const slug of demoSlugs) {
    await prisma.kitchenItem.create({
      data: {
        kitchenId: kitchen.id,
        ingredientId: ingredientIds.get(slug)!,
        storage: INGREDIENTS.find((item) => item.slug === slug)!.defaultStorage,
        isStaple: ["butter", "oil", "salt", "pepper"].includes(slug),
        expiringSoon: ["mushrooms"].includes(slug),
      },
    });
  }

  await prisma.scoreConfig.create({
    data: {
      id: "default",
      weights: JSON.stringify(DEFAULT_SCORE_WEIGHTS),
    },
  });

  console.log(
    `Seeded ${INGREDIENTS.length} ingredients, ${TRANSFORMATIONS.length} transformations, ${RECIPES.length} hand recipes` +
      (corpusInserted ? ` + ${corpusInserted} corpus recipes` : "") +
      ".",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { loadFoodGraph } from "@/lib/graph/load";
import { createKitchenState } from "@/lib/graph/engine";
import { getRecommendations } from "@/lib/cache/recommend";
import { createRecipeGenerator } from "@/lib/llm/generator";
import type { Storage } from "@/lib/types";

async function getOrCreateKitchen() {
  const existing = await prisma.kitchen.findFirst({
    include: { items: { include: { ingredient: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.kitchen.create({
    data: {
      name: "My Kitchen",
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
    include: { items: { include: { ingredient: true } } },
  });
}

function parseEquipment(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function getKitchenView() {
  const kitchen = await getOrCreateKitchen();
  const ingredients = await prisma.ingredient.findMany({ orderBy: { name: "asc" } });

  return {
    kitchen: {
      id: kitchen.id,
      name: kitchen.name,
      equipment: parseEquipment(kitchen.equipment),
      items: kitchen.items.map((item) => ({
        id: item.id,
        ingredientId: item.ingredientId,
        slug: item.ingredient.slug,
        name: item.ingredient.name,
        quantity: item.quantity,
        isStaple: item.isStaple,
        expiringSoon: item.expiringSoon,
        storage: item.storage as Storage,
        category: item.ingredient.category,
      })),
    },
    allIngredients: ingredients.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      category: item.category,
      defaultStorage: item.defaultStorage as Storage,
      isEssential: item.isEssential,
    })),
  };
}

export async function addKitchenIngredient(formData: FormData) {
  const kitchen = await getOrCreateKitchen();
  const ingredientId = String(formData.get("ingredientId") ?? "");
  const storage = String(formData.get("storage") ?? "cupboard") as Storage;
  const isStaple = formData.get("isStaple") === "on";
  const expiringSoon = formData.get("expiringSoon") === "on";
  const quantity = String(formData.get("quantity") ?? "") || null;

  if (!ingredientId) return;

  await prisma.kitchenItem.upsert({
    where: {
      kitchenId_ingredientId: {
        kitchenId: kitchen.id,
        ingredientId,
      },
    },
    update: {
      storage,
      isStaple,
      expiringSoon,
      quantity,
    },
    create: {
      kitchenId: kitchen.id,
      ingredientId,
      storage,
      isStaple,
      expiringSoon,
      quantity,
    },
  });

  revalidatePath("/");
  revalidatePath("/kitchen");
}

export async function removeKitchenIngredient(itemId: string) {
  await prisma.kitchenItem.delete({ where: { id: itemId } });
  revalidatePath("/");
  revalidatePath("/kitchen");
}

export async function toggleExpiring(itemId: string, expiringSoon: boolean) {
  await prisma.kitchenItem.update({
    where: { id: itemId },
    data: { expiringSoon },
  });
  revalidatePath("/");
  revalidatePath("/kitchen");
}

export async function setDemoInventory(slugs: string[]) {
  const kitchen = await getOrCreateKitchen();
  await prisma.kitchenItem.deleteMany({ where: { kitchenId: kitchen.id } });
  const ingredients = await prisma.ingredient.findMany({
    where: { slug: { in: slugs } },
  });

  for (const ingredient of ingredients) {
    await prisma.kitchenItem.create({
      data: {
        kitchenId: kitchen.id,
        ingredientId: ingredient.id,
        storage: ingredient.defaultStorage,
        isStaple: ["butter", "oil", "salt", "pepper"].includes(ingredient.slug),
        expiringSoon: ["mushrooms", "spinach", "bread", "milk"].includes(ingredient.slug),
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/kitchen");
}

export async function getHomeRecommendations() {
  const kitchenRow = await getOrCreateKitchen();
  const graph = await loadFoodGraph();
  const kitchen = createKitchenState(
    kitchenRow.items.map((item) => item.ingredient.slug),
    {
      equipment: parseEquipment(kitchenRow.equipment),
      expiringSlugs: kitchenRow.items
        .filter((item) => item.expiringSoon)
        .map((item) => item.ingredient.slug),
      stapleSlugs: kitchenRow.items
        .filter((item) => item.isStaple)
        .map((item) => item.ingredient.slug),
    },
  );

  const result = await getRecommendations(graph, kitchen, {
    minMakeNow: 3,
    generator: createRecipeGenerator(),
    cache: {
      getRejectedSignatures: async () => {
        const rows = await prisma.rejectedRecipeSignature.findMany();
        return new Set(rows.map((row) => row.signature));
      },
      saveRejectedSignature: async (signature, reason) => {
        await prisma.rejectedRecipeSignature.upsert({
          where: { signature },
          update: { reason },
          create: { signature, reason },
        });
      },
      saveRecipes: async (recipes) => {
        for (const recipe of recipes) {
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
              popularity: 0,
              useCount: 0,
              noveltyScore: recipe.noveltyScore,
            },
          });

          for (const item of recipe.ingredients) {
            const ingredient = await prisma.ingredient.findUnique({
              where: { slug: item.ingredientSlug },
            });
            if (!ingredient) continue;
            await prisma.recipeIngredient.create({
              data: {
                recipeId: created.id,
                ingredientId: ingredient.id,
                quantity: item.quantity,
                optional: item.optional,
              },
            });
          }

          for (const componentSlug of recipe.componentSlugs) {
            const component = await prisma.component.findUnique({
              where: { slug: componentSlug },
            });
            if (!component) continue;
            await prisma.recipeComponent.create({
              data: {
                recipeId: created.id,
                componentId: component.id,
              },
            });
          }
        }
      },
    },
  });

  return {
    kitchenName: kitchenRow.name,
    inventoryCount: kitchenRow.items.length,
    ...result,
    // Strip non-serializable bits for client if needed — keep plain objects.
    makeNow: result.makeNow.map(serializeCandidate),
    almostThere: result.almostThere.map(serializeCandidate),
    useSoon: result.useSoon.map(serializeCandidate),
  };
}

function serializeCandidate(candidate: Awaited<ReturnType<typeof getRecommendations>>["makeNow"][number]) {
  return {
    id: candidate.recipe.id,
    title: candidate.recipe.title,
    description: candidate.recipe.description,
    steps: candidate.recipe.steps,
    timeMinutes: candidate.recipe.timeMinutes,
    difficulty: candidate.recipe.difficulty,
    equipment: candidate.recipe.equipment,
    estimatedCost: candidate.recipe.estimatedCost,
    tags: candidate.recipe.tags,
    score: candidate.score,
    availabilityPct: candidate.availabilityPct,
    availableRequired: candidate.availableRequired,
    missingRequired: candidate.missingRequired,
    availableOptional: candidate.availableOptional,
    canMakeNow: candidate.canMakeNow,
    almostThere: candidate.almostThere,
    usesExpiring: candidate.usesExpiring,
    generationSource: candidate.recipe.generationSource,
  };
}

export type SerializedCandidate = ReturnType<typeof serializeCandidate>;

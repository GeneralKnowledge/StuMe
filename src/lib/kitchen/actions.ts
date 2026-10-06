"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { writeRecipe } from "@/lib/db/writeRecipe";
import { loadFoodGraph } from "@/lib/graph/load";
import { createKitchenState } from "@/lib/graph/engine";
import { scoreRecipe } from "@/lib/scoring/score";
import { getRecommendations } from "@/lib/cache/recommend";
import { createRecipeGenerator } from "@/lib/llm/generator";
import type { GraphRecipe, Storage } from "@/lib/types";
import {
  ASSUMED_STAPLE_SLUGS,
  BASIC_STUDENT_EQUIPMENT,
  POPULAR_INGREDIENT_SLUGS,
} from "@/lib/kitchen/defaults";

const ONBOARD_COOKIE = "stume_onboarded";

async function getOrCreateKitchen() {
  const existing = await prisma.kitchen.findFirst({
    include: { items: { include: { ingredient: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  const kitchen = await prisma.kitchen.create({
    data: {
      name: "My Kitchen",
      equipment: JSON.stringify([...BASIC_STUDENT_EQUIPMENT]),
    },
  });
  await ensureAssumedStaples(kitchen.id);
  return prisma.kitchen.findUniqueOrThrow({
    where: { id: kitchen.id },
    include: { items: { include: { ingredient: true } } },
  });
}

async function ensureAssumedStaples(kitchenId: string) {
  const staples = await prisma.ingredient.findMany({
    where: { slug: { in: [...ASSUMED_STAPLE_SLUGS] } },
  });
  for (const ingredient of staples) {
    await prisma.kitchenItem.upsert({
      where: {
        kitchenId_ingredientId: { kitchenId, ingredientId: ingredient.id },
      },
      update: { isStaple: true },
      create: {
        kitchenId,
        ingredientId: ingredient.id,
        storage: ingredient.defaultStorage,
        isStaple: true,
        expiringSoon: false,
      },
    });
  }
}

function parseEquipment(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function revalidateKitchenPaths() {
  revalidatePath("/");
  revalidatePath("/kitchen");
  revalidatePath("/onboarding");
}

export async function getKitchenView() {
  const kitchen = await getOrCreateKitchen();
  const ingredients = await prisma.ingredient.findMany({ orderBy: { name: "asc" } });
  const ownedSlugs = new Set(kitchen.items.map((item) => item.ingredient.slug));

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
    popularIngredients: ingredients
      .filter((item) => (POPULAR_INGREDIENT_SLUGS as readonly string[]).includes(item.slug))
      .filter((item) => !ownedSlugs.has(item.slug))
      .sort(
        (a, b) =>
          (POPULAR_INGREDIENT_SLUGS as readonly string[]).indexOf(a.slug) -
          (POPULAR_INGREDIENT_SLUGS as readonly string[]).indexOf(b.slug),
      )
      .map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
      })),
    assumedStaples: ASSUMED_STAPLE_SLUGS.map((slug) => {
      const ingredient = ingredients.find((item) => item.slug === slug);
      const owned = kitchen.items.find((item) => item.ingredient.slug === slug);
      return {
        slug,
        name: ingredient?.name ?? slug,
        ingredientId: ingredient?.id ?? "",
        enabled: Boolean(owned),
      };
    }),
  };
}

/** One-tap add — no quantity, no form ceremony. */
export async function quickAddIngredient(ingredientId: string) {
  if (!ingredientId) return;
  const kitchen = await getOrCreateKitchen();
  const ingredient = await prisma.ingredient.findUnique({ where: { id: ingredientId } });
  if (!ingredient) return;

  await prisma.kitchenItem.upsert({
    where: {
      kitchenId_ingredientId: {
        kitchenId: kitchen.id,
        ingredientId,
      },
    },
    update: {},
    create: {
      kitchenId: kitchen.id,
      ingredientId,
      storage: ingredient.defaultStorage,
      isStaple: (ASSUMED_STAPLE_SLUGS as readonly string[]).includes(ingredient.slug),
      expiringSoon: false,
    },
  });

  revalidateKitchenPaths();
}

export async function quickAddBySlug(slug: string) {
  const ingredient = await prisma.ingredient.findUnique({ where: { slug } });
  if (!ingredient) return;
  await quickAddIngredient(ingredient.id);
}

export async function addKitchenIngredient(formData: FormData) {
  const ingredientId = String(formData.get("ingredientId") ?? "");
  await quickAddIngredient(ingredientId);
}

export async function removeKitchenIngredient(itemId: string) {
  await prisma.kitchenItem.delete({ where: { id: itemId } });
  revalidateKitchenPaths();
}

export async function toggleExpiring(itemId: string, expiringSoon: boolean) {
  await prisma.kitchenItem.update({
    where: { id: itemId },
    data: { expiringSoon },
  });
  revalidateKitchenPaths();
}

export async function setAssumedStaple(slug: string, enabled: boolean) {
  if (!(ASSUMED_STAPLE_SLUGS as readonly string[]).includes(slug)) return;
  const kitchen = await getOrCreateKitchen();
  const ingredient = await prisma.ingredient.findUnique({ where: { slug } });
  if (!ingredient) return;

  if (enabled) {
    await prisma.kitchenItem.upsert({
      where: {
        kitchenId_ingredientId: {
          kitchenId: kitchen.id,
          ingredientId: ingredient.id,
        },
      },
      update: { isStaple: true },
      create: {
        kitchenId: kitchen.id,
        ingredientId: ingredient.id,
        storage: ingredient.defaultStorage,
        isStaple: true,
        expiringSoon: false,
      },
    });
  } else {
    await prisma.kitchenItem.deleteMany({
      where: { kitchenId: kitchen.id, ingredientId: ingredient.id },
    });
  }
  revalidateKitchenPaths();
}

export async function setKitchenEquipment(equipment: string[]) {
  const kitchen = await getOrCreateKitchen();
  const cleaned = equipment.map((item) => item.trim()).filter(Boolean);
  await prisma.kitchen.update({
    where: { id: kitchen.id },
    data: { equipment: JSON.stringify(cleaned) },
  });
  revalidateKitchenPaths();
}

export async function setDemoInventory(slugs: string[]) {
  const kitchen = await getOrCreateKitchen();
  await prisma.kitchenItem.deleteMany({ where: { kitchenId: kitchen.id } });
  const ingredients = await prisma.ingredient.findMany({
    where: { slug: { in: [...new Set([...slugs, ...ASSUMED_STAPLE_SLUGS])] } },
  });

  for (const ingredient of ingredients) {
    await prisma.kitchenItem.create({
      data: {
        kitchenId: kitchen.id,
        ingredientId: ingredient.id,
        storage: ingredient.defaultStorage,
        isStaple: (ASSUMED_STAPLE_SLUGS as readonly string[]).includes(ingredient.slug),
        expiringSoon: ["mushrooms", "spinach", "bread", "milk"].includes(ingredient.slug),
      },
    });
  }

  const jar = await cookies();
  jar.set(ONBOARD_COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidateKitchenPaths();
}

export async function completeOnboarding(input: {
  ingredientIds: string[];
  equipment: string[];
}) {
  const kitchen = await getOrCreateKitchen();
  await prisma.kitchenItem.deleteMany({ where: { kitchenId: kitchen.id } });
  await prisma.kitchen.update({
    where: { id: kitchen.id },
    data: {
      name: "My Kitchen",
      equipment: JSON.stringify(
        input.equipment.length > 0 ? input.equipment : [...BASIC_STUDENT_EQUIPMENT],
      ),
    },
  });

  const ids = [...new Set(input.ingredientIds.filter(Boolean))];
  const ingredients = await prisma.ingredient.findMany({
    where: { id: { in: ids } },
  });
  for (const ingredient of ingredients) {
    await prisma.kitchenItem.create({
      data: {
        kitchenId: kitchen.id,
        ingredientId: ingredient.id,
        storage: ingredient.defaultStorage,
        isStaple: false,
        expiringSoon: false,
      },
    });
  }
  await ensureAssumedStaples(kitchen.id);

  const jar = await cookies();
  jar.set(ONBOARD_COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidateKitchenPaths();
}

export async function needsOnboarding(): Promise<boolean> {
  const jar = await cookies();
  if (jar.get(ONBOARD_COOKIE)?.value === "1") return false;
  const kitchen = await prisma.kitchen.findFirst({
    include: { items: { include: { ingredient: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (!kitchen) return true;
  const nonStaple = kitchen.items.filter(
    (item) => !(ASSUMED_STAPLE_SLUGS as readonly string[]).includes(item.ingredient.slug),
  );
  return nonStaple.length === 0;
}

export async function getOnboardingOptions() {
  const ingredients = await prisma.ingredient.findMany({ orderBy: { name: "asc" } });
  const popular = POPULAR_INGREDIENT_SLUGS.map((slug) => ingredients.find((item) => item.slug === slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({ id: item.id, slug: item.slug, name: item.name }));

  return {
    popular,
    allIngredients: ingredients.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      category: item.category,
    })),
    defaultEquipment: [...BASIC_STUDENT_EQUIPMENT],
  };
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
          await writeRecipe(
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
              generationSource: recipe.generationSource,
              signature: recipe.signature,
              popularity: 0,
              useCount: 0,
              noveltyScore: recipe.noveltyScore,
              ingredients: recipe.ingredients.map((item) => ({
                slug: item.ingredientSlug,
                quantity: item.quantity,
                optional: item.optional,
              })),
              componentSlugs: recipe.componentSlugs,
            },
            {
              onMissingIngredient: "omit_ingredients",
              onMissingComponent: "omit",
            },
          );
        }
      },
    },
  });

  const visibleItems = kitchenRow.items.filter(
    (item) => !(ASSUMED_STAPLE_SLUGS as readonly string[]).includes(item.ingredient.slug),
  );

  return {
    kitchenName: kitchenRow.name,
    inventoryCount: visibleItems.length,
    inventory: visibleItems.map((item) => ({
      id: item.id,
      slug: item.ingredient.slug,
      name: item.ingredient.name,
      expiringSoon: item.expiringSoon,
    })),
    ...result,
    makeNow: result.makeNow.map(serializeCandidate),
    almostThere: result.almostThere.map(serializeCandidate),
    useSoon: result.useSoon.map(serializeCandidate),
  };
}

function serializeCandidate(
  candidate: Awaited<ReturnType<typeof getRecommendations>>["makeNow"][number],
) {
  const kit = candidate.recipe.equipment.filter(Boolean);
  const panCount = kit.filter((item) =>
    ["pan", "pot", "bowl", "tray", "hob"].includes(item),
  ).length;

  return {
    id: candidate.recipe.id,
    title: candidate.recipe.title,
    description: candidate.recipe.description,
    steps: candidate.recipe.steps,
    timeMinutes: candidate.recipe.timeMinutes,
    difficulty: candidate.recipe.difficulty,
    effort:
      candidate.recipe.difficulty === "easy"
        ? "Low effort"
        : candidate.recipe.difficulty === "medium"
          ? "Some effort"
          : "More effort",
    equipment: candidate.recipe.equipment,
    kitLabel:
      panCount <= 1
        ? "1 pan"
        : panCount === 2
          ? "2 pots"
          : kit.slice(0, 2).join(" · ") || "basic kit",
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

/** Browse-mode recipe — no kitchen matching. */
function serializeBrowseRecipe(recipe: GraphRecipe): SerializedCandidate {
  const kit = recipe.equipment.filter(Boolean);
  const panCount = kit.filter((item) =>
    ["pan", "pot", "bowl", "tray", "hob"].includes(item),
  ).length;

  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    steps: recipe.steps,
    timeMinutes: recipe.timeMinutes,
    difficulty: recipe.difficulty,
    effort:
      recipe.difficulty === "easy"
        ? "Low effort"
        : recipe.difficulty === "medium"
          ? "Some effort"
          : "More effort",
    equipment: recipe.equipment,
    kitLabel:
      panCount <= 1
        ? "1 pan"
        : panCount === 2
          ? "2 pots"
          : kit.slice(0, 2).join(" · ") || "basic kit",
    estimatedCost: recipe.estimatedCost,
    tags: recipe.tags,
    score: 0,
    availabilityPct: 0,
    availableRequired: [],
    missingRequired: [],
    availableOptional: [],
    canMakeNow: false,
    almostThere: false,
    usesExpiring: false,
    generationSource: recipe.generationSource,
  };
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = items[i]!;
    items[i] = items[j]!;
    items[j] = current;
  }
  return items;
}

/** Random recipes from the corpus — ignores kitchen inventory. */
export async function getRandomRecipes(
  count = 5,
  /** Client nonce so each shuffle is a distinct server-action call. */
  _nonce = 0,
): Promise<SerializedCandidate[]> {
  void _nonce;
  const limit = Math.max(1, Math.min(Math.floor(count) || 5, 12));
  const graph = await loadFoodGraph();
  if (graph.recipes.length === 0) return [];

  const picked = shuffleInPlace([...graph.recipes]).slice(0, limit);
  return picked.map(serializeBrowseRecipe);
}

export async function getRecipeDetail(recipeId: string) {
  const kitchenRow = await getOrCreateKitchen();
  const graph = await loadFoodGraph();
  const recipe = graph.recipes.find((item) => item.id === recipeId);
  if (!recipe) return null;

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

  const candidate = scoreRecipe(graph, recipe, kitchen);
  const ingredients = await prisma.ingredient.findMany({
    where: { slug: { in: candidate.missingRequired } },
  });
  const missingWithIds = candidate.missingRequired.map((slug) => ({
    slug,
    name: slug.replaceAll("-", " "),
    ingredientId: ingredients.find((item) => item.slug === slug)?.id ?? "",
  }));

  return {
    kitchenName: kitchenRow.name,
    inventoryCount: kitchenRow.items.length,
    recipe: serializeCandidate(candidate),
    missingWithIds,
  };
}

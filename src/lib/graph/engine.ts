import type {
  DerivedComponent,
  GraphComponent,
  GraphIngredient,
  GraphRecipe,
  GraphTransformation,
  KitchenState,
} from "@/lib/types";

export interface FoodGraph {
  ingredients: Map<string, GraphIngredient>;
  components: Map<string, GraphComponent>;
  transformations: GraphTransformation[];
  recipes: GraphRecipe[];
}

export function createKitchenState(
  ingredientSlugs: string[],
  options?: {
    equipment?: string[];
    expiringSlugs?: string[];
    stapleSlugs?: string[];
  },
): KitchenState {
  return {
    ingredientSlugs: new Set(ingredientSlugs),
    equipment: new Set(options?.equipment ?? []),
    expiringSlugs: new Set(options?.expiringSlugs ?? []),
    stapleSlugs: new Set(options?.stapleSlugs ?? []),
  };
}

function requiredInputsAvailable(
  transformation: GraphTransformation,
  availableIngredients: Set<string>,
  availableComponents: Set<string>,
): boolean {
  const required = transformation.inputs.filter((input) => !input.optional);
  if (required.length === 0) return false;

  return required.every((input) => {
    if (input.ingredientSlug) {
      return availableIngredients.has(input.ingredientSlug);
    }
    if (input.componentSlug) {
      return availableComponents.has(input.componentSlug);
    }
    return false;
  });
}

function hasFatAlternative(transformation: GraphTransformation, availableIngredients: Set<string>): boolean {
  const fatInputs = transformation.inputs.filter((input) => input.role === "fat" && !input.optional);
  if (fatInputs.length <= 1) return true;
  return fatInputs.some((input) => input.ingredientSlug && availableIngredients.has(input.ingredientSlug));
}

/**
 * Some recipes treat butter/oil as interchangeable fats.
 * Required inputs with role "fat" are satisfied if any fat alternative is present.
 */
function requiredInputsAvailableWithFatFlex(
  transformation: GraphTransformation,
  availableIngredients: Set<string>,
  availableComponents: Set<string>,
): boolean {
  const required = transformation.inputs.filter((input) => !input.optional);
  if (required.length === 0) return false;

  const nonFatRequired = required.filter((input) => input.role !== "fat");
  const fatRequired = required.filter((input) => input.role === "fat");

  const nonFatOk = nonFatRequired.every((input) => {
    if (input.ingredientSlug) return availableIngredients.has(input.ingredientSlug);
    if (input.componentSlug) return availableComponents.has(input.componentSlug);
    return false;
  });

  if (!nonFatOk) return false;
  if (fatRequired.length === 0) return true;
  return fatRequired.some(
    (input) => input.ingredientSlug && availableIngredients.has(input.ingredientSlug),
  );
}

export function deriveAvailableComponents(
  graph: FoodGraph,
  kitchen: KitchenState,
  maxDepth = 4,
): DerivedComponent[] {
  const availableIngredients = new Set(kitchen.ingredientSlugs);
  const availableComponents = new Set<string>();
  const derived: DerivedComponent[] = [];

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    let grew = false;
    for (const transformation of graph.transformations) {
      if (
        !requiredInputsAvailableWithFatFlex(
          transformation,
          availableIngredients,
          availableComponents,
        )
      ) {
        continue;
      }

      // Equipment check only when kitchen declares equipment.
      if (kitchen.equipment.size > 0) {
        const missingEquipment = transformation.equipment.filter(
          (item) => item.length > 0 && !kitchen.equipment.has(item),
        );
        if (missingEquipment.length > 0) continue;
      }

      for (const outputSlug of transformation.outputSlugs) {
        if (availableComponents.has(outputSlug)) continue;
        availableComponents.add(outputSlug);
        derived.push({
          componentSlug: outputSlug,
          viaTransformation: transformation.slug,
          depth,
        });
        grew = true;
      }
    }
    if (!grew) break;
  }

  return derived;
}

export function getIngredient(graph: FoodGraph, slug: string): GraphIngredient | undefined {
  return graph.ingredients.get(slug);
}

export function transformationIsValid(graph: FoodGraph, slug: string): boolean {
  const transformation = graph.transformations.find((item) => item.slug === slug);
  if (!transformation) return false;
  if (transformation.outputSlugs.length === 0) return false;

  for (const input of transformation.inputs) {
    if (input.ingredientSlug && !graph.ingredients.has(input.ingredientSlug)) {
      return false;
    }
    if (input.componentSlug && !graph.components.has(input.componentSlug)) {
      return false;
    }
  }

  return transformation.outputSlugs.every((output) => graph.components.has(output));
}

export function canCompose(
  graph: FoodGraph,
  kitchen: KitchenState,
  targetComponentSlug: string,
): boolean {
  const derived = deriveAvailableComponents(graph, kitchen);
  return derived.some((item) => item.componentSlug === targetComponentSlug);
}

export function rejectUnavailableMandatory(
  graph: FoodGraph,
  recipe: GraphRecipe,
  kitchen: KitchenState,
): string[] {
  const missing: string[] = [];
  for (const item of recipe.ingredients) {
    if (item.optional) continue;
    if (!graph.ingredients.has(item.ingredientSlug)) {
      missing.push(item.ingredientSlug);
      continue;
    }
    if (!kitchen.ingredientSlugs.has(item.ingredientSlug)) {
      // Special case: rice OR microwave-rice style alternatives handled by callers via optional pairs.
      missing.push(item.ingredientSlug);
    }
  }
  return missing;
}

/** Salt/pepper never block "can make"; oil/butter count as interchangeable fat. */
const PANTRY_IGNORE = new Set(["salt", "pepper"]);
const FAT_SLUGS = new Set(["oil", "butter"]);

function kitchenHasIngredient(kitchen: KitchenState, slug: string): boolean {
  if (kitchen.ingredientSlugs.has(slug)) return true;
  if (FAT_SLUGS.has(slug)) {
    return [...FAT_SLUGS].some((fat) => kitchen.ingredientSlugs.has(fat));
  }
  return false;
}

export function recipeIngredientCoverage(
  recipe: GraphRecipe,
  kitchen: KitchenState,
): {
  availableRequired: string[];
  missingRequired: string[];
  availableOptional: string[];
  missingOptional: string[];
  availabilityPct: number;
} {
  const required = recipe.ingredients.filter(
    (item) => !item.optional && !PANTRY_IGNORE.has(item.ingredientSlug),
  );
  const optional = recipe.ingredients.filter((item) => item.optional);

  // Handle rice alternatives: if recipe has both rice and microwave-rice as optional,
  // treat "has either" as satisfying a carb base when at least one is listed optional.
  const availableRequired = required
    .filter((item) => kitchenHasIngredient(kitchen, item.ingredientSlug))
    .map((item) => item.ingredientSlug);

  let missingRequired = required
    .filter((item) => !kitchenHasIngredient(kitchen, item.ingredientSlug))
    .map((item) => item.ingredientSlug);

  const hasRiceFamily =
    kitchen.ingredientSlugs.has("rice") || kitchen.ingredientSlugs.has("microwave-rice");
  if (hasRiceFamily) {
    missingRequired = missingRequired.filter(
      (slug) => slug !== "rice" && slug !== "microwave-rice",
    );
  }

  // If all required ingredients are fat alternatives listed separately, keep standard logic.
  const availableOptional = optional
    .filter((item) => kitchenHasIngredient(kitchen, item.ingredientSlug))
    .map((item) => item.ingredientSlug);
  const missingOptional = optional
    .filter((item) => !kitchenHasIngredient(kitchen, item.ingredientSlug))
    .map((item) => item.ingredientSlug);

  // Recipes that list rice/microwave-rice only as optional need a soft carb check.
  const softCarbRequired =
    required.length === 0 &&
    optional.some((item) => item.ingredientSlug === "rice" || item.ingredientSlug === "microwave-rice");

  let effectiveRequiredCount = required.length;
  let effectiveAvailableCount = availableRequired.length;

  if (softCarbRequired) {
    effectiveRequiredCount += 1;
    if (hasRiceFamily) effectiveAvailableCount += 1;
  }

  // Egg fried rice style: required eggs, optional rice types — ensure rice presence for can-make.
  const needsRice =
    recipe.ingredients.some((i) => i.ingredientSlug === "rice" || i.ingredientSlug === "microwave-rice") &&
    !required.some((i) => i.ingredientSlug === "rice" || i.ingredientSlug === "microwave-rice");
  if (needsRice && !hasRiceFamily) {
    missingRequired = [...missingRequired, "rice"];
    effectiveRequiredCount += 1;
  } else if (needsRice && hasRiceFamily) {
    effectiveRequiredCount += 1;
    effectiveAvailableCount += 1;
  }

  const availabilityPct =
    effectiveRequiredCount === 0
      ? 1
      : effectiveAvailableCount / Math.max(effectiveRequiredCount, 1);

  return {
    availableRequired:
      needsRice && hasRiceFamily
        ? Array.from(new Set([...availableRequired, kitchen.ingredientSlugs.has("microwave-rice") ? "microwave-rice" : "rice"]))
        : availableRequired,
    missingRequired: Array.from(new Set(missingRequired)),
    availableOptional,
    missingOptional,
    availabilityPct,
  };
}

export function listPossibleTransformations(
  graph: FoodGraph,
  kitchen: KitchenState,
): GraphTransformation[] {
  const components = new Set(deriveAvailableComponents(graph, kitchen).map((d) => d.componentSlug));
  return graph.transformations.filter((transformation) =>
    requiredInputsAvailableWithFatFlex(transformation, kitchen.ingredientSlugs, components) &&
    hasFatAlternative(transformation, kitchen.ingredientSlugs),
  );
}

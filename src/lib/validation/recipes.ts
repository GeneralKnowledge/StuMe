import type { FoodGraph } from "@/lib/graph/engine";
import type { GeneratedRecipeDraft, GraphRecipe } from "@/lib/types";
import { buildRecipeSignature, draftToSignature, isDuplicateOfExisting } from "@/lib/validation/signature";

export interface ValidationResult {
  ok: boolean;
  reasons: string[];
  signature: string;
}

const SPECIALIST = new Set([
  "saffron",
  "truffle",
  "gochujang",
  "mirin",
  "fish-sauce",
  "paneer",
  "halloumi",
  "coconut-milk",
  "lemongrass",
]);

export function validateRecipeDraft(
  graph: FoodGraph,
  draft: GeneratedRecipeDraft,
  existing: GraphRecipe[],
  rejectedSignatures: Set<string>,
): ValidationResult {
  const reasons: string[] = [];
  const signature = draftToSignature(draft);

  if (!draft.title?.trim()) reasons.push("Missing title");
  if (!draft.steps?.length) reasons.push("Missing steps");
  if (draft.timeMinutes > 30) reasons.push("Unnecessarily long for student cooking");
  if (draft.difficulty === "hard") reasons.push("Too complicated");
  if (draft.ingredients.length > 10) reasons.push("Too many ingredients");

  for (const item of draft.ingredients) {
    if (!graph.ingredients.has(item.ingredientSlug)) {
      reasons.push(`Unknown ingredient: ${item.ingredientSlug}`);
    }
    if (SPECIALIST.has(item.ingredientSlug)) {
      reasons.push(`Specialist ingredient without justification: ${item.ingredientSlug}`);
    }
  }

  for (const componentSlug of draft.componentSlugs) {
    if (!graph.components.has(componentSlug)) {
      reasons.push(`Unknown component: ${componentSlug}`);
    }
  }

  for (const pathItem of draft.graphPath) {
    const exists = graph.transformations.some((item) => item.slug === pathItem);
    if (!exists) {
      reasons.push(`Unknown transformation in graph path: ${pathItem}`);
    }
  }

  // Mandatory ingredients must exist in graph (already checked) and recipe must not invent outputs.
  const mandatory = draft.ingredients.filter((item) => !item.optional);
  if (mandatory.length === 0) {
    reasons.push("No mandatory ingredients");
  }

  if (rejectedSignatures.has(signature)) {
    reasons.push("Previously rejected signature");
  }

  const asRecipe = {
    signature,
    title: draft.title,
    ingredients: draft.ingredients,
    tags: draft.tags,
    graphPath: draft.graphPath,
    equipment: draft.equipment,
  };

  if (isDuplicateOfExisting(asRecipe, existing)) {
    reasons.push("Duplicate or trivial variation of existing recipe");
  }

  // Reject impossible fat-free pan fries that claim butter/oil outputs without either.
  if (
    draft.graphPath.some((slug) => slug.includes("fry") || slug.includes("scramble")) &&
    !draft.ingredients.some((item) => ["butter", "oil"].includes(item.ingredientSlug))
  ) {
    reasons.push("Frying/scrambling without a fat source");
  }

  return { ok: reasons.length === 0, reasons, signature };
}

export function toGraphRecipe(
  draft: GeneratedRecipeDraft,
  source: GraphRecipe["generationSource"],
  id?: string,
): GraphRecipe {
  const signature = buildRecipeSignature({
    title: draft.title,
    ingredients: draft.ingredients,
    graphPath: draft.graphPath,
    tags: draft.tags,
    equipment: draft.equipment,
    componentSlugs: draft.componentSlugs,
  });

  return {
    id: id ?? `tmp-${signature}`,
    title: draft.title,
    description: draft.description,
    steps: draft.steps,
    timeMinutes: draft.timeMinutes,
    difficulty: draft.difficulty,
    equipment: draft.equipment,
    estimatedCost: draft.estimatedCost,
    tags: draft.tags,
    graphPath: draft.graphPath,
    generationSource: source,
    signature,
    popularity: 0,
    useCount: 0,
    noveltyScore: 1,
    ingredients: draft.ingredients,
    componentSlugs: draft.componentSlugs,
    createdAt: new Date(),
  };
}

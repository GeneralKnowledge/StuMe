import type { GeneratedRecipeDraft, GraphRecipe, GraphRecipeIngredient } from "@/lib/types";

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function coreIngredientSlugs(ingredients: GraphRecipeIngredient[]): string[] {
  return ingredients
    .filter((item) => !item.optional)
    .map((item) => item.ingredientSlug)
    .sort();
}

function inferMethod(tags: string[], graphPath: string[], equipment: string[]): string {
  const joined = [...tags, ...graphPath, ...equipment].map(normalizeToken).join(" ");
  if (joined.includes("microwave")) return "microwave";
  if (joined.includes("toast") || joined.includes("grill")) return "toast-grill";
  if (joined.includes("fry") || joined.includes("pan")) return "pan-fry";
  if (joined.includes("boil") || joined.includes("pasta") || joined.includes("noodle")) return "boil";
  if (joined.includes("oven") || joined.includes("roast") || joined.includes("chip")) return "oven";
  if (joined.includes("assemble") || joined.includes("no-cook") || joined.includes("sandwich")) {
    return "assemble";
  }
  return "mixed";
}

function inferStyle(tags: string[], title: string): string {
  const haystack = normalizeToken([...tags, title].join(" "));
  const styles = [
    "fried-rice",
    "omelette",
    "toastie",
    "curry",
    "pasta",
    "noodles",
    "chips",
    "beans",
    "sandwich",
    "bowl",
    "scramble",
  ];
  for (const style of styles) {
    if (haystack.includes(style.replace("-", " ")) || haystack.includes(style)) {
      return style;
    }
  }
  if (haystack.includes("rice")) return "rice";
  if (haystack.includes("toast")) return "toast";
  if (haystack.includes("egg")) return "egg";
  return "general";
}

export function buildRecipeSignature(input: {
  title: string;
  ingredients: GraphRecipeIngredient[];
  graphPath: string[];
  tags: string[];
  equipment: string[];
  componentSlugs?: string[];
}): string {
  const cores = coreIngredientSlugs(input.ingredients);
  const method = inferMethod(input.tags, input.graphPath, input.equipment);
  const style = inferStyle(input.tags, input.title);
  const path = [...input.graphPath].sort().join("+") || "direct";
  const components = [...(input.componentSlugs ?? [])].sort().join("+") || "none";
  return [
    `cores:${cores.join(",")}`,
    `method:${method}`,
    `style:${style}`,
    `path:${path}`,
    `components:${components}`,
  ].join("|");
}

export function signaturesAreNearDuplicates(a: string, b: string): boolean {
  if (a === b) return true;
  const partsA = Object.fromEntries(a.split("|").map((part) => part.split(":")));
  const partsB = Object.fromEntries(b.split("|").map((part) => part.split(":")));
  return (
    partsA.cores === partsB.cores &&
    partsA.method === partsB.method &&
    partsA.style === partsB.style
  );
}

export function isDuplicateOfExisting(
  candidate: Pick<GraphRecipe, "signature" | "title" | "ingredients" | "tags" | "graphPath" | "equipment">,
  existing: Array<Pick<GraphRecipe, "signature" | "title">>,
): boolean {
  const normalizedTitle = normalizeToken(candidate.title);
  for (const recipe of existing) {
    if (signaturesAreNearDuplicates(candidate.signature, recipe.signature)) {
      return true;
    }
    if (normalizeToken(recipe.title) === normalizedTitle) {
      return true;
    }
  }
  return false;
}

export function draftToSignature(draft: GeneratedRecipeDraft): string {
  return buildRecipeSignature({
    title: draft.title,
    ingredients: draft.ingredients,
    graphPath: draft.graphPath,
    tags: draft.tags,
    equipment: draft.equipment,
    componentSlugs: draft.componentSlugs,
  });
}

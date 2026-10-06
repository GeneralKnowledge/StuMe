/** Pantry items we assume unless the user turns them off in Kitchen. */
export const ASSUMED_STAPLE_SLUGS = ["salt", "pepper", "oil"] as const;

/** Default student kit — used on create / onboarding. */
export const BASIC_STUDENT_EQUIPMENT = [
  "pan",
  "hob",
  "microwave",
  "toaster",
  "kettle",
  "bowl",
] as const;

/** Optional extras users can enable. */
export const EXTRA_EQUIPMENT = ["oven", "tray", "grill", "air-fryer"] as const;

/** One-tap popular adds for empty kitchens / onboarding. */
export const POPULAR_INGREDIENT_SLUGS = [
  "eggs",
  "rice",
  "pasta",
  "cheese",
  "milk",
  "onions",
  "butter",
  "bread",
  "mushrooms",
  "chopped-tomatoes",
  "baked-beans",
  "frozen-peas",
] as const;

export type AssumedStapleSlug = (typeof ASSUMED_STAPLE_SLUGS)[number];

export type CostCategory = "very_cheap" | "cheap" | "moderate" | "expensive";
export type Difficulty = "easy" | "medium" | "hard";
export type Storage = "fridge" | "freezer" | "cupboard";
export type GenerationSource = "seed" | "graph" | "llm" | "manual" | "corpus";

export interface ScoreWeights {
  availabilityPct: number;
  availableCount: number;
  cost: number;
  time: number;
  difficulty: number;
  equipment: number;
  washingUp: number;
  foodWaste: number;
  variety: number;
  exposure: number;
  nutrition: number;
}

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  availabilityPct: 40,
  availableCount: 8,
  cost: 10,
  time: 10,
  difficulty: 8,
  equipment: 6,
  washingUp: 8,
  foodWaste: 12,
  variety: 5,
  exposure: 3,
  nutrition: 4,
};

export interface GraphIngredient {
  id: string;
  slug: string;
  name: string;
  category: string;
  costCategory: CostCategory;
  shelfLifeDays: number;
  defaultStorage: Storage;
  versatility: number;
  wasteRisk: number;
  tags: string[];
  isEssential: boolean;
}

export interface GraphComponent {
  id: string;
  slug: string;
  name: string;
  tags: string[];
  difficulty: Difficulty;
  timeMinutes: number;
  equipment: string[];
}

export interface GraphTransformationInput {
  ingredientSlug?: string;
  componentSlug?: string;
  optional: boolean;
  role?: string;
}

export interface GraphTransformation {
  id: string;
  slug: string;
  name: string;
  method: string;
  timeMinutes: number;
  difficulty: Difficulty;
  equipment: string[];
  tags: string[];
  inputs: GraphTransformationInput[];
  outputSlugs: string[];
}

export interface GraphRecipeIngredient {
  ingredientSlug: string;
  quantity?: string;
  optional: boolean;
}

export interface GraphRecipe {
  id: string;
  title: string;
  description: string;
  steps: string[];
  timeMinutes: number;
  difficulty: Difficulty;
  equipment: string[];
  estimatedCost: CostCategory;
  tags: string[];
  graphPath: string[];
  generationSource: GenerationSource;
  signature: string;
  popularity: number;
  useCount: number;
  noveltyScore: number;
  ingredients: GraphRecipeIngredient[];
  componentSlugs: string[];
  createdAt?: Date;
}

export interface KitchenState {
  ingredientSlugs: Set<string>;
  equipment: Set<string>;
  expiringSlugs: Set<string>;
  stapleSlugs: Set<string>;
}

export interface DerivedComponent {
  componentSlug: string;
  viaTransformation: string;
  depth: number;
}

export interface RecipeCandidate {
  recipe: GraphRecipe;
  availableRequired: string[];
  missingRequired: string[];
  availableOptional: string[];
  missingOptional: string[];
  availabilityPct: number;
  score: number;
  scoreBreakdown: Record<string, number>;
  canMakeNow: boolean;
  almostThere: boolean;
  usesExpiring: boolean;
  derivedComponents: string[];
}

export interface ShoppingUnlock {
  ingredientSlug: string;
  ingredientName: string;
  costCategory: CostCategory;
  mealUnlockValue: number;
  mealsImproved: number;
  /** Recipes you can already make that get better if you add this (optional upgrade). */
  mealsFanciedUp: number;
  shelfLifeDays: number;
  versatility: number;
  wasteRisk: number;
  score: number;
  /** Low-effort buy: cheap, long life, versatile, low waste. */
  lowEffortScore: number;
  /** Unlock + fancy-up + low-effort composite for “super foods”. */
  superFoodScore: number;
  roles: Array<"unlock" | "fancy_up">;
  isSuperFood: boolean;
  unlockedRecipeTitles: string[];
  improvedRecipeTitles: string[];
  fanciedUpRecipeTitles: string[];
}

export interface GenerationConstraints {
  maxMinutes: number;
  difficulty: Difficulty;
  maxMissingIngredients: number;
  batchSize: number;
}

export interface GeneratedRecipeDraft {
  title: string;
  description: string;
  steps: string[];
  timeMinutes: number;
  difficulty: Difficulty;
  equipment: string[];
  estimatedCost: CostCategory;
  tags: string[];
  ingredients: GraphRecipeIngredient[];
  componentSlugs: string[];
  graphPath: string[];
}

export interface RecipeGeneratorRequest {
  available_ingredients: string[];
  candidate_components: string[];
  existing_recipes: string[];
  constraints: {
    max_minutes: number;
    difficulty: string;
    max_missing_ingredients: number;
    batch_size: number;
  };
}

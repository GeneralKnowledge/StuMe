export type StudentLevel = "practical" | "student" | "struggle";
export type StruggleBand = 1 | 2 | 3 | 4;
export type ValidationStatus =
  | "fully_represented"
  | "needs_ingredients"
  | "needs_transformations"
  | "unrepresentable";

export interface RawRecipeNlgRow {
  id: string;
  title: string;
  ingredients: string[];
  directions: string[];
  link: string;
  source: string;
  ner: string[];
}

export interface NormalizedIngredient {
  originalText: string;
  normalizedName: string;
  stumeSlug: string | null;
  confidence: number;
  notes: string[];
}

export interface ScoreComponents {
  ingredientReward: number;
  ingredientPenalty: number;
  complexityReward: number;
  complexityPenalty: number;
  equipmentReward: number;
  equipmentPenalty: number;
  total: number;
}

export interface TransformationRecord {
  kind:
    | "ingredient_substitute"
    | "ingredient_remove"
    | "equipment_simplify"
    | "step_collapse"
    | "title_rewrite"
    | "level_variant";
  from: string;
  to: string;
  reason: string;
}

export interface StudentCandidate {
  id: string;
  title: string;
  description: string;
  steps: string[];
  ingredients: Array<{
    originalText: string;
    normalizedName: string;
    stumeSlug: string | null;
    optional: boolean;
  }>;
  equipment: string[];
  estimatedMinutes: number;
  studentLevel: StudentLevel;
  struggleBand: StruggleBand;
  score: ScoreComponents;
  transformationsApplied: TransformationRecord[];
  provenance: {
    source_dataset: "RecipeNLG";
    source_recipe_id: string;
    source_title: string;
    source_url: string;
    source_label: string;
    transformation_version: string;
    original_ingredients: string[];
    original_directions: string[];
    transformed_ingredients: string[];
    student_level: StudentLevel;
    validation_status: ValidationStatus;
    quality_score: number;
  };
  validationStatus: ValidationStatus;
  missingStumeSlugs: string[];
  familyKey: string;
  acceptedReason: string;
}

export interface InspectReport {
  totalRecipes: number;
  bySource: Record<string, number>;
  byIngredientCount: Record<string, number>;
  byInstructionCount: Record<string, number>;
  mostCommonIngredients: Array<{ name: string; count: number }>;
  rareIngredients: Array<{ name: string; count: number }>;
  mostCommonCombinations: Array<{ combo: string; count: number }>;
  commonTitleFamilies: Array<{ family: string; count: number }>;
  nearDuplicateEstimate: number;
  missingIngredients: number;
  missingInstructions: number;
  suspiciousIngredientStrings: string[];
  suspiciousQuantities: string[];
  extremelyLongRecipes: number;
  extremelyShortBrokenRecipes: number;
}

export interface PipelineReport {
  inputPath: string;
  scanned: number;
  afterBasicValidity: number;
  afterStudentSuitability: number;
  afterNormalization: number;
  afterCorruption: number;
  afterDeduplication: number;
  validStudentCandidates: number;
  byStruggle: Record<StruggleBand, number>;
  byValidation: Record<ValidationStatus, number>;
  recipesRequiringNewIngredients: number;
  topMissingIngredients: Array<{ slugOrName: string; recipeCoverage: number }>;
  topPotentialShoppingUnlocks: Array<{ slug: string; unlockEstimate: number }>;
  topSuperFoods: Array<{
    slug: string;
    unlockEstimate: number;
    fancyUpEstimate: number;
    lowEffortScore: number;
    superFoodScore: number;
    roles: Array<"unlock" | "fancy_up">;
  }>;
  transformationVersion: string;
}

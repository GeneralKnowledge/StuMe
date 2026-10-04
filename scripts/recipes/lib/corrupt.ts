import { GARNISH_PATTERNS, TRANSFORMATION_VERSION } from "./config";
import { collapseSteps, simplifyEquipmentInSteps } from "./equipment";
import { normalizeIngredientText, normalizeRecipeIngredients } from "./normalize";
import { estimateRecipeMinutes, scoreStudentSuitability } from "./suitability";
import { classifyStruggle } from "./struggle";
import type {
  NormalizedIngredient,
  RawRecipeNlgRow,
  StudentCandidate,
  StudentLevel,
  TransformationRecord,
} from "./types";

interface SubstitutionRule {
  fromConcepts: string[];
  toConcept: string;
  toSlug: string;
  reason: string;
  levels: StudentLevel[];
}

const SUBSTITUTIONS: SubstitutionRule[] = [
  {
    fromConcepts: ["parmesan"],
    toConcept: "cheese",
    toSlug: "cheese",
    reason: "Parmesan/pecorino → cheddar/cheese",
    levels: ["practical", "student", "struggle"],
  },
  {
    fromConcepts: ["shallot"],
    toConcept: "onion",
    toSlug: "onions",
    reason: "Shallots → onion",
    levels: ["practical", "student", "struggle"],
  },
  {
    fromConcepts: ["spring onion"],
    toConcept: "onion",
    toSlug: "onions",
    reason: "Spring onions → onion for struggle/student variants",
    levels: ["student", "struggle"],
  },
  {
    fromConcepts: ["garlic"],
    toConcept: "garlic powder",
    toSlug: "garlic-powder",
    reason: "Fresh garlic → garlic granules/powder",
    levels: ["student", "struggle"],
  },
  {
    fromConcepts: ["tomato"],
    toConcept: "tinned tomato",
    toSlug: "chopped-tomatoes",
    reason: "Fresh tomatoes → tinned tomatoes",
    levels: ["student", "struggle"],
  },
  {
    fromConcepts: ["spinach"],
    toConcept: "frozen spinach",
    toSlug: "spinach",
    reason: "Fresh spinach → frozen spinach",
    levels: ["student", "struggle"],
  },
  {
    fromConcepts: ["cream"],
    toConcept: "milk",
    toSlug: "milk",
    reason: "Cream → milk (+ cheese if present)",
    levels: ["practical", "student", "struggle"],
  },
  {
    fromConcepts: ["stock"],
    toConcept: "stock cube",
    toSlug: "stock-cubes",
    reason: "Fresh/carton stock → stock cube",
    levels: ["practical", "student", "struggle"],
  },
  {
    fromConcepts: ["chicken breast"],
    toConcept: "chicken",
    toSlug: "cooked-chicken",
    reason: "Chicken breast → common chicken pieces / cooked chicken",
    levels: ["student", "struggle"],
  },
  {
    fromConcepts: ["fresh chilli"],
    toConcept: "chilli flakes",
    toSlug: "hot-sauce",
    reason: "Fresh chilli → chilli flakes / hot sauce",
    levels: ["practical", "student", "struggle"],
  },
  {
    fromConcepts: ["fresh herbs"],
    toConcept: "dried herbs",
    toSlug: "paprika",
    reason: "Fresh herbs → dried herbs / skip garnish",
    levels: ["practical", "student", "struggle"],
  },
];

function isGarnish(text: string): boolean {
  return GARNISH_PATTERNS.some((pattern) => pattern.test(text));
}

function applyIngredientCorruption(
  ingredients: NormalizedIngredient[],
  level: StudentLevel,
): { ingredients: NormalizedIngredient[]; transformations: TransformationRecord[] } {
  const transformations: TransformationRecord[] = [];
  const next: NormalizedIngredient[] = [];
  let addedCheeseForCream = false;

  for (const item of ingredients) {
    if (
      !item.normalizedName ||
      item.normalizedName === "null" ||
      item.normalizedName === "undefined" ||
      /^\?+$/.test(item.normalizedName)
    ) {
      transformations.push({
        kind: "ingredient_remove",
        from: item.originalText,
        to: "",
        reason: "Removed empty/broken ingredient string",
      });
      continue;
    }

    if (isGarnish(item.originalText) || isGarnish(item.normalizedName)) {
      transformations.push({
        kind: "ingredient_remove",
        from: item.originalText,
        to: "",
        reason: "Removed optional garnish",
      });
      continue;
    }

    if (item.normalizedName === "saffron" || item.normalizedName === "truffle" || item.normalizedName === "pine nuts" || item.normalizedName === "prosciutto" || item.normalizedName === "mascarpone") {
      transformations.push({
        kind: "ingredient_remove",
        from: item.originalText,
        to: "",
        reason: "Removed luxury/specialist ingredient unsuitable for student corruption",
      });
      continue;
    }

    let current = item;
    for (const rule of SUBSTITUTIONS) {
      if (!rule.levels.includes(level)) continue;
      if (!rule.fromConcepts.includes(current.normalizedName)) continue;
      transformations.push({
        kind: "ingredient_substitute",
        from: current.normalizedName,
        to: rule.toConcept,
        reason: rule.reason,
      });
      current = {
        originalText: current.originalText,
        normalizedName: rule.toConcept,
        stumeSlug: rule.toSlug,
        confidence: 0.9,
        notes: [...current.notes, `substituted→${rule.toConcept}`],
      };

      if (rule.fromConcepts.includes("cream") && !addedCheeseForCream) {
        const hasCheese = ingredients.some((ing) =>
          ["cheese", "parmesan", "cream cheese"].includes(ing.normalizedName),
        );
        if (!hasCheese && (level === "student" || level === "struggle")) {
          next.push({
            originalText: "cheese (for creaminess)",
            normalizedName: "cheese",
            stumeSlug: "cheese",
            confidence: 0.7,
            notes: ["added to replace cream body"],
          });
          transformations.push({
            kind: "ingredient_substitute",
            from: "cream body",
            to: "cheese",
            reason: "Add cheese to approximate creaminess",
          });
          addedCheeseForCream = true;
        }
      }
      break;
    }

    // Dedup by slug/concept
    const exists = next.some(
      (ing) =>
        (ing.stumeSlug && ing.stumeSlug === current.stumeSlug) ||
        ing.normalizedName === current.normalizedName,
    );
    if (!exists) next.push(current);
  }

  // Struggle: keep only the most useful 4 ingredients (+ salt/pepper ignored)
  if (level === "struggle" && next.length > 4) {
    const priority = [...next].sort((a, b) => {
      const score = (item: NormalizedIngredient) => {
        if (["rice", "pasta", "noodles", "instant noodles", "bread", "potato", "egg", "cheese", "onion", "tinned tomato", "baked beans", "chicken", "tuna"].includes(item.normalizedName)) {
          return 2;
        }
        if (item.stumeSlug) return 1;
        return 0;
      };
      return score(b) - score(a);
    });
    const kept = priority.slice(0, 4);
    for (const dropped of priority.slice(4)) {
      transformations.push({
        kind: "ingredient_remove",
        from: dropped.normalizedName,
        to: "",
        reason: "Struggle trim to 2–4 core ingredients",
      });
    }
    return { ingredients: kept, transformations };
  }

  return { ingredients: next, transformations };
}

function studentTitle(original: string, level: StudentLevel, concepts: string[]): string {
  let title = original
    .replace(/\b(gourmet|authentic|restaurant[- ]style|fancy)\b/gi, "")
    .replace(/\b(creamy|silky|luxurious)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (level === "practical") {
    title = title.replace(/\bparmesan\b/gi, "cheesy").replace(/\bpecorino\b/gi, "cheesy");
  }
  if (level === "student") {
    if (!/student|quick|easy|lazy/i.test(title)) title = `Student ${title}`;
  }
  if (level === "struggle") {
    const core = concepts.slice(0, 3).join(" ");
    title = core ? `Broke ${core}` : `Broke ${title}`;
    title = title.replace(/\bBroke Broke\b/i, "Broke");
  }

  return title.replace(/\s+/g, " ").trim();
}

function rewriteStepsForIngredients(
  steps: string[],
  transformations: TransformationRecord[],
): string[] {
  let next = [...steps];
  // Phrase-level rewrites before concept tokens
  next = next.map((step) =>
    step
      .replace(/\b(heavy|double|whipping|single)\s+cream\b/gi, "milk")
      .replace(/\bchicken breasts?\b/gi, "chicken")
      .replace(/\bfresh spinach\b/gi, "frozen spinach")
      .replace(/\b(parmesan|pecorino)\b/gi, "cheese")
      .replace(/\bshallots?\b/gi, "onion")
      .replace(/\bgarnish with parsley\b/gi, "skip the garnish"),
  );
  for (const change of transformations) {
    if (change.kind !== "ingredient_substitute") continue;
    const from = new RegExp(`\\b${change.from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    next = next.map((step) => step.replace(from, change.to));
  }
  // Student tone: strip fancy verbs lightly
  next = next.map((step) =>
    step
      .replace(/\bheavy milk\b/gi, "milk")
      .replace(/\bemulsify\b/gi, "mix")
      .replace(/\bjulienne\b/gi, "slice")
      .replace(/\bdeglaze\b/gi, "add a splash of water and scrape")
      .replace(/\buntil al dente\b/gi, "until cooked"),
  );
  return next;
}

export function corruptRecipe(
  row: RawRecipeNlgRow,
  level: StudentLevel,
): StudentCandidate | null {
  const normalized = normalizeRecipeIngredients(row);
  if (normalized.length < 2) return null;

  const ingredientPass = applyIngredientCorruption(normalized, level);
  if (ingredientPass.ingredients.length < 2) return null;

  let steps = [...row.directions];
  steps = rewriteStepsForIngredients(steps, ingredientPass.transformations);
  const equipmentPass = simplifyEquipmentInSteps(steps);
  const collapsePass = collapseSteps(equipmentPass.steps);

  const transformations = [
    ...ingredientPass.transformations,
    ...equipmentPass.transformations,
    ...collapsePass.transformations,
    {
      kind: "level_variant" as const,
      from: "source",
      to: level,
      reason: `Generated ${level} student variant`,
    },
    {
      kind: "title_rewrite" as const,
      from: row.title,
      to: "",
      reason: "Student-friendly title",
    },
  ];

  const concepts = ingredientPass.ingredients.map((item) => item.normalizedName);
  const title = studentTitle(row.title, level, concepts);
  transformations[transformations.length - 1]!.to = title;

  const minutes = Math.min(
    estimateRecipeMinutes(row),
    level === "struggle" ? 15 : level === "student" ? 30 : 45,
  );
  const struggleBand = classifyStruggle({
    ingredientCount: ingredientPass.ingredients.length,
    minutes,
    equipment: equipmentPass.equipment,
    hasSpecialistEquipment: equipmentPass.equipment.some((item) =>
      ["food processor", "stand mixer", "sous vide", "pasta machine"].includes(item),
    ),
    specialistIngredientCount: ingredientPass.ingredients.filter((item) =>
      ["saffron", "truffle", "gochujang", "mirin", "lemongrass", "paneer", "halloumi"].includes(
        item.normalizedName,
      ),
    ).length,
  });

  // Re-score against corrupted shape
  const syntheticRow: RawRecipeNlgRow = {
    ...row,
    title,
    ingredients: ingredientPass.ingredients.map((item) => item.originalText || item.normalizedName),
    directions: collapsePass.steps,
    ner: concepts,
  };
  const score = scoreStudentSuitability(syntheticRow);
  // Nudge by level simplicity while keeping component transparency
  score.total = Number(
    (score.total + (level === "struggle" ? 4 : level === "student" ? 2 : 0)).toFixed(2),
  );

  const familyKey = [...concepts].sort().join("+");
  const acceptedReason = [
    `level=${level}`,
    `struggle=${struggleBand}`,
    `score=${score.total.toFixed(1)}`,
    `${ingredientPass.transformations.filter((t) => t.kind === "ingredient_substitute").length} substitutions`,
    `${ingredientPass.transformations.filter((t) => t.kind === "ingredient_remove").length} removals`,
  ].join("; ");

  return {
    id: `recipenlg-${row.id}-${level}`,
    title,
    description: `${level} student version of “${row.title}”.`,
    steps: collapsePass.steps,
    ingredients: ingredientPass.ingredients.map((item) => ({
      originalText: item.originalText,
      normalizedName: item.normalizedName,
      stumeSlug: item.stumeSlug,
      optional: ["salt", "black pepper", "dried herbs"].includes(item.normalizedName),
    })),
    equipment: equipmentPass.equipment.filter(
      (item) => !["food processor", "stand mixer", "sous vide"].includes(item),
    ),
    estimatedMinutes: minutes,
    studentLevel: level,
    struggleBand,
    score,
    transformationsApplied: transformations,
    provenance: {
      source_dataset: "RecipeNLG",
      source_recipe_id: row.id,
      source_title: row.title,
      source_url: row.link,
      source_label: row.source,
      transformation_version: TRANSFORMATION_VERSION,
      original_ingredients: row.ingredients,
      original_directions: row.directions,
      transformed_ingredients: ingredientPass.ingredients.map((item) => item.normalizedName),
      student_level: level,
      validation_status: "needs_ingredients",
      quality_score: score.total,
    },
    validationStatus: "needs_ingredients",
    missingStumeSlugs: ingredientPass.ingredients
      .filter((item) => !item.stumeSlug)
      .map((item) => item.normalizedName),
    familyKey,
    acceptedReason,
  };
}

export function maybeCorruptVariants(row: RawRecipeNlgRow): StudentCandidate[] {
  const suitability = scoreStudentSuitability(row);
  if (suitability.total < 12) return [];

  const variants: StudentCandidate[] = [];
  const practical = corruptRecipe(row, "practical");
  if (practical) variants.push(practical);

  // Only create student/struggle when substitutions or removals actually change something
  const student = corruptRecipe(row, "student");
  if (
    student &&
    student.transformationsApplied.some(
      (item) => item.kind === "ingredient_substitute" || item.kind === "ingredient_remove",
    )
  ) {
    variants.push(student);
  }

  const struggle = corruptRecipe(row, "struggle");
  if (
    struggle &&
    struggle.ingredients.length <= 4 &&
    struggle.estimatedMinutes <= 15 &&
    struggle.transformationsApplied.some(
      (item) => item.kind === "ingredient_substitute" || item.kind === "ingredient_remove",
    )
  ) {
    variants.push(struggle);
  }

  return variants;
}

export function normalizeOnlyPreview(row: RawRecipeNlgRow): NormalizedIngredient[] {
  return normalizeRecipeIngredients(row).map((item) => normalizeIngredientText(item.originalText));
}

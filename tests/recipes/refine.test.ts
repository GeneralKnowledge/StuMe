import { describe, expect, it } from "vitest";
import { crossLevelFamilyKey, refineCandidates } from "../../scripts/recipes/lib/refine";
import type { StudentCandidate } from "../../scripts/recipes/lib/types";

function mkCandidate(overrides: Partial<StudentCandidate> & Pick<StudentCandidate, "id" | "title">): StudentCandidate {
  return {
    id: overrides.id,
    title: overrides.title,
    description: "test",
    steps: overrides.steps ?? ["Cook it.", "Eat it."],
    ingredients: overrides.ingredients ?? [
      { originalText: "eggs", normalizedName: "egg", stumeSlug: "eggs", optional: false },
      { originalText: "rice", normalizedName: "rice", stumeSlug: "rice", optional: false },
      { originalText: "soy sauce", normalizedName: "soy sauce", stumeSlug: "soy-sauce", optional: false },
      { originalText: "oil", normalizedName: "oil", stumeSlug: "oil", optional: false },
    ],
    equipment: overrides.equipment ?? ["pan", "hob"],
    estimatedMinutes: overrides.estimatedMinutes ?? 12,
    studentLevel: overrides.studentLevel ?? "student",
    struggleBand: overrides.struggleBand ?? 2,
    score: overrides.score ?? {
      ingredientReward: 30,
      ingredientPenalty: 0,
      complexityReward: 10,
      complexityPenalty: 0,
      equipmentReward: 5,
      equipmentPenalty: 0,
      total: 45,
    },
    transformationsApplied: overrides.transformationsApplied ?? [],
    provenance: overrides.provenance ?? {
      source_dataset: "RecipeNLG",
      source_recipe_id: overrides.id,
      source_title: overrides.title,
      source_url: "",
      source_label: "Gathered",
      transformation_version: "student-corruptor-v1",
      original_ingredients: [],
      original_directions: [],
      transformed_ingredients: [],
      student_level: overrides.studentLevel ?? "student",
      validation_status: "fully_represented",
      quality_score: 45,
    },
    validationStatus: overrides.validationStatus ?? "fully_represented",
    missingStumeSlugs: [],
    familyKey: "",
    acceptedReason: "test",
  };
}

describe("refineCandidates", () => {
  it("keeps one best fully-represented family under the limit", () => {
    const candidates = [
      mkCandidate({ id: "a-practical", title: "Egg Fried Rice", studentLevel: "practical", score: { ...mkCandidate({ id: "x", title: "t" }).score, total: 40 }, provenance: { ...mkCandidate({ id: "x", title: "t" }).provenance, source_recipe_id: "src-1" } }),
      mkCandidate({ id: "a-student", title: "Student Egg Fried Rice", studentLevel: "student", score: { ...mkCandidate({ id: "x", title: "t" }).score, total: 50 }, provenance: { ...mkCandidate({ id: "x", title: "t" }).provenance, source_recipe_id: "src-1" } }),
      mkCandidate({ id: "b", title: "Beans on Toast", studentLevel: "struggle", struggleBand: 3, ingredients: [
        { originalText: "bread", normalizedName: "bread", stumeSlug: "bread", optional: false },
        { originalText: "baked beans", normalizedName: "baked beans", stumeSlug: "baked-beans", optional: false },
      ], provenance: { ...mkCandidate({ id: "x", title: "t" }).provenance, source_recipe_id: "src-2" } }),
      mkCandidate({ id: "needs", title: "Mystery Pie", validationStatus: "needs_ingredients", ingredients: [
        { originalText: "flour", normalizedName: "flour", stumeSlug: "flour", optional: false },
        { originalText: "saffron", normalizedName: "saffron", stumeSlug: null, optional: false },
      ] }),
    ];

    const { recipes, report } = refineCandidates(candidates, { limit: 10 });
    expect(report.afterFullyRepresented).toBe(3);
    expect(recipes.length).toBe(2);
    expect(recipes.some((item) => item.title.includes("Egg Fried Rice"))).toBe(true);
    expect(recipes.some((item) => item.title.includes("Beans"))).toBe(true);
    // Prefer higher-scoring student variant over practical for same source/family
    expect(recipes.find((item) => item.title.includes("Egg"))?.studentLevel).toBe("student");
  });

  it("builds stable cross-level family keys", () => {
    const a = mkCandidate({ id: "1", title: "Easy Egg Fried Rice", studentLevel: "practical" });
    const b = mkCandidate({ id: "2", title: "Student Egg Fried Rice", studentLevel: "student" });
    expect(crossLevelFamilyKey(a)).toBe(crossLevelFamilyKey(b));
  });
});

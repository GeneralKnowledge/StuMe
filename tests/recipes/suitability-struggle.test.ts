import { describe, expect, it } from "vitest";
import { classifyStruggle } from "../../scripts/recipes/lib/struggle";
import { scoreStudentSuitability } from "../../scripts/recipes/lib/suitability";
import { simplifyEquipmentInSteps } from "../../scripts/recipes/lib/equipment";
import type { RawRecipeNlgRow } from "../../scripts/recipes/lib/types";

describe("student scoring and struggle", () => {
  it("rewards simple student meals and exposes components", () => {
    const row: RawRecipeNlgRow = {
      id: "1",
      title: "Egg Rice",
      ingredients: ["rice", "eggs", "soy sauce", "oil"],
      directions: ["Fry eggs in a frying pan.", "Add rice and soy sauce.", "Cook 10 minutes."],
      link: "",
      source: "Gathered",
      ner: ["rice", "eggs", "soy sauce", "oil"],
    };
    const score = scoreStudentSuitability(row);
    expect(score.total).toBeGreaterThan(20);
    expect(score.ingredientReward).toBeGreaterThan(0);
    expect(score.complexityReward).toBeGreaterThan(0);
  });

  it("penalises specialist equipment and luxury ingredients", () => {
    const fancy: RawRecipeNlgRow = {
      id: "2",
      title: "Truffle Pasta",
      ingredients: ["spaghetti", "truffle oil", "mascarpone", "pine nuts", "parmesan"],
      directions: [
        "Blend sauce in a food processor.",
        "Boil pasta.",
        "Combine in another pan meanwhile.",
      ],
      link: "",
      source: "Recipes1M",
      ner: ["spaghetti", "truffle oil", "mascarpone", "pine nuts", "parmesan"],
    };
    const simple = scoreStudentSuitability({
      id: "3",
      title: "Beans Toast",
      ingredients: ["bread", "baked beans", "cheese"],
      directions: ["Toast bread.", "Heat beans in microwave.", "Add cheese."],
      link: "",
      source: "Gathered",
      ner: ["bread", "baked beans", "cheese"],
    });
    expect(scoreStudentSuitability(fancy).total).toBeLessThan(simple.total);
  });

  it("classifies struggle bands", () => {
    expect(
      classifyStruggle({
        ingredientCount: 3,
        minutes: 10,
        equipment: ["frying pan"],
        hasSpecialistEquipment: false,
        specialistIngredientCount: 0,
      }),
    ).toBe(1);
    expect(
      classifyStruggle({
        ingredientCount: 6,
        minutes: 25,
        equipment: ["frying pan", "bowl"],
        hasSpecialistEquipment: false,
        specialistIngredientCount: 0,
      }),
    ).toBe(2);
    expect(
      classifyStruggle({
        ingredientCount: 12,
        minutes: 50,
        equipment: ["food processor", "oven", "pan", "bowl", "tray"],
        hasSpecialistEquipment: true,
        specialistIngredientCount: 2,
      }),
    ).toBe(4);
  });

  it("simplifies equipment without inventing impossible methods blindly", () => {
    const result = simplifyEquipmentInSteps([
      "Blend sauce in a food processor.",
      "Fry onions in a wok.",
    ]);
    expect(result.steps.join(" ")).toMatch(/knife|frying pan/i);
    expect(result.transformations.length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import { corruptRecipe, maybeCorruptVariants } from "../../scripts/recipes/lib/corrupt";
import type { RawRecipeNlgRow } from "../../scripts/recipes/lib/types";

const creamyChicken: RawRecipeNlgRow = {
  id: "1",
  title: "Creamy Chicken Spinach Pasta",
  ingredients: [
    "spaghetti",
    "chicken breasts",
    "heavy cream",
    "fresh spinach",
    "parmesan",
    "garlic cloves",
    "olive oil",
  ],
  directions: [
    "Boil spaghetti until al dente.",
    "Fry chicken breasts in olive oil in a skillet.",
    "Add garlic and spinach.",
    "Pour in heavy cream and parmesan.",
    "Toss with pasta.",
  ],
  link: "example.com/1",
  source: "Gathered",
  ner: ["spaghetti", "chicken breasts", "heavy cream", "spinach", "parmesan", "garlic", "olive oil"],
};

describe("student corruptor", () => {
  it("applies safe substitutions deterministically", () => {
    const a = corruptRecipe(creamyChicken, "student");
    const b = corruptRecipe(creamyChicken, "student");
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).toEqual(b);
    const names = a!.ingredients.map((item) => item.normalizedName);
    expect(names).toContain("cheese");
    expect(names).toContain("milk");
    expect(names.some((name) => name.includes("parmesan"))).toBe(false);
  });

  it("records provenance and transformations", () => {
    const student = corruptRecipe(creamyChicken, "student");
    expect(student?.provenance.source_dataset).toBe("RecipeNLG");
    expect(student?.provenance.source_recipe_id).toBe("1");
    expect(student?.provenance.transformation_version).toMatch(/student-corruptor/);
    expect(student?.transformationsApplied.length).toBeGreaterThan(0);
  });

  it("only creates variants when transformation is valid", () => {
    const plain: RawRecipeNlgRow = {
      id: "2",
      title: "Cheese Toastie",
      ingredients: ["bread", "cheddar cheese", "butter"],
      directions: ["Butter bread.", "Add cheese.", "Fry until golden."],
      link: "example.com/2",
      source: "Gathered",
      ner: ["bread", "cheese", "butter"],
    };
    const variants = maybeCorruptVariants(plain);
    // practical always; student/struggle only if substitutions/removals happened
    expect(variants.some((item) => item.studentLevel === "practical")).toBe(true);
  });
});

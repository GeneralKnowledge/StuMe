import { describe, expect, it } from "vitest";
import { dedupeCandidates } from "../../scripts/recipes/lib/dedupe";
import { runSamplePipeline } from "../../scripts/recipes/lib/pipeline";
import { validateAgainstStumeGraph } from "../../scripts/recipes/lib/validate-graph";
import { corruptRecipe } from "../../scripts/recipes/lib/corrupt";
import type { RawRecipeNlgRow, StudentCandidate } from "../../scripts/recipes/lib/types";

describe("pipeline integration", () => {
  it("runs deterministically on the fixture sample", async () => {
    const a = await runSamplePipeline({
      inputPath: "data/fixtures/recipenlg_sample.csv",
      limit: 200,
    });
    const b = await runSamplePipeline({
      inputPath: "data/fixtures/recipenlg_sample.csv",
      limit: 200,
    });
    expect(a.report).toEqual(b.report);
    expect(a.candidates.map((item) => item.id)).toEqual(b.candidates.map((item) => item.id));
    expect(a.candidates.length).toBeGreaterThan(5);
    expect(a.report.validStudentCandidates).toBeGreaterThan(0);
  });

  it("deduplicates near-identical egg fried rice variants at the same level", () => {
    const mk = (id: string, title: string): StudentCandidate => {
      const row: RawRecipeNlgRow = {
        id,
        title,
        ingredients: ["rice", "eggs", "soy sauce", "oil"],
        directions: ["Fry rice and eggs with soy sauce."],
        link: "",
        source: "Gathered",
        ner: ["rice", "eggs", "soy sauce", "oil"],
      };
      return corruptRecipe(row, "practical")!;
    };
    const deduped = dedupeCandidates([
      mk("1", "Easy Egg Fried Rice"),
      mk("2", "Simple Egg Fried Rice"),
      mk("3", "Quick Egg Fried Rice"),
      mk("4", "Egg Fried Rice"),
    ]);
    expect(deduped.length).toBeLessThan(4);
  });

  it("validates candidates against the StuMe graph and keeps provenance", async () => {
    const result = await runSamplePipeline({
      inputPath: "data/fixtures/recipenlg_sample.csv",
      limit: 200,
    });
    const validated = result.candidates.map(validateAgainstStumeGraph);
    expect(validated.every((item) => item.provenance.source_dataset === "RecipeNLG")).toBe(true);
    expect(
      validated.some((item) => item.validationStatus === "fully_represented"),
    ).toBe(true);
    expect(result.report.topMissingIngredients.length).toBeGreaterThanOrEqual(0);
  });
});

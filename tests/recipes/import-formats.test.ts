import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { importCorpusToRecipeNlg } from "../../scripts/recipes/lib/import-formats";
import { loadAllRecipes } from "../../scripts/recipes/lib/csv";

describe("importCorpusToRecipeNlg", () => {
  it("converts ReciFine-shaped rows into RecipeNLG CSV", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "stume-import-"));
    const input = path.join(dir, "recifine.csv");
    const output = path.join(dir, "out.csv");
    writeFileSync(
      input,
      [
        "title,ingredients,directions,link,source,NER",
        [
          "Egg Rice",
          csv(JSON.stringify(["eggs", "rice", "soy sauce"])),
          csv(JSON.stringify(["Fry eggs with rice."])),
          "example.com/1",
          "Gathered",
          csv(JSON.stringify(["eggs", "rice", "soy sauce"])),
        ].join(","),
        [
          "Fancy Roast",
          csv(JSON.stringify(["beef"])),
          csv(JSON.stringify(["Roast forever."])),
          "example.com/2",
          "Recipes1M",
          csv(JSON.stringify(["beef"])),
        ].join(","),
      ].join("\n") + "\n",
    );

    const result = await importCorpusToRecipeNlg({
      format: "recifine",
      input,
      outputPath: output,
      gatheredOnly: true,
    });
    expect(result.written).toBe(1);
    const rows = await loadAllRecipes(output);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe("Egg Rice");
    expect(rows[0]?.source).toBe("Gathered");
    expect(rows[0]?.ingredients).toContain("eggs");
    expect(readFileSync(output, "utf8")).toContain("soy sauce");
  });

  it("converts Food.com / Iris314 rows with FoodCom source", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "stume-foodcom-"));
    const input = path.join(dir, "food.csv");
    const output = path.join(dir, "out.csv");
    writeFileSync(
      input,
      [
        "name,id,steps,ingredients",
        [
          "Beans Toast",
          "99",
          csv("['toast bread', 'heat beans']"),
          csv("['bread', 'baked beans']"),
        ].join(","),
      ].join("\n") + "\n",
    );

    const result = await importCorpusToRecipeNlg({
      format: "iris314",
      input,
      outputPath: output,
    });
    expect(result.written).toBe(1);
    const rows = await loadAllRecipes(output);
    expect(rows[0]?.source).toBe("FoodCom");
    expect(rows[0]?.title).toBe("Beans Toast");
    expect(rows[0]?.directions.length).toBeGreaterThan(0);
  });
});

function csv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

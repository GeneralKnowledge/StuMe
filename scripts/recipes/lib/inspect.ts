import { estimateNearDuplicates } from "./dedupe";
import { normalizeIngredientText } from "./normalize";
import type { InspectReport, RawRecipeNlgRow } from "./types";

function bucketCount(n: number): string {
  if (n <= 3) return "1-3";
  if (n <= 5) return "4-5";
  if (n <= 7) return "6-7";
  if (n <= 10) return "8-10";
  if (n <= 15) return "11-15";
  return "16+";
}

function titleFamily(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(easy|simple|quick|best|homemade|delicious|perfect)\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildInspectReport(rows: RawRecipeNlgRow[]): InspectReport {
  const bySource: Record<string, number> = {};
  const byIngredientCount: Record<string, number> = {};
  const byInstructionCount: Record<string, number> = {};
  const ingredientFreq = new Map<string, number>();
  const comboFreq = new Map<string, number>();
  const titleFreq = new Map<string, number>();
  const suspiciousIngredientStrings: string[] = [];
  const suspiciousQuantities: string[] = [];
  let missingIngredients = 0;
  let missingInstructions = 0;
  let extremelyLongRecipes = 0;
  let extremelyShortBrokenRecipes = 0;

  for (const row of rows) {
    bySource[row.source || "unknown"] = (bySource[row.source || "unknown"] ?? 0) + 1;
    byIngredientCount[bucketCount(row.ingredients.length)] =
      (byIngredientCount[bucketCount(row.ingredients.length)] ?? 0) + 1;
    byInstructionCount[bucketCount(row.directions.length)] =
      (byInstructionCount[bucketCount(row.directions.length)] ?? 0) + 1;

    if (row.ingredients.length === 0) missingIngredients += 1;
    if (row.directions.length === 0) missingInstructions += 1;
    if (row.ingredients.length >= 16 || row.directions.length >= 16) extremelyLongRecipes += 1;
    if (row.ingredients.length > 0 && row.ingredients.length < 2 && row.directions.length <= 1) {
      extremelyShortBrokenRecipes += 1;
    }
    if (row.title.trim().length < 3 || (row.ingredients.length <= 1 && row.directions.length <= 1)) {
      extremelyShortBrokenRecipes += 1;
    }

    const concepts: string[] = [];
    for (const line of row.ingredients) {
      if (/[?]{2,}|^\s*$|https?:/i.test(line)) {
        if (suspiciousIngredientStrings.length < 40) suspiciousIngredientStrings.push(line);
      }
      if (/\d+\s*\d+\s*\d+/.test(line) || /nan|null|undefined/i.test(line)) {
        if (suspiciousQuantities.length < 40) suspiciousQuantities.push(line);
      }
      const normalized = normalizeIngredientText(line);
      const key = normalized.normalizedName || line.toLowerCase();
      concepts.push(key);
      ingredientFreq.set(key, (ingredientFreq.get(key) ?? 0) + 1);
    }

    if (concepts.length >= 2) {
      const combo = [...concepts].sort().slice(0, 4).join(" + ");
      comboFreq.set(combo, (comboFreq.get(combo) ?? 0) + 1);
    }

    const family = titleFamily(row.title);
    if (family) titleFreq.set(family, (titleFreq.get(family) ?? 0) + 1);
  }

  const sortedIngredients = [...ingredientFreq.entries()].sort((a, b) => b[1] - a[1]);
  const mostCommonIngredients = sortedIngredients.slice(0, 25).map(([name, count]) => ({ name, count }));
  const rareIngredients = sortedIngredients
    .filter(([, count]) => count === 1)
    .slice(0, 25)
    .map(([name, count]) => ({ name, count }));

  const mostCommonCombinations = [...comboFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([combo, count]) => ({ combo, count }));

  const commonTitleFamilies = [...titleFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([family, count]) => ({ family, count }));

  return {
    totalRecipes: rows.length,
    bySource,
    byIngredientCount,
    byInstructionCount,
    mostCommonIngredients,
    rareIngredients,
    mostCommonCombinations,
    commonTitleFamilies,
    nearDuplicateEstimate: estimateNearDuplicates(rows.map((row) => row.title)),
    missingIngredients,
    missingInstructions,
    suspiciousIngredientStrings,
    suspiciousQuantities,
    extremelyLongRecipes,
    extremelyShortBrokenRecipes,
  };
}

export function formatInspectReport(report: InspectReport): string {
  const lines: string[] = [];
  lines.push("# RecipeNLG inspection report");
  lines.push("");
  lines.push(`Total recipes: ${report.totalRecipes}`);
  lines.push("");
  lines.push("## By source");
  for (const [source, count] of Object.entries(report.bySource).sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${source}: ${count}`);
  }
  lines.push("");
  lines.push("## Ingredient count buckets");
  for (const [bucket, count] of Object.entries(report.byIngredientCount)) {
    lines.push(`- ${bucket}: ${count}`);
  }
  lines.push("");
  lines.push("## Instruction count buckets");
  for (const [bucket, count] of Object.entries(report.byInstructionCount)) {
    lines.push(`- ${bucket}: ${count}`);
  }
  lines.push("");
  lines.push("## Most common ingredients");
  for (const item of report.mostCommonIngredients) {
    lines.push(`- ${item.name}: ${item.count}`);
  }
  lines.push("");
  lines.push("## Rare ingredients (sample of singletons)");
  for (const item of report.rareIngredients.slice(0, 15)) {
    lines.push(`- ${item.name}: ${item.count}`);
  }
  lines.push("");
  lines.push("## Common ingredient combinations");
  for (const item of report.mostCommonCombinations) {
    lines.push(`- ${item.combo}: ${item.count}`);
  }
  lines.push("");
  lines.push("## Common title families");
  for (const item of report.commonTitleFamilies) {
    lines.push(`- ${item.family}: ${item.count}`);
  }
  lines.push("");
  lines.push(`Near-duplicate title estimate: ${report.nearDuplicateEstimate}`);
  lines.push(`Missing ingredients: ${report.missingIngredients}`);
  lines.push(`Missing instructions: ${report.missingInstructions}`);
  lines.push(`Extremely long recipes: ${report.extremelyLongRecipes}`);
  lines.push(`Extremely short/broken recipes: ${report.extremelyShortBrokenRecipes}`);
  lines.push("");
  lines.push("## Suspicious ingredient strings");
  for (const item of report.suspiciousIngredientStrings.slice(0, 20)) {
    lines.push(`- ${item}`);
  }
  lines.push("");
  lines.push("## Suspicious quantities");
  for (const item of report.suspiciousQuantities.slice(0, 20)) {
    lines.push(`- ${item}`);
  }
  lines.push("");
  return lines.join("\n");
}

#!/usr/bin/env tsx
import { maybeCorruptVariants } from "./lib/corrupt";
import { loadAllRecipes } from "./lib/csv";
import { dedupeCandidates } from "./lib/dedupe";
import {
  missingIngredientCoverage,
  validateAgainstStumeGraph,
} from "./lib/validate-graph";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith("--"));
  if (!file) {
    console.error("Usage: npm run recipes:validate -- <csv> [--limit N]");
    process.exit(1);
  }
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 500;
  const rows = await loadAllRecipes(file, { limit });
  const candidates = dedupeCandidates(rows.flatMap((row) => maybeCorruptVariants(row))).map(
    validateAgainstStumeGraph,
  );
  const counts = {
    fully_represented: 0,
    needs_ingredients: 0,
    needs_transformations: 0,
    unrepresentable: 0,
  };
  for (const candidate of candidates) counts[candidate.validationStatus] += 1;
  console.log(JSON.stringify({ total: candidates.length, counts }, null, 2));
  console.log("\nTop missing:");
  for (const item of missingIngredientCoverage(candidates).slice(0, 15)) {
    console.log(`- ${item.slugOrName}: ${item.recipeCoverage}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

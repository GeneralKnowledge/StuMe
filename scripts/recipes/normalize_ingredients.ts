#!/usr/bin/env tsx
import { loadAllRecipes } from "./lib/csv";
import { normalizeRecipeIngredients } from "./lib/normalize";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith("--"));
  if (!file) {
    console.error("Usage: npm run recipes:normalize -- <csv> [--limit N]");
    process.exit(1);
  }
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 20;
  const rows = await loadAllRecipes(file, { limit });
  for (const row of rows) {
    const normalized = normalizeRecipeIngredients(row);
    console.log(`\n# ${row.title}`);
    for (const item of normalized) {
      console.log(
        `- ${item.originalText} -> ${item.normalizedName}` +
          (item.stumeSlug ? ` [${item.stumeSlug}]` : " [unmapped]") +
          ` (${item.confidence})`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

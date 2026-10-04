#!/usr/bin/env tsx
import { maybeCorruptVariants } from "./lib/corrupt";
import { loadAllRecipes } from "./lib/csv";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith("--"));
  if (!file) {
    console.error("Usage: npm run recipes:corrupt -- <csv> [--limit N]");
    process.exit(1);
  }
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 30;
  const rows = await loadAllRecipes(file, { limit });
  for (const row of rows) {
    const variants = maybeCorruptVariants(row);
    if (variants.length === 0) continue;
    console.log(`\nORIGINAL: ${row.title}`);
    for (const variant of variants) {
      console.log(
        `  -> ${variant.title} [${variant.studentLevel}/S${variant.struggleBand}] score=${variant.score.total}`,
      );
      console.log(`     ingredients: ${variant.ingredients.map((i) => i.normalizedName).join(", ")}`);
      console.log(
        `     transforms: ${variant.transformationsApplied
          .filter((t) => t.kind === "ingredient_substitute" || t.kind === "ingredient_remove")
          .map((t) => `${t.from}->${t.to || "∅"}`)
          .join("; ")}`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

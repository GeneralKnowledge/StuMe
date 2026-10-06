#!/usr/bin/env tsx
/**
 * Curate a small, demo-friendly corpus from the refined ReciFine snapshot.
 *
 * Filters for student-cookable recipes (score ≥ 55, struggle 1–2, ≤6 required
 * ingredients, real cooking steps), then diversifies by ingredient family so
 * the demo kitchen surfaces varied make-now / almost-there results.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RefinedRecipe } from "./lib/refine";

const DEFAULT_INPUT = path.join(
  "data",
  "generated",
  "student-candidates",
  "refined",
  "candidates.json",
);
const DEFAULT_OUT = path.join("data", "generated", "student-candidates", "demo");

const DEMO_KITCHEN = new Set([
  "rice",
  "eggs",
  "mushrooms",
  "onions",
  "butter",
  "cheese",
  "oil",
  "salt",
  "pepper",
]);

const COOKING_VERB =
  /\b(heat|cook|fry|boil|mix|stir|add|bake|toast|microwave|simmer|saute|sauté|whisk|combine|pour|season|serve|chop|slice|drain|melt|scramble|grill)\b/i;

function argValue(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx < 0) return undefined;
  return args[idx + 1];
}

function requiredCount(recipe: RefinedRecipe): number {
  return recipe.ingredients.filter((item) => !item.optional).length;
}

function familyKey(recipe: RefinedRecipe): string {
  return recipe.ingredients
    .filter((item) => !item.optional)
    .map((item) => item.slug)
    .sort()
    .join(",");
}

function primarySlug(recipe: RefinedRecipe): string {
  return recipe.ingredients.find((item) => !item.optional)?.slug ?? "unknown";
}

function hasRealSteps(recipe: RefinedRecipe): boolean {
  if (!Array.isArray(recipe.steps) || recipe.steps.length === 0) {
    return false;
  }
  const joined = recipe.steps.map((step) => String(step).trim()).filter(Boolean);
  if (joined.length === 0) {
    return false;
  }
  const text = joined.join(" ");
  if (text.length < 80) {
    return false;
  }
  if (!COOKING_VERB.test(text)) {
    return false;
  }
  if (/TODO|lorem|placeholder|FIXME/i.test(text)) {
    return false;
  }
  return joined.some((step) => step.length >= 25);
}

function worksWithDemoKitchen(recipe: RefinedRecipe): boolean {
  return recipe.ingredients
    .filter((item) => !item.optional)
    .every((item) => DEMO_KITCHEN.has(item.slug));
}

function compareDemoRank(a: RefinedRecipe, b: RefinedRecipe): number {
  return (
    b.score - a.score ||
    a.struggleBand - b.struggleBand ||
    requiredCount(a) - requiredCount(b) ||
    a.title.localeCompare(b.title)
  );
}

export interface CurateDemoOptions {
  minScore?: number;
  maxStruggle?: number;
  maxRequiredIngredients?: number;
  target?: number;
  maxPerFamily?: number;
  maxPerPrimary?: number;
}

export function curateDemoRecipes(
  recipes: RefinedRecipe[],
  options: CurateDemoOptions = {},
): { pool: RefinedRecipe[]; picked: RefinedRecipe[]; makeNow: number } {
  const minScore = options.minScore ?? 55;
  const maxStruggle = options.maxStruggle ?? 2;
  const maxRequired = options.maxRequiredIngredients ?? 6;
  const target = options.target ?? 120;
  const maxPerFamily = options.maxPerFamily ?? 2;
  const maxPerPrimary = options.maxPerPrimary ?? 8;

  const pool = recipes
    .filter(
      (recipe) =>
        recipe.score >= minScore &&
        recipe.struggleBand <= maxStruggle &&
        requiredCount(recipe) <= maxRequired &&
        hasRealSteps(recipe),
    )
    .slice()
    .sort(compareDemoRank);

  const seenSignatures = new Set<string>();
  const familyCount = new Map<string, number>();
  const primaryCount = new Map<string, number>();
  const picked: RefinedRecipe[] = [];

  const tryPick = (recipe: RefinedRecipe, force: boolean): boolean => {
    if (seenSignatures.has(recipe.signature)) {
      return false;
    }
    const family = familyKey(recipe);
    const primary = primarySlug(recipe);
    const familyLimit = force ? Math.max(maxPerFamily, 3) : maxPerFamily;
    if ((familyCount.get(family) ?? 0) >= familyLimit) {
      return false;
    }
    if (!force && (primaryCount.get(primary) ?? 0) >= maxPerPrimary) {
      return false;
    }
    seenSignatures.add(recipe.signature);
    familyCount.set(family, (familyCount.get(family) ?? 0) + 1);
    primaryCount.set(primary, (primaryCount.get(primary) ?? 0) + 1);
    picked.push(recipe);
    return true;
  };

  for (const recipe of pool) {
    if (worksWithDemoKitchen(recipe)) {
      tryPick(recipe, true);
    }
  }

  const makeNow = picked.length;

  for (const recipe of pool) {
    if (picked.length >= target) {
      break;
    }
    tryPick(recipe, false);
  }

  picked.sort(compareDemoRank);
  return { pool, picked, makeNow };
}

async function main() {
  const args = process.argv.slice(2);
  const input = argValue(args, "--input") ?? DEFAULT_INPUT;
  const outDir = argValue(args, "--out") ?? DEFAULT_OUT;
  const target = Number(argValue(args, "--target") ?? 120);

  if (!existsSync(input)) {
    throw new Error(
      `Refined corpus not found at ${input}. Run recipes:refine / recipes:expand first.`,
    );
  }

  const recipes = JSON.parse(await readFile(input, "utf8")) as RefinedRecipe[];
  const { pool, picked, makeNow } = curateDemoRecipes(recipes, {
    target: Number.isFinite(target) ? target : 120,
  });

  if (picked.length < 40) {
    throw new Error(
      `Demo curation only kept ${picked.length} recipes (pool ${pool.length}). Relax filters or expand refined corpus.`,
    );
  }

  const byStruggle: Record<string, number> = {};
  for (const recipe of picked) {
    const key = String(recipe.struggleBand);
    byStruggle[key] = (byStruggle[key] ?? 0) + 1;
  }

  const scores = picked.map((recipe) => recipe.score);
  const manifest = {
    count: picked.length,
    source: input,
    filter:
      "score≥55, struggle≤2, ≤6 required ingredients, real cooking steps, diversified families",
    target,
    poolSize: pool.length,
    demoKitchenMakeNow: makeNow,
    scoreRange: {
      min: Math.min(...scores),
      max: Math.max(...scores),
    },
    byStruggle,
    demoKitchenSlugs: [...DEMO_KITCHEN],
  };

  const readme = `# Demo corpus

Curated subset of the refined ReciFine snapshot for a fast, believable student-cooking demo.

| | |
| --- | ---: |
| Source refined | ${recipes.length} |
| Filter pool | ${pool.length} |
| Kept | **${picked.length}** |
| Demo-kitchen make-now | ${makeNow} |
| Score range | ${manifest.scoreRange.min}–${manifest.scoreRange.max} |

## Filters

- quality score ≥ 55
- struggle band 1–2
- ≤ 6 required ingredients
- real cooking steps (length + cooking verbs)
- diversified by ingredient family / primary (caps)

## Load

\`\`\`bash
STUME_CORPUS=demo npm run db:seed
# or one-shot:
npm run demo:ready
\`\`\`
`;

  await mkdir(outDir, { recursive: true });
  await writeFile(
    path.join(outDir, "candidates.json"),
    `${JSON.stringify(picked, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  await writeFile(path.join(outDir, "README.md"), readme, "utf8");

  console.log(`Demo corpus: ${picked.length} recipes → ${outDir}`);
  console.log(
    `  pool ${pool.length}, make-now with demo kitchen ${makeNow}, scores ${manifest.scoreRange.min}–${manifest.scoreRange.max}`,
  );
  console.log(`  struggle bands: ${JSON.stringify(byStruggle)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

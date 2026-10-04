#!/usr/bin/env tsx
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { ingestRefinedRecipes } from "./lib/ingest";
import type { RefinedRecipe } from "./lib/refine";

function argValue(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx < 0) return undefined;
  return args[idx + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const input =
    argValue(args, "--input") ??
    path.join("data", "generated", "student-candidates", "refined", "candidates.json");

  const recipes = JSON.parse(await readFile(input, "utf8")) as RefinedRecipe[];
  const prisma = new PrismaClient();
  try {
    const result = await ingestRefinedRecipes(prisma, recipes);
    console.log(
      JSON.stringify(
        {
          input: input,
          candidates: recipes.length,
          ...result,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

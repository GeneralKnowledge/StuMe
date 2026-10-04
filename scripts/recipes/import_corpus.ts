#!/usr/bin/env tsx
import path from "node:path";
import {
  CORPUS_URLS,
  importCorpusToRecipeNlg,
  type CorpusFormat,
} from "./lib/import-formats";

function usage(): never {
  console.error(
    [
      "Usage: npm run recipes:import -- --format <recifine|iris314|foodcom|recipenlg> [options]",
      "",
      "Download/convert an alternate recipe corpus into RecipeNLG-shaped CSV",
      "for `npm run recipes:sample`.",
      "",
      "Options:",
      "  --format recifine|iris314|foodcom|recipenlg   Required",
      "  --input <path|url>   Override source (defaults to known Hugging Face URLs)",
      "  --out <path>         Output CSV (default under data/external/...)",
      "  --limit N            Stop after writing N recipes (recommended)",
      "  --gathered-only      Keep only Gathered rows (default for recifine)",
      "  --all-sources        Keep non-Gathered rows too",
      "",
      "Examples:",
      "  npm run recipes:import -- --format recifine --limit 5000",
      "  npm run recipes:import -- --format iris314 --limit 5000",
      "  npm run recipes:sample -- data/external/recifine/sample_5000.csv --limit 5000 --gathered-only",
    ].join("\n"),
  );
  process.exit(1);
}

function argValue(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx < 0) return undefined;
  return args[idx + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const format = (argValue(args, "--format") ?? args.find((arg) => !arg.startsWith("--"))) as
    | CorpusFormat
    | undefined;
  if (!format || !["recifine", "iris314", "foodcom", "recipenlg"].includes(format)) usage();

  const limitRaw = argValue(args, "--limit");
  const limit = limitRaw !== undefined ? Number(limitRaw) : undefined;
  const gatheredOnly = args.includes("--all-sources") ? false : args.includes("--gathered-only") || format === "recifine";

  const defaultOut =
    format === "iris314" || format === "foodcom"
      ? path.join("data", "external", "foodcom", `sample_${limit ?? "all"}.csv`)
      : path.join("data", "external", "recifine", `sample_${limit ?? "all"}.csv`);

  const input =
    argValue(args, "--input") ??
    (format === "recifine"
      ? CORPUS_URLS.recifine
      : format === "iris314"
        ? CORPUS_URLS.iris314
        : undefined);
  if (!input) {
    console.error("foodcom/recipenlg require --input <local-path-or-url>");
    process.exit(1);
  }

  const outputPath = argValue(args, "--out") ?? defaultOut;

  console.log(
    JSON.stringify(
      {
        format,
        input,
        outputPath,
        limit: limit ?? null,
        gatheredOnly,
      },
      null,
      2,
    ),
  );

  const result = await importCorpusToRecipeNlg({
    format,
    input,
    outputPath,
    limit: Number.isFinite(limit) ? limit : undefined,
    gatheredOnly,
  });

  console.log(JSON.stringify(result, null, 2));
  console.log(`\nNext:\n  npm run recipes:sample -- ${result.outputPath} --limit ${result.written} --gathered-only`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

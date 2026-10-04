#!/usr/bin/env tsx
import path from "node:path";
import { runSamplePipeline } from "./lib/pipeline";

function usage(): never {
  console.error(
    "Usage: npm run recipes:sample -- <path-to-full_dataset.csv> [--limit 5000]",
  );
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith("--"));
  if (!file) usage();
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 5000;
  const outDir = path.join("data", "generated", "student-candidates", "sample");

  const result = await runSamplePipeline({
    inputPath: file!,
    limit: Number.isFinite(limit) ? limit : 5000,
    outputDir: outDir,
  });

  console.log(result.reportMarkdown);
  console.log("\n--- examples (truncated) ---\n");
  console.log(result.examplesMarkdown.split("---").slice(0, 8).join("---"));
  console.log(`\nFull outputs in ${outDir}`);
  console.log(`candidates: ${result.candidates.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

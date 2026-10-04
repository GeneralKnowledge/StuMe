#!/usr/bin/env tsx
import path from "node:path";
import { runSamplePipeline } from "./lib/pipeline";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith("--")) ?? "data/fixtures/recipenlg_sample.csv";
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 5000;
  const outDir = path.join("data", "generated", "student-candidates", "latest");
  const result = await runSamplePipeline({
    inputPath: file,
    limit: Number.isFinite(limit) ? limit : 5000,
    outputDir: outDir,
  });
  console.log(result.reportMarkdown);
  console.log(`Wrote outputs to ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

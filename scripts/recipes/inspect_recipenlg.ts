#!/usr/bin/env tsx
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { runInspectOnly } from "./lib/pipeline";

function usage(): never {
  console.error("Usage: npm run recipes:inspect -- <path-to-full_dataset.csv> [--limit N]");
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith("--"));
  if (!file) usage();
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : undefined;

  const markdown = await runInspectOnly(file!, Number.isFinite(limit) ? limit : undefined);
  const outDir = path.join("data", "generated", "student-candidates", "inspect");
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, "inspect.md");
  await writeFile(outFile, markdown, "utf8");
  console.log(markdown);
  console.log(`\nWrote ${outFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

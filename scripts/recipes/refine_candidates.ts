#!/usr/bin/env tsx
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { formatRefineReport, refineCandidates } from "./lib/refine";
import type { StudentCandidate } from "./lib/types";

function argValue(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx < 0) return undefined;
  return args[idx + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const input =
    argValue(args, "--input") ??
    path.join("data", "generated", "student-candidates", "sample", "candidates.json");
  const outDir =
    argValue(args, "--out") ??
    path.join("data", "generated", "student-candidates", "refined");
  const limit = Number(argValue(args, "--limit") ?? 250);

  const raw = JSON.parse(await readFile(input, "utf8")) as StudentCandidate[];
  const { recipes, report } = refineCandidates(raw, {
    limit: Number.isFinite(limit) ? limit : 250,
  });
  const reportMarkdown = formatRefineReport(report);

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "candidates.json"), `${JSON.stringify(recipes, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(outDir, "manifest.json"),
    `${JSON.stringify(
      {
        count: recipes.length,
        sourceCandidates: input,
        filter: "fully_represented + quality + one family/source + seed dedupe + struggle caps",
        report,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(path.join(outDir, "report.md"), reportMarkdown, "utf8");

  console.log(reportMarkdown);
  console.log(`Wrote ${recipes.length} refined recipes to ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

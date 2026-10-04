#!/usr/bin/env tsx
import { sampleRecipeNlgCsv } from "./lib/csv";
import { passesBasicValidity, scoreStudentSuitability } from "./lib/suitability";
import { PIPELINE_DEFAULTS } from "./lib/config";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith("--"));
  if (!file) {
    console.error("Usage: npm run recipes:filter -- <csv> [--limit N] [--gathered-only]");
    process.exit(1);
  }
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 5000;
  const gatheredOnly = args.includes("--gathered-only");
  const sample = await sampleRecipeNlgCsv(file, {
    limit,
    preferGathered: true,
    gatheredOnly,
  });
  let basic = 0;
  let suitable = 0;
  for (const row of sample.rows) {
    if (!passesBasicValidity(row)) continue;
    basic += 1;
    if (scoreStudentSuitability(row).total >= PIPELINE_DEFAULTS.suitabilityThreshold) suitable += 1;
  }
  console.log(
    JSON.stringify(
      {
        scannedTotal: sample.scannedTotal,
        gatheredSeen: sample.gatheredSeen,
        sampled: sample.rows.length,
        sampledGathered: sample.sampledGathered,
        afterBasicValidity: basic,
        afterStudentSuitability: suitable,
        threshold: PIPELINE_DEFAULTS.suitabilityThreshold,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

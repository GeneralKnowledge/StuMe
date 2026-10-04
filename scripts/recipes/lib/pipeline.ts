import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PIPELINE_DEFAULTS, TRANSFORMATION_VERSION } from "./config";
import { maybeCorruptVariants } from "./corrupt";
import { loadAllRecipes, sampleRecipeNlgCsv } from "./csv";
import { dedupeCandidates } from "./dedupe";
import { buildInspectReport, formatInspectReport } from "./inspect";
import { normalizeRecipeIngredients } from "./normalize";
import { passesBasicValidity, scoreStudentSuitability } from "./suitability";
import type { PipelineReport, RawRecipeNlgRow, StruggleBand, StudentCandidate, ValidationStatus } from "./types";
import {
  missingIngredientCoverage,
  potentialShoppingUnlocks,
  rankCorpusSuperFoods,
  validateAgainstStumeGraph,
} from "./validate-graph";

export interface SamplePipelineOptions {
  inputPath: string;
  limit?: number;
  preferGathered?: boolean;
  gatheredOnly?: boolean;
  suitabilityThreshold?: number;
  outputDir?: string;
}

function emptyStruggle(): Record<StruggleBand, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0 };
}

function emptyValidation(): Record<ValidationStatus, number> {
  return {
    fully_represented: 0,
    needs_ingredients: 0,
    needs_transformations: 0,
    unrepresentable: 0,
  };
}

export async function runSamplePipeline(options: SamplePipelineOptions): Promise<{
  report: PipelineReport;
  candidates: StudentCandidate[];
  examplesMarkdown: string;
  reportMarkdown: string;
  inspectMarkdown: string;
}> {
  const limit = options.limit ?? PIPELINE_DEFAULTS.sampleLimit;
  const threshold = options.suitabilityThreshold ?? PIPELINE_DEFAULTS.suitabilityThreshold;
  const preferGathered = options.preferGathered ?? PIPELINE_DEFAULTS.preferGathered;
  const gatheredOnly = options.gatheredOnly ?? false;

  const sample = await sampleRecipeNlgCsv(options.inputPath, {
    limit,
    preferGathered,
    gatheredOnly,
  });
  const rows = sample.rows;
  const inspect = buildInspectReport(rows);
  const inspectMarkdown = formatInspectReport(inspect);

  let afterBasicValidity = 0;
  let afterStudentSuitability = 0;
  let afterNormalization = 0;
  const corrupted: StudentCandidate[] = [];

  for (const row of rows) {
    if (!passesBasicValidity(row)) continue;
    afterBasicValidity += 1;

    const score = scoreStudentSuitability(row);
    if (score.total < threshold) continue;
    afterStudentSuitability += 1;

    const normalized = normalizeRecipeIngredients(row);
    if (normalized.length < 2) continue;
    afterNormalization += 1;

    const variants = maybeCorruptVariants(row);
    corrupted.push(...variants);
  }

  const afterCorruption = corrupted.length;
  const deduped = dedupeCandidates(corrupted).map(validateAgainstStumeGraph);
  const byStruggle = emptyStruggle();
  const byValidation = emptyValidation();
  for (const candidate of deduped) {
    byStruggle[candidate.struggleBand] += 1;
    byValidation[candidate.validationStatus] += 1;
  }

  const topMissing = missingIngredientCoverage(deduped).slice(0, 15);
  const topUnlocks = potentialShoppingUnlocks(deduped, 12);
  const topSuperFoods = rankCorpusSuperFoods(deduped, 12);

  const report: PipelineReport = {
    inputPath: options.inputPath,
    scanned: rows.length,
    scannedTotal: sample.scannedTotal,
    gatheredSeen: sample.gatheredSeen,
    otherSeen: sample.otherSeen,
    sampledGathered: sample.sampledGathered,
    sampledOther: sample.sampledOther,
    afterBasicValidity,
    afterStudentSuitability,
    afterNormalization,
    afterCorruption,
    afterDeduplication: deduped.length,
    validStudentCandidates: deduped.filter((item) => item.validationStatus !== "unrepresentable")
      .length,
    byStruggle,
    byValidation,
    recipesRequiringNewIngredients: byValidation.needs_ingredients,
    topMissingIngredients: topMissing,
    topPotentialShoppingUnlocks: topUnlocks,
    topSuperFoods,
    transformationVersion: TRANSFORMATION_VERSION,
  };

  const examplesMarkdown = formatExamples(deduped.slice(0, PIPELINE_DEFAULTS.maxExamplesInReport), rows);
  const reportMarkdown = formatPipelineReport(report);

  if (options.outputDir) {
    await mkdir(options.outputDir, { recursive: true });
    await writeFile(path.join(options.outputDir, "inspect.md"), inspectMarkdown, "utf8");
    await writeFile(path.join(options.outputDir, "report.md"), reportMarkdown, "utf8");
    await writeFile(path.join(options.outputDir, "examples.md"), examplesMarkdown, "utf8");
    // Pretty-print only for small corpora — large dumps are for refine, not reading.
    const pretty = deduped.length <= 2000;
    await writeFile(
      path.join(options.outputDir, "candidates.json"),
      pretty ? `${JSON.stringify(deduped, null, 2)}\n` : `${JSON.stringify(deduped)}\n`,
      "utf8",
    );
  }

  return {
    report,
    candidates: deduped,
    examplesMarkdown,
    reportMarkdown,
    inspectMarkdown,
  };
}

export function formatPipelineReport(report: PipelineReport): string {
  return [
    "# StuMe RecipeNLG sample pipeline report",
    "",
    `Input: ${report.inputPath}`,
    `Transformation version: ${report.transformationVersion}`,
    "",
    `CSV rows streamed: ${report.scannedTotal}`,
    `Gathered rows seen: ${report.gatheredSeen}`,
    `Other-source rows seen: ${report.otherSeen}`,
    `Working sample size: ${report.scanned} (Gathered ${report.sampledGathered}, other ${report.sampledOther})`,
    `after basic validity filtering: ${report.afterBasicValidity}`,
    `after student suitability filtering: ${report.afterStudentSuitability}`,
    `after normalization: ${report.afterNormalization}`,
    `after corruption (variants): ${report.afterCorruption}`,
    `after deduplication: ${report.afterDeduplication}`,
    `valid student candidates: ${report.validStudentCandidates}`,
    "",
    "Struggle bands:",
    `  Struggle 1: ${report.byStruggle[1]}`,
    `  Struggle 2: ${report.byStruggle[2]}`,
    `  Struggle 3: ${report.byStruggle[3]}`,
    `  Struggle 4: ${report.byStruggle[4]}`,
    "",
    "Validation:",
    `  fully represented: ${report.byValidation.fully_represented}`,
    `  needs ingredients: ${report.byValidation.needs_ingredients}`,
    `  needs transformations: ${report.byValidation.needs_transformations}`,
    `  unrepresentable: ${report.byValidation.unrepresentable}`,
    `recipes requiring new graph ingredients: ${report.recipesRequiringNewIngredients}`,
    "",
    "Top missing graph ingredients:",
    ...report.topMissingIngredients.map(
      (item) => `  - ${item.slugOrName}: ${item.recipeCoverage}`,
    ),
    "",
    "Top potential shopping unlocks / expansions:",
    ...report.topPotentialShoppingUnlocks.map(
      (item) => `  - ${item.slug}: ${item.unlockEstimate}`,
    ),
    "",
    "Top super foods (unlock + fancy-up, low effort):",
    ...report.topSuperFoods.map(
      (item) =>
        `  - ${item.slug}: unlock ${item.unlockEstimate}, fancy-up ${item.fancyUpEstimate}, low-effort ${item.lowEffortScore}, score ${item.superFoodScore} [${item.roles.join("+")}]`,
    ),
    "",
  ].join("\n");
}

function formatExamples(candidates: StudentCandidate[], sourceRows: RawRecipeNlgRow[]): string {
  const byId = new Map(sourceRows.map((row) => [row.id, row]));
  const blocks: string[] = ["# Student corruption examples", ""];

  for (const candidate of candidates) {
    const source = byId.get(candidate.provenance.source_recipe_id);
    blocks.push("## ORIGINAL");
    blocks.push(source?.title ?? candidate.provenance.source_title);
    blocks.push(`Ingredients: ${(source?.ingredients ?? candidate.provenance.original_ingredients).join("; ")}`);
    blocks.push("");
    blocks.push("## STUDENT VERSION");
    blocks.push(`${candidate.title} [${candidate.studentLevel} / struggle ${candidate.struggleBand}]`);
    blocks.push(`Ingredients: ${candidate.ingredients.map((item) => item.normalizedName).join("; ")}`);
    blocks.push("Steps:");
    for (const step of candidate.steps) blocks.push(`- ${step}`);
    blocks.push("");
    blocks.push("## CORRUPTIONS APPLIED");
    for (const change of candidate.transformationsApplied) {
      blocks.push(`- ${change.kind}: ${change.from} → ${change.to} (${change.reason})`);
    }
    blocks.push("");
    blocks.push("## SCORE");
    blocks.push(JSON.stringify(candidate.score, null, 2));
    blocks.push("");
    blocks.push("## WHY IT WAS ACCEPTED");
    blocks.push(candidate.acceptedReason);
    blocks.push(`validation: ${candidate.validationStatus}`);
    blocks.push("");
    blocks.push("---");
    blocks.push("");
  }

  return blocks.join("\n");
}

export async function runInspectOnly(inputPath: string, limit?: number) {
  const rows = await loadAllRecipes(inputPath, { limit });
  const report = buildInspectReport(rows);
  return formatInspectReport(report);
}

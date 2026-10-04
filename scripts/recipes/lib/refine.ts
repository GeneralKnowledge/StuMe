import { INGREDIENTS } from "../../../prisma/seed/ingredients";
import { RECIPES as SEED_RECIPES } from "../../../prisma/seed/recipes";
import { TRANSFORMATIONS } from "../../../prisma/seed/transformations";
import { buildRecipeSignature } from "../../../src/lib/validation/signature";
import type { CostCategory, Difficulty } from "../../../src/lib/types";
import type { StudentCandidate, StruggleBand } from "./types";

export interface RefineOptions {
  /** Max recipes to keep after refinement (default 250). Use 0 for uncapped. */
  limit?: number;
  /** Minimum suitability/corrupt score (default 20). */
  minScore?: number;
  /** Only keep fully_represented (default true). */
  fullyRepresentedOnly?: boolean;
  /** Keep at most one variant per source recipe id (default true). */
  onePerSource?: boolean;
  /** Keep at most one variant per ingredient-family across levels (default true). */
  onePerFamily?: boolean;
  /** Exclude near-duplicates of hand-authored seed recipes (default true). */
  excludeSeedDuplicates?: boolean;
  /**
   * Soft caps per struggle band; omitted bands are uncapped.
   * Pass `{}` (or set `struggleCaps: false` via CLI --no-struggle-caps) to disable.
   */
  struggleCaps?: Partial<Record<StruggleBand, number>> | false;
}

export interface RefinedRecipe {
  title: string;
  description: string;
  steps: string[];
  timeMinutes: number;
  difficulty: Difficulty;
  equipment: string[];
  estimatedCost: CostCategory;
  tags: string[];
  graphPath: string[];
  ingredients: Array<{ slug: string; quantity?: string; optional?: boolean }>;
  componentSlugs: string[];
  signature: string;
  studentLevel: StudentCandidate["studentLevel"];
  struggleBand: StruggleBand;
  score: number;
  provenance: StudentCandidate["provenance"];
  sourceCandidateId: string;
}

export interface RefineReport {
  input: number;
  afterFullyRepresented: number;
  afterQuality: number;
  afterFamilyDedupe: number;
  afterSourceDedupe: number;
  afterSeedDedupe: number;
  afterStruggleCaps: number;
  kept: number;
  byStruggle: Record<StruggleBand, number>;
  byLevel: Record<string, number>;
}

const COST_RANK: Record<CostCategory, number> = {
  very_cheap: 0,
  cheap: 1,
  moderate: 2,
  expensive: 3,
};

const INGREDIENT_COST = new Map(INGREDIENTS.map((item) => [item.slug, item.costCategory]));

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(easy|simple|quick|best|homemade|student|broke|lazy|perfect|deluxe|special)\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Family key that collapses practical/student/struggle variants of the same meal. */
export function crossLevelFamilyKey(candidate: StudentCandidate): string {
  const cores = candidate.ingredients
    .filter((item) => !item.optional && item.stumeSlug)
    .map((item) => item.stumeSlug!)
    .sort();
  return `${cores.join("+")}|${normalizeTitle(candidate.title)}`;
}

function levelRank(level: StudentCandidate["studentLevel"]): number {
  // Prefer more student-like variants when scores tie.
  if (level === "struggle") return 0;
  if (level === "student") return 1;
  return 2;
}

function passesQuality(candidate: StudentCandidate, minScore: number): boolean {
  if (candidate.score.total < minScore) return false;
  const required = candidate.ingredients.filter((item) => !item.optional && item.stumeSlug);
  if (required.length < 2 || required.length > 8) return false;
  if (candidate.steps.length < 1 || candidate.steps.length > 10) return false;
  if (candidate.estimatedMinutes > 25) return false;
  // Must have a recognizable meal base
  const slugs = new Set(required.map((item) => item.stumeSlug!));
  const hasBase = ["eggs", "pasta", "rice", "microwave-rice", "bread", "instant-noodles", "noodles", "potatoes", "frozen-chips", "oats", "wraps"].some(
    (slug) => slugs.has(slug),
  );
  return hasBase;
}

function estimateCost(slugs: string[]): CostCategory {
  let worst: CostCategory = "very_cheap";
  for (const slug of slugs) {
    const cost = INGREDIENT_COST.get(slug) ?? "cheap";
    if (COST_RANK[cost] > COST_RANK[worst]) worst = cost;
  }
  return worst === "expensive" ? "moderate" : worst;
}

function mapDifficulty(candidate: StudentCandidate): Difficulty {
  if (candidate.struggleBand >= 3 || candidate.estimatedMinutes <= 10) return "easy";
  if (candidate.estimatedMinutes <= 20) return "easy";
  return "medium";
}

function normalizeEquipment(equipment: string[]): string[] {
  const allowed = new Set([
    "pan",
    "hob",
    "microwave",
    "toaster",
    "kettle",
    "bowl",
    "oven",
    "tray",
    "grill",
    "saucepan",
    "frying pan",
    "knife",
  ]);
  const mapped = new Set<string>();
  for (const item of equipment) {
    const lower = item.toLowerCase();
    if (allowed.has(lower)) {
      mapped.add(lower === "frying pan" ? "pan" : lower === "saucepan" ? "pan" : lower);
      continue;
    }
    if (lower.includes("microwave")) mapped.add("microwave");
    if (lower.includes("toast")) mapped.add("toaster");
    if (lower.includes("oven")) mapped.add("oven");
    if (lower.includes("grill")) mapped.add("grill");
    if (lower.includes("pan") || lower.includes("skillet")) mapped.add("pan");
    if (lower.includes("hob") || lower.includes("stove")) mapped.add("hob");
    if (lower.includes("bowl")) mapped.add("bowl");
    if (lower.includes("kettle")) mapped.add("kettle");
  }
  if (mapped.size === 0) mapped.add("pan");
  return [...mapped];
}

/** Infer a short transformation path from seed transforms whose inputs are covered. */
export function inferGraphPath(ingredientSlugs: string[]): {
  graphPath: string[];
  componentSlugs: string[];
} {
  const have = new Set(ingredientSlugs);
  const matched = TRANSFORMATIONS.filter((transform) => {
    const required = transform.inputs.filter((input) => !input.optional && input.ingredientSlug);
    if (required.length === 0) return false;
    return required.every((input) => have.has(input.ingredientSlug!));
  });

  // Prefer shorter, more specific transforms; keep at most 3
  matched.sort((a, b) => a.inputs.length - b.inputs.length || a.timeMinutes - b.timeMinutes);
  const chosen = matched.slice(0, 3);
  return {
    graphPath: chosen.map((item) => item.slug),
    componentSlugs: [...new Set(chosen.map((item) => item.outputSlug))],
  };
}

function seedSignatures(): Set<string> {
  const signatures = new Set<string>();
  for (const recipe of SEED_RECIPES) {
    signatures.add(
      buildRecipeSignature({
        title: recipe.title,
        ingredients: recipe.ingredients.map((item) => ({
          ingredientSlug: item.slug,
          quantity: item.quantity,
          optional: Boolean(item.optional),
        })),
        graphPath: recipe.graphPath,
        tags: recipe.tags,
        equipment: recipe.equipment,
        componentSlugs: recipe.componentSlugs,
      }),
    );
  }
  return signatures;
}

export function candidateToRefined(candidate: StudentCandidate): RefinedRecipe {
  const ingredients = candidate.ingredients
    .filter((item) => item.stumeSlug)
    .map((item) => ({
      slug: item.stumeSlug!,
      optional: item.optional,
    }));
  // Dedupe slugs, prefer non-optional
  const bySlug = new Map<string, { slug: string; optional?: boolean }>();
  for (const item of ingredients) {
    const existing = bySlug.get(item.slug);
    if (!existing || existing.optional) bySlug.set(item.slug, item);
  }
  const uniqueIngredients = [...bySlug.values()];
  const slugs = uniqueIngredients.map((item) => item.slug);
  const { graphPath, componentSlugs } = inferGraphPath(slugs);
  const tags = Array.from(
    new Set([
      "corpus",
      candidate.studentLevel,
      `struggle-${candidate.struggleBand}`,
      ...slugs.slice(0, 4),
    ]),
  );
  const equipment = normalizeEquipment(candidate.equipment);
  const signature = buildRecipeSignature({
    title: candidate.title,
    ingredients: uniqueIngredients.map((item) => ({
      ingredientSlug: item.slug,
      optional: Boolean(item.optional),
    })),
    graphPath,
    tags,
    equipment,
    componentSlugs,
  });

  return {
    title: candidate.title,
    description: candidate.description,
    steps: candidate.steps,
    timeMinutes: Math.min(25, Math.max(3, candidate.estimatedMinutes)),
    difficulty: mapDifficulty(candidate),
    equipment,
    estimatedCost: estimateCost(slugs),
    tags,
    graphPath,
    ingredients: uniqueIngredients,
    componentSlugs,
    signature,
    studentLevel: candidate.studentLevel,
    struggleBand: candidate.struggleBand,
    score: candidate.score.total,
    provenance: candidate.provenance,
    sourceCandidateId: candidate.id,
  };
}

export function refineCandidates(
  candidates: StudentCandidate[],
  options?: RefineOptions,
): { recipes: RefinedRecipe[]; report: RefineReport } {
  const rawLimit = options?.limit ?? 250;
  const limit = rawLimit === 0 ? Number.POSITIVE_INFINITY : rawLimit;
  const minScore = options?.minScore ?? 20;
  const fullyRepresentedOnly = options?.fullyRepresentedOnly ?? true;
  const onePerSource = options?.onePerSource ?? true;
  const onePerFamily = options?.onePerFamily ?? true;
  const excludeSeedDuplicates = options?.excludeSeedDuplicates ?? true;
  const struggleCaps =
    options?.struggleCaps === false
      ? {}
      : (options?.struggleCaps ?? { 1: 90, 2: 90, 3: 70, 4: 40 });

  const report: RefineReport = {
    input: candidates.length,
    afterFullyRepresented: 0,
    afterQuality: 0,
    afterFamilyDedupe: 0,
    afterSourceDedupe: 0,
    afterSeedDedupe: 0,
    afterStruggleCaps: 0,
    kept: 0,
    byStruggle: { 1: 0, 2: 0, 3: 0, 4: 0 },
    byLevel: {},
  };

  let pool = candidates.filter((item) =>
    fullyRepresentedOnly ? item.validationStatus === "fully_represented" : item.validationStatus !== "unrepresentable",
  );
  report.afterFullyRepresented = pool.length;

  pool = pool.filter((item) => passesQuality(item, minScore));
  report.afterQuality = pool.length;

  pool.sort((a, b) => {
    const scoreDiff = b.score.total - a.score.total;
    if (scoreDiff !== 0) return scoreDiff;
    const levelDiff = levelRank(a.studentLevel) - levelRank(b.studentLevel);
    if (levelDiff !== 0) return levelDiff;
    return a.struggleBand - b.struggleBand;
  });

  if (onePerFamily) {
    const seen = new Set<string>();
    pool = pool.filter((item) => {
      const key = crossLevelFamilyKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  report.afterFamilyDedupe = pool.length;

  if (onePerSource) {
    const seen = new Set<string>();
    pool = pool.filter((item) => {
      const key = item.provenance.source_recipe_id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  report.afterSourceDedupe = pool.length;

  let refined = pool.map(candidateToRefined);

  if (excludeSeedDuplicates) {
    const seeds = seedSignatures();
    refined = refined.filter((item) => !seeds.has(item.signature));
  }
  // Collapse identical graph signatures produced after path inference.
  {
    const seen = new Set<string>();
    refined = refined.filter((item) => {
      if (seen.has(item.signature)) return false;
      seen.add(item.signature);
      return true;
    });
  }
  report.afterSeedDedupe = refined.length;

  const bandCounts: Record<StruggleBand, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const capped: RefinedRecipe[] = [];
  for (const recipe of refined) {
    const cap = struggleCaps[recipe.struggleBand];
    if (cap !== undefined && bandCounts[recipe.struggleBand] >= cap) continue;
    bandCounts[recipe.struggleBand] += 1;
    capped.push(recipe);
    if (capped.length >= limit) break;
  }
  report.afterStruggleCaps = capped.length;
  report.kept = capped.length;

  for (const recipe of capped) {
    report.byStruggle[recipe.struggleBand] += 1;
    report.byLevel[recipe.studentLevel] = (report.byLevel[recipe.studentLevel] ?? 0) + 1;
  }

  return { recipes: capped, report };
}

export function formatRefineReport(report: RefineReport): string {
  return [
    "# Refined student corpus report",
    "",
    `Input candidates: ${report.input}`,
    `after fully_represented filter: ${report.afterFullyRepresented}`,
    `after quality gates: ${report.afterQuality}`,
    `after cross-level family dedupe: ${report.afterFamilyDedupe}`,
    `after one-per-source: ${report.afterSourceDedupe}`,
    `after seed-signature dedupe: ${report.afterSeedDedupe}`,
    `after struggle caps + limit: ${report.afterStruggleCaps}`,
    `kept: ${report.kept}`,
    "",
    "By struggle band:",
    `  1: ${report.byStruggle[1]}`,
    `  2: ${report.byStruggle[2]}`,
    `  3: ${report.byStruggle[3]}`,
    `  4: ${report.byStruggle[4]}`,
    "",
    "By student level:",
    ...Object.entries(report.byLevel).map(([level, count]) => `  ${level}: ${count}`),
    "",
  ].join("\n");
}

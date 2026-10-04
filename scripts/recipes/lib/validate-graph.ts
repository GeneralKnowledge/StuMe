import { INGREDIENTS } from "../../../prisma/seed/ingredients";
import { TRANSFORMATIONS } from "../../../prisma/seed/transformations";
import type { StudentCandidate, ValidationStatus } from "./types";

const STUME_SLUGS = new Set(INGREDIENTS.map((item) => item.slug));
const STUME_TRANSFORMS = new Set(TRANSFORMATIONS.map((item) => item.slug));

export function getStumeIngredientSlugs(): Set<string> {
  return new Set(STUME_SLUGS);
}

export function validateAgainstStumeGraph(candidate: StudentCandidate): StudentCandidate {
  const required = candidate.ingredients.filter((item) => !item.optional);
  const missing = required
    .filter((item) => !item.stumeSlug || !STUME_SLUGS.has(item.stumeSlug))
    .map((item) => item.stumeSlug ?? item.normalizedName);

  let status: ValidationStatus;
  if (missing.length === 0) {
    status = "fully_represented";
  } else if (missing.length <= 2 && required.some((item) => item.stumeSlug && STUME_SLUGS.has(item.stumeSlug))) {
    status = "needs_ingredients";
  } else if (required.every((item) => !item.stumeSlug)) {
    status = "unrepresentable";
  } else {
    // Partial mapping but may also need transforms for composition later
    status = missing.length > 0 ? "needs_ingredients" : "needs_transformations";
  }

  // Heuristic: if mapped ingredients exist but no obvious carb/protein/base meal path,
  // mark needs_transformations when we have >=3 mapped ingredients and still no seed-like completeness.
  if (status === "fully_represented") {
    const slugs = required.map((item) => item.stumeSlug!).filter(Boolean);
    const hasCookedPathHint =
      slugs.includes("eggs") ||
      slugs.includes("pasta") ||
      slugs.includes("rice") ||
      slugs.includes("bread") ||
      slugs.includes("instant-noodles") ||
      slugs.includes("frozen-chips");
    if (!hasCookedPathHint && slugs.length >= 2) {
      // Still fully represented ingredient-wise; leave as fully_represented.
    }
    void STUME_TRANSFORMS;
  }

  return {
    ...candidate,
    validationStatus: status,
    missingStumeSlugs: Array.from(new Set(missing)),
    provenance: {
      ...candidate.provenance,
      validation_status: status,
    },
  };
}

export function missingIngredientCoverage(
  candidates: StudentCandidate[],
): Array<{ slugOrName: string; recipeCoverage: number }> {
  const counts = new Map<string, number>();
  for (const candidate of candidates) {
    for (const missing of new Set(candidate.missingStumeSlugs)) {
      counts.set(missing, (counts.get(missing) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([slugOrName, recipeCoverage]) => ({ slugOrName, recipeCoverage }))
    .sort((a, b) => b.recipeCoverage - a.recipeCoverage);
}

/** Cheap-buy style unlock estimate: how many candidates become fully represented if slug existed. */
export function potentialShoppingUnlocks(
  candidates: StudentCandidate[],
  limit = 10,
): Array<{ slug: string; unlockEstimate: number }> {
  return rankCorpusSuperFoods(candidates, limit).map((item) => ({
    slug: item.slug,
    unlockEstimate: item.unlockEstimate + item.fancyUpEstimate,
  }));
}

/**
 * Corpus-level super foods: ingredients that appear in the most student
 * candidates (coverage unlock) and/or as optional fancy-ups, with a low-effort bias.
 */
export function rankCorpusSuperFoods(
  candidates: StudentCandidate[],
  limit = 12,
): Array<{
  slug: string;
  unlockEstimate: number;
  fancyUpEstimate: number;
  lowEffortScore: number;
  superFoodScore: number;
  roles: Array<"unlock" | "fancy_up">;
}> {
  const known = getStumeIngredientSlugs();
  const ingredientMeta = new Map(INGREDIENTS.map((item) => [item.slug, item]));
  const FANCY_UP_SLUGS = new Set([
    "cheese",
    "grated-cheese",
    "soy-sauce",
    "hot-sauce",
    "frozen-peas",
    "frozen-mixed-vegetables",
    "garlic",
    "garlic-powder",
    "spring-onions",
    "butter",
    "chilli flakes",
  ]);

  const rows: Array<{
    slug: string;
    unlockEstimate: number;
    fancyUpEstimate: number;
    lowEffortScore: number;
    superFoodScore: number;
    roles: Array<"unlock" | "fancy_up">;
  }> = [];

  for (const slug of known) {
    if (slug === "salt" || slug === "pepper") continue;
    let unlockEstimate = 0;
    let fancyUpEstimate = 0;
    let soleMissingUnlocks = 0;

    for (const candidate of candidates) {
      if (candidate.validationStatus === "unrepresentable") continue;

      const requiredHit = candidate.ingredients.some(
        (item) => !item.optional && item.stumeSlug === slug,
      );
      const optionalHit = candidate.ingredients.some(
        (item) => item.optional && item.stumeSlug === slug,
      );

      if (requiredHit) unlockEstimate += 1;
      if (optionalHit || (requiredHit && FANCY_UP_SLUGS.has(slug))) {
        // Count as fancy-up when marked optional, or when it's a classic low-effort upgrade ingredient present in the meal.
        if (optionalHit || FANCY_UP_SLUGS.has(slug)) fancyUpEstimate += optionalHit ? 1 : 0;
      }
      if (FANCY_UP_SLUGS.has(slug) && requiredHit && candidate.validationStatus === "fully_represented") {
        // Presence of a classic upgrade ingredient in a valid student meal.
        fancyUpEstimate += 1;
      }

      if (candidate.validationStatus !== "fully_represented") {
        const missing = new Set(candidate.missingStumeSlugs);
        if (missing.has(slug) && missing.size === 1) soleMissingUnlocks += 1;
      }
    }

    // Prefer sole-missing unlocks when available; otherwise use coverage.
    const effectiveUnlock = Math.max(soleMissingUnlocks * 3, unlockEstimate);
    const meta = ingredientMeta.get(slug);
    if (!meta) continue;
    if (effectiveUnlock === 0 && fancyUpEstimate === 0) continue;

    const lowEffortScore = Number(
      (
        (meta.costCategory === "very_cheap" ? 40 : meta.costCategory === "cheap" ? 32 : 12) +
        Math.min(meta.shelfLifeDays / 90, 1) * 25 +
        meta.versatility * 25 +
        (1 - meta.wasteRisk) * 10
      ).toFixed(2),
    );
    if (lowEffortScore < 50 && meta.costCategory !== "very_cheap" && meta.costCategory !== "cheap") {
      continue;
    }

    const roles: Array<"unlock" | "fancy_up"> = [];
    if (effectiveUnlock > 0) roles.push("unlock");
    if (fancyUpEstimate > 0) roles.push("fancy_up");

    rows.push({
      slug,
      unlockEstimate: effectiveUnlock,
      fancyUpEstimate,
      lowEffortScore,
      superFoodScore: Number(
        (effectiveUnlock * 4 + fancyUpEstimate * 6 + lowEffortScore * 0.4).toFixed(2),
      ),
      roles,
    });
  }

  for (const item of missingIngredientCoverage(candidates).slice(0, 10)) {
    if (known.has(item.slugOrName)) continue;
    // Keep graph-expansion targets visible, but below real StuMe super foods when coverage exists.
    rows.push({
      slug: `NEW:${item.slugOrName}`,
      unlockEstimate: item.recipeCoverage,
      fancyUpEstimate: 0,
      lowEffortScore: 35,
      superFoodScore: item.recipeCoverage * 3,
      roles: ["unlock"],
    });
  }

  return rows.sort((a, b) => b.superFoodScore - a.superFoodScore).slice(0, limit);
}

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
  const known = getStumeIngredientSlugs();
  const missingNames = missingIngredientCoverage(candidates)
    .map((item) => item.slugOrName)
    .filter((name) => !known.has(name));

  // Also consider StuMe essentials not present in a synthetic empty kitchen against fully mapped recipes
  const unlocks: Array<{ slug: string; unlockEstimate: number }> = [];

  for (const slug of known) {
    let unlockEstimate = 0;
    for (const candidate of candidates) {
      if (candidate.validationStatus === "fully_represented") continue;
      const missing = new Set(candidate.missingStumeSlugs);
      if (missing.has(slug) && missing.size === 1) unlockEstimate += 1;
    }
    if (unlockEstimate > 0) unlocks.push({ slug, unlockEstimate });
  }

  // Unmapped concepts that appear often are expansion targets, not purchases yet
  for (const name of missingNames.slice(0, 20)) {
    const coverage =
      candidates.filter((candidate) => candidate.missingStumeSlugs.includes(name)).length;
    unlocks.push({ slug: `NEW:${name}`, unlockEstimate: coverage });
  }

  return unlocks.sort((a, b) => b.unlockEstimate - a.unlockEstimate).slice(0, limit);
}

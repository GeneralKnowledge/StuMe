import type { StudentCandidate } from "./types";

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(easy|simple|quick|best|homemade|student|broke|lazy|perfect)\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const item of setA) if (setB.has(item)) intersection += 1;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function familyKeyFromCandidate(candidate: StudentCandidate): string {
  const cores = candidate.ingredients
    .filter((item) => !item.optional)
    .map((item) => item.stumeSlug ?? item.normalizedName)
    .sort();
  return `${candidate.studentLevel}|${cores.join("+")}|${normalizeTitle(candidate.title)}`;
}

/** Coarse key for near-duplicate collapse without O(n²) pairwise checks. */
function nearDupeKey(candidate: StudentCandidate): string {
  const title = normalizeTitle(candidate.title);
  const concepts = candidate.ingredients
    .map((item) => item.stumeSlug ?? item.normalizedName)
    .sort()
    .join("+");
  return `${candidate.studentLevel}|${concepts}|${title}`;
}

/**
 * Keep diversity of useful meals, not maximum count.
 * Near-identical titles + ingredient sets collapse; meaningful level variants can remain.
 *
 * Uses O(n log n) sort + O(n) hash keys. For small inputs (< 2500) also runs the
 * original pairwise Jaccard pass so tiny fixture behaviour stays unchanged.
 */
export function dedupeCandidates(candidates: StudentCandidate[]): StudentCandidate[] {
  const sorted = [...candidates].sort((a, b) => b.score.total - a.score.total);
  const kept: StudentCandidate[] = [];
  const seenFamily = new Set<string>();
  const seenNear = new Set<string>();

  for (const candidate of sorted) {
    const family = familyKeyFromCandidate(candidate);
    if (seenFamily.has(family)) continue;
    const near = nearDupeKey(candidate);
    if (seenNear.has(near)) continue;

    seenFamily.add(family);
    seenNear.add(near);
    kept.push({
      ...candidate,
      familyKey: family,
    });
  }

  // Preserve previous pairwise behaviour on small corpora (unit fixtures).
  if (kept.length <= 2500) {
    const pairwise: StudentCandidate[] = [];
    for (const candidate of kept) {
      const title = normalizeTitle(candidate.title);
      const concepts = candidate.ingredients.map((item) => item.stumeSlug ?? item.normalizedName);
      const duplicate = pairwise.some((existing) => {
        if (existing.studentLevel !== candidate.studentLevel) return false;
        const existingTitle = normalizeTitle(existing.title);
        const existingConcepts = existing.ingredients.map(
          (item) => item.stumeSlug ?? item.normalizedName,
        );
        const titleSimilar =
          existingTitle === title ||
          existingTitle.includes(title) ||
          title.includes(existingTitle);
        const ingredientSimilar = jaccard(existingConcepts, concepts) >= 0.9;
        return titleSimilar && ingredientSimilar;
      });
      if (!duplicate) pairwise.push(candidate);
    }
    return pairwise;
  }

  return kept;
}

export function estimateNearDuplicates(titles: string[]): number {
  const families = new Map<string, number>();
  for (const title of titles) {
    const key = normalizeTitle(title);
    if (!key) continue;
    families.set(key, (families.get(key) ?? 0) + 1);
  }
  let extras = 0;
  for (const count of families.values()) {
    if (count > 1) extras += count - 1;
  }
  return extras;
}

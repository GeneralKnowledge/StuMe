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

/**
 * Keep diversity of useful meals, not maximum count.
 * Near-identical titles + ingredient sets collapse; meaningful level variants can remain.
 */
export function dedupeCandidates(candidates: StudentCandidate[]): StudentCandidate[] {
  const sorted = [...candidates].sort((a, b) => b.score.total - a.score.total);
  const kept: StudentCandidate[] = [];

  for (const candidate of sorted) {
    const title = normalizeTitle(candidate.title);
    const concepts = candidate.ingredients.map((item) => item.stumeSlug ?? item.normalizedName);
    const duplicate = kept.some((existing) => {
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
    if (!duplicate) {
      kept.push({
        ...candidate,
        familyKey: familyKeyFromCandidate(candidate),
      });
    }
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

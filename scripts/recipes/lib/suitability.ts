import { COMMON_EQUIPMENT, INGREDIENT_META, SPECIALIST_EQUIPMENT } from "./config";
import { lookupMeta, normalizeRecipeIngredients } from "./normalize";
import type { RawRecipeNlgRow, ScoreComponents } from "./types";

function estimateMinutes(directions: string[]): number {
  const joined = directions.join(" ").toLowerCase();
  const minuteMatches = [...joined.matchAll(/(\d+)\s*(minutes?|mins?)/g)].map((m) =>
    Number(m[1]),
  );
  if (minuteMatches.length > 0) return Math.max(...minuteMatches);
  // Heuristic: ~3 minutes per step baseline
  return Math.min(90, Math.max(5, directions.length * 3));
}

export function detectEquipment(directions: string[]): string[] {
  const text = directions.join(" ").toLowerCase();
  const found = new Set<string>();

  for (const item of [...COMMON_EQUIPMENT, ...SPECIALIST_EQUIPMENT]) {
    if (text.includes(item)) found.add(item);
  }
  if (/\bmicrowave\b/.test(text)) found.add("microwave");
  if (/\boven\b|\bbake\b/.test(text)) found.add("oven");
  if (/\bskillet\b|\bfry\b/.test(text) || /\bfrying pan\b/.test(text)) {
    found.add("frying pan");
  }
  if (/\bsaucepan\b|\bsimmer\b|\bboil\b/.test(text)) found.add("saucepan");
  if (/\bbowl\b/.test(text)) found.add("bowl");
  if (/\bknife\b|\bchop\b|\bslice\b/.test(text)) found.add("knife");

  // Count pan mentions for multi-pan detection later
  const panMentions = (text.match(/\b(pan|skillet|saucepan|pot)\b/g) ?? []).length;
  if (panMentions >= 3) found.add("multiple pans");

  return [...found];
}

export function scoreStudentSuitability(row: RawRecipeNlgRow): ScoreComponents {
  const normalized = normalizeRecipeIngredients(row);
  const equipment = detectEquipment(row.directions);
  const minutes = estimateMinutes(row.directions);

  let ingredientReward = 0;
  let ingredientPenalty = 0;
  for (const item of normalized) {
    const meta =
      lookupMeta(item.normalizedName) ??
      INGREDIENT_META.find((entry) => entry.stumeSlug === item.stumeSlug);
    if (!meta) {
      ingredientPenalty += 1.5;
      continue;
    }
    ingredientReward += meta.studentReward;
    ingredientPenalty += meta.specialistPenalty;
    if (meta.rarity === "specialist") ingredientPenalty += 2;
    if (meta.rarity === "luxury") ingredientPenalty += 4;
  }

  let complexityReward = 0;
  let complexityPenalty = 0;
  const ingredientCount = row.ingredients.length || normalized.length;
  const stepCount = row.directions.length;

  if (ingredientCount <= 7) complexityReward += 6;
  else if (ingredientCount <= 10) complexityReward += 2;
  else complexityPenalty += (ingredientCount - 10) * 1.5;

  if (stepCount <= 6) complexityReward += 5;
  else if (stepCount <= 8) complexityReward += 1;
  else complexityPenalty += (stepCount - 8) * 1.2;

  if (minutes <= 15) complexityReward += 6;
  else if (minutes <= 30) complexityReward += 4;
  else if (minutes <= 45) complexityReward += 1;
  else complexityPenalty += Math.min(12, (minutes - 45) / 5);

  const joined = row.directions.join(" ").toLowerCase();
  if (/\bone[- ]pan\b|\bsame pan\b/.test(joined)) complexityReward += 4;
  if (/\bmicrowave\b/.test(joined)) complexityReward += 3;
  if (/\bstovetop\b|\bfrying pan\b|\bskillet\b/.test(joined)) complexityReward += 2;
  if (/\bmeanwhile\b|\bseparately\b|\bin another\b/.test(joined)) complexityPenalty += 4;

  let equipmentReward = 0;
  let equipmentPenalty = 0;
  for (const item of equipment) {
    if (COMMON_EQUIPMENT.includes(item)) equipmentReward += 1.5;
    if (SPECIALIST_EQUIPMENT.includes(item) || item === "multiple pans") {
      equipmentPenalty += 4;
    }
  }
  if (equipment.length === 0) equipmentReward += 2;
  if (equipment.length <= 2) equipmentReward += 2;

  const total =
    ingredientReward -
    ingredientPenalty +
    complexityReward -
    complexityPenalty +
    equipmentReward -
    equipmentPenalty;

  return {
    ingredientReward,
    ingredientPenalty,
    complexityReward,
    complexityPenalty,
    equipmentReward,
    equipmentPenalty,
    total,
  };
}

export function estimateRecipeMinutes(row: RawRecipeNlgRow): number {
  return estimateMinutes(row.directions);
}

export function passesBasicValidity(row: RawRecipeNlgRow): boolean {
  if (!row.title?.trim()) return false;
  if (row.ingredients.length < 2) return false;
  if (row.directions.length < 1) return false;
  if (row.ingredients.length > 20) return false;
  if (row.directions.length > 20) return false;
  return true;
}

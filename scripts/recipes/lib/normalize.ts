import { INGREDIENT_META, type IngredientMeta } from "./config";
import type { NormalizedIngredient, RawRecipeNlgRow } from "./types";

function stripQuantity(text: string): string {
  return text
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/\b\d+([./]\d+)?\s*(cups?|cup|c\.|tbsp\.?|tsp\.?|tablespoons?|teaspoons?|oz\.?|ounces?|lbs?\.?|pounds?|g|kg|ml|l|cloves?|cans?|packets?|slices?|pieces?)?\b/gi, " ")
    .replace(/\b(large|small|medium|fresh|frozen|canned|tinned|chopped|diced|minced|sliced|shredded|grated|optional|to taste)\b/gi, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildAliasIndex(meta: IngredientMeta[]): Array<{ alias: string; meta: IngredientMeta }> {
  const entries: Array<{ alias: string; meta: IngredientMeta }> = [];
  for (const item of meta) {
    for (const alias of item.aliases) {
      entries.push({ alias: alias.toLowerCase(), meta: item });
    }
    entries.push({ alias: item.concept.toLowerCase(), meta: item });
  }
  return entries.sort((a, b) => b.alias.length - a.alias.length);
}

const ALIAS_INDEX = buildAliasIndex(INGREDIENT_META);

export function normalizeIngredientText(originalText: string): NormalizedIngredient {
  const lowered = originalText.toLowerCase();
  const notes: string[] = [];

  // Prefer tinned/canned tomato before generic tomato (stripQuantity removes "canned"/"diced").
  if (/\b(canned|tinned|chopped|diced|crushed)\b.*\btomatoes?\b|\btomatoes?\b.*\b(canned|tinned)\b/.test(lowered)) {
    return {
      originalText,
      normalizedName: "tinned tomato",
      stumeSlug: "chopped-tomatoes",
      confidence: 0.95,
      notes: ["tinned/canned tomato priority match"],
    };
  }

  const cleaned = stripQuantity(originalText);

  if (!cleaned) {
    return {
      originalText,
      normalizedName: "",
      stumeSlug: null,
      confidence: 0,
      notes: ["empty after cleaning"],
    };
  }

  for (const entry of ALIAS_INDEX) {
    if (cleaned === entry.alias || cleaned.includes(entry.alias)) {
      if (cleaned !== entry.alias) notes.push(`matched alias "${entry.alias}"`);
      return {
        originalText,
        normalizedName: entry.meta.concept,
        stumeSlug: entry.meta.stumeSlug ?? null,
        confidence: cleaned === entry.alias ? 1 : 0.85,
        notes,
      };
    }
  }

  // Soft pasta/noodle family catch
  if (/\b(spaghetti|penne|fusilli|macaroni|linguine)\b/.test(cleaned)) {
    return {
      originalText,
      normalizedName: "pasta",
      stumeSlug: "pasta",
      confidence: 0.8,
      notes: ["pasta shape family"],
    };
  }

  notes.push("unmapped");
  return {
    originalText,
    normalizedName: cleaned,
    stumeSlug: null,
    confidence: 0.2,
    notes,
  };
}

export function normalizeRecipeIngredients(row: RawRecipeNlgRow): NormalizedIngredient[] {
  const fromLines = row.ingredients.map(normalizeIngredientText);
  // Prefer NER tokens when line mapping fails hard
  if (row.ner.length > 0) {
    const nerMapped = row.ner.map((token) => normalizeIngredientText(token));
    const merged = [...fromLines];
    for (const nerItem of nerMapped) {
      if (!nerItem.stumeSlug && !nerItem.normalizedName) continue;
      const exists = merged.some(
        (item) =>
          item.stumeSlug === nerItem.stumeSlug &&
          item.normalizedName === nerItem.normalizedName,
      );
      if (!exists && nerItem.confidence >= 0.8) {
        merged.push({ ...nerItem, notes: [...nerItem.notes, "from NER"] });
      }
    }
    return merged.filter((item) => item.normalizedName);
  }
  return fromLines.filter((item) => item.normalizedName);
}

export function lookupMeta(conceptOrText: string): IngredientMeta | undefined {
  const normalized = normalizeIngredientText(conceptOrText);
  return INGREDIENT_META.find((item) => item.concept === normalized.normalizedName);
}

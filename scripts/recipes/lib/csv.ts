import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type { RawRecipeNlgRow } from "./types";

/** Parse RecipeNLG list cells that are Python/JSON list literals. */
export function parseListCell(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed === "[]") return [];

  try {
    const asJson = trimmed
      .replace(/\bNone\b/g, "null")
      .replace(/\bTrue\b/g, "true")
      .replace(/\bFalse\b/g, "false")
      .replace(/'/g, '"');
    const parsed = JSON.parse(asJson) as unknown;
    if (Array.isArray(parsed)) return parsed.map((item) => String(item));
  } catch {
    // fall through
  }

  // Last-resort split for malformed cells
  const inner = trimmed.replace(/^\[/, "").replace(/\]$/, "");
  if (!inner.trim()) return [];
  return inner
    .split(/","|',\s*'|",\s*'|',\s*"/)
    .map((part) => part.replace(/^["']|["']$/g, "").trim())
    .filter(Boolean);
}

/** Minimal RFC4180-ish CSV line parser supporting quoted fields. */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

export function rowFromFields(fields: string[]): RawRecipeNlgRow | null {
  if (fields.length < 7) return null;
  const [id, title, ingredientsRaw, directionsRaw, link, source, nerRaw] = fields;
  if (!id || title === undefined) return null;
  return {
    id: String(id),
    title: String(title ?? ""),
    ingredients: parseListCell(ingredientsRaw ?? "[]"),
    directions: parseListCell(directionsRaw ?? "[]"),
    link: String(link ?? ""),
    source: String(source ?? "unknown"),
    ner: parseListCell(nerRaw ?? "[]"),
  };
}

/** Preferred “clean” corpus labels for student sampling. */
export function isGatheredSource(source: string): boolean {
  const normalized = source.trim().toLowerCase();
  return (
    normalized === "gathered" ||
    normalized === "foodcom" ||
    normalized === "food.com" ||
    normalized === "iris314"
  );
}

/** Deterministic unit hash in [0, 1). Stable across runs for the same key. */
export function unitHash(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 2 ** 32;
}

function pushReservoir(
  reservoir: RawRecipeNlgRow[],
  row: RawRecipeNlgRow,
  seen: number,
  limit: number,
): void {
  if (reservoir.length < limit) {
    reservoir.push(row);
    return;
  }
  const j = Math.floor(unitHash(`${row.id}:${seen}`) * seen);
  if (j < limit) reservoir[j] = row;
}

export async function* iterateRecipeNlgCsv(
  filePath: string,
  options?: { limit?: number; skipHeader?: boolean },
): AsyncGenerator<RawRecipeNlgRow> {
  const stream = createReadStream(filePath, { encoding: "utf8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let index = 0;
  let yielded = 0;
  const limit = options?.limit;
  const skipHeader = options?.skipHeader ?? true;

  try {
    for await (const line of rl) {
      if (!line.trim()) continue;
      if (skipHeader && index === 0 && /^,?(id|title)/i.test(line)) {
        index += 1;
        continue;
      }
      index += 1;
      const row = rowFromFields(parseCsvLine(line));
      if (!row) continue;
      yield row;
      yielded += 1;
      if (limit !== undefined && yielded >= limit) break;
    }
  } finally {
    rl.close();
    stream.destroy();
  }
}

export async function loadAllRecipes(
  filePath: string,
  options?: { limit?: number },
): Promise<RawRecipeNlgRow[]> {
  const rows: RawRecipeNlgRow[] = [];
  for await (const row of iterateRecipeNlgCsv(filePath, options)) {
    rows.push(row);
  }
  return rows;
}

export interface SampleCsvOptions {
  /** Max recipes to keep in the working sample (default 5000). */
  limit?: number;
  /**
   * Prefer RecipeNLG `Gathered` rows via streaming reservoir sampling.
   * If fewer than `limit` Gathered rows exist, fill remaining slots from other sources.
   */
  preferGathered?: boolean;
  /** Only keep Gathered rows (no Recipes1M fill-in). */
  gatheredOnly?: boolean;
}

export interface SampleCsvResult {
  rows: RawRecipeNlgRow[];
  scannedTotal: number;
  gatheredSeen: number;
  otherSeen: number;
  sampledGathered: number;
  sampledOther: number;
}

/**
 * Stream a RecipeNLG CSV and keep a bounded, deterministic sample.
 * Designed for multi-million-row `full_dataset.csv` without loading it all into memory.
 */
export async function sampleRecipeNlgCsv(
  filePath: string,
  options?: SampleCsvOptions,
): Promise<SampleCsvResult> {
  const limit = options?.limit ?? 5000;
  const preferGathered = options?.preferGathered ?? true;
  const gatheredOnly = options?.gatheredOnly ?? false;

  const gathered: RawRecipeNlgRow[] = [];
  const others: RawRecipeNlgRow[] = [];
  let scannedTotal = 0;
  let gatheredSeen = 0;
  let otherSeen = 0;

  for await (const row of iterateRecipeNlgCsv(filePath)) {
    scannedTotal += 1;
    if (isGatheredSource(row.source)) {
      gatheredSeen += 1;
      if (preferGathered || gatheredOnly) {
        pushReservoir(gathered, row, gatheredSeen, limit);
      } else {
        pushReservoir(others, row, scannedTotal, limit);
      }
      continue;
    }

    otherSeen += 1;
    if (gatheredOnly) continue;
    if (preferGathered) {
      // Keep a fill-in reservoir in case Gathered is short.
      pushReservoir(others, row, otherSeen, limit);
    } else {
      pushReservoir(others, row, scannedTotal, limit);
    }
  }

  let rows: RawRecipeNlgRow[];
  if (!preferGathered && !gatheredOnly) {
    rows = others.slice(0, limit);
  } else if (gathered.length >= limit || gatheredOnly) {
    rows = gathered.slice(0, limit);
  } else {
    rows = [...gathered, ...others.slice(0, Math.max(0, limit - gathered.length))];
  }

  const sampledGathered = rows.filter((row) => isGatheredSource(row.source)).length;
  const sampledOther = rows.length - sampledGathered;

  return {
    rows,
    scannedTotal,
    gatheredSeen,
    otherSeen,
    sampledGathered,
    sampledOther,
  };
}

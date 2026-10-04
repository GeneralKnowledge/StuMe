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

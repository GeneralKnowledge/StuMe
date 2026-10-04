import { createReadStream, createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import path from "node:path";
import { parseCsvLine, parseListCell } from "./csv";

export type CorpusFormat = "recifine" | "foodcom" | "iris314" | "recipenlg";

export const CORPUS_URLS = {
  recifine: "https://huggingface.co/datasets/nuhuibrahim/recifine/resolve/main/ReciFine.csv",
  iris314: "https://huggingface.co/datasets/Iris314/recipe-cleaned/resolve/main/recipes.csv",
} as const;

export interface ImportCorpusOptions {
  format: CorpusFormat;
  /** Local path or remote URL. */
  input: string;
  outputPath: string;
  limit?: number;
  /** Prefer Gathered rows when the source column exists (ReciFine / RecipeNLG). */
  gatheredOnly?: boolean;
}

export interface ImportCorpusResult {
  written: number;
  scanned: number;
  skipped: number;
  outputPath: string;
  format: CorpusFormat;
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function asListLiteral(items: string[]): string {
  return JSON.stringify(items);
}

function normalizeListField(raw: string | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") || trimmed.startsWith('"[')) {
    return parseListCell(trimmed.replace(/^"|"$/g, ""));
  }
  return trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function lineInQuotes(line: string): boolean {
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === '"') {
      if (inQuotes && line[i + 1] === '"') i += 1;
      else inQuotes = !inQuotes;
    }
  }
  return inQuotes;
}

/** Quote-aware physical→logical line assembly for CSV streams. */
export async function* iterateLogicalCsvLines(
  input: NodeJS.ReadableStream,
): AsyncGenerator<string> {
  const rl = createInterface({ input, crlfDelay: Infinity });
  let buffer = "";

  try {
    for await (const physical of rl) {
      buffer = buffer ? `${buffer}\n${physical}` : physical;
      if (!lineInQuotes(buffer)) {
        const line = buffer;
        buffer = "";
        if (line.trim()) yield line;
      }
    }
    if (buffer.trim()) yield buffer;
  } finally {
    rl.close();
  }
}

function headerIndex(headerFields: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headerFields.forEach((name, index) => {
    map[name.trim().toLowerCase()] = index;
  });
  return map;
}

function field(fields: string[], index: Record<string, number>, ...names: string[]): string {
  for (const name of names) {
    const idx = index[name.toLowerCase()];
    if (idx !== undefined && fields[idx] !== undefined) return fields[idx]!;
  }
  return "";
}

function toRecipeNlgLine(args: {
  id: string;
  title: string;
  ingredients: string[];
  directions: string[];
  link: string;
  source: string;
  ner: string[];
}): string {
  return [
    args.id,
    csvEscape(args.title),
    csvEscape(asListLiteral(args.ingredients)),
    csvEscape(asListLiteral(args.directions)),
    csvEscape(args.link),
    csvEscape(args.source),
    csvEscape(asListLiteral(args.ner)),
  ].join(",");
}

async function openInputStream(input: string): Promise<NodeJS.ReadableStream> {
  if (/^https?:\/\//i.test(input)) {
    const response = await fetch(input);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download ${input}: HTTP ${response.status}`);
    }
    return Readable.fromWeb(response.body as import("node:stream/web").ReadableStream);
  }
  return createReadStream(input, { encoding: "utf8" });
}

/**
 * Convert ReciFine / Food.com / Iris314 / RecipeNLG inputs into a RecipeNLG-shaped CSV
 * the existing StuMe sampler can consume.
 */
export async function importCorpusToRecipeNlg(
  options: ImportCorpusOptions,
): Promise<ImportCorpusResult> {
  await mkdir(path.dirname(options.outputPath), { recursive: true });
  const input = await openInputStream(options.input);
  const out = createWriteStream(options.outputPath, { encoding: "utf8" });
  out.write(",title,ingredients,directions,link,source,NER\n");

  let scanned = 0;
  let written = 0;
  let skipped = 0;
  let header: Record<string, number> | null = null;
  const gatheredOnly = options.gatheredOnly ?? options.format === "recifine";
  const limit = options.limit;

  try {
    for await (const line of iterateLogicalCsvLines(input)) {
      if (!header) {
        header = headerIndex(parseCsvLine(line));
        continue;
      }
      scanned += 1;
      const fields = parseCsvLine(line);
      const mapped = mapRow(options.format, fields, header, written + 1);
      if (!mapped) {
        skipped += 1;
        continue;
      }
      if (
        gatheredOnly &&
        options.format !== "foodcom" &&
        options.format !== "iris314" &&
        !/^gathered$/i.test(mapped.source)
      ) {
        skipped += 1;
        continue;
      }
      if (!mapped.title || mapped.ingredients.length === 0) {
        skipped += 1;
        continue;
      }
      out.write(`${toRecipeNlgLine(mapped)}\n`);
      written += 1;
      if (limit !== undefined && written >= limit) break;
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      out.end(() => resolve());
      out.on("error", reject);
    });
  }

  return {
    written,
    scanned,
    skipped,
    outputPath: options.outputPath,
    format: options.format,
  };
}

function mapRow(
  format: CorpusFormat,
  fields: string[],
  header: Record<string, number>,
  nextId: number,
): {
  id: string;
  title: string;
  ingredients: string[];
  directions: string[];
  link: string;
  source: string;
  ner: string[];
} | null {
  if (format === "recipenlg") {
    if (fields.length < 7) return null;
    return {
      id: fields[0] || String(nextId),
      title: fields[1] ?? "",
      ingredients: parseListCell(fields[2] ?? "[]"),
      directions: parseListCell(fields[3] ?? "[]"),
      link: fields[4] ?? "",
      source: fields[5] ?? "Gathered",
      ner: parseListCell(fields[6] ?? "[]"),
    };
  }

  if (format === "recifine") {
    const title = field(fields, header, "title", "name");
    const ingredients = normalizeListField(field(fields, header, "ingredients"));
    const directions = normalizeListField(field(fields, header, "directions", "steps"));
    const link = field(fields, header, "link");
    const source = field(fields, header, "source") || "Gathered";
    const ner = normalizeListField(field(fields, header, "ner"));
    return {
      id: String(nextId),
      title,
      ingredients,
      directions,
      link,
      source,
      ner: ner.length ? ner : ingredients.map((item) => item.toLowerCase()),
    };
  }

  const title = field(fields, header, "name", "title");
  const id = field(fields, header, "id") || String(nextId);
  const ingredients = normalizeListField(field(fields, header, "ingredients"));
  const directions = normalizeListField(field(fields, header, "steps", "directions"));
  const link = field(fields, header, "link") || (id ? `https://www.food.com/recipe/${id}` : "");
  return {
    id: String(id),
    title,
    ingredients,
    directions,
    link,
    source: "FoodCom",
    ner: ingredients.map((item) => item.toLowerCase()),
  };
}

import { existsSync } from "node:fs";
import path from "node:path";

const CANDIDATES_ROOT = path.join(
  process.cwd(),
  "data",
  "generated",
  "student-candidates",
);

/** Named corpus snapshots under data/generated/student-candidates/. */
const NAMED_CORPORA = ["demo", "refined", "valid-5k"] as const;

export type NamedCorpus = (typeof NAMED_CORPORA)[number];

/**
 * Resolve which curated candidates.json to load.
 *
 * `STUME_CORPUS`:
 * - `demo` | `refined` | `valid-5k` — named snapshot
 * - `none` | `off` — skip corpus
 * - relative/absolute path to a candidates.json (or its directory)
 * - unset — prefer `demo` when present, else `refined`
 */
export function resolveCorpusCandidatesPath(
  envValue: string | undefined = process.env.STUME_CORPUS,
): string | null {
  const raw = envValue?.trim();
  if (raw === "none" || raw === "off") {
    return null;
  }

  if (raw && (NAMED_CORPORA as readonly string[]).includes(raw)) {
    const named = path.join(CANDIDATES_ROOT, raw, "candidates.json");
    return existsSync(named) ? named : null;
  }

  if (raw) {
    const asFile = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
    if (existsSync(asFile) && asFile.endsWith(".json")) {
      return asFile;
    }
    const asDir = path.join(asFile, "candidates.json");
    if (existsSync(asDir)) {
      return asDir;
    }
    return null;
  }

  const demo = path.join(CANDIDATES_ROOT, "demo", "candidates.json");
  if (existsSync(demo)) {
    return demo;
  }

  const refined = path.join(CANDIDATES_ROOT, "refined", "candidates.json");
  if (existsSync(refined)) {
    return refined;
  }

  return null;
}

export function corpusLabel(candidatesPath: string | null): string {
  if (!candidatesPath) {
    return "none";
  }
  const parent = path.basename(path.dirname(candidatesPath));
  if ((NAMED_CORPORA as readonly string[]).includes(parent)) {
    return parent;
  }
  return candidatesPath;
}

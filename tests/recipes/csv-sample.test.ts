import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isGatheredSource, sampleRecipeNlgCsv, unitHash } from "../../scripts/recipes/lib/csv";

function writeCsv(rows: Array<[string, string, string]>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "stume-csv-"));
  const file = path.join(dir, "sample.csv");
  const lines = [",title,ingredients,directions,link,source,NER"];
  for (const [id, title, source] of rows) {
    lines.push(
      [
        id,
        title,
        JSON.stringify(["eggs", "rice", "soy sauce", "oil"]),
        JSON.stringify(["Fry everything."]),
        `example.com/${id}`,
        source,
        JSON.stringify(["eggs", "rice", "soy sauce", "oil"]),
      ].join(","),
    );
  }
  writeFileSync(file, `${lines.join("\n")}\n`);
  return file;
}

describe("sampleRecipeNlgCsv", () => {
  it("keeps a deterministic Gathered-preferring reservoir under the limit", async () => {
    const rows: Array<[string, string, string]> = [];
    for (let i = 1; i <= 40; i += 1) {
      rows.push([String(i), `Recipe ${i}`, i % 4 === 0 ? "Recipes1M" : "Gathered"]);
    }
    const file = writeCsv(rows);

    const a = await sampleRecipeNlgCsv(file, { limit: 10, preferGathered: true });
    const b = await sampleRecipeNlgCsv(file, { limit: 10, preferGathered: true });

    expect(a.scannedTotal).toBe(40);
    expect(a.gatheredSeen).toBe(30);
    expect(a.otherSeen).toBe(10);
    expect(a.rows).toHaveLength(10);
    expect(a.sampledGathered).toBe(10);
    expect(a.sampledOther).toBe(0);
    expect(a.rows.map((row) => row.id)).toEqual(b.rows.map((row) => row.id));
    expect(a.rows.every((row) => isGatheredSource(row.source))).toBe(true);
  });

  it("fills from other sources when Gathered is short", async () => {
    const rows: Array<[string, string, string]> = [
      ["1", "G1", "Gathered"],
      ["2", "G2", "Gathered"],
      ["3", "R1", "Recipes1M"],
      ["4", "R2", "Recipes1M"],
      ["5", "R3", "Recipes1M"],
    ];
    const file = writeCsv(rows);
    const sample = await sampleRecipeNlgCsv(file, { limit: 4, preferGathered: true });
    expect(sample.rows).toHaveLength(4);
    expect(sample.sampledGathered).toBe(2);
    expect(sample.sampledOther).toBe(2);
  });

  it("supports gathered-only mode", async () => {
    const rows: Array<[string, string, string]> = [
      ["1", "G1", "Gathered"],
      ["2", "R1", "Recipes1M"],
      ["3", "G2", "Gathered"],
    ];
    const file = writeCsv(rows);
    const sample = await sampleRecipeNlgCsv(file, { limit: 10, gatheredOnly: true });
    expect(sample.rows).toHaveLength(2);
    expect(sample.sampledOther).toBe(0);
  });

  it("hashes stably", () => {
    expect(unitHash("abc")).toBe(unitHash("abc"));
    expect(unitHash("abc")).not.toBe(unitHash("abd"));
  });
});

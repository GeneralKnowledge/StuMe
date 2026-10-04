#!/usr/bin/env tsx
/**
 * Bulk expand: ReciFine → sample pipeline → refine → optional DB ingest.
 *
 * Example (gather as much as possible for testing):
 *   npm run recipes:expand -- --limit 100000 --ingest
 */
import { spawn } from "node:child_process";
import path from "node:path";

function argValue(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx < 0) return undefined;
  return args[idx + 1];
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`));
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const limit = Number(argValue(args, "--limit") ?? 100000);
  const doIngest = args.includes("--ingest");
  const format = argValue(args, "--format") ?? "recifine";
  const imported = path.join(
    "data",
    "external",
    format === "iris314" || format === "foodcom" ? "foodcom" : "recifine",
    `sample_${limit}.csv`,
  );
  const sampleDir = path.join("data", "generated", "student-candidates", "sample");
  const refinedDir = path.join("data", "generated", "student-candidates", "refined");

  console.log(
    JSON.stringify(
      {
        step: "expand",
        format,
        limit,
        imported,
        ingest: doIngest,
      },
      null,
      2,
    ),
  );

  await run("npm", [
    "run",
    "recipes:import",
    "--",
    "--format",
    format,
    "--limit",
    String(limit),
    "--out",
    imported,
  ]);

  await run("npm", [
    "run",
    "recipes:sample",
    "--",
    imported,
    "--limit",
    String(limit),
    ...(format === "recifine" ? ["--gathered-only"] : []),
  ]);

  await run("npm", [
    "run",
    "recipes:refine",
    "--",
    "--input",
    path.join(sampleDir, "candidates.json"),
    "--out",
    refinedDir,
    "--limit",
    "0",
    "--no-struggle-caps",
  ]);

  if (doIngest) {
    await run("npm", ["run", "db:seed"]);
  }

  console.log("\nExpand complete.");
  console.log(`Imported CSV: ${imported}`);
  console.log(`Refined corpus: ${refinedDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

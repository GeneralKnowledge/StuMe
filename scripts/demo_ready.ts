#!/usr/bin/env tsx
/**
 * One-shot: curate demo corpus → reset DB → seed with demo kitchen → validate recommendations.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const DEMO_CANDIDATES = path.join(
  "data",
  "generated",
  "student-candidates",
  "demo",
  "candidates.json",
);
const REFINED_CANDIDATES = path.join(
  "data",
  "generated",
  "student-candidates",
  "refined",
  "candidates.json",
);

function run(
  command: string,
  args: string[],
  env: Partial<NodeJS.ProcessEnv> = {},
): void {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${result.status ?? "?"}`);
  }
}

function main() {
  if (!existsSync(REFINED_CANDIDATES)) {
    throw new Error(
      `Missing refined corpus at ${REFINED_CANDIDATES}. Run recipes:expand / recipes:refine first.`,
    );
  }

  console.log("=== StuMe demo:ready ===");
  run("npx", ["tsx", "scripts/recipes/curate_demo.ts"]);

  if (!existsSync(DEMO_CANDIDATES)) {
    throw new Error(`Curate finished but ${DEMO_CANDIDATES} is missing.`);
  }

  run("npx", ["prisma", "db", "push"]);
  run("npx", ["tsx", "prisma/seed.ts"], { STUME_CORPUS: "demo" });
  run("npx", ["tsx", "scripts/demo.ts"], { STUME_CORPUS: "demo" });

  console.log("\n=== Demo ready ===");
  console.log("Start the app with: npm run dev");
  console.log("Open http://localhost:3000 — Demo Kitchen is preloaded (rice/eggs/mushrooms/…).");
  console.log("Use “Try a demo kitchen” on the home page for other inventories.");
}

main();

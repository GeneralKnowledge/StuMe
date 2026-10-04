import { buildGraphFromSeed } from "../src/lib/graph/buildFromSeed";
import { createKitchenState } from "../src/lib/graph/engine";
import { getRecommendations } from "../src/lib/cache/recommend";
import { DisabledRecipeGenerator } from "../src/lib/llm/generator";

const INVENTORIES: Record<string, string[]> = {
  "Nearly empty kitchen": ["bread", "eggs", "butter", "cheese"],
  "Basic student kitchen": ["rice", "eggs", "onions", "cheese", "butter"],
  "Random fridge": ["mushrooms", "milk", "cheese", "eggs", "bread"],
  "Cheap cupboard": ["pasta", "chopped-tomatoes", "baked-beans", "onions", "cheese"],
  "Freezer-heavy kitchen": ["frozen-chips", "frozen-peas", "eggs", "cheese"],
  "Microwave student": [
    "microwave-rice",
    "instant-noodles",
    "eggs",
    "cheese",
    "frozen-mixed-vegetables",
  ],
};

async function main() {
  const graph = buildGraphFromSeed({ includeCorpus: true });
  const corpusCount = graph.recipes.filter((recipe) => recipe.generationSource === "corpus").length;
  console.log("=== StuMe seed + corpus validation demo ===");
  console.log(
    `Graph: ${graph.ingredients.size} ingredients, ${graph.transformations.length} transforms, ${graph.recipes.length} recipes (${corpusCount} corpus)\n`,
  );

  for (const [name, slugs] of Object.entries(INVENTORIES)) {
    const kitchen = createKitchenState(slugs, {
      expiringSlugs: slugs.filter((slug) =>
        ["mushrooms", "bread", "milk", "spinach"].includes(slug),
      ),
    });
    const result = await getRecommendations(graph, kitchen, {
      generator: new DisabledRecipeGenerator(),
      minMakeNow: 2,
    });

    console.log(`## ${name}`);
    console.log(`Inventory: ${slugs.join(", ")}`);
    console.log("Make now:");
    for (const recipe of result.makeNow.slice(0, 5)) {
      console.log(
        `  - ${recipe.recipe.title} (${recipe.recipe.timeMinutes}m, score ${Math.round(recipe.score)})`,
      );
    }
    console.log("Almost there:");
    for (const recipe of result.almostThere.slice(0, 3)) {
      console.log(
        `  - ${recipe.recipe.title} (needs ${recipe.missingRequired.join(", ") || "n/a"})`,
      );
    }
    console.log("Good next buys:");
    for (const buy of result.goodNextBuys.slice(0, 3)) {
      console.log(
        `  - ${buy.ingredientName} [${buy.costCategory}] unlocks ${buy.mealUnlockValue}: ${buy.unlockedRecipeTitles.slice(0, 3).join("; ")}`,
      );
    }
    console.log("Super foods:");
    for (const buy of result.superFoods.slice(0, 3)) {
      console.log(
        `  - ${buy.ingredientName} [${buy.roles.join("+")}] unlock ${buy.mealUnlockValue}, fancy-up ${buy.mealsFanciedUp}, low-effort ${buy.lowEffortScore}`,
      );
    }
    console.log(
      `Bundle of 3: ${result.bundleBuys.map((item) => item.ingredientName).join(", ")}\n`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

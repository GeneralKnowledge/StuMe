import type { FoodGraph } from "@/lib/graph/engine";
import { rankRecipes } from "@/lib/scoring/score";
import { recommendPurchases, recommendSuperFoods, topEssentialsBundle } from "@/lib/shopping/recommend";
import type {
  GenerationConstraints,
  KitchenState,
  RecipeCandidate,
  ShoppingUnlock,
} from "@/lib/types";
import type { RecipeGenerator } from "@/lib/llm/generator";
import { toGraphRecipe, validateRecipeDraft } from "@/lib/validation/recipes";

export interface RecommendationResult {
  makeNow: RecipeCandidate[];
  almostThere: RecipeCandidate[];
  useSoon: RecipeCandidate[];
  goodNextBuys: ShoppingUnlock[];
  bundleBuys: ShoppingUnlock[];
  superFoods: ShoppingUnlock[];
  generatedCount: number;
  usedGenerator: boolean;
}

export interface CacheHooks {
  getRejectedSignatures: () => Promise<Set<string>>;
  saveRecipes: (recipes: ReturnType<typeof toGraphRecipe>[]) => Promise<void>;
  saveRejectedSignature: (signature: string, reason: string) => Promise<void>;
}

const DEFAULT_CONSTRAINTS: GenerationConstraints = {
  maxMinutes: 15,
  difficulty: "easy",
  maxMissingIngredients: 1,
  batchSize: 5,
};

export async function getRecommendations(
  graph: FoodGraph,
  kitchen: KitchenState,
  options?: {
    minMakeNow?: number;
    generator?: RecipeGenerator;
    cache?: CacheHooks;
    constraints?: Partial<GenerationConstraints>;
  },
): Promise<RecommendationResult> {
  const minMakeNow = options?.minMakeNow ?? 3;
  const constraints = { ...DEFAULT_CONSTRAINTS, ...options?.constraints };
  let workingGraph = graph;
  let generatedCount = 0;
  let usedGenerator = false;

  let ranked = rankRecipes(workingGraph, kitchen);
  let makeNow = ranked.filter((item) => item.canMakeNow);

  if (
    makeNow.length < minMakeNow &&
    options?.generator?.enabled &&
    options.cache
  ) {
    usedGenerator = true;
    const rejected = await options.cache.getRejectedSignatures();
    const request = {
      available_ingredients: [...kitchen.ingredientSlugs],
      candidate_components: ranked.flatMap((item) => item.derivedComponents).slice(0, 20),
      existing_recipes: workingGraph.recipes.map((recipe) => recipe.title),
      constraints: {
        max_minutes: constraints.maxMinutes,
        difficulty: constraints.difficulty,
        max_missing_ingredients: constraints.maxMissingIngredients,
        batch_size: constraints.batchSize,
      },
    };

    const drafts = await options.generator.generateBatch(request, constraints);
    const accepted = [];

    for (const draft of drafts) {
      const validation = validateRecipeDraft(workingGraph, draft, workingGraph.recipes, rejected);
      if (!validation.ok) {
        await options.cache.saveRejectedSignature(
          validation.signature,
          validation.reasons.join("; "),
        );
        continue;
      }
      accepted.push(toGraphRecipe(draft, "llm"));
    }

    if (accepted.length > 0) {
      await options.cache.saveRecipes(accepted);
      workingGraph = {
        ...workingGraph,
        recipes: [...workingGraph.recipes, ...accepted],
      };
      generatedCount = accepted.length;
      ranked = rankRecipes(workingGraph, kitchen);
      makeNow = ranked.filter((item) => item.canMakeNow);
    }
  }

  const almostThere = ranked.filter((item) => item.almostThere).slice(0, 8);
  const useSoon = ranked
    .filter((item) => item.usesExpiring && (item.canMakeNow || item.almostThere))
    .slice(0, 8);
  const goodNextBuys = recommendPurchases(workingGraph, kitchen, 8);
  const bundleBuys = topEssentialsBundle(workingGraph, kitchen, 3);
  const superFoods = recommendSuperFoods(workingGraph, kitchen, 6);

  return {
    makeNow: makeNow.slice(0, 10),
    almostThere,
    useSoon,
    goodNextBuys,
    bundleBuys,
    superFoods,
    generatedCount,
    usedGenerator,
  };
}

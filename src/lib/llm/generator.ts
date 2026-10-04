import type {
  GeneratedRecipeDraft,
  GenerationConstraints,
  RecipeGeneratorRequest,
} from "@/lib/types";

export interface RecipeGenerator {
  readonly name: string;
  readonly enabled: boolean;
  generateBatch(
    request: RecipeGeneratorRequest,
    constraints: GenerationConstraints,
  ): Promise<GeneratedRecipeDraft[]>;
}

export class DisabledRecipeGenerator implements RecipeGenerator {
  readonly name = "disabled";
  readonly enabled = false;

  async generateBatch(): Promise<GeneratedRecipeDraft[]> {
    return [];
  }
}

/**
 * Deterministic offline generator used when no LLM key is configured.
 * Creates small structured variations from candidate components — still validated
 * by the graph before caching. This keeps the app useful without an API key.
 */
export class HeuristicRecipeGenerator implements RecipeGenerator {
  readonly name = "heuristic";
  readonly enabled = true;

  async generateBatch(
    request: RecipeGeneratorRequest,
    constraints: GenerationConstraints,
  ): Promise<GeneratedRecipeDraft[]> {
    const available = new Set(request.available_ingredients);
    const drafts: GeneratedRecipeDraft[] = [];
    const existing = new Set(request.existing_recipes.map((title) => title.toLowerCase()));

    const push = (draft: GeneratedRecipeDraft) => {
      if (drafts.length >= constraints.batchSize) return;
      if (existing.has(draft.title.toLowerCase())) return;
      drafts.push(draft);
    };

    if (available.has("eggs") && (available.has("rice") || available.has("microwave-rice"))) {
      push({
        title: "Soy Egg Rice",
        description: "Quick egg rice with soy. Pan optional if you microwave-scramble.",
        steps: [
          "Heat the rice.",
          "Scramble the eggs in butter or oil.",
          "Mix together with soy sauce.",
          "Add cheese or frozen veg if available.",
        ],
        timeMinutes: 10,
        difficulty: "easy",
        equipment: ["pan", "hob"],
        estimatedCost: "very_cheap",
        tags: ["rice", "egg", "one-pan"],
        ingredients: [
          { ingredientSlug: available.has("microwave-rice") ? "microwave-rice" : "rice", optional: false },
          { ingredientSlug: "eggs", optional: false },
          { ingredientSlug: "soy-sauce", optional: !available.has("soy-sauce") },
          { ingredientSlug: "butter", optional: !available.has("butter") },
          { ingredientSlug: "oil", optional: !available.has("oil") },
          { ingredientSlug: "cheese", optional: true },
        ].filter((item) => !item.optional || available.has(item.ingredientSlug) || item.ingredientSlug === "cheese"),
        componentSlugs: ["cooked-rice", "egg-rice"],
        graphPath: [
          available.has("microwave-rice") ? "cook-microwave-rice" : "boil-rice",
          "egg-rice",
        ],
      });
    }

    if (available.has("bread") && available.has("eggs") && available.has("cheese")) {
      push({
        title: "Egg and Cheese Muffin-Style Toast",
        description: "Toast topped with scrambled egg and cheese.",
        steps: [
          "Toast the bread.",
          "Scramble eggs in butter.",
          "Pile onto toast and melt cheese on top.",
        ],
        timeMinutes: 9,
        difficulty: "easy",
        equipment: ["toaster", "pan", "hob"],
        estimatedCost: "cheap",
        tags: ["toast", "egg", "cheese"],
        ingredients: [
          { ingredientSlug: "bread", optional: false },
          { ingredientSlug: "eggs", optional: false },
          { ingredientSlug: "cheese", optional: false },
          { ingredientSlug: "butter", optional: !available.has("butter") },
        ],
        componentSlugs: ["toast", "scrambled-egg"],
        graphPath: ["toast-bread", "scramble-egg-butter"],
      });
    }

    if (available.has("instant-noodles") && available.has("eggs")) {
      const fat = available.has("oil") ? "oil" : available.has("butter") ? "butter" : "oil";
      push({
        title: "Hot Sauce Noodle Egg Cup",
        description: "Instant noodles with egg and a kick.",
        steps: [
          "Cook the noodles in a bowl.",
          "Fry or microwave an egg.",
          "Combine with hot sauce and cheese if available.",
        ],
        timeMinutes: 7,
        difficulty: "easy",
        equipment: ["kettle", "bowl", "pan"],
        estimatedCost: "very_cheap",
        tags: ["noodles", "egg", "microwave"],
        ingredients: [
          { ingredientSlug: "instant-noodles", optional: false },
          { ingredientSlug: "eggs", optional: false },
          { ingredientSlug: fat, optional: false },
          { ingredientSlug: "hot-sauce", optional: true },
          { ingredientSlug: "cheese", optional: true },
        ],
        componentSlugs: ["cooked-noodles", "fried-egg"],
        graphPath: [
          "cook-instant-noodles",
          fat === "butter" ? "fry-egg-butter" : "fry-egg-oil",
        ],
      });
    }

    if (available.has("baked-beans") && available.has("cheese") && available.has("frozen-chips")) {
      push({
        title: "Beans Cheese Chip Bowl",
        description: "Loaded chips with a shorter name and the same energy.",
        steps: [
          "Cook the chips.",
          "Heat the beans.",
          "Layer chips, beans, cheese. Melt and eat.",
        ],
        timeMinutes: 22,
        difficulty: "easy",
        equipment: ["oven", "tray", "microwave"],
        estimatedCost: "cheap",
        tags: ["chips", "beans", "cheese"],
        ingredients: [
          { ingredientSlug: "frozen-chips", optional: false },
          { ingredientSlug: "baked-beans", optional: false },
          { ingredientSlug: "cheese", optional: false },
        ],
        componentSlugs: ["cooked-chips", "hot-beans", "loaded-beans-chips"],
        graphPath: ["oven-chips", "heat-beans", "loaded-chips-beans"],
      });
    }

    if (
      available.has("pasta") &&
      available.has("cheese") &&
      (available.has("chopped-tomatoes") || available.has("tomato-pasta-sauce"))
    ) {
      push({
        title: "Lazy Cheesy Pasta Pot",
        description: "One saucepan pasta with tomato and cheese.",
        steps: [
          "Boil pasta.",
          "Stir through tomato sauce or chopped tomatoes.",
          "Add cheese off the heat until melted.",
        ],
        timeMinutes: 14,
        difficulty: "easy",
        equipment: ["pan", "hob"],
        estimatedCost: "cheap",
        tags: ["pasta", "cheese", "vegetarian"],
        ingredients: [
          { ingredientSlug: "pasta", optional: false },
          { ingredientSlug: "cheese", optional: false },
          {
            ingredientSlug: available.has("tomato-pasta-sauce")
              ? "tomato-pasta-sauce"
              : "chopped-tomatoes",
            optional: false,
          },
          { ingredientSlug: "oil", optional: true },
        ],
        componentSlugs: ["cooked-pasta", "cheesy-tomato-pasta"],
        graphPath: ["boil-pasta", "pasta-tomato-cheese"],
      });
    }

    return drafts.slice(0, constraints.batchSize);
  }
}

export class OpenAIRecipeGenerator implements RecipeGenerator {
  readonly name = "openai";
  readonly enabled: boolean;
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "gpt-4o-mini") {
    this.apiKey = apiKey;
    this.enabled = Boolean(apiKey);
    this.model = model;
  }

  async generateBatch(
    request: RecipeGeneratorRequest,
    constraints: GenerationConstraints,
  ): Promise<GeneratedRecipeDraft[]> {
    if (!this.enabled) return [];

    const system = `You are a recipe author for a student cooking graph engine.
Return ONLY valid JSON: {"recipes":[...]} with genuinely distinct cheap meals.
Do not invent ingredients outside available_ingredients plus at most constraints.max_missing_ingredients cheap staples.
Prefer common UK student ingredients. Max ${constraints.maxMinutes} minutes. Difficulty easy.
Each recipe needs: title, description, steps[], timeMinutes, difficulty, equipment[], estimatedCost, tags[], ingredients[{ingredientSlug,quantity?,optional}], componentSlugs[], graphPath[].
estimatedCost must be one of very_cheap|cheap|moderate|expensive.
Use ingredient slugs exactly as provided.`;

    const user = JSON.stringify({
      ...request,
      constraints: {
        ...request.constraints,
        batch_size: constraints.batchSize,
      },
    });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI generation failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content ?? '{"recipes":[]}';
    const parsed = JSON.parse(content) as { recipes?: GeneratedRecipeDraft[] };
    return (parsed.recipes ?? []).slice(0, constraints.batchSize);
  }
}

export function createRecipeGenerator(): RecipeGenerator {
  const provider = process.env.LLM_PROVIDER ?? "disabled";
  const apiKey = process.env.OPENAI_API_KEY ?? "";

  if (provider === "openai" && apiKey) {
    return new OpenAIRecipeGenerator(apiKey);
  }
  if (provider === "heuristic") {
    return new HeuristicRecipeGenerator();
  }
  // Default: disabled LLM, but heuristic can still fill tiny gaps in demos if explicitly enabled.
  return new DisabledRecipeGenerator();
}

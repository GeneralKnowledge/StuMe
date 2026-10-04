import { describe, expect, it } from "vitest";
import { normalizeIngredientText } from "../../scripts/recipes/lib/normalize";

describe("ingredient normalization", () => {
  it("maps common messy strings onto canonical concepts", () => {
    expect(normalizeIngredientText("large eggs").normalizedName).toBe("egg");
    expect(normalizeIngredientText("free-range eggs").stumeSlug).toBe("eggs");
    expect(normalizeIngredientText("cheddar cheese").stumeSlug).toBe("cheese");
    expect(normalizeIngredientText("shredded cheddar").normalizedName).toBe("cheese");
    expect(normalizeIngredientText("yellow onion").stumeSlug).toBe("onions");
    expect(normalizeIngredientText("fresh garlic cloves").stumeSlug).toBe("garlic");
    expect(normalizeIngredientText("canned diced tomatoes").normalizedName).toBe("tinned tomato");
    expect(normalizeIngredientText("spaghetti").stumeSlug).toBe("pasta");
  });

  it("preserves original text and avoids collapsing distinct proteins", () => {
    const breast = normalizeIngredientText("chicken breast");
    const bacon = normalizeIngredientText("bacon");
    expect(breast.originalText).toBe("chicken breast");
    expect(breast.normalizedName).toBe("chicken breast");
    expect(bacon.normalizedName).toBe("bacon");
    expect(breast.normalizedName).not.toBe(bacon.normalizedName);
  });
});

import { describe, expect, it } from "vitest";
import { buildGraphFromSeed } from "@/lib/graph/buildFromSeed";
import {
  canCompose,
  createKitchenState,
  deriveAvailableComponents,
  getIngredient,
  listPossibleTransformations,
  rejectUnavailableMandatory,
  transformationIsValid,
} from "@/lib/graph/engine";

const graph = buildGraphFromSeed();

describe("food graph", () => {
  it("looks up ingredients", () => {
    const egg = getIngredient(graph, "eggs");
    expect(egg?.name).toBe("Eggs");
    expect(egg?.costCategory).toBe("cheap");
  });

  it("validates transformations", () => {
    expect(transformationIsValid(graph, "fry-mushroom-onion")).toBe(true);
    expect(transformationIsValid(graph, "not-a-real-transform")).toBe(false);
  });

  it("composes components from available ingredients", () => {
    const kitchen = createKitchenState(["mushrooms", "onions", "butter"]);
    expect(canCompose(graph, kitchen, "fried-mushroom-onion")).toBe(true);

    const derived = deriveAvailableComponents(graph, kitchen);
    expect(derived.map((item) => item.componentSlug)).toContain("fried-mushroom-onion");
  });

  it("rejects unavailable mandatory ingredients on recipes", () => {
    const kitchen = createKitchenState(["bread"]);
    const toastie = graph.recipes.find((recipe) => recipe.title === "Cheese Toastie");
    expect(toastie).toBeTruthy();
    const missing = rejectUnavailableMandatory(graph, toastie!, kitchen);
    expect(missing).toEqual(expect.arrayContaining(["cheese", "butter"]));
  });

  it("handles optional ingredients without blocking transforms", () => {
    const kitchen = createKitchenState(["eggs", "butter"]);
    const transforms = listPossibleTransformations(graph, kitchen);
    expect(transforms.some((item) => item.slug === "scramble-egg-butter")).toBe(true);
  });

  it("builds mushroom egg fried rice path from inventory", () => {
    const kitchen = createKitchenState([
      "microwave-rice",
      "eggs",
      "mushrooms",
      "onions",
      "butter",
      "cheese",
    ]);
    const derived = deriveAvailableComponents(graph, kitchen);
    const slugs = derived.map((item) => item.componentSlug);
    expect(slugs).toEqual(
      expect.arrayContaining(["cooked-rice", "fried-mushroom-onion", "mushroom-egg-fried-rice"]),
    );
  });
});

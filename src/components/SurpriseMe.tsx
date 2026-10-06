"use client";

import { useState, useTransition } from "react";
import { RecipeCard } from "@/components/RecipeCard";
import {
  getRandomRecipes,
  type SerializedCandidate,
} from "@/lib/kitchen/actions";

export function SurpriseMe({
  initial,
}: {
  initial: SerializedCandidate[];
}) {
  const [recipes, setRecipes] = useState(initial);
  const [pending, startTransition] = useTransition();

  function shuffle() {
    startTransition(async () => {
      const next = await getRandomRecipes(5);
      setRecipes(next);
    });
  }

  if (recipes.length === 0) return null;

  return (
    <section className="section section-surprise">
      <div className="section-head">
        <h2>Surprise me</h2>
        <button
          type="button"
          className="pill-link surprise-shuffle"
          onClick={shuffle}
          disabled={pending}
        >
          {pending ? "Shuffling…" : "Shuffle"}
        </button>
      </div>
      <p className="section-sub">
        Random ideas — ignores what&apos;s in your kitchen.
      </p>
      <div className="recipe-list">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} mode="browse" />
        ))}
      </div>
    </section>
  );
}

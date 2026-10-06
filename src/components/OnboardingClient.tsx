"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/lib/kitchen/actions";
import {
  BASIC_STUDENT_EQUIPMENT,
  EXTRA_EQUIPMENT,
} from "@/lib/kitchen/defaults";

type Option = { id: string; slug: string; name: string };

export function OnboardingClient({
  popular,
  allIngredients,
}: {
  popular: Option[];
  allIngredients: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [equipment, setEquipment] = useState<Set<string>>(
    () => new Set(BASIC_STUDENT_EQUIPMENT),
  );

  const q = query.trim().toLowerCase();
  const searchHits = useMemo(() => {
    if (!q) return [];
    return allIngredients
      .filter(
        (item) =>
          item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [allIngredients, q]);

  function toggleIngredient(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleEquipment(item: string) {
    setEquipment((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  function finish() {
    startTransition(async () => {
      await completeOnboarding({
        ingredientIds: [...selected],
        equipment: [...equipment],
      });
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <div className="onboard">
      {step === 1 ? (
        <>
          <header className="onboard-header">
            <p className="onboard-step">1 of 2</p>
            <h1>What&apos;s in your kitchen?</h1>
            <p>Tap a few things you have. No quantities — just what&apos;s there.</p>
          </header>

          <label className="kitchen-search">
            <span className="sr-only">Search</span>
            <input
              type="search"
              placeholder="Search ingredients…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />
          </label>

          <h2 className="onboard-label">{q ? "Matches" : "Popular"}</h2>
          <div className="quick-picks onboard-picks">
            {(q ? searchHits : popular).map((item) => {
              const on = selected.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={on ? "quick-pick active" : "quick-pick"}
                  onClick={() => toggleIngredient(item.id)}
                >
                  {on ? "✓ " : ""}
                  {item.name}
                </button>
              );
            })}
          </div>

          <p className="onboard-count">{selected.size} selected</p>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={pending || selected.size < 3}
            onClick={() => setStep(2)}
          >
            {selected.size < 3 ? "Pick at least 3" : "Next — kit"}
          </button>
        </>
      ) : (
        <>
          <header className="onboard-header">
            <p className="onboard-step">2 of 2</p>
            <h1>What can you cook with?</h1>
            <p>Basic student kitchen is fine. Turn things off if you don&apos;t have them.</p>
          </header>

          <h2 className="onboard-label">Basic student kitchen</h2>
          <div className="quick-picks onboard-picks">
            {BASIC_STUDENT_EQUIPMENT.map((item) => {
              const on = equipment.has(item);
              return (
                <button
                  key={item}
                  type="button"
                  className={on ? "quick-pick active" : "quick-pick"}
                  onClick={() => toggleEquipment(item)}
                >
                  {on ? "✓ " : ""}
                  {item.replace("-", " ")}
                </button>
              );
            })}
          </div>

          <h2 className="onboard-label">Also got</h2>
          <div className="quick-picks onboard-picks">
            {EXTRA_EQUIPMENT.map((item) => {
              const on = equipment.has(item);
              return (
                <button
                  key={item}
                  type="button"
                  className={on ? "quick-pick active" : "quick-pick"}
                  onClick={() => toggleEquipment(item)}
                >
                  {on ? "✓ " : ""}
                  {item.replace("-", " ")}
                </button>
              );
            })}
          </div>

          <div className="onboard-actions">
            <button
              type="button"
              className="pill-link"
              disabled={pending}
              onClick={() => setStep(1)}
            >
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending || equipment.size === 0}
              onClick={finish}
            >
              Show what I can make
            </button>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import {
  quickAddIngredient,
  removeKitchenIngredient,
  setAssumedStaple,
  setKitchenEquipment,
  toggleExpiring,
} from "@/lib/kitchen/actions";
import {
  BASIC_STUDENT_EQUIPMENT,
  EXTRA_EQUIPMENT,
} from "@/lib/kitchen/defaults";

type KitchenItem = {
  id: string;
  ingredientId: string;
  slug: string;
  name: string;
  quantity: string | null;
  isStaple: boolean;
  expiringSoon: boolean;
  storage: "fridge" | "freezer" | "cupboard";
  category: string;
};

type IngredientOption = {
  id: string;
  slug: string;
  name: string;
  category: string;
  defaultStorage: "fridge" | "freezer" | "cupboard";
  isEssential: boolean;
};

type StapleToggle = {
  slug: string;
  name: string;
  ingredientId: string;
  enabled: boolean;
};

type Popular = { id: string; slug: string; name: string };

export function KitchenClient({
  items,
  allIngredients,
  popularIngredients,
  assumedStaples,
  equipment,
}: {
  items: KitchenItem[];
  allIngredients: IngredientOption[];
  popularIngredients: Popular[];
  assumedStaples: StapleToggle[];
  equipment: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [kit, setKit] = useState(() => new Set(equipment));

  const ownedIds = useMemo(() => new Set(items.map((item) => item.ingredientId)), [items]);
  const visibleItems = items.filter((item) => !assumedStaples.some((s) => s.slug === item.slug));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = allIngredients.filter((item) => !ownedIds.has(item.id));
    if (!q) {
      const popularIds = new Set(popularIngredients.map((item) => item.id));
      return pool.filter((item) => popularIds.has(item.id)).concat(
        pool.filter((item) => !popularIds.has(item.id)).slice(0, 24),
      );
    }
    return pool
      .filter(
        (item) =>
          item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [allIngredients, ownedIds, popularIngredients, query]);

  function persistEquipment(next: Set<string>) {
    setKit(next);
    startTransition(() => setKitchenEquipment([...next]));
  }

  return (
    <div className="kitchen-stack">
      <section className="panel kitchen-add">
        <label className="kitchen-search">
          Add to kitchen
          <input
            type="search"
            enterKeyHint="search"
            placeholder="Search eggs, pasta, cheese…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
        </label>
        <p className="kitchen-hint">Tap to add. No quantities needed.</p>
        <div className="quick-picks" aria-label="Ingredients to add">
          {filtered.length === 0 ? (
            <div className="empty compact">No matches left to add.</div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className="quick-pick"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await quickAddIngredient(item.id);
                    setQuery("");
                  })
                }
              >
                {item.name}
              </button>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>In your kitchen</h3>
          <span className="section-count soft">{visibleItems.length}</span>
        </div>
        {visibleItems.length === 0 ? (
          <div className="empty compact">Empty — add a few staples above.</div>
        ) : (
          visibleItems.map((item) => (
            <div className="item-row" key={item.id}>
              <div className="item-copy">
                <strong>{item.name}</strong>
                <span>{item.expiringSoon ? "Use soon" : "Have"}</span>
              </div>
              <div className="item-actions">
                <button
                  className={item.expiringSoon ? "pill-link warn-pill" : "pill-link"}
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(() => toggleExpiring(item.id, !item.expiringSoon))
                  }
                >
                  {item.expiringSoon ? "Keep" : "Use soon"}
                </button>
                <button
                  className="pill-link"
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(() => removeKitchenIngredient(item.id))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>Always assume</h3>
        </div>
        <p className="kitchen-hint">We won&apos;t say you&apos;re missing these unless you turn them off.</p>
        <div className="quick-picks">
          {assumedStaples.map((staple) => (
            <button
              key={staple.slug}
              type="button"
              className={staple.enabled ? "quick-pick active" : "quick-pick"}
              disabled={pending || !staple.ingredientId}
              onClick={() =>
                startTransition(() => setAssumedStaple(staple.slug, !staple.enabled))
              }
            >
              {staple.enabled ? "✓ " : ""}
              {staple.name}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>Kit</h3>
        </div>
        <p className="kitchen-hint">Basic student kitchen by default.</p>
        <div className="quick-picks">
          {[...BASIC_STUDENT_EQUIPMENT, ...EXTRA_EQUIPMENT].map((item) => {
            const on = kit.has(item);
            return (
              <button
                key={item}
                type="button"
                className={on ? "quick-pick active" : "quick-pick"}
                disabled={pending}
                onClick={() => {
                  const next = new Set(kit);
                  if (on) next.delete(item);
                  else next.add(item);
                  persistEquipment(next);
                }}
              >
                {on ? "✓ " : ""}
                {item.replace("-", " ")}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

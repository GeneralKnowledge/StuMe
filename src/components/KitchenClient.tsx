"use client";

import { useMemo, useState, useTransition } from "react";
import {
  addKitchenIngredient,
  removeKitchenIngredient,
  toggleExpiring,
} from "@/lib/kitchen/actions";

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

type StorageChoice = "fridge" | "freezer" | "cupboard";

const ZONES = ["fridge", "cupboard", "freezer", "staples"] as const;

export function KitchenClient({
  items,
  allIngredients,
}: {
  items: KitchenItem[];
  allIngredients: IngredientOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [storage, setStorage] = useState<StorageChoice>("cupboard");

  const grouped = {
    fridge: items.filter((item) => item.storage === "fridge"),
    cupboard: items.filter((item) => item.storage === "cupboard"),
    freezer: items.filter((item) => item.storage === "freezer"),
    staples: items.filter((item) => item.isStaple),
  };

  const owned = useMemo(() => new Set(items.map((item) => item.ingredientId)), [items]);
  const addable = useMemo(
    () => allIngredients.filter((item) => !owned.has(item.id)),
    [allIngredients, owned],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return addable.slice(0, 40);
    return addable
      .filter(
        (item) =>
          item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q),
      )
      .slice(0, 40);
  }, [addable, query]);

  function pickIngredient(item: IngredientOption) {
    setSelectedId(item.id);
    setQuery(item.name);
    setStorage(item.defaultStorage);
  }

  return (
    <div className="kitchen-stack">
      <form
        className="panel kitchen-add"
        action={(formData) => {
          startTransition(() => addKitchenIngredient(formData));
          setQuery("");
          setSelectedId("");
          setStorage("cupboard");
        }}
      >
        <label className="kitchen-search">
          Add ingredient
          <input
            type="search"
            enterKeyHint="search"
            placeholder="Search eggs, pasta, cheese…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedId("");
            }}
            autoComplete="off"
          />
        </label>

        <input type="hidden" name="ingredientId" value={selectedId} />
        <input type="hidden" name="storage" value={storage} />

        <div className="quick-picks" role="listbox" aria-label="Matching ingredients">
          {filtered.length === 0 ? (
            <div className="empty compact">No matches left to add.</div>
          ) : (
            filtered.map((item) => {
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={active ? "quick-pick active" : "quick-pick"}
                  onClick={() => pickIngredient(item)}
                >
                  {item.name}
                </button>
              );
            })
          )}
        </div>

        <details className="kitchen-advanced">
          <summary>Quantity & flags</summary>
          <div className="advanced-grid">
            <label>
              Storage
              <select
                value={storage}
                onChange={(event) => setStorage(event.target.value as StorageChoice)}
              >
                <option value="fridge">Fridge</option>
                <option value="cupboard">Cupboard</option>
                <option value="freezer">Freezer</option>
              </select>
            </label>
            <label>
              Quantity (optional)
              <input name="quantity" type="text" placeholder="e.g. half a pack" />
            </label>
            <label className="check check-inline">
              <input name="isStaple" type="checkbox" /> Staple
            </label>
            <label className="check check-inline">
              <input name="expiringSoon" type="checkbox" /> Expiring soon
            </label>
          </div>
        </details>

        <button className="btn btn-primary btn-block" disabled={pending || !selectedId} type="submit">
          Add to kitchen
        </button>
      </form>

      <div className="kitchen-grid">
        {ZONES.map((key) => (
          <section className="panel" key={key}>
            <div className="panel-head">
              <h3>{key}</h3>
              <span className="section-count soft">{grouped[key].length}</span>
            </div>
            {grouped[key].length === 0 ? (
              <div className="empty compact">Empty</div>
            ) : (
              grouped[key].map((item) => (
                <div className="item-row" key={`${key}-${item.id}`}>
                  <div className="item-copy">
                    <strong>{item.name}</strong>
                    <span>
                      {item.quantity || "have some"}
                      {item.expiringSoon ? " · expiring" : ""}
                    </span>
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
                      {item.expiringSoon ? "Keep" : "Expiring"}
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
        ))}
      </div>
    </div>
  );
}

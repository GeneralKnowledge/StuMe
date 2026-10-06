"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  quickAddIngredient,
  removeKitchenIngredient,
  toggleExpiring,
} from "@/lib/kitchen/actions";

type Chip = {
  id: string;
  slug: string;
  name: string;
  expiringSoon: boolean;
};

type AddOption = {
  id: string;
  slug: string;
  name: string;
};

export function InventoryStrip({
  items,
  popular,
  allIngredients,
}: {
  items: Chip[];
  popular: AddOption[];
  allIngredients: AddOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const owned = new Set(items.map((item) => item.slug));
  const matches = (q ? allIngredients : popular)
    .filter((item) => !owned.has(item.slug))
    .filter(
      (item) =>
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q),
    )
    .slice(0, 16);

  return (
    <section className="inventory-strip" aria-label="What's in your kitchen">
      <div className="inventory-strip-head">
        <p className="inventory-strip-label">What&apos;s in your kitchen?</p>
        <button
          type="button"
          className="pill-link inventory-add-btn"
          disabled={pending}
          onClick={() => setOpen((value) => !value)}
        >
          + Add
        </button>
      </div>

      {items.length === 0 ? (
        <p className="inventory-empty-hint">
          Add a few things you have — we&apos;ll say what you can eat.
        </p>
      ) : (
        <div className="inventory-chips">
          {items.slice(0, 10).map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.expiringSoon ? "inv-chip use-soon" : "inv-chip"}
              disabled={pending}
              title="Tap to remove · long-press path: use Kitchen for Use soon"
              onClick={() =>
                startTransition(async () => {
                  await removeKitchenIngredient(item.id);
                })
              }
              onContextMenu={(event) => {
                event.preventDefault();
                startTransition(() => toggleExpiring(item.id, !item.expiringSoon));
              }}
            >
              {item.expiringSoon ? "Use soon · " : ""}
              {item.name}
            </button>
          ))}
          {items.length > 10 && (
            <Link href="/kitchen" className="inv-chip more">
              +{items.length - 10}
            </Link>
          )}
        </div>
      )}

      {open && (
        <div className="quick-add-panel">
          <label className="kitchen-search">
            <span className="sr-only">Search ingredients</span>
            <input
              type="search"
              enterKeyHint="search"
              placeholder="Eggs, rice, pasta…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
              autoFocus
            />
          </label>
          <div className="quick-picks">
            {matches.length === 0 ? (
              <div className="empty compact">Nothing left to add.</div>
            ) : (
              matches.map((item) => (
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
          <Link href="/kitchen" className="text-link inventory-kitchen-link">
            Open Kitchen for Use soon & staples
          </Link>
        </div>
      )}
    </section>
  );
}

"use client";

import { useTransition } from "react";
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

export function KitchenClient({
  items,
  allIngredients,
}: {
  items: KitchenItem[];
  allIngredients: IngredientOption[];
}) {
  const [pending, startTransition] = useTransition();

  const grouped = {
    fridge: items.filter((item) => item.storage === "fridge"),
    cupboard: items.filter((item) => item.storage === "cupboard"),
    freezer: items.filter((item) => item.storage === "freezer"),
    staples: items.filter((item) => item.isStaple),
  };

  const owned = new Set(items.map((item) => item.ingredientId));
  const addable = allIngredients.filter((item) => !owned.has(item.id));

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <form
        className="panel form-grid"
        action={(formData) => startTransition(() => addKitchenIngredient(formData))}
      >
        <label>
          Add ingredient
          <select name="ingredientId" required defaultValue="">
            <option value="" disabled>
              Choose…
            </option>
            {addable.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Storage
          <select name="storage" defaultValue="cupboard">
            <option value="fridge">Fridge</option>
            <option value="cupboard">Cupboard</option>
            <option value="freezer">Freezer</option>
          </select>
        </label>
        <label>
          Quantity (optional)
          <input name="quantity" type="text" placeholder="e.g. half a pack" />
        </label>
        <label className="check">
          <input name="isStaple" type="checkbox" /> Staple
        </label>
        <label className="check">
          <input name="expiringSoon" type="checkbox" /> Expiring soon
        </label>
        <button className="btn btn-primary" disabled={pending} type="submit">
          Add to kitchen
        </button>
      </form>

      <div className="kitchen-grid">
        {(["fridge", "cupboard", "freezer", "staples"] as const).map((key) => (
          <section className="panel" key={key}>
            <h3 style={{ textTransform: "capitalize" }}>{key}</h3>
            {grouped[key].length === 0 ? (
              <div className="empty">Empty</div>
            ) : (
              grouped[key].map((item) => (
                <div className="item-row" key={`${key}-${item.id}`}>
                  <div>
                    <strong>{item.name}</strong>
                    <div style={{ fontSize: "0.85rem", color: "rgba(215,235,228,0.65)" }}>
                      {item.quantity || "have some"}
                      {item.expiringSoon ? " · expiring soon" : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.35rem" }}>
                    <button
                      className="pill-link"
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

"use client";

import { useTransition } from "react";
import { setDemoInventory } from "@/lib/kitchen/actions";

const DEMOS: Array<{ label: string; slugs: string[] }> = [
  {
    label: "Nearly empty",
    slugs: ["bread", "eggs", "butter", "cheese"],
  },
  {
    label: "Basic student",
    slugs: ["rice", "eggs", "onions", "cheese", "butter"],
  },
  {
    label: "Random fridge",
    slugs: ["mushrooms", "milk", "cheese", "eggs", "bread"],
  },
  {
    label: "Cheap cupboard",
    slugs: ["pasta", "chopped-tomatoes", "baked-beans", "onions", "cheese"],
  },
  {
    label: "Freezer-heavy",
    slugs: ["frozen-chips", "frozen-peas", "eggs", "cheese"],
  },
  {
    label: "Microwave student",
    slugs: ["microwave-rice", "instant-noodles", "eggs", "cheese", "frozen-mixed-vegetables"],
  },
  {
    label: "Egg rice classic",
    slugs: ["rice", "eggs", "mushrooms", "onions", "butter", "cheese"],
  },
];

export function DemoButtons() {
  const [pending, startTransition] = useTransition();

  return (
    <div className="demo-row">
      {DEMOS.map((demo) => (
        <button
          key={demo.label}
          className="pill-link"
          disabled={pending}
          onClick={() => startTransition(() => setDemoInventory(demo.slugs))}
          type="button"
        >
          {demo.label}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { quickAddIngredient } from "@/lib/kitchen/actions";

export function AddMissingButton({
  ingredientId,
  label,
}: {
  ingredientId: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (!ingredientId) {
    return <span className="need missing">Get {label}</span>;
  }

  return (
    <button
      type="button"
      className="need missing need-action"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await quickAddIngredient(ingredientId);
          router.refresh();
        })
      }
    >
      {pending ? "Adding…" : `I have ${label}`}
    </button>
  );
}

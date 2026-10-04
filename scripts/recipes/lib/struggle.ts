import type { StruggleBand } from "./types";

export function classifyStruggle(input: {
  ingredientCount: number;
  minutes: number;
  equipment: string[];
  hasSpecialistEquipment: boolean;
  specialistIngredientCount: number;
}): StruggleBand {
  const panLike = input.equipment.filter((item) =>
    ["frying pan", "saucepan", "pan", "microwave", "bowl", "toaster", "kettle"].includes(item),
  );

  if (
    input.specialistIngredientCount > 0 ||
    input.hasSpecialistEquipment ||
    input.ingredientCount > 10 ||
    input.minutes > 45 ||
    input.equipment.length >= 5
  ) {
    return 4;
  }

  if (
    input.ingredientCount <= 4 &&
    input.minutes <= 15 &&
    panLike.length <= 2
  ) {
    return 1;
  }

  if (input.ingredientCount <= 7 && input.minutes <= 30 && input.equipment.length <= 3) {
    return 2;
  }

  if (input.ingredientCount <= 10 && input.minutes <= 45) {
    return 3;
  }

  return 4;
}

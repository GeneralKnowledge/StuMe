import type { CostCategory, Storage } from "@/lib/types";

export interface IngredientSeed {
  slug: string;
  name: string;
  category: string;
  costCategory: CostCategory;
  shelfLifeDays: number;
  defaultStorage: Storage;
  versatility: number;
  wasteRisk: number;
  tags: string[];
  isEssential?: boolean;
}

export const INGREDIENTS: IngredientSeed[] = [
  // Staples
  { slug: "rice", name: "Rice", category: "staples", costCategory: "very_cheap", shelfLifeDays: 365, defaultStorage: "cupboard", versatility: 0.95, wasteRisk: 0.05, tags: ["carb", "base"], isEssential: true },
  { slug: "microwave-rice", name: "Microwave rice", category: "staples", costCategory: "cheap", shelfLifeDays: 180, defaultStorage: "cupboard", versatility: 0.85, wasteRisk: 0.1, tags: ["carb", "convenience", "microwave"] },
  { slug: "pasta", name: "Pasta", category: "staples", costCategory: "very_cheap", shelfLifeDays: 365, defaultStorage: "cupboard", versatility: 0.95, wasteRisk: 0.05, tags: ["carb", "base"], isEssential: true },
  { slug: "noodles", name: "Noodles", category: "staples", costCategory: "cheap", shelfLifeDays: 365, defaultStorage: "cupboard", versatility: 0.8, wasteRisk: 0.05, tags: ["carb"] },
  { slug: "instant-noodles", name: "Instant noodles", category: "staples", costCategory: "very_cheap", shelfLifeDays: 365, defaultStorage: "cupboard", versatility: 0.75, wasteRisk: 0.05, tags: ["carb", "convenience", "microwave"] },
  { slug: "bread", name: "Bread", category: "staples", costCategory: "very_cheap", shelfLifeDays: 5, defaultStorage: "cupboard", versatility: 0.9, wasteRisk: 0.55, tags: ["carb", "toast"], isEssential: true },
  { slug: "wraps", name: "Wraps", category: "staples", costCategory: "cheap", shelfLifeDays: 10, defaultStorage: "fridge", versatility: 0.7, wasteRisk: 0.4, tags: ["carb"] },
  { slug: "potatoes", name: "Potatoes", category: "staples", costCategory: "very_cheap", shelfLifeDays: 21, defaultStorage: "cupboard", versatility: 0.9, wasteRisk: 0.25, tags: ["carb", "veg"], isEssential: true },
  { slug: "microwave-potatoes", name: "Microwave potatoes", category: "staples", costCategory: "cheap", shelfLifeDays: 14, defaultStorage: "cupboard", versatility: 0.7, wasteRisk: 0.2, tags: ["carb", "convenience", "microwave"] },
  { slug: "frozen-chips", name: "Frozen chips", category: "frozen", costCategory: "cheap", shelfLifeDays: 180, defaultStorage: "freezer", versatility: 0.75, wasteRisk: 0.05, tags: ["carb", "convenience", "frozen"], isEssential: true },
  { slug: "oats", name: "Oats", category: "staples", costCategory: "very_cheap", shelfLifeDays: 365, defaultStorage: "cupboard", versatility: 0.65, wasteRisk: 0.05, tags: ["carb", "breakfast"] },
  { slug: "flour", name: "Flour", category: "staples", costCategory: "very_cheap", shelfLifeDays: 365, defaultStorage: "cupboard", versatility: 0.55, wasteRisk: 0.05, tags: ["baking"] },

  // Eggs and dairy
  { slug: "eggs", name: "Eggs", category: "dairy", costCategory: "cheap", shelfLifeDays: 21, defaultStorage: "fridge", versatility: 0.98, wasteRisk: 0.2, tags: ["protein", "staple"], isEssential: true },
  { slug: "milk", name: "Milk", category: "dairy", costCategory: "cheap", shelfLifeDays: 7, defaultStorage: "fridge", versatility: 0.75, wasteRisk: 0.45, tags: ["dairy"] },
  { slug: "butter", name: "Butter", category: "dairy", costCategory: "cheap", shelfLifeDays: 60, defaultStorage: "fridge", versatility: 0.9, wasteRisk: 0.1, tags: ["fat", "staple"], isEssential: true },
  { slug: "oil", name: "Cooking oil", category: "flavour", costCategory: "cheap", shelfLifeDays: 365, defaultStorage: "cupboard", versatility: 0.95, wasteRisk: 0.05, tags: ["fat", "staple"], isEssential: true },
  { slug: "cheese", name: "Cheese", category: "dairy", costCategory: "cheap", shelfLifeDays: 21, defaultStorage: "fridge", versatility: 0.92, wasteRisk: 0.25, tags: ["dairy", "protein"], isEssential: true },
  { slug: "cream-cheese", name: "Cream cheese", category: "dairy", costCategory: "moderate", shelfLifeDays: 21, defaultStorage: "fridge", versatility: 0.55, wasteRisk: 0.3, tags: ["dairy"] },
  { slug: "grated-cheese", name: "Grated cheese", category: "dairy", costCategory: "cheap", shelfLifeDays: 14, defaultStorage: "fridge", versatility: 0.85, wasteRisk: 0.25, tags: ["dairy"] },

  // Vegetables
  { slug: "onions", name: "Onions", category: "vegetables", costCategory: "very_cheap", shelfLifeDays: 30, defaultStorage: "cupboard", versatility: 0.97, wasteRisk: 0.15, tags: ["veg", "aromatic"], isEssential: true },
  { slug: "garlic", name: "Garlic", category: "vegetables", costCategory: "very_cheap", shelfLifeDays: 45, defaultStorage: "cupboard", versatility: 0.9, wasteRisk: 0.15, tags: ["veg", "aromatic"], isEssential: true },
  { slug: "mushrooms", name: "Mushrooms", category: "vegetables", costCategory: "cheap", shelfLifeDays: 5, defaultStorage: "fridge", versatility: 0.8, wasteRisk: 0.55, tags: ["veg"] },
  { slug: "tomatoes", name: "Tomatoes", category: "vegetables", costCategory: "cheap", shelfLifeDays: 7, defaultStorage: "fridge", versatility: 0.7, wasteRisk: 0.4, tags: ["veg"] },
  { slug: "peppers", name: "Peppers", category: "vegetables", costCategory: "cheap", shelfLifeDays: 7, defaultStorage: "fridge", versatility: 0.7, wasteRisk: 0.4, tags: ["veg"] },
  { slug: "spring-onions", name: "Spring onions", category: "vegetables", costCategory: "cheap", shelfLifeDays: 7, defaultStorage: "fridge", versatility: 0.65, wasteRisk: 0.45, tags: ["veg", "aromatic"] },
  { slug: "carrots", name: "Carrots", category: "vegetables", costCategory: "very_cheap", shelfLifeDays: 21, defaultStorage: "fridge", versatility: 0.75, wasteRisk: 0.2, tags: ["veg"] },
  { slug: "frozen-peas", name: "Frozen peas", category: "frozen", costCategory: "very_cheap", shelfLifeDays: 180, defaultStorage: "freezer", versatility: 0.8, wasteRisk: 0.05, tags: ["veg", "frozen"], isEssential: true },
  { slug: "frozen-mixed-vegetables", name: "Frozen mixed vegetables", category: "frozen", costCategory: "cheap", shelfLifeDays: 180, defaultStorage: "freezer", versatility: 0.88, wasteRisk: 0.05, tags: ["veg", "frozen", "convenience"], isEssential: true },
  { slug: "sweetcorn", name: "Sweetcorn (tinned)", category: "tinned", costCategory: "very_cheap", shelfLifeDays: 730, defaultStorage: "cupboard", versatility: 0.65, wasteRisk: 0.05, tags: ["veg", "tinned"] },
  { slug: "spinach", name: "Spinach", category: "vegetables", costCategory: "cheap", shelfLifeDays: 4, defaultStorage: "fridge", versatility: 0.6, wasteRisk: 0.6, tags: ["veg"] },

  // Protein / easy additions
  { slug: "sausages", name: "Sausages", category: "protein", costCategory: "cheap", shelfLifeDays: 5, defaultStorage: "fridge", versatility: 0.7, wasteRisk: 0.4, tags: ["protein", "meat"] },
  { slug: "bacon", name: "Bacon", category: "protein", costCategory: "moderate", shelfLifeDays: 7, defaultStorage: "fridge", versatility: 0.75, wasteRisk: 0.35, tags: ["protein", "meat"] },
  { slug: "ham", name: "Ham", category: "protein", costCategory: "cheap", shelfLifeDays: 5, defaultStorage: "fridge", versatility: 0.65, wasteRisk: 0.45, tags: ["protein", "meat"] },
  { slug: "cooked-chicken", name: "Cooked chicken", category: "protein", costCategory: "moderate", shelfLifeDays: 3, defaultStorage: "fridge", versatility: 0.85, wasteRisk: 0.5, tags: ["protein", "meat", "convenience"] },
  { slug: "chicken-breast", name: "Chicken breast", category: "protein", costCategory: "moderate", shelfLifeDays: 3, defaultStorage: "fridge", versatility: 0.8, wasteRisk: 0.5, tags: ["protein", "meat"] },
  { slug: "tuna", name: "Tuna (tinned)", category: "tinned", costCategory: "cheap", shelfLifeDays: 730, defaultStorage: "cupboard", versatility: 0.8, wasteRisk: 0.05, tags: ["protein", "tinned"] },
  { slug: "baked-beans", name: "Baked beans", category: "tinned", costCategory: "very_cheap", shelfLifeDays: 730, defaultStorage: "cupboard", versatility: 0.85, wasteRisk: 0.05, tags: ["protein", "tinned", "veggie"], isEssential: true },
  { slug: "chickpeas", name: "Chickpeas", category: "tinned", costCategory: "very_cheap", shelfLifeDays: 730, defaultStorage: "cupboard", versatility: 0.8, wasteRisk: 0.05, tags: ["protein", "tinned", "veggie"] },
  { slug: "kidney-beans", name: "Kidney beans", category: "tinned", costCategory: "very_cheap", shelfLifeDays: 730, defaultStorage: "cupboard", versatility: 0.7, wasteRisk: 0.05, tags: ["protein", "tinned", "veggie"] },

  // Tinned / jarred
  { slug: "chopped-tomatoes", name: "Chopped tomatoes", category: "tinned", costCategory: "very_cheap", shelfLifeDays: 730, defaultStorage: "cupboard", versatility: 0.9, wasteRisk: 0.05, tags: ["tinned", "sauce-base"], isEssential: true },
  { slug: "soup", name: "Tinned soup", category: "tinned", costCategory: "cheap", shelfLifeDays: 730, defaultStorage: "cupboard", versatility: 0.45, wasteRisk: 0.05, tags: ["tinned", "convenience"] },
  { slug: "tomato-pasta-sauce", name: "Tomato pasta sauce", category: "tinned", costCategory: "cheap", shelfLifeDays: 365, defaultStorage: "cupboard", versatility: 0.85, wasteRisk: 0.1, tags: ["sauce", "convenience"] },
  { slug: "ready-made-curry", name: "Ready-made curry", category: "frozen", costCategory: "moderate", shelfLifeDays: 180, defaultStorage: "freezer", versatility: 0.55, wasteRisk: 0.1, tags: ["sauce", "convenience", "frozen"] },
  { slug: "frozen-pizza", name: "Frozen pizza", category: "frozen", costCategory: "moderate", shelfLifeDays: 180, defaultStorage: "freezer", versatility: 0.35, wasteRisk: 0.1, tags: ["convenience", "frozen"] },

  // Sauces / flavour
  { slug: "soy-sauce", name: "Soy sauce", category: "flavour", costCategory: "cheap", shelfLifeDays: 730, defaultStorage: "cupboard", versatility: 0.85, wasteRisk: 0.02, tags: ["sauce", "seasoning"], isEssential: true },
  { slug: "ketchup", name: "Ketchup", category: "flavour", costCategory: "cheap", shelfLifeDays: 365, defaultStorage: "fridge", versatility: 0.55, wasteRisk: 0.05, tags: ["sauce"] },
  { slug: "mayonnaise", name: "Mayonnaise", category: "flavour", costCategory: "cheap", shelfLifeDays: 90, defaultStorage: "fridge", versatility: 0.6, wasteRisk: 0.15, tags: ["sauce"] },
  { slug: "mustard", name: "Mustard", category: "flavour", costCategory: "cheap", shelfLifeDays: 365, defaultStorage: "fridge", versatility: 0.5, wasteRisk: 0.05, tags: ["sauce"] },
  { slug: "worcestershire-sauce", name: "Worcestershire sauce", category: "flavour", costCategory: "cheap", shelfLifeDays: 730, defaultStorage: "cupboard", versatility: 0.55, wasteRisk: 0.02, tags: ["sauce"] },
  { slug: "hot-sauce", name: "Hot sauce", category: "flavour", costCategory: "cheap", shelfLifeDays: 730, defaultStorage: "cupboard", versatility: 0.6, wasteRisk: 0.02, tags: ["sauce"] },
  { slug: "bbq-sauce", name: "BBQ sauce", category: "flavour", costCategory: "cheap", shelfLifeDays: 365, defaultStorage: "fridge", versatility: 0.5, wasteRisk: 0.1, tags: ["sauce"] },
  { slug: "curry-powder", name: "Curry powder", category: "flavour", costCategory: "cheap", shelfLifeDays: 730, defaultStorage: "cupboard", versatility: 0.75, wasteRisk: 0.02, tags: ["spice"] },
  { slug: "paprika", name: "Paprika", category: "flavour", costCategory: "cheap", shelfLifeDays: 730, defaultStorage: "cupboard", versatility: 0.55, wasteRisk: 0.02, tags: ["spice"] },
  { slug: "garlic-powder", name: "Garlic powder", category: "flavour", costCategory: "cheap", shelfLifeDays: 730, defaultStorage: "cupboard", versatility: 0.6, wasteRisk: 0.02, tags: ["spice"] },
  { slug: "stock-cubes", name: "Stock cubes", category: "flavour", costCategory: "very_cheap", shelfLifeDays: 730, defaultStorage: "cupboard", versatility: 0.8, wasteRisk: 0.02, tags: ["seasoning"], isEssential: true },
  { slug: "salt", name: "Salt", category: "flavour", costCategory: "very_cheap", shelfLifeDays: 9999, defaultStorage: "cupboard", versatility: 1, wasteRisk: 0, tags: ["seasoning", "staple"], isEssential: true },
  { slug: "pepper", name: "Pepper", category: "flavour", costCategory: "very_cheap", shelfLifeDays: 9999, defaultStorage: "cupboard", versatility: 0.95, wasteRisk: 0, tags: ["seasoning", "staple"], isEssential: true },
];

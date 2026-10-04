#!/usr/bin/env node
/**
 * Build a RecipeNLG-shaped development corpus for large-sample pipeline runs.
 * Output is gitignored (data/external/recipenlg/). Do not commit raw RecipeNLG.
 *
 * Usage:
 *   npm run recipes:dev-corpus -- --count 5000
 *   npm run recipes:dev-corpus -- --count 5000 --out data/external/recipenlg/dev_corpus_5k.csv
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const countIdx = args.indexOf("--count");
const outIdx = args.indexOf("--out");
const count = countIdx >= 0 ? Number(args[countIdx + 1]) : 5000;
const outPath =
  outIdx >= 0
    ? args[outIdx + 1]
    : path.join("data", "external", "recipenlg", `dev_corpus_${count}.csv`);

if (!Number.isFinite(count) || count < 1) {
  console.error("Invalid --count");
  process.exit(1);
}

/** @typedef {{ title: string, ingredients: string[], directions: string[], ner: string[], source?: string }} Template */

/** @type {Template[]} */
const templates = [
  {
    title: "Egg Fried Rice",
    ingredients: ["cooked rice", "eggs", "onion", "soy sauce", "oil"],
    directions: ["Heat oil in a frying pan.", "Scramble eggs.", "Add rice, onion and soy sauce.", "Fry until hot."],
    ner: ["rice", "eggs", "onion", "soy sauce", "oil"],
  },
  {
    title: "Cheesy Pasta",
    ingredients: ["pasta", "cheddar cheese", "butter", "milk", "salt"],
    directions: ["Boil pasta.", "Melt butter with milk.", "Stir in cheese.", "Toss with pasta."],
    ner: ["pasta", "cheese", "butter", "milk", "salt"],
  },
  {
    title: "Beans on Toast",
    ingredients: ["bread", "baked beans", "butter", "cheddar cheese"],
    directions: ["Toast bread.", "Heat baked beans.", "Butter toast and add beans and cheese."],
    ner: ["bread", "baked beans", "butter", "cheese"],
  },
  {
    title: "Tomato Pasta",
    ingredients: ["pasta", "canned tomatoes", "onion", "garlic", "olive oil", "salt"],
    directions: ["Boil pasta.", "Fry onion and garlic in oil.", "Add tomatoes and simmer.", "Combine with pasta."],
    ner: ["pasta", "canned tomatoes", "onion", "garlic", "oil", "salt"],
  },
  {
    title: "Tuna Pasta",
    ingredients: ["pasta", "canned tuna", "canned tomatoes", "onion", "cheddar cheese"],
    directions: ["Boil pasta.", "Simmer tuna, tomatoes and onion.", "Top with cheese."],
    ner: ["pasta", "tuna", "canned tomatoes", "onion", "cheese"],
  },
  {
    title: "Microwave Rice Bowl",
    ingredients: ["microwave rice", "frozen mixed vegetables", "eggs", "soy sauce", "oil"],
    directions: ["Microwave rice and vegetables.", "Scramble eggs in a pan.", "Mix with soy sauce."],
    ner: ["microwave rice", "frozen mixed vegetables", "eggs", "soy sauce", "oil"],
  },
  {
    title: "Jacket Potato",
    ingredients: ["baking potato", "butter", "cheddar cheese", "baked beans"],
    directions: ["Microwave potato until soft.", "Split and add butter, beans and cheese."],
    ner: ["potato", "butter", "cheese", "baked beans"],
  },
  {
    title: "Omelette",
    ingredients: ["eggs", "butter", "cheddar cheese", "frozen peas", "salt"],
    directions: ["Melt butter in a frying pan.", "Add beaten eggs.", "Add peas and cheese.", "Fold and serve."],
    ner: ["eggs", "butter", "cheese", "frozen peas", "salt"],
  },
  {
    title: "Chickpea Curry",
    ingredients: ["chickpeas", "canned tomatoes", "onion", "curry powder", "oil", "rice"],
    directions: ["Cook rice.", "Fry onion in oil.", "Add curry powder, tomatoes and chickpeas.", "Simmer and serve with rice."],
    ner: ["chickpeas", "canned tomatoes", "onion", "curry powder", "oil", "rice"],
  },
  {
    title: "Garlic Bread",
    ingredients: ["bread", "butter", "garlic cloves", "cheddar cheese"],
    directions: ["Mix butter and garlic.", "Spread on bread.", "Add cheese and grill."],
    ner: ["bread", "butter", "garlic", "cheese"],
  },
  {
    title: "Instant Noodle Upgrade",
    ingredients: ["instant noodles", "eggs", "frozen peas", "soy sauce", "spring onions"],
    directions: ["Cook noodles.", "Add eggs and peas.", "Season with soy sauce.", "Top with spring onions."],
    ner: ["instant noodles", "eggs", "frozen peas", "soy sauce", "spring onions"],
  },
  {
    title: "Quesadilla",
    ingredients: ["wraps", "cheddar cheese", "onion", "oil"],
    directions: ["Heat oil in a pan.", "Fill wrap with cheese and onion.", "Fry until melted."],
    ner: ["wraps", "cheese", "onion", "oil"],
  },
  {
    title: "Sausage Pasta",
    ingredients: ["pasta", "sausages", "canned tomatoes", "onion", "oil"],
    directions: ["Boil pasta.", "Fry sausages and onion.", "Add tomatoes and simmer.", "Combine."],
    ner: ["pasta", "sausages", "canned tomatoes", "onion", "oil"],
  },
  {
    title: "Chicken Fried Rice",
    ingredients: ["cooked rice", "cooked chicken", "eggs", "soy sauce", "frozen peas", "oil"],
    directions: ["Heat oil.", "Scramble eggs.", "Add rice, chicken, peas and soy sauce."],
    ner: ["rice", "chicken", "eggs", "soy sauce", "frozen peas", "oil"],
  },
  {
    title: "Spinach Pasta",
    ingredients: ["pasta", "fresh spinach", "garlic", "cream cheese", "milk", "salt"],
    directions: ["Boil pasta.", "Wilt spinach with garlic.", "Stir in cream cheese and milk."],
    ner: ["pasta", "spinach", "garlic", "cream cheese", "milk", "salt"],
  },
  {
    title: "Cheese Toastie",
    ingredients: ["bread", "cheddar cheese", "butter"],
    directions: ["Butter bread.", "Add cheese.", "Grill or pan-fry until melted."],
    ner: ["bread", "cheese", "butter"],
  },
  {
    title: "Porridge",
    ingredients: ["rolled oats", "milk", "salt"],
    directions: ["Microwave oats and milk.", "Stir and serve."],
    ner: ["oats", "milk", "salt"],
  },
  {
    title: "Veggie Stir Fry",
    ingredients: ["frozen mixed vegetables", "rice", "soy sauce", "oil", "garlic"],
    directions: ["Cook rice.", "Stir-fry vegetables with garlic in oil.", "Add soy sauce and serve with rice."],
    ner: ["frozen mixed vegetables", "rice", "soy sauce", "oil", "garlic"],
  },
  {
    title: "Bacon Eggs",
    ingredients: ["bacon", "eggs", "bread", "butter"],
    directions: ["Fry bacon.", "Fry eggs.", "Toast bread with butter."],
    ner: ["bacon", "eggs", "bread", "butter"],
  },
  {
    title: "Tomato Cheese Omelette",
    ingredients: ["eggs", "tomato", "cheddar cheese", "butter", "salt"],
    directions: ["Melt butter.", "Cook eggs.", "Add tomato and cheese."],
    ner: ["eggs", "tomato", "cheese", "butter", "salt"],
  },
  {
    title: "Lentil Tomato Stew",
    ingredients: ["red lentils", "canned tomatoes", "onion", "stock cube", "oil", "carrot"],
    directions: ["Fry onion and carrot.", "Add lentils, tomatoes and stock cube with water.", "Simmer until soft."],
    ner: ["lentils", "canned tomatoes", "onion", "stock cube", "oil", "carrot"],
  },
  {
    title: "Ham Cheese Wrap",
    ingredients: ["wraps", "ham", "cheddar cheese", "mayonnaise"],
    directions: ["Spread mayo on wrap.", "Add ham and cheese.", "Roll and eat."],
    ner: ["wraps", "ham", "cheese", "mayonnaise"],
  },
  {
    title: "Mushroom Pasta",
    ingredients: ["pasta", "mushrooms", "garlic", "butter", "milk", "salt"],
    directions: ["Boil pasta.", "Fry mushrooms and garlic in butter.", "Add milk and toss with pasta."],
    ner: ["pasta", "mushrooms", "garlic", "butter", "milk", "salt"],
  },
  {
    title: "Sweetcorn Pasta",
    ingredients: ["pasta", "sweetcorn", "cheddar cheese", "butter", "milk"],
    directions: ["Boil pasta.", "Warm sweetcorn with butter and milk.", "Add cheese and combine."],
    ner: ["pasta", "sweetcorn", "cheese", "butter", "milk"],
  },
  {
    title: "Pea Risotto-ish",
    ingredients: ["rice", "frozen peas", "onion", "butter", "stock cube", "cheddar cheese"],
    directions: ["Fry onion in butter.", "Add rice and stock cube with water.", "Stir in peas and cheese."],
    ner: ["rice", "frozen peas", "onion", "butter", "stock cube", "cheese"],
  },
  {
    title: "Creamy Chicken Pasta",
    ingredients: ["pasta", "chicken breasts", "heavy cream", "garlic", "spinach", "parmesan"],
    directions: ["Boil pasta.", "Fry chicken with garlic.", "Add cream, spinach and parmesan.", "Toss with pasta."],
    ner: ["pasta", "chicken", "cream", "garlic", "spinach", "parmesan"],
  },
  {
    title: "Fancy Risotto",
    ingredients: ["rice", "chicken stock", "parmesan", "shallots", "butter", "white wine", "saffron"],
    directions: ["Sweat shallots in butter.", "Toast rice.", "Add wine and stock gradually.", "Finish with parmesan and saffron."],
    ner: ["rice", "stock", "parmesan", "shallots", "butter", "wine", "saffron"],
  },
  {
    title: "Sunday Roast",
    ingredients: Array.from({ length: 16 }, (_, i) => `ingredient ${i + 1}`),
    directions: Array.from({ length: 14 }, (_, i) => `Specialist step ${i + 1}.`),
    ner: ["beef", "potatoes", "gravy"],
    source: "Recipes1M",
  },
  {
    title: "Suspicious Soup",
    ingredients: ["3 1 2 cups water", "null", "1 can soup", "????"],
    directions: ["Heat soup.", "Add water."],
    ner: ["soup", "water"],
  },
  {
    title: "Broken Empty",
    ingredients: [],
    directions: [],
    ner: [],
  },
];

const adjectives = [
  "Easy",
  "Simple",
  "Quick",
  "Student",
  "Budget",
  "Lazy",
  "Speedy",
  "One-pan",
  "Microwave",
  "Weeknight",
  "No-fuss",
  "Basic",
  "Homestyle",
  "Cheap",
  "Dorm",
];

const suffixes = ["", " Deluxe", " Bowl", " Special", " Remix", " Mk II", " for One", " Hack"];

const optionalExtras = [
  ["hot sauce", "hot sauce"],
  ["ketchup", "ketchup"],
  ["black pepper", "pepper"],
  ["garlic powder", "garlic powder"],
  ["paprika", "paprika"],
  ["frozen peas", "frozen peas"],
  ["spring onions", "spring onions"],
];

function csvEscape(value) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function pickExtra(seed) {
  return optionalExtras[seed % optionalExtras.length];
}

function mutateIngredients(ingredients, seed) {
  const next = [...ingredients];
  if (seed % 5 === 0 && next.length > 2) {
    next.splice(seed % next.length, 1);
  }
  if (seed % 3 === 0) {
    const [line, ner] = pickExtra(seed);
    if (!next.some((item) => item.toLowerCase().includes(line.split(" ")[0]))) {
      next.push(line);
      return { ingredients: next, extraNer: ner };
    }
  }
  if (seed % 7 === 0) {
    next.push("salt");
  }
  return { ingredients: next, extraNer: null };
}

function mutateDirections(directions, seed) {
  const next = [...directions];
  if (seed % 4 === 0 && next.length > 1) {
    return [next[0], next.slice(1).join(" ")];
  }
  if (seed % 6 === 0) {
    next.push("Season to taste.");
  }
  return next;
}

mkdirSync(path.dirname(outPath), { recursive: true });

const header = ",title,ingredients,directions,link,source,NER";
const lines = [header];
let gathered = 0;
let other = 0;

for (let i = 0; i < count; i += 1) {
  const template = templates[i % templates.length];
  const adj = adjectives[i % adjectives.length];
  const suffix = suffixes[i % suffixes.length];
  const { ingredients, extraNer } = mutateIngredients(template.ingredients, i);
  const directions = mutateDirections(template.directions, i);
  const ner = extraNer ? [...template.ner, extraNer] : [...template.ner];

  // ~12% Recipes1M noise mixed through the stream (unless template forces it).
  const forceOther = template.source === "Recipes1M";
  const source = forceOther || i % 8 === 0 ? "Recipes1M" : "Gathered";
  if (source === "Gathered") gathered += 1;
  else other += 1;

  const title = `${adj} ${template.title}${suffix}`.replace(/\s+/g, " ").trim();
  const id = String(i + 1);
  lines.push(
    [
      id,
      csvEscape(title),
      csvEscape(JSON.stringify(ingredients)),
      csvEscape(JSON.stringify(directions)),
      csvEscape(`example.com/dev-corpus/${id}`),
      csvEscape(source),
      csvEscape(JSON.stringify(ner)),
    ].join(","),
  );
}

writeFileSync(outPath, `${lines.join("\n")}\n`);
console.log(
  JSON.stringify(
    {
      outPath,
      count,
      gathered,
      other,
      note: "Dev corpus only — not RecipeNLG. Gitignored under data/external/recipenlg/.",
    },
    null,
    2,
  ),
);

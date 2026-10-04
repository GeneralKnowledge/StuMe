import { writeFileSync } from "node:fs";

/** @typedef {{ id: number, title: string, ingredients: string[], directions: string[], link: string, source: string, ner: string[] }} R */

/** @type {R[]} */
const recipes = [
  {
    id: 1,
    title: "Creamy Chicken Spinach Pasta",
    ingredients: [
      "12 oz spaghetti",
      "2 chicken breasts",
      "1 cup heavy cream",
      "2 cups fresh spinach",
      "1/2 cup parmesan",
      "2 garlic cloves",
      "1 tbsp olive oil",
      "salt",
      "pepper",
    ],
    directions: [
      "Boil spaghetti until al dente.",
      "In a skillet, fry chicken breasts in olive oil.",
      "Add garlic and spinach.",
      "Pour in heavy cream and parmesan.",
      "Toss with pasta and serve.",
    ],
    link: "example.com/creamy-chicken-spinach-pasta",
    source: "Gathered",
    ner: [
      "spaghetti",
      "chicken breasts",
      "heavy cream",
      "spinach",
      "parmesan",
      "garlic",
      "olive oil",
      "salt",
      "pepper",
    ],
  },
  {
    id: 2,
    title: "Easy Egg Fried Rice",
    ingredients: [
      "2 cups leftover rice",
      "3 large eggs",
      "1 yellow onion",
      "2 tbsp soy sauce",
      "1 tbsp butter",
      "1/2 cup frozen peas",
    ],
    directions: [
      "Melt butter in a frying pan.",
      "Fry onion.",
      "Push aside and scramble eggs.",
      "Add rice, peas and soy sauce.",
      "Fry until hot.",
    ],
    link: "example.com/easy-egg-fried-rice",
    source: "Gathered",
    ner: ["rice", "eggs", "onion", "soy sauce", "butter", "frozen peas"],
  },
  {
    id: 3,
    title: "Simple Egg Fried Rice",
    ingredients: ["2 cups cooked rice", "2 eggs", "1 onion", "soy sauce", "oil"],
    directions: ["Heat oil in a pan.", "Scramble eggs.", "Add rice, onion and soy sauce.", "Fry 5 minutes."],
    link: "example.com/simple-egg-fried-rice",
    source: "Gathered",
    ner: ["rice", "eggs", "onion", "soy sauce", "oil"],
  },
  {
    id: 4,
    title: "Quick Egg Fried Rice",
    ingredients: ["microwave rice", "eggs", "soy sauce", "oil"],
    directions: ["Heat rice.", "Scramble eggs in a pan.", "Mix with soy sauce."],
    link: "example.com/quick-egg-fried-rice",
    source: "Gathered",
    ner: ["microwave rice", "eggs", "soy sauce", "oil"],
  },
  {
    id: 5,
    title: "Egg Fried Rice",
    ingredients: ["rice", "eggs", "spring onions", "soy sauce", "oil"],
    directions: ["Fry rice in oil.", "Add eggs and soy sauce.", "Finish with spring onions."],
    link: "example.com/egg-fried-rice",
    source: "Gathered",
    ner: ["rice", "eggs", "spring onions", "soy sauce", "oil"],
  },
  {
    id: 6,
    title: "Beans on Toast Deluxe",
    ingredients: ["2 slices white bread", "1 can baked beans", "1/2 cup cheddar cheese", "butter"],
    directions: [
      "Toast the bread.",
      "Heat baked beans in microwave for 2 minutes.",
      "Butter toast, add beans and cheese.",
    ],
    link: "example.com/beans-toast",
    source: "Gathered",
    ner: ["bread", "baked beans", "cheddar cheese", "butter"],
  },
  {
    id: 7,
    title: "Gourmet Truffle Mushroom Risotto",
    ingredients: [
      "arborio rice",
      "truffle oil",
      "mascarpone",
      "shallots",
      "parmesan",
      "white wine",
      "chicken stock",
      "butter",
    ],
    directions: [
      "Sweat shallots in butter.",
      "Toast arborio rice.",
      "Add wine and ladle in stock.",
      "Finish with mascarpone, parmesan and truffle oil.",
    ],
    link: "example.com/truffle-risotto",
    source: "Recipes1M",
    ner: ["rice", "truffle oil", "mascarpone", "shallots", "parmesan", "wine", "chicken stock", "butter"],
  },
  {
    id: 8,
    title: "Tomato Garlic Pasta",
    ingredients: ["penne", "canned diced tomatoes", "garlic cloves", "olive oil", "cheddar cheese", "salt"],
    directions: [
      "Boil pasta.",
      "Simmer tomatoes with garlic in olive oil for 10 minutes.",
      "Combine and add cheese.",
    ],
    link: "example.com/tomato-garlic-pasta",
    source: "Gathered",
    ner: ["penne", "canned diced tomatoes", "garlic", "olive oil", "cheddar cheese", "salt"],
  },
  {
    id: 9,
    title: "Cheesy Scrambled Eggs",
    ingredients: ["4 free-range eggs", "2 tbsp milk", "1/4 cup shredded cheddar", "butter", "salt"],
    directions: ["Beat eggs with milk.", "Scramble in butter over medium heat.", "Stir through cheese."],
    link: "example.com/cheesy-eggs",
    source: "Gathered",
    ner: ["eggs", "milk", "cheddar", "butter", "salt"],
  },
  {
    id: 10,
    title: "Microwave Mug Pasta Fail",
    ingredients: ["???"],
    directions: [],
    link: "example.com/broken",
    source: "Gathered",
    ner: [],
  },
];

const bases = [
  {
    title: "Tuna Mayo Sandwich",
    ingredients: ["bread", "canned tuna", "mayonnaise", "spring onions"],
    directions: ["Mix tuna with mayonnaise.", "Spread on bread.", "Add spring onions if using."],
    link: "example.com/tuna-mayo",
    source: "Gathered",
    ner: ["bread", "tuna", "mayonnaise", "spring onions"],
  },
  {
    title: "One Pan Sausage Pasta",
    ingredients: ["pasta", "sausages", "canned tomatoes", "onion", "garlic powder", "oil"],
    directions: [
      "Fry sausages and onion in a frying pan.",
      "Add tomatoes and garlic powder.",
      "Meanwhile boil pasta in another pan.",
      "Combine and eat.",
    ],
    link: "example.com/sausage-pasta",
    source: "Gathered",
    ner: ["pasta", "sausages", "canned tomatoes", "onion", "garlic powder", "oil"],
  },
  {
    title: "Chickpea Curry",
    ingredients: ["chickpeas", "canned tomatoes", "onion", "curry powder", "garlic", "oil", "rice"],
    directions: [
      "Fry onion and garlic.",
      "Add curry powder, chickpeas and tomatoes.",
      "Simmer 15 minutes.",
      "Serve with rice.",
    ],
    link: "example.com/chickpea-curry",
    source: "Gathered",
    ner: ["chickpeas", "canned tomatoes", "onion", "curry powder", "garlic", "oil", "rice"],
  },
  {
    title: "Loaded Oven Chips",
    ingredients: ["frozen chips", "baked beans", "cheddar cheese"],
    directions: [
      "Bake frozen chips in the oven for 20 minutes.",
      "Heat beans.",
      "Top chips with beans and cheese.",
    ],
    link: "example.com/loaded-chips",
    source: "Gathered",
    ner: ["frozen chips", "baked beans", "cheddar cheese"],
  },
  {
    title: "Garlic Butter Mushrooms on Toast",
    ingredients: ["mushrooms", "butter", "fresh garlic cloves", "bread", "parsley to garnish"],
    directions: [
      "Fry mushrooms in butter with garlic.",
      "Toast bread.",
      "Pile on toast and garnish with parsley.",
    ],
    link: "example.com/mushrooms-toast",
    source: "Gathered",
    ner: ["mushrooms", "butter", "garlic", "bread", "parsley"],
  },
  {
    title: "Creamy Mushroom Pasta",
    ingredients: ["fusilli", "mushrooms", "double cream", "pecorino", "shallots", "butter"],
    directions: [
      "Boil pasta.",
      "Fry shallots and mushrooms in butter.",
      "Add cream and pecorino.",
      "Toss with pasta.",
    ],
    link: "example.com/cream-mushroom-pasta",
    source: "Gathered",
    ner: ["fusilli", "mushrooms", "double cream", "pecorino", "shallots", "butter"],
  },
  {
    title: "Instant Noodle Egg Bowl",
    ingredients: ["instant noodles", "1 large egg", "soy sauce", "spring onions", "hot sauce"],
    directions: [
      "Cook noodles with kettle water.",
      "Fry egg in a pan.",
      "Combine with soy sauce and hot sauce.",
    ],
    link: "example.com/noodle-egg",
    source: "Gathered",
    ner: ["instant noodles", "egg", "soy sauce", "spring onions", "hot sauce"],
  },
  {
    title: "Halloumi Buddha Bowl",
    ingredients: ["halloumi", "quinoa", "fresh chilli", "lemongrass", "coconut milk", "microgreens"],
    directions: [
      "Cook quinoa.",
      "Fry halloumi.",
      "Make sauce with coconut milk, chilli and lemongrass.",
      "Assemble bowl with microgreens.",
    ],
    link: "example.com/halloumi-bowl",
    source: "Recipes1M",
    ner: ["halloumi", "quinoa", "chilli", "lemongrass", "coconut milk", "microgreens"],
  },
  {
    title: "Pesto Pasta with Pine Nuts",
    ingredients: ["spaghetti", "fresh basil", "pine nuts", "parmesan", "olive oil", "garlic"],
    directions: [
      "Blend basil, pine nuts, garlic, parmesan and oil in a food processor.",
      "Boil pasta.",
      "Toss together.",
    ],
    link: "example.com/pesto",
    source: "Recipes1M",
    ner: ["spaghetti", "basil", "pine nuts", "parmesan", "olive oil", "garlic"],
  },
  {
    title: "Jacket Potato with Beans",
    ingredients: ["baking potato", "baked beans", "cheddar cheese", "butter"],
    directions: [
      "Microwave potato for 8 minutes.",
      "Heat beans.",
      "Split potato, add butter, beans and cheese.",
    ],
    link: "example.com/jacket",
    source: "Gathered",
    ner: ["potato", "baked beans", "cheddar cheese", "butter"],
  },
  {
    title: "Cheese Toastie",
    ingredients: ["bread", "cheddar cheese", "butter"],
    directions: ["Butter bread.", "Add cheese.", "Fry in a pan until golden, about 6 minutes."],
    link: "example.com/toastie",
    source: "Gathered",
    ner: ["bread", "cheddar cheese", "butter"],
  },
  {
    title: "Chicken Stock Risotto Attempt",
    ingredients: ["rice", "chicken stock", "parmesan", "shallots", "butter", "white wine", "saffron"],
    directions: [
      "Sweat shallots.",
      "Add rice and wine.",
      "Add chicken stock gradually for 40 minutes.",
      "Finish with saffron and parmesan.",
    ],
    link: "example.com/stock-risotto",
    source: "Recipes1M",
    ner: ["rice", "chicken stock", "parmesan", "shallots", "butter", "wine", "saffron"],
  },
  {
    title: "Frozen Veg Egg Rice",
    ingredients: ["microwave rice", "frozen mixed vegetables", "eggs", "soy sauce", "oil"],
    directions: [
      "Microwave rice and vegetables.",
      "Scramble eggs in a frying pan.",
      "Mix everything with soy sauce.",
    ],
    link: "example.com/veg-egg-rice",
    source: "Gathered",
    ner: ["microwave rice", "frozen mixed vegetables", "eggs", "soy sauce", "oil"],
  },
  {
    title: "Bacon Carbonara Fancy",
    ingredients: ["spaghetti", "bacon", "eggs", "parmesan", "fresh parsley", "black pepper"],
    directions: [
      "Boil pasta.",
      "Fry bacon.",
      "Mix eggs and parmesan.",
      "Toss off heat and garnish with parsley.",
    ],
    link: "example.com/carbonara",
    source: "Gathered",
    ner: ["spaghetti", "bacon", "eggs", "parmesan", "parsley", "pepper"],
  },
  {
    title: "Oat Porridge",
    ingredients: ["rolled oats", "milk", "salt"],
    directions: ["Microwave oats and milk for 3 minutes.", "Stir and eat."],
    link: "example.com/porridge",
    source: "Gathered",
    ner: ["oats", "milk", "salt"],
  },
];

let id = recipes.length + 1;
for (const base of bases) {
  recipes.push({ id: id++, ...base });
}

recipes.push({
  id: id++,
  title: "Best Homemade Egg Fried Rice",
  ingredients: ["cooked rice", "eggs", "onion", "soy sauce", "butter"],
  directions: ["Fry onion in butter.", "Add eggs and rice.", "Season with soy sauce."],
  link: "example.com/best-egg-fried-rice",
  source: "Gathered",
  ner: ["rice", "eggs", "onion", "soy sauce", "butter"],
});

recipes.push({
  id: id++,
  title: "Spinach and Cream Cheese Pasta",
  ingredients: ["pasta", "fresh spinach", "cream cheese", "garlic cloves", "milk", "salt"],
  directions: ["Boil pasta.", "Wilt spinach with garlic.", "Stir in cream cheese and milk.", "Combine."],
  link: "example.com/spinach-cream-cheese",
  source: "Gathered",
  ner: ["pasta", "spinach", "cream cheese", "garlic", "milk", "salt"],
});

recipes.push({
  id: id++,
  title: "Long Complicated Sunday Roast",
  ingredients: Array.from({ length: 18 }, (_, i) => `ingredient ${i + 1}`),
  directions: Array.from({ length: 18 }, (_, i) => `Step ${i + 1} with specialist technique.`),
  link: "example.com/roast",
  source: "Recipes1M",
  ner: ["beef", "potatoes", "gravy"],
});

recipes.push({
  id: id++,
  title: "Suspicious Quantity Soup",
  ingredients: ["3 1 2 cups water", "null", "1 can soup", "????"],
  directions: ["Heat soup.", "Add water."],
  link: "example.com/suspicious",
  source: "Gathered",
  ner: ["soup", "water"],
});

const extras = [
  ["Tomato Cheese Toast", ["bread", "cheddar cheese", "tomato"], ["Toast bread.", "Top with cheese and tomato.", "Grill until melted."], ["bread", "cheese", "tomato"]],
  ["Pea Omelette", ["eggs", "frozen peas", "butter", "cheddar cheese"], ["Microwave peas.", "Make omelette in butter.", "Add peas and cheese."], ["eggs", "frozen peas", "butter", "cheese"]],
  ["Garlic Bread", ["bread", "butter", "fresh garlic cloves"], ["Mix butter and garlic.", "Spread on bread.", "Grill 5 minutes."], ["bread", "butter", "garlic"]],
  ["Chickpea Wrap", ["wraps", "chickpeas", "olive oil", "paprika", "cheese"], ["Mash chickpeas with oil and paprika.", "Fill wrap.", "Add cheese."], ["wraps", "chickpeas", "oil", "paprika", "cheese"]],
  ["Soy Egg Rice Bowl", ["rice", "eggs", "soy sauce", "frozen peas", "oil"], ["Cook rice.", "Fry eggs.", "Mix with peas and soy sauce."], ["rice", "eggs", "soy sauce", "frozen peas", "oil"]],
  ["Tuna Pasta Bake-ish", ["pasta", "canned tuna", "canned tomatoes", "cheddar cheese", "onion"], ["Boil pasta.", "Simmer tuna, tomatoes and onion.", "Top with cheese."], ["pasta", "tuna", "canned tomatoes", "cheese", "onion"]],
  ["Broken Empty", [], [], []],
  ["Single Ingredient Salt", ["salt"], ["Taste salt."], ["salt"]],
];

for (const [title, ingredients, directions, ner] of extras) {
  recipes.push({
    id: id++,
    title,
    ingredients,
    directions,
    link: `example.com/${id}`,
    source: "Gathered",
    ner,
  });
}

function csvEscape(value) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const header = ",title,ingredients,directions,link,source,NER";
const lines = [header];
for (const recipe of recipes) {
  lines.push(
    [
      String(recipe.id),
      csvEscape(recipe.title),
      csvEscape(JSON.stringify(recipe.ingredients)),
      csvEscape(JSON.stringify(recipe.directions)),
      csvEscape(recipe.link),
      csvEscape(recipe.source),
      csvEscape(JSON.stringify(recipe.ner)),
    ].join(","),
  );
}

writeFileSync("data/fixtures/recipenlg_sample.csv", `${lines.join("\n")}\n`);
console.log(`Wrote ${recipes.length} fixture recipes`);

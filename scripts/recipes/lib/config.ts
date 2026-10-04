export const TRANSFORMATION_VERSION = "student-corruptor-v1";

export const PIPELINE_DEFAULTS = {
  preferGathered: true,
  minIngredients: 2,
  maxIngredients: 14,
  minSteps: 1,
  maxSteps: 12,
  sampleLimit: 5000,
  suitabilityThreshold: 12,
  maxExamplesInReport: 50,
} as const;

/** Configurable student-friendly ingredient metadata (not a hard blacklist of foods). */
export interface IngredientMeta {
  /** Canonical concept name used by the normalizer */
  concept: string;
  /** Preferred StuMe slug when known */
  stumeSlug?: string;
  /** Positive contribution to suitability */
  studentReward: number;
  /** Penalty when rare/specialist/luxury */
  specialistPenalty: number;
  rarity: "common" | "uncommon" | "specialist" | "luxury";
  aliases: string[];
}

export const INGREDIENT_META: IngredientMeta[] = [
  { concept: "egg", stumeSlug: "eggs", studentReward: 8, specialistPenalty: 0, rarity: "common", aliases: ["egg", "eggs", "large egg", "large eggs", "free range eggs", "free-range eggs"] },
  { concept: "rice", stumeSlug: "rice", studentReward: 8, specialistPenalty: 0, rarity: "common", aliases: ["rice", "white rice", "long grain rice", "jasmine rice", "basmati rice", "leftover rice"] },
  { concept: "microwave rice", stumeSlug: "microwave-rice", studentReward: 7, specialistPenalty: 0, rarity: "common", aliases: ["microwave rice", "ready rice", "packet rice"] },
  { concept: "pasta", stumeSlug: "pasta", studentReward: 8, specialistPenalty: 0, rarity: "common", aliases: ["pasta", "spaghetti", "penne", "fusilli", "macaroni", "linguine", "fettuccine", "noodles pasta"] },
  { concept: "noodles", stumeSlug: "noodles", studentReward: 7, specialistPenalty: 0, rarity: "common", aliases: ["noodles", "egg noodles", "wheat noodles"] },
  { concept: "instant noodles", stumeSlug: "instant-noodles", studentReward: 8, specialistPenalty: 0, rarity: "common", aliases: ["instant noodles", "ramen", "pot noodle", "ramen noodles"] },
  { concept: "bread", stumeSlug: "bread", studentReward: 8, specialistPenalty: 0, rarity: "common", aliases: ["bread", "white bread", "sliced bread", "toast", "bread slices"] },
  { concept: "wrap", stumeSlug: "wraps", studentReward: 5, specialistPenalty: 0, rarity: "common", aliases: ["wrap", "wraps", "tortilla", "tortillas"] },
  { concept: "potato", stumeSlug: "potatoes", studentReward: 7, specialistPenalty: 0, rarity: "common", aliases: ["potato", "potatoes", "baking potato", "jacket potato"] },
  { concept: "onion", stumeSlug: "onions", studentReward: 8, specialistPenalty: 0, rarity: "common", aliases: ["onion", "onions", "yellow onion", "white onion", "brown onion", "red onion"] },
  { concept: "shallot", stumeSlug: "onions", studentReward: 3, specialistPenalty: 1, rarity: "uncommon", aliases: ["shallot", "shallots"] },
  { concept: "spring onion", stumeSlug: "spring-onions", studentReward: 4, specialistPenalty: 0, rarity: "common", aliases: ["spring onion", "spring onions", "green onion", "green onions", "scallion", "scallions"] },
  { concept: "garlic", stumeSlug: "garlic", studentReward: 7, specialistPenalty: 0, rarity: "common", aliases: ["garlic", "garlic clove", "garlic cloves", "fresh garlic", "fresh garlic cloves", "minced garlic"] },
  { concept: "garlic powder", stumeSlug: "garlic-powder", studentReward: 6, specialistPenalty: 0, rarity: "common", aliases: ["garlic powder", "garlic granules", "granulated garlic"] },
  { concept: "mushroom", stumeSlug: "mushrooms", studentReward: 6, specialistPenalty: 0, rarity: "common", aliases: ["mushroom", "mushrooms", "button mushrooms", "chestnut mushrooms"] },
  { concept: "tomato", stumeSlug: "tomatoes", studentReward: 5, specialistPenalty: 0, rarity: "common", aliases: ["tomato", "tomatoes", "fresh tomato", "fresh tomatoes", "cherry tomatoes"] },
  { concept: "tinned tomato", stumeSlug: "chopped-tomatoes", studentReward: 8, specialistPenalty: 0, rarity: "common", aliases: ["canned tomatoes", "tinned tomatoes", "chopped tomatoes", "diced tomatoes", "canned diced tomatoes", "crushed tomatoes"] },
  { concept: "pepper", stumeSlug: "peppers", studentReward: 4, specialistPenalty: 0, rarity: "common", aliases: ["bell pepper", "peppers", "red pepper", "green pepper", "capsicum"] },
  { concept: "carrot", stumeSlug: "carrots", studentReward: 5, specialistPenalty: 0, rarity: "common", aliases: ["carrot", "carrots"] },
  { concept: "frozen peas", stumeSlug: "frozen-peas", studentReward: 7, specialistPenalty: 0, rarity: "common", aliases: ["frozen peas", "peas", "garden peas"] },
  { concept: "frozen mixed vegetables", stumeSlug: "frozen-mixed-vegetables", studentReward: 7, specialistPenalty: 0, rarity: "common", aliases: ["frozen vegetables", "frozen mixed vegetables", "mixed vegetables"] },
  { concept: "spinach", stumeSlug: "spinach", studentReward: 4, specialistPenalty: 0, rarity: "common", aliases: ["spinach", "fresh spinach", "baby spinach"] },
  { concept: "frozen spinach", stumeSlug: "spinach", studentReward: 6, specialistPenalty: 0, rarity: "common", aliases: ["frozen spinach"] },
  { concept: "sweetcorn", stumeSlug: "sweetcorn", studentReward: 5, specialistPenalty: 0, rarity: "common", aliases: ["sweetcorn", "corn", "canned corn", "tinned sweetcorn"] },
  { concept: "cheese", stumeSlug: "cheese", studentReward: 7, specialistPenalty: 0, rarity: "common", aliases: ["cheese", "cheddar", "cheddar cheese", "shredded cheddar", "grated cheese", "mozzarella", "american cheese"] },
  { concept: "parmesan", stumeSlug: "cheese", studentReward: 2, specialistPenalty: 3, rarity: "uncommon", aliases: ["parmesan", "parmigiano", "parmigiano-reggiano", "pecorino", "pecorino romano"] },
  { concept: "milk", stumeSlug: "milk", studentReward: 6, specialistPenalty: 0, rarity: "common", aliases: ["milk", "whole milk", "semi skimmed milk", "2% milk"] },
  { concept: "butter", stumeSlug: "butter", studentReward: 6, specialistPenalty: 0, rarity: "common", aliases: ["butter", "unsalted butter", "salted butter", "margarine"] },
  { concept: "oil", stumeSlug: "oil", studentReward: 6, specialistPenalty: 0, rarity: "common", aliases: ["oil", "olive oil", "vegetable oil", "sunflower oil", "cooking oil", "canola oil"] },
  { concept: "cream", stumeSlug: "milk", studentReward: 1, specialistPenalty: 3, rarity: "uncommon", aliases: ["cream", "heavy cream", "double cream", "whipping cream", "single cream", "sour cream"] },
  { concept: "cream cheese", stumeSlug: "cream-cheese", studentReward: 3, specialistPenalty: 1, rarity: "uncommon", aliases: ["cream cheese"] },
  { concept: "oats", stumeSlug: "oats", studentReward: 6, specialistPenalty: 0, rarity: "common", aliases: ["oats", "rolled oats", "porridge oats"] },
  { concept: "flour", stumeSlug: "flour", studentReward: 5, specialistPenalty: 0, rarity: "common", aliases: ["flour", "plain flour", "all purpose flour", "all-purpose flour", "self raising flour"] },
  { concept: "baked beans", stumeSlug: "baked-beans", studentReward: 8, specialistPenalty: 0, rarity: "common", aliases: ["baked beans", "beans in tomato sauce"] },
  { concept: "chickpeas", stumeSlug: "chickpeas", studentReward: 7, specialistPenalty: 0, rarity: "common", aliases: ["chickpeas", "garbanzo beans", "canned chickpeas"] },
  { concept: "kidney beans", stumeSlug: "kidney-beans", studentReward: 6, specialistPenalty: 0, rarity: "common", aliases: ["kidney beans", "red kidney beans", "canned kidney beans"] },
  { concept: "lentils", studentReward: 6, specialistPenalty: 0, rarity: "common", aliases: ["lentils", "red lentils", "green lentils", "brown lentils"] },
  { concept: "tuna", stumeSlug: "tuna", studentReward: 7, specialistPenalty: 0, rarity: "common", aliases: ["tuna", "canned tuna", "tinned tuna", "tuna in brine"] },
  { concept: "chicken breast", stumeSlug: "chicken-breast", studentReward: 4, specialistPenalty: 1, rarity: "uncommon", aliases: ["chicken breast", "chicken breasts", "boneless chicken breast"] },
  { concept: "chicken", stumeSlug: "cooked-chicken", studentReward: 5, specialistPenalty: 0, rarity: "common", aliases: ["chicken", "cooked chicken", "leftover chicken", "chicken pieces", "chicken thigh", "chicken thighs"] },
  { concept: "bacon", stumeSlug: "bacon", studentReward: 4, specialistPenalty: 1, rarity: "uncommon", aliases: ["bacon", "streaky bacon", "bacon bits"] },
  { concept: "sausage", stumeSlug: "sausages", studentReward: 5, specialistPenalty: 0, rarity: "common", aliases: ["sausage", "sausages", "pork sausage"] },
  { concept: "ham", stumeSlug: "ham", studentReward: 5, specialistPenalty: 0, rarity: "common", aliases: ["ham", "cooked ham", "sliced ham"] },
  { concept: "soy sauce", stumeSlug: "soy-sauce", studentReward: 6, specialistPenalty: 0, rarity: "common", aliases: ["soy sauce", "soya sauce", "light soy sauce"] },
  { concept: "stock cube", stumeSlug: "stock-cubes", studentReward: 6, specialistPenalty: 0, rarity: "common", aliases: ["stock cube", "stock cubes", "chicken stock cube", "vegetable stock cube", "bouillon cube"] },
  { concept: "stock", stumeSlug: "stock-cubes", studentReward: 2, specialistPenalty: 2, rarity: "uncommon", aliases: ["chicken stock", "vegetable stock", "beef stock", "broth", "chicken broth"] },
  { concept: "curry powder", stumeSlug: "curry-powder", studentReward: 5, specialistPenalty: 0, rarity: "common", aliases: ["curry powder"] },
  { concept: "paprika", stumeSlug: "paprika", studentReward: 3, specialistPenalty: 0, rarity: "common", aliases: ["paprika", "smoked paprika"] },
  { concept: "hot sauce", stumeSlug: "hot-sauce", studentReward: 4, specialistPenalty: 0, rarity: "common", aliases: ["hot sauce", "chili sauce", "chilli sauce", "sriracha"] },
  { concept: "ketchup", stumeSlug: "ketchup", studentReward: 3, specialistPenalty: 0, rarity: "common", aliases: ["ketchup", "tomato ketchup"] },
  { concept: "mayonnaise", stumeSlug: "mayonnaise", studentReward: 3, specialistPenalty: 0, rarity: "common", aliases: ["mayonnaise", "mayo"] },
  { concept: "mustard", stumeSlug: "mustard", studentReward: 2, specialistPenalty: 0, rarity: "common", aliases: ["mustard", "dijon mustard", "yellow mustard"] },
  { concept: "frozen chips", stumeSlug: "frozen-chips", studentReward: 7, specialistPenalty: 0, rarity: "common", aliases: ["frozen chips", "chips", "french fries", "oven chips"] },
  { concept: "tomato pasta sauce", stumeSlug: "tomato-pasta-sauce", studentReward: 7, specialistPenalty: 0, rarity: "common", aliases: ["pasta sauce", "tomato pasta sauce", "jarred pasta sauce", "marinara sauce"] },
  { concept: "salt", stumeSlug: "salt", studentReward: 1, specialistPenalty: 0, rarity: "common", aliases: ["salt", "sea salt", "kosher salt"] },
  { concept: "black pepper", stumeSlug: "pepper", studentReward: 1, specialistPenalty: 0, rarity: "common", aliases: ["pepper", "black pepper", "ground pepper"] },
  { concept: "chilli flakes", stumeSlug: "hot-sauce", studentReward: 3, specialistPenalty: 0, rarity: "common", aliases: ["chilli flakes", "chili flakes", "red pepper flakes", "crushed chilli"] },
  { concept: "fresh chilli", studentReward: 1, specialistPenalty: 2, rarity: "uncommon", aliases: ["fresh chilli", "fresh chili", "red chilli", "green chilli", "jalapeno", "jalapeño"] },
  { concept: "fresh herbs", studentReward: 0, specialistPenalty: 3, rarity: "specialist", aliases: ["fresh basil", "fresh parsley", "fresh coriander", "fresh cilantro", "fresh thyme", "fresh rosemary", "fresh dill"] },
  { concept: "dried herbs", stumeSlug: "paprika", studentReward: 2, specialistPenalty: 0, rarity: "common", aliases: ["dried basil", "dried oregano", "dried herbs", "italian seasoning", "mixed herbs"] },
  { concept: "saffron", studentReward: 0, specialistPenalty: 12, rarity: "luxury", aliases: ["saffron"] },
  { concept: "truffle", studentReward: 0, specialistPenalty: 14, rarity: "luxury", aliases: ["truffle", "truffle oil", "truffles"] },
  { concept: "gochujang", studentReward: 0, specialistPenalty: 6, rarity: "specialist", aliases: ["gochujang"] },
  { concept: "mirin", studentReward: 0, specialistPenalty: 6, rarity: "specialist", aliases: ["mirin"] },
  { concept: "fish sauce", studentReward: 0, specialistPenalty: 5, rarity: "specialist", aliases: ["fish sauce"] },
  { concept: "paneer", studentReward: 0, specialistPenalty: 5, rarity: "specialist", aliases: ["paneer"] },
  { concept: "halloumi", studentReward: 0, specialistPenalty: 5, rarity: "specialist", aliases: ["halloumi"] },
  { concept: "coconut milk", studentReward: 1, specialistPenalty: 3, rarity: "uncommon", aliases: ["coconut milk"] },
  { concept: "lemongrass", studentReward: 0, specialistPenalty: 6, rarity: "specialist", aliases: ["lemongrass", "lemon grass"] },
  { concept: "prosciutto", studentReward: 0, specialistPenalty: 7, rarity: "luxury", aliases: ["prosciutto"] },
  { concept: "pine nuts", studentReward: 0, specialistPenalty: 7, rarity: "luxury", aliases: ["pine nuts", "pinenuts"] },
  { concept: "mascarpone", studentReward: 0, specialistPenalty: 6, rarity: "specialist", aliases: ["mascarpone"] },
];

export const GARNISH_PATTERNS = [
  /fresh (basil|parsley|coriander|cilantro|thyme|rosemary)/i,
  /chopped parsley/i,
  /to garnish/i,
  /for garnish/i,
  /microgreens/i,
  /edible flowers/i,
];

export const SPECIALIST_EQUIPMENT = [
  "food processor",
  "stand mixer",
  "blender",
  "immersion blender",
  "sous vide",
  "mandoline",
  "pasta machine",
  "ice cream maker",
  "pressure cooker",
  "slow cooker",
  "wok",
  "dutch oven",
  "cast iron skillet",
  "bain marie",
  "double boiler",
];

export const COMMON_EQUIPMENT = [
  "frying pan",
  "saucepan",
  "pan",
  "microwave",
  "oven",
  "knife",
  "bowl",
  "toaster",
  "kettle",
  "tray",
  "grill",
  "hob",
];

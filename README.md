# StuMe — Cheap, Quick Student Cooking Engine

StuMe answers one hungry question:

**What can I make with the stuff I’ve already got?**

It is not a traditional recipe website and not an AI chatbot. The core is a deterministic **ingredient → transformation → component → recipe** graph plus a persistent recipe cache. An LLM is an optional batch author used only when the cache lacks enough suitable variety.

## Architecture

```
INGREDIENT GRAPH
       ↓
COMPONENT / TRANSFORMATION GRAPH
       ↓
RECIPE CANDIDATES
       ↓
RECIPE CACHE
       ↓
USER
```

LLM path (optional):

```
User inventory → Graph engine → Candidate combinations → Recipe cache
  ├── enough suitable recipes → return cached recipes
  └── insufficient variety → batch LLM/heuristic generation
                              → validate → cache → return
```

Stack:

- TypeScript + Next.js (App Router)
- SQLite + Prisma
- Deterministic graph/scoring engines in `src/lib`
- Pluggable `RecipeGenerator` interface
- Simple React UI optimised for “open app while hungry”

## Graph model

- **Ingredients**: common UK/student supermarket items with cost category, storage, shelf life, versatility, waste risk.
- **Transformations**: intermediate cooking steps (`egg + butter → scrambled egg`, `mushroom + onion + butter → fried mushroom & onion`).
- **Components**: outputs of transformations that can feed later transformations.
- **Recipes**: practical meals referencing ingredients + graph path/components, stored in the recipe cache.

Composition example:

```
onion + mushroom + butter → fried mushroom & onion
fried mushroom & onion + egg + rice → mushroom egg fried rice
```

## How recipes are generated

1. Score cached recipes against the current kitchen.
2. If there are enough “make now” results, return them. No LLM call.
3. If not, call `RecipeGenerator.generateBatch(...)` with structured JSON input.
4. Validate every draft against the graph (known ingredients/components/transforms, no specialist junk, no duplicates).
5. Cache accepted recipes; store rejected signatures so they are not retried forever.

Default provider is `disabled`. Set `LLM_PROVIDER=heuristic` for offline batch drafting, or `openai` with `OPENAI_API_KEY`.

## Caching

Recipes persist in SQLite (`Recipe` table) with:

- title, description, steps, time, difficulty, equipment
- estimated cost, tags, graph path/components
- generation source, signature, popularity/use counters, timestamps

Multiple distinct recipes can share similar ingredient sets. Near-duplicates are blocked via recipe signatures (core ingredients + method + style + graph path).

## Shopping recommendations

Not a normal shopping list. StuMe asks:

> Which cheap item unlocks the most useful new meals from what I already own?

Ranked by unlock value, meals improved, shelf life, versatility, low cost, minus waste risk. The UI also shows a “buy 3 things” bundle.

Relative cost categories only: `very_cheap`, `cheap`, `moderate`, `expensive`.

## User kitchen

`/kitchen` lets you:

- add/remove ingredients
- optional quantity text
- mark staples / expiring soon
- fridge / freezer / cupboard storage

Home screen sections:

- **Make now**
- **Use this soon**
- **Almost there**
- **Good next buys**
- **If you buy 3 things**

## Setup

```bash
npm install
cp .env.example .env
npm run setup
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

## Scripts

| Command | Purpose |
|---|---|
| `npm run setup` | Push schema + seed graph/recipes/demo kitchen |
| `npm run demo:ready` | Curate demo corpus, seed DB, validate recommendations |
| `npm run demo` | Run recommendation engine on representative inventories |
| `npm test` | Automated graph/scoring/cache/e2e tests |
| `npm run db:seed` | Re-seed database (`STUME_CORPUS=demo\|refined`) |
| `npm run recipes:curate-demo` | Build the small demo corpus from refined |
| `npm run dev` | Next.js dev server |

## How to add ingredients

1. Add an entry in `prisma/seed/ingredients.ts`.
2. Re-run `npm run db:seed`.

Fields that matter: `slug`, `costCategory`, `shelfLifeDays`, `defaultStorage`, `versatility`, `wasteRisk`, `isEssential`.

## How to add transformations

1. Add an entry in `prisma/seed/transformations.ts`.
2. Declare inputs (ingredient and/or component slugs), optional flags, equipment, time, and an `outputSlug`.
3. Re-seed.

Keep transformations small and composable. Prefer intermediate components over jumping straight to finished meals.

## How to add recipes

1. Add a practical recipe in `prisma/seed/recipes.ts`.
2. List real ingredient slugs, mark truly optional extras.
3. Include `graphPath` / `componentSlugs` when the meal uses graph outputs.
4. Re-seed.

Write steps like a hungry student, not a cookbook.

## Connecting an LLM provider

Implement or use the existing interface in `src/lib/llm/generator.ts`:

```ts
interface RecipeGenerator {
  generateBatch(request, constraints): Promise<GeneratedRecipeDraft[]>
}
```

Env:

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

Or offline:

```bash
LLM_PROVIDER=heuristic
```

The generator must return structured JSON drafts. It never writes directly to the database. Validation always runs first.

## Demo / test inventories

For a solid local demo (curated ~120 corpus recipes + Demo Kitchen seed):

```bash
npm run demo:ready
npm run dev
```

`STUME_CORPUS` selects the candidates file (`demo` preferred when present, else `refined`). Use `STUME_CORPUS=refined` to load the full ~9k snapshot.

CLI validation across representative inventories:

```bash
npm run demo
```

Covers:

- Nearly empty kitchen
- Basic student kitchen
- Random fridge
- Cheap cupboard
- Freezer-heavy kitchen
- Microwave student

The home UI also has one-click demo inventory buttons.

## Tests

```bash
npm test
```

Covers graph lookup/composition, scoring preferences, shopping unlock ranking, cache reuse, duplicate rejection, batch generation triggers, validation, and the rice/egg/mushroom end-to-end case without an LLM.

## Product constraint

The MVP proves one thing:

> A small graph of common cheap ingredients can produce a surprisingly large and useful cooking space.

Microwave rice, frozen chips, instant noodles, baked beans, and leftover mushrooms are first-class citizens.

## RecipeNLG student corpus pipeline

Separate from the Next.js app. Deterministic inspect → filter → normalize → corrupt → validate → dedupe flow.

**Do not commit raw recipe corpora.** The official RecipeNLG download is often broken — use an alternate corpus instead (see `data/README.md`). The app does not require any external corpus.

```bash
# Dev fixture (checked in)
npm run recipes:fixture
npm run recipes:inspect -- data/fixtures/recipenlg_sample.csv
npm run recipes:sample -- data/fixtures/recipenlg_sample.csv --limit 200

# Recommended alternate: ReciFine on Hugging Face (no captcha)
npm run recipes:import -- --format recifine --limit 5000
npm run recipes:sample -- data/external/recifine/sample_5000.csv --limit 5000 --gathered-only

# Or Food.com-cleaned recipes
npm run recipes:import -- --format iris314 --limit 5000
npm run recipes:sample -- data/external/foodcom/sample_5000.csv --limit 5000
```

Pipeline outputs land in `data/generated/student-candidates/` (gitignored by default): `inspect.md`, `report.md`, `examples.md`, `candidates.json`.

Curated corpus snapshots:

- `data/generated/student-candidates/valid-5k/` — earlier synthetic dry-run (467 valid)
- `data/generated/student-candidates/refined/` — **5224 refined ReciFine recipes** (100k Gathered pull) promoted into the app DB (`generationSource: corpus`)

```bash
# Bulk expand (import → sample → refine uncapped → optional seed)
npm run recipes:expand -- --limit 100000 --ingest

# Or step-by-step
npm run recipes:refine -- --input data/generated/student-candidates/sample/candidates.json --limit 0 --no-struggle-caps
npm run recipes:ingest
```

Architecture:

```
RecipeNLG
  → deterministic filtering
  → normalization
  → student corruption (practical / student / struggle)
  → validation against StuMe graph
  → deduplication
  → small candidate corpus
  → OPTIONAL LLM wording cleanup later
```

The existing 40 hand-authored seed recipes remain the baseline. This pipeline does **not** import millions of rows into SQLite.

### Super foods

StuMe tracks **super foods**: low-effort ingredients that either:

1. **unlock** the most new meals from what you already have, or
2. **fancy up** meals you can already make (optional upgrades like cheese, soy sauce, frozen peas)

They appear on the home screen and in RecipeNLG sample reports (`topSuperFoods`).

# StuMe external & generated data

This directory holds **build-time** recipe corpus inputs and pipeline outputs.

## Licensing / provenance

- **Do not commit** the raw RecipeNLG dataset into this repository.
- RecipeNLG is an external corpus. Obtain it yourself and point the pipeline at a local path.
- Generated StuMe candidates under `generated/` are **transformed/curated** outputs with provenance metadata. They are not a redistributed copy of RecipeNLG.
- Before any public redistribution of derived data, review and document what the source terms permit. See [RecipeNLG](https://github.com/Glorf/recipenlg) and the dataset homepage linked from that project.

## Layout

```
data/
  external/recipenlg/     # place full_dataset.csv here (gitignored content)
  fixtures/               # tiny synthetic RecipeNLG-shaped CSV for tests/dev
  generated/              # pipeline outputs (gitignored by default except .gitkeep)
    student-candidates/
      valid-5k/           # earlier synthetic dry-run snapshot (committed)
      refined/            # promoted ReciFine subset for DB ingest (committed)
```

## Obtaining a recipe corpus (alternatives)

The official RecipeNLG site download is often broken (captcha / HTTP 500).
You do **not** need it for StuMe. Use one of these instead:

### 1) ReciFine on Hugging Face (best drop-in)

ReciFine is a public Hugging Face CSV with RecipeNLG-compatible
`title/ingredients/directions/link/source/NER` columns (plus extra annotations).
No captcha. Stream a 5k Gathered sample and convert:

```bash
npm run recipes:import -- --format recifine --limit 5000
npm run recipes:sample -- data/external/recifine/sample_5000.csv --limit 5000 --gathered-only
```

Source: https://huggingface.co/datasets/nuhuibrahim/recifine  
(Full file is large ~3GB; `--limit 5000` stops early.)

### 2) Food.com cleaned recipes on Hugging Face

~180k Food.com-derived recipes (`Iris314/recipe-cleaned`). Converted to
RecipeNLG-shaped CSV with `source=FoodCom`:

```bash
npm run recipes:import -- --format iris314 --limit 5000
npm run recipes:sample -- data/external/foodcom/sample_5000.csv --limit 5000
```

Source: https://huggingface.co/datasets/Iris314/recipe-cleaned

### 3) Kaggle mirrors (if you have a Kaggle account)

- RecipeNLG mirror: https://www.kaggle.com/datasets/nithyasrikumaravelu/recipenlgrecipe-genie  
- Food.com RAW recipes: https://www.kaggle.com/datasets/shuyangli94/food-com-recipes-and-user-interactions  

Then either point `recipes:sample` at a RecipeNLG-shaped CSV, or:

```bash
npm run recipes:import -- --format foodcom --input /path/to/RAW_recipes.csv --limit 5000
```

### 4) Official RecipeNLG (if the site works again)

1. https://github.com/Glorf/recipenlg → project homepage → `full_dataset.csv`
2. Place at `data/external/recipenlg/full_dataset.csv`
3. `npm run recipes:sample -- data/external/recipenlg/full_dataset.csv --limit 5000`

Expected RecipeNLG columns:

`id,title,ingredients,directions,link,source,NER`

Where `ingredients`, `directions`, and `NER` are Python/JSON list strings.
`source=Gathered` is the cleaner subset (~1.6M of ~2.23M).

## Dev without the full corpus

Use the checked-in fixture:

```bash
npm run recipes:inspect -- data/fixtures/recipenlg_sample.csv
npm run recipes:sample -- data/fixtures/recipenlg_sample.csv --limit 200
```

For a **5k-scale** pipeline dry-run without downloading RecipeNLG, generate a
local RecipeNLG-*shaped* development corpus (gitignored, not the real dataset):

```bash
npm run recipes:dev-corpus -- --count 5000
npm run recipes:sample -- data/external/recipenlg/dev_corpus_5000.csv --limit 5000 --gathered-only
```

`recipes:sample` streams the CSV and keeps a bounded Gathered-preferring reservoir
sample, so pointing it at a real multi-million-row `full_dataset.csv` stays memory-safe.

The Next.js app does **not** require RecipeNLG to be present.

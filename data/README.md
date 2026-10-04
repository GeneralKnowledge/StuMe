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
```

## Obtaining RecipeNLG

1. Visit the RecipeNLG project: https://github.com/Glorf/recipenlg  
2. Follow their instructions / homepage to download `dataset.zip` / `full_dataset.csv` manually.  
3. Place the CSV somewhere local, e.g. `data/external/recipenlg/full_dataset.csv`.  
4. Run pipeline commands with that path:

```bash
npm run recipes:inspect -- data/external/recipenlg/full_dataset.csv
npm run recipes:sample -- data/external/recipenlg/full_dataset.csv --limit 5000
```

Expected columns (in order):

`id,title,ingredients,directions,link,source,NER`

Where `ingredients`, `directions`, and `NER` are Python/JSON list strings.

The `source=Gathered` subset is reported by the dataset authors as cleaner (~1.6M of ~2.23M).

## Dev without the full corpus

Use the checked-in fixture:

```bash
npm run recipes:inspect -- data/fixtures/recipenlg_sample.csv
npm run recipes:sample -- data/fixtures/recipenlg_sample.csv --limit 200
```

The Next.js app does **not** require RecipeNLG to be present.

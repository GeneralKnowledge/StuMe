# Refined student corpus

Tight subset promoted from the ReciFine 5k sample pipeline.

## Why not 8,874?

The sampler emits up to **3 level variants** (practical / student / struggle) per source recipe.
5k Gathered rows → ~9k candidates after light dedupe. Most are not import-ready:

| Stage | Count |
| --- | ---: |
| Pipeline candidates | 9141 |
| Fully graph-represented | 2148 |
| Quality gates (base meal, ≤8 ingredients, ≤25 min, score) | 1259 |
| One family across levels | 1243 |
| One per source recipe | 1114 |
| Signature dedupe + struggle caps + limit 250 | **211** |

## Files

- `candidates.json` — refined recipes ready for DB ingest
- `manifest.json` / `report.md` — funnel stats

## Load into StuMe

```bash
# After seed (or as part of seed if this folder is present)
npm run db:seed
# or incrementally:
npm run recipes:ingest -- --input data/generated/student-candidates/refined/candidates.json
```

`generationSource` for these rows is `corpus`.

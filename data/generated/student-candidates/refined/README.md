# Refined student corpus

Promoted from a **100k Gathered** ReciFine pull (not the official RecipeNLG download).

## Funnel

| Stage | Count |
| --- | ---: |
| ReciFine Gathered imported | 100000 |
| Pipeline candidates (multi-level variants) | 154270 |
| Fully graph-represented | 22515 |
| Quality gates | 11964 |
| One family across levels | 11481 |
| One per source recipe | 9740 |
| Signature / seed dedupe (uncapped) | **5224** |

## Files

- `candidates.json` — refined recipes ready for DB ingest
- `manifest.json` / `report.md` — funnel stats

## Load into StuMe

```bash
npm run db:seed
# or:
npm run recipes:ingest

# Re-expand later:
npm run recipes:expand -- --limit 100000 --ingest
```

`generationSource` for these rows is `corpus`. Prune later as needed.

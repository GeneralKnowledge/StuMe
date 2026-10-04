# Refined student corpus

Promoted from a **100k Gathered** ReciFine pull (not the official RecipeNLG download).

Expanded with high-value graph ingredients (sugar, mince, lentils, celery, baking
staples, dried herbs, worcestershire, etc.), stronger title/step-aware graph paths,
and corpus-scale recommendation scoring. Still uncapped — prune later.

## Funnel

| Stage | Count |
| --- | ---: |
| ReciFine Gathered imported | 100000 |
| Pipeline candidates (multi-level variants) | 153584 |
| Fully graph-represented | 43104 |
| Quality gates | 21098 |
| One family across levels | 20318 |
| One per source recipe | 15972 |
| Signature / seed dedupe (uncapped) | **9406** |

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

## Future

- “Shops near me” — pair unlock / super-food recommendations with campus
  supermarket / corner-shop proximity once location UX exists.

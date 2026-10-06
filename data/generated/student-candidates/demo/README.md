# Demo corpus

Curated subset of the refined ReciFine snapshot for a fast, believable student-cooking demo.

| | |
| --- | ---: |
| Source refined | 9406 |
| Filter pool | 1245 |
| Kept | **120** |
| Demo-kitchen make-now | 13 |
| Score range | 55–78 |

## Filters

- quality score ≥ 55
- struggle band 1–2
- ≤ 6 required ingredients
- real cooking steps (length + cooking verbs)
- diversified by ingredient family / primary (caps)

## Load

```bash
STUME_CORPUS=demo npm run db:seed
# or one-shot:
npm run demo:ready
```

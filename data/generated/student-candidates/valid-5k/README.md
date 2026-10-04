# Valid student candidates (5k-scale dry-run)

Curated StuMe pipeline outputs from the **RecipeNLG-shaped development corpus**
(`npm run recipes:dev-corpus -- --count 5000`), sampled with:

```bash
npm run recipes:sample -- data/external/recipenlg/dev_corpus_5000.csv --limit 5000 --gathered-only
```

## Contents

| File | Purpose |
| --- | --- |
| `candidates.json` | **467** valid student candidates (`validationStatus !== unrepresentable`) |
| `manifest.json` | Count + struggle/validation breakdown |
| `report.md` | Full pipeline funnel report from the run |

## Provenance

- Source dataset label in each candidate: `RecipeNLG` (schema-compatible stand-in).
- The underlying CSV is a **local synthetic/dev corpus**, not the official RecipeNLG download.
- Do **not** treat this as redistributed RecipeNLG text; recipes are template-expanded student-shaped examples run through the corruptor.
- Raw corpus paths under `data/external/recipenlg/` remain gitignored.

## Regenerating

```bash
npm run recipes:dev-corpus -- --count 5000
npm run recipes:sample -- data/external/recipenlg/dev_corpus_5000.csv --limit 5000 --gathered-only
node -e '
const fs=require("fs");
const all=JSON.parse(fs.readFileSync("data/generated/student-candidates/sample/candidates.json","utf8"));
const valid=all.filter(c=>c.validationStatus!=="unrepresentable");
fs.mkdirSync("data/generated/student-candidates/valid-5k",{recursive:true});
fs.writeFileSync("data/generated/student-candidates/valid-5k/candidates.json", JSON.stringify(valid,null,2)+"\\n");
console.log(valid.length);
'
```

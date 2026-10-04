# StuMe RecipeNLG sample pipeline report

Input: data/external/recipenlg/dev_corpus_5000.csv
Transformation version: student-corruptor-v1

CSV rows streamed: 5000
Gathered rows seen: 4209
Other-source rows seen: 791
Working sample size: 4209 (Gathered 4209, other 0)
after basic validity filtering: 4043
after student suitability filtering: 4043
after normalization: 4043
after corruption (variants): 9185
after deduplication: 481
valid student candidates: 467

Struggle bands:
  Struggle 1: 83
  Struggle 2: 244
  Struggle 3: 154
  Struggle 4: 0

Validation:
  fully represented: 449
  needs ingredients: 18
  needs transformations: 0
  unrepresentable: 14
recipes requiring new graph ingredients: 18

Top missing graph ingredients:
  - water: 14
  - soup: 14
  - white wine: 12
  - lentils: 6

Top potential shopping unlocks / expansions:
  - cheese: 504
  - butter: 430
  - garlic-powder: 204
  - frozen-peas: 174
  - onions: 201
  - garlic: 156
  - soy-sauce: 144
  - oil: 156
  - pasta: 130
  - bread: 126
  - chopped-tomatoes: 104
  - rice: 96

Top super foods (unlock + fancy-up, low effort):
  - cheese: unlock 258, fancy-up 246, low-effort 68.33, score 2535.33 [unlock+fancy_up]
  - butter: unlock 221, fancy-up 209, low-effort 80.17, score 2170.07 [unlock+fancy_up]
  - garlic-powder: unlock 102, fancy-up 102, low-effort 81.8, score 1052.72 [unlock+fancy_up]
  - frozen-peas: unlock 87, fancy-up 87, low-effort 94.5, score 907.8 [unlock+fancy_up]
  - onions: unlock 201, fancy-up 0, low-effort 81.08, score 836.43 [unlock]
  - garlic: unlock 78, fancy-up 78, low-effort 83.5, score 813.4 [unlock+fancy_up]
  - soy-sauce: unlock 72, fancy-up 72, low-effort 88.05, score 755.22 [unlock+fancy_up]
  - oil: unlock 156, fancy-up 0, low-effort 90.25, score 660.1 [unlock]
  - pasta: unlock 130, fancy-up 0, low-effort 98.25, score 559.3 [unlock]
  - bread: unlock 126, fancy-up 0, low-effort 68.39, score 531.36 [unlock]
  - chopped-tomatoes: unlock 104, fancy-up 0, low-effort 97, score 454.8 [unlock]
  - rice: unlock 96, fancy-up 0, low-effort 98.25, score 423.3 [unlock]

# Data format

The page (`index.html`) renders JSON files under `data/`. Dates are ISO `YYYY-MM-DD`, Europe/Stockholm.

## `data/index.json`

```json
{ "weeks": ["2026-11-07", "2026-10-31"], "coop": ["2026-11-01"] }
```

Newest first. Week entries are the Saturday start date; Coop entries are the order (Sunday) date.

## `data/weeks/<start>.json`

```json
{
  "start": "2026-10-31",
  "end": "2026-11-06",
  "meals": [
    { "date": "2026-10-31", "slot": "lunch", "kind": "cook", "recipe": "souvlaki-pittas" },
    { "date": "2026-11-01", "slot": "lunch", "kind": "leftover", "recipe": "beef-lentil-ragu", "note": "from Sat dinner" },
    { "date": "2026-11-02", "slot": "lunch", "kind": "leftover", "solo": true, "recipe": "beef-lentil-ragu", "note": "from Sat dinner" },
    { "date": "2026-11-02", "slot": "dinner", "kind": "leftover", "note": "Freezer: lamb stew" }
  ],
  "prep": [
    { "date": "2026-10-31", "text": "Ragù makes 6: box 2.5 for Sun lunch and 1 for Mon lunch." }
  ],
  "recipes": [
    {
      "id": "souvlaki-pittas",
      "name": "Chicken souvlaki pittas",
      "cuisine": "Greek",
      "protein": "poultry",
      "minutes": 25,
      "appliance": "Air fryer",
      "portions": 3,
      "ingredients": ["500 g chicken thigh fillets (kycklinglårfilé)"],
      "steps": ["Toss chicken with lemon, oil and oregano."],
      "note": "optional, one line"
    }
  ],
  "ica": [
    { "section": "Fruit & veg", "items": ["Lemons × 4"] }
  ]
}
```

- `meals`: exactly 14 entries, one per date × slot (`lunch`, `dinner`).
- `kind`: `cook`, `big`, `assisted` or `leftover`.
- Non-leftover meals must reference a recipe in this file. Leftover meals reference a recipe in this file, or carry a `note` (e.g. a freezer meal from an earlier week).
- `protein`: `fish`, `poultry`, `red-meat`, `vegetarian` or `processed`.
- `solo`: true for weekday lunches eaten by one adult.

## `data/coop/<order-date>.json`

```json
{
  "order_date": "2026-11-01",
  "delivery": "2026-11-03",
  "covers": { "from": "2026-11-07", "to": "2026-11-20" },
  "sketch": [
    { "week": "2026-11-07", "dishes": ["Salmon traybake", "Chicken tikka-style skewers"] }
  ],
  "list": [
    { "section": "Pantry", "items": ["Wholewheat pasta (fullkornspasta) 500 g × 2"] }
  ]
}
```

- `covers`: the two Sat → Fri menu weeks this order stocks.
- `sketch`: rough dish ideas per week; the Friday run uses it as a starting point.

Run `node scripts/validate.mjs` after writing any file.

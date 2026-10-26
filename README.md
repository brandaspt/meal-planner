# Meal planner

Weekly family menu, prep plan and shopping lists, published with GitHub Pages. Plans are written to `data/` by a scheduled Claude routine that lives in a separate repo.

- `favourites.md`: loved / skipped dishes. Edit from the GitHub mobile app; the next plan picks them up.
- `data/`: generated weeks and Coop orders, rendered by `index.html`.

## Local preview

```sh
python3 -m http.server 8123
```

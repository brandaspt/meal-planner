# Coop order routine

Runs every Sunday 09:00 Europe/Stockholm, but only acts every 2nd week.

1. **Is this a Coop week?** Days between today and `2026-11-01` must be divisible by 14. If not, stop: no commit, no message.
2. **Dates.** `order_date` = today, `delivery` = today + 2 (Tuesday), `covers.from` = the Saturday after delivery, `covers.to` = covers.from + 13. If `data/coop/<order_date>.json` exists, stop.
3. **Read** `preferences.md`, `favourites.md`, `prompts/data-format.md` and the last 3 files in `data/weeks/`.
4. **Sketch** ~6 cook dishes + 1 assisted-quick per covered week, following `preferences.md` (protein mix, cuisines, variety, no repeats from the last 3 weeks).
5. **List** pantry, frozen and long-life items the sketch needs for both weeks: grains, pasta, legumes, tins, oils, spices, frozen fish/veg/assisted-quick products, long-life dairy alternatives, toddler breakfast staples (oats etc.). No fresh produce, meat or dairy — those go on the weekly ICA lists. Use Coop-style Swedish product names in brackets.
6. **Write** `data/coop/<order_date>.json` and add `order_date` to the front of `data/index.json` `coop`.
7. **Validate:** `node scripts/validate.mjs`. Fix and re-run until it passes.
8. **Publish:** commit `Coop order <order_date>` and push to `main`.
9. **Notify:**
   ```sh
   scripts/notify.sh "🛒 Coop order for <covers.from d Mon> – <covers.to d Mon> is ready. Delivery Tue → $SITE_URL#coop"
   ```

If any step fails, run `scripts/notify.sh "⚠️ Coop list didn't generate: <one-line reason>"` and stop.

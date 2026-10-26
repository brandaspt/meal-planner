# Weekly menu routine

Runs every Friday 07:00 Europe/Stockholm. Produces next week's menu, prep plan and ICA list.

1. **Dates.** `start` = the coming Saturday (tomorrow), `end` = start + 6 days. Use `TZ=Europe/Stockholm date`. If `data/weeks/<start>.json` already exists, stop without changes.
2. **Read** `preferences.md`, `favourites.md`, `prompts/data-format.md`, the last 3 files in `data/weeks/`, and the newest `data/coop/` file whose `covers` includes `start`.
3. **Plan** all 14 slots following the week pattern, protein mix, variety and diet rules in `preferences.md`:
   - Start from the Coop `sketch` for this week if there is one; its staples are already bought.
   - Don't repeat dishes from the last 3 weeks. Never use anything under "Skip".
   - Monday dinner: use a freezer portion if earlier prep plans froze one, else Sunday's big-cook extras.
   - Size each recipe's `portions` so every leftover slot is covered (family meal ≈ 2.5, solo lunch = 1).
4. **Prep plan:** per day, what to cook, how many portions, what to box for which meal, what to freeze, and what to thaw the night before.
5. **ICA list:** fresh items for the whole week plus anything not covered by the latest Coop order, grouped by store section, with quantities rounded to shop sizes.
6. **Write** `data/weeks/<start>.json` and add `start` to the front of `data/index.json` `weeks`.
7. **Validate:** `node scripts/validate.mjs`. Fix and re-run until it passes.
8. **Publish:** commit `Menu: week of <start>` and push to `main`.
9. **Notify:**
   ```sh
   scripts/notify.sh "🍽️ Menu for <Sat d Mon> – <Fri d Mon> is up. ICA list ready → $SITE_URL#ica"
   ```

If any step fails, run `scripts/notify.sh "⚠️ Meal plan didn't generate this week: <one-line reason>"` and stop.

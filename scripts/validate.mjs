// Checks data/ against prompts/data-format.md and preferences.md.
import { readFileSync, existsSync } from 'node:fs';

const BANNED = ['garlic', 'vitlök', 'tofu', 'fresh coriander', 'coriander leaves', 'färsk koriander', 'cilantro', 'aubergine', 'eggplant', 'halloumi'];
const KINDS = ['cook', 'big', 'assisted', 'leftover'];
const PROTEINS = ['fish', 'poultry', 'red-meat', 'vegetarian', 'processed'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const errors = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);

function load(path) {
  if (!existsSync(path)) {
    fail(path, 'missing');
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    fail(path, `invalid JSON (${err.message})`);
    return null;
  }
}

function addDays(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const weekday = (iso) => new Date(`${iso}T12:00:00Z`).getUTCDay();

function checkBanned(file, data) {
  const text = JSON.stringify(data).toLowerCase();
  for (const word of BANNED) if (text.includes(word)) fail(file, `contains banned "${word}"`);
}

function checkSections(file, name, sections) {
  if (!Array.isArray(sections) || sections.length === 0) return fail(file, `${name} is empty`);
  for (const s of sections) {
    if (!s.section || !Array.isArray(s.items) || s.items.length === 0) fail(file, `${name} section "${s.section}" is malformed`);
  }
}

function checkWeek(file, week, start) {
  if (week.start !== start) fail(file, `start ${week.start} does not match filename`);
  if (weekday(start) !== 6) fail(file, 'start is not a Saturday');
  if (week.end !== addDays(start, 6)) fail(file, 'end must be start + 6 days');

  const recipes = new Map((week.recipes ?? []).map((r) => [r.id, r]));
  for (const r of recipes.values()) {
    for (const key of ['id', 'name', 'cuisine', 'appliance']) if (!r[key]) fail(file, `recipe ${r.id} missing ${key}`);
    if (!PROTEINS.includes(r.protein)) fail(file, `recipe ${r.id} has unknown protein "${r.protein}"`);
    if (!(r.minutes > 0 && r.minutes <= 45)) fail(file, `recipe ${r.id} takes ${r.minutes} min (max 45)`);
    if (!(r.portions > 0)) fail(file, `recipe ${r.id} missing portions`);
    if (!r.ingredients?.length || !r.steps?.length) fail(file, `recipe ${r.id} missing ingredients or steps`);
    if (r.steps?.length > 6) fail(file, `recipe ${r.id} has ${r.steps.length} steps (max 6)`);
  }

  const expected = new Set();
  for (let i = 0; i < 7; i++) for (const slot of ['lunch', 'dinner']) expected.add(`${addDays(start, i)}/${slot}`);
  for (const meal of week.meals ?? []) {
    const slotKey = `${meal.date}/${meal.slot}`;
    if (!expected.delete(slotKey)) fail(file, `unexpected or duplicate meal ${slotKey}`);
    if (!KINDS.includes(meal.kind)) fail(file, `${slotKey} has unknown kind "${meal.kind}"`);
    const hasRecipe = recipes.has(meal.recipe);
    if (meal.kind !== 'leftover' && !hasRecipe) fail(file, `${slotKey} references unknown recipe "${meal.recipe}"`);
    if (meal.kind === 'leftover' && !hasRecipe && !meal.note) fail(file, `${slotKey} leftover needs a known recipe or a note`);
  }
  for (const missing of expected) fail(file, `missing meal ${missing}`);

  for (const p of week.prep ?? []) if (!ISO.test(p.date) || !p.text) fail(file, 'prep entry malformed');
  checkSections(file, 'ica', week.ica);
  checkBanned(file, week);
}

function checkCoop(file, order, date) {
  if (order.order_date !== date) fail(file, 'order_date does not match filename');
  if (weekday(date) !== 0) fail(file, 'order_date is not a Sunday');
  if (!ISO.test(order.delivery ?? '')) fail(file, 'delivery missing');
  if (weekday(order.covers?.from) !== 6) fail(file, 'covers.from is not a Saturday');
  if (order.covers?.to !== addDays(order.covers?.from, 13)) fail(file, 'covers.to must be covers.from + 13 days');
  checkSections(file, 'list', order.list);
  checkBanned(file, order);
}

const index = load('data/index.json');
if (index) {
  for (const start of index.weeks ?? []) {
    const file = `data/weeks/${start}.json`;
    const week = load(file);
    if (week) checkWeek(file, week, start);
  }
  for (const date of index.coop ?? []) {
    const file = `data/coop/${date}.json`;
    const order = load(file);
    if (order) checkCoop(file, order, date);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('data OK');

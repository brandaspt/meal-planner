const KINDS = {
  cook: '🍳',
  big: '🍳',
  assisted: '⚡',
  leftover: '♻️',
};

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') el.className = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

async function getJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

// Ticks are per phone; storage may be unavailable.
const ticks = {
  has(key) {
    try { return localStorage.getItem(key) === '1'; } catch { return false; }
  },
  set(key, on) {
    try { on ? localStorage.setItem(key, '1') : localStorage.removeItem(key); } catch { /* per-phone convenience only */ }
  },
};

function formatDate(iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', opts);
}

// Derived from the GitHub Pages URL: <owner>.github.io/<repo>/
function favouritesEditUrl() {
  const { hostname, pathname } = location;
  if (!hostname.endsWith('.github.io')) return null;
  const owner = hostname.split('.')[0];
  const repo = pathname.split('/')[1] || hostname;
  return `https://github.com/${owner}/${repo}/edit/main/favourites.md`;
}

function renderMenu(week, recipes) {
  const dates = [...new Set(week.meals.map((m) => m.date))].sort();
  const cell = (meal) => {
    if (!meal) return h('td');
    const recipe = recipes.get(meal.recipe);
    const name = recipe ? h('a', { href: `#r-${recipe.id}` }, recipe.name) : meal.note;
    const meta = [
      meal.solo && 'solo',
      recipe && meal.kind !== 'leftover' && `${recipe.minutes} min`,
      recipe && meal.note,
    ].filter(Boolean).join(' · ');
    return h('td', { class: meal.kind === 'leftover' ? 'leftover' : '' },
      `${KINDS[meal.kind]} `, name, meta && h('span', { class: 'meta' }, meta));
  };
  const rows = dates.map((date) => {
    const find = (slot) => week.meals.find((m) => m.date === date && m.slot === slot);
    return h('tr', {}, h('th', {}, formatDate(date, { weekday: 'short', day: 'numeric' })), cell(find('lunch')), cell(find('dinner')));
  });
  return [
    h('h2', { id: 'menu' }, 'Menu'),
    h('table', { class: 'menu' },
      h('thead', {}, h('tr', {}, h('th'), h('th', {}, 'Lunch'), h('th', {}, 'Dinner'))),
      h('tbody', {}, rows)),
    h('p', { class: 'muted small' }, '🍳 cook · ⚡ assisted-quick · ♻️ leftovers'),
  ];
}

function renderPrep(week) {
  const byDate = new Map();
  for (const p of week.prep) byDate.set(p.date, [...(byDate.get(p.date) ?? []), p]);
  return [
    h('h2', { id: 'prep' }, 'Prep plan'),
    [...byDate].map(([date, items]) => h('div', { class: 'prep-day' },
      h('strong', {}, formatDate(date)),
      h('ul', {}, items.map((p) => h('li', {}, p.text))))),
  ];
}

function renderRecipes(week) {
  const editUrl = favouritesEditUrl();
  return [
    h('h2', { id: 'recipes' }, 'Recipes'),
    week.recipes.map((r) => h('details', { id: `r-${r.id}` },
      h('summary', {}, r.name,
        h('span', { class: 'meta' }, `${r.minutes} min · ${r.appliance} · makes ${r.portions} · ${r.cuisine}`)),
      h('h3', {}, 'Ingredients'),
      h('ul', {}, r.ingredients.map((i) => h('li', {}, i))),
      h('h3', {}, 'Steps'),
      h('ol', {}, r.steps.map((s) => h('li', {}, s))),
      r.note && h('p', { class: 'muted small' }, r.note),
      editUrl && h('p', { class: 'small' }, h('a', { href: editUrl, target: '_blank', rel: 'noopener' }, '❤️ / 👎 Edit favourites')))),
  ];
}

function renderList(id, title, sections, storageKey, intro) {
  const boxes = [];
  const list = sections.map((section, s) => [
    h('h3', {}, section.section),
    section.items.map((item, i) => {
      const key = `${storageKey}:${s}:${i}`;
      const box = h('input', { type: 'checkbox', onchange: (e) => ticks.set(key, e.target.checked) });
      box.checked = ticks.has(key);
      boxes.push([box, key]);
      return h('label', {}, box, h('span', {}, item));
    }),
  ]);
  const clear = () => boxes.forEach(([box, key]) => { box.checked = false; ticks.set(key, false); });
  return [
    h('h2', { id }, title),
    intro && h('p', { class: 'muted small' }, intro),
    h('div', { class: 'list' }, list),
    h('button', { type: 'button', onclick: clear }, 'Clear ticks'),
  ];
}

function renderCoop(order) {
  if (!order) return [h('h2', { id: 'coop' }, 'Coop order'), h('p', { class: 'muted' }, 'No Coop order covers this week.')];
  const intro = `Order ${formatDate(order.order_date)} · delivery ${formatDate(order.delivery)} · covers ${formatDate(order.covers.from)} – ${formatDate(order.covers.to)}`;
  return [
    renderList('coop', 'Coop order', order.list, `coop:${order.order_date}`, intro),
    order.sketch?.length > 0 && [
      h('h3', {}, 'Planned dishes'),
      order.sketch.map((w) => h('p', { class: 'small' }, h('strong', {}, `Week of ${formatDate(w.week)}: `), w.dishes.join(', '))),
    ],
  ];
}

function renderArchive(index, current) {
  return [
    h('h2', { id: 'archive' }, 'Archive'),
    h('ul', {}, index.weeks.map((start) => h('li', {}, start === current
      ? h('strong', {}, `Week of ${formatDate(start)}`)
      : h('a', { href: `?week=${start}` }, `Week of ${formatDate(start)}`)))),
  ];
}

// Prefer the order covering this week, else the next upcoming one.
async function findCoopOrder(index, week) {
  const orders = await Promise.all(index.coop.map((date) => getJSON(`data/coop/${date}.json`)));
  const covering = orders.find((o) => o.covers.from <= week.end && o.covers.to >= week.start);
  if (covering) return covering;
  const upcoming = orders.filter((o) => o.covers.from > week.end);
  return upcoming.at(-1) ?? null;
}

async function main() {
  const app = document.getElementById('app');
  try {
    const index = await getJSON('data/index.json');
    const start = new URLSearchParams(location.search).get('week') ?? index.weeks[0];
    if (!start) {
      app.replaceChildren(h('p', { class: 'muted' }, 'No menu yet.'));
      return;
    }
    const week = await getJSON(`data/weeks/${start}.json`);
    const recipes = new Map(week.recipes.map((r) => [r.id, r]));
    const coop = await findCoopOrder(index, week);

    document.getElementById('title').textContent = `Meal plan · ${formatDate(week.start)} – ${formatDate(week.end)}`;
    app.replaceChildren(...[
      renderMenu(week, recipes),
      renderPrep(week),
      renderRecipes(week),
      renderList('ica', 'ICA list', week.ica, `ica:${week.start}`, 'Weekend shop. Ticks are saved on this phone only.'),
      renderCoop(coop),
      renderArchive(index, start),
    ].flat(Infinity).filter(Boolean));

    const target = location.hash && document.querySelector(location.hash);
    if (target) target.scrollIntoView();
  } catch (err) {
    app.replaceChildren(h('p', {}, `Couldn't load the plan: ${err.message}`));
    throw err;
  }
}

main();

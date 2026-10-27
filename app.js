function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') el.className = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value);
  }
  for (const child of children.flat(Infinity)) {
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

const today = () => new Date().toLocaleDateString('sv-SE');

// Derived from the GitHub Pages URL: <owner>.github.io/<repo>/
function favouritesEditUrl() {
  const { hostname, pathname } = location;
  if (!hostname.endsWith('.github.io')) return null;
  const owner = hostname.split('.')[0];
  const repo = pathname.split('/')[1] || hostname;
  return `https://github.com/${owner}/${repo}/edit/main/favourites.md`;
}

const state = { index: null, weeks: [], coop: null, base: '#week', pushedRecipe: false };

// --- Routing: #week[/next], #recipes[/next], #shop[/next|/coop], #recipe/<start>/<id>

const LEGACY = { ica: 'shop', coop: 'shop/coop', 'this-week': 'week', 'next-week': 'week/next' };

function parseRoute(hash) {
  const path = LEGACY[hash.slice(1)] ?? hash.slice(1);
  const [tab, ...rest] = path.split('/');
  if (tab === 'recipe') return { recipe: { start: rest[0], id: rest[1] } };
  if (tab === 'recipes' || tab === 'shop') return { tab, sub: rest[0] ?? '' };
  return { tab: 'week', sub: rest[0] ?? '' };
}

function go(hash, { push = false } = {}) {
  if (push) location.hash = hash;
  else {
    history.replaceState(null, '', hash);
    route();
  }
}

function route() {
  const r = parseRoute(location.hash);
  const dialog = document.getElementById('recipe');
  if (r.recipe) {
    if (!document.getElementById('app').dataset.rendered) renderTab(parseRoute(state.base));
    openRecipe(r.recipe);
    return;
  }
  state.pushedRecipe = false;
  const base = `#${r.tab}${r.sub ? `/${r.sub}` : ''}`;
  // Closing the dialog keeps the page and its scroll position.
  if (dialog.open) {
    dialog.close();
    if (base === state.base) return;
  }
  state.base = base;
  renderTab(r);
}

// --- Shared bits

function segments(options, current) {
  document.getElementById('segments').replaceChildren(...options.map((o) => h('button', {
    type: 'button',
    'aria-pressed': String(o.hash === current),
    onclick: () => go(o.hash),
  }, o.label)));
}

function weekOptions(tab) {
  return state.weeks.map((w, i) => ({ label: i === 0 ? 'This week' : 'Next week', hash: i === 0 ? `#${tab}` : `#${tab}/next` }));
}

const weekFor = (sub) => state.weeks[sub === 'next' && state.weeks.length > 1 ? 1 : 0];
const recipeHash = (week, id) => `#recipe/${week.start}/${id}`;

function showRecipe(week, id) {
  state.pushedRecipe = true;
  go(recipeHash(week, id), { push: true });
}

function renderList(sections, storageKey) {
  const boxes = [];
  const progress = h('p', { class: 'muted small progress' });
  const update = () => { progress.textContent = `${boxes.filter(([b]) => b.checked).length} of ${boxes.length} ticked · saved on this phone`; };
  const list = sections.map((section, s) => [
    h('h3', {}, section.section),
    section.items.map((item, i) => {
      const key = `${storageKey}:${s}:${i}`;
      const box = h('input', { type: 'checkbox', onchange: (e) => { ticks.set(key, e.target.checked); update(); } });
      box.checked = ticks.has(key);
      boxes.push([box, key]);
      return h('label', {}, box, h('span', {}, item));
    }),
  ]);
  const clear = () => { boxes.forEach(([box, key]) => { box.checked = false; ticks.set(key, false); }); update(); };
  update();
  return [progress, h('div', { class: 'list' }, list), h('button', { type: 'button', class: 'text-button', onclick: clear }, 'Clear ticks')];
}

// --- Week tab

function mealRow(week, recipes, meal) {
  const recipe = recipes.get(meal.recipe);
  const slot = h('span', { class: 'slot' }, meal.slot === 'lunch' ? 'Lunch' : 'Dinner');
  if (meal.kind === 'leftover') {
    const meta = [meal.solo && 'solo', recipe && meal.note].filter(Boolean).join(' · ');
    return h('div', { class: 'meal' }, slot, h('span', { class: 'leftover' }, '♻️ ', recipe ? recipe.name : meal.note, meta && h('span', { class: 'meta' }, meta)));
  }
  const meta = [`${recipe.minutes} min`, meal.kind === 'big' && 'big cook', meal.kind === 'assisted' && '⚡ quick'].filter(Boolean).join(' · ');
  return h('div', { class: 'meal' }, slot, h('span', {},
    h('button', { type: 'button', class: 'dish', onclick: () => showRecipe(week, recipe.id) }, recipe.name),
    h('span', { class: 'meta' }, meta)));
}

function renderWeekTab(sub) {
  const week = weekFor(sub);
  const recipes = new Map(week.recipes.map((r) => [r.id, r]));
  const dates = [...new Set(week.meals.map((m) => m.date))].sort();
  const cards = dates.map((date) => {
    const isToday = date === today();
    const meals = ['lunch', 'dinner'].map((slot) => week.meals.find((m) => m.date === date && m.slot === slot)).filter(Boolean);
    const prep = week.prep.filter((p) => p.date === date);
    return h('section', { class: `day${isToday ? ' today' : ''}`, id: `day-${date}` },
      h('div', { class: 'day-head' }, formatDate(date, { weekday: 'long', day: 'numeric', month: 'short' }), isToday && h('span', { class: 'badge' }, 'Today')),
      meals.map((m) => mealRow(week, recipes, m)),
      prep.length > 0 && h('ul', { class: 'prep' }, prep.map((p) => h('li', {}, p.text))));
  });
  const archive = state.index.weeks.length > state.weeks.length && h('details', { class: 'archive' },
    h('summary', {}, 'Earlier weeks'),
    h('ul', {}, state.index.weeks.map((start) => h('li', {}, h('a', { href: `?week=${start}` }, `Week of ${formatDate(start)}`)))));
  return [h('p', { class: 'muted small' }, `${formatDate(week.start)} – ${formatDate(week.end)}`), cards, archive];
}

// --- Recipes tab

function renderRecipesTab(sub) {
  const week = weekFor(sub);
  const usedIn = (id) => week.meals
    .filter((m) => m.recipe === id && m.kind !== 'leftover')
    .map((m) => `${formatDate(m.date, { weekday: 'short' })} ${m.slot}`);
  return h('div', { class: 'cards' }, week.recipes.map((r) => h('button', { type: 'button', class: 'card', onclick: () => showRecipe(week, r.id) },
    h('strong', {}, r.name),
    h('span', { class: 'meta' }, `${r.minutes} min · ${r.appliance} · ${r.cuisine}`),
    h('span', { class: 'meta' }, usedIn(r.id).join(', ')))));
}

// --- Shop tab

function renderCartList(order) {
  const status = new Map(order.cart.items.map((c) => [c.item, c]));
  const row = (item) => {
    const c = status.get(item);
    const added = c?.status === 'added';
    return h('div', { class: 'cart-row' },
      h('span', { class: 'cart-icon' }, added ? '✅' : '⚠️'),
      h('span', {}, item, h('span', { class: 'meta' }, added ? `In cart: ${c.product} × ${c.quantity}` : 'Not in cart — buy elsewhere or skip')));
  };
  const inCart = order.cart.items.filter((c) => c.status === 'added').length;
  return [
    h('p', { class: 'muted small progress' }, `${inCart} of ${order.cart.items.length} items in your Coop cart · filled ${formatDate(order.cart.filled)}`),
    order.cart.notes?.length > 0 && [h('h3', {}, 'Worth a look'), h('ul', { class: 'notes' }, order.cart.notes.map((n) => h('li', {}, n)))],
    order.list.map((section) => [h('h3', {}, section.section), section.items.map(row)]),
  ];
}

function renderCoop(order) {
  if (!order) return h('p', { class: 'muted' }, 'No Coop order for these weeks.');
  return [
    h('p', { class: 'muted small' }, `Order ${formatDate(order.order_date)} · delivery ${formatDate(order.delivery)}`),
    order.cart ? renderCartList(order) : renderList(order.list, `coop:${order.order_date}`),
  ];
}

function renderShopTab(sub) {
  if (sub === 'coop') return renderCoop(state.coop);
  const week = weekFor(sub);
  return [h('p', { class: 'muted small' }, `For the weekend of ${formatDate(week.start)}`), renderList(week.ica, `ica:${week.start}`)];
}

// --- Rendering

function renderTab({ tab, sub }) {
  const app = document.getElementById('app');
  document.querySelectorAll('.tabs button').forEach((b) => {
    if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  const current = `#${tab}${sub ? `/${sub}` : ''}`;
  let content;
  if (tab === 'shop') {
    const weekLabels = state.weeks.map((w, i) => ({ label: i === 0 ? 'This weekend' : 'Next weekend', hash: i === 0 ? '#shop' : '#shop/next' }));
    segments([...weekLabels, { label: 'Coop', hash: '#shop/coop' }], current);
    content = renderShopTab(sub);
  } else if (tab === 'recipes') {
    segments(state.weeks.length > 1 ? weekOptions('recipes') : [], current);
    content = renderRecipesTab(sub);
  } else {
    segments(state.weeks.length > 1 ? weekOptions('week') : [], current);
    content = renderWeekTab(sub);
  }
  app.replaceChildren(...[content].flat(Infinity).filter(Boolean));
  app.dataset.rendered = 'true';
  window.scrollTo(0, 0);
  if (tab === 'week') document.getElementById(`day-${today()}`)?.scrollIntoView({ block: 'start' });
}

function openRecipe({ start, id }) {
  const dialog = document.getElementById('recipe');
  const r = state.weeks.find((w) => w.start === start)?.recipes.find((x) => x.id === id);
  if (!r) return go(state.base);
  const editUrl = favouritesEditUrl();
  const close = () => (state.pushedRecipe ? history.back() : go(state.base));
  // Copy the name so it can be pasted into favourites.md.
  const copyName = () => navigator.clipboard?.writeText(r.name).catch(() => {});
  dialog.replaceChildren(
    h('div', { class: 'dialog-head' },
      h('span', { class: 'muted small' }, `${r.minutes} min · ${r.appliance} · makes ${r.portions}`),
      h('button', { type: 'button', class: 'close', 'aria-label': 'Close', onclick: close }, '✕')),
    h('div', { class: 'dialog-body' },
      h('h2', { id: 'recipe-title' }, r.name),
      h('p', { class: 'muted small' }, r.cuisine),
      h('h3', {}, 'Ingredients'),
      h('ul', {}, r.ingredients.map((i) => h('li', {}, i))),
      h('h3', {}, 'Steps'),
      h('ol', {}, r.steps.map((s) => h('li', {}, s))),
      r.note && h('p', { class: 'muted small' }, r.note),
      editUrl && h('a', { class: 'fav', href: editUrl, target: '_blank', rel: 'noopener', onclick: copyName }, '❤️ / 👎 Add to favourites (name copied)')));
  dialog.oncancel = (e) => { e.preventDefault(); close(); };
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}

// Current week = latest one already started; otherwise the first.
function weeksToShow(index) {
  const requested = new URLSearchParams(location.search).get('week');
  if (requested) return [requested];
  const sorted = [...index.weeks].sort();
  const current = Math.max(0, sorted.findLastIndex((start) => start <= today()));
  return sorted.slice(current, current + 2);
}

// Prefer the order covering these weeks, else the next upcoming one.
async function findCoopOrder(index, span) {
  const orders = await Promise.all(index.coop.map((date) => getJSON(`data/coop/${date}.json`)));
  const covering = orders.find((o) => o.covers.from <= span.end && o.covers.to >= span.start);
  if (covering) return covering;
  return orders.filter((o) => o.covers.from > span.end).at(-1) ?? null;
}

async function main() {
  const app = document.getElementById('app');
  try {
    state.index = await getJSON('data/index.json');
    const starts = weeksToShow(state.index);
    if (starts.length === 0) {
      app.replaceChildren(h('p', { class: 'muted' }, 'No menu yet.'));
      return;
    }
    state.weeks = await Promise.all(starts.map((start) => getJSON(`data/weeks/${start}.json`)));
    state.coop = await findCoopOrder(state.index, { start: state.weeks[0].start, end: state.weeks.at(-1).end });

    document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => go(`#${b.dataset.tab}`)));
    window.addEventListener('hashchange', route);
    route();
  } catch (err) {
    app.replaceChildren(h('p', {}, `Couldn't load the plan: ${err.message}`));
    throw err;
  }
}

main();

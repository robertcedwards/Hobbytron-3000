// Hobbytron 3000: a hobby tamagotchi. All data lives in localStorage.
'use strict';

const STORE_KEY = 'hobbytron3000';
const DAY = 86400000;
// Energy fades with a ~1 week half-life-ish decay. Hitting your weekly goal
// steadily keeps a hobby near 100%.
const DECAY_DAYS = 7;

const DEFAULT_HOBBIES = [
  { name: 'Hardware', emoji: '🔧', color: '#7cf5c4', goal: 180 },
  { name: 'Piano', emoji: '🎹', color: '#c39bff', goal: 150 },
  { name: 'Drones', emoji: '🛸', color: '#5ec8ff', goal: 120 },
  { name: 'RC', emoji: '🏎️', color: '#ffb454', goal: 120 },
];

const DEFAULT_GEAR = [
  { name: 'Workbench / soldering station', hobby: 'Hardware', status: 'ready' },
  { name: 'Digital piano', hobby: 'Piano', status: 'ready' },
  { name: 'FPV quad', hobby: 'Drones', status: 'build' },
  { name: 'RC car', hobby: 'RC', status: 'repair' },
];

const GEAR_STATUS = {
  ready: 'Ready',
  build: 'In build',
  repair: 'Needs repair',
  wish: 'Wishlist',
};

const PALETTE = ['#7cf5c4', '#c39bff', '#5ec8ff', '#ffb454', '#ff6b81', '#f5e663', '#8cff6b', '#ff9de2'];

const uid = () => Math.random().toString(36).slice(2, 10);
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date().toISOString().slice(0, 10);

// ---------- state ----------

function seed() {
  const hobbies = DEFAULT_HOBBIES.map((h) => ({ id: uid(), ...h }));
  const byName = Object.fromEntries(hobbies.map((h) => [h.name, h.id]));
  return {
    petName: 'Tronnie',
    hobbies,
    sessions: [],
    gear: DEFAULT_GEAR.map((g) => ({ id: uid(), name: g.name, hobbyId: byName[g.hobby], status: g.status, notes: '' })),
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* fall through to seed */ }
  return seed();
}

let state = load();
const save = () => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
};

// ---------- energy math ----------

function sessionAge(s, now = Date.now()) {
  return Math.max(0, (now - new Date(s.date + 'T12:00:00').getTime()) / DAY);
}

function energy(hobby) {
  const decayed = state.sessions
    .filter((s) => s.hobbyId === hobby.id)
    .reduce((sum, s) => sum + s.minutes * Math.exp(-sessionAge(s) / DECAY_DAYS), 0);
  return Math.min(100, Math.round((decayed / Math.max(1, hobby.goal)) * 100));
}

function minutesThisWeek(hobbyId) {
  return state.sessions
    .filter((s) => s.hobbyId === hobbyId && sessionAge(s) < 7)
    .reduce((sum, s) => sum + s.minutes, 0);
}

function streak(hobbyId) {
  const days = new Set(state.sessions.filter((s) => !hobbyId || s.hobbyId === hobbyId).map((s) => s.date));
  let n = 0;
  const d = new Date();
  // Today not logged yet doesn't break the streak.
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (days.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function lastDone(hobbyId) {
  const dates = state.sessions.filter((s) => s.hobbyId === hobbyId).map((s) => s.date).sort();
  if (!dates.length) return 'never';
  const days = Math.floor(sessionAge({ date: dates.at(-1) }) + 0.5);
  return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days}d ago`;
}

function petStatus() {
  const es = state.hobbies.map(energy);
  const avg = es.length ? es.reduce((a, b) => a + b, 0) / es.length : 0;
  const totalMin = state.sessions.reduce((a, s) => a + s.minutes, 0);
  const level = Math.floor(Math.sqrt(totalMin / 60)) + 1;
  const nextAt = Math.pow(level, 2) * 60;
  let mood = 'sleepy';
  if (avg >= 70) mood = 'ecstatic';
  else if (avg >= 40) mood = 'happy';
  else if (avg >= 15) mood = 'restless';
  const neglected = state.hobbies.filter((h) => energy(h) < 15).map((h) => h.name);
  return { avg, level, mood, totalMin, nextAt, neglected };
}

const MOOD_TEXT = {
  ecstatic: 'Buzzing with energy!',
  happy: 'Content and humming along.',
  restless: 'Getting a bit restless…',
  sleepy: 'Low power. Feed me a hobby!',
};

// ---------- creature ----------

function creatureSVG(mood, level) {
  const mouth = {
    ecstatic: 'M70 118 Q100 150 130 118 Z',
    happy: 'M74 120 Q100 140 126 120',
    restless: 'M78 126 L122 126',
    sleepy: 'M80 130 Q100 120 120 130',
  }[mood];
  const eyes = mood === 'sleepy'
    ? '<path d="M64 92 Q76 100 88 92 M112 92 Q124 100 136 92" stroke="#0f1220" stroke-width="5" fill="none" stroke-linecap="round"/>'
    : '<circle cx="76" cy="90" r="11" fill="#0f1220"/><circle cx="124" cy="90" r="11" fill="#0f1220"/><circle cx="80" cy="86" r="4" fill="#fff"/><circle cx="128" cy="86" r="4" fill="#fff"/>';
  const glow = { ecstatic: '#7cf5c4', happy: '#5ec8ff', restless: '#ffb454', sleepy: '#8a90b3' }[mood];
  // Antennae sprout as the creature levels up.
  const antennae = Math.min(level, 5);
  let ant = '';
  for (let i = 0; i < antennae; i++) {
    const x = 100 + (i - (antennae - 1) / 2) * 22;
    ant += `<line x1="100" y1="40" x2="${x}" y2="${8 - (i % 2) * 6}" stroke="${glow}" stroke-width="3"/><circle cx="${x}" cy="${8 - (i % 2) * 6}" r="6" fill="${glow}"/>`;
  }
  return `<svg viewBox="0 0 200 200" role="img" aria-label="Hobbytron creature, ${mood}">
    <defs><radialGradient id="body" cx="40%" cy="35%"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset=".25" stop-color="${glow}"/><stop offset="1" stop-color="#2a3160"/></radialGradient></defs>
    <ellipse cx="100" cy="190" rx="60" ry="8" fill="#000" opacity=".3"/>
    ${ant}
    <rect x="30" y="38" width="140" height="140" rx="56" fill="url(#body)" stroke="${glow}" stroke-width="3"/>
    <rect x="52" y="64" width="96" height="84" rx="30" fill="#e8eaf6" opacity=".92"/>
    ${eyes}
    <path d="${mouth}" stroke="#0f1220" stroke-width="5" fill="${mood === 'ecstatic' ? '#ff6b81' : 'none'}" stroke-linecap="round"/>
    ${mood === 'happy' || mood === 'ecstatic' ? '<circle cx="62" cy="114" r="7" fill="#ff9de2" opacity=".6"/><circle cx="138" cy="114" r="7" fill="#ff9de2" opacity=".6"/>' : ''}
    <text x="100" y="172" text-anchor="middle" font-size="13" font-family="monospace" fill="#0f1220" font-weight="700">LV ${level}</text>
  </svg>`;
}

function ringSVG(pct, color) {
  const r = 28, c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" fill="#181c30" stroke="#2c3358" stroke-width="6"/>
    ${pct > 0 ? `<circle cx="32" cy="32" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"
      stroke-dasharray="${(pct / 100) * c} ${c}"/>` : ''}</svg>`;
}

// ---------- views ----------

let tab = 'habitat';
let gearFilter = 'all';

function render() {
  document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  const view = $('#view');
  view.innerHTML = { habitat: habitatView, hangar: hangarView, log: logView, settings: settingsView }[tab]();
  bindView(view);
}

function habitatView() {
  const p = petStatus();
  const nodes = [...state.hobbies, { add: true }];
  const n = nodes.length;
  const orbit = nodes.map((h, i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    const x = 50 + 38 * Math.cos(a), y = 50 + 38 * Math.sin(a);
    if (h.add) {
      return `<button class="node add" data-action="add-hobby" style="left:${x}%;top:${y}%">
        <div class="ring">${ringSVG(0, '#2c3358')}<div class="emoji">＋</div></div><div class="label muted">Add hobby</div></button>`;
    }
    const e = energy(h);
    return `<button class="node ${e < 15 ? 'low' : ''}" data-action="log" data-id="${h.id}" style="left:${x}%;top:${y}%" title="Log ${esc(h.name)}">
      <div class="ring">${ringSVG(e, h.color)}<div class="emoji">${esc(h.emoji)}</div></div>
      <div class="label">${esc(h.name)}</div><div class="pct">${e}%</div></button>`;
  }).join('');

  const bars = state.hobbies.map((h) => {
    const e = energy(h);
    return `<div class="bar-row">
      <div class="who">${esc(h.emoji)} ${esc(h.name)}</div>
      <div class="bar"><i style="width:${e}%;background:${h.color}"></i></div>
      <div class="meta">${minutesThisWeek(h.id)}/${h.goal}m · ${lastDone(h.id)}</div></div>`;
  }).join('');

  const nudge = p.neglected.length
    ? `<p class="muted">${esc(state.petName)} misses: <b>${p.neglected.map(esc).join(', ')}</b>. Even 10 minutes helps.</p>`
    : '<p class="muted">Every hobby is charged. Nice work.</p>';

  return `
    <div class="habitat">
      <div class="orbit-ring"></div>
      <div class="creature ${p.mood}" data-action="rename" title="Click to rename">
        ${creatureSVG(p.mood, p.level)}
        <div class="name">${esc(state.petName)}</div>
        <div class="mood">${MOOD_TEXT[p.mood]}</div>
      </div>
      ${orbit}
    </div>
    <section class="panel">
      <div class="row spread"><h2>Energy bars</h2><span class="muted">Tap a hobby in orbit to log time</span></div>
      <div class="bars">${bars || '<p class="muted">No hobbies yet.</p>'}</div>
      ${nudge}
    </section>
    <section class="stats">
      <div class="stat"><b>${p.level}</b><span>Level (${Math.round(p.totalMin / 60)}h / ${Math.round(p.nextAt / 60)}h to next)</span></div>
      <div class="stat"><b>${Math.round(p.avg)}%</b><span>Average energy</span></div>
      <div class="stat"><b>${streak()}</b><span>Day streak (any hobby)</span></div>
      <div class="stat"><b>${state.sessions.length}</b><span>Sessions logged</span></div>
    </section>`;
}

function hangarView() {
  const items = state.gear.filter((g) => gearFilter === 'all' || g.status === gearFilter);
  const chips = ['all', ...Object.keys(GEAR_STATUS)].map((k) =>
    `<button data-action="gear-filter" data-k="${k}" class="${gearFilter === k ? 'active' : ''}">${k === 'all' ? 'All' : GEAR_STATUS[k]}</button>`).join('');
  const list = items.map((g) => {
    const h = state.hobbies.find((x) => x.id === g.hobbyId);
    return `<div class="item">
      <div class="grow"><b>${esc(g.name)}</b><div class="muted">${h ? esc(h.emoji + ' ' + h.name) : 'Unassigned'}${g.notes ? ' · ' + esc(g.notes) : ''}</div></div>
      <span class="tag ${g.status}">${GEAR_STATUS[g.status]}</span>
      <button class="ghost" data-action="edit-gear" data-id="${g.id}">Edit</button></div>`;
  }).join('');
  return `<section class="panel">
    <div class="row spread"><h2>🛠️ Hangar</h2><button class="primary" data-action="add-gear">Add gear</button></div>
    <p class="muted">Your hardware, builds and kit across every hobby: what's ready to go, what's on the bench, and what's on the wishlist.</p>
    <div class="chips">${chips}</div>
    <div class="list">${list || '<p class="muted">Nothing here.</p>'}</div></section>`;
}

function logView() {
  const recent = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created).slice(0, 100);
  const list = recent.map((s) => {
    const h = state.hobbies.find((x) => x.id === s.hobbyId);
    return `<div class="item"><div class="grow"><b>${h ? esc(h.emoji + ' ' + h.name) : 'Deleted hobby'}</b> · ${s.minutes}m
      <div class="muted">${s.date}${s.note ? ' · ' + esc(s.note) : ''}</div></div>
      <button class="ghost danger" data-action="del-session" data-id="${s.id}">Delete</button></div>`;
  }).join('');
  const hobbies = state.hobbies.map((h) => `<div class="item"><div class="grow"><b>${esc(h.emoji)} ${esc(h.name)}</b>
      <div class="muted">Goal ${h.goal} min/week · streak ${streak(h.id)}d</div></div>
      <button class="ghost" data-action="edit-hobby" data-id="${h.id}">Edit</button></div>`).join('');
  return `<section class="panel"><div class="row spread"><h2>Hobbies</h2><button class="primary" data-action="add-hobby">Add hobby</button></div>
      <div class="list">${hobbies}</div></section>
    <section class="panel"><div class="row spread"><h2>Recent sessions</h2><button data-action="log">Log session</button></div>
      <div class="list">${list || '<p class="muted">No sessions yet. Tap a hobby on the Habitat to log one.</p>'}</div></section>`;
}

function settingsView() {
  return `<section class="panel"><h2>Your data</h2>
    <p class="muted">Everything is stored in this browser only. Export a backup to move it to another device.</p>
    <div class="row">
      <button data-action="export">Export JSON</button>
      <label class="row" style="display:inline-flex"><input type="file" accept="application/json" id="import" hidden>
        <button data-action="import">Import JSON</button></label>
      <button class="danger" data-action="reset">Reset everything</button>
    </div></section>`;
}

// ---------- dialogs ----------

function openDialog(html, onSubmit) {
  const dlg = $('#dlg');
  dlg.innerHTML = html;
  const form = $('form', dlg);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.submitter && e.submitter.value === 'cancel') return dlg.close();
    const data = Object.fromEntries(new FormData(form));
    onSubmit(data, e.submitter && e.submitter.value);
    dlg.close();
    save();
    render();
  });
  dlg.showModal();
}

const hobbyOptions = (sel) => state.hobbies.map((h) => `<option value="${h.id}" ${h.id === sel ? 'selected' : ''}>${esc(h.emoji + ' ' + h.name)}</option>`).join('');

function logDialog(hobbyId) {
  if (!state.hobbies.length) return hobbyDialog();
  openDialog(`<form><h2>Log a session</h2>
    <label>Hobby<select name="hobbyId">${hobbyOptions(hobbyId)}</select></label>
    <label>Minutes<input name="minutes" type="number" min="1" max="1440" value="30" required></label>
    <div class="quick">${[10, 20, 30, 45, 60, 90, 120].map((m) => `<button type="button" data-min="${m}">${m}m</button>`).join('')}</div>
    <label>Date<input name="date" type="date" value="${today()}" max="${today()}" required></label>
    <label>What did you do?<textarea name="note" placeholder="Practised scales, soldered the VTX, tuned the shocks…"></textarea></label>
    <div class="row"><button class="primary" value="save">Feed ${esc(state.petName)}</button><button value="cancel" formnovalidate>Cancel</button></div></form>`,
  (d) => {
    const before = energy(state.hobbies.find((h) => h.id === d.hobbyId));
    state.sessions.push({ id: uid(), hobbyId: d.hobbyId, minutes: Math.max(1, +d.minutes), date: d.date, note: d.note.trim(), created: Date.now() });
    const h = state.hobbies.find((x) => x.id === d.hobbyId);
    toast(`${h.emoji} ${h.name} +${energy(h) - before}% energy`);
  });
  document.querySelectorAll('#dlg [data-min]').forEach((b) =>
    b.addEventListener('click', () => { $('#dlg [name=minutes]').value = b.dataset.min; }));
}

function hobbyDialog(id) {
  const h = state.hobbies.find((x) => x.id === id) || { name: '', emoji: '⭐', color: PALETTE[state.hobbies.length % PALETTE.length], goal: 120 };
  openDialog(`<form><h2>${id ? 'Edit' : 'New'} hobby</h2>
    <label>Name<input name="name" value="${esc(h.name)}" required placeholder="e.g. 3D printing, Woodworking, Guitar"></label>
    <div class="row"><label style="flex:1">Emoji<input name="emoji" value="${esc(h.emoji)}" maxlength="4" required></label>
      <label style="flex:1">Color<input name="color" type="color" value="${h.color}"></label></div>
    <label>Weekly goal (minutes)<input name="goal" type="number" min="10" step="10" value="${h.goal}" required></label>
    <div class="row"><button class="primary" value="save">Save</button>
      ${id ? '<button value="delete" class="danger" formnovalidate>Delete</button>' : ''}
      <button value="cancel" formnovalidate>Cancel</button></div></form>`,
  (d, action) => {
    if (action === 'delete') {
      if (!confirm(`Delete ${h.name}? Its logged sessions will be removed too.`)) return;
      state.hobbies = state.hobbies.filter((x) => x.id !== id);
      state.sessions = state.sessions.filter((s) => s.hobbyId !== id);
      state.gear.forEach((g) => { if (g.hobbyId === id) g.hobbyId = ''; });
      return;
    }
    const next = { name: d.name.trim(), emoji: d.emoji.trim(), color: d.color, goal: Math.max(10, +d.goal) };
    if (id) Object.assign(h, next);
    else state.hobbies.push({ id: uid(), ...next });
  });
}

function gearDialog(id) {
  const g = state.gear.find((x) => x.id === id) || { name: '', hobbyId: state.hobbies[0]?.id, status: 'ready', notes: '' };
  openDialog(`<form><h2>${id ? 'Edit' : 'New'} gear</h2>
    <label>Name<input name="name" value="${esc(g.name)}" required placeholder="e.g. 5&quot; freestyle quad"></label>
    <label>Hobby<select name="hobbyId"><option value="">Unassigned</option>${hobbyOptions(g.hobbyId)}</select></label>
    <label>Status<select name="status">${Object.entries(GEAR_STATUS).map(([k, v]) => `<option value="${k}" ${k === g.status ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label>Notes<textarea name="notes" placeholder="Parts needed, specs, next step…">${esc(g.notes)}</textarea></label>
    <div class="row"><button class="primary" value="save">Save</button>
      ${id ? '<button value="delete" class="danger" formnovalidate>Delete</button>' : ''}
      <button value="cancel" formnovalidate>Cancel</button></div></form>`,
  (d, action) => {
    if (action === 'delete') { state.gear = state.gear.filter((x) => x.id !== id); return; }
    const next = { name: d.name.trim(), hobbyId: d.hobbyId, status: d.status, notes: d.notes.trim() };
    if (id) Object.assign(g, next);
    else state.gear.push({ id: uid(), ...next });
  });
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 2500);
}

// ---------- events ----------

function bindView(view) {
  view.querySelectorAll('[data-action]').forEach((el) => el.addEventListener('click', () => {
    const { action, id, k } = el.dataset;
    switch (action) {
      case 'log': return logDialog(id);
      case 'add-hobby': return hobbyDialog();
      case 'edit-hobby': return hobbyDialog(id);
      case 'add-gear': return gearDialog();
      case 'edit-gear': return gearDialog(id);
      case 'gear-filter': gearFilter = k; return render();
      case 'del-session':
        state.sessions = state.sessions.filter((s) => s.id !== id); save(); return render();
      case 'rename': {
        const name = prompt('Name your Hobbytron:', state.petName);
        if (name && name.trim()) { state.petName = name.trim(); save(); render(); }
        return;
      }
      case 'export': {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
        a.download = `hobbytron-${today()}.json`;
        a.click();
        return;
      }
      case 'import': return $('#import').click();
      case 'reset':
        if (confirm('Erase all hobbies, sessions and gear and start fresh?')) { state = seed(); save(); render(); }
        return;
    }
  }));
  const imp = $('#import', view);
  if (imp) imp.addEventListener('change', async () => {
    try {
      const data = JSON.parse(await imp.files[0].text());
      if (!Array.isArray(data.hobbies) || !Array.isArray(data.sessions)) throw new Error('bad file');
      state = { petName: 'Tronnie', gear: [], ...data };
      save(); toast('Imported'); tab = 'habitat'; render();
    } catch (e) { alert('That file does not look like a Hobbytron export.'); }
  });
}

document.querySelectorAll('nav button').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
render();

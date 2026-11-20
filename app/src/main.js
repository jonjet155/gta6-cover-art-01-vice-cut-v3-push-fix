// VICE CUT v3 Push Fix — the studio editor. Owns the state, the photo tray, panel
// selection, crop + pan + zoom, caption/role editing, grades with sliders, and PNG
// export. The cover itself is drawn by cover.js; this file only moves the pieces.
import {
  SIZES, SAMPLES, SAMPLE_MAP, LAYOUTS, LAYOUT_MAP, GRADES, GRADE_MAP, CAPTION_STYLES,
  DEFAULT_STATE, defaultPanels, panelRects,
  drawCover, cropPhoto, positionPhoto, fillPanels, editCaption, exportPNG,
} from './cover.js';

const $ = (id) => document.getElementById(id);
const state = { ...DEFAULT_STATE, panels: defaultPanels(DEFAULT_STATE.layout) };
const panelCache = { [DEFAULT_STATE.layout]: state.panels };
const images = {};
const uploads = {};
let uploadCount = 0;
let selectedPanel = 0;
let pendingPhoto = null;
let drag = null;

export function applyQueryParams(query) {
  // Validate every parameter: an unknown layout used to crash defaultPanels
  // (LAYOUT_MAP[layout] is undefined), so bad ?shot= links broke the app.
  if (query.get('layout') && LAYOUT_MAP[query.get('layout')]) state.layout = query.get('layout');
  if (query.get('grade') && GRADE_MAP[query.get('grade')]) state.grade = query.get('grade');
  if (query.get('style') && CAPTION_STYLES.some((s) => s.id === query.get('style'))) state.captionStyle = query.get('style');
  if (query.get('title')) state.title = query.get('title');
  if (query.get('tagline')) state.tagline = query.get('tagline');
  if (query.get('size') && SIZES[query.get('size')]) state.size = query.get('size');
  if (query.get('stars') !== null) state.showStars = query.get('stars') !== '0';
  if (query.get('badge') !== null) state.showBadge = query.get('badge') !== '0';
  if (query.get('gradeIntensity') !== null) {
    const n = Number(query.get('gradeIntensity'));
    if (Number.isFinite(n)) state.gradeIntensity = Math.min(100, Math.max(0, n));
  }
  state.panels = panelCache[state.layout] ?? defaultPanels(state.layout);
  panelCache[state.layout] = state.panels;
}

function switchLayout(layoutId) {
  panelCache[state.layout] = state.panels;
  state.layout = layoutId;
  state.panels = panelCache[layoutId] ?? defaultPanels(layoutId);
  panelCache[layoutId] = state.panels;
  selectedPanel = 0;
  buildPanelEditor();
  render();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSamples() {
  for (const s of SAMPLES) {
    try { images[s.key] = await loadImage(`samples/${s.file}`); }
    catch { /* a missing sample leaves an empty panel, never a crash */ }
  }
}

function render() {
  const canvas = $('cover');
  const size = SIZES[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(canvas, state, images);
  document.querySelectorAll('#sizeSeg button').forEach((b) =>
    b.classList.toggle('active', b.dataset.size === state.size));
  document.querySelectorAll('#layoutRow button').forEach((b) =>
    b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradeRow button').forEach((b) =>
    b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('#styleRow button').forEach((b) =>
    b.classList.toggle('active', b.dataset.style === state.captionStyle));
  $('gradeSlider').value = state.gradeIntensity;
  $('gradeValue').textContent = `${state.gradeIntensity}%`;
  $('roleToggle').checked = state.showRoles;
  updateHint();
}

function updateHint() {
  const panel = state.panels[selectedPanel];
  const sample = panel ? SAMPLE_MAP[panel.photo] || uploads[panel.photo] : null;
  $('hint').textContent = panel
    ? `Panel ${selectedPanel + 1} of ${state.panels.length} — ${sample ? sample.label : panel.photo} · drag to pan · scroll to zoom · pick a tray photo to replace it`
    : 'Click a panel on the cover to select it, then pick a photo from the tray.';
}

function buildButtons() {
  const layoutRow = $('layoutRow');
  layoutRow.innerHTML = '';
  for (const l of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = l.id;
    b.textContent = l.name;
    b.addEventListener('click', () => switchLayout(l.id));
    layoutRow.appendChild(b);
  }
  const gradeRow = $('gradeRow');
  gradeRow.innerHTML = '';
  for (const g of GRADES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = g.id;
    b.textContent = g.name;
    b.addEventListener('click', () => { state.grade = g.id; render(); });
    gradeRow.appendChild(b);
  }
  const styleRow = $('styleRow');
  styleRow.innerHTML = '';
  for (const s of CAPTION_STYLES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.style = s.id;
    b.textContent = s.name;
    b.addEventListener('click', () => { state.captionStyle = s.id; render(); });
    styleRow.appendChild(b);
  }
  const sizeSeg = $('sizeSeg');
  sizeSeg.innerHTML = '';
  for (const [key, s] of Object.entries(SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.size = key;
    b.textContent = s.label.split(' ')[0];
    b.title = s.label;
    b.addEventListener('click', () => { state.size = key; render(); });
    sizeSeg.appendChild(b);
  }
}

function buildTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  for (const s of SAMPLES) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'tray-item';
    item.dataset.photo = s.key;
    item.title = `${s.label} — ${s.role}`;
    const img = document.createElement('img');
    img.src = `samples/${s.file}`;
    img.alt = s.label;
    const label = document.createElement('span');
    label.textContent = s.label;
    item.append(img, label);
    item.addEventListener('click', () => choosePhoto(s.key));
    tray.appendChild(item);
  }
}

/** Click a tray photo, then a panel, to place it — or place it straight into the selected panel. */
export function choosePhoto(photoKey) {
  pendingPhoto = photoKey;
  document.querySelectorAll('.tray-item').forEach((el) =>
    el.classList.toggle('picked', el.dataset.photo === photoKey));
  const panel = state.panels[selectedPanel];
  if (panel) placePhoto(selectedPanel, photoKey);
  updateHint();
}

function placePhoto(index, photoKey) {
  const panel = state.panels[index];
  if (!panel) return;
  const sample = SAMPLE_MAP[photoKey] || uploads[photoKey];
  panel.photo = photoKey;
  if (sample) {
    panel.role = sample.role;
    panel.caption = sample.caption;
    panel.fx = sample.fx ?? 0.5;
    panel.fy = sample.fy ?? 0.5;
  }
  panel.zoom = 1;
  panel.panX = 0;
  panel.panY = 0;
  pendingPhoto = null;
  document.querySelectorAll('.tray-item').forEach((el) => el.classList.remove('picked'));
  buildPanelEditor();
  render();
}

function buildPanelEditor() {
  const panel = state.panels[selectedPanel];
  const editor = $('panelEditor');
  if (!panel) { editor.innerHTML = '<p class="muted">No panel selected.</p>'; return; }
  const sample = SAMPLE_MAP[panel.photo] || uploads[panel.photo];
  $('panelName').textContent = `Panel ${selectedPanel + 1} — ${sample ? sample.label : panel.photo}`;
  $('roleInput').value = panel.role || '';
  $('captionInput').value = panel.caption || '';
  $('zoomSlider').value = Math.round(panel.zoom * 100);
  $('zoomValue').textContent = `${Math.round(panel.zoom * 100)}%`;
}

export function selectPanel(index) {
  if (index < 0 || index >= state.panels.length) return;
  selectedPanel = index;
  if (pendingPhoto) placePhoto(index, pendingPhoto);
  buildPanelEditor();
  render();
}

function hitTest(clientX, clientY) {
  const canvas = $('cover');
  const box = canvas.getBoundingClientRect();
  const x = ((clientX - box.left) / box.width) * canvas.width;
  const y = ((clientY - box.top) / box.height) * canvas.height;
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

function wireCanvas() {
  const canvas = $('cover');
  canvas.addEventListener('pointerdown', (e) => {
    const hit = hitTest(e.clientX, e.clientY);
    if (hit >= 0) {
      selectPanel(hit);
      drag = { x: e.clientX, y: e.clientY, panel: state.panels[hit] };
      canvas.setPointerCapture(e.pointerId);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const box = canvas.getBoundingClientRect();
    const rects = panelRects(state.layout, canvas.width, canvas.height);
    const rect = rects[selectedPanel];
    if (!rect) return;
    const dx = (e.clientX - drag.x) / box.width;
    const dy = (e.clientY - drag.y) / box.height;
    // Pan in window units so the photo tracks the cursor 1:1: a drag across the
    // panel's full displayed width moves the window by one full window width.
    drag.panel.panX = Math.max(-0.45, Math.min(0.45, drag.panel.panX + dx * (canvas.width / rect.w)));
    drag.panel.panY = Math.max(-0.45, Math.min(0.45, drag.panel.panY + dy * (canvas.height / rect.h)));
    drag.x = e.clientX;
    drag.y = e.clientY;
    render();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panel = state.panels[selectedPanel];
    if (!panel) return;
    // Wheel deltas come in pixels (mice), lines (trackpads, ~40x smaller) or
    // pages — normalise to pixels first so zoom speed is the same everywhere.
    const delta = e.deltaMode === 1 ? e.deltaY * 40
      : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
    panel.zoom = Math.max(1, Math.min(3, panel.zoom * (1 - delta * 0.001)));
    buildPanelEditor();
    render();
  }, { passive: false });
  // Double-click a panel to re-centre its focus on that spot.
  canvas.addEventListener('dblclick', (e) => {
    const hit = hitTest(e.clientX, e.clientY);
    if (hit < 0) return;
    const box = canvas.getBoundingClientRect();
    const rects = panelRects(state.layout, canvas.width, canvas.height);
    const r = rects[hit];
    const fx = ((e.clientX - box.left) / box.width * canvas.width - r.x) / r.w;
    const fy = ((e.clientY - box.top) / box.height * canvas.height - r.y) / r.h;
    positionPhoto(state.panels[hit], fx, fy);
    render();
  });
}

async function handleUpload(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    uploadCount += 1;
    const key = `up${uploadCount}`;
    const url = URL.createObjectURL(file);
    try {
      images[key] = await loadImage(url);
    } catch {
      URL.revokeObjectURL(url);
      continue;
    }
    uploads[key] = {
      key, label: `Your Photo ${uploadCount}`, role: 'YOUR SHOT',
      caption: 'UPLOADED PHOTO · TODAY — YOUR STORY HERE', fx: 0.5, fy: 0.5,
    };
    const tray = $('tray');
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'tray-item';
    item.dataset.photo = key;
    item.title = uploads[key].label;
    const img = document.createElement('img');
    img.src = url;
    img.alt = uploads[key].label;
    const label = document.createElement('span');
    label.textContent = uploads[key].label;
    item.append(img, label);
    item.addEventListener('click', () => choosePhoto(key));
    tray.appendChild(item);
    choosePhoto(key);
  }
}

function wireControls() {
  $('uploadBtn').addEventListener('click', () => $('uploadInput').click());
  $('uploadInput').addEventListener('change', (e) => {
    handleUpload([...e.target.files]);
    e.target.value = '';
  });
  $('fillEmptyBtn').addEventListener('click', () => {
    const empty = state.panels.filter((p) => !p.photo);
    if (empty.length === 0) return;
    const unused = SAMPLES.filter((s) => !state.panels.some((p) => p.photo === s.key));
    empty.forEach((p, i) => {
      const s = unused[i % unused.length];
      p.photo = s.key;
      p.role = s.role;
      p.caption = s.caption;
      p.fx = s.fx;
      p.fy = s.fy;
      p.zoom = 1;
      p.panX = 0;
      p.panY = 0;
    });
    buildPanelEditor();
    render();
  });
  $('fillOneBtn').addEventListener('click', () => {
    const key = state.panels[selectedPanel]?.photo || 'hero';
    fillPanels(state.panels, key, 'one');
    buildPanelEditor();
    render();
  });
  $('roleInput').addEventListener('input', (e) => {
    const panel = state.panels[selectedPanel];
    if (panel) { editCaption(panel, e.target.value.toUpperCase(), undefined); render(); }
  });
  $('captionInput').addEventListener('input', (e) => {
    const panel = state.panels[selectedPanel];
    if (panel) { editCaption(panel, undefined, e.target.value.toUpperCase()); render(); }
  });
  $('zoomSlider').addEventListener('input', (e) => {
    const panel = state.panels[selectedPanel];
    if (!panel) return;
    panel.zoom = Number(e.target.value) / 100;
    $('zoomValue').textContent = `${e.target.value}%`;
    render();
  });
  $('resetCropBtn').addEventListener('click', () => {
    const panel = state.panels[selectedPanel];
    if (!panel) return;
    const sample = SAMPLE_MAP[panel.photo] || uploads[panel.photo];
    if (sample) positionPhoto(panel, sample.fx ?? 0.5, sample.fy ?? 0.5);
    panel.zoom = 1;
    buildPanelEditor();
    render();
  });
  $('clearPanelBtn').addEventListener('click', () => {
    const panel = state.panels[selectedPanel];
    if (!panel) return;
    panel.photo = null;
    panel.role = '';
    panel.caption = '';
    buildPanelEditor();
    render();
  });
  $('gradeSlider').addEventListener('input', (e) => {
    state.gradeIntensity = Number(e.target.value);
    render();
  });
  $('roleToggle').addEventListener('change', (e) => {
    state.showRoles = e.target.checked;
    render();
  });
  $('starsToggle').addEventListener('change', (e) => {
    state.showStars = e.target.checked;
    render();
  });
  $('badgeToggle').addEventListener('change', (e) => {
    state.showBadge = e.target.checked;
    render();
  });
  const textFields = [
    ['titleInput', 'title'], ['taglineInput', 'tagline'], ['quoteInput', 'quote'],
    ['gazetteInput', 'gazette'], ['volInput', 'vol'], ['ribbonInput', 'ribbon'],
    ['billing1Input', 'billing1'], ['billing2Input', 'billing2'],
  ];
  for (const [id, key] of textFields) {
    $(id).addEventListener('input', (e) => {
      state[key] = key === 'title' ? e.target.value.toUpperCase() : e.target.value;
      render();
    });
  }
  document.querySelectorAll('[data-export]').forEach((b) => {
    b.addEventListener('click', async () => {
      const blob = await exportPNG(state, images, b.dataset.export);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cut-${b.dataset.export}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    });
  });
}

async function init() {
  applyQueryParams(new URLSearchParams(location.search));
  buildButtons();
  buildTray();
  wireControls();
  wireCanvas();
  buildPanelEditor();
  // Keep the text inputs in sync with any ?shot= parameters.
  $('titleInput').value = state.title;
  $('taglineInput').value = state.tagline;
  $('quoteInput').value = state.quote;
  $('gazetteInput').value = state.gazette;
  $('volInput').value = state.vol;
  $('ribbonInput').value = state.ribbon;
  $('billing1Input').value = state.billing1;
  $('billing2Input').value = state.billing2;
  // Load the vendored lettering before the first paint, so the title is never
  // drawn in a fallback font.
  try {
    await Promise.all([
      document.fonts.load('16px "Bebas Neue"'),
      document.fonts.load('700 16px Caveat'),
      document.fonts.ready,
    ]);
  } catch { /* fonts may already be ready; the canvas draws with them anyway */ }
  await loadSamples();
  render();
  window.__vicecut = { state, images, uploads, render, selectPanel, choosePhoto, exportPNG, panelRects, drawCover, SIZES };
}

init();

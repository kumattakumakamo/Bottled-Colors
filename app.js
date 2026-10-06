/* My Color Shelf
 * 画面：#/ 棚 ／ #/new 新しい瓶 ／ #/edit/:id 瓶を編集 ／ #/bottle/:id 瓶の詳細
 * データ：localStorage（このブラウザの中だけに保存）
 * 配色：ベース・メイン・アクセントの固定比率 75 / 20 / 5
 * 完成演出：スコップで アクセント→メイン→ベース の順に注ぐ → コルク → リボン → キラキラ → 完成！
 */
(() => {
'use strict';

// ---------------- data ----------------
const STORE = 'my-color-shelf.v1';
const ROLES = [['base', 'ベース'], ['main', 'メイン'], ['accent', 'アクセント']];
const ROLE_LABEL = Object.fromEntries(ROLES);
const DEFAULT_COLORS = { base: '#E8E2DA', main: '#B8AFA4', accent: '#7D7368' };
const SEED = [
  ['夕暮れの海', '#E98A6B', '#F6C470', '#C9A7E6'],
  ['森の静けさ', '#9CC983', '#4E8A4F', '#2F5E3A'],
  ['ソーダフロート', '#BDEBF4', '#6FD3EA', '#EAF8FB'],
  ['カフェラテ', '#EBCB9E', '#B07A4E', '#5A3A28'],
  ['夜の帳', '#4A5CC8', '#3040A8', '#1E2A78'],
  ['ラベンダーミスト', '#F2C4D0', '#B79BE0', '#8F7BD1'],
  ['ミモザ', '#F4C94A', '#F7DC7A', '#8DB36A'],
  ['スイカソーダ', '#F2A0A8', '#F7D9DC', '#3FB39A'],
].map(([name, base, main, accent], i) => ({ id: 'seed' + i, name, colors: { base, main, accent } }));

let bottles = load();
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE));
    if (Array.isArray(s)) return s;
  } catch (e) { /* ignore */ }
  return SEED.map(b => ({ ...b, colors: { ...b.colors } }));
}
function persist() {
  try { localStorage.setItem(STORE, JSON.stringify(bottles)); } catch (e) { /* ignore */ }
}
const findBottle = id => bottles.find(b => b.id === id);
const newId = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ---------------- color utils ----------------
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function hsvToHex(h, s, v) {
  s /= 100; v /= 100;
  const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return '#' + [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}
function hexToHsv(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: Math.round(mx ? d / mx * 100 : 0), v: Math.round(mx * 100) };
}
function normHex(str) {
  let s = String(str).trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(s)) s = s.split('').map(c => c + c).join('');
  return /^[0-9a-f]{6}$/i.test(s) ? '#' + s.toUpperCase() : null;
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------- icons ----------------
const ICON = {
  back: '<path d="M13 5 6 12l7 7M6 12h13"/>',
  menu: '<path d="M5 7h14M5 12h14M5 17h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  more: '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  copy: '<path d="M9 9h10v10H9zM5 15V5h10"/>',
  pencil: '<path d="M5 19l1-4L16 5l3 3L9 18zM14 7l3 3"/>',
  jar: '<path d="M9 3h6v3H9zM7 8h10v12H7z"/>',
  trash: '<path d="M5 7h14M9 7V5h6v2M7 7l1 12h8l1-12M10 10v6M14 10v6"/>',
};
const icon = (k, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${ICON[k]}</svg>`;

// ---------------- bottle drawing ----------------
// 80 x 112 の座標系（Figmaのボトルと同じ寸法）
const BODY = 'M4 55C4 41.7 14.7 31 28 31H52C65.3 31 76 41.7 76 55V91C76 102 67 111 56 111H24C13 111 4 102 4 91Z';
// 砂の高さ：ガラス内側のクリーム色の帯（底から3.6）の上に、ベース75 / メイン20 / アクセント5 を積む（下からアクセント→メイン→ベース）
const SAND_BOTTOM = 107.4, SAND_H = 60;
const LAYERS = {
  accent: [SAND_BOTTOM - SAND_H * .05, SAND_H * .05],
  main: [SAND_BOTTOM - SAND_H * .25, SAND_H * .20],
  base: [SAND_BOTTOM - SAND_H, SAND_H * .75],
};
const GLITTER = [[.30, .35], [.62, .55], [.78, .25], [.45, .80], [.22, .70]];
const layerAt = y => (y >= LAYERS.accent[0] ? 'accent' : y >= LAYERS.main[0] ? 'main' : 'base');

function star4(cx, cy, R, fill, extra = '') {
  const r = R * .32; let d = '';
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 4, rad = i % 2 ? r : R;
    d += (i ? 'L' : 'M') + (cx + rad * Math.cos(a)).toFixed(2) + ' ' + (cy + rad * Math.sin(a)).toFixed(2);
  }
  return `<path d="${d}Z" fill="${fill}" ${extra}/>`;
}

let uid = 0;
function bottleSVG(c, { cork = true, ribbon = true, glitter = true, guides = false, cls = '' } = {}) {
  const id = 'bt' + (++uid);
  const sand = ['accent', 'main', 'base'].map(k => {
    const [y, h] = LAYERS[k];
    return `<rect class="sand sand-${k}" x="4" y="${y}" width="72" height="${(k === 'accent' ? h + 4 : h + .4).toFixed(1)}" fill="${c[k]}"/>`;
  }).join('');
  // きらめき：乗っている層とは別の層の色を使う（優先：アクセント→メイン→ベース）
  const gl = GLITTER.map(([px, py], i) => {
    const x = 4 + 72 * px, y = LAYERS.base[0] + SAND_H * .92 * py, here = c[layerAt(y)].toUpperCase();
    const pick = ['accent', 'main', 'base'].map(k => c[k]).find(h => h.toUpperCase() !== here);
    if (!pick) return '';
    return i === 2 ? star4(x, y, 2.5, pick) : `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r=".9" fill="${pick}"/>`;
  }).join('');
  const a = c.accent;
  return `<svg class="${cls}" viewBox="0 0 80 112" aria-hidden="true">
  <defs><clipPath id="${id}"><path d="${BODY}"/></clipPath></defs>
  <path d="${BODY}" fill="rgba(255,255,255,.5)"/>
  <g clip-path="url(#${id})">
    ${sand}
    <g class="glitter" style="opacity:${glitter ? 1 : 0}">${gl}</g>
    <path d="${BODY}" fill="none" stroke="#F7EDE0" stroke-width="7.2"/>
    <rect x="13" y="43" width="6" height="44" rx="3" fill="#fff" fill-opacity=".55"/>
    ${guides ? `<g class="guides" stroke="rgba(0,0,0,.18)" stroke-width=".5" stroke-dasharray="2 2">${['base', 'main', 'accent'].map(k => LAYERS[k][0]).map(y => `<line x1="14" x2="66" y1="${y}" y2="${y}"/>`).join('')}</g>` : ''}
  </g>
  <path d="${BODY}" fill="none" stroke="#CDBBA6" stroke-width="1.5"/>
  <rect x="26" y="15" width="28" height="18" fill="rgba(255,255,255,.5)" stroke="#CDBBA6" stroke-width="1.5"/>
  <rect x="22" y="24" width="36" height="7" rx="3.5" fill="rgba(255,255,255,.75)" stroke="#CDBBA6" stroke-width="1.5"/>
  <g class="cork" style="opacity:${cork ? 1 : 0}"><rect x="25" y="0" width="30" height="19" rx="5" fill="#C49063"/><rect x="25" y="0" width="30" height="5" rx="3" fill="#DDB184"/></g>
  <g class="ribbon" style="opacity:${ribbon ? 1 : 0}" stroke="#B49B82" stroke-width=".6">
    <rect x="26" y="19.5" width="28" height="4" fill="${a}"/>
    <ellipse cx="55.5" cy="19" rx="3.5" ry="2.5" fill="${a}"/>
    <ellipse cx="55.5" cy="24" rx="3.5" ry="2.5" fill="${a}"/>
    <rect x="55" y="23" width="2.2" height="8" rx="1" fill="${a}" transform="rotate(18 56 27)"/>
    <rect x="53" y="23" width="2.2" height="7" rx="1" fill="${a}" transform="rotate(-12 54 26)"/>
    <circle cx="54.5" cy="21.5" r="2.2" fill="${a}"/>
  </g>
</svg>`;
}

// 飾り窓の中の「光の弧」（ベース色）とキラキラ（その瓶の色だけ）
function archPath(W, r, ext) {
  const k = .5523, cx = W / 2, cy = W / 2;
  return `M${cx - r} ${cy + ext}L${cx - r} ${cy}C${cx - r} ${cy - k * r} ${cx - k * r} ${cy - r} ${cx} ${cy - r}C${cx + k * r} ${cy - r} ${cx + r} ${cy - k * r} ${cx + r} ${cy}L${cx + r} ${cy + ext}`;
}
function nicheDeco(c, big = false) {
  if (big) {
    const W = 200, H = 264;
    return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <path d="${archPath(W, 88, 120)}" fill="none" stroke="${c.base}" stroke-width="3.5" stroke-linecap="round"/>
      ${star4(156, 52, 8, c.base)}${star4(42, 70, 5.5, c.accent)}<circle cx="52.5" cy="44.5" r="2.5" fill="${c.main}"/>
    </svg>`;
  }
  const W = 94, H = 155, m = W / 2;
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
    <path d="${archPath(W, 36, 16)}" fill="none" stroke="${c.base}" stroke-width="2.5" stroke-linecap="round"/>
    ${star4(m + 23, 30, 5, c.base)}${star4(m - 25, 44, 3.5, c.accent)}<circle cx="${m - 18}" cy="28" r="1.5" fill="${c.main}"/>
  </svg>`;
}

// ---------------- app shell ----------------
const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
}
async function copyText(t, msg = 'コピーしました') {
  try { await navigator.clipboard.writeText(t); toast(msg); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(msg); } catch (_) { toast('コピーできませんでした'); }
    ta.remove();
  }
}
const go = h => { location.hash = h; };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPEED = reduced ? .2 : 1;
const wait = ms => new Promise(r => setTimeout(r, ms));
let view = '';
let shelfColsNow = 3;

// 画面全体を端末の表示領域に収める：縮小率K = min(幅/390, 高さ/設計上の必要高さ)
// PCの横長画面では、作業台を左右2分割（左：瓶と砂／右：カラーツール）にする
let K = 1;
const isWide = () => innerWidth >= 860 && innerWidth / innerHeight >= 1.2;
// 画面ごとの設計サイズ（PC横長のときは 作業台・棚 を横長レイアウトにする）
function metrics(need) {
  const wideEditor = view === 'editor' && isWide();
  const wideShelf = view === 'shelf' && isWide();
  app.classList.toggle('wide', wideEditor || wideShelf);
  const W = app.clientWidth, Hv = app.clientHeight;
  const designW = wideEditor || wideShelf ? 1000 : 390;
  const h = wideEditor ? 760 : need;
  const k = Math.min(W / designW, Hv / h);
  return { wideEditor, wideShelf, W, Hv, k, sw: W / k };
}
// 棚の列数：棚の内幅に、1列あたり約124pxで何列入るか（スマホは3列固定）
function shelfCols() {
  const m = metrics(810);
  if (!m.wideShelf) return 3;
  const inner = m.sw - 48 - 8 - 24;
  return Math.max(3, Math.floor(inner / 124));
}
function fit() {
  const sc = app.querySelector('.screen');
  if (!sc) return;
  const m = metrics(+sc.dataset.h || 844);
  sc.classList.toggle('wide', m.wideEditor);
  sc.classList.toggle('wide-shelf', m.wideShelf);
  const W = m.W, Hv = m.Hv;
  K = m.k;
  sc.style.width = W / K + 'px';
  sc.style.height = Hv / K + 'px';
  sc.style.transform = `scale(${K})`;
}

// ================= 1. shelf =================
function renderShelf() {
  view = 'shelf';
  const cols = shelfCols();
  shelfColsNow = cols;
  // 段数は最低3段。瓶のない場所には空の飾り窓を置く（undefined → 空の窓）
  const items = [...bottles, null];
  const total = Math.max(3, Math.ceil(items.length / cols)) * cols;
  while (items.length < total) items.push(undefined);
  const rows = [];
  for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
  const idx = [...Array(cols).keys()];
  app.innerHTML = `<div class="screen" data-h="810">
  <header class="hdr">
    <button class="circle-btn" id="menuBtn" aria-label="メニュー">${icon('menu')}</button>
    <h1 class="hdr-title">My Color Shelf</h1>
    <button class="circle-btn" id="addBtn" aria-label="新しい瓶をつくる">${icon('plus')}</button>
  </header>
  <section class="cabinet" aria-label="コレクション棚">
    <div class="crown"></div>
    <div class="cab-body" style="--cols:${cols}">
      ${rows.map((row, ri) => `
      <div class="shelf-row">
        <div class="slots">
          ${idx.map(j => {
            const b = row[j], at = ri * cols + j;
            if (b === undefined) return `<div class="slot" data-idx="${at}"><div class="niche-rim"></div><div class="niche"></div></div>`;
            if (b === null) return `<div class="slot" data-idx="${at}"><div class="niche-rim"></div><div class="niche"></div>
              <button class="new-slot" data-new aria-label="新しい瓶をつくる">${icon('plus')}New Bottle</button></div>`;
            return `<div class="slot" data-idx="${at}"><div class="niche-rim"></div><div class="niche">${nicheDeco(b.colors)}</div>
              <div class="contact"></div>
              <button class="bottle-btn" data-id="${b.id}" aria-label="${esc(b.name)}を開く">${bottleSVG(b.colors)}</button></div>`;
          }).join('')}
        </div>
        <div class="board"><div class="board-top"></div><div class="board-front"><div class="plates">
          ${idx.map(j => {
            const b = row[j];
            return b ? `<div class="plate${[...b.name].length > 6 ? ' small' : ''}" title="${esc(b.name)}">${esc(b.name)}</div>` : '<span></span>';
          }).join('')}
        </div></div></div>
      </div>`).join('')}
    </div>
    <div class="cab-base"></div>
  </section>
  <p class="shelf-hint">タップで開く ・ ドラッグで入れ替え（スマホは長押ししてから）</p></div>`;
  fit();
  app.querySelector('#menuBtn').onclick = () => toast('メニューは準備中です');
  app.querySelector('#addBtn').onclick = () => go('#/new');
  app.querySelectorAll('[data-new]').forEach(b => b.onclick = () => go('#/new'));
  app.querySelectorAll('[data-id]').forEach(b => b.onclick = () => {
    if (Date.now() - dragEndedAt < 400) return;   // ドラッグ直後のクリックでは開かない
    go('#/bottle/' + b.dataset.id);
  });
  setupShelfDrag();
}

// ----- 棚の並べ替え（ドラッグ＆ドロップ） -----
// PC：つかんで6px以上動かすと開始／スマホ：350ms長押しで開始（すぐ動かすと棚のスクロール）
let shelfAbort = null, dragEndedAt = 0, shelfScrollKeep = 0;
function setupShelfDrag() {
  if (shelfAbort) shelfAbort.abort();
  shelfAbort = new AbortController();
  const signal = shelfAbort.signal;
  const screen = app.querySelector('.screen'), body = app.querySelector('.cab-body');
  body.scrollTop = shelfScrollKeep; shelfScrollKeep = 0;
  let st = null, scrollTimer = null;

  const clearTarget = () => app.querySelectorAll('.slot.drop-target').forEach(el => el.classList.remove('drop-target'));
  const cancel = () => {
    if (!st) return;
    clearTimeout(st.timer); clearInterval(scrollTimer);
    if (st.ghost) st.ghost.remove();
    st.btn.classList.remove('dragging'); clearTarget();
    st = null;
  };
  const place = (cx, cy) => {
    const r = screen.getBoundingClientRect();
    const x = (cx - r.left) / K, y = (cy - r.top) / K;
    st.ghost.style.transform = `translate(${x - 44}px, ${y - 84}px) scale(1.08)`;
    clearTarget();
    const el = document.elementFromPoint(cx, cy);
    const slot = el && el.closest('.slot[data-idx]');
    st.to = slot ? +slot.dataset.idx : null;
    if (slot && st.to !== st.from) slot.classList.add('drop-target');
    // 棚の上端・下端に近づいたら自動スクロール
    const br = body.getBoundingClientRect();
    clearInterval(scrollTimer);
    const edge = 44 * K, dir = cy < br.top + edge ? -1 : cy > br.bottom - edge ? 1 : 0;
    if (dir) scrollTimer = setInterval(() => { body.scrollTop += dir * 8; }, 16);
  };
  const begin = (cx, cy) => {
    st.active = true;
    st.btn.classList.add('dragging');
    const g = document.createElement('div');
    g.className = 'drag-ghost';
    g.innerHTML = st.btn.innerHTML;
    screen.appendChild(g);
    st.ghost = g;
    if (navigator.vibrate) navigator.vibrate(8);
    place(cx, cy);
  };

  app.querySelectorAll('.bottle-btn').forEach(btn => {
    btn.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      cancel();
      const from = bottles.findIndex(b => b.id === btn.dataset.id);
      st = { btn, from, to: null, x: e.clientX, y: e.clientY, pid: e.pointerId, touch: e.pointerType !== 'mouse', active: false };
      if (st.touch) {
        const { clientX, clientY } = e;
        st.timer = setTimeout(() => { if (st && !st.active) begin(clientX, clientY); }, 350);
      }
    }, { signal });
    btn.addEventListener('contextmenu', e => e.preventDefault(), { signal });
  });

  window.addEventListener('pointermove', e => {
    if (!st || e.pointerId !== st.pid) return;
    if (!st.active) {
      const d = Math.hypot(e.clientX - st.x, e.clientY - st.y);
      if (st.touch) { if (d > 10) cancel(); return; }   // 長押し前に動いた＝スクロール
      if (d < 6) return;
      begin(e.clientX, e.clientY);
    }
    place(e.clientX, e.clientY);
  }, { signal });
  // ドラッグ中は画面のスクロールを止める
  document.addEventListener('touchmove', e => { if (st && st.active) e.preventDefault(); }, { passive: false, signal });

  window.addEventListener('pointerup', e => {
    if (!st || e.pointerId !== st.pid) return;
    if (!st.active) { cancel(); return; }
    const { from, to } = st;
    cancel();
    dragEndedAt = Date.now();
    if (to === null || to === from || from < 0) return;
    if (to < bottles.length) {
      [bottles[from], bottles[to]] = [bottles[to], bottles[from]];   // 瓶どうしは入れ替え
    } else {
      bottles.push(bottles.splice(from, 1)[0]);                      // 空き窓・New Bottle なら最後へ
    }
    persist();
    shelfScrollKeep = body.scrollTop;
    renderShelf();
  }, { signal });
  window.addEventListener('pointercancel', e => { if (st && e.pointerId === st.pid) cancel(); }, { signal });
}

// ================= 3. detail =================
function renderDetail(id) {
  const b = findBottle(id);
  if (!b) return go('#/');
  view = 'detail';
  const c = b.colors;
  app.innerHTML = `<div class="screen" data-h="830">
  <header class="hdr">
    <button class="circle-btn" id="backBtn" aria-label="棚に戻る">${icon('back')}</button>
    <button class="circle-btn" id="moreBtn" aria-label="その他の操作" aria-haspopup="menu">${icon('more')}</button>
  </header>
  <div class="detail-stage">
    <div class="niche-rim"></div><div class="niche">${nicheDeco(c, true)}</div>
    <div class="detail-board board"><div class="board-top"></div><div class="board-front"></div></div>
    <div class="contact"></div>
    <div class="detail-bottle">${bottleSVG(c)}</div>
  </div>
  <h2 class="bottle-name">${esc(b.name)}</h2>
  <p class="bottle-meta">3色のパレット</p>
  <section class="palette" aria-label="パレット">
    ${ROLES.map(([k, label]) => `
    <div class="color-row">
      <div class="swatch" style="background:${c[k]}"></div>
      <div class="color-text"><div class="color-hex">${c[k]}</div><div class="color-role">${label}</div></div>
      <button class="copy-btn" data-copy="${c[k]}" aria-label="${label}の${c[k]}をコピー">${icon('copy')}</button>
    </div>`).join('')}
  </section>
  <button class="copy-all" id="copyAll">${icon('copy')}HEXをまとめてコピー</button>
  <div class="detail-cta"><button class="cta" id="editBtn">${icon('pencil')}編集する</button></div></div>`;
  fit();

  app.querySelector('#backBtn').onclick = () => go('#/');
  app.querySelector('#editBtn').onclick = () => go('#/edit/' + b.id);
  app.querySelectorAll('[data-copy]').forEach(el => el.onclick = () => copyText(el.dataset.copy, el.dataset.copy + ' をコピーしました'));
  app.querySelector('#copyAll').onclick = () => copyText(ROLES.map(([k, l]) => `${l} ${c[k]}`).join('\n'), '3色をコピーしました');
  app.querySelector('#moreBtn').onclick = e => { e.stopPropagation(); toggleMenu(b); };
}
function toggleMenu(b) {
  const old = app.querySelector('.menu');
  if (old) { old.remove(); return; }
  const m = document.createElement('div');
  m.className = 'menu'; m.setAttribute('role', 'menu');
  m.innerHTML = `<button role="menuitem" id="dupBtn">${icon('copy')}複製する</button>
                 <button role="menuitem" class="danger" id="delBtn">${icon('trash')}削除する</button>`;
  app.querySelector('.screen').appendChild(m);
  m.querySelector('#dupBtn').onclick = () => {
    const nb = { id: newId(), name: b.name + 'のコピー', colors: { ...b.colors } };
    bottles.push(nb); persist(); toast('複製しました'); go('#/bottle/' + nb.id);
  };
  m.querySelector('#delBtn').onclick = () => { m.remove(); confirmDelete(b); };
  setTimeout(() => document.addEventListener('click', function close(ev) {
    if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('click', close); }
  }), 0);
}
function confirmDelete(b) {
  const back = document.createElement('div');
  back.className = 'modal-back';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt">
    <h3 id="mt">「${esc(b.name)}」を削除しますか？</h3>
    <p>削除した瓶は元に戻せません。</p>
    <div class="modal-actions"><button class="ghost" id="cancel">やめる</button><button class="danger" id="ok">削除する</button></div>
  </div>`;
  document.body.appendChild(back);
  back.querySelector('#cancel').onclick = () => back.remove();
  back.onclick = e => { if (e.target === back) back.remove(); };
  back.querySelector('#ok').onclick = () => {
    bottles = bottles.filter(x => x.id !== b.id); persist(); back.remove(); toast('削除しました'); go('#/');
  };
  back.querySelector('#ok').focus();
}

// ================= 2. editor (workbench) =================
let ed = null;      // { id, name, colors, role, hsv }
let busy = false;
let scoopPos = { x: 0, y: 0, a: -28 };

function renderEditor(id) {
  const src = id ? findBottle(id) : null;
  if (id && !src) return go('#/');
  view = 'editor';
  busy = false;
  ed = { id: id || null, name: src ? src.name : '', colors: src ? { ...src.colors } : { ...DEFAULT_COLORS }, role: 'base' };
  ed.hsv = hexToHsv(ed.colors.base);
  const grains = [[20, 90, 150], [210, 170, 120], [40, 300, 110], [250, 410, 100], [90, 500, 140]];
  const mound = { base: [42, 30], main: [32, 20], accent: [19, 11] };

  app.innerHTML = `<div class="screen" data-h="826">
  <header class="hdr">
    <button class="circle-btn" id="backBtn" aria-label="戻る">${icon('back')}</button>
    <label class="title-edit">
      <input id="nameInput" maxlength="16" placeholder="瓶の名前" value="${esc(ed.name)}" aria-label="瓶の名前">
      ${icon('pencil')}
    </label>
    <span class="hdr-spacer"></span>
  </header>
  <div class="bench" id="bench">
    <div class="wall"></div>
    <div class="table">
      ${grains.map(([x, y, w]) => `<span class="grain" style="left:${x}px;top:${y}px;width:${w}px"></span>`).join('')}
      <div class="tray-area">
      <div class="tray" role="radiogroup" aria-label="配色">
        ${ROLES.map(([k, label]) => `
        <button class="well${k === 'base' ? ' sel' : ''}" style="--sand:${ed.colors[k]}" data-role="${k}" role="radio" aria-checked="${k === 'base'}" aria-label="${label}">
          <svg viewBox="0 0 100 64" preserveAspectRatio="none"><ellipse class="mound" cx="50" cy="52" rx="${mound[k][0]}" ry="${mound[k][1]}" fill="${ed.colors[k]}"/></svg>
        </button>`).join('')}
      </div>
      <div class="tray-labels">${ROLES.map(([k, label]) => `<span data-label="${k}" class="${k === 'base' ? 'sel' : ''}">${label}</span>`).join('')}</div>
      </div>

      <section class="tool" id="tool" aria-label="色をえらぶ">
        <div class="tool-head">
          <div class="chip"></div>
          <div>
            <div class="tool-title" id="toolTitle">ベースの色</div>
            <div class="hex-row">
              <input id="hexInput" maxlength="7" spellcheck="false" aria-label="HEX">
              <button class="icon-btn" id="copyHex" aria-label="HEXをコピー">${icon('copy')}</button>
            </div>
          </div>
        </div>
        <div class="tool-body">
          <div class="wheel" id="wheel">
            <div class="wheel-ring" id="ring"></div>
            <div class="sv" id="sv"></div>
            <div class="knob hue-knob" id="hueKnob"></div>
            <div class="knob sv-knob" id="svKnob"></div>
          </div>
          <div class="sliders">
            ${[['h', '色相', 360], ['s', '彩度', 100], ['v', '明度', 100]].map(([k, label, max]) => `
            <div>
              <div class="slider-label" id="lb-${k}">${label}</div>
              <div class="slider-row">
                <input type="range" id="r-${k}" min="0" max="${max}" step="1" aria-labelledby="lb-${k}">
                <input type="number" id="n-${k}" min="0" max="${max}" step="1" inputmode="numeric" aria-label="${label}の数値">
              </div>
            </div>`).join('')}
          </div>
        </div>
      </section>

      <div class="cta-wrap"><button class="cta" id="fillBtn">${icon('jar')}瓶に詰める</button></div>
    </div>
    <div class="bottle-stage" id="stage">${bottleSVG(ed.colors, { cork: false, ribbon: false, glitter: false, guides: true, cls: 'edit-bottle' })}</div>
    <div class="bench-contact"></div>
    <div class="cork-aside" id="corkAside"></div>
    <div class="stream" id="stream"></div>
    <svg class="scoop" id="scoop" viewBox="0 0 120 60" aria-hidden="true">
      <rect x="60" y="20" width="56" height="10" rx="5" fill="#7A4E2A"/>
      <rect x="96" y="22" width="16" height="2" rx="1" fill="#fff" fill-opacity=".3"/>
      <rect x="52" y="19" width="10" height="12" rx="2" fill="#B08A45"/>
      <path d="M15.14 12A20 19.5 0 1 0 52.86 12Z" fill="#C9A15B" stroke="#9C7A3C" stroke-width="1.5"/>
      <ellipse cx="34" cy="13" rx="20" ry="5" fill="#E3C384" stroke="#9C7A3C" stroke-width="1.5"/>
      <ellipse id="scoopSand" cx="34" cy="12" rx="15" ry="3.5" fill="transparent"/>
    </svg>
  </div></div>`;
  fit();

  const $ = s => app.querySelector(s);
  $('#backBtn').onclick = () => go(ed.id ? '#/bottle/' + ed.id : '#/');
  const nameInput = $('#nameInput');
  const fitName = () => { nameInput.style.width = Math.max(5, [...(nameInput.value || nameInput.placeholder)].length) * 18 + 16 + 'px'; };
  nameInput.oninput = e => { ed.name = e.target.value; fitName(); };
  fitName();
  app.querySelectorAll('.well').forEach(w => w.onclick = () => selectRole(w.dataset.role, true));
  $('#fillBtn').onclick = fillAndFinish;
  $('#copyHex').onclick = () => copyText(ed.colors[ed.role], ed.colors[ed.role] + ' をコピーしました');

  // HEX直接入力：入力したHEXをそのまま採用する
  const hexInput = $('#hexInput');
  const applyHex = () => {
    const h = normHex(hexInput.value);
    if (!h) { hexInput.value = ed.colors[ed.role]; return; }
    ed.hsv = hexToHsv(h); setRoleColor(h);
  };
  hexInput.onchange = applyHex;
  hexInput.onkeydown = e => { if (e.key === 'Enter') { applyHex(); hexInput.blur(); } };

  // sliders + numbers
  ['h', 's', 'v'].forEach(k => {
    const r = $('#r-' + k), n = $('#n-' + k), max = k === 'h' ? 360 : 100;
    r.oninput = () => { ed.hsv[k] = +r.value; fromHsv(); };
    n.onchange = () => { ed.hsv[k] = clamp(Math.round(+n.value || 0), 0, max); fromHsv(); };
  });

  // wheel (hue ring) and SV square
  const wheel = $('#wheel'), sv = $('#sv');
  const dragOn = (el, fn) => {
    el.addEventListener('pointerdown', e => {
      if (!fn(e, true)) return;
      el.setPointerCapture(e.pointerId);
      const move = ev => fn(ev, false);
      const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
      el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      e.preventDefault();
    });
  };
  dragOn(wheel, (e, start) => {
    if (e.target === sv) return false;
    const r = wheel.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    if (start && Math.hypot(dx, dy) < r.width * .30) return false;
    let h = Math.atan2(-dy, dx) * 180 / Math.PI; if (h < 0) h += 360;   // 上に行くほど色相が進む
    ed.hsv.h = Math.round(h) % 360; fromHsv(); return true;
  });
  dragOn(sv, e => {
    const r = sv.getBoundingClientRect();
    ed.hsv.s = Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * 100);
    ed.hsv.v = Math.round(clamp(1 - (e.clientY - r.top) / r.height, 0, 1) * 100);
    fromHsv(); return true;
  });

  syncTool();
  requestAnimationFrame(() => placeScoop(wellTarget(ed.role)));
}

function fromHsv() { setRoleColor(hsvToHex(ed.hsv.h, ed.hsv.s, ed.hsv.v)); }
function setRoleColor(hex) {
  ed.colors[ed.role] = hex;
  const w = app.querySelector(`.well[data-role="${ed.role}"]`);
  if (w) { w.style.setProperty('--sand', hex); w.querySelector('.mound').setAttribute('fill', hex); }
  syncTool();
}
function syncTool() {
  const $ = s => app.querySelector(s);
  const { h, s, v } = ed.hsv, hex = ed.colors[ed.role];
  const tool = $('#tool');
  tool.style.setProperty('--c', hex);
  $('#toolTitle').textContent = ROLE_LABEL[ed.role] + 'の色';
  if (document.activeElement !== $('#hexInput')) $('#hexInput').value = hex;
  $('#sv').style.setProperty('--hue', `hsl(${h} 100% 50%)`);
  const rad = h * Math.PI / 180, mid = 43;
  Object.assign($('#hueKnob').style, { left: 50 + mid * Math.cos(rad) + '%', top: 50 - mid * Math.sin(rad) + '%', background: hsvToHex(h, 100, 100) });
  $('#hueKnob').style.background = hex;
  Object.assign($('#svKnob').style, { left: 26 + 48 * s / 100 + '%', top: 26 + 48 * (1 - v / 100) + '%' });
  const tracks = {
    h: 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)',
    s: `linear-gradient(to right,${hsvToHex(h, 0, v)},${hsvToHex(h, 100, v)})`,
    v: `linear-gradient(to right,#000,${hsvToHex(h, s, 100)})`,
  };
  ['h', 's', 'v'].forEach(k => {
    const r = $('#r-' + k), n = $('#n-' + k);
    r.value = ed.hsv[k]; r.style.setProperty('--track', tracks[k]);
    if (document.activeElement !== n) n.value = ed.hsv[k];
  });
}
function selectRole(k, animate) {
  ed.role = k;
  ed.hsv = hexToHsv(ed.colors[k]);
  app.querySelectorAll('.well').forEach(w => { const on = w.dataset.role === k; w.classList.toggle('sel', on); w.setAttribute('aria-checked', on); });
  app.querySelectorAll('[data-label]').forEach(l => l.classList.toggle('sel', l.dataset.label === k));
  syncTool();
  if (animate) animScoop(wellTarget(k), 320);
}

// ----- scoop / geometry helpers -----
function rel(el) {
  const b = app.querySelector('#bench').getBoundingClientRect(), r = el.getBoundingClientRect();
  return { x: (r.left - b.left) / K, y: (r.top - b.top) / K, w: r.width / K, h: r.height / K };
}
function wellTarget(k) {
  const r = rel(app.querySelector(`.well[data-role="${k}"]`));
  return { x: r.x + r.w / 2 + 6, y: r.y + r.h / 2 - 2, a: -28 };
}
const scoopT = p => `translate(${p.x - 34}px, ${p.y - 22}px) rotate(${p.a}deg)`;
function placeScoop(p) { scoopPos = p; const s = app.querySelector('#scoop'); if (s) s.style.transform = scoopT(p); }
function animScoop(p, dur, easing = 'ease-in-out') {
  const s = app.querySelector('#scoop');
  if (!s) return Promise.resolve();
  const from = scoopT(scoopPos);
  scoopPos = p;
  s.style.transform = scoopT(p);
  return s.animate([{ transform: from }, { transform: scoopT(p) }], { duration: dur * SPEED, easing }).finished.catch(() => {});
}
window.addEventListener('resize', () => {
  if (busy) return;
  if (view === 'shelf' && shelfCols() !== shelfColsNow) { renderShelf(); return; }
  fit();
  if (view === 'editor') placeScoop(wellTarget(ed.role));
});

// ----- 完成演出 -----
async function fillAndFinish() {
  if (busy) return;
  busy = true;
  const bench = app.querySelector('#bench');
  bench.classList.add('busy');
  document.activeElement && document.activeElement.blur();
  await wait(250 * SPEED);

  const c = { ...ed.colors };
  const stage = app.querySelector('#stage');
  stage.innerHTML = bottleSVG(c, { cork: false, ribbon: false, glitter: false, guides: true, cls: 'edit-bottle' });
  const svg = stage.querySelector('svg');
  const stream = app.querySelector('#stream');
  const scoopSand = app.querySelector('#scoopSand');
  const r = rel(svg), s = r.w / 80;
  const mouth = { x: r.x + 40 * s, y: r.y + 15 * s };

  // 下の層から：アクセント → メイン → ベース
  for (const [k, dur] of [['accent', 650], ['main', 950], ['base', 1500]]) {
    selectRole(k, false);
    const w = wellTarget(k);
    await animScoop(w, 420);
    await animScoop({ ...w, y: w.y + 6 }, 150, 'ease-in');
    scoopSand.setAttribute('fill', c[k]);
    await animScoop(w, 170, 'ease-out');
    // 傾けたときの匙の縁（砂がこぼれる点）が瓶の口の真上に来る位置
    const pour = { x: mouth.x + 5, y: mouth.y - 34, a: -28 };
    await animScoop(pour, 560);
    await animScoop({ ...pour, a: -100 }, 260);

    const top = mouth.y - 13;
    const [ly, lh] = LAYERS[k];
    const fromY = r.y + (ly + lh) * s, toY = r.y + ly * s;
    Object.assign(stream.style, { left: (mouth.x - 2) + 'px', top: top + 'px', background: c[k] });
    const sa = stream.animate(
      [{ height: (fromY - top) + 'px', opacity: 1 }, { height: (toY - top) + 'px', opacity: 1 }],
      { duration: dur * SPEED, easing: 'linear', fill: 'forwards' });
    const la = svg.querySelector('.sand-' + k).animate(
      [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
      { duration: dur * SPEED, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' });
    await la.finished;
    scoopSand.setAttribute('fill', 'transparent');
    sa.cancel();
    stream.style.opacity = 0; stream.style.height = 0;
    await animScoop(pour, 220);
  }
  svg.querySelector('.guides') && svg.querySelector('.guides').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 * SPEED, fill: 'forwards' });

  // スコップを皿に戻す
  selectRole('base', false);
  animScoop(wellTarget('base'), 520);

  // コルクを閉める
  const corkAside = app.querySelector('#corkAside');
  const cr = rel(corkAside);
  const dx = r.x + 25 * s - cr.x, dy = r.y - cr.y;
  await corkAside.animate([
    { transform: 'translate(0,0)' },
    { transform: `translate(${dx * .5}px, ${dy - 46}px)`, offset: .55 },
    { transform: `translate(${dx}px, ${dy}px)` },
  ], { duration: 700 * SPEED, easing: 'ease-in-out', fill: 'forwards' }).finished;
  corkAside.style.visibility = 'hidden';
  svg.querySelector('.cork').style.opacity = 1;

  // リボン（アクセント色）→ きらめき
  const rib = svg.querySelector('.ribbon');
  rib.style.opacity = 1;
  rib.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380 * SPEED });
  await wait(260 * SPEED);
  const gl = svg.querySelector('.glitter');
  gl.style.opacity = 1;
  gl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 * SPEED });

  // キラキラ（この瓶の3色だけ）
  const spots = [
    [-18, .30, 16, c.base], [r.w + 14, .18, 14, c.accent], [r.w + 4, .62, 10, c.main],
    [-6, .78, 9, c.accent], [r.w / 2 + 52, -.02, 8, c.main], [r.w / 2 - 58, .06, 7, c.base],
  ];
  spots.forEach(([ox, oy, size, col], i) => {
    const el = document.createElement('div');
    el.className = 'burst';
    el.style.left = (r.x + ox) + 'px';
    el.style.top = (r.y + r.h * oy) + 'px';
    el.innerHTML = `<svg width="${size * 2}" height="${size * 2}" viewBox="0 0 ${size * 2} ${size * 2}">${star4(size, size, size, col)}</svg>`;
    bench.appendChild(el);
    el.animate([
      { transform: 'translate(-50%,-50%) scale(0) rotate(-30deg)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.35) rotate(0deg)', opacity: 1, offset: .6 },
      { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1 },
    ], { duration: 520 * SPEED, delay: i * 70 * SPEED, fill: 'backwards', easing: 'ease-out' });
  });

  // 完成！
  const badge = document.createElement('div');
  badge.className = 'done-badge';
  badge.textContent = '完成！';
  bench.appendChild(badge);
  badge.animate([
    { transform: 'translateX(-50%) scale(.6)', opacity: 0 },
    { transform: 'translateX(-50%) scale(1.08)', opacity: 1, offset: .7 },
    { transform: 'translateX(-50%) scale(1)', opacity: 1 },
  ], { duration: 420 * SPEED, easing: 'ease-out' });

  commit();
  await wait(1500 * SPEED + 400);
  location.replace(location.pathname + location.search + '#/bottle/' + ed.id);
}

function commit() {
  const name = (ed.name || '').trim() || '名前のない瓶';
  if (ed.id && findBottle(ed.id)) {
    const b = findBottle(ed.id);
    b.name = name; b.colors = { ...ed.colors };
  } else {
    ed.id = newId();
    bottles.push({ id: ed.id, name, colors: { ...ed.colors } });
  }
  persist();
}

// ---------------- router ----------------
function route() {
  const h = location.hash || '#/';
  let m;
  if ((m = h.match(/^#\/bottle\/(.+)$/))) renderDetail(decodeURIComponent(m[1]));
  else if (h === '#/new') renderEditor(null);
  else if ((m = h.match(/^#\/edit\/(.+)$/))) renderEditor(decodeURIComponent(m[1]));
  else renderShelf();
}
window.addEventListener('hashchange', route);
route();
})();

'use strict';
/* ---------- helpers ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) { if (kid == null) continue; e.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
  return e;
}
const SVGNS = 'http://www.w3.org/2000/svg';
function s(tag, attrs, text) {
  const e = document.createElementNS(SVGNS, tag);
  if (attrs) for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  return e;
}
const bin = (n, w) => n.toString(2).padStart(w || 8, '0');
const hex = (n, w) => n.toString(16).toUpperCase().padStart(w || 2, '0');
const nib = str => str.replace(/(?=(?:.{4})+$)/g, ' ').trim();
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[rnd(0, arr.length - 1)];
const ones = n => { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; };
const num = n => n.toLocaleString('en-GB');
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
function fmtBytes(bytes) {
  if (bytes < 1024) return num(Math.round(bytes * 100) / 100) + ' bytes';
  if (bytes < 1024 * 1024) return num(Math.round(bytes / 1024 * 100) / 100) + ' KiB';
  return num(Math.round(bytes / 1048576 * 100) / 100) + ' MiB';
}
const store = {
  get(k, d) { try { const v = localStorage.getItem('bitbybit:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('bitbybit:' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
};
const redrawers = [];

/* segmented control: buttons with data-v, aria-pressed marks the choice */
function seg(root, onChange) {
  root.addEventListener('click', e => {
    const b = e.target.closest('button[data-v]'); if (!b) return;
    $$('button', root).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    onChange(b.dataset.v);
  });
  return () => { const b = $('button[aria-pressed="true"]', root); return b ? b.dataset.v : null; };
}

/* a row of bit switches */
function bitBoard(root, opts) {
  const bits = opts.bits || 8;
  root.style.setProperty('--n', bits);
  const btns = [];
  for (let i = bits - 1; i >= 0; i--) {
    const pv = 1 << i, idx = bits - 1 - i;
    const label = opts.labels ? opts.labels[idx] : pv;
    const b = h('button', { type: 'button', class: 'bit' + (opts.classes && opts.classes[idx] ? ' ' + opts.classes[idx] : ''), 'aria-pressed': 'false', 'aria-label': (opts.names ? opts.names[idx] : 'Bit worth ' + pv) });
    b.addEventListener('click', () => { if (opts.onClick) opts.onClick(pv, idx); else api.set(api.value ^ pv); });
    root.append(h('div', { class: 'bitcol' }, opts.places === false ? null : h('span', { class: 'pv', text: label }), b));
    btns.push({ b, pv });
  }
  const api = {
    value: 0, btns,
    set(v, silent) {
      api.value = v;
      btns.forEach(({ b, pv }) => { const on = (v & pv) !== 0; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = on ? '1' : '0'; });
      if (!silent && opts.onChange) opts.onChange(v);
    }
  };
  api.set(opts.value || 0, true);
  return api;
}

/* ---------- progress ---------- */
const TARGET = 5;
function showProgress() {
  $$('[data-progress]').forEach(el => {
    const n = store.get('p:' + el.dataset.progress, 0);
    el.textContent = n ? (n >= TARGET ? 'Done' : n + '/' + TARGET) : '';
    el.classList.toggle('done', n >= TARGET);
  });
}

/* ---------- quiz ---------- */
const normAns = v => String(v).replace(/[\s,]+/g, '').toUpperCase().replace(/^0+(?=.)/, '');
function makeQuiz(root, key, gens) {
  let q = null, last = -1, correct = 0, attempts = 0, locked = false;
  const score = h('div', { class: 'score' });
  const meter = h('div', { class: 'meter', 'aria-hidden': 'true' });
  const qEl = h('div', { class: 'q' });
  const ansEl = h('div');
  const fb = h('div', { class: 'msg', 'aria-live': 'polite' });
  const work = h('div', { class: 'work' });
  const next = h('button', { class: 'btn primary', type: 'button', text: 'Next question', onclick: ask });
  const nextRow = h('div', { class: 'row' }, next);
  root.append(h('div', { class: 'row' }, meter, score), qEl, ansEl, fb, work, nextRow);

  function paintScore() {
    const best = Math.max(store.get('p:' + key, 0), Math.min(correct, TARGET));
    store.set('p:' + key, best);
    meter.replaceChildren(...Array.from({ length: TARGET }, (_, i) => h('i', { class: i < best ? 'f' : '' })));
    score.textContent = best >= TARGET ? 'Topic challenge complete. Keep going for practice. Correct this visit: ' + correct : best + ' of ' + TARGET + ' correct. Get ' + TARGET + ' right to complete this topic.';
    showProgress();
  }
  function finish(ok, text) {
    locked = true;
    fb.className = 'msg ' + (ok ? 'good' : 'bad'); fb.textContent = text;
    work.hidden = !q.work; work.innerHTML = q.work || '';
    nextRow.hidden = false;
    if (ok) correct++;
    paintScore();
  }
  function ask() {
    let i; do { i = rnd(0, gens.length - 1); } while (gens.length > 1 && i === last);
    last = i; q = gens[i](); attempts = 0; locked = false;
    qEl.innerHTML = q.html;
    fb.className = 'msg'; fb.textContent = ''; work.hidden = true; nextRow.hidden = true;
    if (q.type === 'mcq') {
      const opts = h('div', { class: 'opts' });
      q.options.forEach((o, n) => opts.append(h('button', {
        class: 'btn', type: 'button', html: o, onclick(e) {
          if (locked) return;
          const ok = n === q.answer;
          e.currentTarget.classList.add(ok ? 'picked-right' : 'picked-wrong');
          if (!ok) opts.children[q.answer].classList.add('picked-right');
          $$('button', opts).forEach(b => { b.disabled = true; });
          finish(ok, ok ? 'Correct.' : 'Not this time. The right answer is highlighted.');
        }
      })));
      ansEl.replaceChildren(opts);
    } else {
      const inp = h('input', { type: 'text', id: 'ans-' + key, autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Your answer', placeholder: q.placeholder || 'Your answer' });
      const btn = h('button', { class: 'btn primary', type: 'submit', text: 'Check' });
      const form = h('form', null, inp, btn);
      form.addEventListener('submit', e => {
        e.preventDefault();
        if (locked || !inp.value.trim()) return;
        const norm = q.norm || normAns;
        const ok = norm(inp.value) === norm(q.answer);
        attempts++;
        if (ok) { inp.disabled = btn.disabled = true; finish(true, 'Correct.'); }
        else if (attempts < 2) { fb.className = 'msg warn'; fb.textContent = 'Not yet. ' + (q.hint || 'Check your working and try once more.'); inp.select(); }
        else { inp.disabled = btn.disabled = true; finish(false, 'The answer is ' + q.answer + '.'); }
      });
      ansEl.replaceChildren(form);
    }
  }
  ask(); paintScore();
}

/* ---------- navigation ---------- */
const VIEWS = ['start', 'numbers', 'data', 'errors', 'logic', 'cpu'];
const inited = {};
const INIT = {};
function go(view, keepScroll) {
  if (VIEWS.indexOf(view) < 0) view = 'start';
  $$('.view').forEach(v => { v.hidden = v.dataset.view !== view; });
  $$('.tabs a').forEach(a => {
    const on = a.dataset.go === view;
    if (on) { a.setAttribute('aria-current', 'page'); if (a.scrollIntoView) a.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    else a.removeAttribute('aria-current');
  });
  if (!inited[view] && INIT[view]) {
    inited[view] = true;
    try { INIT[view](); } catch (err) { console.error('init ' + view, err); }
  }
  store.set('view', view);
  try { history.replaceState(null, '', '#' + view); } catch (e) { /* sandboxed frame */ }
  if (!keepScroll) window.scrollTo(0, 0);
}
document.addEventListener('click', e => {
  const a = e.target.closest('[data-go]');
  if (a) { e.preventDefault(); go(a.dataset.go); }
});
window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (VIEWS.indexOf(v) >= 0 && $('.view[data-view="' + v + '"]').hidden) go(v); });

function buildOutlines() {
  $$('.topic').forEach(topic => {
    const nav = $('.outline', topic); if (!nav) return;
    nav.append(h('span', { class: 'eyebrow', text: 'In this topic' }));
    const btns = [];
    $$('.lesson', topic).forEach(lesson => {
      const b = h('button', { type: 'button', text: lesson.dataset.short || $('h3', lesson).textContent });
      b.addEventListener('click', () => {
        const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
        lesson.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      });
      nav.append(b); btns.push([lesson, b]);
    });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting) btns.forEach(([l, b]) => b.classList.toggle('here', l === en.target)); });
      }, { rootMargin: '-30% 0px -60% 0px' });
      btns.forEach(([l]) => io.observe(l));
    }
  });
}
function watchLayout() {
  const head = $('#site-head');
  const set = () => document.documentElement.style.setProperty('--header-h', head.offsetHeight + 'px');
  set();
  if ('ResizeObserver' in window) new ResizeObserver(set).observe(head); else window.addEventListener('resize', set);
  const redraw = () => redrawers.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
  if (window.matchMedia) { const mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', redraw); }
  if ('MutationObserver' in window) new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

/* ---------- start page ---------- */
INIT.start = function () {
  const out = { bin: $('#hero-bin'), den: $('#hero-den'), hex: $('#hero-hex'), chr: $('#hero-chr') };
  const show = v => {
    out.bin.textContent = nib(bin(v)); out.den.textContent = v; out.hex.textContent = hex(v);
    out.chr.textContent = v >= 33 && v <= 126 ? String.fromCharCode(v) : (v === 32 ? 'space' : 'none');
  };
  const board = bitBoard($('#hero-board'), { value: 65, onChange: show });
  show(board.value);
};

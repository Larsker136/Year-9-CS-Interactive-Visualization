'use strict';
/* ---------- 4 logic gates ---------- */
const GATE = {
  AND: (a, b) => a & b, OR: (a, b) => a | b, NOT: a => a ^ 1,
  NAND: (a, b) => (a & b) ^ 1, NOR: (a, b) => (a | b) ^ 1, XOR: (a, b) => a ^ b
};
const GATE_NAMES = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR'];
/* geometry for one gate symbol centred on x,y */
function gateShape(type, x, y) {
  const base = { NAND: 'AND', NOR: 'OR' }[type] || type;
  const l = x - 30, t = y - 22, b = y + 22;
  let d, extra = null, tip, pinX;
  if (base === 'AND') { d = 'M' + l + ',' + t + ' H' + x + ' A22,22 0 0 1 ' + x + ',' + b + ' H' + l + ' Z'; tip = x + 22; pinX = l; }
  else if (base === 'NOT') { d = 'M' + (l + 4) + ',' + (y - 19) + ' L' + (x + 16) + ',' + y + ' L' + (l + 4) + ',' + (y + 19) + ' Z'; tip = x + 16; pinX = l + 4; }
  else {
    d = 'M' + l + ',' + t + ' Q' + (l + 15) + ',' + y + ' ' + l + ',' + b + ' Q' + (x + 8) + ',' + b + ' ' + (x + 24) + ',' + y + ' Q' + (x + 8) + ',' + t + ' ' + l + ',' + t + ' Z';
    tip = x + 24; pinX = l + 5;
    if (base === 'XOR') extra = 'M' + (l - 8) + ',' + t + ' Q' + (l + 7) + ',' + y + ' ' + (l - 8) + ',' + b;
  }
  const bubble = type === 'NOT' || type === 'NAND' || type === 'NOR' ? { cx: tip + 5, cy: y } : null;
  return { d, extra, bubble, out: { x: bubble ? tip + 10 : tip, y }, pins: type === 'NOT' ? [{ x: pinX, y }] : [{ x: pinX, y: y - 11 }, { x: pinX, y: y + 11 }] };
}
function drawGate(parent, type, x, y) {
  const g = gateShape(type, x, y);
  parent.append(s('path', { class: 'gate', d: g.d }));
  if (g.extra) parent.append(s('path', { class: 'gate-x', d: g.extra }));
  if (g.bubble) parent.append(s('circle', { class: 'gate', cx: g.bubble.cx, cy: g.bubble.cy, r: 5 }));
  return g;
}
/* interactive circuit: def = {inputs:[{id,x,y}], gates:[{id,type,x,y,in:[ids],mx:[..]}], outputs:[{id,from,x,y}], dots:[[x,y,srcId]]} */
function circuit(svg, def, onChange) {
  svg.replaceChildren();
  const val = {}; def.inputs.forEach(i => { val[i.id] = 0; });
  const wires = [], switches = [], lamps = [], dots = [];
  const shapes = {}, srcPt = {};
  def.inputs.forEach(i => { srcPt[i.id] = { x: i.x + 16, y: i.y }; });
  def.gates.forEach(g => { shapes[g.id] = gateShape(g.type, g.x, g.y); srcPt[g.id] = shapes[g.id].out; });
  const wireLayer = s('g'); svg.append(wireLayer);
  def.gates.forEach(g => g.in.forEach((src, k) => {
    const a = srcPt[src], p = shapes[g.id].pins[k], mx = g.mx && g.mx[k] != null ? g.mx[k] : Math.round((a.x + p.x) / 2);
    const el = s('path', { class: 'wire', d: 'M' + a.x + ',' + a.y + ' H' + mx + ' V' + p.y + ' H' + (p.x + 1) });
    wireLayer.append(el); wires.push([src, el]);
  }));
  def.outputs.forEach(o => {
    const a = srcPt[o.from]; const el = s('path', { class: 'wire', d: 'M' + a.x + ',' + a.y + ' H' + (o.x - 15) });
    wireLayer.append(el); wires.push([o.from, el]);
  });
  (def.dots || []).forEach(d => { const el = s('circle', { class: 'dot', cx: d[0], cy: d[1], r: 5 }); wireLayer.append(el); dots.push([d[2], el]); });
  def.gates.forEach(g => {
    drawGate(svg, g.type, g.x, g.y);
    svg.append(s('text', { class: 'glabel', x: g.x - 4, y: g.y + 40, 'text-anchor': 'middle' }, g.type));
  });
  def.inputs.forEach(i => {
    const grp = s('g', { class: 'sw', role: 'switch', tabindex: 0, 'aria-checked': 'false', 'aria-label': 'Input ' + i.id });
    const txt = s('text', { class: 'val', x: i.x, y: i.y + 5, 'text-anchor': 'middle' }, '0');
    grp.append(s('circle', { cx: i.x, cy: i.y, r: 16 }), txt);
    const flip = () => { val[i.id] ^= 1; update(); if (onChange) onChange(api); };
    grp.addEventListener('click', flip);
    grp.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } });
    svg.append(s('text', { x: i.x - 30, y: i.y + 5, 'text-anchor': 'middle' }, i.id), grp);
    switches.push([i.id, grp, txt]);
  });
  def.outputs.forEach(o => {
    const grp = s('g', { class: 'lamp' }), txt = s('text', { class: 'val', x: o.x, y: o.y + 5, 'text-anchor': 'middle' }, '0');
    grp.append(s('circle', { cx: o.x, cy: o.y, r: 15 }), txt);
    svg.append(grp, s('text', { x: o.x + 28, y: o.y + 5, 'text-anchor': 'middle' }, o.id));
    lamps.push([o, grp, txt]);
  });
  function evaluate(inputs) {
    const v = Object.assign({}, inputs);
    def.gates.forEach(g => { v[g.id] = GATE[g.type].apply(null, g.in.map(k => v[k])); });
    def.outputs.forEach(o => { v[o.id] = v[o.from]; });
    return v;
  }
  function update() {
    const v = evaluate(val);
    wires.forEach(([src, el]) => el.classList.toggle('hot', v[src] === 1));
    dots.forEach(([src, el]) => el.classList.toggle('hot', v[src] === 1));
    switches.forEach(([id, grp, txt]) => { grp.classList.toggle('hot', v[id] === 1); grp.setAttribute('aria-checked', v[id] ? 'true' : 'false'); txt.textContent = v[id]; });
    lamps.forEach(([o, grp, txt]) => { grp.classList.toggle('hot', v[o.id] === 1); txt.textContent = v[o.id]; });
  }
  const api = { evaluate, values: () => evaluate(val), inputs: () => Object.assign({}, val) };
  update();
  return api;
}

INIT.logic = function () {
  /* 4.1 gate explorer */
  (function () {
    const INFO = {
      AND: ['The output is 1 only when input A <strong>and</strong> input B are both 1.', 'A bank vault that opens only when two managers turn their keys at the same time.', 'X = A AND B'],
      OR: ['The output is 1 when input A <strong>or</strong> input B is 1, or both are.', 'A doorbell that rings when the front button or the back button is pressed.', 'X = A OR B'],
      NOT: ['It has one input, and the output is always the opposite. 1 becomes 0 and 0 becomes 1. It is also called an inverter.', 'A fridge light: the light is on when the door is not closed.', 'X = NOT A'],
      NAND: ['Short for "not AND". It gives the opposite of an AND gate, so the output is 0 only when both inputs are 1.', 'A warning light that stays on until both car doors are shut.', 'X = A NAND B'],
      NOR: ['Short for "not OR". It gives the opposite of an OR gate, so the output is 1 only when both inputs are 0.', 'A "room empty" sign that lights only when neither of two motion sensors detects anyone.', 'X = A NOR B'],
      XOR: ['Short for "exclusive OR". The output is 1 when the two inputs are <strong>different</strong>, and 0 when they are the same.', 'A stair light with a switch at the top and one at the bottom: flipping either switch changes the light.', 'X = A XOR B']
    };
    const svg = $('#gate-svg'), desc = $('#gate-desc'), tt = $('#gate-tt');
    let type = 'AND', cir;
    function table() {
      const v = cir.inputs(), one = type === 'NOT';
      const rows = one ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
      tt.innerHTML = '<thead><tr><th>A</th>' + (one ? '' : '<th>B</th>') + '<th>Output X</th></tr></thead><tbody>' + rows.map(r => {
        const now = r[0] === v.A && (one || r[1] === v.B);
        return '<tr class="' + (now ? 'now' : '') + '"><td>' + r.join('</td><td>') + '</td><td class="out">' + GATE[type].apply(null, r) + '</td></tr>';
      }).join('') + '</tbody>';
    }
    function build() {
      const one = type === 'NOT';
      cir = circuit(svg, {
        inputs: one ? [{ id: 'A', x: 60, y: 70 }] : [{ id: 'A', x: 60, y: 42 }, { id: 'B', x: 60, y: 98 }],
        gates: [{ id: 'g', type, x: 180, y: 70, in: one ? ['A'] : ['A', 'B'], mx: [112, 112] }],
        outputs: [{ id: 'X', from: 'g', x: 280, y: 70 }]
      }, table);
      desc.innerHTML = '<h4>' + type + ' gate</h4><p>' + INFO[type][0] + '</p><p class="hint">Everyday example: ' + INFO[type][1] + '</p><p class="expr">' + INFO[type][2] + '</p>';
      table();
    }
    seg($('#gate-seg'), v => { type = v; build(); });
    build();
  })();

  /* 4.2 compare all gates */
  (function () {
    const a = $('#cmp-a'), b = $('#cmp-b'), grid = $('#cmp-grid'); const val = { a: 0, b: 0 }, lamps = {};
    GATE_NAMES.forEach(t => {
      const svg = s('svg', { viewBox: '0 0 100 56', class: 'cir', 'aria-hidden': 'true' });
      const g = gateShape(t, 50, 28);
      g.pins.forEach(p => svg.append(s('path', { class: 'wire', d: 'M6,' + p.y + ' H' + (p.x + 1) })));
      svg.append(s('path', { class: 'wire', d: 'M' + g.out.x + ',28 H96' }));
      drawGate(svg, t, 50, 28);
      const lamp = h('span', { class: 'lampdot', text: '0' }); lamps[t] = lamp;
      grid.append(h('div', null, svg, h('span', { class: 'name', text: t }), lamp));
    });
    function show() {
      a.textContent = val.a; b.textContent = val.b; a.setAttribute('aria-pressed', val.a ? 'true' : 'false'); b.setAttribute('aria-pressed', val.b ? 'true' : 'false');
      GATE_NAMES.forEach(t => { const o = t === 'NOT' ? GATE.NOT(val.a) : GATE[t](val.a, val.b); lamps[t].textContent = o; lamps[t].classList.toggle('hot', o === 1); lamps[t].setAttribute('aria-label', t + ' output ' + o); });
    }
    a.addEventListener('click', () => { val.a ^= 1; show(); }); b.addEventListener('click', () => { val.b ^= 1; show(); });
    show();
  })();

  /* complete a truth table */
  (function () {
    const SETS = [
      ['X = A AND B', 2, v => v[0] & v[1]], ['X = A OR B', 2, v => v[0] | v[1]], ['X = A NAND B', 2, v => (v[0] & v[1]) ^ 1],
      ['X = A NOR B', 2, v => (v[0] | v[1]) ^ 1], ['X = A XOR B', 2, v => v[0] ^ v[1]], ['X = (NOT A) AND B', 2, v => (v[0] ^ 1) & v[1]],
      ['X = A OR (NOT B)', 2, v => v[0] | (v[1] ^ 1)], ['X = (A AND B) OR C', 3, v => (v[0] & v[1]) | v[2]], ['X = A AND (B XOR C)', 3, v => v[0] & (v[1] ^ v[2])],
      ['X = NOT (A OR B)', 2, v => (v[0] | v[1]) ^ 1]
    ];
    const title = $('#ttf-title'), table = $('#ttf-table'), msg = $('#ttf-msg');
    let cur = -1, cells = [];
    function make() {
      let i; do { i = rnd(0, SETS.length - 1); } while (i === cur); cur = i;
      const [name, n, fn] = SETS[cur];
      title.textContent = name; msg.className = 'msg'; msg.textContent = ''; cells = [];
      const head = h('tr', null, ['A', 'B', 'C'].slice(0, n).map(x => h('th', { text: x })), h('th', { text: 'X' }));
      const body = [];
      for (let r = 0; r < (1 << n); r++) {
        const v = bin(r, n).split('').map(Number);
        const btn = h('button', { type: 'button', class: 'cellbtn', text: '?', 'aria-label': 'Output for inputs ' + v.join(' ') });
        btn.addEventListener('click', () => { btn.textContent = btn.textContent === '1' ? '0' : '1'; btn.className = 'cellbtn'; });
        cells.push([btn, fn(v)]);
        body.push(h('tr', null, v.map(x => h('td', { text: x })), h('td', null, btn)));
      }
      table.replaceChildren(h('thead', null, head), h('tbody', null, body));
    }
    $('#ttf-check').addEventListener('click', () => {
      if (cells.some(c => c[0].textContent === '?')) { msg.className = 'msg warn'; msg.textContent = 'Fill in every row first.'; return; }
      let wrong = 0; cells.forEach(([b, ans]) => { const ok = +b.textContent === ans; b.className = 'cellbtn ' + (ok ? 'right' : 'wrong'); if (!ok) wrong++; });
      msg.className = 'msg ' + (wrong ? 'warn' : 'good');
      msg.textContent = wrong ? wrong + ' row' + (wrong === 1 ? ' is' : 's are') + ' not right yet. Change the red ones and check again.' : 'Every row is correct.';
    });
    $('#ttf-new').addEventListener('click', make);
    make();
  })();

  /* 4.3 circuits */
  (function () {
    const CIRCUITS = [
      { name: 'Seat-belt buzzer', story: 'A car buzzer sounds when the engine is on (A) and the seat belt is not fastened (B = 1 means fastened).', expr: 'X = A AND (NOT B)',
        cols: [['n', 'NOT B']],
        def: { inputs: [{ id: 'A', x: 60, y: 60 }, { id: 'B', x: 60, y: 150 }], gates: [{ id: 'n', type: 'NOT', x: 210, y: 150, in: ['B'] }, { id: 'g', type: 'AND', x: 370, y: 105, in: ['A', 'n'], mx: [290, 290] }], outputs: [{ id: 'X', from: 'g', x: 490, y: 105 }] } },
      { name: 'Security light', story: 'A security light comes on when it is dark (A) and either movement is detected (B) or the manual switch is on (C).', expr: 'X = A AND (B OR C)',
        cols: [['o', 'B OR C']],
        def: { inputs: [{ id: 'A', x: 60, y: 45 }, { id: 'B', x: 60, y: 120 }, { id: 'C', x: 60, y: 180 }], gates: [{ id: 'o', type: 'OR', x: 220, y: 150, in: ['B', 'C'], mx: [130, 130] }, { id: 'g', type: 'AND', x: 390, y: 100, in: ['A', 'o'], mx: [310, 310] }], outputs: [{ id: 'X', from: 'g', x: 500, y: 100 }] } },
      { name: 'Half adder', story: 'This circuit adds two bits. S is the sum bit and C is the carry bit, which is needed when 1 + 1 gives a two-bit answer.', expr: 'S = A XOR B,   C = A AND B',
        cols: [],
        def: { inputs: [{ id: 'A', x: 60, y: 60 }, { id: 'B', x: 60, y: 160 }], gates: [{ id: 'x', type: 'XOR', x: 320, y: 60, in: ['A', 'B'], mx: [150, 210] }, { id: 'a', type: 'AND', x: 320, y: 160, in: ['A', 'B'], mx: [150, 210] }], outputs: [{ id: 'S', from: 'x', x: 480, y: 60 }, { id: 'C', from: 'a', x: 480, y: 160 }], dots: [[150, 60, 'A'], [210, 160, 'B']] } }
    ];
    const segEl = $('#cir-seg'), svg = $('#cir-svg'), story = $('#cir-story'), expr = $('#cir-expr'), tt = $('#cir-tt');
    CIRCUITS.forEach((c, i) => segEl.append(h('button', { type: 'button', 'data-v': i, 'aria-pressed': i === 0 ? 'true' : 'false', text: c.name })));
    let cur, cir;
    function table() {
      const ins = cur.def.inputs.map(i => i.id), outs = cur.def.outputs.map(o => o.id), now = cir.inputs();
      let html = '<thead><tr>' + ins.map(i => '<th>' + i + '</th>').join('') + cur.cols.map(c => '<th>' + c[1] + '</th>').join('') + outs.map(o => '<th>' + o + '</th>').join('') + '</tr></thead><tbody>';
      for (let r = 0; r < (1 << ins.length); r++) {
        const bits = bin(r, ins.length).split('').map(Number), inp = {}; ins.forEach((id, k) => { inp[id] = bits[k]; });
        const v = cir.evaluate(inp), isNow = ins.every(id => now[id] === inp[id]);
        html += '<tr class="' + (isNow ? 'now' : '') + '">' + bits.map(b => '<td>' + b + '</td>').join('') + cur.cols.map(c => '<td>' + v[c[0]] + '</td>').join('') + outs.map(o => '<td class="out">' + v[o] + '</td>').join('') + '</tr>';
      }
      tt.innerHTML = html + '</tbody>';
    }
    function load(i) { cur = CIRCUITS[i]; story.textContent = cur.story; expr.textContent = cur.expr; cir = circuit(svg, cur.def, table); table(); }
    seg(segEl, v => load(+v)); load(0);
  })();

  /* 4.4 challenge */
  const concept = [
    ['How many rows does a truth table need for a circuit with 3 inputs?', ['8', '3', '6', '9'], 0, 'Each input doubles the number of rows: 2 × 2 × 2 = 8.'],
    ['Which gate has only one input?', ['NOT', 'AND', 'XOR', 'NOR'], 0, 'A NOT gate inverts a single input.'],
    ['Which gate gives an output of 1 only when its two inputs are different?', ['XOR', 'OR', 'NAND', 'AND'], 0, 'XOR means one or the other, but not both.'],
    ['What does the small circle on the output of a NAND or NOR symbol mean?', ['The output is inverted', 'The gate has a third input', 'The output is always 1', 'The gate is switched off'], 0, 'The circle stands for NOT.']
  ];
  const twoIn = ['AND', 'OR', 'NAND', 'NOR', 'XOR'];
  makeQuiz($('#quiz-logic'), 'logic', [
    () => { const t = pick(twoIn), a = rnd(0, 1), b = rnd(0, 1), o = GATE[t](a, b); return { type: 'mcq', html: 'A <strong>' + t + '</strong> gate has inputs <span class="mono">A = ' + a + '</span> and <span class="mono">B = ' + b + '</span>. What is the output?', options: ['0', '1'], answer: o, work: '<span>' + a + ' ' + t + ' ' + b + ' = ' + o + '</span>' }; },
    () => {
      const t = pick(twoIn), rows = [[0, 0], [0, 1], [1, 0], [1, 1]];
      const tbl = '<div class="scroll-x"><table class="t"><thead><tr><th>A</th><th>B</th><th>X</th></tr></thead><tbody>' + rows.map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td class="out">' + GATE[t](r[0], r[1]) + '</td></tr>').join('') + '</tbody></table></div>';
      const opts = twoIn.slice().sort(() => Math.random() - .5);
      return { type: 'mcq', html: 'Which gate has this truth table?' + tbl, options: opts, answer: opts.indexOf(t), work: '<span>The output column ' + rows.map(r => GATE[t](r[0], r[1])).join(', ') + ' belongs to ' + t + '.</span>' };
    },
    () => {
      const E = pick([
        ['(A AND B) OR C', v => (v.A & v.B) | v.C, v => 'A AND B = ' + (v.A & v.B) + ', then ' + (v.A & v.B) + ' OR ' + v.C],
        ['A AND (NOT B)', v => v.A & (v.B ^ 1), v => 'NOT B = ' + (v.B ^ 1) + ', then ' + v.A + ' AND ' + (v.B ^ 1)],
        ['(A OR B) AND (NOT C)', v => (v.A | v.B) & (v.C ^ 1), v => 'A OR B = ' + (v.A | v.B) + ', NOT C = ' + (v.C ^ 1) + ', then ' + (v.A | v.B) + ' AND ' + (v.C ^ 1)],
        ['(A XOR B) OR C', v => (v.A ^ v.B) | v.C, v => 'A XOR B = ' + (v.A ^ v.B) + ', then ' + (v.A ^ v.B) + ' OR ' + v.C],
        ['NOT (A AND B)', v => (v.A & v.B) ^ 1, v => 'A AND B = ' + (v.A & v.B) + ', then NOT ' + (v.A & v.B)],
        ['(A NOR B) AND C', v => ((v.A | v.B) ^ 1) & v.C, v => 'A NOR B = ' + ((v.A | v.B) ^ 1) + ', then ' + ((v.A | v.B) ^ 1) + ' AND ' + v.C]
      ]);
      const v = { A: rnd(0, 1), B: rnd(0, 1), C: rnd(0, 1) }, o = E[1](v), usesC = E[0].indexOf('C') >= 0;
      return { type: 'mcq', html: 'Work out <span class="mono">X = ' + E[0] + '</span> when <span class="mono">A = ' + v.A + ', B = ' + v.B + (usesC ? ', C = ' + v.C : '') + '</span>.', options: ['X = 0', 'X = 1'], answer: o, work: '<span>' + E[2](v) + ' = ' + o + '</span>' };
    },
    () => mcq(pick(concept))
  ]);
};

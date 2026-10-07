'use strict';
/* ---------- 3 error checking ---------- */
INIT.errors = function () {
  /* 3.1 noisy channel */
  (function () {
    const inp = $('#nz-in'), lvl = $('#nz-level'), lv = $('#nz-level-v'), out = $('#nz-out');
    const printable = c => c >= 32 && c <= 126 ? (c === 32 ? '␣' : String.fromCharCode(c)) : '?';
    function send() {
      const text = (inp.value || 'HELLO').replace(/[^\x20-\x7E]/g, '?');
      const p = +lvl.value / 100; let flips = 0, wrong = 0;
      const sent = h('div', { class: 'chars' }), got = h('div', { class: 'chars' });
      Array.from(text).forEach(ch => {
        const code = ch.charCodeAt(0); let mask = 0;
        for (let i = 0; i < 8; i++) if (Math.random() < p) mask |= 1 << i;
        const rc = code ^ mask; flips += ones(mask); if (mask) wrong++;
        sent.append(h('div', { class: 'char' }, h('b', { text: printable(code) }), h('span', { text: nib(bin(code)) })));
        const bits = h('span');
        bin(rc).split('').forEach((b, i) => { if (i === 4) bits.append(' '); bits.append((mask >> (7 - i)) & 1 ? h('mark', { text: b }) : b); });
        got.append(h('div', { class: 'char' + (mask ? ' changed' : '') }, h('b', { text: printable(rc) }), bits));
      });
      const total = text.length * 8;
      const summary = flips === 0 ? 'No bits were flipped this time. The message arrived intact.'
        : flips + ' of ' + total + ' bits ' + (flips === 1 ? 'was' : 'were') + ' flipped, damaging ' + wrong + ' character' + (wrong === 1 ? '' : 's') + '. The receiver sees only the bottom row and has no way to tell it is wrong.';
      out.replaceChildren(h('div', { class: 'field' }, h('span', { class: 'label', text: 'Sent' }), sent), h('div', { class: 'field' }, h('span', { class: 'label', text: 'Received (flipped bits are marked)' }), got), h('div', { class: 'msg ' + (flips ? 'bad' : 'good'), text: summary }));
    }
    const showLevel = () => { lv.textContent = lvl.value + '% chance for each bit'; };
    lvl.addEventListener('input', showLevel); $('#nz-send').addEventListener('click', send);
    showLevel(); send();
  })();

  /* 3.2 parity */
  (function () {
    let mode = 'even', flips = 0;
    const status = $('#par-status'), verdict = $('#par-verdict');
    const labels = ['P', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
    const names = ['Parity bit'].concat([1, 2, 3, 4, 5, 6, 7].map(i => 'Data bit ' + i));
    const sendB = bitBoard($('#par-send'), { value: 0b00110100, labels, names, classes: ['parity'], onChange: show });
    const recvB = bitBoard($('#par-recv'), { value: 0, labels, names: names.map(n => 'Received ' + n.toLowerCase()), classes: ['parity'], onClick(pv) { flips ^= pv; show(); } });
    const fits = n => (n % 2 === 0) === (mode === 'even');
    function show() {
      const sv = sendB.value, sc = ones(sv), sOk = fits(sc);
      const word = n => n + ' one' + (n === 1 ? '' : 's') + ', which is ' + (n % 2 ? 'odd' : 'even');
      status.className = 'msg ' + (sOk ? 'good' : 'warn');
      status.textContent = 'The byte has ' + word(sc) + '. ' + (mode === 'even' ? 'Even' : 'Odd') + ' parity needs an ' + mode + ' number, so ' + (sOk ? 'the parity bit is set correctly.' : 'the parity bit is wrong. Flip P.');
      const rv = sv ^ flips; recvB.set(rv, true);
      recvB.btns.forEach(({ b, pv }) => b.classList.toggle('flipped', (flips & pv) !== 0));
      const rc = ones(rv), rOk = fits(rc), k = ones(flips);
      const start = 'The receiver counts ' + word(rc) + '. ';
      let text, cls;
      if (!k && sOk) { text = start + 'The check passes and the data is correct.'; cls = 'good'; }
      else if (!k) { text = start + 'The check fails even though nothing was damaged, because the sender set the wrong parity bit.'; cls = 'warn'; }
      else if (!rOk) { text = start + 'The check fails, so an error is detected and the byte is requested again. The receiver cannot tell which bit is wrong.'; cls = 'good'; }
      else { text = start + 'The check passes, but ' + k + ' bits were flipped. The damaged byte is accepted. Parity cannot detect an even number of flipped bits.'; cls = 'bad'; }
      if (k && !sOk) { text = start + (rOk ? 'The check passes by accident: the sender\'s parity bit was already wrong.' : 'The check fails.') + ' Set the sender\'s parity bit correctly before testing interference.'; cls = 'warn'; }
      verdict.className = 'msg ' + cls; verdict.textContent = text;
    }
    seg($('#par-mode'), v => { mode = v; show(); });
    $('#par-random').addEventListener('click', () => { flips = 0; sendB.set(rnd(1, 126)); });
    $('#par-clear').addEventListener('click', () => { flips = 0; show(); });
    show();
  })();

  /* parity block */
  (function () {
    const table = $('#blk-grid'), msg = $('#blk-msg'), counts = $('#blk-counts');
    let rows, bad, solved, guesses;
    function make() {
      rows = [];
      for (let r = 0; r < 4; r++) { const d = rnd(0, 127); rows.push((ones(d) % 2) << 7 | d); }
      let pb = 0; for (let c = 0; c < 8; c++) { let n = 0; rows.forEach(v => { n += (v >> c) & 1; }); pb |= (n % 2) << c; }
      rows.push(pb);
      bad = { r: rnd(0, 3), c: rnd(0, 7) }; rows[bad.r] ^= 1 << (7 - bad.c);
      solved = false; guesses = {};
      msg.className = 'msg'; msg.textContent = ''; draw();
    }
    function draw() {
      const showC = counts.checked;
      const head = h('tr', null, h('th'), h('th', { text: 'P' }), [7, 6, 5, 4, 3, 2, 1].map(i => h('th', { text: 'D' + i })), showC ? h('th', { text: '1s' }) : null);
      const body = rows.map((v, r) => {
        const isP = r === 4, tr = h('tr', { class: isP ? 'prow' : '' }, h('th', { class: 'rowh', text: isP ? 'Parity byte' : 'Byte ' + (r + 1) }));
        for (let c = 0; c < 8; c++) {
          const bit = (v >> (7 - c)) & 1, td = h('td', { class: c === 0 ? 'pcol' : '' });
          if (isP) td.append(h('span', { class: 'cell', text: bit }));
          else {
            const key = r + ',' + c, hit = r === bad.r && c === bad.c;
            const b = h('button', { type: 'button', text: bit, class: guesses[key] ? (hit ? 'right' : 'wrong') : '', 'aria-label': 'Byte ' + (r + 1) + ', ' + (c ? 'data bit ' + (8 - c) : 'parity bit') + ', value ' + bit });
            b.addEventListener('click', () => guess(r, c));
            td.append(b);
          }
          tr.append(td);
        }
        if (showC) { const n = ones(v); tr.append(h('td', { class: 'cnt' + (n % 2 ? ' odd' : ''), text: n })); }
        return tr;
      });
      const foot = showC ? h('tr', null, h('th', { class: 'rowh', text: '1s' }), Array.from({ length: 8 }, (_, c) => { let n = 0; rows.forEach(v => { n += (v >> (7 - c)) & 1; }); return h('td', { class: 'cnt' + (n % 2 ? ' odd' : ''), text: n }); })) : null;
      table.replaceChildren(head, ...body, foot || '');
    }
    function guess(r, c) {
      if (solved) return;
      guesses[r + ',' + c] = true;
      if (r === bad.r && c === bad.c) {
        solved = true; msg.className = 'msg good';
        msg.textContent = 'Correct. Byte ' + (r + 1) + ' has an odd number of 1s and so does column ' + (c ? 'D' + (8 - c) : 'P') + '. The faulty bit is where they cross, and flipping it back repairs the data.';
      } else {
        msg.className = 'msg warn';
        msg.textContent = 'Not that one. With even parity every row and every column should hold an even number of 1s. Find the row and the column that break the rule.';
      }
      draw();
    }
    counts.addEventListener('change', draw); $('#blk-new').addEventListener('click', make);
    make();
  })();

  /* 3.3 checksum */
  (function () {
    const sWrap = $('#cs-send'), rWrap = $('#cs-recv'), work = $('#cs-work'), rwork = $('#cs-rwork'), verdict = $('#cs-verdict');
    const init = [72, 69, 76, 80];
    const mk = (id, v, label) => h('input', { type: 'number', min: 0, max: 255, value: v, id, 'aria-label': label, inputmode: 'numeric' });
    const sIn = init.map((v, i) => mk('cs-s' + i, v, 'Sender byte ' + (i + 1)));
    const rIn = init.map((v, i) => mk('cs-r' + i, v, 'Received byte ' + (i + 1)));
    sWrap.append(...sIn); rWrap.append(...rIn);
    const read = arr => arr.map(i => { let v = parseInt(i.value, 10); if (isNaN(v)) v = 0; return Math.max(0, Math.min(255, v)); });
    const total = a => a.reduce((x, y) => x + y, 0);
    function show() {
      const sv = read(sIn), rv = read(rIn), st = total(sv), cs = st % 256, rt = total(rv), rc = rt % 256;
      work.innerHTML = '<span>' + sv.join(' + ') + ' = ' + st + '</span><span>' + st + ' ÷ 256 = ' + Math.floor(st / 256) + ' remainder <b>' + cs + '</b></span><span>Checksum sent with the block: <b>' + cs + '</b> (' + nib(bin(cs)) + ')</span>';
      rwork.innerHTML = '<span>Receiver recalculates: ' + rv.join(' + ') + ' = ' + rt + '</span><span>' + rt + ' ÷ 256 = ' + Math.floor(rt / 256) + ' remainder <b>' + rc + '</b>. Checksum received: <b>' + cs + '</b></span>';
      const same = sv.every((v, i) => v === rv[i]);
      rIn.forEach((inp, i) => inp.classList.toggle('bad', sv[i] !== rv[i]));
      if (rc !== cs) { verdict.className = 'msg good'; verdict.textContent = 'The two values differ (' + rc + ' and ' + cs + '). Error detected: the receiver asks for the block to be sent again.'; }
      else if (same) { verdict.className = 'msg good'; verdict.textContent = 'The two values match and the data is correct. The block is accepted.'; }
      else { verdict.className = 'msg bad'; verdict.textContent = 'The two values match, so the block is accepted, but the data is wrong. The changes cancelled each other out and this simple checksum missed them.'; }
    }
    sIn.forEach((inp, i) => inp.addEventListener('input', () => { rIn[i].value = inp.value; show(); }));
    rIn.forEach(inp => inp.addEventListener('input', show));
    $('#cs-corrupt').addEventListener('click', () => { const sv = read(sIn), i = rnd(0, 3); rIn.forEach((inp, k) => { inp.value = sv[k]; }); rIn[i].value = sv[i] ^ (1 << rnd(0, 6)); show(); });
    $('#cs-reset').addEventListener('click', () => { const sv = read(sIn); rIn.forEach((inp, k) => { inp.value = sv[k]; }); show(); });
    show();
  })();

  /* 3.4 check digit */
  (function () {
    const inp = $('#isbn-in'), table = $('#isbn-table'), work = $('#isbn-work'), chk = $('#isbn-check'), verdict = $('#isbn-verdict');
    let full = '', note = '';
    const weighted = digits => digits.reduce((t, d, i) => t + d * (i % 2 ? 3 : 1), 0);
    function calc() {
      const raw = inp.value.replace(/\D/g, ''); if (raw !== inp.value) inp.value = raw;
      if (raw.length !== 12) { table.replaceChildren(); work.innerHTML = '<span>Enter exactly 12 digits. You have typed ' + raw.length + '.</span>'; full = ''; return; }
      const d = raw.split('').map(Number), prod = d.map((x, i) => x * (i % 2 ? 3 : 1)), sum = weighted(d), r = sum % 10, cd = (10 - r) % 10;
      const row = (label, arr, cls) => '<tr><th class="l">' + label + '</th>' + arr.map(x => '<td class="' + (cls || '') + '">' + x + '</td>').join('') + '</tr>';
      table.innerHTML = '<tbody>' + row('Digit', d, 'd') + row('Multiply by', d.map((_, i) => i % 2 ? 3 : 1)) + row('Result', prod, 'out') + '</tbody>';
      work.innerHTML = '<span>Add the results: ' + prod.join(' + ') + ' = <b>' + sum + '</b></span><span>The next multiple of 10 is ' + (sum + cd) + ', so the check digit is ' + (sum + cd) + ' − ' + sum + ' = <b>' + cd + '</b></span><span>Full ISBN: <b>' + raw + cd + '</b></span>';
      full = raw + cd;
    }
    function test() {
      const raw = chk.value.replace(/\D/g, ''); if (raw !== chk.value) chk.value = raw;
      if (raw.length !== 13) { verdict.className = 'msg'; verdict.textContent = 'Enter 13 digits to test a code.'; return; }
      const d = raw.split('').map(Number), cd = (10 - weighted(d.slice(0, 12)) % 10) % 10, ok = cd === d[12];
      if (ok && note && full && raw !== full) { verdict.className = 'msg bad'; verdict.textContent = note + 'The check digit should be ' + cd + ' and the last digit is ' + d[12] + ', so the code is accepted even though it is wrong. A swap goes unnoticed when the two digits differ by 5. This is rare.'; }
      else if (ok) { verdict.className = 'msg good'; verdict.textContent = note + 'From the first 12 digits the check digit should be ' + cd + '. The last digit is ' + d[12] + '. They match, so the code is accepted.'; }
      else { verdict.className = 'msg good'; verdict.textContent = note + 'From the first 12 digits the check digit should be ' + cd + ', but the last digit is ' + d[12] + '. Error detected: the code is rejected and must be entered again.'; }
    }
    inp.addEventListener('input', () => { calc(); note = ''; if (full) chk.value = full; test(); });
    chk.addEventListener('input', () => { note = ''; test(); });
    $('#isbn-fix').addEventListener('click', () => { if (!full) return; chk.value = full; note = ''; test(); });
    $('#isbn-typo').addEventListener('click', () => {
      if (!full) return; const i = rnd(0, 11), d = full.split(''); let n; do { n = String(rnd(0, 9)); } while (n === d[i]);
      note = 'Digit ' + (i + 1) + ' was typed as ' + n + ' instead of ' + d[i] + '. '; d[i] = n; chk.value = d.join(''); test();
    });
    $('#isbn-swap').addEventListener('click', () => {
      if (!full) return; const d = full.split(''); const spots = []; for (let i = 0; i < 11; i++) if (d[i] !== d[i + 1]) spots.push(i);
      if (!spots.length) return; const i = pick(spots);
      note = 'Digits ' + (i + 1) + ' and ' + (i + 2) + ' (' + d[i] + ' and ' + d[i + 1] + ') were swapped. '; const t = d[i]; d[i] = d[i + 1]; d[i + 1] = t; chk.value = d.join(''); test();
    });
    calc(); chk.value = full; test();
  })();

  /* 3.5 challenge */
  const concept = [
    ['Two bits in a byte are flipped during transmission. What will a parity check do?', ['Miss the error', 'Detect the error', 'Correct both bits', 'Correct one of the bits'], 0, 'Two flips leave the number of 1s even (or odd) as before, so the check still passes.'],
    ['Which method is designed to catch mistakes made when a person types in a long number?', ['Check digit', 'Parity bit', 'Echo check', 'Sampling'], 0, 'A check digit is calculated from the other digits and checked when the code is entered.'],
    ['A receiver recalculates a checksum and gets a different value from the one that was sent. What should it do?', ['Ask for the data to be sent again', 'Accept the data', 'Change the checksum to match', 'Delete the parity bit'], 0, 'A mismatch means the block was damaged, so it is requested again.'],
    ['What can a parity block do that a single parity bit cannot?', ['Find which bit is wrong', 'Work without any extra bits', 'Make transmission faster', 'Stop interference'], 0, 'The failing row and failing column cross at the faulty bit.'],
    ['Why do errors happen during data transmission?', ['Interference changes some bits', 'The data is too large', 'Binary is unreliable', 'The receiver counts too slowly'], 0, 'Electrical or radio interference can make a 1 read as a 0, or a 0 as a 1.']
  ];
  makeQuiz($('#quiz-errors'), 'errors', [
    () => { const d = rnd(1, 126), m = pick(['even', 'odd']), n = ones(d), p = (n % 2 === 0) === (m === 'even') ? 0 : 1; return { html: 'The seven data bits are <span class="mono">' + bin(d, 7) + '</span> and the system uses <strong>' + m + '</strong> parity. What should the parity bit be?', answer: String(p), norm: v => String(v).trim(), hint: 'Count the 1s in the data bits first.', work: '<span>The data has ' + n + ' ones. Adding a parity bit of ' + p + ' makes the total ' + (n + p) + ', which is ' + m + '.</span>' }; },
    () => { const v = rnd(1, 254), m = pick(['even', 'odd']), n = ones(v), ok = (n % 2 === 0) === (m === 'even'); return { type: 'mcq', html: 'A byte arrives as <span class="mono">' + nib(bin(v)) + '</span>. The system uses <strong>' + m + '</strong> parity. What does the receiver decide?', options: ['No error detected', 'Error detected'], answer: ok ? 0 : 1, work: '<span>The byte has ' + n + ' ones, which is ' + (n % 2 ? 'odd' : 'even') + '. ' + (ok ? 'That fits the rule.' : 'That breaks the rule.') + '</span>' }; },
    () => { const a = [rnd(40, 200), rnd(40, 200), rnd(40, 200)], t = a[0] + a[1] + a[2]; return { html: 'A block contains the bytes <span class="mono">' + a.join(', ') + '</span>. The checksum is the total of the bytes, keeping only the remainder after dividing by 256. What is the checksum?', answer: String(t % 256), hint: 'Add them up, then subtract 256 until the answer is below 256.', work: '<span>' + a.join(' + ') + ' = ' + t + '</span><span>' + t + ' ÷ 256 = ' + Math.floor(t / 256) + ' remainder ' + (t % 256) + '</span>' }; },
    () => { const d = Array.from({ length: 5 }, () => rnd(0, 9)), prod = d.map((x, i) => x * (i % 2 ? 3 : 1)), sum = prod.reduce((x, y) => x + y, 0), cd = (10 - sum % 10) % 10; return { html: 'A shop uses 6-digit product codes. The first five digits are <span class="mono">' + d.join(' ') + '</span>. They are multiplied by 1, 3, 1, 3, 1 in turn and the results are added. The check digit is whatever must be added to reach the next multiple of 10. What is the check digit?', answer: String(cd), norm: v => String(v).trim(), hint: 'Multiply each digit, add the results, then look for the next multiple of 10.', work: '<span>' + prod.join(' + ') + ' = ' + sum + '</span><span>Next multiple of 10 is ' + (sum + cd) + ', so the check digit is ' + cd + '</span>' }; },
    () => mcq(pick(concept))
  ]);
};

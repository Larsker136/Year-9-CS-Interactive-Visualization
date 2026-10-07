'use strict';
/* ---------- 1 number systems ---------- */
INIT.numbers = function () {
  /* 1.1 bit board */
  (function () {
    const sum = $('#bits-sum'), den = $('#bits-den'), hx = $('#bits-hex'), bn = $('#bits-bin'), note = $('#bits-note');
    function show(v) {
      const parts = []; for (let i = 7; i >= 0; i--) if (v & (1 << i)) parts.push(1 << i);
      sum.textContent = parts.length ? parts.join(' + ') + ' = ' + v : 'No bits are on, so the value is 0';
      den.textContent = v; hx.textContent = hex(v); bn.textContent = nib(bin(v));
    }
    const board = bitBoard($('#bits-board'), { value: 165, onChange(v) { note.textContent = ''; show(v); } });
    show(board.value);
    $$('[data-bits-act]').forEach(b => b.addEventListener('click', () => {
      const act = b.dataset.bitsAct, v = board.value; let msg = '';
      if (act === 'plus') { if (v === 255) { board.set(0); msg = 'Overflow. 256 needs a ninth bit, so with eight bits the value wraps round to 0.'; } else board.set(v + 1); }
      else if (act === 'minus') { if (v === 0) msg = 'These eight bits cannot go below 0.'; else board.set(v - 1); }
      else if (act === 'clear') board.set(0);
      else board.set(255);
      note.textContent = msg;
    }));
  })();

  /* 1.2 denary to binary working */
  (function () {
    const n = $('#d2b-n'), range = $('#d2b-range'), out = $('#d2b-out');
    let method = 'place';
    seg($('#d2b-method'), v => { method = v; render(); });
    function render() {
      let v = parseInt(n.value, 10); if (isNaN(v)) v = 0; v = Math.max(0, Math.min(255, v));
      const rows = [];
      if (method === 'place') {
        let left = v;
        for (let i = 7; i >= 0; i--) {
          const pv = 1 << i, fits = left >= pv;
          rows.push('<tr><td>' + pv + '</td><td class="l">Does ' + pv + ' fit into ' + left + '?</td><td class="' + (fits ? 'yes">Yes' : 'no">No') + '</td><td class="out">' + (fits ? 1 : 0) + '</td><td>' + (fits ? left + ' − ' + pv + ' = ' + (left - pv) : left) + '</td></tr>');
          if (fits) left -= pv;
        }
        out.innerHTML = '<div class="scroll-x"><table class="t"><thead><tr><th>Place value</th><th class="l">Question</th><th>Answer</th><th>Bit</th><th>Left over</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' +
          '<div class="work"><span>Read the Bit column from top to bottom:</span><span><b>' + v + '</b> in denary = <b>' + nib(bin(v)) + '</b> in binary</span></div>';
      } else {
        let cur = v; const rem = [];
        if (cur === 0) rows.push('<tr><td>0 ÷ 2</td><td>0</td><td class="out">0</td></tr>');
        while (cur > 0) { const q = Math.floor(cur / 2), r = cur % 2; rows.push('<tr><td>' + cur + ' ÷ 2</td><td>' + q + '</td><td class="out">' + r + '</td></tr>'); rem.push(r); cur = q; }
        const raw = rem.length ? rem.slice().reverse().join('') : '0';
        out.innerHTML = '<div class="scroll-x"><table class="t"><thead><tr><th>Division</th><th>Answer</th><th>Remainder</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' +
          '<div class="work"><span>Read the remainders from the bottom up: <b>' + raw + '</b></span><span>Add zeros on the left to fill a byte: <b>' + v + '</b> in denary = <b>' + nib(bin(v)) + '</b> in binary</span></div>';
      }
    }
    n.addEventListener('input', () => { const v = parseInt(n.value, 10); if (!isNaN(v)) range.value = Math.max(0, Math.min(255, v)); render(); });
    n.addEventListener('change', () => { let v = parseInt(n.value, 10); if (isNaN(v)) v = 0; n.value = Math.max(0, Math.min(255, v)); render(); });
    range.addEventListener('input', () => { n.value = range.value; render(); });
    render();
  })();

  /* 1.3 nibbles and hex */
  (function () {
    const hiD = $('#hex-hi-d'), loD = $('#hex-lo-d'), work = $('#hex-work'), table = $('#hex-table');
    const cells = [];
    for (let i = 0; i < 16; i++) { const c = h('div', null, h('b', { text: hex(i, 1) }), bin(i, 4), h('br'), String(i)); table.append(c); cells.push(c); }
    const opts = { bits: 4, onChange: show };
    const hi = bitBoard($('#hex-hi'), Object.assign({ value: 10 }, opts));
    const lo = bitBoard($('#hex-lo'), Object.assign({ value: 5 }, opts));
    function show() {
      const a = hi.value, b = lo.value, v = a * 16 + b;
      hiD.textContent = hex(a, 1); loD.textContent = hex(b, 1);
      cells.forEach((c, i) => c.classList.toggle('now', i === a || i === b));
      work.innerHTML = '<span>Binary <b>' + bin(a, 4) + ' ' + bin(b, 4) + '</b> = hex <b>' + hex(v) + '</b></span>' +
        '<span>Hex to denary: (' + hex(a, 1) + ' × 16) + (' + hex(b, 1) + ' × 1) = (' + a + ' × 16) + ' + b + ' = <b>' + v + '</b></span>';
    }
    show();
  })();

  /* colour mixer */
  (function () {
    const ids = ['r', 'g', 'b'], names = ['Red', 'Green', 'Blue'];
    const inputs = ids.map(i => $('#col-' + i)), sw = $('#col-swatch'), code = $('#col-code'), rows = $('#col-rows');
    function show() {
      const v = inputs.map(i => +i.value);
      const c = '#' + v.map(x => hex(x)).join('');
      sw.style.background = c; code.textContent = c;
      rows.innerHTML = v.map((x, i) => '<tr><td class="l">' + names[i] + '</td><td>' + x + '</td><td>' + nib(bin(x)) + '</td><td class="out">' + hex(x) + '</td></tr>').join('');
    }
    inputs.forEach(i => i.addEventListener('input', show)); show();
  })();

  /* 1.4 converter */
  (function () {
    const fb = $('#cv-bin'), fd = $('#cv-den'), fh = $('#cv-hex'), work = $('#cv-work');
    const MAX = 65535;
    function from(src) {
      const raw = src.value.replace(/\s+/g, '');
      [fb, fd, fh].forEach(f => f.classList.remove('bad'));
      let v = NaN, why = '';
      if (src === fb) { if (/^[01]+$/.test(raw)) v = parseInt(raw, 2); else why = 'Binary uses only the digits 0 and 1.'; }
      else if (src === fd) { if (/^\d+$/.test(raw)) v = parseInt(raw, 10); else why = 'Denary uses only the digits 0 to 9.'; }
      else { if (/^[0-9a-fA-F]+$/.test(raw)) v = parseInt(raw, 16); else why = 'Hexadecimal uses the digits 0 to 9 and the letters A to F.'; }
      if (raw === '') why = 'Type a number to convert.';
      if (!why && v > MAX) why = 'That is larger than 65535, the biggest 16-bit number.';
      if (why) { src.classList.add('bad'); work.innerHTML = '<span>' + why + '</span>'; return; }
      const width = v > 255 ? 16 : 8, b = bin(v, width), hx = hex(v, width / 4);
      if (src !== fb) fb.value = nib(b);
      if (src !== fd) fd.value = v;
      if (src !== fh) fh.value = hx;
      const groups = nib(b).split(' ');
      const lines = [];
      const places = []; for (let i = width - 1; i >= 0; i--) if (v & (1 << i)) places.push(1 << i);
      const hexSum = hx.split('').map((d, i) => '(' + d + ' × ' + Math.pow(16, hx.length - 1 - i) + ')').join(' + ');
      if (src === fb) {
        lines.push('Binary to denary: ' + (places.length ? places.join(' + ') : '0') + ' = <b>' + v + '</b>');
        lines.push('Binary to hex: ' + groups.map((g, i) => g + ' → ' + hx[i]).join(',  ') + ' gives <b>' + hx + '</b>');
      } else if (src === fh) {
        lines.push('Hex to binary: ' + hx.split('').map((d, i) => d + ' → ' + groups[i]).join(',  ') + ' gives <b>' + nib(b) + '</b>');
        lines.push('Hex to denary: ' + hexSum + ' = <b>' + v + '</b>');
      } else {
        lines.push('Denary to binary: ' + (places.length ? places.join(' + ') : '0') + ' = ' + v + ', so the bits are <b>' + nib(b) + '</b>');
        if (v < 256) lines.push('Denary to hex: ' + v + ' ÷ 16 = ' + Math.floor(v / 16) + ' remainder ' + (v % 16) + ', so the digits are ' + hex(v >> 4, 1) + ' and ' + hex(v & 15, 1) + ': <b>' + hx + '</b>');
        else lines.push('Denary to hex: group the bits in fours, ' + groups.map((g, i) => g + ' → ' + hx[i]).join(',  ') + ' gives <b>' + hx + '</b>');
      }
      work.innerHTML = lines.map(l => '<span>' + l + '</span>').join('');
    }
    [fb, fd, fh].forEach(f => f.addEventListener('input', () => from(f)));
    from(fh);
  })();

  /* 1.5 challenge */
  const val = () => rnd(1, 255);
  const placeWork = v => { const p = []; for (let i = 7; i >= 0; i--) if (v & (1 << i)) p.push(1 << i); return p.join(' + ') + ' = ' + v; };
  makeQuiz($('#quiz-numbers'), 'numbers', [
    () => { const v = val(); return { html: 'Convert the binary number <span class="mono">' + nib(bin(v)) + '</span> to denary.', answer: String(v), hint: 'Add the place values of the bits that are 1.', work: '<span>' + placeWork(v) + '</span>' }; },
    () => { const v = val(); return { html: 'Convert the denary number <span class="mono">' + v + '</span> to 8-bit binary.', answer: nib(bin(v)), hint: 'Start with 128. Does it fit?', work: '<span>' + placeWork(v) + '</span><span>Bits: <b>' + nib(bin(v)) + '</b></span>' }; },
    () => { const v = val(); return { html: 'Convert the binary number <span class="mono">' + nib(bin(v)) + '</span> to hexadecimal.', answer: hex(v), hint: 'Split it into two groups of four bits.', work: '<span>' + bin(v >> 4, 4) + ' → ' + hex(v >> 4, 1) + ',  ' + bin(v & 15, 4) + ' → ' + hex(v & 15, 1) + '</span>' }; },
    () => { const v = val(); return { html: 'Convert the hexadecimal number <span class="mono">' + hex(v) + '</span> to 8-bit binary.', answer: nib(bin(v)), hint: 'Each hex digit becomes four bits.', work: '<span>' + hex(v >> 4, 1) + ' → ' + bin(v >> 4, 4) + ',  ' + hex(v & 15, 1) + ' → ' + bin(v & 15, 4) + '</span>' }; },
    () => { const v = val(); return { html: 'Convert the hexadecimal number <span class="mono">' + hex(v) + '</span> to denary.', answer: String(v), hint: 'Left digit × 16, plus the right digit.', work: '<span>(' + (v >> 4) + ' × 16) + ' + (v & 15) + ' = ' + v + '</span>' }; },
    () => { const v = val(); return { html: 'Convert the denary number <span class="mono">' + v + '</span> to hexadecimal.', answer: hex(v), hint: 'Divide by 16. The remainder is the right-hand digit.', work: '<span>' + v + ' ÷ 16 = ' + (v >> 4) + ' remainder ' + (v & 15) + ' → ' + hex(v >> 4, 1) + ' and ' + hex(v & 15, 1) + '</span>' }; },
    () => { const n = rnd(3, 10); return { html: 'What is the largest denary number that can be stored in <span class="mono">' + n + '</span> bits?', answer: String(Math.pow(2, n) - 1), hint: 'It is one less than the number of different values.', work: '<span>' + n + ' bits give 2<sup>' + n + '</sup> = ' + Math.pow(2, n) + ' values, from 0 to ' + (Math.pow(2, n) - 1) + '</span>' }; }
  ]);
};

'use strict';
/* ---------- 2 data representation ---------- */
INIT.data = function () {
  /* 2.1 text */
  (function () {
    const inp = $('#txt-in'), out = $('#txt-out'), total = $('#txt-total');
    function show() {
      const chars = Array.from(inp.value);
      out.replaceChildren(...chars.map(c => {
        const code = c.codePointAt(0);
        return h('div', { class: 'char' }, h('b', { text: c === ' ' ? '␣' : c }), h('span', { class: 'den', text: code }), h('span', { text: code < 256 ? nib(bin(code)) : code.toString(2) }));
      }));
      const beyond = chars.some(c => c.codePointAt(0) > 127);
      const n = chars.length;
      total.innerHTML = n ? '<span>' + n + ' character' + (n === 1 ? '' : 's') + ' × 8 bits = <b>' + n * 8 + ' bits</b> = <b>' + n + ' byte' + (n === 1 ? '' : 's') + '</b></span>' +
        (beyond ? '<span>One of these characters is not in ASCII. It needs a larger character set called Unicode, which uses more bits per character.</span>' : '')
        : '<span>Type something to see its codes.</span>';
    }
    inp.addEventListener('input', show); show();
  })();

  /* 2.2 pixel painter */
  (function () {
    const PAL = {
      1: ['#FFFFFF', '#141A2B'],
      2: ['#FFFFFF', '#F6A609', '#2A52E0', '#141A2B'],
      3: ['#FFFFFF', '#FFD23F', '#F58A1F', '#D93A3A', '#2FA35B', '#2F7FE0', '#8A4FD1', '#141A2B']
    };
    const NAMES = { 1: ['white', 'black'], 2: ['white', 'amber', 'blue', 'black'], 3: ['white', 'yellow', 'orange', 'red', 'green', 'blue', 'purple', 'black'] };
    const EX = {
      1: ['01100110', '11111111', '11111111', '11111111', '01111110', '00111100', '00011000', '00000000'],
      2: ['22111122', '21111112', '11311311', '11111111', '13111131', '11333311', '21111112', '22111122'],
      3: ['55555511', '55535511', '55333555', '53333355', '52222255', '52027255', '52227255', '44444444']
    };
    const load = d => EX[d].join('').split('').map(Number);
    const px = { 1: load(1), 2: load(2), 3: load(3) };
    let depth = 1, colour = 1, painting = false;
    const grid = $('#px-grid'), pal = $('#px-palette'), data = $('#px-data'), size = $('#px-size');
    const cells = [];
    for (let i = 0; i < 64; i++) { const b = h('button', { type: 'button', 'data-i': i }); grid.append(b); cells.push(b); }
    function paint(i) { if (px[depth][i] === colour) return; px[depth][i] = colour; show(); }
    grid.addEventListener('pointerdown', e => { const b = e.target.closest('button'); if (!b) return; painting = true; paint(+b.dataset.i); });
    grid.addEventListener('pointermove', e => {
      if (!painting) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el.parentNode === grid) paint(+el.dataset.i);
    });
    ['pointerup', 'pointercancel'].forEach(t => window.addEventListener(t, () => { painting = false; }));
    grid.addEventListener('click', e => { const b = e.target.closest('button'); if (b) paint(+b.dataset.i); });
    function buildPalette() {
      pal.replaceChildren(...PAL[depth].map((c, i) => {
        const b = h('button', { type: 'button', 'aria-pressed': i === colour ? 'true' : 'false', 'aria-label': NAMES[depth][i] + ', code ' + bin(i, depth) }, h('i', { style: 'background:' + c }), bin(i, depth));
        b.addEventListener('click', () => { colour = i; buildPalette(); });
        return b;
      }));
    }
    function show() {
      const p = px[depth];
      cells.forEach((b, i) => { b.style.background = PAL[depth][p[i]]; b.setAttribute('aria-label', 'Row ' + (Math.floor(i / 8) + 1) + ', column ' + (i % 8 + 1) + ': ' + NAMES[depth][p[i]]); });
      const rows = []; for (let r = 0; r < 8; r++) rows.push(p.slice(r * 8, r * 8 + 8).map(v => bin(v, depth)).join(depth === 1 ? '' : ' '));
      data.textContent = rows.join('\n');
      const bits = 64 * depth;
      size.innerHTML = '<span>' + Math.pow(2, depth) + ' colours need ' + depth + ' bit' + (depth === 1 ? '' : 's') + ' per pixel</span><span>8 × 8 × ' + depth + ' = <b>' + bits + ' bits</b> = <b>' + bits / 8 + ' bytes</b></span>';
    }
    seg($('#px-depth'), v => { depth = +v; colour = 1; buildPalette(); show(); });
    $('#px-clear').addEventListener('click', () => { px[depth] = px[depth].map(() => 0); show(); });
    $('#px-example').addEventListener('click', () => { px[depth] = load(depth); show(); });
    buildPalette(); show();
  })();

  /* 2.3 resolution and colour depth */
  (function () {
    const RES = [8, 16, 32, 64, 128, 256], DEP = [1, 2, 4, 8, 16, 24];
    const canvas = $('#img-canvas'), ctx = canvas.getContext('2d');
    const rIn = $('#img-res'), dIn = $('#img-depth'), rV = $('#img-res-v'), dV = $('#img-depth-v'), work = $('#img-work');
    const src = document.createElement('canvas'); src.width = src.height = 256;
    (function scene(c) {
      let g = c.createLinearGradient(0, 0, 0, 160);
      g.addColorStop(0, '#16205C'); g.addColorStop(.45, '#7A3F8F'); g.addColorStop(.78, '#F0627A'); g.addColorStop(1, '#FFC46B');
      c.fillStyle = g; c.fillRect(0, 0, 256, 160);
      g = c.createRadialGradient(170, 128, 6, 170, 128, 70);
      g.addColorStop(0, 'rgba(255,244,190,1)'); g.addColorStop(.35, 'rgba(255,214,120,.75)'); g.addColorStop(1, 'rgba(255,190,110,0)');
      c.fillStyle = g; c.fillRect(0, 0, 256, 160);
      c.fillStyle = '#FFF6CF'; c.beginPath(); c.arc(170, 128, 24, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#5A4690'; c.beginPath(); c.moveTo(0, 160); c.lineTo(0, 118); c.lineTo(46, 84); c.lineTo(86, 122); c.lineTo(120, 100); c.lineTo(160, 160); c.fill();
      c.fillStyle = '#2B3566'; c.beginPath(); c.moveTo(150, 160); c.lineTo(214, 112); c.lineTo(256, 138); c.lineTo(256, 160); c.fill();
      g = c.createLinearGradient(0, 160, 0, 256); g.addColorStop(0, '#E8799A'); g.addColorStop(.25, '#4A63B8'); g.addColorStop(1, '#101A45');
      c.fillStyle = g; c.fillRect(0, 160, 256, 96);
      c.fillStyle = 'rgba(255,236,170,.75)';
      for (let i = 0; i < 9; i++) { const w = 46 - i * 4; c.fillRect(170 - w / 2 + (i % 2 ? 4 : -4), 166 + i * 9, w, 3); }
      c.fillStyle = '#F4F6FB'; c.beginPath(); c.moveTo(62, 150); c.lineTo(62, 196); c.lineTo(92, 196); c.fill();
      c.fillStyle = '#FFD23F'; c.beginPath(); c.moveTo(58, 160); c.lineTo(58, 196); c.lineTo(36, 196); c.fill();
      c.fillStyle = '#C62F3A'; c.beginPath(); c.moveTo(28, 200); c.lineTo(100, 200); c.lineTo(90, 212); c.lineTo(38, 212); c.fill();
    })(src.getContext('2d'));
    const lv = (v, bits) => { const L = (1 << bits) - 1; return Math.round(Math.round(v / 255 * L) * 255 / L); };
    function quantise(d, depth) {
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        if (depth === 1) { const y = (r * .299 + g * .587 + b * .114) > 120 ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = y; }
        else if (depth === 2) { const y = lv(r * .299 + g * .587 + b * .114, 2); d[i] = d[i + 1] = d[i + 2] = y; }
        else if (depth === 4) { d[i] = lv(r, 1); d[i + 1] = lv(g, 2); d[i + 2] = lv(b, 1); }
        else if (depth === 8) { d[i] = lv(r, 3); d[i + 1] = lv(g, 3); d[i + 2] = lv(b, 2); }
        else if (depth === 16) { d[i] = lv(r, 5); d[i + 1] = lv(g, 6); d[i + 2] = lv(b, 5); }
      }
    }
    function show() {
      const r = RES[+rIn.value], depth = DEP[+dIn.value];
      let cur = src, sz = 256;
      while (sz > r) { sz /= 2; const t = document.createElement('canvas'); t.width = t.height = sz; const tc = t.getContext('2d'); tc.imageSmoothingEnabled = true; tc.drawImage(cur, 0, 0, sz, sz); cur = t; }
      const t = document.createElement('canvas'); t.width = t.height = r; const tc = t.getContext('2d');
      tc.drawImage(cur, 0, 0);
      const im = tc.getImageData(0, 0, r, r); quantise(im.data, depth); tc.putImageData(im, 0, 0);
      ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(t, 0, 0, canvas.width, canvas.height);
      const bits = r * r * depth;
      rV.textContent = r + ' × ' + r + ' pixels';
      dV.textContent = depth + ' bit' + (depth === 1 ? '' : 's') + ' (' + num(Math.pow(2, depth)) + ' colours)';
      work.innerHTML = '<span>' + r + ' × ' + r + ' = ' + num(r * r) + ' pixels</span><span>' + num(r * r) + ' × ' + depth + ' = <b>' + num(bits) + ' bits</b></span><span>' + num(bits) + ' ÷ 8 = <b>' + num(bits / 8) + ' bytes</b></span>' +
        (bits / 8 >= 1024 ? '<span>' + num(bits / 8) + ' ÷ 1024 = <b>' + fmtBytes(bits / 8) + '</b></span>' : '');
    }
    rIn.addEventListener('input', show); dIn.addEventListener('input', show); show();
  })();

  /* 2.4 sound */
  (function () {
    const RATES = [500, 1000, 2000, 4000, 8000, 16000, 44100], DEPTHS = [1, 2, 3, 4, 6, 8, 16];
    const canvas = $('#snd-canvas'), ctx = canvas.getContext('2d');
    const rIn = $('#snd-rate'), dIn = $('#snd-depth'), rV = $('#snd-rate-v'), dV = $('#snd-depth-v');
    const samplesEl = $('#snd-samples'), work = $('#snd-work'), durIn = $('#snd-dur'), durV = $('#snd-dur-v'), msg = $('#snd-msg');
    let channels = 1;
    const WIN = 0.01;
    const tone = (t, f) => 0.58 * Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * 2 * f * t + 0.6) + 0.14 * Math.sin(2 * Math.PI * 3 * f * t + 1.1);
    const visual = t => tone(t, 220);
    function audio(t) {
      const seg = Math.min(2, Math.floor(t / 0.5)), f = [220, 277.18, 329.63][seg], tn = t - seg * 0.5;
      const env = Math.max(0, Math.min(1, tn / 0.02, (0.5 - tn) / 0.06));
      return tone(t, f) * env;
    }
    const level = (v, depth) => { const L = Math.pow(2, depth) - 1; return Math.max(0, Math.min(L, Math.round((v + 1) / 2 * L))); };
    const back = (idx, depth) => idx / (Math.pow(2, depth) - 1) * 2 - 1;
    function draw() {
      const rate = RATES[+rIn.value], depth = DEPTHS[+dIn.value];
      const W = canvas.width, H = canvas.height, padL = depth <= 3 ? 64 : 20, padR = 20, padY = 28;
      const X = t => padL + t / WIN * (W - padL - padR), Y = v => H / 2 - v * (H / 2 - padY);
      ctx.clearRect(0, 0, W, H);
      const levels = Math.pow(2, depth);
      if (levels <= 16) {
        ctx.strokeStyle = css('--line'); ctx.lineWidth = 1; ctx.fillStyle = css('--ink-2'); ctx.font = '600 17px ' + css('--font-mono'); ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
        for (let i = 0; i < levels; i++) {
          const y = Y(back(i, depth)); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
          if (depth <= 3) ctx.fillText(bin(i, depth), padL - 10, y);
        }
      }
      ctx.strokeStyle = css('--ink-2'); ctx.lineWidth = 2.5; ctx.beginPath();
      for (let i = 0; i <= 600; i++) { const t = i / 600 * WIN; if (i) ctx.lineTo(X(t), Y(visual(t))); else ctx.moveTo(X(t), Y(visual(t))); }
      ctx.stroke();
      const n = Math.floor(WIN * rate + 1e-9), step = (W - padL - padR) / (WIN * rate);
      ctx.strokeStyle = css('--on'); ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath();
      const first = [];
      for (let i = 0; i <= n; i++) {
        const t = i / rate, idx = level(visual(t), depth), y = Y(back(idx, depth));
        if (i < 8) first.push(idx);
        const x0 = X(t), x1 = Math.min(W - padR, X((i + 1) / rate));
        if (x0 > W - padR) break;
        if (i) ctx.lineTo(x0, y); else ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
      }
      ctx.stroke();
      if (step >= 9) {
        ctx.fillStyle = css('--accent');
        for (let i = 0; i <= n; i++) { const t = i / rate, x = X(t); if (x > W - padR) break; ctx.beginPath(); ctx.arc(x, Y(back(level(visual(t), depth), depth)), 6, 0, Math.PI * 2); ctx.fill(); }
      }
      rV.textContent = num(rate) + ' Hz'; dV.textContent = depth + ' bit' + (depth === 1 ? '' : 's') + ' (' + num(levels) + ' levels)';
      samplesEl.replaceChildren(...first.map(i => h('span', { class: 'chip', text: nib(bin(i, depth)) })));
      size();
    }
    function size() {
      const rate = RATES[+rIn.value], depth = DEPTHS[+dIn.value], sec = +durIn.value;
      const bits = rate * depth * sec * channels;
      durV.textContent = sec + ' second' + (sec === 1 ? '' : 's');
      work.innerHTML = '<span>' + num(rate) + ' × ' + depth + ' × ' + sec + ' × ' + channels + ' = <b>' + num(bits) + ' bits</b></span><span>' + num(bits) + ' ÷ 8 = <b>' + num(bits / 8) + ' bytes</b>' + (bits / 8 >= 1024 ? ' = <b>' + fmtBytes(bits / 8) + '</b>' : '') + '</span>';
    }
    let actx = null, playing = null;
    function play(sampled) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) throw new Error('no audio');
        actx = actx || new AC();
        if (actx.state === 'suspended') actx.resume();
        const rate = RATES[+rIn.value], depth = DEPTHS[+dIn.value];
        const sr = actx.sampleRate, n = Math.floor(sr * 1.5), buf = actx.createBuffer(1, n, sr), d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) {
          let t = i / sr, v;
          if (sampled) { t = Math.floor(t * rate) / rate; v = back(level(audio(t), depth), depth); }
          else v = audio(t);
          d[i] = v * 0.22;
        }
        const fade = Math.floor(sr * 0.01);
        for (let i = 0; i < fade; i++) { d[i] *= i / fade; d[n - 1 - i] *= i / fade; }
        if (playing) { try { playing.stop(); } catch (e) { /* already stopped */ } }
        const node = actx.createBufferSource(); node.buffer = buf; node.connect(actx.destination); node.start(); playing = node;
        msg.textContent = sampled ? 'Playing at ' + num(rate) + ' Hz, ' + depth + ' bit.' : 'Playing the original.';
      } catch (e) { msg.textContent = 'Sound is not available in this browser view.'; }
    }
    $('#snd-play').addEventListener('click', () => play(true));
    $('#snd-play-orig').addEventListener('click', () => play(false));
    rIn.addEventListener('input', draw); dIn.addEventListener('input', draw); durIn.addEventListener('input', size);
    seg($('#snd-ch'), v => { channels = +v; size(); });
    redrawers.push(draw); draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  })();

  /* 2.5 challenge */
  const concept = [
    ['An image is changed from 8-bit to 16-bit colour. The resolution stays the same. What happens to the file size?', ['It doubles', 'It stays the same', 'It is 256 times bigger', 'It halves'], 0, 'File size = width × height × colour depth. Doubling the colour depth doubles the size.'],
    ['Which change lets a sound recording capture quick changes in the wave more accurately?', ['A higher sampling rate', 'A lower bit depth', 'A shorter recording', 'Using mono instead of stereo'], 0, 'A higher sampling rate measures the wave more often.'],
    ['What does the bit depth of a sound file decide?', ['How many different values each sample can have', 'How many samples are taken each second', 'How long the recording is', 'How many speakers it plays on'], 0, 'Bit depth is the number of bits stored for each sample.'],
    ['The width and the height of an image are both doubled. How many times bigger is the file?', ['4 times', '2 times', '8 times', '16 times'], 0, 'Twice as wide and twice as high gives 2 × 2 = 4 times as many pixels.'],
    ['What is a pixel?', ['The smallest single-coloured square in an image', 'One sample of a sound wave', 'A group of eight bits', 'The number of colours in an image'], 0, 'An image is a grid of pixels, each storing one colour.']
  ];
  makeQuiz($('#quiz-data'), 'data', [
    () => { const w = pick([16, 32, 40, 64, 80, 100]), hh = pick([8, 16, 20, 32, 50]), d = pick([1, 2, 4, 8, 16, 24]), bits = w * hh * d; return { html: 'An image is <span class="mono">' + w + ' × ' + hh + '</span> pixels with a colour depth of <span class="mono">' + d + '</span> bit' + (d === 1 ? '' : 's') + '. What is its size in <strong>bytes</strong>?', answer: String(bits / 8), hint: 'Multiply width, height and colour depth to get bits, then divide by 8.', work: '<span>' + w + ' × ' + hh + ' × ' + d + ' = ' + num(bits) + ' bits</span><span>' + num(bits) + ' ÷ 8 = ' + num(bits / 8) + ' bytes</span>' }; },
    () => { const d = rnd(1, 10); return { html: 'An image has a colour depth of <span class="mono">' + d + '</span> bit' + (d === 1 ? '' : 's') + '. How many different colours can one pixel be?', answer: String(Math.pow(2, d)), hint: 'Each extra bit doubles the number of colours.', work: '<span>2<sup>' + d + '</sup> = ' + Math.pow(2, d) + '</span>' }; },
    () => { const r = pick([1000, 2000, 4000, 8000, 10000]), d = pick([8, 16]), sec = pick([2, 5, 10, 20, 30]), bits = r * d * sec; return { html: 'A mono recording lasts <span class="mono">' + sec + '</span> seconds. The sampling rate is <span class="mono">' + num(r) + ' Hz</span> and the bit depth is <span class="mono">' + d + '</span>. What is its size in <strong>bytes</strong>?', answer: String(bits / 8), hint: 'Sampling rate × bit depth × seconds gives bits.', work: '<span>' + num(r) + ' × ' + d + ' × ' + sec + ' = ' + num(bits) + ' bits</span><span>' + num(bits) + ' ÷ 8 = ' + num(bits / 8) + ' bytes</span>' }; },
    () => { const c = pick('ABCDEFGHJKLMNPQRSTUVWXYZ'.split('')); const code = c.charCodeAt(0); return { html: 'In ASCII, capital A has the code 65 and the letters follow in order. What is the code for <span class="mono">' + c + '</span>?', answer: String(code), hint: 'Count on from A = 65.', work: '<span>' + c + ' is letter number ' + (code - 64) + ', so its code is 64 + ' + (code - 64) + ' = ' + code + '</span>' }; },
    () => { const k = pick([2, 3, 4, 5, 8]); return { html: 'How many bytes are there in <span class="mono">' + k + ' KiB</span>?', answer: String(k * 1024), hint: '1 KiB is 1024 bytes.', work: '<span>' + k + ' × 1024 = ' + num(k * 1024) + '</span>' }; },
    () => mcq(pick(concept))
  ]);
};
/* shuffle a [question, options, correctIndex, working] item into a quiz question */
function mcq(item) {
  const order = item[1].map((_, i) => i).sort(() => Math.random() - .5);
  return { type: 'mcq', html: item[0], options: order.map(i => item[1][i]), answer: order.indexOf(item[2]), work: '<span>' + item[3] + '</span>' };
}

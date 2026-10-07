'use strict';
/* ---------- 5 computer architecture ---------- */
const OPS = ['HLT', 'LDA', 'STA', 'ADD', 'SUB', 'OUT', 'JMP', 'BRZ'];
const OP_HELP = {
  HLT: ['Halt', 'Stop the program.'],
  LDA: ['Load', 'Copy the value at the address into the accumulator.'],
  STA: ['Store', 'Copy the accumulator into memory at the address.'],
  ADD: ['Add', 'Add the value at the address to the accumulator.'],
  SUB: ['Subtract', 'Subtract the value at the address from the accumulator.'],
  OUT: ['Output', 'Send the accumulator to the output.'],
  JMP: ['Jump', 'Set the PC to the address, so that instruction runs next.'],
  BRZ: ['Branch if zero', 'Jump to the address only if the accumulator holds 0.']
};
const usesAddr = op => ['LDA', 'STA', 'ADD', 'SUB', 'JMP', 'BRZ'].indexOf(op) >= 0;
const mnemonic = byte => { const op = OPS[byte >> 4]; return op ? op + (usesAddr(op) ? ' ' + (byte & 15) : '') : 'not an instruction'; };

INIT.cpu = function () {
  /* 5.2 component explorer */
  (function () {
    const INFO = {
      CU: ['Control Unit (CU)', 'Decodes each instruction and sends control signals to the rest of the computer so that every step happens in the right order. It manages the fetch–decode–execute cycle.'],
      ALU: ['Arithmetic Logic Unit (ALU)', 'Carries out calculations such as add and subtract, and logical comparisons such as "is this equal to zero?". Its results usually go into the accumulator.'],
      PC: ['Program Counter (PC)', 'Holds the address of the next instruction to be fetched. It goes up by 1 during every fetch, unless a jump instruction changes it.'],
      MAR: ['Memory Address Register (MAR)', 'Holds the address of the memory location the CPU is about to read from or write to. Its value is sent along the address bus.'],
      MDR: ['Memory Data Register (MDR)', 'Holds the value that has just been read from memory, or the value about to be written to memory. Everything that crosses the data bus passes through it.'],
      CIR: ['Current Instruction Register (CIR)', 'Holds the instruction that is being decoded and executed right now.'],
      ACC: ['Accumulator (ACC)', 'Holds the value the CPU is working on, including the result of every calculation the ALU does.'],
      ABUS: ['Address bus', 'Carries an address from the CPU to memory. It only goes one way: the CPU chooses the address and memory listens.'],
      DBUS: ['Data bus', 'Carries the value being moved. It goes both ways: from memory to the CPU when reading, and from the CPU to memory when writing.'],
      CBUS: ['Control bus', 'Carries control signals from the control unit, such as "read from memory" or "write to memory".'],
      RAM: ['Random access memory (RAM)', 'Holds the instructions and data of the programs that are running. The CPU can read and change it. It is volatile, which means its contents are lost when the power is switched off.'],
      ROM: ['Read only memory (ROM)', 'Holds the start-up instructions the computer needs when it is switched on. It cannot normally be changed, and it keeps its contents without power.']
    };
    const info = $('#parts-info'), btns = $$('#parts-grid .part');
    function show(key) {
      btns.forEach(b => b.setAttribute('aria-pressed', b.dataset.part === key ? 'true' : 'false'));
      info.replaceChildren(h('h4', { text: INFO[key][0] }), h('p', { text: INFO[key][1] }));
    }
    btns.forEach(b => b.addEventListener('click', () => show(b.dataset.part)));
    show('CU');
  })();

  /* 5.3 fetch-decode-execute simulator */
  const PROGRAMS = [
    { name: 'Add two numbers', desc: 'Loads the number at address 8, adds the number at address 9, stores the answer at address 10 and outputs it.',
      code: [[0, 'LDA', 8], [1, 'ADD', 9], [2, 'STA', 10], [3, 'OUT'], [4, 'HLT'], [8, 'DAT', 25], [9, 'DAT', 17], [10, 'DAT', 0]] },
    { name: 'Count down to zero', desc: 'Outputs the number at address 9, subtracts 1 and repeats until it reaches 0. Watch the PC jump backwards to make the loop.',
      code: [[0, 'LDA', 9], [1, 'OUT'], [2, 'SUB', 10], [3, 'STA', 9], [4, 'BRZ', 6], [5, 'JMP', 0], [6, 'OUT'], [7, 'HLT'], [9, 'DAT', 3], [10, 'DAT', 1]] },
    { name: 'Multiply by repeated adding', desc: 'Works out 4 × 3 by adding 4 to a running total three times. Address 13 holds the number, 14 holds the counter and 12 holds the total.',
      code: [[0, 'LDA', 12], [1, 'ADD', 13], [2, 'STA', 12], [3, 'LDA', 14], [4, 'SUB', 15], [5, 'STA', 14], [6, 'BRZ', 8], [7, 'JMP', 0], [8, 'LDA', 12], [9, 'OUT'], [10, 'HLT'], [12, 'DAT', 0], [13, 'DAT', 4], [14, 'DAT', 3], [15, 'DAT', 1]] }
  ];
  const el = {
    prog: $('#fde-prog'), step: $('#fde-step'), run: $('#fde-run'), reset: $('#fde-reset'), desc: $('#fde-desc'),
    say: $('#fde-say'), cycle: $('#fde-cycle'), cu: $('#cu-text'), alu: $('#alu-text'), ram: $('#ram-body'), out: $('#fde-output'),
    stages: $$('#fde-stages .st'), uCu: $('#u-cu'), uAlu: $('#u-alu'),
    reg: { PC: $('#r-pc'), MAR: $('#r-mar'), MDR: $('#r-mdr'), CIR: $('#r-cir'), ACC: $('#r-acc') },
    bus: { addr: $('#bus-addr'), data: $('#bus-data'), ctrl: $('#bus-ctrl') }
  };
  PROGRAMS.forEach((p, i) => el.prog.append(h('option', { value: i, text: p.name })));
  $('#op-table').innerHTML = '<thead><tr><th>Opcode</th><th class="l">Instruction</th><th class="l">What it does</th></tr></thead><tbody>' +
    OPS.map((op, i) => '<tr><td>' + bin(i, 4) + '</td><td class="l">' + op + (usesAddr(op) ? ' address' : '') + '</td><td class="l" style="font-family:var(--font-body);white-space:normal;min-width:15em">' + OP_HELP[op][1] + '</td></tr>').join('') + '</tbody>';

  let S, base, timer = null, speed = 650;
  const rows = [];
  for (let a = 0; a < 16; a++) {
    const tr = h('tr'), c1 = h('td', { text: String(a).padStart(2, ' ') }), c2 = h('td'), c3 = h('td');
    const inp = h('input', { type: 'number', min: 0, max: 255, id: 'ram-' + a, 'aria-label': 'Value at address ' + a });
    inp.addEventListener('change', () => { let v = parseInt(inp.value, 10); if (isNaN(v)) v = 0; v = Math.max(0, Math.min(255, v)); S.mem[a] = v; base.mem[a] = v; paint(); });
    tr.append(c1, c2, c3); el.ram.append(tr); rows.push({ tr, c2, c3, inp });
  }
  function load(i) {
    const mem = new Array(16).fill(0), kind = new Array(16).fill('');
    PROGRAMS[i].code.forEach(([a, op, arg]) => {
      if (op === 'DAT') { mem[a] = arg; kind[a] = 'dat'; }
      else { mem[a] = OPS.indexOf(op) << 4 | (arg || 0); kind[a] = 'ins'; }
    });
    base = { mem, kind }; el.desc.textContent = PROGRAMS[i].desc; reset();
  }
  function reset() {
    stop();
    S = { mem: base.mem.slice(), kind: base.kind.slice(), PC: 0, MAR: 0, MDR: 0, CIR: 0, ACC: 0, stage: 'fetch', sub: 0, cycle: 1, halted: false, out: [], decoded: false,
      shown: null, text: 'Press <strong>Step</strong> to begin. The PC holds 0, so the first instruction will be fetched from address 0.', rt: '', hl: {}, bus: {}, cu: 'Waiting for an instruction', alu: 'Idle' };
    paint();
  }
  /* one register transfer per call */
  function step() {
    if (S.halted) return;
    const m = S; m.hl = {}; m.bus = {}; m.alu = 'Idle';
    const src = (...k) => k.forEach(x => { m.hl[x] = 'src'; }), dst = (...k) => k.forEach(x => { m.hl[x] = 'dst'; });
    const done = () => { m.stage = 'fetch'; m.sub = 0; m.cycle++; m.decoded = false; };
    const read = () => { m.MDR = m.mem[m.MAR]; src('MAR', 'mem' + m.MAR); dst('MDR'); m.bus = { addr: m.MAR + ' →', ctrl: 'read →', data: '← ' + m.MDR }; };
    m.shown = m.stage;
    if (m.stage === 'fetch') {
      if (m.sub === 0) { m.MAR = m.PC; src('PC'); dst('MAR'); m.rt = 'MAR ← PC'; m.text = 'The address of the next instruction (' + m.PC + ') is copied from the PC into the MAR.'; m.cu = 'Fetching the next instruction'; m.sub = 1; }
      else if (m.sub === 1) { read(); m.rt = 'MDR ← Memory[MAR]'; m.text = 'The address ' + m.MAR + ' goes along the address bus with a read signal. Memory sends back what is stored there, ' + nib(bin(m.MDR)) + ', along the data bus into the MDR.'; m.sub = 2; }
      else if (m.sub === 2) { m.CIR = m.MDR; src('MDR'); dst('CIR'); m.rt = 'CIR ← MDR'; m.text = 'The instruction is copied from the MDR into the CIR, ready to be decoded.'; m.sub = 3; }
      else { const old = m.PC; m.PC = (m.PC + 1) % 16; dst('PC'); m.rt = 'PC ← PC + 1'; m.text = 'The PC goes up from ' + old + ' to ' + m.PC + ', so it now points at the next instruction.'; m.stage = 'decode'; m.sub = 0; }
    } else if (m.stage === 'decode') {
      m.op = m.CIR >> 4; m.arg = m.CIR & 15; m.decoded = true; const op = OPS[m.op];
      src('CIR'); dst('CU'); m.rt = 'Decode CIR';
      m.cu = op ? bin(m.op, 4) + ' = ' + op + (usesAddr(op) ? ', address ' + m.arg : '') : bin(m.op, 4) + ' is not an instruction';
      m.text = op ? 'The control unit splits ' + nib(bin(m.CIR)) + ' into an opcode and an operand. Opcode ' + bin(m.op, 4) + ' means ' + op + ' (' + OP_HELP[op][0].toLowerCase() + ')' + (usesAddr(op) ? ' and operand ' + bin(m.arg, 4) + ' is address ' + m.arg + '.' : '. This instruction does not use its operand.')
        : 'The control unit cannot decode ' + nib(bin(m.CIR)) + '. The opcode ' + bin(m.op, 4) + ' is not in the instruction set. The CPU has run into data, not an instruction.';
      m.stage = 'execute'; m.sub = 0;
    } else {
      const op = OPS[m.op];
      if (!op || op === 'HLT') { m.halted = true; m.rt = 'Halt'; dst('CU'); m.cu = 'Halted'; m.text = op ? 'HLT: the control unit stops the cycle. The program has finished.' : 'There is no such instruction, so the CPU stops.'; }
      else if (op === 'OUT') { m.out.push(m.ACC); src('ACC'); m.rt = 'Output ← ACC'; m.text = 'OUT: the value in the accumulator (' + m.ACC + ') is sent to the output.'; done(); }
      else if (op === 'JMP') { m.PC = m.arg; src('CIR'); dst('PC'); m.rt = 'PC ← ' + m.arg; m.text = 'JMP: the address ' + m.arg + ' is written into the PC. The next fetch will come from address ' + m.arg + ' and not from the next line.'; done(); }
      else if (op === 'BRZ') {
        src('ACC'); m.alu = 'Is ' + m.ACC + ' equal to 0? ' + (m.ACC === 0 ? 'Yes' : 'No'); m.hl.ALU = 'src';
        if (m.ACC === 0) { m.PC = m.arg; dst('PC'); m.rt = 'PC ← ' + m.arg; m.text = 'BRZ: the accumulator holds 0, so the branch is taken. The address ' + m.arg + ' is written into the PC.'; }
        else { m.rt = 'No change'; m.text = 'BRZ: the accumulator holds ' + m.ACC + ', which is not 0, so the branch is not taken. The PC is left alone.'; }
        done();
      }
      else if (m.sub === 0) { m.MAR = m.arg; src('CIR'); dst('MAR'); m.rt = 'MAR ← ' + m.arg; m.text = op + ': the operand, address ' + m.arg + ', is copied into the MAR.'; m.sub = 1; }
      else if (op === 'STA') {
        if (m.sub === 1) { m.MDR = m.ACC; src('ACC'); dst('MDR'); m.rt = 'MDR ← ACC'; m.text = 'STA: the value to be stored (' + m.ACC + ') is copied from the accumulator into the MDR.'; m.sub = 2; }
        else { m.mem[m.MAR] = m.MDR; m.kind[m.MAR] = 'dat'; src('MAR', 'MDR'); dst('mem' + m.MAR); m.bus = { addr: m.MAR + ' →', ctrl: 'write →', data: m.MDR + ' →' }; m.rt = 'Memory[MAR] ← MDR'; m.text = 'STA: the address ' + m.MAR + ' goes along the address bus with a write signal, and the value ' + m.MDR + ' goes along the data bus into that memory location.'; done(); }
      }
      else if (m.sub === 1) { read(); m.rt = 'MDR ← Memory[MAR]'; m.text = op + ': memory sends the value stored at address ' + m.MAR + ', which is ' + m.MDR + ', along the data bus into the MDR.'; m.sub = 2; }
      else if (op === 'LDA') { m.ACC = m.MDR; src('MDR'); dst('ACC'); m.rt = 'ACC ← MDR'; m.text = 'LDA: the value ' + m.MDR + ' is copied from the MDR into the accumulator.'; done(); }
      else {
        const a = m.ACC, b = m.MDR, raw = op === 'ADD' ? a + b : a - b, res = ((raw % 256) + 256) % 256;
        m.ACC = res; src('MDR'); m.hl.ALU = 'src'; dst('ACC'); m.alu = a + (op === 'ADD' ? ' + ' : ' − ') + b + ' = ' + raw + (raw !== res ? ' → wraps to ' + res : '');
        m.rt = 'ACC ← ACC ' + (op === 'ADD' ? '+' : '−') + ' MDR';
        m.text = op + ': the ALU works out ' + a + (op === 'ADD' ? ' + ' : ' − ') + b + ' and the result goes into the accumulator.' + (raw !== res ? ' The true answer, ' + raw + ', does not fit in 8 bits, so it wraps round to ' + res + '.' : '');
        done();
      }
    }
    paint();
    if (m.halted) stop();
  }
  function paint() {
    const m = S;
    el.stages.forEach(st => st.classList.toggle('now', st.dataset.stage === m.shown));
    el.cycle.textContent = m.halted ? 'Halted after ' + m.cycle + ' cycle' + (m.cycle === 1 ? '' : 's') : 'Cycle ' + m.cycle;
    el.say.innerHTML = (m.rt ? '<b class="rt">' + esc(m.rt) + '</b>' : '') + '<span>' + m.text + '</span>';
    el.cu.textContent = m.cu; el.alu.textContent = m.alu;
    const mark = (node, key) => { node.classList.toggle('src', m.hl[key] === 'src'); node.classList.toggle('dst', m.hl[key] === 'dst'); };
    mark(el.uCu, 'CU'); mark(el.uAlu, 'ALU');
    ['PC', 'MAR', 'MDR', 'CIR', 'ACC'].forEach(r => {
      const node = el.reg[r], wide = r === 'PC' || r === 'MAR' ? 4 : 8;
      $('.bin', node).textContent = nib(bin(m[r], wide)); $('.den', node).textContent = m[r]; mark(node, r);
    });
    $('.extra', el.reg.CIR).textContent = m.decoded ? mnemonic(m.CIR) : '';
    ['addr', 'data', 'ctrl'].forEach(b => { el.bus[b].classList.toggle('live', !!m.bus[b]); $('b', el.bus[b]).textContent = m.bus[b] || ''; });
    rows.forEach((row, a) => {
      row.c2.textContent = nib(bin(m.mem[a]));
      const kind = m.kind[a];
      if (kind === 'ins') { row.c3.className = 'ins'; row.c3.textContent = mnemonic(m.mem[a]); }
      else { row.c3.className = ''; if (row.inp.parentNode !== row.c3) row.c3.replaceChildren(row.inp); if (document.activeElement !== row.inp) row.inp.value = m.mem[a]; }
      row.tr.className = (m.hl['mem' + a] || '') + (a === m.PC && !m.halted ? ' pcrow' : '') + (kind ? '' : ' empty');
    });
    el.out.replaceChildren(...(m.out.length ? m.out.map(v => h('span', { class: 'chip', text: v })) : [h('span', { class: 'hint', text: 'Nothing has been output yet.' })]));
    el.step.disabled = m.halted; el.run.disabled = m.halted;
    el.run.textContent = timer ? 'Pause' : 'Run';
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } if (S) el.run.textContent = 'Run'; }
  function start() { stop(); timer = setInterval(step, speed); el.run.textContent = 'Pause'; }
  el.step.addEventListener('click', () => { stop(); step(); });
  el.run.addEventListener('click', () => { if (timer) { stop(); } else { step(); if (!S.halted) start(); } });
  el.reset.addEventListener('click', reset);
  el.prog.addEventListener('change', () => load(+el.prog.value));
  seg($('#fde-speed'), v => { speed = +v; if (timer) start(); });
  load(0);

  /* 5.4 challenge */
  const concept = [
    ['Which register holds the address of the next instruction to be fetched?', ['Program Counter (PC)', 'Accumulator (ACC)', 'Memory Data Register (MDR)', 'Current Instruction Register (CIR)'], 0, 'The PC always points at the next instruction and goes up by 1 during each fetch.'],
    ['Which part of the CPU carries out calculations and comparisons?', ['Arithmetic Logic Unit (ALU)', 'Control Unit (CU)', 'Program Counter (PC)', 'Address bus'], 0, 'The ALU does the arithmetic and the logic.'],
    ['During the fetch stage, where does the PC copy its value to first?', ['Memory Address Register (MAR)', 'Accumulator (ACC)', 'Current Instruction Register (CIR)', 'ALU'], 0, 'The address must be in the MAR before memory can be read.'],
    ['Which register holds the instruction while it is being decoded?', ['Current Instruction Register (CIR)', 'Memory Address Register (MAR)', 'Program Counter (PC)', 'Accumulator (ACC)'], 0, 'The CIR holds the instruction being decoded and executed.'],
    ['Which bus carries values in both directions between the CPU and memory?', ['Data bus', 'Address bus', 'Control bus', 'None of them'], 0, 'Data is read from memory and written to memory, so the data bus is two-way.'],
    ['What is the correct order of the stages?', ['Fetch, decode, execute', 'Decode, fetch, execute', 'Execute, fetch, decode', 'Fetch, execute, decode'], 0, 'An instruction is fetched from memory, decoded by the control unit, then executed.'],
    ['What does the stored program concept say?', ['Instructions and data are kept in the same memory', 'Programs are stored inside the ALU', 'Data is stored in the PC', 'Each program needs its own CPU'], 0, 'Both are binary numbers held in main memory.'],
    ['A jump instruction is executed. Which register does it change?', ['Program Counter (PC)', 'Accumulator (ACC)', 'Memory Data Register (MDR)', 'Current Instruction Register (CIR)'], 0, 'Changing the PC changes which instruction is fetched next.']
  ];
  makeQuiz($('#quiz-cpu'), 'cpu', [
    () => mcq(pick(concept)),
    () => { const op = rnd(1, 7), arg = rnd(0, 15), byte = op << 4 | arg; const opts = OPS.slice(1).sort(() => Math.random() - .5).slice(0, 3); if (opts.indexOf(OPS[op]) < 0) opts[0] = OPS[op]; opts.sort(() => Math.random() - .5); return { type: 'mcq', html: 'The CIR holds <span class="mono">' + nib(bin(byte)) + '</span>. Using the instruction set of the model computer, which instruction is this?', options: opts, answer: opts.indexOf(OPS[op]), work: '<span>The left nibble ' + bin(op, 4) + ' is the opcode for ' + OPS[op] + '. The right nibble ' + bin(arg, 4) + ' is ' + arg + '.</span>' }; },
    () => { const a = rnd(5, 60), b = rnd(5, 60); return { html: 'Memory address 8 holds <span class="mono">' + a + '</span> and address 9 holds <span class="mono">' + b + '</span>. This program runs:<br><span class="mono">LDA 8 &nbsp;→&nbsp; ADD 9 &nbsp;→&nbsp; ADD 9 &nbsp;→&nbsp; OUT &nbsp;→&nbsp; HLT</span><br>What number is output?', answer: String(a + 2 * b), hint: 'Follow the accumulator one instruction at a time.', work: '<span>LDA 8: ACC = ' + a + '</span><span>ADD 9: ACC = ' + (a + b) + '</span><span>ADD 9: ACC = ' + (a + 2 * b) + '</span>' }; },
    () => { const a = rnd(30, 90), b = rnd(5, 25); return { html: 'Memory address 8 holds <span class="mono">' + a + '</span> and address 9 holds <span class="mono">' + b + '</span>. This program runs:<br><span class="mono">LDA 8 &nbsp;→&nbsp; SUB 9 &nbsp;→&nbsp; STA 8 &nbsp;→&nbsp; HLT</span><br>What value does address 8 hold at the end?', answer: String(a - b), hint: 'STA copies the accumulator into memory.', work: '<span>LDA 8: ACC = ' + a + '</span><span>SUB 9: ACC = ' + (a - b) + '</span><span>STA 8: address 8 now holds ' + (a - b) + '</span>' }; },
    () => { const pc = rnd(2, 12); return { html: 'The PC holds <span class="mono">' + pc + '</span>. An instruction that is not a jump is fetched, decoded and executed. What value does the PC hold afterwards?', answer: String(pc + 1), hint: 'What happens to the PC during every fetch?', work: '<span>The PC goes up by 1 during the fetch stage: ' + pc + ' + 1 = ' + (pc + 1) + '</span>' }; }
  ]);
};

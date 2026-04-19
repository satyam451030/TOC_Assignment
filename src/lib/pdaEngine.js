// ═══════════════════════════════════════════════════════
//  PDA ENGINE — pure JS, no React dependencies
// ═══════════════════════════════════════════════════════

export function buildIdx(T) {
  const m = new Map();
  for (const t of T) {
    const k = `${t.from}|${t.input}|${t.top}`;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(t);
  }
  return m;
}

export function getT(m, s, sym, top) {
  const r = [];
  for (const i of sym ? [sym, 'ε'] : ['ε'])
    for (const t of top ? [top, 'ε'] : ['ε']) {
      const x = m.get(`${s}|${i}|${t}`);
      if (x) r.push(...x);
    }
  return r;
}

export function applyT(c, t) {
  const p = t.input !== 'ε' ? c.inputPos + 1 : c.inputPos;
  let s = [...c.stack];
  if (t.top !== 'ε') s.pop();
  if (t.push !== 'ε') {
    const ch = t.push.split('').reverse();
    for (const x of ch) s.push(x);
  }
  return { state: t.to, inputPos: p, stack: s };
}

export function ck(c) {
  return `${c.state}|${c.inputPos}|${c.stack.join(',')}`;
}

export function isAcc(c, len, acceptStates) {
  return c.inputPos === len && acceptStates.has(c.state);
}

export function runPDA(inputStr, cfg) {
  const input = inputStr === 'ε' || !inputStr ? '' : inputStr;
  const is = cfg.initSymbol || 'Z';
  const init = { state: cfg.startState, inputPos: 0, stack: [is] };
  const idx = buildIdx(cfg.transitions);
  const steps = [{ type: 'init', configs: [init], note: `Init: ${init.state}, "${input || 'ε'}", [${is}]` }];
  const vis = new Set([ck(init)]);
  let fr = [init], acc = false, sn = 1;

  while (fr.length && sn < 3000) {
    const nf = [], br = [];
    for (const c of fr) {
      if (isAcc(c, input.length, cfg.acceptStates)) {
        acc = true;
        steps.push({ type: 'acc', configs: [c], note: 'ACCEPT' });
        break;
      }
      const sym = c.inputPos < input.length ? input[c.inputPos] : null;
      const top = c.stack.length ? c.stack[c.stack.length - 1] : null;
      const ts = getT(idx, c.state, sym, top);
      if (!ts.length) steps.push({ type: 'dead', configs: [c], note: `Dead:(${c.state},"${sym || '∎'}","${top || '∅'}")` });
      for (const t of ts) {
        const n = applyT(c, t);
        const k = ck(n);
        if (!vis.has(k)) { vis.add(k); nf.push(n); br.push({ from: c, t, to: n }); }
      }
    }
    if (acc) break;
    if (br.length) steps.push({ type: 'exp', branches: br, configs: nf, note: `→${nf.length} cfg` });
    fr = nf;
    sn++;
  }

  if (!acc) steps.push({ type: 'rej', note: 'REJECT' });
  return { accepted: acc, input, steps };
}

export class StepIter {
  constructor(inputStr, cfg) {
    this.cfg = cfg;
    this.input = inputStr === 'ε' || !inputStr ? '' : inputStr;
    this.idx = buildIdx(cfg.transitions);
    const is = cfg.initSymbol || 'Z';
    const init = { state: cfg.startState, inputPos: 0, stack: [is] };
    this.vis = new Set([ck(init)]);
    this.fr = [init];
    this.sn = 0;
    this.done = false;
    this.accepted = false;
    this._init = { type: 'init', configs: [init], note: `Init: ${init.state}, "${this.input || 'ε'}", [${is}]` };
  }

  next() {
    if (this.done) return null;
    if (this.sn === 0) { this.sn = 1; return this._init; }
    const nf = [], br = [];
    for (const c of this.fr) {
      if (isAcc(c, this.input.length, this.cfg.acceptStates)) {
        this.done = true;
        this.accepted = true;
        return { type: 'acc', configs: [c], note: 'ACCEPT' };
      }
      const sym = c.inputPos < this.input.length ? this.input[c.inputPos] : null;
      const top = c.stack.length ? c.stack[c.stack.length - 1] : null;
      const ts = getT(this.idx, c.state, sym, top);
      for (const t of ts) {
        const n = applyT(c, t);
        const k = ck(n);
        if (!this.vis.has(k)) { this.vis.add(k); nf.push(n); br.push({ from: c, t, to: n }); }
      }
    }
    if (!nf.length) {
      this.done = true;
      return { type: 'rej', configs: [], note: 'REJECT' };
    }
    this.fr = nf;
    return { type: 'exp', branches: br, configs: nf, stepNum: this.sn++, note: `→${nf.length}` };
  }
}

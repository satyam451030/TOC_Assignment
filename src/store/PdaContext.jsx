import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { StepIter, runPDA as engineRunPDA } from '../lib/pdaEngine';
import { PRESETS_DATA, getTransitions } from '../lib/presets';

const PdaContext = createContext(null);

const mkCfg = () => ({
  states: [],
  startState: '',
  acceptStates: new Set(),
  transitions: [],
  initSymbol: 'Z',
});

const mkSim = () => ({
  activeState: null,
  log: [],
  tape: { input: '', pos: 0 },
  stack: [],
  status: { text: 'Idle — press Init to begin', type: '' },
  cfgList: [],
  done: false,
});

export function PdaProvider({ children }) {
  const [cfg, setCfg] = useState(mkCfg());
  const [sim, setSim] = useState(mkSim());
  const [runInput, setRunInput] = useState('');
  const [activePreset, setActivePreset] = useState(null);
  const iterRef = useRef(null);

  // ── Config actions ──────────────────────────────────────
  const loadPreset = useCallback((id) => {
    const p = PRESETS_DATA.find(x => x.id === id);
    if (!p) return;
    setCfg({
      states: [...p.states],
      startState: p.start,
      acceptStates: new Set(p.accept),
      transitions: getTransitions(p),
      initSymbol: p.init,
    });
    iterRef.current = null;
    setSim(mkSim());
    setRunInput(p.test);
    setActivePreset(id);
  }, []);

  const loadDef = useCallback((def) => {
    setCfg({
      states: [...(def.states || [])],
      startState: def.startState || '',
      acceptStates: new Set(def.acceptStates || []),
      transitions: (def.transitions || []).filter(t => t.from && t.to),
      initSymbol: def.startStackSymbol || 'Z',
    });
    iterRef.current = null;
    setSim(mkSim());
    const testStr = def.testStrings?.accept?.[0] || '';
    setRunInput(testStr);
    setActivePreset(null);
  }, []);

  const addState = useCallback((name) => {
    setCfg(prev => {
      if (!name || prev.states.includes(name)) return prev;
      return {
        ...prev,
        states: [...prev.states, name],
        startState: prev.startState || name,
      };
    });
  }, []);

  const removeState = useCallback((name) => {
    setCfg(prev => {
      const states = prev.states.filter(s => s !== name);
      const acceptStates = new Set(prev.acceptStates);
      acceptStates.delete(name);
      return {
        ...prev,
        states,
        startState: prev.startState === name ? (states[0] || '') : prev.startState,
        acceptStates,
        transitions: prev.transitions.filter(t => t.from !== name && t.to !== name),
      };
    });
  }, []);

  const setStartState = useCallback((name) => {
    setCfg(prev => ({ ...prev, startState: name }));
  }, []);

  const toggleAccept = useCallback((name) => {
    setCfg(prev => {
      const acceptStates = new Set(prev.acceptStates);
      if (acceptStates.has(name)) acceptStates.delete(name);
      else acceptStates.add(name);
      return { ...prev, acceptStates };
    });
  }, []);

  const setInitSymbol = useCallback((value) => {
    setCfg(prev => ({ ...prev, initSymbol: value }));
  }, []);

  const addTransition = useCallback((t) => {
    setCfg(prev => ({ ...prev, transitions: [...prev.transitions, t] }));
  }, []);

  const removeTransition = useCallback((index) => {
    setCfg(prev => ({ ...prev, transitions: prev.transitions.filter((_, i) => i !== index) }));
  }, []);

  const clearAll = useCallback(() => {
    setCfg(mkCfg());
    iterRef.current = null;
    setSim(mkSim());
    setRunInput('');
    setActivePreset(null);
  }, []);

  // ── Simulation actions ──────────────────────────────────
  const applyStep = useCallback((iter, step, inputStr) => {
    if (!step) return;
    setSim(prev => {
      const newLog = [...prev.log];
      let newSim = { ...prev };

      if (step.type === 'exp') {
        const c = step.configs[0];
        if (c) {
          newSim.tape = { input: inputStr, pos: c.inputPos };
          newSim.stack = [...c.stack];
          newSim.activeState = c.state;
        }
        step.branches.forEach(b =>
          newLog.push({ text: `${b.from.state}+(${b.t.input})+(${b.t.top})→${b.to.state} [${b.to.stack.join('')}]`, type: 'exp' })
        );
        newSim.status = { text: `Step ${step.stepNum} — ${step.configs.length} config(s)`, type: 'run' };
        newSim.cfgList = step.configs;
      } else if (step.type === 'acc') {
        if (step.configs[0]) {
          newSim.activeState = step.configs[0].state;
          newSim.tape = { input: inputStr, pos: inputStr.length };
        }
        newLog.push({ text: step.note, type: 'acc' });
        newSim.status = { text: `✔ ACCEPTED — "${inputStr || 'ε'}"`, type: 'acc' };
        newSim.done = true;
      } else if (step.type === 'rej') {
        newLog.push({ text: step.note, type: 'rej' });
        newSim.status = { text: `✘ REJECTED — "${inputStr || 'ε'}"`, type: 'rej' };
        newSim.activeState = null;
        newSim.done = true;
      } else if (step.type === 'dead') {
        newLog.push({ text: step.note, type: 'dead' });
      }

      newSim.log = newLog;
      return newSim;
    });
  }, []);

  const initRun = useCallback((cfgArg, inputArg) => {
    const useCfg = cfgArg || cfg;
    const input = inputArg !== undefined ? inputArg : runInput;
    const iter = new StepIter(input, useCfg);
    iterRef.current = iter;
    const is = useCfg.initSymbol || 'Z';
    const initStep = iter.next(); // consume init
    setSim({
      activeState: useCfg.startState,
      tape: { input: input === 'ε' ? '' : input, pos: 0 },
      stack: [is],
      status: { text: `Ready — "${input || 'ε'}" | state: ${useCfg.startState}`, type: 'run' },
      log: [{ text: `Init: ${useCfg.startState}, "${input || 'ε'}", [${is}]`, type: 'init' }],
      cfgList: [],
      done: false,
    });
  }, [cfg, runInput]);

  const stepOnce = useCallback(() => {
    const iter = iterRef.current;
    if (!iter) { initRun(); return; }
    if (iter.done) return;
    const step = iter.next();
    applyStep(iter, step, iter.input);
  }, [initRun, applyStep]);

  const runAll = useCallback((cfgArg, inputArg) => {
    const useCfg = cfgArg || cfg;
    const input = inputArg !== undefined ? inputArg : runInput;
    const iter = new StepIter(input, useCfg);
    iterRef.current = iter;
    const is = useCfg.initSymbol || 'Z';
    iter.next(); // consume init

    const allSteps = [];
    let guard = 0;
    let lastStep = null;
    while (!iter.done && guard++ < 500) {
      const step = iter.next();
      if (!step) break;
      lastStep = step;
      allSteps.push(step);
    }

    // Build final sim state
    let activeState = useCfg.startState;
    let tape = { input: input === 'ε' ? '' : input, pos: 0 };
    let stack = [is];
    let status = { text: `Ready — "${input || 'ε'}" | state: ${useCfg.startState}`, type: 'run' };
    const log = [{ text: `Init: ${useCfg.startState}, "${input || 'ε'}", [${is}]`, type: 'init' }];
    let cfgList = [];
    let done = false;

    for (const step of allSteps) {
      if (step.type === 'exp') {
        const c = step.configs[0];
        if (c) { tape = { input: iter.input, pos: c.inputPos }; stack = [...c.stack]; activeState = c.state; }
        step.branches.forEach(b =>
          log.push({ text: `${b.from.state}+(${b.t.input})+(${b.t.top})→${b.to.state} [${b.to.stack.join('')}]`, type: 'exp' })
        );
        status = { text: `Step ${step.stepNum} — ${step.configs.length} config(s)`, type: 'run' };
        cfgList = step.configs;
      } else if (step.type === 'acc') {
        if (step.configs[0]) { activeState = step.configs[0].state; tape = { input: iter.input, pos: iter.input.length }; }
        log.push({ text: step.note, type: 'acc' });
        status = { text: `✔ ACCEPTED — "${iter.input || 'ε'}"`, type: 'acc' };
        done = true;
      } else if (step.type === 'rej') {
        log.push({ text: step.note, type: 'rej' });
        status = { text: `✘ REJECTED — "${iter.input || 'ε'}"`, type: 'rej' };
        activeState = null;
        done = true;
      } else if (step.type === 'dead') {
        log.push({ text: step.note, type: 'dead' });
      }
    }

    setSim({ activeState, tape, stack, status, log, cfgList, done });
  }, [cfg, runInput]);

  const resetSim = useCallback(() => {
    iterRef.current = null;
    setSim(mkSim());
  }, []);

  const runBatch = useCallback((strings) => {
    return strings.map(s => {
      const r = engineRunPDA(s, cfg);
      return { input: s, accepted: r.accepted };
    });
  }, [cfg]);

  return (
    <PdaContext.Provider value={{
      cfg, sim, runInput, activePreset,
      setRunInput,
      loadPreset, loadDef,
      addState, removeState, setStartState, toggleAccept, setInitSymbol,
      addTransition, removeTransition, clearAll,
      initRun, stepOnce, runAll, resetSim,
      runBatch,
    }}>
      {children}
    </PdaContext.Provider>
  );
}

export function usePda() {
  return useContext(PdaContext);
}

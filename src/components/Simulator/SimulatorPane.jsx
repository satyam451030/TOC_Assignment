import { useRef, useEffect } from 'react';
import { usePda } from '../../store/PdaContext';

export default function SimulatorPane({ onShowDiagram }) {
  const {
    cfg, sim, runInput,
    setRunInput, initRun, stepOnce, runAll, resetSim,
  } = usePda();
  const logRef = useRef(null);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [sim.log]);

  const { tape, stack, status, log, cfgList, activeState } = sim;
  const inputStr = tape.input;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Controls */}
      <div className="sim-top">
        <div className="input-row">
          <div className="iw">
            <div style={{ fontSize: '9px', color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '3px' }}>
              Input string
            </div>
            <input
              id="run-input"
              value={runInput}
              onChange={e => setRunInput(e.target.value)}
              placeholder="type your string, e.g. aaabbb"
              onKeyDown={e => e.key === 'Enter' && initRun()}
            />
          </div>
        </div>
        <div className="ctrl-row">
          <button className="btn btn-blue" onClick={() => initRun()}>Init</button>
          <button className="btn" onClick={stepOnce}>Step ›</button>
          <button className="btn btn-green" onClick={() => runAll()}>Run All</button>
          <button className="btn btn-red" onClick={resetSim}>Reset</button>
          {onShowDiagram && (
            <button className="btn btn-purple" onClick={onShowDiagram}>Diagram</button>
          )}
        </div>
      </div>

      {/* Tape */}
      <div className="tape-bar">
        <div className="tape-label">Input tape</div>
        <div className="tape">
          {!inputStr ? (
            <span style={{ color: 'var(--text3)', fontStyle: 'italic', fontSize: '11px' }}>ε (empty)</span>
          ) : inputStr.split('').map((ch, i) => {
            let cls = 'tc';
            if (i < tape.pos) cls += ' done';
            else if (i === tape.pos) cls += ' cur';
            else cls += ' fut';
            return <div key={i} className={cls}>{ch}</div>;
          })}
        </div>
      </div>

      {/* Body */}
      <div className="sim-body" style={{ flex: 1, overflow: 'hidden' }}>
        <div className="sim-left">
          {/* Status */}
          <div className={`status ${status.type}`}>{status.text}</div>

          {/* States */}
          <div className="sec-lbl">States</div>
          <div className="states-row">
            {cfg.states.map(s => {
              let cls = 'snode';
              if (s === cfg.startState) cls += ' start';
              if (cfg.acceptStates.has(s)) cls += ' acc-state';
              if (s === activeState) cls += ' cur';
              return <span key={s} className={cls}>{s}</span>;
            })}
          </div>

          {/* Active configs */}
          {cfgList.length > 1 && (
            <div className="cfg-tree">
              <div className="sec-lbl">Active configurations</div>
              {cfgList.map((c, i) => {
                const sym = c.inputPos < inputStr.length ? inputStr[c.inputPos] : '∎';
                return (
                  <div key={i} className="cfg-item">
                    <span style={{ color: 'var(--accent)' }}>{c.state}</span>
                    <span style={{ color: 'var(--text3)' }}> pos={c.inputPos} next="{sym}" stack=[</span>
                    <span style={{ color: 'var(--yellow2)' }}>{c.stack.join('')}</span>
                    <span style={{ color: 'var(--text3)' }}>]</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Log */}
          <div className="sec-lbl">Execution log</div>
          <div className="log-list" ref={logRef}>
            {log.map((entry, i) => (
              <div key={i} className={`log-entry ${entry.type}`}>{entry.text}</div>
            ))}
          </div>
        </div>

        {/* Stack */}
        <div className="stack-col">
          <div className="stack-top-lbl">top ↑</div>
          <div className="stack-cells">
            {stack.length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: '10px', textAlign: 'center', padding: '6px' }}>Empty</div>
            ) : [...stack].reverse().map((s, i) => {
              let cls = 'scell';
              if (i === 0) cls += ' top';
              if (i === stack.length - 1) cls += ' bot';
              return <div key={i} className={cls}>{s}</div>;
            })}
          </div>
          <div className="stack-bot-lbl">btm ↓</div>
        </div>
      </div>

      {/* Mobile FAB */}
      <div className={`fab-row ${sim.activeState !== null || sim.log.length > 0 ? 'show' : ''}`}>
        <button className="fab fab-init" onClick={() => initRun()}>Init</button>
        <button className="fab fab-step" onClick={stepOnce}>Step</button>
        <button className="fab fab-run" onClick={() => runAll()}>Run</button>
        <button className="fab fab-reset" onClick={resetSim}>Reset</button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { usePda } from '../../store/PdaContext';

export default function ConfigPanel() {
  const {
    cfg, addState, removeState, setStartState, toggleAccept, setInitSymbol,
    addTransition, removeTransition, clearAll,
  } = usePda();

  const [newState, setNewState] = useState('');
  const [tFrom, setTFrom] = useState('');
  const [tIn, setTIn] = useState('');
  const [tTop, setTTop] = useState('');
  const [tTo, setTTo] = useState('');
  const [tPush, setTPush] = useState('');

  const stateOpts = cfg.states.map(s => (
    <option key={s} value={s}>{s}</option>
  ));

  function handleAddState() {
    if (!newState.trim()) return;
    addState(newState.trim());
    setNewState('');
  }

  function handleAddTransition() {
    const from = tFrom || cfg.states[0];
    const to = tTo || cfg.states[0];
    if (!from || !to) return;
    addTransition({
      from,
      input: tIn.trim() || 'ε',
      top: tTop.trim() || 'ε',
      to,
      push: tPush.trim() || 'ε',
    });
    setTIn(''); setTTop(''); setTPush('');
  }

  return (
    <div className="config-wrap">
      {/* States */}
      <div className="section">
        <div className="section-title">States</div>
        <div className="row field" style={{ marginBottom: '6px' }}>
          <input
            value={newState}
            onChange={e => setNewState(e.target.value)}
            placeholder="e.g. q0"
            onKeyDown={e => e.key === 'Enter' && handleAddState()}
          />
          <button className="btn btn-blue sm" onClick={handleAddState}>+ Add</button>
        </div>
        <div className="field">
          <label>Start state</label>
          <select
            value={cfg.startState}
            onChange={e => setStartState(e.target.value)}
          >
            {stateOpts}
          </select>
        </div>
        <div className="field">
          <label>Accept states (tap to toggle)</label>
          <div className="tags">
            {cfg.states.map(s => (
              <span
                key={s}
                className={`tag ${cfg.acceptStates.has(s) ? 'on' : ''}`}
                onClick={() => toggleAccept(s)}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Initial stack symbol</label>
          <input
            value={cfg.initSymbol}
            maxLength={2}
            style={{ width: '60px' }}
            onChange={e => setInitSymbol(e.target.value)}
          />
        </div>
      </div>

      {/* Add Transition */}
      <div className="section">
        <div className="section-title">Add Transition</div>
        <div className="row field">
          <div>
            <label>From</label>
            <select value={tFrom} onChange={e => setTFrom(e.target.value)}>
              {stateOpts}
            </select>
          </div>
          <div>
            <label>Input (ε=skip)</label>
            <input value={tIn} onChange={e => setTIn(e.target.value)} placeholder="a or ε" maxLength={1} />
          </div>
        </div>
        <div className="row field">
          <div>
            <label>Stack top (ε=any)</label>
            <input value={tTop} onChange={e => setTTop(e.target.value)} placeholder="A or ε" maxLength={1} />
          </div>
          <div>
            <label>To</label>
            <select value={tTo} onChange={e => setTTo(e.target.value)}>
              {stateOpts}
            </select>
          </div>
        </div>
        <div className="row field">
          <div>
            <label>Push (ε=pop, left=top)</label>
            <input value={tPush} onChange={e => setTPush(e.target.value)} placeholder="AB or ε" />
          </div>
          <button className="btn btn-blue sm" onClick={handleAddTransition}>Add</button>
        </div>

        <div className="trans-list">
          {cfg.transitions.length === 0 ? (
            <div style={{ color: 'var(--text3)', fontSize: '10px', padding: '4px' }}>No transitions yet</div>
          ) : cfg.transitions.map((t, i) => (
            <div key={i} className="trans-item">
              <div className="trans-text">
                <span className="trans-from">{t.from}</span>
                <span style={{ color: 'var(--text3)' }}>→</span>
                <span className="trans-to">{t.to}</span>
                <span style={{ color: 'var(--text3)', margin: '0 4px' }}>|</span>
                <span className="trans-rule">{t.input},{t.top}/{t.push}</span>
              </div>
              <button className="trans-del" onClick={() => removeTransition(i)}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Clear */}
      <div className="section">
        <button className="btn btn-purple" style={{ width: '100%' }} onClick={clearAll}>
          ✎ Clear — Start Custom PDA
        </button>
      </div>
    </div>
  );
}

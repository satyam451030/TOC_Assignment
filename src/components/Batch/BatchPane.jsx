import { useState } from 'react';
import { usePda } from '../../store/PdaContext';

export default function BatchPane() {
  const { runBatch } = usePda();
  const [batchInput, setBatchInput] = useState('');
  const [results, setResults] = useState(null);

  function handleRun() {
    const strings = batchInput.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    if (!strings.length) return;
    const res = runBatch(strings);
    setResults(res);
  }

  const acceptCount = results ? results.filter(r => r.accepted).length : 0;

  return (
    <div className="pane" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="batch-wrap" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="batch-input-area">
          <div className="section-title">Test strings (one per line or comma-separated)</div>
          <textarea
            value={batchInput}
            onChange={e => setBatchInput(e.target.value)}
            style={{ height: '70px', resize: 'none', margin: '.4rem 0' }}
            placeholder={'Enter strings, one per line or comma-separated'}
          />
          <button className="btn btn-green" style={{ width: '100%' }} onClick={handleRun}>
            Run Batch Test
          </button>
        </div>

        {results ? (
          <div>
            <div className="bsummary">
              <span>Total: <strong>{results.length}</strong></span>
              <span style={{ color: 'var(--green)' }}>✔ {acceptCount}</span>
              <span style={{ color: 'var(--red)' }}>✘ {results.length - acceptCount}</span>
            </div>
            {results.map((r, i) => (
              <div key={i} className="batch-row">
                <span className="bstr">"{r.input}"</span>
                <span className={`bverd ${r.accepted ? 'ok' : 'no'}`}>
                  {r.accepted ? 'ACCEPT' : 'REJECT'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--text3)', fontSize: '11px' }}>
            Enter strings and click Run Batch Test.
          </div>
        )}
      </div>
    </div>
  );
}

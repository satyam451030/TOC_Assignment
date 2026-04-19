import { usePda } from '../../store/PdaContext';
import { PRESETS_DATA } from '../../lib/presets';

export default function PresetList({ onLoad }) {
  const { loadPreset, activePreset } = usePda();

  function handleLoad(id) {
    loadPreset(id);
    if (onLoad) onLoad();
  }

  return (
    <div className="presets-wrap">
      {PRESETS_DATA.map((p, i) => {
        if (p.group) {
          return <div key={i} className="preset-group-title">{p.group}</div>;
        }
        return (
          <div
            key={p.id}
            className={`preset-item ${activePreset === p.id ? 'active' : ''}`}
            onClick={() => handleLoad(p.id)}
          >
            <div>
              <div className="preset-name">{p.name}</div>
              <div className="preset-desc">{p.desc}</div>
            </div>
            <button
              className="preset-load"
              onClick={e => { e.stopPropagation(); handleLoad(p.id); }}
            >
              Load
            </button>
          </div>
        );
      })}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { PdaProvider, usePda } from './store/PdaContext';
import AIGenerator from './components/AI/AIGenerator';
import PresetList from './components/Presets/PresetList';
import ConfigPanel from './components/Config/ConfigPanel';
import SimulatorPane from './components/Simulator/SimulatorPane';
import DiagramPane from './components/Diagram/DiagramPane';
import BatchPane from './components/Batch/BatchPane';
import HomePage from './components/Home/HomePage';
import './index.css';

// ─── Sidebar tab IDs ───────────────────────────────────
const SIDE_TABS = ['ai', 'presets', 'config'];
// ─── Main tab IDs (mobile) ────────────────────────────
const MAIN_TABS = ['sim', 'diag', 'batch'];
const MOBILE_TABS = ['ai', 'presets', 'config', 'sim', 'diag', 'batch'];

function AppInner({ initialView, onGoHome }) {
  const { loadPreset } = usePda();

  // Desktop sidebar tab
  const [sideTab, setSideTab] = useState(initialView === 'ai' ? 'ai' : 'ai');
  // Desktop main tab  
  const [mainTab, setMainTab] = useState(initialView === 'diag' ? 'diag' : initialView === 'batch' ? 'batch' : 'sim');
  // Mobile unified tab
  const [mobileTab, setMobileTab] = useState(initialView || 'sim');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 700);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e) => {
      setSidebarWidth(Math.max(200, Math.min(e.clientX, 800)));
    };
    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Load default preset on mount
  useEffect(() => {
    loadPreset('anbn');
  }, []);

  const goSimulate = () => {
    if (isMobile) setMobileTab('sim');
    else setMainTab('sim');
  };

  const goPresets = () => {
    if (isMobile) setMobileTab('presets');
    else setSideTab('presets');
  };

  const activeMobileMain = isMobile ? mobileTab : null;
  const diagVisible = isMobile ? mobileTab === 'diag' : mainTab === 'diag';

  return (
    <div className="app">
      {/* ══ Mobile Header ══ */}
      <div className="mobile-hdr" style={{ flexShrink: 0 }}>
        <div className="logo" onClick={onGoHome} style={{ cursor: 'pointer' }}>PDA<span>SIMULATOR</span></div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <span className="badge">NPDA</span>
          <span className="badge badge-purple">AI</span>
        </div>
      </div>

      {/* ══ SIDEBAR (desktop) ══ */}
      <aside className="sidebar" style={{ width: isMobile ? undefined : sidebarWidth }}>
        <div className="sidebar-logo">
          <div className="logo" onClick={onGoHome} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Back to Home">
            <span style={{ marginRight: '6px', fontSize: '16px' }}>🏠</span> PDA<span>SIMULATOR</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <span className="badge">NPDA</span>
            <span className="badge badge-purple">AI</span>
          </div>
        </div>

        <div className="side-tabs">
          {[
            { id: 'ai', label: '🤖 AI Generator' },
            { id: 'presets', label: '📚 Presets (26)' },
            { id: 'config', label: '⚙ Config' },
          ].map(tab => (
            <div
              key={tab.id}
              className={`stab ${sideTab === tab.id ? 'active' : ''}`}
              onClick={() => setSideTab(tab.id)}
            >
              {tab.label}
            </div>
          ))}
        </div>

        <div className="side-content">
          {sideTab === 'ai' && <AIGenerator onGoSimulate={goSimulate} />}
          {sideTab === 'presets' && <PresetList onLoad={goSimulate} />}
          {sideTab === 'config' && <ConfigPanel />}
        </div>
      </aside>

      {/* ══ RESIZER ══ */}
      {!isMobile && (
        <div 
          className={`resizer ${isResizing ? 'active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
        />
      )}

      {/* ══ MAIN AREA ══ */}
      <div className="main-area">
        {/* Mobile tab nav */}
        <div className="tab-nav">
          {[
            { id: 'ai', label: '🤖 AI' },
            { id: 'presets', label: '📚 Presets' },
            { id: 'config', label: '⚙ Config' },
            { id: 'sim', label: '▶ Simulate' },
            { id: 'diag', label: '📊 Diagram' },
            { id: 'batch', label: '🧪 Batch' },
          ].map(tab => (
            <div
              key={tab.id}
              className={`tnav ${mobileTab === tab.id ? 'active' : ''}`}
              onClick={() => setMobileTab(tab.id)}
            >
              {tab.label}
            </div>
          ))}
        </div>

        {/* Desktop: main tab bar */}
        {!isMobile && (
          <div style={{
            display: 'flex', borderBottom: '1px solid var(--border)',
            background: 'var(--bg2)', flexShrink: 0,
          }}>
            {[
              { id: 'sim', label: '▶ Simulate' },
              { id: 'diag', label: '📊 Diagram' },
              { id: 'batch', label: '🧪 Batch' },
            ].map(tab => (
              <div
                key={tab.id}
                style={{
                  padding: '.55rem 1rem', fontSize: '11px', cursor: 'pointer',
                  fontFamily: 'var(--mono)', color: mainTab === tab.id ? 'var(--accent)' : 'var(--text3)',
                  borderBottom: mainTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'all .15s',
                }}
                onClick={() => setMainTab(tab.id)}
              >
                {tab.label}
              </div>
            ))}
          </div>
        )}

        {/* Pane content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Simulator */}
          <div style={{
            display: (isMobile ? mobileTab === 'sim' : mainTab === 'sim') ? 'flex' : 'none',
            flexDirection: 'column', flex: 1, overflow: 'hidden',
          }}>
            <SimulatorPane
              onShowDiagram={() => {
                if (isMobile) setMobileTab('diag');
                else setMainTab('diag');
              }}
            />
          </div>

          {/* Diagram */}
          <div style={{
            display: (isMobile ? mobileTab === 'diag' : mainTab === 'diag') ? 'flex' : 'none',
            flexDirection: 'column', flex: 1, overflow: 'hidden',
          }}>
            <DiagramPane isVisible={diagVisible} />
          </div>

          {/* Batch */}
          <div style={{
            display: (isMobile ? mobileTab === 'batch' : mainTab === 'batch') ? 'flex' : 'none',
            flexDirection: 'column', flex: 1, overflow: 'hidden',
          }}>
            <BatchPane />
          </div>

          {/* Mobile: AI / Presets / Config */}
          {isMobile && mobileTab === 'ai' && (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <AIGenerator onGoSimulate={goSimulate} />
            </div>
          )}
          {isMobile && mobileTab === 'presets' && (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <PresetList onLoad={goSimulate} />
            </div>
          )}
          {isMobile && mobileTab === 'config' && (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <ConfigPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const getInitialState = () => {
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('sim')) {
      const parts = hash.split('-');
      return { started: true, view: parts[1] || 'sim' };
    }
    return { started: false, view: null };
  };

  const [appState, setAppState] = useState(getInitialState());

  useEffect(() => {
    const onHashChange = () => {
      setAppState(getInitialState());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleStart = (view) => {
    window.location.hash = `sim-${view}`;
  };
  
  const handleGoHome = () => {
    window.location.hash = '';
  };
  
  return (
    <PdaProvider>
      {appState.started ? (
        <AppInner initialView={appState.view} onGoHome={handleGoHome} />
      ) : (
        <HomePage onStart={handleStart} />
      )}
    </PdaProvider>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePda } from '../../store/PdaContext';

function arrowHead(ctx, x1, y1, x2, y2, color, sz) {
  const a = Math.atan2(y2 - y1, x2 - x1), sp = 0.42;
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - sz * Math.cos(a - sp), y2 - sz * Math.sin(a - sp));
  ctx.lineTo(x2 - sz * Math.cos(a + sp), y2 - sz * Math.sin(a + sp));
  ctx.closePath(); ctx.fill();
}

function rr(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
}

function edgeLabel(ctx, x, y, label, isAct) {
  const lines = label.split('\n');
  ctx.font = '400 9px JetBrains Mono,monospace';
  const lh = 12, pad = 3;
  const mw = Math.max(...lines.map(l => ctx.measureText(l).width));
  const th = lines.length * lh;
  ctx.fillStyle = isAct ? 'rgba(8,12,20,0.92)' : 'rgba(10,13,18,0.88)';
  ctx.beginPath(); rr(ctx, x - mw / 2 - pad, y - th / 2 - pad + 1, mw + pad * 2, th + pad * 2, 3); ctx.fill();
  ctx.strokeStyle = isAct ? 'rgba(88,166,255,0.3)' : 'rgba(48,54,61,0.5)';
  ctx.lineWidth = 0.5; ctx.beginPath(); rr(ctx, x - mw / 2 - pad, y - th / 2 - pad + 1, mw + pad * 2, th + pad * 2, 3); ctx.stroke();
  ctx.fillStyle = isAct ? '#58a6ff' : '#d29922';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((line, i) => ctx.fillText(line, x, y - (lines.length - 1) * lh / 2 + i * lh + 1));
}

function drawStraight(ctx, p1, p2, R, label, isAct) {
  const a = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const sx = p1.x + R * Math.cos(a), sy = p1.y + R * Math.sin(a);
  const ex = p2.x - R * Math.cos(a), ey = p2.y - R * Math.sin(a);
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  arrowHead(ctx, sx, sy, ex, ey, ctx.strokeStyle, 8);
  edgeLabel(ctx, (sx + ex) / 2 - Math.sin(a) * 14, (sy + ey) / 2 + Math.cos(a) * 14, label, isAct);
}

function drawCurved(ctx, p1, p2, R, label, isAct) {
  const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x, dy = p2.y - p1.y, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, bend = 42;
  const cpx = mx + nx * bend, cpy = my + ny * bend;
  const a1 = Math.atan2(cpy - p1.y, cpx - p1.x);
  const sx = p1.x + R * Math.cos(a1), sy = p1.y + R * Math.sin(a1);
  const a2 = Math.atan2(p2.y - cpy, p2.x - cpx);
  const ex = p2.x - R * Math.cos(a2), ey = p2.y - R * Math.sin(a2);
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cpx, cpy, ex, ey); ctx.stroke();
  arrowHead(ctx, cpx, cpy, ex, ey, ctx.strokeStyle, 8);
  edgeLabel(ctx, cpx + nx * 12, cpy + ny * 12, label, isAct);
}

function drawSelfLoop(ctx, pos, R, label, isAct) {
  const cy2 = pos.y - R - 18, lr = 18;
  ctx.beginPath(); ctx.arc(pos.x, cy2, lr, 0, Math.PI * 2); ctx.stroke();
  arrowHead(ctx, pos.x - 2, cy2 + lr - 6, pos.x, cy2 + lr + 1, ctx.strokeStyle, 7);
  edgeLabel(ctx, pos.x - lr - 8, cy2, label, isAct);
}

export default function DiagramPane({ isVisible }) {
  const { cfg, sim } = usePda();
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const nodePosRef = useRef({});
  const dragNodeRef = useRef(null);
  const dragOffRef = useRef({ x: 0, y: 0 });

  const activeState = sim.activeState;

  function layoutNodes() {
    nodePosRef.current = {};
    const states = cfg.states; if (!states.length) return;
    const wrap = wrapRef.current; if (!wrap) return;
    const W = wrap.clientWidth, H = wrap.clientHeight, n = states.length;
    if (n === 1) { nodePosRef.current[states[0]] = { x: W / 2, y: H / 2 }; return; }
    const r = Math.min(W, H) * 0.33, cx = W / 2, cy = H / 2;
    const si = Math.max(0, states.indexOf(cfg.startState));
    states.forEach((s, i) => {
      const rot = (i - si + n) % n;
      const a = (rot / n) * 2 * Math.PI - Math.PI / 2;
      nodePosRef.current[s] = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    });
  }

  const drawDiagram = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const W = wrap.clientWidth, H = wrap.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
    ctx.fillStyle = '#080b0e'; ctx.fillRect(0, 0, W, H);
    // dot grid
    ctx.fillStyle = 'rgba(88,166,255,0.03)';
    for (let x = 20; x < W; x += 40) for (let y = 20; y < H; y += 40) {
      ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
    }
    if (!cfg.states.length) {
      ctx.fillStyle = '#484f58'; ctx.font = '12px JetBrains Mono,monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('No states defined', W / 2, H / 2); return;
    }
    // ensure positions
    for (const s of cfg.states) if (!nodePosRef.current[s]) layoutNodes();
    const R = 26;
    ctx.font = '10px JetBrains Mono,monospace';
    const edgeMap = new Map();
    for (const t of cfg.transitions) {
      const k = `${t.from}|||${t.to}`;
      if (!edgeMap.has(k)) edgeMap.set(k, []);
      edgeMap.get(k).push(t);
    }
    for (const [key, trans] of edgeMap) {
      const [from, to] = key.split('|||');
      const p1 = nodePosRef.current[from], p2 = nodePosRef.current[to]; if (!p1 || !p2) continue;
      const label = trans.map(t => `${t.input},${t.top}/${t.push}`).join('\n');
      const isAct = from === activeState || to === activeState;
      const hasRev = edgeMap.has(`${to}|||${from}`);
      ctx.strokeStyle = isAct ? 'rgba(88,166,255,0.6)' : 'rgba(48,54,61,0.9)';
      ctx.fillStyle = isAct ? 'rgba(88,166,255,0.6)' : 'rgba(48,54,61,0.9)';
      ctx.lineWidth = isAct ? 1.8 : 1.2;
      if (from === to) drawSelfLoop(ctx, p1, R, label, isAct);
      else if (hasRev) drawCurved(ctx, p1, p2, R, label, isAct);
      else drawStraight(ctx, p1, p2, R, label, isAct);
    }
    for (const s of cfg.states) {
      const p = nodePosRef.current[s]; if (!p) continue;
      const isAcc = cfg.acceptStates.has(s), isCur = s === activeState, isStart = s === cfg.startState;
      if (isCur) {
        ctx.save(); ctx.shadowColor = '#58a6ff'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(p.x, p.y, R + 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(88,166,255,0.2)'; ctx.lineWidth = 5; ctx.stroke(); ctx.restore();
      }
      ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
      ctx.fillStyle = isCur ? 'rgba(88,166,255,0.18)' : isAcc ? 'rgba(63,185,80,0.08)' : '#161b22';
      ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
      ctx.strokeStyle = isCur ? '#58a6ff' : isAcc ? '#3fb950' : '#30363d';
      ctx.lineWidth = isCur ? 2.5 : 1.5; ctx.stroke();
      if (isAcc) {
        ctx.beginPath(); ctx.arc(p.x, p.y, R - 5, 0, Math.PI * 2);
        ctx.strokeStyle = isCur ? 'rgba(88,166,255,0.5)' : 'rgba(63,185,80,0.6)';
        ctx.lineWidth = 1; ctx.stroke();
      }
      if (isStart) {
        const len = 22, ang = Math.PI;
        const ex = p.x + (R + 2) * Math.cos(ang), ey = p.y + (R + 2) * Math.sin(ang);
        const sx = ex + len * Math.cos(ang + Math.PI), sy = ey + len * Math.sin(ang + Math.PI);
        ctx.strokeStyle = '#484f58'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        arrowHead(ctx, sx, sy, ex, ey, '#484f58', 8);
      }
      ctx.font = `600 11px 'JetBrains Mono',monospace`;
      ctx.fillStyle = isCur ? '#58a6ff' : isAcc ? '#3fb950' : '#8b949e';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(s, p.x, p.y);
    }
  }, [cfg, activeState]);

  // Redraw whenever cfg or activeState changes
  useEffect(() => {
    if (isVisible) drawDiagram();
  }, [cfg, activeState, isVisible, drawDiagram]);

  // Layout when first made visible
  useEffect(() => {
    if (isVisible) {
      if (!Object.keys(nodePosRef.current).length) layoutNodes();
      drawDiagram();
    }
  }, [isVisible]);

  // Resize observer
  useEffect(() => {
    const wrap = wrapRef.current; if (!wrap) return;
    const obs = new ResizeObserver(() => {
      if (isVisible) { nodePosRef.current = {}; layoutNodes(); drawDiagram(); }
    });
    obs.observe(wrap);
    return () => obs.disconnect();
  }, [isVisible, drawDiagram]);

  // Drag
  function getXY(e, canvas) {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  }
  function hitTest(x, y) {
    for (const [s, p] of Object.entries(nodePosRef.current)) {
      if (Math.hypot(x - p.x, y - p.y) <= 30) return s;
    }
    return null;
  }
  function onMouseDown(e) {
    const { x, y } = getXY(e, canvasRef.current);
    const h = hitTest(x, y);
    if (h) { dragNodeRef.current = h; dragOffRef.current = { x: x - nodePosRef.current[h].x, y: y - nodePosRef.current[h].y }; e.preventDefault(); }
  }
  function onMouseMove(e) {
    if (!dragNodeRef.current) return;
    const { x, y } = getXY(e, canvasRef.current);
    nodePosRef.current[dragNodeRef.current] = { x: x - dragOffRef.current.x, y: y - dragOffRef.current.y };
    drawDiagram(); e.preventDefault();
  }
  function onMouseUp() { dragNodeRef.current = null; }

  function handleLayout() { nodePosRef.current = {}; layoutNodes(); drawDiagram(); }

  function handleDownload() {
    drawDiagram();
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = 'pda-diagram.png'; link.href = canvas.toDataURL('image/png'); link.click();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="diag-bar">
        <button className="btn btn-blue" onClick={handleLayout}>↺ Layout</button>
        <button className="btn" onClick={handleDownload}>⬇ PNG</button>
        <span className="diag-hint">Drag nodes to move</span>
      </div>
      <div className="diag-wrap" ref={wrapRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          id="dgc"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onTouchStart={onMouseDown}
          onTouchMove={onMouseMove}
          onTouchEnd={onMouseUp}
        />
        <div className="diag-legend">
          <div><span className="ldot" style={{ background: 'rgba(88,166,255,.2)', borderColor: '#58a6ff' }} />Active</div>
          <div><span className="ldot" style={{ background: 'rgba(63,185,80,.12)', borderColor: '#3fb950' }} />Accept ◎</div>
          <div><span className="ldot" style={{ background: '#161b22', borderColor: '#30363d' }} />State</div>
        </div>
      </div>
    </div>
  );
}

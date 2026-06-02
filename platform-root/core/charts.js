/** OBSIDIAN v4.0 — core/charts.js · Platform.Charts · dependency-free SVG charts (dedup target).
 *  Token-driven (no literal colors); returns live <svg> nodes. Used by aggregators for trend/
 *  distribution visuals over Entities.counts(). Accessible: each chart carries role/aria-label. */
const NS = 'http://www.w3.org/2000/svg';
const PALETTE = ['var(--color-brand-primary)', 'var(--color-brand-accent)', 'var(--color-warning)',
  'var(--color-success)', 'var(--color-danger)', 'var(--color-text-muted)'];

function svg(w, h, label) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', `0 0 ${w} ${h}`); s.setAttribute('width', '100%'); s.setAttribute('height', String(h));
  s.setAttribute('role', 'img'); if (label) s.setAttribute('aria-label', label);
  return s;
}
function node(name, attrs) { const n = document.createElementNS(NS, name); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; }

export const Charts = {
  /** Line sparkline from [{date,count}] or [n,…]. */
  sparkline(series, { width = 240, height = 56, label = 'trend' } = {}) {
    const vals = (series || []).map((p) => (typeof p === 'number' ? p : Number(p.count) || 0));
    const s = svg(width, height, label);
    if (vals.length < 2) return s;
    const max = Math.max(1, ...vals), pad = 4, w = width - pad * 2, h = height - pad * 2;
    const pts = vals.map((v, i) => `${pad + (i / (vals.length - 1)) * w},${pad + h - (v / max) * h}`);
    s.append(node('polyline', { points: pts.join(' '), fill: 'none', stroke: PALETTE[0], 'stroke-width': '2',
      'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    const [lx, ly] = pts[pts.length - 1].split(',');
    s.append(node('circle', { cx: lx, cy: ly, r: '2.5', fill: PALETTE[0] }));
    return s;
  },

  /** Vertical bars from [{date,count}] or [n,…]. */
  bars(series, { width = 240, height = 56, label = 'bars' } = {}) {
    const vals = (series || []).map((p) => (typeof p === 'number' ? p : Number(p.count) || 0));
    const s = svg(width, height, label); if (!vals.length) return s;
    const max = Math.max(1, ...vals), gap = 2, bw = (width / vals.length) - gap;
    vals.forEach((v, i) => {
      const bh = (v / max) * (height - 4);
      s.append(node('rect', { x: i * (bw + gap), y: height - bh, width: Math.max(1, bw), height: bh,
        rx: '1', fill: PALETTE[0], opacity: '0.85' }));
    });
    return s;
  },

  /** Donut from a {label:count} map; returns { svg, legend } nodes. */
  donut(map, { size = 132, thickness = 18, label = 'distribution' } = {}) {
    const entries = Object.entries(map || {}).filter(([k, v]) => k && k !== 'unknown' && v > 0);
    const total = entries.reduce((a, [, v]) => a + v, 0) || 1;
    const s = svg(size, size, label); const r = (size - thickness) / 2, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r;
    s.append(node('circle', { cx, cy, r, fill: 'none', stroke: 'var(--color-surface-sunken)', 'stroke-width': thickness }));
    let offset = 0;
    entries.forEach(([, v], i) => {
      const frac = v / total, len = frac * C;
      s.append(node('circle', { cx, cy, r, fill: 'none', stroke: PALETTE[i % PALETTE.length],
        'stroke-width': thickness, 'stroke-dasharray': `${len} ${C - len}`, 'stroke-dashoffset': String(-offset),
        transform: `rotate(-90 ${cx} ${cy})` }));
      offset += len;
    });
    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex;flex-direction:column;gap:var(--space-1);font-size:var(--size-caption)';
    entries.forEach(([k, v], i) => {
      const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:var(--space-2)';
      const dot = document.createElement('span'); dot.style.cssText = `width:10px;height:10px;border-radius:50%;background:${PALETTE[i % PALETTE.length]}`;
      const txt = document.createElement('span'); txt.style.color = 'var(--color-text-muted)';
      txt.textContent = `${k} · ${v}`;
      row.append(dot, txt); legend.append(row);
    });
    return { svg: s, legend };
  }
};

export default Charts;

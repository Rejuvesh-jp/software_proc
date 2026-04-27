import React, { useEffect, useRef } from 'react';

export default function ProgressBar({ value = 0, max = 100, color = 'var(--teal)', height = 10, label, count }) {
  const barRef = useRef(null);
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    el.style.width = '0%';
    requestAnimationFrame(() => {
      el.style.transition = 'width 1s ease-out';
      el.style.width = `${pct}%`;
    });
  }, [pct]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {label && (
        <span style={{ width: 70, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flexShrink: 0 }}>{label}</span>
      )}
      <div style={{ flex: 1, background: 'var(--bg-elevated)', borderRadius: 100, height, overflow: 'hidden' }}>
        <div
          ref={barRef}
          style={{ height: '100%', background: color, borderRadius: 100, width: '0%' }}
        />
      </div>
      {count !== undefined && (
        <span style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          color: 'white',
          fontSize: 12,
          padding: '2px 10px',
          borderRadius: 100,
          flexShrink: 0,
        }}>{count}</span>
      )}
      <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, width: 32, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

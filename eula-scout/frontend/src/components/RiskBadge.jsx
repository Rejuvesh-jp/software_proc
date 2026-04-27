import React from 'react';

const CONFIG = {
  Critical: { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  text: '#EF4444', dot: '#EF4444' },
  High:     { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.4)', text: '#F97316', dot: '#F97316' },
  Medium:   { bg: 'rgba(234,179,8,0.15)',  border: 'rgba(234,179,8,0.4)',  text: '#EAB308', dot: '#EAB308' },
  Low:      { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.4)',  text: '#22C55E', dot: '#22C55E' },
};

export default function RiskBadge({ level, size = 'sm' }) {
  const c = CONFIG[level] || CONFIG['Medium'];
  const pad = size === 'lg' ? '5px 14px' : '3px 10px';
  const fs  = size === 'lg' ? '12px' : '10px';
  return (
    <span
      className="risk-badge"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        padding: pad,
        fontSize: fs,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0, display: 'inline-block' }} />
      {level} Risk
    </span>
  );
}


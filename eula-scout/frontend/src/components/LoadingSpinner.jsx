import React from 'react';

const SIZES = { sm: 16, md: 24, lg: 40 };

export default function LoadingSpinner({ size = 'md' }) {
  const dim = SIZES[size] || 24;
  const stroke = size === 'sm' ? 2.5 : size === 'lg' ? 4 : 3;
  const r = (dim - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg
      width={dim} height={dim}
      viewBox={`0 0 ${dim} ${dim}`}
      style={{ animation: 'spin-teal 0.8s linear infinite', display: 'block', flexShrink: 0 }}
    >
      <circle
        cx={dim / 2} cy={dim / 2} r={r}
        fill="none"
        stroke="rgba(0,201,177,0.2)"
        strokeWidth={stroke}
      />
      <circle
        cx={dim / 2} cy={dim / 2} r={r}
        fill="none"
        stroke="var(--teal)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
        transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
      />
    </svg>
  );
}

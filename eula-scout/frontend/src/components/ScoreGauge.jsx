import React, { useEffect, useRef } from 'react';

function scoreColor(score) {
  if (score < 30) return '#22C55E';
  if (score < 60) return '#EAB308';
  if (score < 80) return '#F97316';
  return '#EF4444';
}

const SIZES = { sm: 64, md: 96, lg: 128 };

export default function ScoreGauge({ score = 0, size = 'md' }) {
  const dim = SIZES[size] || 96;
  const stroke = size === 'sm' ? 7 : size === 'lg' ? 12 : 9;
  const r = (dim - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(score, 0), 100) / 100;
  const color = scoreColor(score);
  const fontSize = size === 'sm' ? 14 : size === 'lg' ? 28 : 20;
  const circleRef = useRef(null);

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    el.style.strokeDashoffset = String(circ);
    requestAnimationFrame(() => {
      el.style.transition = 'stroke-dashoffset 1.2s ease';
      el.style.strokeDashoffset = String(circ * (1 - pct));
    });
  }, [score, circ, pct]);

  return (
    <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} style={{ display: 'block' }}>
      {/* Track */}
      <circle
        cx={dim / 2} cy={dim / 2} r={r}
        fill="none"
        stroke="var(--bg-elevated)"
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={0}
        transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
      />
      {/* Fill */}
      <circle
        ref={circleRef}
        cx={dim / 2} cy={dim / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ}
        transform={`rotate(-90 ${dim / 2} ${dim / 2})`}
      />
      <text
        x="50%" y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="white"
        fontFamily="Syne, sans-serif"
        fontWeight="800"
        fontSize={fontSize}
      >
        {score}
      </text>
    </svg>
  );
}

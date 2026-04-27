import React from 'react';

export default function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
      {icon && (
        <div style={{ color: 'var(--text-dim)', width: 64, height: 64 }}>{icon}</div>
      )}
      {title && (
        <p style={{ fontSize: 15, fontWeight: 600, color: 'white', margin: 0 }}>{title}</p>
      )}
      {subtitle && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, textAlign: 'center', maxWidth: 320 }}>{subtitle}</p>
      )}
    </div>
  );
}

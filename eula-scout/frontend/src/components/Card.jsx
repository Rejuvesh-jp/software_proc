import React from 'react';

export default function Card({ children, className = '', style = {}, noHover = false }) {
  return (
    <div
      className={`card${noHover ? ' !transform-none !shadow-none' : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

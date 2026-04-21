import React, { useState } from 'react';
import RiskBadge from './RiskBadge';

function ClauseItem({ clause, index }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-gray-50 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span className="font-medium text-gray-800 text-sm truncate">{clause.title}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <RiskBadge level={clause.riskLevel} />
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-3 bg-gray-50 border-t border-gray-100 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">{clause.summary}</p>
          {clause.originalText && (
            <details className="group">
              <summary className="text-xs font-semibold text-blue-700 cursor-pointer hover:text-blue-900 list-none flex items-center gap-1">
                <span>View original text</span>
                <svg className="w-3 h-3 group-open:rotate-90 transition-transform"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </summary>
              <blockquote className="mt-2 pl-3 border-l-2 border-blue-200 text-xs text-gray-500 italic leading-relaxed">
                {clause.originalText}
              </blockquote>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default function KeyClauseList({ clauses }) {
  if (!clauses || clauses.length === 0) return null;

  return (
    <div className="card">
      <p className="section-title">Key Clauses ({clauses.length})</p>
      <div className="space-y-2">
        {clauses.map((clause, i) => (
          <ClauseItem key={i} clause={clause} index={i} />
        ))}
      </div>
    </div>
  );
}

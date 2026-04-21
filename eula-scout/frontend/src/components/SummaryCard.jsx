import React from 'react';
import RiskBadge from './RiskBadge';

export default function SummaryCard({ data }) {
  return (
    <div className="card">
      <p className="section-title">Software Information</p>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{data.softwareName}</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {data.vendor}
            {data.eulaVersion && (
              <span className="ml-2 text-gray-400">· v{data.eulaVersion}</span>
            )}
          </p>
        </div>
        <RiskBadge level={data.overallRiskLevel} size="lg" />
      </div>

      {data.executiveSummary && (
        <div className="mt-5 pt-5 border-t border-gray-100">
          <p className="section-title">Executive Summary</p>
          <p className="prose-sm-custom">{data.executiveSummary}</p>
        </div>
      )}
    </div>
  );
}

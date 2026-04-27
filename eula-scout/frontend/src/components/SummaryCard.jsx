import React from 'react';
import RiskBadge from './RiskBadge';

export default function SummaryCard({ data }) {
  return (
    <div className="card">
      <p className="section-title">Software Information</p>
      <div style={{display:'flex',flexWrap:'wrap',alignItems:'flex-start',justifyContent:'space-between',gap:16}}>
        <div>
          <h2 style={{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,color:'var(--text-primary)',margin:0}}>{data.softwareName}</h2>
          <p style={{color:'var(--text-muted)',fontSize:13,marginTop:4}}>
            {data.vendor}
            {data.eulaVersion&&<span style={{marginLeft:8,color:'var(--text-dim)'}}>· v{data.eulaVersion}</span>}
          </p>
        </div>
        <RiskBadge level={data.overallRiskLevel} size="lg"/>
      </div>
      {data.executiveSummary&&(
        <div style={{marginTop:20,paddingTop:20,borderTop:'1px solid var(--border)'}}>
          <p className="section-title">Executive Summary</p>
          <p className="prose-sm-custom">{data.executiveSummary}</p>
        </div>
      )}
    </div>
  );
}

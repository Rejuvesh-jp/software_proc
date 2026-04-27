import React, { useState } from 'react';
import RiskBadge from './RiskBadge';

function ClauseItem({ clause, index }) {
  const [open, setOpen] = useState(false);

  const riskC={Critical:'#EF4444',High:'#F97316',Medium:'#EAB308',Low:'#22C55E'};
  const c=riskC[clause.riskLevel]||riskC['Medium'];
  return (
    <div style={{border:'1px solid var(--border)',borderRadius:10,overflow:'hidden'}}>
      <button
        onClick={()=>setOpen(o=>!o)}
        style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',background:'none',border:'none',cursor:'pointer',textAlign:'left',transition:'background 0.2s'}}
        onMouseEnter={e=>e.currentTarget.style.background='var(--bg-elevated)'}
        onMouseLeave={e=>e.currentTarget.style.background='none'}
        aria-expanded={open}
      >
        <div style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}>
          <span style={{flexShrink:0,width:24,height:24,borderRadius:'50%',background:c+'22',color:c,fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid '+c+'44'}}>{index+1}</span>
          <span style={{fontWeight:500,color:'var(--text-primary)',fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{clause.title}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12,flexShrink:0,marginLeft:16}}>
          <RiskBadge level={clause.riskLevel}/>
          <svg style={{width:14,height:14,color:'var(--text-dim)',transform:open?'rotate(180deg)':'none',transition:'transform 0.2s'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </button>
      {open&&(
        <div style={{padding:'16px 18px',background:'var(--bg-elevated)',borderTop:'1px solid var(--border)',borderLeft:'3px solid '+c,display:'flex',flexDirection:'column',gap:12}}>
          <p style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.65,margin:0}}>{clause.summary}</p>
          {clause.originalText&&(
            <details>
              <summary style={{fontSize:11,fontWeight:600,color:'var(--teal)',cursor:'pointer',listStyle:'none',display:'flex',alignItems:'center',gap:4}}>
                View original text
                <svg style={{width:10,height:10}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </summary>
              <blockquote style={{marginTop:8,paddingLeft:12,borderLeft:'2px solid var(--border-accent)',fontSize:11,color:'var(--text-dim)',fontStyle:'italic',lineHeight:1.6}}>{clause.originalText}</blockquote>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default function KeyClauseList({ clauses }) {
  if(!clauses||clauses.length===0) return null;
  return (
    <div className="card">
      <p className="section-title">Key Clauses ({clauses.length})</p>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {clauses.map((clause,i)=>(
          <ClauseItem key={i} clause={clause} index={i}/>
        ))}
      </div>
    </div>
  );
}

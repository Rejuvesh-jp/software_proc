import React, { useState, useEffect, useCallback, useRef } from 'react';
import UploadZone from './components/UploadZone';
import SummaryCard from './components/SummaryCard';
import KeyClauseList from './components/KeyClauseList';
import RiskBadge from './components/RiskBadge';
import ScoreGauge from './components/ScoreGauge';
import ProgressBar from './components/ProgressBar';
import EmptyState from './components/EmptyState';
import LoadingSpinner from './components/LoadingSpinner';

const API_URL = '/api/analyze';
const MSA_API_URL = '/api/analyze-msa';
const TEMPLATE_API_URL = '/api/upload-template';

// Module-level token store — set on login, read by authFetch
let _token = localStorage.getItem('eula_token') || null;
function authFetch(url, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (_token) headers['Authorization'] = 'Bearer ' + _token;
  return fetch(url, { ...opts, headers });
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// --- SVG Icons ----------------------------------------------------------------
function DocIcon()       { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width:'100%',height:'100%'}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>; }
function ContractIcon({ size=20 }) { return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>; }
function ChartIcon()     { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width:'100%',height:'100%'}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>; }
function ClockIcon()     { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width:'100%',height:'100%'}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function GearIcon()      { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width:'100%',height:'100%'}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>; }
function LayersIcon()    { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width:20,height:20}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>; }
function AlertTriIcon()  { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width:20,height:20}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>; }
function AlertCircIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width:20,height:20}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function CheckCircIcon() { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width:20,height:20}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function DownloadIcon()  { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width:14,height:14}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>; }
function TrashIcon()     { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width:14,height:14}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>; }
function UsersIcon()     { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width:'100%',height:'100%'}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>; }
function DocIconLg()     { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width:64,height:64,color:'var(--text-dim)'}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>; }
function ChartIconLg()   { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width:64,height:64,color:'var(--text-dim)'}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>; }
function ClockIconLg()   { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width:64,height:64,color:'var(--text-dim)'}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>; }
function UploadIconLg()  { return <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{width:26,height:26}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>; }

// --- Helper functions ---------------------------------------------------------
function riskColor(level) {
  return level==='Critical'?'#EF4444':level==='High'?'#F97316':level==='Medium'?'#EAB308':'#22C55E';
}
function devBorderColor(risk) {
  return risk==='High'?'rgba(239,68,68,0.3)':risk==='Medium'?'rgba(234,179,8,0.3)':'rgba(255,255,255,0.08)';
}
function ghostBtn(color) {
  return { display:'inline-flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:500, background:'transparent', border:'1px solid '+color, color, cursor:'pointer', transition:'all 0.2s' };
}
function tealBtn(small=false) {
  return { display:'inline-flex', alignItems:'center', gap:5, padding:small?'5px 12px':'6px 14px', borderRadius:8, fontSize:12, fontWeight:600, background:'linear-gradient(135deg,var(--teal),var(--teal-dark))', color:'var(--bg-base)', border:'none', cursor:'pointer', transition:'all 0.2s' };
}

// --- Titan Star Logo ----------------------------------------------------------
function TitanStar({ size=36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{flexShrink:0}}>
      <path d="M50 4 L64 36 L98 36 L70 58 L80 92 L50 72 L20 92 L30 58 L2 36 L36 36 Z" fill="#00C9B1" opacity="0.9"/>
      <path d="M50 4 L50 72 L20 92 L30 58 L2 36 L36 36 Z" fill="#065F5F"/>
      <path d="M50 4 L64 36 L98 36 L70 58 L80 92 L50 72 Z" fill="#0A7C7C"/>
      <ellipse cx="50" cy="50" rx="9" ry="9" fill="var(--text-primary)" opacity="0.9"/>
    </svg>
  );
}

// --- Nav Item ----------------------------------------------------------------
function NavItem({ item, active, onClick, historyCount }) {
  const [hov,setHov] = useState(false);
  const isActive = active===item.id;
  return (
    <button
      onClick={()=>onClick(item.id)}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        display:'flex', alignItems:'center', gap:10,
        margin:'2px 10px', borderRadius:8, height:44, padding:'0 14px', cursor:'pointer',
        background:isActive?'rgba(0,201,177,0.1)':hov?'var(--bg-elevated)':'transparent',
        borderLeft:isActive?'3px solid var(--teal)':'3px solid transparent',
        transition:'all 0.2s', width:'calc(100% - 20px)', textAlign:'left',
      }}
    >
      <span style={{color:isActive?'var(--teal)':hov?'white':'var(--text-muted)',width:17,height:17,flexShrink:0}}>{item.icon}</span>
      <span style={{fontSize:13,color:isActive?'var(--teal)':hov?'white':'var(--text-muted)',fontWeight:isActive?600:400,flex:1}}>{item.label}</span>
      {item.badge&&historyCount>0&&(
        <span style={{background:'rgba(0,201,177,0.15)',color:'var(--teal)',fontSize:10,borderRadius:100,padding:'1px 8px',fontWeight:600}}>{historyCount}</span>
      )}
    </button>
  );
}

// --- Themes -----------------------------------------------------------------
const THEMES = {
  navy:  { vars:{'--bg-base':'#071B2E','--bg-surface':'#0D2A42','--bg-elevated':'#133550','--border':'rgba(255,255,255,0.07)','--border-accent':'rgba(0,201,177,0.25)','--teal':'#00C9B1','--teal-dark':'#0A7C7C','--teal-glow':'rgba(0,201,177,0.12)','--text-primary':'#F0FAF9','--text-muted':'#8AABB8','--text-dim':'#4A6A7A','--shadow-card':'0 4px 24px rgba(0,0,0,0.4)'} },
  light: { vars:{'--bg-base':'#EEF2F7','--bg-surface':'#FFFFFF','--bg-elevated':'#F5F7FA','--border':'rgba(0,0,0,0.08)','--border-accent':'rgba(0,150,136,0.3)','--teal':'#009688','--teal-dark':'#00695C','--teal-glow':'rgba(0,150,136,0.1)','--text-primary':'#1A2332','--text-muted':'#5A7080','--text-dim':'#8FA8B8','--shadow-card':'0 4px 24px rgba(0,0,0,0.08)'} },
};

// --- Sidebar -----------------------------------------------------------------
const NAV_MAIN = [
  {id:'analyze',   label:'Analyze EULA',   icon:<DocIcon/>,      badge:false},
  {id:'msa',       label:'MSA Review',     icon:<ContractIcon/>, badge:false},
  {id:'dashboard', label:'Risk Dashboard', icon:<ChartIcon/>,    badge:false},
  {id:'history',   label:'History',        icon:<ClockIcon/>,    badge:true},
];
const NAV_SYSTEM = [
  {id:'users',     label:'Users',          icon:<UsersIcon/>,    badge:false},
  {id:'settings',  label:'Settings',       icon:<GearIcon/>,     badge:false},
];

function Sidebar({ view, setView, historyCount, theme, setTheme, currentUser, onLogout }) {
  return (
    <aside style={{width:260,minHeight:'100vh',background:'var(--bg-base)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',flexShrink:0,position:'relative'}}>
      <div style={{padding:'20px 20px 16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          <TitanStar size={36}/>
          <div>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:17,fontWeight:800,letterSpacing:'1.5px',color:'var(--text-primary)',lineHeight:1.2}}>EULA Scout</div>
            <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'3px',color:'var(--text-muted)'}}>Procurement AI</div>
          </div>
        </div>
        <div style={{height:1,background:'var(--border)',margin:'8px 0'}}/>
        <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'2px',color:'var(--teal)',marginTop:8}}>A Titan Company Tool</div>
      </div>
      <div style={{marginTop:20}}>
        <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'2.5px',color:'var(--text-dim)',padding:'0 20px',marginBottom:6}}>Main Menu</div>
        {NAV_MAIN.map(item=><NavItem key={item.id} item={item} active={view} onClick={setView} historyCount={historyCount}/>)}
      </div>
      <div style={{marginTop:24}}>
        <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'2.5px',color:'var(--text-dim)',padding:'0 20px',marginBottom:6}}>System</div>
        {NAV_SYSTEM.map(item=><NavItem key={item.id} item={item} active={view} onClick={setView} historyCount={0}/>)}
      </div>
      <div style={{position:'absolute',bottom:0,left:0,right:0,borderTop:'1px solid var(--border)',padding:'14px 16px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{fontSize:10,color:'var(--text-muted)',display:'flex',alignItems:'center',gap:6}}>
            <svg style={{width:13,height:13}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
            <span style={{display:theme==='navy'?'inline':'none'}}>Dark</span>
            <svg style={{width:13,height:13,display:theme==='light'?'block':'none'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
            <span style={{display:theme==='light'?'inline':'none'}}>Light</span>
          </div>
          <button onClick={()=>setTheme(theme==='navy'?'light':'navy')} style={{width:42,height:24,borderRadius:100,background:theme==='navy'?'var(--bg-elevated)':'#CBD5E0',border:'1px solid var(--border)',cursor:'pointer',position:'relative',transition:'background 0.25s',padding:0,outline:'none'}}>
            <div style={{position:'absolute',top:3,left:theme==='navy'?3:19,width:16,height:16,borderRadius:'50%',background:theme==='navy'?'var(--teal)':'#009688',transition:'left 0.25s',boxShadow:'0 1px 4px rgba(0,0,0,0.3)'}}/>
          </button>
        </div>
        {currentUser&&(
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{currentUser.name}</div>
              <div style={{fontSize:10,color:'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{currentUser.email}</div>
            </div>
            <button onClick={onLogout} title="Sign out" style={{background:'none',border:'1px solid var(--border)',borderRadius:6,padding:'4px 8px',cursor:'pointer',color:'var(--text-dim)',fontSize:10,flexShrink:0,marginLeft:6}} onMouseEnter={e=>e.currentTarget.style.color='#EF4444'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-dim)'}>
              Sign out
            </button>
          </div>
        )}
        <div style={{fontSize:10,fontStyle:'italic',color:'var(--text-dim)',lineHeight:1.5}}>AI-powered analysis. Always review with legal counsel.</div>
      </div>
    </aside>
  );
}

// --- Header ------------------------------------------------------------------
const PAGE_TITLES = {analyze:'Analyze EULA',msa:'MSA Review',dashboard:'Risk Dashboard',history:'History',settings:'Settings',users:'User Management'};

function Header({ view }) {
  return (
    <header className="no-print" style={{height:60,background:'var(--bg-base)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',paddingLeft:32,paddingRight:32,flexShrink:0}}>
      <div>
        <div style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:800,color:'var(--text-primary)',lineHeight:1.1}}>{PAGE_TITLES[view]}</div>
        <div style={{fontSize:11,color:'var(--text-muted)',letterSpacing:'0.5px'}}>AI-Powered Software Agreement Analyzer</div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:16}}>
        <span style={{background:'rgba(0,201,177,0.1)',border:'1px solid var(--border-accent)',color:'var(--teal)',fontSize:10,letterSpacing:'1px',padding:'3px 10px',borderRadius:4,fontWeight:600}}>v1.0</span>

      </div>
    </header>
  );
}

// --- Error Banner ------------------------------------------------------------
function ErrorBanner({ message, onDismiss }) {
  return (
    <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,padding:'14px 16px',display:'flex',alignItems:'flex-start',gap:12}}>
      <svg style={{width:18,height:18,color:'#EF4444',flexShrink:0,marginTop:2}} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
      </svg>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:600,color:'#EF4444'}}>Analysis Error</div>
        <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{message}</div>
      </div>
      <button onClick={onDismiss} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-dim)',padding:0}}>
        <svg style={{width:16,height:16}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
  );
}

// --- Info Card ---------------------------------------------------------------
function InfoCard({ title, children }) {
  return (
    <div className="card">
      <p className="section-title">{title}</p>
      <p className="prose-sm-custom">{children}</p>
    </div>
  );
}

// --- Prohibited Uses ---------------------------------------------------------
function ProhibitedUses({ items }) {
  if(!items||items.length===0) return null;
  return (
    <div className="card">
      <p className="section-title">Prohibited Uses</p>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:4}}>
        {items.map((use,i)=>(
          <span key={i} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 12px',borderRadius:100,fontSize:11,fontWeight:500,background:'rgba(239,68,68,0.1)',color:'#EF4444',border:'1px solid rgba(239,68,68,0.25)'}}>
            <svg style={{width:11,height:11,flexShrink:0}} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524L13.477 14.89zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd"/></svg>
            {use}
          </span>
        ))}
      </div>
    </div>
  );
}

// --- Recommendations ---------------------------------------------------------
function Recommendations({ items }) {
  if(!items||items.length===0) return null;
  return (
    <div className="card">
      <p className="section-title">Procurement Recommendations</p>
      <ol style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:12}}>
        {items.map((rec,i)=>(
          <li key={i} style={{display:'flex',alignItems:'flex-start',gap:12}}>
            <span style={{flexShrink:0,width:22,height:22,borderRadius:'50%',background:'var(--teal-glow)',color:'var(--teal)',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid var(--border-accent)',marginTop:1}}>{i+1}</span>
            <p style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.6,margin:0}}>{rec}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

// --- Results Dashboard -------------------------------------------------------
function ResultsDashboard({ result, onReset, onDownloadPdf, pdfLoading, onDownloadFull, fullPdfLoading }) {
  return (
    <div className="animate-fade-up" style={{display:'flex',flexDirection:'column',gap:20}}>
      <div className="card" style={{borderLeft:'4px solid '+riskColor(result.overallRiskLevel)}}>
        <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'2px',color:'var(--text-muted)',marginBottom:8}}>Overall Risk Assessment</div>
        <RiskBadge level={result.overallRiskLevel} size="lg"/>
        <div style={{marginTop:6,fontSize:13,color:'var(--text-muted)'}}>{result.softwareName} — {result.vendor}</div>
      </div>
      <SummaryCard data={result}/>
      {(onDownloadPdf||onDownloadFull)&&(
        <div className="no-print" style={{display:'flex',justifyContent:'flex-end',gap:10,flexWrap:'wrap'}}>
          {onDownloadFull&&(
            <button onClick={onDownloadFull} disabled={fullPdfLoading} style={{...ghostBtn('var(--teal)'),height:42,fontSize:13}}>
              {fullPdfLoading?<><LoadingSpinner size="sm"/> Generating...</>:<><DownloadIcon/> Full Detailed Report</>}
            </button>
          )}
          {onDownloadPdf&&(
            <button onClick={onDownloadPdf} disabled={pdfLoading} className="btn-primary" style={{height:42,fontSize:13}}>
              {pdfLoading?<><LoadingSpinner size="sm"/> Generating...</>:<><DownloadIcon/> Executive One-Pager</>}
            </button>
          )}
        </div>
      )}
      <KeyClauseList clauses={result.keyClauses}/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16}}>
        {result.dataPrivacy&&<InfoCard title="Data Privacy">{result.dataPrivacy}</InfoCard>}
        {result.intellectualProperty&&<InfoCard title="Intellectual Property">{result.intellectualProperty}</InfoCard>}
        {result.terminationPolicy&&<InfoCard title="Termination Policy">{result.terminationPolicy}</InfoCard>}
        {result.autoRenewal&&<InfoCard title="Auto-Renewal">{result.autoRenewal}</InfoCard>}
        {result.liabilityLimitation&&<InfoCard title="Liability Limitation">{result.liabilityLimitation}</InfoCard>}
      </div>
      <ProhibitedUses items={result.prohibitedUses}/>
      <Recommendations items={result.recommendations}/>
      {onReset&&(
        <div className="no-print" style={{textAlign:'center',paddingTop:8}}>
          <button onClick={onReset} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--teal)',textDecoration:'underline'}}>Analyze another document</button>
        </div>
      )}
    </div>
  );
}

// --- Analyze View ------------------------------------------------------------
function AnalyzeView({ onNewResult, initialResult }) {
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(initialResult||null);
  const [error,setError]=useState('');
  const [currentFile,setCurrentFile]=useState(null);
  const [pdfLoading,setPdfLoading]=useState(false);
  const [fullPdfLoading,setFullPdfLoading]=useState(false);

  const handleAnalyze=async(file)=>{
    setLoading(true);setError('');setResult(null);setCurrentFile(file);
    const fd=new FormData();fd.append('eulaFile',file);
    try{
      const r=await authFetch(API_URL,{method:'POST',body:fd});
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||'Server error: '+r.status);
      setResult(d);onNewResult(d);
    }catch(err){setError(err.message||'Unexpected error.');}
    finally{setLoading(false);}
  };

  const handleDownloadPdf=async()=>{
    if(!currentFile) return;
    setPdfLoading(true);setError('');
    const fd=new FormData();fd.append('eulaFile',currentFile);fd.append('company','Titan Company Ltd');fd.append('accent','#00C9B1');
    try{
      const r=await authFetch('/api/generate-pdf',{method:'POST',body:fd});
      if(!r.ok){const d=await r.json();throw new Error(d.error||'PDF failed.');}
      const blob=await r.blob();const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download='EULA_Executive_OnePager.pdf';
      document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    }catch(err){setError(err.message||'PDF failed.');}
    finally{setPdfLoading(false);}
  };

  const handleDownloadFull=async()=>{
    if(!result) return;
    setFullPdfLoading(true);setError('');
    try{
      const r=await authFetch('/api/eula-full-report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});
      if(!r.ok){const d=await r.json();throw new Error(d.error||'PDF failed.');}
      const blob=await r.blob();const url=URL.createObjectURL(blob);
      const safe=(result.softwareName||'EULA').replace(/[^a-zA-Z0-9 _-]/g,'').replace(/\s+/g,'_');
      const a=document.createElement('a');a.href=url;a.download=safe+'_Full_Report.pdf';
      document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    }catch(err){setError(err.message||'PDF failed.');}
    finally{setFullPdfLoading(false);}
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div className="no-print"><UploadZone onAnalyze={handleAnalyze} loading={loading}/></div>
      {error&&<div className="no-print"><ErrorBanner message={error} onDismiss={()=>setError('')}/></div>}
      {result
        ?<ResultsDashboard result={result} onReset={()=>{setResult(null);setCurrentFile(null);}} onDownloadPdf={currentFile?handleDownloadPdf:null} pdfLoading={pdfLoading} onDownloadFull={handleDownloadFull} fullPdfLoading={fullPdfLoading}/>
        :!loading&&!error&&<EmptyState icon={<DocIconLg/>} title="No document analyzed yet" subtitle="Upload a EULA document to begin AI analysis"/>
      }
    </div>
  );
}

// --- Donut Chart -------------------------------------------------------------
function DonutChart({ counts, total }) {
  const segs=[
    {label:'Critical',color:'#EF4444',value:counts.Critical||0},
    {label:'High',color:'#F97316',value:counts.High||0},
    {label:'Medium',color:'#EAB308',value:counts.Medium||0},
    {label:'Low',color:'#22C55E',value:counts.Low||0},
  ].filter(s=>s.value>0);
  if(!total) return null;
  const size=120,r=44,stroke=14,circ=2*Math.PI*r;
  let offset=0;
  const arcs=segs.map(s=>{const dash=(s.value/total)*circ;const arc={...s,dash,offset};offset+=dash;return arc;});
  return (
    <div style={{display:'flex',alignItems:'center',gap:20}}>
      <svg width={size} height={size} viewBox={"0 0 "+size+" "+size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={stroke}/>
        {arcs.map((arc,i)=>(
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={arc.color} strokeWidth={stroke}
            strokeDasharray={arc.dash+" "+(circ-arc.dash)}
            strokeDashoffset={circ/4-arc.offset}/>
        ))}
        <text x="50%" y="46%" dominantBaseline="middle" textAnchor="middle" fill="white" fontFamily="Syne,sans-serif" fontWeight="800" fontSize="18">{total}</text>
        <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle" fill="var(--text-muted)" fontFamily="DM Sans,sans-serif" fontSize="8">Documents</text>
      </svg>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {segs.map(s=>(
          <div key={s.label} style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:s.color,flexShrink:0}}/>
            <span style={{fontSize:12,color:'var(--text-muted)'}}>{s.label}</span>
            <span style={{fontSize:12,fontWeight:600,color:'var(--text-primary)',marginLeft:4}}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Activity Chart ----------------------------------------------------------
function ActivityChart({ history }) {
  const now=Date.now(),days=30;
  const buckets=Array.from({length:days},(_,i)=>{
    const d=new Date(now-(days-1-i)*86400000);
    return{label:d.toLocaleDateString('en-IN',{month:'short',day:'numeric'}),count:0};
  });
  history.forEach(h=>{
    const dAgo=Math.floor((now-new Date(h.analyzedAt))/86400000);
    if(dAgo>=0&&dAgo<days) buckets[days-1-dAgo].count++;
  });
  const maxVal=Math.max(...buckets.map(b=>b.count),1);
  const W=500,H=160,padL=28,padR=8,padT=10,padB=30;
  const chartW=W-padL-padR,chartH=H-padT-padB;
  const step=chartW/(buckets.length-1);
  const pts=buckets.map((b,i)=>({x:padL+i*step,y:padT+chartH-(b.count/maxVal)*chartH,...b}));
  const pathD=pts.reduce((acc,pt,i)=>{
    if(i===0) return "M "+pt.x+" "+pt.y;
    const prev=pts[i-1];const cpx=(prev.x+pt.x)/2;
    return acc+" C "+cpx+" "+prev.y+", "+cpx+" "+pt.y+", "+pt.x+" "+pt.y;
  },'');
  const areaD=pathD+" L "+pts[pts.length-1].x+" "+(padT+chartH)+" L "+pts[0].x+" "+(padT+chartH)+" Z";
  return (
    <div style={{overflowX:'auto'}}>
      <svg viewBox={"0 0 "+W+" "+H} style={{width:'100%',height:H}}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,201,177,0.2)"/>
            <stop offset="100%" stopColor="rgba(0,201,177,0)"/>
          </linearGradient>
        </defs>
        {[0,0.25,0.5,0.75,1].map((f,i)=>{
          const y=padT+chartH*f;
          return <g key={i}>
            <line x1={padL} y1={y} x2={W-padR} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray="4 4"/>
            <text x={padL-4} y={y+4} textAnchor="end" fontSize="8" fill="var(--text-dim)">{Math.round(maxVal*(1-f))}</text>
          </g>;
        })}
        <path d={areaD} fill="url(#lineGrad)"/>
        <path d={pathD} fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((pt,i)=>pt.count>0&&<circle key={i} cx={pt.x} cy={pt.y} r={4} fill="var(--teal)" stroke="var(--bg-surface)" strokeWidth={2}/>)}
        {[0,7,14,21,29].map(idx=>(
          <text key={idx} x={pts[idx].x} y={H-6} textAnchor="middle" fontSize="8" fill="var(--text-muted)">{pts[idx].label}</text>
        ))}
      </svg>
    </div>
  );
}

// --- Risk Dashboard View -----------------------------------------------------
function RiskDashboardView({ history }) {
  const counts={Low:0,Medium:0,High:0,Critical:0};
  history.forEach(h=>{if(counts[h.overallRiskLevel]!==undefined) counts[h.overallRiskLevel]++;});
  const total=history.length;
  if(total===0) return <EmptyState icon={<ChartIconLg/>} title="No analyses yet" subtitle="Analyze a EULA to see your risk dashboard."/>;
  const kpis=[
    {label:'Total Analyzed',value:total,color:'var(--teal)',icon:<LayersIcon/>},
    {label:'High Risk',value:counts.High,color:'#EF4444',icon:<AlertTriIcon/>},
    {label:'Medium Risk',value:counts.Medium,color:'#EAB308',icon:<AlertCircIcon/>},
    {label:'Low Risk',value:counts.Low,color:'#22C55E',icon:<CheckCircIcon/>},
  ];
  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
        {kpis.map((k,i)=>(
          <div key={k.label} className="card animate-count-up" style={{borderLeft:'3px solid '+k.color,animationDelay:i*0.05+'s'}}>
            <div style={{background:k.color+'20',borderRadius:10,padding:10,color:k.color,width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center'}}>{k.icon}</div>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:42,fontWeight:800,color:k.color,lineHeight:1.1,marginTop:12}}>{k.value}</div>
            <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'2px',color:'var(--text-muted)',marginTop:4}}>{k.label}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'5fr 7fr',gap:16}}>
        <div className="card">
          <p style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'var(--text-primary)',marginBottom:20}}>Risk Distribution</p>
          <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:24}}>
            {[{label:'Critical',color:'#EF4444',count:counts.Critical},{label:'High',color:'#F97316',count:counts.High},{label:'Medium',color:'#EAB308',count:counts.Medium},{label:'Low',color:'#22C55E',count:counts.Low}].map(r=>(
              <ProgressBar key={r.label} value={r.count} max={total} color={r.color} label={r.label} count={r.count} height={10}/>
            ))}
          </div>
          <DonutChart counts={counts} total={total}/>
        </div>
        <div className="card">
          <div style={{marginBottom:20}}>
            <span style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'var(--text-primary)'}}>Analysis Activity</span>
            <span style={{fontSize:11,color:'var(--text-muted)',marginLeft:8}}>(last 30 days)</span>
          </div>
          <ActivityChart history={history}/>
        </div>
      </div>
      <div className="card">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <span style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'var(--text-primary)'}}>Recent Analyses</span>
        </div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr>{['Type','Document Name','Date','Risk Level','Actions'].map(h=>(
              <th key={h} style={{textAlign:'left',fontSize:10,textTransform:'uppercase',letterSpacing:'1.5px',color:'var(--text-dim)',paddingBottom:12,borderBottom:'1px solid var(--border)'}}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {history.slice(0,10).map(h=>(
              <tr key={h.id} style={{borderBottom:'1px solid var(--border)'}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-elevated)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{padding:'12px 0'}}><span style={{fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:4,background:'var(--teal-glow)',color:'var(--teal)'}}>EULA</span></td>
                <td style={{padding:'12px 8px',fontSize:13,color:'var(--text-primary)',fontWeight:500,maxWidth:200}}>
                  <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.softwareName}</div>
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>{h.vendor}</div>
                </td>
                <td style={{padding:'12px 8px',fontSize:11,color:'var(--text-muted)'}}>{formatDate(h.analyzedAt)}</td>
                <td style={{padding:'12px 8px'}}><RiskBadge level={h.overallRiskLevel}/></td>
                <td style={{padding:'12px 0'}}><span style={{fontSize:11,color:'var(--teal)',cursor:'pointer',fontWeight:500}}>View</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- EULA History Card -------------------------------------------------------
function EulaHistoryCard({ h, onView, onDelete }) {
  const [loading,setLoading]=useState(false);
  const [fullLoading,setFullLoading]=useState(false);
  const [err,setErr]=useState('');
  const [confirmDel,setConfirmDel]=useState(false);

  const safe=(h.softwareName||'EULA').replace(/[^a-zA-Z0-9 _-]/g,'').replace(/\s+/g,'_');

  const handleOnePager=async()=>{
    setLoading(true);setErr('');
    try{
      const r=await authFetch('/api/eula-report-from-json',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(h.result)});
      if(!r.ok){const d=await r.json();throw new Error(d.error||'PDF failed.');}
      const blob=await r.blob();const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download=safe+'_Executive_OnePager.pdf';
      document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    }catch(e){setErr(e.message);}
    finally{setLoading(false);}
  };

  const handleFullReport=async()=>{
    setFullLoading(true);setErr('');
    try{
      const r=await authFetch('/api/eula-full-report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(h.result)});
      if(!r.ok){const d=await r.json();throw new Error(d.error||'PDF failed.');}
      const blob=await r.blob();const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download=safe+'_Full_Report.pdf';
      document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    }catch(e){setErr(e.message);}
    finally{setFullLoading(false);}
  };

  return (
    <div className="card animate-fade-up">
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4}}>
            <span style={{background:'var(--teal-glow)',color:'var(--teal)',fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:4}}>EULA</span>
            <span style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,color:'var(--text-primary)'}}>{h.softwareName}</span>
            <RiskBadge level={h.overallRiskLevel}/>
          </div>
          <div style={{fontSize:11,color:'var(--text-muted)'}}>{h.vendor} · {formatDate(h.analyzedAt)}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          {confirmDel?(
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:12,color:'var(--text-muted)'}}>Confirm?</span>
              <button onClick={()=>onDelete(h.id)} style={ghostBtn('#EF4444')}>Yes</button>
              <button onClick={()=>setConfirmDel(false)} style={ghostBtn('var(--text-muted)')}>No</button>
            </div>
          ):(
            <>
              <button onClick={handleFullReport} disabled={fullLoading} style={ghostBtn('var(--text-muted)')}>
                {fullLoading?<><LoadingSpinner size="sm"/> Generating…</>:<><DownloadIcon/> Full Report</>}
              </button>
              <button onClick={handleOnePager} disabled={loading} style={ghostBtn('var(--teal)')}>
                {loading?<><LoadingSpinner size="sm"/> Generating…</>:<><DownloadIcon/> One-Pager</>}
              </button>
              <button onClick={()=>onView(h.result)} style={tealBtn()}>View Report</button>
              <button onClick={()=>setConfirmDel(true)} style={ghostBtn('#EF4444')} title="Delete"><TrashIcon/></button>
            </>
          )}
        </div>
      </div>
      {err&&<div style={{fontSize:11,color:'#EF4444',marginTop:6}}>{err}</div>}
    </div>
  );
}

// --- History View ------------------------------------------------------------
function HistoryView({ eulaHistory, msaHistory, onViewEula, onViewMsa, onClearEula, onClearMsa }) {
  const [tab,setTab]=useState('all');
  const [search,setSearch]=useState('');

  const handleDeleteEula=async(id)=>{
    await authFetch('/api/history/eula/'+id,{method:'DELETE'});
    onClearEula(id);
  };

  const all=[...eulaHistory.map(h=>({...h,_type:'eula'})),...msaHistory.map(h=>({...h,_type:'msa'}))];
  const base=tab==='eula'?eulaHistory.map(h=>({...h,_type:'eula'})):tab==='msa'?msaHistory.map(h=>({...h,_type:'msa'})):all;
  const searched=search?base.filter(h=>(h.softwareName||h.msaTitle||'').toLowerCase().includes(search.toLowerCase())||(h.vendor||h.vendorName||'').toLowerCase().includes(search.toLowerCase())):base;

  const tabStyle=(id)=>({padding:'8px 18px',borderRadius:6,fontSize:13,cursor:'pointer',border:'none',transition:'all 0.2s',background:tab===id?'var(--teal-glow)':'transparent',color:tab===id?'var(--teal)':'var(--text-muted)',borderBottom:tab===id?'2px solid var(--teal)':'2px solid transparent',fontWeight:tab===id?600:400});

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
        <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:'var(--text-primary)'}}>Analysis History</div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or vendor…"
          style={{background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:8,height:38,padding:'0 14px',color:'var(--text-primary)',fontSize:13,width:240,outline:'none',transition:'border-color 0.2s'}}
          onFocus={e=>e.target.style.borderColor='var(--border-accent)'}
          onBlur={e=>e.target.style.borderColor='var(--border)'}/>
      </div>
      <div style={{display:'flex',gap:4}}>
        {[{id:'all',label:'All ('+(eulaHistory.length+msaHistory.length)+')'},{id:'eula',label:'EULA ('+eulaHistory.length+')'},{id:'msa',label:'MSA ('+msaHistory.length+')'}].map(t=>(
          <button key={t.id} style={tabStyle(t.id)} onClick={()=>setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {searched.length===0
        ?<EmptyState icon={<ClockIconLg/>} title="No history yet" subtitle="Analyze a document to see it here."/>
        :<div style={{display:'flex',flexDirection:'column',gap:12}}>
          {searched.map(h=>{
            const isEula=h._type==='eula';
            if(isEula) return <EulaHistoryCard key={h.id} h={h} onView={onViewEula} onDelete={handleDeleteEula}/>;
            return (
              <div key={h.id} className="card" style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4}}>
                    <span style={{background:'rgba(123,94,234,0.15)',color:'#7B5EEA',fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:4}}>MSA</span>
                    <span style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,color:'var(--text-primary)'}}>{h.msaTitle}</span>
                    <RiskBadge level={h.overallRisk}/>
                  </div>
                  <div style={{fontSize:11,color:'var(--text-muted)'}}>{h.vendorName} · {formatDate(h.analyzedAt)}</div>
                </div>
                <button onClick={()=>onViewMsa(h.result)} style={tealBtn()}>View Report</button>
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}

// --- Settings View -----------------------------------------------------------
function SettingsView({ history }) {
  const [uploading,setUploading]=useState(false);
  const [templateStatus,setTemplateStatus]=useState(null);
  const [templateMsg,setTemplateMsg]=useState('');
  const [copied,setCopied]=useState(false);

  React.useEffect(()=>{
    authFetch('/api/analyze-msa/template-status').then(r=>r.json()).then(d=>setTemplateStatus(d.templateLoaded)).catch(()=>setTemplateStatus(false));
  },[]);

  const handleTemplateUpload=async(e)=>{
    const file=e.target.files?.[0];if(!file) return;
    setUploading(true);setTemplateMsg('');
    const fd=new FormData();fd.append('templateFile',file);
    try{
      const r=await authFetch(TEMPLATE_API_URL,{method:'POST',body:fd});
      const d=await r.json();if(!r.ok) throw new Error(d.error);
      setTemplateStatus(true);setTemplateMsg('Template uploaded ('+(d.characters?.toLocaleString())+' characters extracted).');
    }catch(err){setTemplateMsg('Upload failed: '+err.message);}
    finally{setUploading(false);e.target.value='';}
  };

  const handleTemplateDelete=async()=>{
    if(!window.confirm('Remove stored Titan MSA template?')) return;
    await authFetch(TEMPLATE_API_URL,{method:'DELETE'});
    setTemplateStatus(false);setTemplateMsg('Template removed.');
  };

  const copy=()=>{navigator.clipboard.writeText('POST /api/analyze').then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});};

  const toggleRow=(label)=>(
    <div key={label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 0',borderBottom:'1px solid var(--border)'}}>
      <span style={{fontSize:13,color:'var(--text-dim)'}}>{label}</span>
      <div style={{width:40,height:22,borderRadius:100,background:'var(--bg-elevated)',border:'1px solid var(--border)',position:'relative',cursor:'not-allowed',opacity:0.5}}>
        <div style={{width:16,height:16,borderRadius:'50%',background:'var(--text-dim)',position:'absolute',top:3,left:3}}/>
      </div>
    </div>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20,maxWidth:700}}>
      <div className="card">
        <p style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'var(--text-primary)',marginBottom:6}}>Titan MSA Template</p>
        <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:16}}>This template is used as the baseline for all MSA comparisons.</p>
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:10,background:templateStatus?'rgba(34,197,94,0.08)':'rgba(234,179,8,0.08)',border:'1px solid '+(templateStatus?'rgba(34,197,94,0.25)':'rgba(234,179,8,0.25)'),marginBottom:16}}>
          <span style={{fontSize:16}}>{templateStatus===null?'⏳':templateStatus?'✅':'⚠️'}</span>
          <span style={{fontSize:13,fontWeight:500,color:templateStatus?'#22C55E':'#EAB308'}}>{templateStatus===null?'Checking...':templateStatus?'Template Active — Titan MSA template is loaded':'No Template Uploaded — MSA Review will not work'}</span>
          {templateStatus&&<button onClick={handleTemplateDelete} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'#EF4444',fontSize:12,textDecoration:'underline'}}>Remove</button>}
        </div>
        <label style={{display:'inline-flex',alignItems:'center',gap:8,padding:'10px 20px',borderRadius:8,fontSize:13,fontWeight:600,background:uploading?'var(--bg-elevated)':'linear-gradient(135deg,var(--teal),var(--teal-dark))',color:uploading?'var(--text-dim)':'var(--bg-base)',cursor:uploading?'not-allowed':'pointer',transition:'all 0.2s'}}>
          {uploading?<><LoadingSpinner size="sm"/> Uploading...</>:(templateStatus?'🔄 Replace Template':'📤 Upload Titan MSA Template')}
          <input type="file" accept=".pdf,.docx,.doc" style={{display:'none'}} onChange={handleTemplateUpload} disabled={uploading}/>
        </label>
        <div style={{fontSize:12,color:'var(--text-dim)',marginTop:8}}>Accepted: PDF, Word (.docx)</div>
        {templateMsg&&<div style={{fontSize:12,color:'var(--text-muted)',marginTop:8}}>{templateMsg}</div>}
      </div>
      <div className="card">
        <p className="section-title">AI Gateway Configuration</p>
        {[{label:'Gateway URL',value:'https://ai.titan.in/gateway'},{label:'Model',value:'gpt-5.4-azure'},{label:'Auth Method',value:'Bearer Token (JWT)'}].map(row=>(
          <div key={row.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
            <span style={{fontSize:12,color:'var(--text-dim)',width:130}}>{row.label}</span>
            <span style={{fontSize:13,color:'var(--text-primary)',fontFamily:'monospace'}}>{row.value}</span>
          </div>
        ))}
      </div>
      <div className="card">
        <p className="section-title">Token Management</p>
        <div style={{padding:'12px 16px',background:'rgba(234,179,8,0.08)',border:'1px solid rgba(234,179,8,0.25)',borderRadius:10}}>
          <div style={{fontSize:12,fontWeight:600,color:'#EAB308',marginBottom:4}}>⚠ JWT tokens expire every ~60 minutes</div>
          <div style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.6}}>When analysis fails, update <code style={{background:'rgba(0,201,177,0.1)',color:'var(--teal)',padding:'1px 5px',borderRadius:4}}>backend/.env</code> with a new token and restart the server.</div>
        </div>
      </div>
      <div className="card">
        <p className="section-title">Analysis Preferences</p>
        <div style={{opacity:0.5}}>
          {toggleRow('Auto-save analysis results')}
          {toggleRow('Email notifications for high-risk findings')}
          {toggleRow('Include original clause text in reports')}
        </div>
        <div style={{fontSize:11,color:'var(--text-dim)',marginTop:8}}>These settings are coming soon.</div>
      </div>
      <div className="card">
        <p className="section-title">Usage Statistics</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginTop:4}}>
          {[{label:'Total Scanned',value:history.length},{label:'High Risk Found',value:history.filter(h=>h.overallRiskLevel==='High').length},{label:'Today',value:history.filter(h=>Date.now()-new Date(h.analyzedAt)<86400000).length}].map(s=>(
            <div key={s.label} style={{textAlign:'center'}}>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:32,fontWeight:800,color:'var(--teal)'}}>{s.value}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <p className="section-title">API Endpoint</p>
        <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
          <code style={{flex:1,fontSize:12,background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',color:'var(--text-primary)',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            POST /api/analyze  (multipart/form-data · field: eulaFile)
          </code>
          <button onClick={copy} style={tealBtn()}>{copied?'Copied!':'Copy'}</button>
        </div>
      </div>
    </div>
  );
}

// --- MSA Review View ---------------------------------------------------------
function MSAReviewView({ onNewResult, initialResult, onClearInitial }) {
  const [file,setFile]=useState(null);
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(initialResult||null);
  const [error,setError]=useState('');
  const [templateLoaded,setTemplateLoaded]=useState(null);
  const [expandedDev,setExpandedDev]=useState(null);
  const [pdfLoading,setPdfLoading]=useState(false);
  const [pdfError,setPdfError]=useState('');
  const [dragOver,setDragOver]=useState(false);

  React.useEffect(()=>{
    authFetch('/api/analyze-msa/template-status').then(r=>r.json()).then(d=>setTemplateLoaded(d.templateLoaded)).catch(()=>setTemplateLoaded(false));
  },[]);

  const handleDrop=(e)=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer?.files?.[0]||e.target.files?.[0];if(f) setFile(f);};
  const handleAnalyze=async()=>{
    if(!file) return;
    setLoading(true);setError('');setResult(null);setPdfError('');
    const fd=new FormData();fd.append('msaFile',file);
    try{
      const r=await authFetch(MSA_API_URL,{method:'POST',body:fd});
      const d=await r.json();if(!r.ok) throw new Error(d.error||'Server error '+r.status);
      setResult(d);if(onNewResult) onNewResult(d);
    }catch(err){setError(err.message||'Analysis failed.');}
    finally{setLoading(false);}
  };

  const handleDownloadReport=async()=>{
    if(!result) return;
    setPdfLoading(true);setPdfError('');
    try{
      const r=await authFetch('/api/msa-report-pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});
      if(!r.ok){const d=await r.json();throw new Error(d.error||'PDF failed.');}
      const blob=await r.blob();const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;
      const safeName=(result.vendorName||'Vendor').replace(/[^a-zA-Z0-9 _-]/g,'').replace(/\s+/g,'_');
      a.download='MSA_Report_'+safeName+'.pdf';
      document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    }catch(err){setPdfError(err.message||'PDF failed.');}
    finally{setPdfLoading(false);}
  };

  if(loading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'80px 20px',gap:16}}>
      <LoadingSpinner size="lg"/>
      <div style={{fontSize:14,fontWeight:500,color:'var(--text-primary)'}}>Comparing vendor MSA against Titan template…</div>
      <div style={{fontSize:12,color:'var(--text-muted)'}}>This may take up to 30 seconds</div>
    </div>
  );

  if(result) return (
    <div className="animate-fade-up" style={{display:'flex',flexDirection:'column',gap:20}}>
      <div className="card">
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:'var(--text-primary)'}}>{result.msaTitle||result.vendorName}</div>
            <div style={{fontSize:13,color:'var(--text-muted)',marginTop:4}}>{result.vendorName} · Effective: {result.effectiveDate}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12,flexShrink:0,flexWrap:'wrap'}}>
            <RiskBadge level={result.overallRisk} size="lg"/>
            <button onClick={handleDownloadReport} disabled={pdfLoading} className="btn-primary" style={{height:40,fontSize:13}}>
              {pdfLoading?<><LoadingSpinner size="sm"/> Generating...</>:<><DownloadIcon/> Download Full Report</>}
            </button>
          </div>
        </div>
        {pdfError&&<div style={{fontSize:12,color:'#EF4444',marginTop:8}}>{pdfError}</div>}
        <div style={{fontSize:13,color:'var(--text-muted)',marginTop:16,lineHeight:1.7}}>{result.executiveSummary}</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        {[{label:'Deviations Found',count:result.deviations?.length||0,color:'#EF4444',icon:<AlertTriIcon/>},{label:'Missing Clauses',count:result.missingClauses?.length||0,color:'#EAB308',icon:<AlertCircIcon/>},{label:'Favourable',count:result.favorableClauses?.length||0,color:'#22C55E',icon:<CheckCircIcon/>}].map(s=>(
          <div key={s.label} className="card" style={{borderTop:'3px solid '+s.color,textAlign:'center'}}>
            <div style={{color:s.color,width:24,height:24,margin:'0 auto 8px'}}>{s.icon}</div>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:36,fontWeight:800,color:s.color}}>{s.count}</div>
            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>
      {result.topNegotiationPriorities?.length>0&&(
        <div className="card" style={{borderLeft:'4px solid #EF4444'}}>
          <p className="section-title">Top Negotiation Priorities</p>
          <ol style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:10}}>
            {result.topNegotiationPriorities.map((p,i)=>(
              <li key={i} style={{display:'flex',alignItems:'flex-start',gap:12}}>
                <span style={{flexShrink:0,width:20,height:20,borderRadius:'50%',background:'rgba(239,68,68,0.2)',color:'#EF4444',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',marginTop:2}}>{i+1}</span>
                <p style={{fontSize:13,color:'var(--text-muted)',margin:0}}>{p}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
      {result.deviations?.length>0&&(
        <div className="card">
          <p className="section-title">Deviations from Titan Template ({result.deviations.length})</p>
          <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
            {result.deviations.map((dev,i)=>(
              <div key={i} style={{border:'1px solid '+devBorderColor(dev.risk),borderRadius:10,overflow:'hidden'}}>
                <button onClick={()=>setExpandedDev(expandedDev===i?null:i)}
                  style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'none',border:'none',cursor:'pointer',textAlign:'left',transition:'background 0.2s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg-elevated)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
                    <span style={{width:8,height:8,borderRadius:'50%',background:devBorderColor(dev.risk).replace('rgba','rgb').replace(',0.3',''),flexShrink:0}}/>
                    <span style={{fontSize:13,fontWeight:600,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{dev.topic}</span>
                    <span style={{fontSize:11,color:'var(--text-dim)'}}>{dev.clauseRef}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                    <RiskBadge level={dev.risk}/>
                    <svg style={{width:14,height:14,color:'var(--text-dim)',transform:expandedDev===i?'rotate(180deg)':'none',transition:'transform 0.2s'}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                  </div>
                </button>
                {expandedDev===i&&(
                  <div style={{borderTop:'1px solid var(--border)',padding:'16px',background:'var(--bg-elevated)',display:'flex',flexDirection:'column',gap:10}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                      <div style={{padding:'12px',background:'rgba(0,201,177,0.06)',borderLeft:'3px solid var(--teal)',borderRadius:'0 8px 8px 0'}}>
                        <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'var(--teal)',marginBottom:6}}>Titan Standard</div>
                        <p style={{fontSize:12,color:'var(--text-muted)',margin:0,lineHeight:1.6}}>{dev.titanPosition}</p>
                      </div>
                      <div style={{padding:'12px',background:'rgba(239,68,68,0.06)',borderLeft:'3px solid #EF4444',borderRadius:'0 8px 8px 0'}}>
                        <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'#EF4444',marginBottom:6}}>Vendor Version</div>
                        <p style={{fontSize:12,color:'var(--text-muted)',margin:0,lineHeight:1.6}}>{dev.vendorPosition}</p>
                      </div>
                    </div>
                    <div style={{padding:'10px 12px',background:'rgba(234,179,8,0.06)',borderLeft:'3px solid #EAB308',borderRadius:'0 8px 8px 0'}}>
                      <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:'#EAB308',marginBottom:4}}>Objection</div>
                      <p style={{fontSize:12,color:'var(--text-muted)',margin:0}}>{dev.objection}</p>
                    </div>
                    <div style={{padding:'10px 12px',background:'rgba(34,197,94,0.06)',borderLeft:'3px solid #22C55E',borderRadius:'0 8px 8px 0'}}>
                      <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:'#22C55E',marginBottom:4}}>Recommendation</div>
                      <p style={{fontSize:12,color:'var(--text-muted)',margin:0}}>{dev.recommendation}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {result.missingClauses?.length>0&&(
        <div className="card">
          <p className="section-title">Missing Clauses ({result.missingClauses.length})</p>
          {result.missingClauses.map((mc,i)=>(
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
              <RiskBadge level={mc.importance}/>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>{mc.clause}</div>
                <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{mc.recommendation}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16}}>
        {result.dataPrivacyRisk&&<InfoCard title="Data Privacy Risk">{result.dataPrivacyRisk}</InfoCard>}
        {result.liabilityRisk&&<InfoCard title="Liability Risk">{result.liabilityRisk}</InfoCard>}
        {result.terminationRisk&&<InfoCard title="Termination Risk">{result.terminationRisk}</InfoCard>}
      </div>
      {result.favorableClauses?.length>0&&(
        <div className="card">
          <p className="section-title">Favourable Clauses ✓</p>
          {result.favorableClauses.map((fc,i)=>(
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
              <svg style={{width:16,height:16,color:'#22C55E',flexShrink:0,marginTop:1}} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
              <div>
                <span style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>{fc.topic} </span>
                <span style={{fontSize:11,color:'var(--text-dim)'}}>{fc.clauseRef}</span>
                <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>{fc.note}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{textAlign:'center',paddingTop:8}}>
        <button onClick={()=>{setResult(null);setFile(null);if(onClearInitial) onClearInitial();}} style={{background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--teal)',textDecoration:'underline'}}>Review another MSA</button>
      </div>
    </div>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      {templateLoaded===false&&(
        <div style={{padding:'14px 16px',background:'rgba(234,179,8,0.08)',border:'1px solid rgba(234,179,8,0.25)',borderRadius:10}}>
          <div style={{fontSize:13,fontWeight:600,color:'#EAB308'}}>⚠ Titan MSA Template not uploaded</div>
          <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>Go to <strong>Settings → Titan MSA Template</strong> and upload your blank Titan MSA template first.</div>
        </div>
      )}
      {templateLoaded===true&&(
        <div style={{padding:'10px 16px',background:'rgba(0,201,177,0.06)',border:'1px solid var(--border-accent)',borderRadius:10,display:'flex',alignItems:'center',gap:8}}>
          <span style={{color:'var(--teal)',fontSize:13}}>✓</span>
          <span style={{fontSize:12,color:'var(--teal)',fontWeight:500}}>Titan MSA Template loaded — ready to compare</span>
        </div>
      )}
      {error&&<ErrorBanner message={error} onDismiss={()=>setError('')}/>}
      <div className="card">
        <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:'var(--text-primary)',marginBottom:20}}>Upload Vendor MSA</div>
        <div
          onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
          onClick={()=>document.getElementById('msa-file-input').click()}
          style={{border:'2px dashed '+(dragOver?'var(--teal)':file?'rgba(34,197,94,0.5)':'var(--border-accent)'),background:dragOver?'rgba(0,201,177,0.08)':file?'rgba(34,197,94,0.04)':'rgba(0,201,177,0.04)',borderRadius:12,minHeight:200,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,cursor:'pointer',transition:'all 0.2s',transform:dragOver?'scale(1.01)':'scale(1)'}}>
          <input id="msa-file-input" type="file" accept=".pdf,.docx,.doc" style={{display:'none'}} onChange={handleDrop}/>
          {file?(
            <>
              <div style={{width:56,height:56,borderRadius:'50%',background:'rgba(34,197,94,0.15)',display:'flex',alignItems:'center',justifyContent:'center',color:'#22C55E'}}><ContractIcon size={26}/></div>
              <div style={{fontSize:14,fontWeight:500,color:'var(--text-primary)'}}>{file.name}</div>
              <button type="button" onClick={e=>{e.stopPropagation();setFile(null);}} style={{background:'var(--bg-elevated)',border:'1px solid var(--border-accent)',color:'var(--teal)',fontSize:12,padding:'5px 14px',borderRadius:100,cursor:'pointer'}}>✕ Remove</button>
            </>
          ):(
            <>
              <div style={{width:56,height:56,borderRadius:'50%',background:'var(--teal-glow)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--teal)'}}><ContractIcon size={26}/></div>
              <div style={{fontSize:15,fontWeight:500,color:'var(--text-primary)'}}>Drop vendor MSA PDF here</div>
              <div style={{fontSize:12,color:'var(--text-muted)'}}>or click to browse — PDF or DOCX · max 10 MB</div>
              <div style={{fontSize:11,color:'var(--text-dim)',textAlign:'center',maxWidth:280}}>Compared against Titan's master MSA template</div>
            </>
          )}
        </div>
        {file&&<button onClick={handleAnalyze} disabled={!templateLoaded} className="btn-primary" style={{width:'100%',marginTop:16}}><ContractIcon/> Compare Against Titan Template</button>}
      </div>
    </div>
  );
}

// --- Login Screen ------------------------------------------------------------
function LoginScreen({ onLogin, theme, setTheme, message }) {
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [showPw,setShowPw]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const handleSubmit=async(e)=>{
    e.preventDefault();
    setError('');setLoading(true);
    try{
      const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      const d=await r.json();
      if(!r.ok){setError(d.error||'Login failed.');setLoading(false);return;}
      _token=d.token;
      localStorage.setItem('eula_token',d.token);
      onLogin(d.user,d.token);
    }catch{setError('Network error. Please try again.');setLoading(false);}
  };
  return (
    <div style={{minHeight:'100vh',background:'var(--bg-base)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:400}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:32,gap:10}}>
          <TitanStar size={52}/>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,color:'var(--text-primary)',letterSpacing:'1.5px'}}>EULA Scout</div>
          <div style={{fontSize:11,textTransform:'uppercase',letterSpacing:'3px',color:'var(--text-muted)'}}>Procurement AI · Titan</div>
        </div>
        <form onSubmit={handleSubmit} style={{background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:16,padding:32,boxShadow:'var(--shadow-card)'}}>
          <div style={{marginBottom:18}}>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="username"
              style={{width:'100%',boxSizing:'border-box',background:'var(--bg-elevated)',border:'1px solid var(--border-accent)',borderRadius:8,padding:'10px 14px',fontSize:14,color:'var(--text-primary)',outline:'none'}}/>
          </div>
          <div style={{marginBottom:24}}>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>Password</label>
            <div style={{position:'relative'}}>
              <input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"
                style={{width:'100%',boxSizing:'border-box',background:'var(--bg-elevated)',border:'1px solid var(--border-accent)',borderRadius:8,padding:'10px 40px 10px 14px',fontSize:14,color:'var(--text-primary)',outline:'none'}}/>
              <button type="button" onClick={()=>setShowPw(s=>!s)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:2}}>
                {showPw?<svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>:<svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>}
              </button>
            </div>
          </div>
          {message&&<div style={{marginBottom:16,padding:'10px 14px',background:'rgba(0,201,177,0.08)',border:'1px solid var(--border-accent)',borderRadius:8,fontSize:13,color:'var(--teal)'}}>{message}</div>}
          {error&&<div style={{marginBottom:16,padding:'10px 14px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,fontSize:13,color:'#EF4444'}}>{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary" style={{width:'100%'}}>
            {loading?'Signing in…':'Sign In'}
          </button>
        </form>
        <div style={{marginTop:16,textAlign:'center',fontSize:11,color:'var(--text-dim)'}}>
          <button onClick={()=>setTheme(theme==='navy'?'light':'navy')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-dim)',fontSize:11,textDecoration:'underline'}}>Switch theme</button>
        </div>
      </div>
    </div>
  );
}

// --- Users View --------------------------------------------------------------
function UsersView() {
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [formData,setFormData]=useState({name:'',email:'',password:'',confirm:''});
  const [formError,setFormError]=useState('');
  const [formLoading,setFormLoading]=useState(false);
  const [actionMsg,setActionMsg]=useState('');

  const load=useCallback(async()=>{
    setLoading(true);
    try{ const r=await authFetch('/api/users'); if(r.ok) setUsers(await r.json()); }
    catch{} finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);

  const handleAdd=async(e)=>{
    e.preventDefault();setFormError('');
    if(formData.password!==formData.confirm){setFormError('Passwords do not match.');return;}
    if(formData.password.length<8){setFormError('Password must be at least 8 characters.');return;}
    setFormLoading(true);
    try{
      const r=await authFetch('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:formData.name,email:formData.email,password:formData.password})});
      const d=await r.json();
      if(!r.ok){setFormError(d.error||'Failed to add user.');setFormLoading(false);return;}
      setShowForm(false);setFormData({name:'',email:'',password:'',confirm:''});setActionMsg('User added successfully.');
      load();
    }catch{setFormError('Network error.');} finally{setFormLoading(false);}
  };

  const toggleActive=async(id,active)=>{
    const endpoint=active?'/api/users/'+id+'/deactivate':'/api/users/'+id+'/activate';
    const r=await authFetch(endpoint,{method:'PATCH'});
    if(r.ok){setActionMsg(active?'User deactivated.':'User activated.');load();}
    else{const d=await r.json();setActionMsg(d.error||'Action failed.');}
  };

  const inputStyle={width:'100%',boxSizing:'border-box',background:'var(--bg-elevated)',border:'1px solid var(--border-accent)',borderRadius:8,padding:'9px 12px',fontSize:13,color:'var(--text-primary)',outline:'none'};
  const labelStyle={display:'block',fontSize:11,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:5};

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:800,color:'var(--text-primary)'}}>User Management</div>
        <button onClick={()=>{setShowForm(s=>!s);setFormError('');}} className="btn-primary" style={{fontSize:13}}>
          {showForm?'✕ Cancel':'+ Add User'}
        </button>
      </div>
      {actionMsg&&<div style={{marginBottom:16,padding:'10px 14px',background:'rgba(0,201,177,0.08)',border:'1px solid var(--border-accent)',borderRadius:8,fontSize:13,color:'var(--teal)',display:'flex',justifyContent:'space-between'}}><span>{actionMsg}</span><button onClick={()=>setActionMsg('')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-dim)',fontSize:14}}>✕</button></div>}
      {showForm&&(
        <form onSubmit={handleAdd} style={{background:'var(--bg-surface)',border:'1px solid var(--border-accent)',borderRadius:12,padding:24,marginBottom:24}}>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'var(--text-primary)',marginBottom:18}}>New User</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
            <div><label style={labelStyle}>Full Name</label><input type="text" value={formData.name} onChange={e=>setFormData(d=>({...d,name:e.target.value}))} required style={inputStyle}/></div>
            <div><label style={labelStyle}>Email</label><input type="email" value={formData.email} onChange={e=>setFormData(d=>({...d,email:e.target.value}))} required style={inputStyle}/></div>
            <div><label style={labelStyle}>Password</label><input type="password" value={formData.password} onChange={e=>setFormData(d=>({...d,password:e.target.value}))} required minLength={8} style={inputStyle}/></div>
            <div><label style={labelStyle}>Confirm Password</label><input type="password" value={formData.confirm} onChange={e=>setFormData(d=>({...d,confirm:e.target.value}))} required style={inputStyle}/></div>
          </div>
          {formError&&<div style={{marginBottom:14,padding:'8px 12px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,fontSize:12,color:'#EF4444'}}>{formError}</div>}
          <button type="submit" disabled={formLoading} className="btn-primary">{formLoading?'Adding…':'Add User'}</button>
        </form>
      )}
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        {loading?(<div style={{padding:40,textAlign:'center',color:'var(--text-muted)',fontSize:14}}>Loading users…</div>):(
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)',background:'var(--bg-elevated)'}}>
                {['Name','Email','Status','Joined','Last Login','Added By','Actions'].map(h=>(
                  <th key={h} style={{padding:'10px 16px',textAlign:'left',fontSize:11,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'1px'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u,i)=>(
                <tr key={u.id} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'transparent':'rgba(255,255,255,0.015)'}}>
                  <td style={{padding:'12px 16px',fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>{u.name}</td>
                  <td style={{padding:'12px 16px',fontSize:13,color:'var(--text-muted)'}}>{u.email}</td>
                  <td style={{padding:'12px 16px'}}><span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:100,background:u.is_active?'rgba(34,197,94,0.12)':'rgba(239,68,68,0.1)',color:u.is_active?'#22C55E':'#EF4444',border:`1px solid ${u.is_active?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.3)'}`}}>{u.is_active?'Active':'Inactive'}</span></td>
                  <td style={{padding:'12px 16px',fontSize:12,color:'var(--text-muted)'}}>{u.created_at?new Date(u.created_at).toLocaleDateString():'-'}</td>
                  <td style={{padding:'12px 16px',fontSize:12,color:'var(--text-muted)'}}>{u.last_login?new Date(u.last_login).toLocaleDateString():'-'}</td>
                  <td style={{padding:'12px 16px',fontSize:12,color:'var(--text-muted)'}}>{u.created_by_name||'-'}</td>
                  <td style={{padding:'12px 16px'}}>
                    <button onClick={()=>toggleActive(u.id,u.is_active)} style={{fontSize:11,padding:'4px 12px',borderRadius:6,border:'1px solid var(--border-accent)',background:'none',cursor:'pointer',color:u.is_active?'#EF4444':'var(--teal)'}}>
                      {u.is_active?'Deactivate':'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length===0&&<tr><td colSpan={7} style={{padding:32,textAlign:'center',fontSize:14,color:'var(--text-muted)'}}>No users found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// --- App Root ----------------------------------------------------------------
export default function App() {
  const [view,setView]=useState('analyze');
  const [history,setHistory]=useState([]);
  const [msaHistory,setMsaHistory]=useState([]);
  const [theme,setThemeState]=useState(()=>localStorage.getItem('eula_theme')||'navy');
  const [currentUser,setCurrentUser]=useState(null);
  const [authChecked,setAuthChecked]=useState(false);

  const setTheme=(key)=>{
    setThemeState(key);
    const vars=THEMES[key]?.vars||THEMES.navy.vars;
    Object.entries(vars).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));
    localStorage.setItem('eula_theme',key);
  };
  useEffect(()=>{
    const saved=localStorage.getItem('eula_theme')||'navy';
    const vars=THEMES[saved]?.vars||THEMES.navy.vars;
    Object.entries(vars).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));
  },[]);

  // On mount: verify stored token
  useEffect(()=>{
    const token=localStorage.getItem('eula_token');
    if(!token){setAuthChecked(true);return;}
    _token=token;
    fetch('/api/auth/me',{headers:{Authorization:'Bearer '+token}})
      .then(r=>r.ok?r.json():Promise.reject())
      .then(d=>{setCurrentUser(d.user);setAuthChecked(true);})
      .catch(()=>{_token=null;localStorage.removeItem('eula_token');setAuthChecked(true);});
  },[]);

  const handleLogin=(user,token)=>{_token=token;setCurrentUser(user);};
  const handleLogout=useCallback(async(reason)=>{
    try{ await authFetch('/api/auth/logout',{method:'POST'}); }catch{}
    _token=null;localStorage.removeItem('eula_token');
    setCurrentUser(null);setHistory([]);setMsaHistory([]);
    if(reason==='timeout') setSessionMsg('You were signed out due to 30 minutes of inactivity.');
  },[]);

  // Idle session timeout — 30 minutes, warn at 28 minutes
  const IDLE_TIMEOUT=30*60*1000;
  const WARN_BEFORE=2*60*1000;
  const [idleWarning,setIdleWarning]=useState(false);
  const [sessionMsg,setSessionMsg]=useState('');
  const idleTimer=useRef(null);
  const warnTimer=useRef(null);
  const resetIdle=useCallback(()=>{
    setIdleWarning(false);
    clearTimeout(idleTimer.current);
    clearTimeout(warnTimer.current);
    if(!currentUser) return;
    warnTimer.current=setTimeout(()=>setIdleWarning(true), IDLE_TIMEOUT-WARN_BEFORE);
    idleTimer.current=setTimeout(()=>handleLogout('timeout'), IDLE_TIMEOUT);
  },[currentUser,handleLogout]);

  useEffect(()=>{
    if(!currentUser){clearTimeout(idleTimer.current);clearTimeout(warnTimer.current);return;}
    const events=['mousemove','keydown','click','scroll','touchstart'];
    events.forEach(e=>window.addEventListener(e,resetIdle,{passive:true}));
    resetIdle();
    return()=>{events.forEach(e=>window.removeEventListener(e,resetIdle));clearTimeout(idleTimer.current);clearTimeout(warnTimer.current);};
  },[currentUser,resetIdle]);

  const [historyResult,setHistoryResult]=useState(null);
  const [msaHistoryResult,setMsaHistoryResult]=useState(null);

  const fetchHistory=useCallback(async()=>{
    try{
      const [er,mr]=await Promise.all([authFetch('/api/history/eula'),authFetch('/api/history/msa')]);
      if(er.ok) setHistory(await er.json());
      if(mr.ok) setMsaHistory(await mr.json());
    }catch{}
  },[]);

  useEffect(()=>{if(currentUser) fetchHistory();},[fetchHistory,currentUser]);

  const handleNewResult=()=>fetchHistory();
  const handleNewMsaResult=()=>fetchHistory();
  const handleViewEula=(result)=>{setHistoryResult(result);setMsaHistoryResult(null);setView('analyze');};
  const handleViewMsa=(result)=>{setMsaHistoryResult(result);setHistoryResult(null);setView('msa');};
  const handleClearEula=async(id)=>{
    if(id){setHistory(h=>h.filter(x=>x.id!==id));}
    else{if(!window.confirm('Clear all EULA history?')) return;await authFetch('/api/history/eula',{method:'DELETE'});setHistory([]);}
  };
  const handleClearMsa=async()=>{
    if(!window.confirm('Clear all MSA history?')) return;
    await authFetch('/api/history/msa',{method:'DELETE'});setMsaHistory([]);
  };
  const handleNavChange=(id)=>{setView(id);setHistoryResult(null);setMsaHistoryResult(null);};

  if(!authChecked) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'var(--bg-base)'}}>
      <LoadingSpinner size="lg"/>
    </div>
  );
  if(!currentUser) return <LoginScreen onLogin={handleLogin} theme={theme} setTheme={setTheme} message={sessionMsg}/>;

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'var(--bg-base)'}}>
      {idleWarning&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{background:'var(--bg-surface)',border:'1px solid var(--border-accent)',borderRadius:16,padding:32,maxWidth:380,width:'100%',textAlign:'center',boxShadow:'var(--shadow-card)'}}>
            <div style={{fontSize:32,marginBottom:12}}>⏱</div>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:'var(--text-primary)',marginBottom:8}}>Session Expiring Soon</div>
            <div style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.6,marginBottom:24}}>You've been inactive for 28 minutes. You'll be signed out in <strong style={{color:'var(--teal)'}}>2 minutes</strong> unless you continue.</div>
            <button onClick={resetIdle} className="btn-primary" style={{width:'100%',marginBottom:10}}>Stay Signed In</button>
            <button onClick={()=>handleLogout()} style={{width:'100%',background:'none',border:'1px solid var(--border)',borderRadius:8,padding:'9px 0',fontSize:13,color:'var(--text-muted)',cursor:'pointer'}}>Sign Out Now</button>
          </div>
        </div>
      )}
      <Sidebar view={view} setView={handleNavChange} historyCount={history.length+msaHistory.length} theme={theme} setTheme={setTheme} currentUser={currentUser} onLogout={handleLogout}/>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'auto',minWidth:0}}>
        <Header view={view}/>
        <div style={{padding:'28px 32px',maxWidth:960,width:'100%',margin:'0 auto',flex:1}}>
          {view==='analyze'&&(historyResult?<ResultsDashboard result={historyResult} onReset={()=>setHistoryResult(null)} onDownloadFull={async()=>{
            try{const r=await authFetch('/api/eula-full-report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(historyResult)});if(!r.ok)return;const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(historyResult.softwareName||'EULA').replace(/[^a-zA-Z0-9 _-]/g,'').replace(/\s+/g,'_')+'_Full_Report.pdf';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);}catch{}
          }}/>:<AnalyzeView onNewResult={handleNewResult}/>)}
          {view==='msa'&&(msaHistoryResult?<MSAReviewView initialResult={msaHistoryResult} onClearInitial={()=>setMsaHistoryResult(null)} onNewResult={handleNewMsaResult}/>:<MSAReviewView onNewResult={handleNewMsaResult}/>)}
          {view==='dashboard'&&<RiskDashboardView history={history}/>}
          {view==='history'&&<HistoryView eulaHistory={history} msaHistory={msaHistory} onViewEula={handleViewEula} onViewMsa={handleViewMsa} onClearEula={handleClearEula} onClearMsa={handleClearMsa}/>}
          {view==='settings'&&<SettingsView history={history}/>}
          {view==='users'&&<UsersView/>}
        </div>
      </div>
    </div>
  );
}

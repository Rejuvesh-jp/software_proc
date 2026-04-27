import React, { useCallback, useRef, useState } from 'react';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export default function UploadZone({ onAnalyze, loading }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');
  const inputRef = useRef(null);

  const validateAndSet = (f) => {
    setFileError('');
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setFileError('Only PDF files are accepted.');
      return;
    }
    if (f.size > MAX_SIZE) {
      setFileError('File exceeds the 10 MB limit. Please upload a smaller PDF.');
      return;
    }
    setFile(f);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    validateAndSet(dropped);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleChange = (e) => {
    validateAndSet(e.target.files[0]);
    e.target.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      setFileError('Please select a PDF file first.');
      return;
    }
    onAnalyze(file);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="card">
      <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:'var(--text-primary)',marginBottom:20}}>Upload EULA Document</div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Drop zone for PDF upload"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        style={{
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          borderRadius:12,border:'2px dashed '+(dragOver?'var(--teal)':file?'rgba(34,197,94,0.5)':'var(--border-accent)'),
          background:dragOver?'rgba(0,201,177,0.08)':file?'rgba(34,197,94,0.04)':'rgba(0,201,177,0.04)',
          minHeight:200,padding:'48px 24px',cursor:'pointer',gap:12,
          transition:'all 0.2s',transform:dragOver?'scale(1.01)':'scale(1)',userSelect:'none',
        }}
      >
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" style={{display:'none'}} onChange={handleChange}/>

        {file ? (
          <>
            <div style={{width:56,height:56,borderRadius:'50%',background:'rgba(34,197,94,0.15)',display:'flex',alignItems:'center',justifyContent:'center',color:'#22C55E'}}>
              <svg style={{width:26,height:26}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7 21h10a2 2 0 002-2V7l-5-5H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
            </div>
            <div style={{background:'var(--bg-elevated)',border:'1px solid var(--border-accent)',color:'var(--teal)',fontSize:12,padding:'6px 14px',borderRadius:100,display:'flex',alignItems:'center',gap:8}}>
              <svg style={{width:14,height:14,flexShrink:0}} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              {file.name}
              <button type="button" onClick={(e)=>{e.stopPropagation();setFile(null);}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-dim)',padding:0,marginLeft:4,fontSize:14,lineHeight:1}}>✕</button>
            </div>
            <p style={{fontSize:11,color:'var(--text-muted)'}}>{formatSize(file.size)}</p>
          </>
        ) : (
          <>
            <div style={{width:56,height:56,borderRadius:'50%',background:'var(--teal-glow)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--teal)'}}>
              <svg style={{width:26,height:26}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
            </div>
            <p style={{fontSize:15,fontWeight:500,color:'var(--text-primary)',margin:0}}>Drag &amp; drop your EULA PDF here</p>
            <p style={{fontSize:12,color:'var(--text-muted)',margin:0}}>or click to browse — PDF or DOCX · max 10 MB</p>
          </>
        )}
      </div>

      {fileError && (
        <div style={{marginTop:8,fontSize:12,color:'#EF4444',display:'flex',alignItems:'center',gap:6}}>
          <svg style={{width:14,height:14,flexShrink:0}} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          {fileError}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !file}
        className="btn-primary"
        style={{width:'100%',marginTop:16}}
      >
        {loading ? (
          <>
            <svg style={{width:16,height:16,animation:'spin-teal 0.8s linear infinite',flexShrink:0}} fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" stroke="rgba(0,201,177,0.2)" strokeWidth="3"/>
              <circle cx="12" cy="12" r="9" stroke="var(--teal)" strokeWidth="3" strokeDasharray="42.4 14.1" strokeLinecap="round"/>
            </svg>
            Analyzing with AI...
          </>
        ) : (
          <>
            <svg style={{width:16,height:16}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            Analyze EULA
          </>
        )}
      </button>
    </div>
  );
}

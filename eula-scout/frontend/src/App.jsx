import React, { useState } from 'react';
import UploadZone from './components/UploadZone';
import SummaryCard from './components/SummaryCard';
import KeyClauseList from './components/KeyClauseList';
import RiskBadge from './components/RiskBadge';

const API_URL = '/api/analyze';
const MSA_API_URL = '/api/analyze-msa';
const TEMPLATE_API_URL = '/api/upload-template';
const HISTORY_KEY = 'eula_scout_history';
const MSA_HISTORY_KEY = 'eula_scout_msa_history';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function loadMsaHistory() {
  try { return JSON.parse(localStorage.getItem(MSA_HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function saveToHistory(result) {
  const history = loadHistory();
  const entry = {
    id: Date.now(),
    analyzedAt: new Date().toISOString(),
    softwareName: result.softwareName || 'Unknown',
    vendor: result.vendor || '—',
    overallRiskLevel: result.overallRiskLevel || 'Medium',
    result,
  };
  const updated = [entry, ...history].slice(0, 50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

function saveToMsaHistory(result) {
  const history = loadMsaHistory();
  const entry = {
    id: Date.now(),
    analyzedAt: new Date().toISOString(),
    vendorName: result.vendorName || 'Unknown Vendor',
    msaTitle: result.msaTitle || result.vendorName || 'MSA',
    overallRisk: result.overallRisk || 'Medium',
    result,
  };
  const updated = [entry, ...history].slice(0, 50);
  localStorage.setItem(MSA_HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function InfoCard({ title, children }) {
  return (
    <div className="card">
      <p className="section-title">{title}</p>
      <p className="prose-sm-custom">{children}</p>
    </div>
  );
}

function ProhibitedUses({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="card">
      <p className="section-title">Prohibited Uses</p>
      <div className="flex flex-wrap gap-2 mt-1">
        {items.map((use, i) => (
          <span
            key={i}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100"
          >
            <svg className="w-3 h-3 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524L13.477 14.89zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
            </svg>
            {use}
          </span>
        ))}
      </div>
    </div>
  );
}

function Recommendations({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="card">
      <p className="section-title">Procurement Recommendations</p>
      <ol className="space-y-3 mt-1">
        {items.map((rec, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <p className="text-sm text-gray-700 leading-relaxed">{rec}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
      <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-800">Analysis Error</p>
        <p className="text-sm text-red-700 mt-0.5">{message}</p>
      </div>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function handlePrint() { window.print(); }

function ResultsDashboard({ result, onReset, onDownloadPdf, pdfLoading }) {
  return (
    <div className="space-y-5">
      <SummaryCard data={result} />
      {onDownloadPdf && (
        <div className="no-print flex justify-end">
          <button
            onClick={onDownloadPdf}
            disabled={pdfLoading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              pdfLoading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-red-700 hover:bg-red-800 text-white shadow-sm'
            }`}
          >
            {pdfLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating One-Pager...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Executive One-Pager PDF
              </>
            )}
          </button>
        </div>
      )}
      <KeyClauseList clauses={result.keyClauses} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {result.dataPrivacy && <InfoCard title="Data Privacy">{result.dataPrivacy}</InfoCard>}
        {result.intellectualProperty && <InfoCard title="Intellectual Property">{result.intellectualProperty}</InfoCard>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {result.terminationPolicy && <InfoCard title="Termination Policy">{result.terminationPolicy}</InfoCard>}
        {result.autoRenewal && <InfoCard title="Auto-Renewal">{result.autoRenewal}</InfoCard>}
        {result.liabilityLimitation && <InfoCard title="Liability Limitation">{result.liabilityLimitation}</InfoCard>}
      </div>
      <ProhibitedUses items={result.prohibitedUses} />
      <Recommendations items={result.recommendations} />
      {onReset && (
        <div className="no-print text-center pt-2">
          <button onClick={onReset} className="text-sm text-blue-700 hover:text-blue-900 underline underline-offset-2 transition-colors">
            Analyze another document
          </button>
        </div>
      )}
    </div>
  );
}

// ── View: Analyze ─────────────────────────────────────────────────────────────
function AnalyzeView({ onNewResult, initialResult }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(initialResult || null);
  const [error, setError] = useState('');
  const [currentFile, setCurrentFile] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleAnalyze = async (file) => {
    setLoading(true); setError(''); setResult(null);
    setCurrentFile(file);
    const formData = new FormData();
    formData.append('eulaFile', file);
    try {
      const response = await fetch(API_URL, { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Server error: ${response.status}`);
      setResult(data);
      onNewResult(data);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally { setLoading(false); }
  };

  const handleDownloadPdf = async () => {
    if (!currentFile) return;
    setPdfLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('eulaFile', currentFile);
    formData.append('company', 'Titan Company Ltd');
    formData.append('accent', '#DA1F26');
    try {
      const response = await fetch('/api/generate-pdf', { method: 'POST', body: formData });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'PDF generation failed.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'EULA_Executive_Summary.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Failed to generate PDF.');
    } finally { setPdfLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="no-print"><UploadZone onAnalyze={handleAnalyze} loading={loading} /></div>
      {error && <div className="no-print"><ErrorBanner message={error} onDismiss={() => setError('')} /></div>}
      {result
        ? <ResultsDashboard result={result}
            onReset={() => { setResult(null); setCurrentFile(null); }}
            onDownloadPdf={handleDownloadPdf}
            pdfLoading={pdfLoading} />
        : !loading && !error && (
          <div className="text-center py-10 text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">Upload a EULA PDF to get started</p>
          </div>
        )
      }
    </div>
  );
}

// ── View: Risk Dashboard ──────────────────────────────────────────────────────
function RiskDashboardView({ history }) {
  const counts = { Low: 0, Medium: 0, High: 0 };
  history.forEach((h) => { if (counts[h.overallRiskLevel] !== undefined) counts[h.overallRiskLevel]++; });
  const total = history.length;

  if (total === 0) return (
    <div className="text-center py-16 text-gray-400">
      <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="text-sm">No analyses yet. Analyze a EULA to see your dashboard.</p>
    </div>
  );

  const RiskBar = ({ level, color }) => {
    const pct = Math.round((counts[level] / total) * 100);
    return (
      <div className="flex items-center gap-3">
        <span className="w-16 text-xs font-medium text-gray-600">{level}</span>
        <div className="flex-1 bg-gray-100 rounded-full h-3">
          <div className={`h-3 rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="w-8 text-xs text-gray-500 text-right">{counts[level]}</span>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Analyzed', value: total, bg: 'bg-blue-50', text: 'text-blue-700' },
          { label: 'High Risk', value: counts.High, bg: 'bg-red-50', text: 'text-red-700' },
          { label: 'Medium Risk', value: counts.Medium, bg: 'bg-amber-50', text: 'text-amber-700' },
          { label: 'Low Risk', value: counts.Low, bg: 'bg-emerald-50', text: 'text-emerald-700' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-5`}>
            <p className={`text-3xl font-bold ${s.text}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <p className="section-title">Risk Distribution</p>
        <div className="space-y-3 mt-2">
          <RiskBar level="High" color="bg-red-500" />
          <RiskBar level="Medium" color="bg-amber-400" />
          <RiskBar level="Low" color="bg-emerald-500" />
        </div>
      </div>
      {counts.High > 0 && (
        <div className="card">
          <p className="section-title">High Risk EULAs</p>
          <div className="space-y-2 mt-1">
            {history.filter((h) => h.overallRiskLevel === 'High').map((h) => (
              <div key={h.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{h.softwareName}</p>
                  <p className="text-xs text-gray-400">{h.vendor} · {formatDate(h.analyzedAt)}</p>
                </div>
                <RiskBadge level="High" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── View: History ─────────────────────────────────────────────────────────────
function HistoryView({ eulaHistory, msaHistory, onViewEula, onViewMsa, onClearEula, onClearMsa }) {
  const [tab, setTab] = useState('eula');

  const riskColor = (r) =>
    r === 'High'   ? 'bg-red-100 text-red-700 border-red-200' :
    r === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                     'bg-emerald-100 text-emerald-700 border-emerald-200';

  const EmptyState = ({ label }) => (
    <div className="text-center py-16 text-gray-400">
      <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-sm">{label}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { id: 'eula', label: `EULA Analysis (${eulaHistory.length})` },
          { id: 'msa',  label: `MSA Review (${msaHistory.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* EULA tab */}
      {tab === 'eula' && (
        eulaHistory.length === 0
          ? <EmptyState label="No EULA analyses yet. Analyze a EULA to see it here." />
          : <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{eulaHistory.length} document{eulaHistory.length !== 1 ? 's' : ''} analyzed</p>
                <button onClick={onClearEula} className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2 transition-colors">Clear</button>
              </div>
              {eulaHistory.map((h) => (
                <div key={h.id} className="card flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 text-sm">{h.softwareName}</p>
                      <RiskBadge level={h.overallRiskLevel} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{h.vendor} · {formatDate(h.analyzedAt)}</p>
                  </div>
                  <button onClick={() => onViewEula(h.result)} className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 transition-colors">
                    View Report
                  </button>
                </div>
              ))}
            </div>
      )}

      {/* MSA tab */}
      {tab === 'msa' && (
        msaHistory.length === 0
          ? <EmptyState label="No MSA reviews yet. Review a vendor MSA to see it here." />
          : <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{msaHistory.length} MSA{msaHistory.length !== 1 ? 's' : ''} reviewed</p>
                <button onClick={onClearMsa} className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2 transition-colors">Clear</button>
              </div>
              {msaHistory.map((h) => (
                <div key={h.id} className="card flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 text-sm">{h.msaTitle}</p>
                      <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border ${riskColor(h.overallRisk)}`}>
                        {h.overallRisk} Risk
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{h.vendorName} · {formatDate(h.analyzedAt)}</p>
                  </div>
                  <button onClick={() => onViewMsa(h.result)} className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 transition-colors">
                    View Report
                  </button>
                </div>
              ))}
            </div>
      )}
    </div>
  );
}

// ── View: Settings ────────────────────────────────────────────────────────────
function SettingsView({ history }) {
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [templateStatus, setTemplateStatus] = useState(null);
  const [templateMsg, setTemplateMsg] = useState('');

  React.useEffect(() => {
    fetch('/api/analyze-msa/template-status')
      .then((r) => r.json())
      .then((d) => setTemplateStatus(d.templateLoaded))
      .catch(() => setTemplateStatus(false));
  }, []);

  const handleTemplateUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setTemplateMsg('');
    const fd = new FormData();
    fd.append('templateFile', file);
    try {
      const r = await fetch(TEMPLATE_API_URL, { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setTemplateStatus(true);
      setTemplateMsg(`Template uploaded successfully (${d.characters.toLocaleString()} characters extracted).`);
    } catch (err) {
      setTemplateMsg('Upload failed: ' + err.message);
    } finally { setUploading(false); e.target.value = ''; }
  };

  const handleTemplateDelete = async () => {
    if (!window.confirm('Remove stored Titan MSA template?')) return;
    await fetch(TEMPLATE_API_URL, { method: 'DELETE' });
    setTemplateStatus(false);
    setTemplateMsg('Template removed.');
  };

  const copy = () => {
    navigator.clipboard.writeText('POST /api/analyze').then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="card">
        <p className="section-title">AI Gateway Configuration</p>
        <div className="space-y-3 mt-2">
          {[
            { label: 'Gateway URL', value: 'https://ai.titan.in/gateway' },
            { label: 'Model', value: 'gpt-5.4-azure' },
            { label: 'Auth Method', value: 'Bearer Token (JWT)' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-xs font-medium text-gray-500 w-36">{row.label}</span>
              <span className="text-sm text-gray-800 font-mono">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <p className="section-title">Titan MSA Template</p>
        <p className="text-xs text-gray-500 mt-1 mb-3">
          Upload Titan's standard MSA template once. It will be used as the benchmark when comparing vendor MSAs.
        </p>
        <div className={`flex items-center gap-3 p-3 rounded-lg border mb-3 ${
          templateStatus === true ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
        }`}>
          <span className="text-lg">{templateStatus === true ? '✅' : '⚠️'}</span>
          <span className={`text-xs font-medium ${
            templateStatus === true ? 'text-emerald-800' : 'text-amber-800'
          }`}>
            {templateStatus === null ? 'Checking...' : templateStatus ? 'Titan MSA template is loaded' : 'No template uploaded yet — MSA Review will not work until you upload it'}
          </span>
          {templateStatus && (
            <button onClick={handleTemplateDelete} className="ml-auto text-xs text-red-500 hover:text-red-700 underline">Remove</button>
          )}
        </div>
        <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
          uploading ? 'bg-gray-100 text-gray-400' : 'bg-blue-700 text-white hover:bg-blue-800'
        }`}>
          {uploading ? 'Uploading...' : templateStatus ? '🔄 Replace Template' : '📤 Upload Titan MSA Template'}
          <input type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={handleTemplateUpload} disabled={uploading} />
        </label>
        <p className="text-xs text-gray-400 mt-2">Accepted formats: PDF, Word (.docx)</p>
        {templateMsg && <p className="text-xs mt-2 text-gray-600">{templateMsg}</p>}
      </div>
      <div className="card">
        <p className="section-title">Token Management</p>
        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs font-semibold text-amber-800 mb-1">⚠ JWT tokens expire every ~60 minutes</p>
          <p className="text-xs text-amber-700">
            When you see "AI analysis failed", your token has expired. Go to{' '}
            <a href="https://ai.titan.in/gateway" target="_blank" rel="noreferrer" className="underline font-medium">ai.titan.in/gateway</a>
            , copy the new token, update <code className="bg-amber-100 px-1 rounded">backend/.env</code>, and restart the server.
          </p>
        </div>
      </div>
      <div className="card">
        <p className="section-title">Usage Statistics</p>
        <div className="grid grid-cols-3 gap-4 mt-2">
          {[
            { label: 'Total Scanned', value: history.length },
            { label: 'High Risk Found', value: history.filter((h) => h.overallRiskLevel === 'High').length },
            { label: 'Today', value: history.filter((h) => Date.now() - new Date(h.analyzedAt) < 86400000).length },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-blue-700">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <p className="section-title">API Endpoint</p>
        <div className="flex items-center gap-2 mt-2">
          <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-700 truncate">
            POST /api/analyze  (multipart/form-data · field: eulaFile)
          </code>
          <button onClick={copy} className="px-3 py-2 text-xs bg-blue-700 text-white rounded hover:bg-blue-800 transition-colors">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── View: MSA Review ─────────────────────────────────────────────────────────
function MSAReviewView({ onNewResult, initialResult, onClearInitial }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(initialResult || null);
  const [error, setError] = useState('');
  const [templateLoaded, setTemplateLoaded] = useState(null);
  const [expandedDev, setExpandedDev] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  React.useEffect(() => {
    fetch('/api/analyze-msa/template-status')
      .then((r) => r.json())
      .then((d) => setTemplateLoaded(d.templateLoaded))
      .catch(() => setTemplateLoaded(false));
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0] || e.target.files?.[0];
    if (f && f.type === 'application/pdf') setFile(f);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true); setError(''); setResult(null); setPdfError('');
    const fd = new FormData();
    fd.append('msaFile', file);
    try {
      const r = await fetch(MSA_API_URL, { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `Server error ${r.status}`);
      setResult(d);
      if (onNewResult) onNewResult(d);
    } catch (err) {
      setError(err.message || 'Analysis failed.');
    } finally { setLoading(false); }
  };

  const handleDownloadReport = async () => {
    if (!result) return;
    setPdfLoading(true); setPdfError('');
    try {
      const r = await fetch('/api/msa-report-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error || 'PDF generation failed.');
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (result.vendorName || 'Vendor').replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_');
      a.download = `MSA_Report_${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setPdfError(err.message || 'Failed to generate report.');
    } finally { setPdfLoading(false); }
  };

  const riskColor = (r) => r === 'High' ? 'bg-red-100 text-red-700 border-red-200'
    : r === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-emerald-100 text-emerald-700 border-emerald-200';

  const riskDot = (r) => r === 'High' ? 'bg-red-500' : r === 'Medium' ? 'bg-amber-400' : 'bg-emerald-500';

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-500">
      <svg className="animate-spin h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-sm font-medium">Comparing vendor MSA against Titan template…</p>
      <p className="text-xs text-gray-400">This may take up to 30 seconds</p>
    </div>
  );

  if (result) return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900">{result.msaTitle || result.vendorName}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{result.vendorName} · Effective: {result.effectiveDate}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${riskColor(result.overallRisk)}`}>
              <span className={`w-2 h-2 rounded-full ${riskDot(result.overallRisk)}`} />
              {result.overallRisk} Risk
            </span>
            <button
              onClick={handleDownloadReport}
              disabled={pdfLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                pdfLoading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-700 hover:bg-blue-800 text-white shadow-sm'
              }`}
            >
              {pdfLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Full Report
                </>
              )}
            </button>
          </div>
        </div>
        {pdfError && <p className="text-xs text-red-600 mt-2">{pdfError}</p>}
        <p className="text-sm text-gray-700 mt-3 leading-relaxed">{result.executiveSummary}</p>
      </div>

      {/* Negotiation priorities */}
      {result.topNegotiationPriorities?.length > 0 && (
        <div className="card border-l-4 border-red-500">
          <p className="section-title">Top Negotiation Priorities</p>
          <ol className="mt-2 space-y-2">
            {result.topNegotiationPriorities.map((p, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                <p className="text-sm text-gray-700">{p}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Deviations */}
      {result.deviations?.length > 0 && (
        <div className="card">
          <p className="section-title">Deviations from Titan Template ({result.deviations.length})</p>
          <div className="mt-3 space-y-2">
            {result.deviations.map((dev, i) => (
              <div key={i} className={`border rounded-lg overflow-hidden ${dev.risk === 'High' ? 'border-red-200' : dev.risk === 'Medium' ? 'border-amber-200' : 'border-gray-200'}`}>
                <button
                  onClick={() => setExpandedDev(expandedDev === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`flex-shrink-0 w-2 h-2 rounded-full ${riskDot(dev.risk)}`} />
                    <span className="text-sm font-semibold text-gray-800 truncate">{dev.topic}</span>
                    <span className="text-xs text-gray-400 hidden sm:inline">{dev.clauseRef}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${riskColor(dev.risk)}`}>{dev.risk}</span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedDev === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {expandedDev === i && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-3 bg-gray-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Titan Position</p>
                        <p className="text-xs text-gray-800">{dev.titanPosition}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                        <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Vendor Position</p>
                        <p className="text-xs text-gray-800">{dev.vendorPosition}</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Objection</p>
                      <p className="text-xs text-gray-800">{dev.objection}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Recommendation</p>
                      <p className="text-xs text-gray-800">{dev.recommendation}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing clauses */}
      {result.missingClauses?.length > 0 && (
        <div className="card">
          <p className="section-title">Missing Clauses ({result.missingClauses.length})</p>
          <div className="mt-2 space-y-3">
            {result.missingClauses.map((mc, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className={`flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full border mt-0.5 ${riskColor(mc.importance)}`}>{mc.importance}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{mc.clause}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{mc.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk summaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {result.dataPrivacyRisk && (
          <div className="card">
            <p className="section-title">Data Privacy Risk</p>
            <p className="text-xs text-gray-700 mt-1 leading-relaxed">{result.dataPrivacyRisk}</p>
          </div>
        )}
        {result.liabilityRisk && (
          <div className="card">
            <p className="section-title">Liability Risk</p>
            <p className="text-xs text-gray-700 mt-1 leading-relaxed">{result.liabilityRisk}</p>
          </div>
        )}
        {result.terminationRisk && (
          <div className="card">
            <p className="section-title">Termination Risk</p>
            <p className="text-xs text-gray-700 mt-1 leading-relaxed">{result.terminationRisk}</p>
          </div>
        )}
      </div>

      {/* Favourable clauses */}
      {result.favorableClauses?.length > 0 && (
        <div className="card">
          <p className="section-title">Favourable Clauses ✓</p>
          <div className="mt-2 space-y-2">
            {result.favorableClauses.map((fc, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="text-sm font-medium text-gray-800">{fc.topic} </span>
                  <span className="text-xs text-gray-400">{fc.clauseRef}</span>
                  <p className="text-xs text-gray-600 mt-0.5">{fc.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center pt-2">
        <button onClick={() => { setResult(null); setFile(null); if (onClearInitial) onClearInitial(); }} className="text-sm text-blue-700 hover:text-blue-900 underline underline-offset-2">
          Review another MSA
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {templateLoaded === false && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm font-semibold text-amber-800">⚠ Titan MSA Template not uploaded</p>
          <p className="text-xs text-amber-700 mt-1">Go to <strong>Settings → Titan MSA Template</strong> and upload your blank Titan MSA template first. That document is used as the benchmark for comparison.</p>
        </div>
      )}
      {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

      {/* Upload zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center hover:border-blue-400 hover:bg-blue-50/40 transition-all cursor-pointer"
        onClick={() => document.getElementById('msa-file-input').click()}
      >
        <input id="msa-file-input" type="file" accept=".pdf" className="hidden" onChange={handleDrop} />
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {file ? (
          <p className="text-sm font-medium text-blue-700">{file.name}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-600">Drop vendor MSA PDF here</p>
            <p className="text-xs text-gray-400 mt-1">or click to browse · PDF only · max 10 MB</p>
          </>
        )}
      </div>

      {file && (
        <div className="flex justify-center">
          <button
            onClick={handleAnalyze}
            disabled={!templateLoaded}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              templateLoaded ? 'bg-blue-700 hover:bg-blue-800 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Compare Against Titan Template
          </button>
        </div>
      )}
    </div>
  );
}

const NAV = [
  { id: 'analyze',   icon: '📋', label: 'Analyze EULA' },
  { id: 'msa',       icon: '🤝', label: 'MSA Review' },
  { id: 'dashboard', icon: '📊', label: 'Risk Dashboard' },
  { id: 'history',   icon: '📁', label: 'History' },
  { id: 'settings',  icon: '⚙️', label: 'Settings' },
];

export default function App() {
  const [view, setView] = useState('analyze');
  const [history, setHistory] = useState(loadHistory);
  const [msaHistory, setMsaHistory] = useState(loadMsaHistory);
  const [historyResult, setHistoryResult] = useState(null);
  const [msaHistoryResult, setMsaHistoryResult] = useState(null);

  const handleNewResult = (result) => setHistory(saveToHistory(result));
  const handleNewMsaResult = (result) => setMsaHistory(saveToMsaHistory(result));

  const handleViewEula = (result) => { setHistoryResult(result); setMsaHistoryResult(null); setView('analyze'); };
  const handleViewMsa  = (result) => { setMsaHistoryResult(result); setHistoryResult(null); setView('msa'); };

  const handleClearEula = () => {
    if (window.confirm('Clear all EULA analysis history?')) {
      localStorage.removeItem(HISTORY_KEY);
      setHistory([]);
    }
  };
  const handleClearMsa = () => {
    if (window.confirm('Clear all MSA review history?')) {
      localStorage.removeItem(MSA_HISTORY_KEY);
      setMsaHistory([]);
    }
  };

  const pageTitles = { analyze: 'Analyze EULA', msa: 'MSA Review', dashboard: 'Risk Dashboard', history: 'History', settings: 'Settings' };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0a0f1e] text-white flex-shrink-0 min-h-screen">
        <div className="px-6 py-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">EULA Scout</h1>
              <p className="text-xs text-blue-300">Procurement AI</p>
            </div>
          </div>
          <nav className="space-y-1">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => { setView(item.id); setHistoryResult(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left
                  ${view === item.id ? 'bg-blue-600 text-white font-medium' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
              >
                <span>{item.icon}</span>
                {item.label}
                {item.id === 'history' && history.length > 0 && (
                  <span className="ml-auto text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">{history.length}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-auto px-6 py-6 border-t border-white/10">
          <p className="text-xs text-gray-500">AI-powered analysis. Always review with legal counsel before signing.</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto flex flex-col">
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between no-print flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{pageTitles[view]}</h2>
            <p className="text-xs text-gray-400">AI-Powered Software Agreement Analyzer</p>
          </div>
          {view === 'analyze' && (
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Summary
            </button>
          )}
        </header>

        <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
          {view === 'analyze' && (
            historyResult
              ? <ResultsDashboard result={historyResult} onReset={() => setHistoryResult(null)} />
              : <AnalyzeView onNewResult={handleNewResult} />
          )}
          {view === 'msa' && <MSAReviewView onNewResult={handleNewMsaResult} initialResult={msaHistoryResult} onClearInitial={() => setMsaHistoryResult(null)} />}
          {view === 'dashboard' && <RiskDashboardView history={history} />}
          {view === 'history' && (
            <HistoryView
              eulaHistory={history}
              msaHistory={msaHistory}
              onViewEula={handleViewEula}
              onViewMsa={handleViewMsa}
              onClearEula={handleClearEula}
              onClearMsa={handleClearMsa}
            />
          )}
          {view === 'settings' && <SettingsView history={history} />}
        </div>
      </main>
    </div>
  );
}

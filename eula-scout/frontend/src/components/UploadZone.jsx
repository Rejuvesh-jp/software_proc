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
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload EULA Document</h2>

      <div
        role="button"
        tabIndex={0}
        aria-label="Drop zone for PDF upload"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all cursor-pointer py-12 px-6 select-none
          ${dragOver
            ? 'border-blue-500 bg-blue-50'
            : file
            ? 'border-emerald-400 bg-emerald-50'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleChange}
        />

        {file ? (
          <>
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-emerald-100 mb-4">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4M7 21h10a2 2 0 002-2V7l-5-5H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-semibold text-gray-800 text-sm">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">{formatSize(file.size)}</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="mt-3 text-xs text-gray-400 hover:text-red-500 underline transition-colors"
            >
              Remove
            </button>
          </>
        ) : (
          <>
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-gray-100 mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="font-medium text-gray-700 text-sm">
              Drag &amp; drop your EULA PDF here
            </p>
            <p className="text-xs text-gray-400 mt-1">or click to browse — max 10 MB</p>
          </>
        )}
      </div>

      {fileError && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {fileError}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !file}
        className={`mt-5 w-full flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all
          ${loading || !file
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-blue-700 hover:bg-blue-800 text-white shadow-sm hover:shadow-md'
          }`}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Scanning agreement...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Analyze EULA
          </>
        )}
      </button>
    </div>
  );
}

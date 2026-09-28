import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Clipboard,
  Trash2,
  Play,
  RotateCcw,
  Save,
  FileQuestion,
  FileCheck,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  ExternalLink,
  Layers,
  Code,
  FileCode,
  Upload,
  Download,
  Copy,
  Check,
  ArrowRight,
  Shield,
  FileSpreadsheet,
  Calculator,
  Receipt
} from 'lucide-react';
import { DocumentType, SurveyRecord, SourceFile } from '../types/survey';
import {
  SAMPLE_FINAL_ESTIMATE_TEXT,
  SAMPLE_POLICY_TEXT,
  SAMPLE_CLIENT_REQUEST_TEXT
} from '../utils/sampleData';
import {
  populateSurveyFromJson,
  SAMPLE_COMPLETE_SURVEY_JSON,
  EMPTY_SURVEY_JSON_TEMPLATE,
  JsonImportStats
} from '../utils/jsonImporter';

interface TextEntryViewProps {
  currentRecord: SurveyRecord;
  onProcessText: (text: string, title?: string, mode?: 'replace' | 'merge') => Promise<void>;
  onApplyJsonRecord?: (newRecord: SurveyRecord, stats: JsonImportStats) => void | Promise<void>;
  onUploadSourceFile?: (file: File) => Promise<SourceFile | null>;
  onRemoveSourceFile?: (id: string) => void | Promise<void>;
  onSave: () => void;
  onReset: () => void;
  isProcessing: boolean;
  setCurrentTab: (tab: string) => void;
  /** Keep the combined data-entry screen open after JSON import. */
  suppressAutoNavigation?: boolean;
  /** Render this component as part of the unified Section 4 workspace. */
  embedded?: boolean;
}

export const TextEntryView: React.FC<TextEntryViewProps> = ({
  currentRecord,
  onProcessText,
  onApplyJsonRecord,
  onUploadSourceFile,
  onRemoveSourceFile,
  onSave,
  onReset,
  isProcessing,
  setCurrentTab,
  suppressAutoNavigation = false,
  embedded = false,
}) => {
  // Mode: 'text' or 'json'
  const [entryMode, setEntryMode] = useState<'text' | 'json'>('text');
  // JSON target section: lets the user apply only the selected form section.
  const [jsonTargetSection, setJsonTargetSection] = useState<'auto' | 'all' | 'policy-vehicle'>('auto');

  // Text state
  const [inputText, setInputText] = useState(currentRecord.rawPastedText || '');
  const [detectedType, setDetectedType] = useState<DocumentType>(currentRecord.documentType);
  const [confidenceLevel, setConfidenceLevel] = useState<'High' | 'Medium' | 'Low'>(
    currentRecord.confidenceLevel || 'High'
  );
  const [showReprocessModal, setShowReprocessModal] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // JSON state
  const [jsonInput, setJsonInput] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonValidStatus, setJsonValidStatus] = useState<string | null>(null);
  const [lastImportStats, setLastImportStats] = useState<JsonImportStats | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingSourceFile, setUploadingSourceFile] = useState(false);

  const handleSourceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUploadSourceFile) return;
    setUploadingSourceFile(true);
    try {
      await onUploadSourceFile(file);
    } catch (error: any) {
      setJsonError(error?.message || 'Source file upload failed.');
    } finally {
      setUploadingSourceFile(false);
    }
  };

  const documentTypes: DocumentType[] = [
    'Client Request',
    'Company Request',
    'Insurance Policy',
    'Initial Estimate',
    'Final Estimate',
    'Invoice',
    'Labour & Repairs',
    'Parts Estimate',
    'Final Survey Report',
    'General Survey Data',
  ];

  // Auto-detect JSON in text mode
  const looksLikeJsonInText = (() => {
    const trimmed = inputText.trim();
    return (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
  })();

  // Real-time JSON validation
  useEffect(() => {
    if (!jsonInput.trim()) {
      setJsonError(null);
      setJsonValidStatus(null);
      return;
    }
    try {
      const cleaned = jsonInput
        .replace(/^\uFEFF/, '')
        .trim()
        .replace(/^```(?:json|JSON|javascript|js)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      setJsonError(null);
      if (typeof parsed === 'object' && parsed !== null) {
        const keys = Object.keys(parsed);
        setJsonValidStatus(`Valid JSON ✓ (${keys.length} top-level keys detected: ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? '...' : ''})`);
      } else {
        setJsonValidStatus('Valid JSON Primitive');
      }
    } catch (e: any) {
      setJsonValidStatus(null);
      setJsonError(e?.message || 'Invalid JSON syntax');
    }
  }, [jsonInput]);

  // Handle Clipboard Paste for Text
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
      }
    } catch (e) {
      alert('Clipboard access denied. Please use Ctrl+V or right-click to paste.');
    }
  };

  // Handle Clipboard Paste for JSON
  const handlePasteJsonClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setJsonInput(text);
      }
    } catch (e) {
      alert('Clipboard access denied. Please use Ctrl+V or right-click to paste.');
    }
  };

  const handleClear = () => {
    setInputText('');
    setProcessingError(null);
  };

  const handleClearJson = () => {
    setJsonInput('');
    setJsonError(null);
    setJsonValidStatus(null);
    setLastImportStats(null);
  };

  const handleProcess = async (mode: 'replace' | 'merge' = 'replace') => {
    if (!inputText.trim()) {
      setProcessingError('Please paste document text before processing.');
      return;
    }
    setProcessingError(null);
    try {
      await onProcessText(inputText, detectedType, mode);
    } catch (err: any) {
      setProcessingError(err?.message || 'Processing failed. Please check network/AI service.');
    }
  };

  const handleReprocessClick = () => {
    if (
      currentRecord.initialEstimate?.parts?.length > 0 ||
      currentRecord.finalEstimate?.parts?.length > 0 ||
      currentRecord.policy?.policyNumber
    ) {
      setShowReprocessModal(true);
    } else {
      handleProcess('replace');
    }
  };

  const loadSample = (sample: string) => {
    setInputText(sample);
    setProcessingError(null);
  };

  // JSON Actions
  const handleLoadSampleJson = () => {
    const formatted = JSON.stringify(SAMPLE_COMPLETE_SURVEY_JSON, null, 2);
    setJsonInput(formatted);
    setJsonError(null);
    setLastImportStats(null);
  };

  const handleCopyJsonTemplate = async () => {
    const formatted = JSON.stringify(EMPTY_SURVEY_JSON_TEMPLATE, null, 2);
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2000);
    } catch (e) {
      setJsonInput(formatted);
    }
  };

  const handleFormatJson = () => {
    if (!jsonInput.trim()) return;
    try {
      const cleaned = jsonInput
        .replace(/^\uFEFF/, '')
        .trim()
        .replace(/^```(?:json|JSON|javascript|js)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      setJsonInput(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (e: any) {
      setJsonError(`Cannot format: ${e?.message}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setJsonInput(content);
        setJsonError(null);
        setLastImportStats(null);
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be uploaded again if needed
    e.target.value = '';
  };

  const handleExportCurrentSurveyJson = () => {
    const filename = `survey_${currentRecord.vehicle?.registrationNumber || currentRecord.policy?.policyNumber || 'record'}_${Date.now()}.json`;
    const jsonStr = JSON.stringify(currentRecord, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleApplyJsonToTables = () => {
    if (!jsonInput.trim()) {
      setJsonError('Please paste or upload JSON data first.');
      return;
    }

    const result = populateSurveyFromJson(jsonInput, currentRecord);
    if (!result.success || !result.record) {
      setJsonError(result.error || 'Failed to parse JSON.');
      return;
    }

    setJsonError(null);

    // Policy & Vehicle is an explicit restricted mode. In Auto/All mode the importer
    // processes the JSON across every supported section and we route to the section
    // that actually received data. Never force Section 4 just because the JSON screen
    // was used.
    if (jsonTargetSection === 'policy-vehicle') {
      const policyFields = result.stats?.policyFields || 0;
      const vehicleFields = result.stats?.vehicleFields || 0;
      const targetedStats: JsonImportStats = {
        ...(result.stats || {
          policyFields: 0, vehicleFields: 0, clientDocRows: 0, companyDocRows: 0,
          initialParts: 0, initialLabour: 0, finalParts: 0, finalLabour: 0,
          invoices: 0, observations: 0, totalFieldsFilled: 0, matchedSections: []
        }),
        clientDocRows: 0,
        companyDocRows: 0,
        initialParts: 0,
        initialLabour: 0,
        finalParts: 0,
        finalLabour: 0,
        invoices: 0,
        observations: 0,
        totalFieldsFilled: policyFields + vehicleFields,
        matchedSections: policyFields + vehicleFields > 0 ? ['policy'] : [],
      };
      setLastImportStats(targetedStats);

      if (policyFields + vehicleFields === 0) {
        setJsonError(
          'No matching Policy or Vehicle fields were found. Use field names such as policyNumber, insuredName, insuranceCompany, claimNumber, registrationNumber, make, model, engineNumber, chassisNumber, etc.'
        );
        return;
      }

      if (onApplyJsonRecord) {
        const targetedRecord: SurveyRecord = {
          ...currentRecord,
          policy: { ...currentRecord.policy, ...result.record.policy },
          vehicle: { ...currentRecord.vehicle, ...result.record.vehicle },
          driver: currentRecord.driver,
          validationErrors: result.record.validationErrors,
        };
        onApplyJsonRecord(targetedRecord, targetedStats);
      }

      if (!suppressAutoNavigation) setCurrentTab('policy');
      return;
    }

    setLastImportStats(result.stats || null);
    if (onApplyJsonRecord && result.stats) {
      onApplyJsonRecord(result.record, result.stats);

      // Route according to the section(s) that were actually populated by this JSON.
      // Priority is given to estimate data so an estimate JSON opens the Estimate
      // screen instead of being incorrectly redirected to Policy & Vehicle.
      const matched = result.stats.matchedSections || [];
      const routePriority = [
        'initial-estimate',
        'final-estimate',
        'policy',
        'client-request',
        'company-request',
        'invoice',
        'final-report',
      ];
      const nextTab = routePriority.find((tab) => matched.includes(tab));
      if (nextTab && !suppressAutoNavigation) {
        setCurrentTab(nextTab);
      }
    }
  };

  const handleSwitchToJsonFromText = () => {
    setJsonInput(inputText);
    setEntryMode('json');
  };

  const partsCount = (currentRecord.initialEstimate?.parts?.length || 0) + (currentRecord.finalEstimate?.parts?.length || 0);
  const labourCount = (currentRecord.initialEstimate?.labour?.length || 0) + (currentRecord.finalEstimate?.labour?.length || 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold font-mono">
                Section 7
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Data Entry & Ingestion Engine</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Choose between <strong>Text Input (AI Text Understanding)</strong> or{' '}
              <strong>JSON Data Ingestion (Direct Table Population)</strong>. No OCR. Exact field and table row mapping.
            </p>
          </div>

          {/* Mode Selector Pill */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 self-start md:self-auto">
            <button
              onClick={() => setEntryMode('text')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                entryMode === 'text'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Paste Text Input</span>
            </button>
            <button
              onClick={() => setEntryMode('json')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                entryMode === 'json'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>JSON Data Ingestion</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-purple-200/40 text-purple-900 dark:text-purple-200 font-mono">
                Full Schema
              </span>
            </button>
          </div>
        </div>

        {/* Quick Sample Presets (for Text mode) */}
        {entryMode === 'text' && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-400">Load sample document text:</span>
            <button
              onClick={() => loadSample(SAMPLE_FINAL_ESTIMATE_TEXT)}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              Final Estimate + Invoice
            </button>
            <button
              onClick={() => loadSample(SAMPLE_POLICY_TEXT)}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              Policy Schedule
            </button>
            <button
              onClick={() => loadSample(SAMPLE_CLIENT_REQUEST_TEXT)}
              className="text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              Client Request Checklist
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODE 1: JSON DATA INGESTION MODE (User request: JSON me le or sabhi tables ki field bhar dewe) */}
      {/* ============================================================ */}
      {entryMode === 'json' && (
        <div className="space-y-4">
          {/* Target section selector */}
          <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">JSON Target Section</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Auto mode scans the complete JSON, fills every matching section/table, and only then opens the first populated section.
                </p>
              </div>
              <select
                value={jsonTargetSection}
                onChange={(e) => setJsonTargetSection(e.target.value as 'auto' | 'all' | 'policy-vehicle')}
                className="min-w-[280px] bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 text-sm font-semibold text-slate-800 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="auto">Auto Detect &amp; Visit Matching Section</option>
                <option value="all">All Sections (process JSON everywhere it matches)</option>
                <option value="policy-vehicle">Insurance Policy &amp; Vehicle Particulars — Section 4 only</option>
              </select>
            </div>
            {jsonTargetSection === 'auto' && (
              <div className="mt-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 p-3 text-xs text-emerald-800 dark:text-emerald-200">
                <strong>Auto mode:</strong> JSON is processed across all supported sections. Only fields whose section/field names match are updated, and SurveyFlow opens the section that actually received the imported data.
              </div>
            )}
            {jsonTargetSection === 'policy-vehicle' && (
              <div className="mt-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 p-3 text-xs text-indigo-800 dark:text-indigo-200">
                <strong>Section 4 only:</strong> JSON is restricted to Policy Particulars and Vehicle Particulars.
              </div>
            )}
          </div>

          {/* JSON Banner & Instructions */}
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 dark:from-slate-900 dark:via-purple-950/30 dark:to-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-sm">
                <Code className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-indigo-950 dark:text-indigo-200">
                    JSON Schema Direct Ingestion (JSON से Data भरे)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-200/70 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300 font-mono font-bold">
                    Zero Hallucination
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Paste structured JSON or upload a <code>.json</code> file. Use Auto Detect to process JSON by matching section and field names, or explicitly restrict it to one section.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json,application/json"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 text-xs font-semibold shadow-sm transition-all"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Upload .json File</span>
              </button>

              <button
                onClick={handleLoadSampleJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Load Sample Full JSON</span>
              </button>

              <button
                onClick={handleCopyJsonTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white text-xs font-semibold shadow-sm transition-all"
                title="Copy schema template to clipboard"
              >
                {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTemplate ? 'Copied Template!' : 'Copy Template'}</span>
              </button>

              <button
                onClick={handleExportCurrentSurveyJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700"
                title="Download current survey data as JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Survey JSON</span>
              </button>
            </div>
          </div>

          {/* Permanent Source Document Archive */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">Permanent Source Document Archive</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">PDF, image, JSON, TXT और दूसरे source documents Supabase Storage में इसी survey के साथ सुरक्षित होंगे.</p>
              </div>
              <div>
                <input ref={sourceFileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.json,.txt,.csv,application/pdf,image/*,text/plain,application/json,text/csv" onChange={handleSourceFileUpload} className="hidden" />
                <button onClick={() => sourceFileInputRef.current?.click()} disabled={!onUploadSourceFile || uploadingSourceFile} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold">
                  <Upload className="w-3.5 h-3.5" /> {uploadingSourceFile ? 'Uploading...' : 'Upload PDF / Image / File'}
                </button>
              </div>
            </div>
            {!!currentRecord.sourceFiles?.length && (
              <div className="mt-3 space-y-2">
                {currentRecord.sourceFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">{file.fileName}</div>
                      <div className="text-[10px] text-slate-500">{file.fileType || 'file'} · {Math.max(1, Math.round(file.fileSize / 1024))} KB</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.publicUrl && <a href={file.publicUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Open</a>}
                      {onRemoveSourceFile && <button onClick={() => onRemoveSourceFile(file.id)} className="text-xs text-red-600 hover:underline">Remove</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* JSON Success Stats Report if just applied */}
          {lastImportStats && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                    JSON Data Successfully Mapped! ({lastImportStats.totalFieldsFilled} fields/rows filled)
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-mono font-bold">
                  Live & Saved
                </span>
              </div>

              {/* Stats badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs font-mono">
                <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-center">
                  <span className="text-slate-400 block text-[10px]">Policy Fields</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                    {lastImportStats.policyFields}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-center">
                  <span className="text-slate-400 block text-[10px]">Vehicle Fields</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300 text-sm">
                    {lastImportStats.vehicleFields}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-center">
                  <span className="text-slate-400 block text-[10px]">Initial Parts</span>
                  <span className="font-bold text-cyan-700 dark:text-cyan-300 text-sm">
                    {lastImportStats.initialParts}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-center">
                  <span className="text-slate-400 block text-[10px]">Final Parts</span>
                  <span className="font-bold text-purple-700 dark:text-purple-300 text-sm">
                    {lastImportStats.finalParts}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-center">
                  <span className="text-slate-400 block text-[10px]">Labour Rows</span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-300 text-sm">
                    {lastImportStats.initialLabour}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 text-center">
                  <span className="text-slate-400 block text-[10px]">Invoices</span>
                  <span className="font-bold text-amber-700 dark:text-amber-300 text-sm">
                    {lastImportStats.invoices}
                  </span>
                </div>
              </div>

              {/* Quick Jump Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-900/40 text-xs">
                <span className="text-slate-500 font-sans">Jump to populated section:</span>
                <button
                  onClick={() => setCurrentTab('policy')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold border border-slate-200 dark:border-slate-700 hover:bg-blue-50"
                >
                  <Shield className="w-3 h-3" />
                  <span>Section 4: Policy & Vehicle</span>
                </button>
                <button
                  onClick={() => setCurrentTab('initial-estimate')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 font-semibold border border-slate-200 dark:border-slate-700 hover:bg-cyan-50"
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>Section 5: Initial Estimate</span>
                </button>
                <button
                  onClick={() => setCurrentTab('final-estimate')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 font-semibold border border-slate-200 dark:border-slate-700 hover:bg-purple-50"
                >
                  <Calculator className="w-3 h-3" />
                  <span>Section 6: Final Estimate</span>
                </button>
                <button
                  onClick={() => setCurrentTab('final-report')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-semibold border border-slate-200 dark:border-slate-700 hover:bg-emerald-50"
                >
                  <FileCheck className="w-3 h-3" />
                  <span>Section 9: Final Survey Report</span>
                </button>
              </div>
            </div>
          )}

          {/* JSON Error Message if any */}
          {jsonError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{jsonError}</span>
            </div>
          )}

          {/* JSON Code Input Area */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <label className="font-semibold uppercase tracking-wider text-[11px] text-indigo-950 dark:text-indigo-300 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5" />
                  <span>JSON Payload Input</span>
                </label>
                {jsonValidStatus && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-medium">
                    {jsonValidStatus}
                  </span>
                )}
                {jsonError && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono font-medium">
                    Syntax Error
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span>{jsonInput.length} chars</span>
                <span>•</span>
                <span>{jsonInput.split(/\r?\n/).length} lines</span>
              </div>
            </div>

            <textarea
              rows={18}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`Paste valid JSON survey data here...

Example Structure (Direct Array or Object):
[
  {
    "E. No.": "1",
    "Parts Description": "FRONT BUMPER UPPER",
    "HSN Code": "87089900",
    "Bill S.No": "1",
    "Remark": "Damage",
    "Estimated ₹": 1420.34,
    "Glass/Repair": null,
    "Metal (35)": null,
    "Non Metal": 1420.34,
    "GST %": 18
  }
]

Or Full Survey Object:
{
  "policy": {
    "policyNumber": "2311200489120000001",
    "insuredName": "Mr. Rajesh Kumar Sharma"
  },
  "initialEstimate": {
    "parts": [
      {
        "E. No.": "1",
        "Parts Description": "FRONT BUMPER UPPER",
        "HSN Code": "87089900",
        "Bill S.No": "1",
        "Remark": "Damage",
        "Estimated ₹": 1420.34,
        "Glass/Repair": null,
        "Metal (35)": null,
        "Non Metal": 1420.34,
        "GST %": 18
      }
    ]
  }
}`}
              className="w-full bg-slate-900 text-slate-100 dark:bg-slate-950 dark:text-slate-200 border border-slate-700 rounded-lg p-3.5 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y selection:bg-indigo-500/40"
            />

            {/* JSON Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePasteJsonClipboard}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste JSON</span>
                </button>
                <button
                  onClick={handleFormatJson}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
                >
                  <span>🧹 Beautify / Format</span>
                </button>
                <button
                  onClick={handleClearJson}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-700 dark:text-slate-300 hover:text-rose-600 text-xs font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleApplyJsonToTables}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{jsonTargetSection === 'policy-vehicle' ? 'Section 4: JSON से Policy & Vehicle भरें' : 'JSON से Matching Sections भरें (Auto Map)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODE 2: PLAIN TEXT INPUT MODE (With smart JSON auto-detection) */}
      {/* ============================================================ */}
      {entryMode === 'text' && (
        <div className="space-y-4">
          {/* JSON auto-detection banner inside text mode */}
          {looksLikeJsonInText && (
            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border border-indigo-300 dark:border-indigo-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    💡 JSON Format Detected in Pasted Text!
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    It looks like you pasted a JSON document. Would you like to switch to JSON Input Mode to directly
                    populate all tables with 100% precision without needing AI processing?
                  </p>
                </div>
              </div>

              <button
                onClick={handleSwitchToJsonFromText}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold whitespace-nowrap shadow-sm transition-all"
              >
                <span>Switch & Fill Tables from JSON</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Document Type Detection & Confidence Header */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Document Type
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={detectedType || 'Final Estimate'}
                    onChange={(e) => setDetectedType(e.target.value as DocumentType)}
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {documentTypes.map((dt) => (
                      <option key={dt} value={dt}>
                        {dt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Detection Confidence
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                      confidenceLevel === 'High'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                        : confidenceLevel === 'Medium'
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                        : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current" />
                    {confidenceLevel} Confidence ({Math.round(currentRecord.confidence * 100)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Result Badges */}
            {(partsCount > 0 || currentRecord.policy?.policyNumber) && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400">Structured Data Ready:</span>
                {currentRecord.vehicle?.registrationNumber && (
                  <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-[11px]">
                    RC: {currentRecord.vehicle.registrationNumber}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono text-[11px]">
                  {partsCount} Parts
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono text-[11px]">
                  {labourCount} Labour
                </span>
                {currentRecord.invoices?.length > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono text-[11px]">
                    {currentRecord.invoices.length} Invoices
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Error Message if any */}
          {processingError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{processingError}</span>
            </div>
          )}

          {/* Main Text Input Area */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <label className="font-semibold uppercase tracking-wider text-[11px]">
                Paste your document text here
              </label>
              <span>{inputText.length} characters • {inputText.split(/\r?\n/).length} lines</span>
            </div>

            <textarea
              rows={16}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Paste text copied from insurance estimate, invoice, policy schedule, garage bill, or survey intimation here...
Example:
Policy No: 2311200489120000001
RC No: RJ15CA4929
Make: Maruti Suzuki  Model: Swift Dzire
E.No Description HSN Bill Remark Estimated
18 FRONT BUMPER UPR 87089900 7 Damage 1420.34
...`}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed resize-y"
            />

            {/* Action Button Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePasteClipboard}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste Text</span>
                </button>
                <button
                  onClick={handleClear}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-700 dark:text-slate-300 hover:text-rose-600 text-xs font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={onReset}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>

                <button
                  onClick={onSave}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>

                <button
                  onClick={handleReprocessClick}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-semibold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reprocess</span>
                </button>

                <button
                  onClick={() => handleProcess('replace')}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-60 transition-all active:scale-95"
                >
                  {isProcessing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Process Text</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unmapped Text Banner Reminder */}
      {currentRecord.unmappedText?.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                {currentRecord.unmappedText.length} text snippet(s) require manual review
              </h4>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Some document text lines did not match standard schemas. They have been preserved and can be
                manually assigned to survey fields.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCurrentTab('validation')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold whitespace-nowrap shadow-sm"
          >
            <span>Review Unmapped Text</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Reprocess Confirmation Modal */}
      {showReprocessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Replace existing extracted data?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This survey already contains structured tables ({partsCount} parts, {labourCount} labour rows).
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Choose <strong>Replace</strong> to clear the existing tables and repopulate entirely from the new text,
              or <strong>Merge</strong> to append newly detected sections without losing existing data.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowReprocessModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowReprocessModal(false);
                  handleProcess('merge');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-sm"
              >
                Merge
              </button>
              <button
                onClick={() => {
                  setShowReprocessModal(false);
                  handleProcess('replace');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-sm"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

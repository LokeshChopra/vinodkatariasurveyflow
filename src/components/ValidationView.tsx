import React, { useState } from 'react';
import {
  CheckSquare,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Filter,
  ArrowRight,
  ShieldCheck,
  FileQuestion,
  CornerDownRight
} from 'lucide-react';
import { ValidationError, UnmappedItem, SurveyRecord } from '../types/survey';
import { ERROR_CODE_DESCRIPTIONS } from '../utils/validation';

interface ValidationViewProps {
  errors: ValidationError[];
  unmappedItems: UnmappedItem[];
  currentRecord: SurveyRecord;
  onAssignUnmappedText: (unmappedId: string, targetField: string) => void;
  onRemoveUnmappedItem: (unmappedId: string) => void;
  setCurrentTab: (tab: string) => void;
}

export const ValidationView: React.FC<ValidationViewProps> = ({
  errors,
  unmappedItems,
  currentRecord,
  onAssignUnmappedText,
  onRemoveUnmappedItem,
  setCurrentTab,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'error' | 'warning'>('all');
  const [selectedFieldMap, setSelectedFieldMap] = useState<Record<string, string>>({});

  const filteredErrors = errors.filter((e) => {
    if (filterSeverity === 'error') return e.severity === 'error';
    if (filterSeverity === 'warning') return e.severity === 'warning';
    return true;
  });

  const availableTargetFields = [
    { key: 'observations.causeOfAccident', label: 'Cause of Accident' },
    { key: 'observations.surveyorNotes', label: 'Surveyor Notes / Remarks' },
    { key: 'observations.garageNameAndAddress', label: 'Garage Name & Address' },
    { key: 'observations.speedometerReading', label: 'Speedometer / Odometer' },
    { key: 'policy.insuredAddress', label: 'Insured Full Address' },
    { key: 'policy.previousPolicyNumber', label: 'Previous Policy Number' },
    { key: 'policy.previousInsuranceCompany', label: 'Previous Insurer' },
    { key: 'clientRequest.clientRemarks', label: 'Client Remarks' },
    { key: 'companyRequest.companyRemarks', label: 'Company Instructions' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-semibold font-mono">
                  Section 8
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Data Validation & Unmapped Text Engine
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Standard insurance audit rules (SF001–SF017), format verification, and unmapped text triage.
              </p>
            </div>
          </div>

          {/* Quick Issue Stats */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-3 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-900">
              {errors.filter((e) => e.severity === 'error').length} Errors
            </span>
            <span className="px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-900">
              {errors.filter((e) => e.severity === 'warning').length} Warnings
            </span>
            <span className="px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-300 dark:border-blue-900">
              {unmappedItems.length} Unmapped
            </span>
          </div>
        </div>
      </div>

      {/* VALIDATION ISSUES LIST */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Validation Error Codes (SF001–SF017)</h3>
            <span className="text-xs font-mono text-slate-400">({filteredErrors.length} detected)</span>
          </div>

          {/* Severity Filters */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilterSeverity('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterSeverity === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterSeverity('error')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterSeverity === 'error'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Errors Only
            </button>
            <button
              onClick={() => setFilterSeverity('warning')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterSeverity === 'warning'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Warnings Only
            </button>
          </div>
        </div>

        {filteredErrors.length === 0 ? (
          <div className="py-8 text-center text-xs text-emerald-600 dark:text-emerald-400 flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <span className="font-semibold text-sm">All Validation Checks Passed</span>
            <span className="text-slate-500 dark:text-slate-400">No schema violations or critical discrepancies detected.</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredErrors.map((err, i) => (
              <div key={i} className="py-3 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 ${
                      err.severity === 'error'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                    }`}
                  >
                    {err.severity === 'error' ? '!' : '⚠'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">
                        {err.code}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {ERROR_CODE_DESCRIPTIONS[err.code] || err.field}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">[{err.field}]</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{err.message}</p>
                    {err.actual && (
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        Provided value: <span className="text-rose-500">"{err.actual}"</span>
                        {err.expected && <span> • Expected: "{err.expected}"</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Navigation Button to affected section */}
                <button
                  onClick={() => {
                    if (err.field.startsWith('policy') || err.field.startsWith('vehicle')) {
                      setCurrentTab('policy');
                    } else if (err.field.startsWith('initialEstimate')) {
                      setCurrentTab('initial-estimate');
                    } else if (err.field.startsWith('finalEstimate') || err.field.startsWith('invoices')) {
                      setCurrentTab('final-estimate');
                    } else if (err.field.startsWith('clientRequest')) {
                      setCurrentTab('client-request');
                    }
                  }}
                  className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-600 dark:text-slate-300 text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-colors"
                >
                  <span>Fix Field</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* UNMAPPED TEXT REVIEW & ASSIGNMENT SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileQuestion className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Unmapped / Review Required ({unmappedItems.length} items)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            The AI never silently discards text. Any text snippet that couldn't be definitively placed into standard
            tables is listed here for manual assignment.
          </p>
        </div>

        {unmappedItems.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No unmapped text lines. All source document lines have been assigned or resolved.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2.5 w-12 text-center">#</th>
                  <th className="px-3 py-2.5 min-w-[240px]">Original Text</th>
                  <th className="px-3 py-2.5 w-40">Possible Field</th>
                  <th className="px-3 py-2.5">Reason</th>
                  <th className="px-3 py-2.5 w-56">Manual Assignment</th>
                  <th className="px-3 py-2.5 w-20 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {unmappedItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-3 py-2 font-mono text-slate-800 dark:text-slate-200 break-words max-w-xs">
                      {item.originalText}
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">
                      {item.possibleField || 'Unspecified'}
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400 text-[11px]">
                      {item.reason}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={selectedFieldMap[item.id] || item.suggestedMapping || 'observations.surveyorNotes'}
                        onChange={(e) =>
                          setSelectedFieldMap({ ...selectedFieldMap, [item.id]: e.target.value })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                      >
                        {availableTargetFields.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => {
                          const target =
                            selectedFieldMap[item.id] || item.suggestedMapping || 'observations.surveyorNotes';
                          onAssignUnmappedText(item.id, target);
                        }}
                        className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all"
                      >
                        Assign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

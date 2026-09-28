import React, { useState } from 'react';
import {
  FolderArchive,
  Search,
  ExternalLink,
  Trash2,
  Copy,
  AlertTriangle,
  CheckCircle,
  Clock,
  Car,
  Shield,
  FileCheck
} from 'lucide-react';
import { SurveyRecord } from '../types/survey';
import { formatINR } from '../utils/calculations';

interface RecordsHistoryViewProps {
  records: SurveyRecord[];
  activeRecordId: string;
  onSelectRecord: (record: SurveyRecord) => void;
  onDeleteRecord: (id: string) => void;
  onDuplicateRecord: (record: SurveyRecord) => void;
  setCurrentTab: (tab: string) => void;
}

export const RecordsHistoryView: React.FC<RecordsHistoryViewProps> = ({
  records,
  activeRecordId,
  onSelectRecord,
  onDeleteRecord,
  onDuplicateRecord,
  setCurrentTab,
}) => {
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredRecords = records.filter((r) => {
    const q = filterText.toLowerCase();
    const matchesSearch =
      (r.surveyNumber || '').toLowerCase().includes(q) ||
      (r.vehicle?.registrationNumber || '').toLowerCase().includes(q) ||
      (r.vehicle?.rcNumber || '').toLowerCase().includes(q) ||
      (r.policy?.policyNumber || '').toLowerCase().includes(q) ||
      (r.policy?.claimNumber || '').toLowerCase().includes(q) ||
      (r.policy?.insuredName || '').toLowerCase().includes(q) ||
      (r.clientRequest?.clientName || '').toLowerCase().includes(q);

    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && r.status === statusFilter;
  });

  // Duplicate Check logic across records
  const getDuplicateWarnings = (record: SurveyRecord) => {
    const warnings: string[] = [];
    if (!record.vehicle?.registrationNumber && !record.policy?.policyNumber) return warnings;

    const dupVehicles = records.filter(
      (r) =>
        r.id !== record.id &&
        r.vehicle?.registrationNumber &&
        r.vehicle.registrationNumber.toUpperCase() === record.vehicle?.registrationNumber?.toUpperCase()
    );
    if (dupVehicles.length > 0) {
      warnings.push(`Duplicate Vehicle Regn ${record.vehicle.registrationNumber} exists in another survey`);
    }

    const dupPolicies = records.filter(
      (r) =>
        r.id !== record.id &&
        r.policy?.policyNumber &&
        r.policy.policyNumber.trim() !== '' &&
        r.policy.policyNumber === record.policy?.policyNumber
    );
    if (dupPolicies.length > 0) {
      warnings.push(`Duplicate Policy Number ${record.policy.policyNumber} detected`);
    }

    return warnings;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold font-mono">
                  Section 10
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Survey Records & Case History</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Saved survey files, historical claim assessments, duplicate detection, and quick retrieval.
              </p>
            </div>
          </div>

          <div className="text-xs font-mono font-bold text-slate-500">
            Total Cases: <span className="text-slate-900 dark:text-white">{records.length}</span>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by RC, Policy, Claim, Insured Name..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter || 'all'}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-48 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Validated">Validated</option>
            <option value="Needs Review">Needs Review</option>
            <option value="Report Generated">Report Generated</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-2.5">Survey & RC Number</th>
                <th className="px-3 py-2.5">Policy & Claim No.</th>
                <th className="px-3 py-2.5">Insured Client</th>
                <th className="px-3 py-2.5">Document Type</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5 text-right">Net Assessment</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-400 font-sans">
                    No survey records match the search criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isActive = r.id === activeRecordId;
                  const dupWarnings = getDuplicateWarnings(r);

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isActive ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      {/* Survey & RC */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              onSelectRecord(r);
                              setCurrentTab('dashboard');
                            }}
                            className="font-bold text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <span>{r.vehicle?.registrationNumber || 'No RC'}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                          {isActive && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500 text-white font-sans font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{r.surveyNumber}</div>
                        {dupWarnings.length > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-500 font-sans mt-0.5">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            <span>{dupWarnings[0]}</span>
                          </div>
                        )}
                      </td>

                      {/* Policy & Claim */}
                      <td className="px-3 py-2.5">
                        <div className="text-slate-800 dark:text-slate-200">{r.policy?.policyNumber || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400">Claim: {r.policy?.claimNumber || 'N/A'}</div>
                      </td>

                      {/* Insured Client */}
                      <td className="px-3 py-2.5 font-sans font-medium">
                        <div className="text-slate-900 dark:text-white">{r.policy?.insuredName || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{r.policy?.insuredMobile || ''}</div>
                      </td>

                      {/* Document Type */}
                      <td className="px-3 py-2.5 font-sans text-slate-600 dark:text-slate-400">
                        {r.documentType}
                      </td>

                      {/* Date */}
                      <td className="px-3 py-2.5 text-slate-500 text-[11px]">
                        {new Date(r.updatedAt).toLocaleDateString()}
                      </td>

                      {/* Net Assessment */}
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatINR(r.summary?.grandTotal)}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 text-center font-sans">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            r.status === 'Completed' || r.status === 'Report Generated'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : r.validationErrors?.length > 0
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-sans">
                          <button
                            onClick={() => {
                              onSelectRecord(r);
                              setCurrentTab('dashboard');
                            }}
                            className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            title="Open Survey"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDuplicateRecord(r)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                            title="Clone/Duplicate Survey"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete survey ${r.surveyNumber}?`)) {
                                onDeleteRecord(r.id);
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Delete Survey"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

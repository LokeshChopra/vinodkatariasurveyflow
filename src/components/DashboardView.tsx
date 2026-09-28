import React from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Car,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  PlusCircle,
  FileCheck2,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { SurveyRecord } from '../types/survey';
import { formatINR } from '../utils/calculations';

interface DashboardViewProps {
  currentRecord: SurveyRecord;
  allRecords: SurveyRecord[];
  onSelectRecord: (record: SurveyRecord) => void;
  setCurrentTab: (tab: string) => void;
  onNewSurvey: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentRecord,
  allRecords,
  onSelectRecord,
  setCurrentTab,
  onNewSurvey,
}) => {
  // Compute dashboard metrics
  const totalSurveys = allRecords.length;
  const pendingRequests = allRecords.filter((r) => r.status === 'Draft' || r.status === 'Needs Review').length;
  const initialEstimates = allRecords.filter((r) => r.initialEstimate?.parts?.length > 0).length;
  const finalEstimates = allRecords.filter((r) => r.finalEstimate?.parts?.length > 0).length;
  const completedReports = allRecords.filter((r) => r.status === 'Report Generated' || r.status === 'Completed').length;
  const totalValidationErrors = allRecords.reduce((acc, r) => acc + (r.validationErrors?.length || 0), 0);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const recordsThisMonth = allRecords.filter((r) => {
    const d = new Date(r.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const cards = [
    { label: 'Total Surveys', value: totalSurveys, icon: FileText, color: 'from-blue-600 to-indigo-600' },
    { label: 'Pending Requests', value: pendingRequests, icon: Clock, color: 'from-amber-600 to-orange-600' },
    { label: 'Initial Estimates', value: initialEstimates, icon: FileSpreadsheet, color: 'from-cyan-600 to-blue-600' },
    { label: 'Final Estimates', value: finalEstimates, icon: TrendingUp, color: 'from-purple-600 to-indigo-600' },
    { label: 'Completed Reports', value: completedReports, icon: CheckCircle, color: 'from-emerald-600 to-teal-600' },
    { label: 'Validation Errors', value: totalValidationErrors, icon: AlertTriangle, color: 'from-rose-600 to-red-600' },
    { label: 'Records This Month', value: recordsThisMonth, icon: ShieldCheck, color: 'from-sky-600 to-cyan-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Insurance Loss Assessment Platform
              </span>
              <span className="text-xs text-slate-400">Pure Text AI Extraction • No OCR • Strict Schemas</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              SurveyFlow Control Center
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Transform unstructured insurance estimate texts, garage bills, and policy schedules into verified,
              table-accurate survey reports and itemized loss assessments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => setCurrentTab('text-entry')}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
              title="Directly populate all tables using JSON schema"
            >
              <span>🔮 Ingest JSON Data</span>
            </button>
            <button
              onClick={() => setCurrentTab('text-entry')}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all active:scale-95"
            >
              <FileText className="w-4 h-4" />
              <span>Paste Text</span>
            </button>
            <button
              onClick={onNewSurvey}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Survey</span>
            </button>
          </div>
        </div>
      </div>

      {/* 7 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{c.label}</span>
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${c.color} flex items-center justify-center text-white shadow-sm`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {c.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Survey Quick Focus & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Survey Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Current Active Survey</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {currentRecord.surveyNumber} • Type: {currentRecord.documentType}
                </p>
              </div>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                currentRecord.status === 'Completed' || currentRecord.status === 'Report Generated'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  : currentRecord.validationErrors?.length > 0
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
              }`}
            >
              {currentRecord.status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Vehicle RC / Regn</span>
              <span className="font-bold text-sm font-mono text-slate-800 dark:text-slate-200">
                {currentRecord.vehicle?.registrationNumber || 'Not extracted'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Vehicle Model</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {currentRecord.vehicle?.make} {currentRecord.vehicle?.model} {currentRecord.vehicle?.variant}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Insured Person</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {currentRecord.policy?.insuredName || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Net Assessed Amount</span>
              <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                {formatINR(currentRecord.summary?.grandTotal)}
              </span>
            </div>
          </div>

          {/* Quick Tab Shortcuts for Active Survey */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setCurrentTab('policy')}
              className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between transition-colors"
            >
              <span>Policy & Vehicle</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </button>
            <button
              onClick={() => setCurrentTab('final-estimate')}
              className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between transition-colors"
            >
              <span>Final Assessment</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </button>
            <button
              onClick={() => setCurrentTab('validation')}
              className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between transition-colors"
            >
              <span>Validation Issues</span>
              <span className="text-[10px] px-1.5 rounded-full bg-rose-500 text-white font-mono">
                {currentRecord.validationErrors?.length || 0}
              </span>
            </button>
            <button
              onClick={() => setCurrentTab('final-report')}
              className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs flex items-center justify-between transition-colors font-semibold"
            >
              <span>Generate Report</span>
              <FileCheck2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Recent Records Sidebar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Surveys</h3>
            <button
              onClick={() => setCurrentTab('records')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              View All ({allRecords.length})
            </button>
          </div>

          <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto">
            {allRecords.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No records found. Click New Survey.</div>
            ) : (
              allRecords.slice(0, 5).map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => onSelectRecord(rec)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                    rec.id === currentRecord.id
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs font-mono text-slate-800 dark:text-slate-200">
                      {rec.vehicle?.registrationNumber || 'No RC'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(rec.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {rec.policy?.insuredName || 'Unnamed'} • {rec.vehicle?.make || ''} {rec.vehicle?.model || ''}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px]">
                    <span className="text-slate-400">{rec.documentType}</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatINR(rec.summary?.grandTotal)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

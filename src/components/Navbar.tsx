import React from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  PlusCircle,
  FileCheck,
  Moon,
  Sun,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Bot
} from 'lucide-react';
import { SurveyRecord } from '../types/survey';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: SurveyRecord[];
  onSelectRecord: (record: SurveyRecord) => void;
  onNewSurvey: () => void;
  historyCount: number;
  onOpenHistory: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  errorCount: number;
  onOpenAIAssistant?: () => void;
  activeRecord?: SurveyRecord | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  saveStatus,
  searchQuery,
  setSearchQuery,
  searchResults,
  onSelectRecord,
  onNewSurvey,
  historyCount,
  onOpenHistory,
  darkMode,
  setDarkMode,
  errorCount,
  onOpenAIAssistant,
  activeRecord,
}) => {
  const [searchOpen, setSearchOpen] = React.useState(false);

  // Compute section completion progress
  const completedSections = React.useMemo(() => {
    if (!activeRecord) return 0;
    let count = 0;
    if (activeRecord.policy?.policyNumber) count++;
    if (activeRecord.vehicle?.registrationNumber || activeRecord.vehicle?.rcNumber) count++;
    if (activeRecord.clientRequest?.clientName) count++;
    if (activeRecord.companyRequest?.companyName) count++;
    if (activeRecord.initialEstimate?.parts?.length > 0) count++;
    if (activeRecord.finalEstimate?.parts?.length > 0) count++;
    if (activeRecord.observations?.causeOfAccident) count++;
    if (activeRecord.invoices?.length > 0 || activeRecord.summary?.grandTotal > 0) count++;
    return count;
  }, [activeRecord]);

  const completionPercent = Math.round((completedSections / 8) * 100);

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className="flex items-center gap-2.5 text-left focus:outline-none group"
            >
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-slate-700 group-hover:scale-105 transition-transform">
                <img
                  src="/assets/vinod-kataria-logo.jpeg"
                  alt="Vinod Kataria Insurance Company logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex items-center gap-2 sm:gap-3">
                <img
                  src="/assets/vinod-kataria-company.jpeg"
                  alt="VINOD KATARIA INSURANCE COMPANY"
                  className="hidden sm:block w-[150px] h-10 object-contain rounded-md"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-[14px] sm:text-base tracking-tight text-white uppercase leading-tight">
                      VINOD KATARIA INSURANCE COMPANY
                    </span>
                    <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                      IRDAI PRO
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-300 font-semibold">SurveyFlow</span>
                    <span className="text-[11px] text-slate-500 hidden sm:inline">•</span>
                    <p className="text-[11px] text-slate-400 hidden sm:block">Intelligent Motor Survey & Loss Assessor</p>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Global Search Bar */}
          <div className="relative flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search RC, Policy, Claim, Vehicle, Client..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Live Search Dropdown */}
            {searchOpen && searchQuery && (
              <div
                className="absolute left-0 right-0 mt-1.5 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto"
                onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
              >
                <div className="p-2 border-b border-slate-700 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Found {searchResults.length} matching survey record(s)
                </div>
                {searchResults.length === 0 ? (
                  <div className="p-4 text-xs text-slate-400 text-center">No matching surveys found</div>
                ) : (
                  searchResults.map((rec) => (
                    <button
                      key={rec.id}
                      onClick={() => {
                        onSelectRecord(rec);
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="w-full p-2.5 text-left hover:bg-slate-700/70 border-b border-slate-700/40 last:border-b-0 flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-white">
                            {rec.vehicle?.registrationNumber || rec.vehicle?.rcNumber || 'No RC'}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 font-mono">
                            {rec.surveyNumber}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                          {rec.policy?.insuredName || 'Unnamed Insured'} • Policy: {rec.policy?.policyNumber || 'N/A'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-emerald-400 font-mono font-medium">
                          ₹{rec.summary?.grandTotal?.toLocaleString('en-IN') || 0}
                        </span>
                        <div className="text-[10px] text-slate-400">{rec.documentType}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Section Progress Pill */}
            {activeRecord && (
              <div
                className="hidden xl:flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-slate-800 border border-slate-700 font-mono"
                title={`${completedSections} of 8 Sections Committed to Survey File`}
              >
                <span className="text-slate-400 text-[11px]">Sections:</span>
                <span className="text-indigo-300 font-bold">{completedSections}/8</span>
                <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* AI Surveyor Copilot Button */}
            {onOpenAIAssistant && (
              <button
                onClick={onOpenAIAssistant}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-500/25 transition-all active:scale-95 group"
                title="Open AI Surveyor Intelligence Copilot & Audit Engine"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>AI Copilot</span>
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </button>
            )}

            {/* Auto-Save Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 font-medium">
              {saveStatus === 'saving' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-amber-400 text-[11px]">Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-[11px]">Saved</span>
                </>
              )}
              {saveStatus === 'unsaved' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-amber-400 text-[11px]">Unsaved</span>
                </>
              )}
            </div>

            {/* Validation Badge Indicator */}
            {errorCount > 0 && (
              <button
                onClick={() => setCurrentTab('validation')}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-colors"
                title={`${errorCount} validation issues detected`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[11px] font-mono">{errorCount}</span>
              </button>
            )}

            {/* Change History Button */}
            <button
              onClick={onOpenHistory}
              className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Audit trail and change history"
            >
              <Clock className="w-4 h-4" />
              {historyCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {historyCount > 99 ? '99+' : historyCount}
                </span>
              )}
            </button>

            {/* New Survey Button */}
            <button
              onClick={onNewSurvey}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Survey</span>
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-300" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import {
  LayoutDashboard,
  UserCheck,
  Building2,
  Calculator,
  FileInput,
  CheckSquare,
  FileCheck2,
  FolderArchive,
  Settings,
  Sparkles,
  CheckCircle2,
  BookmarkCheck,
  Camera
} from 'lucide-react';
import { SurveyRecord } from '../types/survey';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  errorCount: number;
  initialPartsCount: number;
  finalPartsCount: number;
  unmappedCount: number;
  photosCount?: number;
  onOpenAIAssistant?: () => void;
  activeRecord?: SurveyRecord | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  errorCount,
  initialPartsCount,
  finalPartsCount,
  unmappedCount,
  photosCount = 0,
  onOpenAIAssistant,
  activeRecord,
}) => {
  // Check completion of individual sections
  const isSectionCommitted = (id: string): boolean => {
    if (!activeRecord) return false;
    switch (id) {
      case 'policy':
        return Boolean(activeRecord.policy?.policyNumber && activeRecord.policy?.insuredName);
      case 'client-request':
        return Boolean(activeRecord.clientRequest?.clientName || activeRecord.clientRequest?.mobileNumber);
      case 'company-request':
        return Boolean(activeRecord.companyRequest?.companyName);
      case 'initial-estimate':
        return Boolean(activeRecord.initialEstimate?.parts?.length > 0);
      case 'final-estimate':
        return Boolean(activeRecord.finalEstimate?.parts?.length > 0);
      case 'vehicle-photos':
        return Boolean(activeRecord.photos && activeRecord.photos.length > 0);
      case 'final-report':
        return Boolean(activeRecord.status === 'Report Generated' || activeRecord.status === 'Completed');
      default:
        return false;
    }
  };

  const navItems = [
    { id: 'dashboard', label: '1. Dashboard', icon: LayoutDashboard },
    { id: 'client-request', label: '2. Client Request', icon: UserCheck, hasCommitted: isSectionCommitted('client-request'), badgeText: 'WA/Email' },
    { id: 'company-request', label: '3. Company Request', icon: Building2, hasCommitted: isSectionCommitted('company-request'), badgeText: 'Portal/Mail' },
    { id: 'combined-data', label: '4. Policy + Estimate + JSON', icon: FileInput, highlight: true, hasCommitted: isSectionCommitted('policy') || isSectionCommitted('initial-estimate') },
    { id: 'final-estimate', label: '5. Final Estimate', icon: Calculator, badge: finalPartsCount, hasCommitted: isSectionCommitted('final-estimate') },
    { id: 'vehicle-photos', label: '6. Vehicle Photos', icon: Camera, badge: photosCount, hasCommitted: isSectionCommitted('vehicle-photos'), badgeText: 'Cam/Upload' },
    { id: 'validation', label: '7. Data Validation', icon: CheckSquare, errorBadge: errorCount },
    { id: 'final-report', label: '8. Final Report', icon: FileCheck2, hasCommitted: isSectionCommitted('final-report') },
    { id: 'records', label: '9. Records / History', icon: FolderArchive },
    { id: 'settings', label: '10. Settings', icon: Settings },
  ];

  return (
    <nav className="w-full lg:w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0 lg:min-h-[calc(100vh-4rem)] p-3 flex flex-col justify-between">
      {/* Mobile Horizontal Scroll Tab Bar / Desktop Vertical Menu */}
      <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none">
        <div className="hidden lg:flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <span>Survey Sections</span>
          <span className="text-[10px] text-emerald-400 font-mono font-semibold">IRDAI Flow</span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap lg:whitespace-normal text-left ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold'
                  : item.highlight
                  ? 'bg-slate-800/90 text-indigo-300 hover:bg-slate-800 hover:text-white border border-indigo-500/30'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5 ml-2">
                {item.hasCommitted && !isActive && (
                  <span title="Section Data Committed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                )}
                {item.badgeText && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 font-mono">
                    {item.badgeText}
                  </span>
                )}
                {item.id === 'text-entry' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                    JSON
                  </span>
                )}
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {typeof item.errorBadge === 'number' && item.errorBadge > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono font-bold animate-pulse">
                    {item.errorBadge}
                  </span>
                )}
                {item.id === 'validation' && unmappedCount > 0 && item.errorBadge === 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-mono font-bold">
                    {unmappedCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* AI Intelligence Hub Widget in Sidebar Footer */}
      {onOpenAIAssistant && (
        <div className="hidden lg:block pt-3 border-t border-slate-800/80 mt-3">
          <button
            onClick={onOpenAIAssistant}
            className="w-full p-3 rounded-xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-purple-950/70 border border-indigo-500/30 hover:border-indigo-400/50 text-left transition-all group shadow-lg shadow-indigo-950/40"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400 group-hover:rotate-12 transition-transform" />
                <span className="text-xs font-bold text-white">AI Intelligence Hub</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Instant IRDAI claim audit, WhatsApp/Email auto-dispatch & observation drafting.
            </p>
          </button>
        </div>
      )}
    </nav>
  );
};

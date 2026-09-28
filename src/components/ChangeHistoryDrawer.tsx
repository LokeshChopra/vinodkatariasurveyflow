import React from 'react';
import { Clock, RotateCcw, X, History, ArrowRight } from 'lucide-react';
import { ChangeLogEntry } from '../types/survey';

interface ChangeHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: ChangeLogEntry[];
  onUndo: (entry: ChangeLogEntry) => void;
}

export const ChangeHistoryDrawer: React.FC<ChangeHistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onUndo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Audit Trail & Edit History</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of Changes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              <History className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              <span>No user edits recorded yet in this survey session.</span>
            </div>
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <button
                    onClick={() => onUndo(entry)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Undo</span>
                  </button>
                </div>

                <div className="font-semibold text-slate-800 dark:text-slate-200">{entry.description}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Field: <span className="text-slate-700 dark:text-slate-300 font-semibold">{entry.field}</span>
                </div>

                {entry.oldValue !== undefined && entry.newValue !== undefined && (
                  <div className="flex items-center gap-2 text-[11px] font-mono bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-rose-500 truncate max-w-[120px]">
                      {typeof entry.oldValue === 'object' ? JSON.stringify(entry.oldValue) : String(entry.oldValue || 'empty')}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="text-emerald-500 truncate max-w-[120px]">
                      {typeof entry.newValue === 'object' ? JSON.stringify(entry.newValue) : String(entry.newValue || 'empty')}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

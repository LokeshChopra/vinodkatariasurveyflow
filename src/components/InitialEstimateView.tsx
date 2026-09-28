import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Copy,
  Wrench,
  Percent,
  CheckCircle2,
  AlertTriangle,
  CheckSquare,
  Square,
  ArrowRight,
  Filter,
  BookmarkCheck
} from 'lucide-react';
import { InitialPartRow, InitialLabourRow, ValidationError } from '../types/survey';
import { formatINR } from '../utils/calculations';

interface InitialEstimateViewProps {
  parts: InitialPartRow[];
  labour: InitialLabourRow[];
  validationErrors: ValidationError[];
  onChangeParts: (parts: InitialPartRow[], changeDesc: string) => void;
  onChangeLabour: (labour: InitialLabourRow[], changeDesc: string) => void;
  onNavigateToFinalEstimate?: () => void;
  onCommitSection?: () => void;
}

export const InitialEstimateView: React.FC<InitialEstimateViewProps> = ({
  parts,
  labour,
  validationErrors,
  onChangeParts,
  onChangeLabour,
  onNavigateToFinalEstimate,
  onCommitSection,
}) => {
  const [isCommitted, setIsCommitted] = useState(false);
  const [commitTime, setCommitTime] = useState<string | null>(null);

  const handleCommit = () => {
    if (onCommitSection) onCommitSection();
    setIsCommitted(true);
    setCommitTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };
  // Selection counts
  const selectedPartsCount = parts.filter((p) => p.selectedForFinal !== false).length;
  const selectedLabourCount = labour.filter((l) => l.selectedForFinal !== false).length;

  const allPartsSelected = parts.length > 0 && selectedPartsCount === parts.length;
  const allLabourSelected = labour.length > 0 && selectedLabourCount === labour.length;

  // Toggle Single Part Selection
  const handleTogglePartSelect = (id: string) => {
    const updated = parts.map((p) => {
      if (p.id === id) {
        const isCurrentlySelected = p.selectedForFinal !== false;
        return { ...p, selectedForFinal: !isCurrentlySelected };
      }
      return p;
    });
    onChangeParts(updated, 'Toggled part selection for Final Estimate');
  };

  // Toggle All Parts
  const handleToggleAllParts = (selectAll: boolean) => {
    const updated = parts.map((p) => ({ ...p, selectedForFinal: selectAll }));
    onChangeParts(updated, selectAll ? 'Selected all parts for Final Estimate' : 'Deselected all parts');
  };

  // Toggle Single Labour Selection
  const handleToggleLabourSelect = (id: string) => {
    const updated = labour.map((l) => {
      if (l.id === id) {
        const isCurrentlySelected = l.selectedForFinal !== false;
        return { ...l, selectedForFinal: !isCurrentlySelected };
      }
      return l;
    });
    onChangeLabour(updated, 'Toggled labour selection for Final Estimate');
  };

  // Toggle All Labour
  const handleToggleAllLabour = (selectAll: boolean) => {
    const updated = labour.map((l) => ({ ...l, selectedForFinal: selectAll }));
    onChangeLabour(updated, selectAll ? 'Selected all labour for Final Estimate' : 'Deselected all labour');
  };

  // Parts Handlers
  const handlePartFieldChange = (id: string, field: keyof InitialPartRow, value: any) => {
    const updated = parts.map((p) => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    });
    onChangeParts(updated, `Updated Initial Part ${field}`);
  };

  const handleAddPart = () => {
    const nextENo = parts.length > 0 ? String(Number(parts[parts.length - 1].eNo || '0') + 1) : '1';
    const newPart: InitialPartRow = {
      id: `init-part-${Date.now()}`,
      selectedForFinal: true,
      eNo: nextENo,
      partsDescription: 'NEW ACCIDENTAL PART',
      hsnCode: '87089900',
      billSNo: nextENo,
      remark: 'Damage',
      estimated: 0,
      glassSecondHandRepair: null,
      metal35: null,
      nonMetal: 0,
      gstRate: 18,
    };
    onChangeParts([...parts, newPart], 'Added Initial Part Row');
  };

  const handleDuplicatePart = (part: InitialPartRow) => {
    const nextENo = String(Number(part.eNo || '0') + 1);
    const duplicated: InitialPartRow = {
      ...part,
      id: `init-part-${Date.now()}`,
      eNo: nextENo,
      selectedForFinal: true,
    };
    onChangeParts([...parts, duplicated], `Duplicated Initial Part ${part.eNo}`);
  };

  const handleDeletePart = (id: string) => {
    const updated = parts.filter((p) => p.id !== id);
    onChangeParts(updated, 'Deleted Initial Part Row');
  };

  // Labour Handlers
  const handleLabourFieldChange = (id: string, field: keyof InitialLabourRow, value: any) => {
    const updated = labour.map((l) => {
      if (l.id === id) {
        const next = { ...l, [field]: value };
        const est = Number(next.estimated) || 0;
        const rate = Number(next.gstRate) || 0;
        next.total = Math.round((est + (est * rate) / 100) * 100) / 100;
        return next;
      }
      return l;
    });
    onChangeLabour(updated, `Updated Initial Labour ${field}`);
  };

  const handleAddLabour = () => {
    const nextSNo = labour.length > 0 ? String(Number(labour[labour.length - 1].sNo || '0') + 1) : '1';
    const newLabour: InitialLabourRow = {
      id: `init-lab-${Date.now()}`,
      selectedForFinal: true,
      sNo: nextSNo,
      sac: '998729',
      billSNo: nextSNo,
      labourDescription: 'LABOUR / REPAIR CHARGES',
      estimated: 0,
      assessed: 0,
      gstRate: 18,
      total: 0,
    };
    onChangeLabour([...labour, newLabour], 'Added Initial Labour Row');
  };

  const handleDuplicateLabour = (item: InitialLabourRow) => {
    const nextSNo = String(Number(item.sNo || '0') + 1);
    const duplicated: InitialLabourRow = {
      ...item,
      id: `init-lab-${Date.now()}`,
      sNo: nextSNo,
      selectedForFinal: true,
    };
    onChangeLabour([...labour, duplicated], `Duplicated Initial Labour ${item.sNo}`);
  };

  const handleDeleteLabour = (id: string) => {
    const updated = labour.filter((l) => l.id !== id);
    onChangeLabour(updated, 'Deleted Initial Labour Row');
  };

  // Totals
  const totalPartsEst = parts.reduce((a, b) => a + (Number(b.estimated) || 0), 0);
  const totalLabourEst = labour.reduce((a, b) => a + (Number(b.estimated) || 0), 0);
  const grandEst = totalPartsEst + totalLabourEst;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 font-semibold font-mono">
                  Section 5
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Initial Estimate (Spot / Preliminary)</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Original garage claim estimates. Selection checkboxes control which items are carried into the Final Estimate.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Section Commit Status */}
            {isCommitted && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Committed {commitTime && `(${commitTime})`}</span>
              </div>
            )}

            <button
              onClick={handleCommit}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
              title="Explicitly commit all Initial Estimate changes"
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>Commit Section</span>
            </button>

            {/* Quick Summary Pill */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Parts Total</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatINR(totalPartsEst)}</span>
              </div>
              <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />
              <div>
                <span className="text-slate-400 block text-[10px]">Labour Total</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatINR(totalLabourEst)}</span>
              </div>
              <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />
              <div>
                <span className="text-slate-400 block text-[10px]">Initial Est. Total</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">{formatINR(grandEst)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SELECTION FILTER NOTIFICATION BANNER */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50 dark:from-slate-900 dark:via-blue-950/40 dark:to-slate-900 border border-blue-200 dark:border-blue-900/60 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-sm">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-blue-900 dark:text-blue-200">
                Final Estimate Selection Box
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-200/60 dark:bg-blue-900 text-blue-800 dark:text-blue-300 font-mono font-bold">
                Live Filter Active
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Jis-jis item ko checkbox me tick karenge, <strong>kewal wahi data Final Estimate me show hoga</strong>.
              Uncheck karne par item Final Estimate se remove ho jayega.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 font-sans text-[11px]">Selected:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {selectedPartsCount}/{parts.length} Parts
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {selectedLabourCount}/{labour.length} Labour
            </span>
          </div>

          {onNavigateToFinalEstimate && (
            <button
              onClick={onNavigateToFinalEstimate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <span>View in Final Estimate</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* PARTS TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Itemized Parts Estimate</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {parts.length} Items ({selectedPartsCount} Selected)
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tick the selection box (left column) to include part in Final Estimate.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleAllParts(!allPartsSelected)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
            >
              {allPartsSelected ? 'Deselect All Parts' : 'Select All Parts'}
            </button>
            <button
              onClick={handleAddPart}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Part Row</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-2.5 py-2.5 w-12 text-center" title="Select for Final Estimate">
                  <input
                    type="checkbox"
                    checked={allPartsSelected}
                    onChange={(e) => handleToggleAllParts(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-2.5 py-2.5 w-14 text-center">E. No.</th>
                <th className="px-2.5 py-2.5 min-w-[200px]">Parts Description</th>
                <th className="px-2.5 py-2.5 w-24">HSN Code</th>
                <th className="px-2.5 py-2.5 w-20">Bill S.No</th>
                <th className="px-2.5 py-2.5 w-28">Remark</th>
                <th className="px-2.5 py-2.5 w-28 text-right">Estimated ₹</th>
                <th className="px-2.5 py-2.5 w-24 text-right">Glass/Repair</th>
                <th className="px-2.5 py-2.5 w-24 text-right">Metal (35)</th>
                <th className="px-2.5 py-2.5 w-24 text-right">Non Metal</th>
                <th className="px-2.5 py-2.5 w-20 text-center">GST %</th>
                <th className="px-2.5 py-2.5 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {parts.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-xs text-slate-400 font-sans">
                    No initial estimate parts recorded. Paste text in Section 7 or click 'Add Part Row'.
                  </td>
                </tr>
              ) : (
                parts.map((p) => {
                  const isSelected = p.selectedForFinal !== false;
                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                          : 'bg-slate-50/40 dark:bg-slate-900/30 opacity-60'
                      }`}
                    >
                      {/* Checkbox Selection Box */}
                      <td className="px-2.5 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleTogglePartSelect(p.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          title={isSelected ? 'Selected for Final Estimate' : 'Excluded from Final Estimate'}
                        />
                      </td>
                      {/* E No */}
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="text"
                          value={p.eNo || ''}
                          onChange={(e) => handlePartFieldChange(p.id, 'eNo', e.target.value)}
                          className="w-12 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-cyan-500 font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                        />
                      </td>
                      {/* Description */}
                      <td className="px-2 py-1.5 font-sans font-medium">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={p.partsDescription || ''}
                            onChange={(e) => handlePartFieldChange(p.id, 'partsDescription', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-cyan-500 text-slate-900 dark:text-white px-1 py-0.5 focus:outline-none"
                          />
                          {!isSelected && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 whitespace-nowrap">
                              Excluded
                            </span>
                          )}
                        </div>
                      </td>
                      {/* HSN */}
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={p.hsnCode || ''}
                          onChange={(e) => handlePartFieldChange(p.id, 'hsnCode', e.target.value)}
                          className="w-20 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-cyan-500 text-slate-600 dark:text-slate-400 px-1 py-0.5 focus:outline-none"
                        />
                      </td>
                      {/* Bill S No */}
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={p.billSNo || ''}
                          onChange={(e) => handlePartFieldChange(p.id, 'billSNo', e.target.value)}
                          className="w-14 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-cyan-500 text-slate-600 dark:text-slate-400 px-1 py-0.5 focus:outline-none"
                        />
                      </td>
                      {/* Remark */}
                      <td className="px-2 py-1.5 font-sans">
                        <input
                          type="text"
                          value={p.remark || ''}
                          onChange={(e) => handlePartFieldChange(p.id, 'remark', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-cyan-500 text-slate-600 dark:text-slate-400 px-1 py-0.5 focus:outline-none"
                        />
                      </td>
                      {/* Estimated ₹ */}
                      <td className="px-2 py-1.5 text-right font-bold text-slate-900 dark:text-white">
                        <input
                          type="number"
                          step="0.01"
                          value={p.estimated ?? ''}
                          onChange={(e) => handlePartFieldChange(p.id, 'estimated', parseFloat(e.target.value) || 0)}
                          className="w-24 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-cyan-500 px-1 py-0.5 focus:outline-none font-bold"
                        />
                      </td>
                      {/* Glass */}
                      <td className="px-2 py-1.5 text-right text-slate-500">
                        <input
                          type="number"
                          step="0.01"
                          value={p.glassSecondHandRepair ?? ''}
                          placeholder="---"
                          onChange={(e) =>
                            handlePartFieldChange(
                              p.id,
                              'glassSecondHandRepair',
                              e.target.value === '' ? null : parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-cyan-500 px-1 py-0.5 focus:outline-none"
                        />
                      </td>
                      {/* Metal */}
                      <td className="px-2 py-1.5 text-right text-slate-500">
                        <input
                          type="number"
                          step="0.01"
                          value={p.metal35 ?? ''}
                          placeholder="---"
                          onChange={(e) =>
                            handlePartFieldChange(
                              p.id,
                              'metal35',
                              e.target.value === '' ? null : parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-cyan-500 px-1 py-0.5 focus:outline-none"
                        />
                      </td>
                      {/* Non Metal */}
                      <td className="px-2 py-1.5 text-right text-slate-500">
                        <input
                          type="number"
                          step="0.01"
                          value={p.nonMetal ?? ''}
                          placeholder="---"
                          onChange={(e) =>
                            handlePartFieldChange(
                              p.id,
                              'nonMetal',
                              e.target.value === '' ? null : parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-cyan-500 px-1 py-0.5 focus:outline-none"
                        />
                      </td>
                      {/* GST % */}
                      <td className="px-2 py-1.5 text-center">
                        <select
                          value={p.gstRate ?? 18}
                          onChange={(e) => handlePartFieldChange(p.id, 'gstRate', Number(e.target.value))}
                          className="bg-transparent border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </td>
                      {/* Actions */}
                      <td className="px-2 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1 font-sans">
                          <button
                            onClick={() => handleDuplicatePart(p)}
                            className="p-1 rounded text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
                            title="Duplicate row"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeletePart(p.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Delete row"
                          >
                            <Trash2 className="w-3 h-3" />
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

      {/* LABOUR & REPAIRS TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Labour & Repairs Estimate</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {labour.length} Items ({selectedLabourCount} Selected)
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tick the selection box (left column) to include labour charge in Final Estimate.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleAllLabour(!allLabourSelected)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
            >
              {allLabourSelected ? 'Deselect All Labour' : 'Select All Labour'}
            </button>
            <button
              onClick={handleAddLabour}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Labour Row</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-2.5 w-12 text-center" title="Select for Final Estimate">
                  <input
                    type="checkbox"
                    checked={allLabourSelected}
                    onChange={(e) => handleToggleAllLabour(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-2.5 w-14 text-center">S. No.</th>
                <th className="px-3 py-2.5 w-24">SAC Code</th>
                <th className="px-3 py-2.5 w-20">Bill S.No</th>
                <th className="px-3 py-2.5 min-w-[220px]">Labour Description</th>
                <th className="px-3 py-2.5 w-28 text-right">Estimated ₹</th>
                <th className="px-3 py-2.5 w-28 text-right">Assessed ₹</th>
                <th className="px-3 py-2.5 w-20 text-center">GST %</th>
                <th className="px-3 py-2.5 w-28 text-right">Total ₹</th>
                <th className="px-3 py-2.5 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {labour.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-slate-400 font-sans">
                    No initial labour items recorded. Click 'Add Labour Row'.
                  </td>
                </tr>
              ) : (
                labour.map((l) => {
                  const isSelected = l.selectedForFinal !== false;
                  return (
                    <tr
                      key={l.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                          : 'bg-slate-50/40 dark:bg-slate-900/30 opacity-60'
                      }`}
                    >
                      {/* Checkbox Selection Box */}
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleLabourSelect(l.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          title={isSelected ? 'Selected for Final Estimate' : 'Excluded from Final Estimate'}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="text"
                          value={l.sNo || ''}
                          onChange={(e) => handleLabourFieldChange(l.id, 'sNo', e.target.value)}
                          className="w-10 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-cyan-500 font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={l.sac || ''}
                          onChange={(e) => handleLabourFieldChange(l.id, 'sac', e.target.value)}
                          className="w-20 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-cyan-500 text-slate-600 dark:text-slate-400 px-1 py-0.5 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={l.billSNo || ''}
                          onChange={(e) => handleLabourFieldChange(l.id, 'billSNo', e.target.value)}
                          className="w-14 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-cyan-500 text-slate-600 dark:text-slate-400 px-1 py-0.5 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 font-sans font-medium">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={l.labourDescription || ''}
                            onChange={(e) => handleLabourFieldChange(l.id, 'labourDescription', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-cyan-500 text-slate-900 dark:text-white px-1 py-0.5 focus:outline-none"
                          />
                          {!isSelected && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 whitespace-nowrap">
                              Excluded
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">
                        <input
                          type="number"
                          step="0.01"
                          value={l.estimated ?? ''}
                          onChange={(e) => handleLabourFieldChange(l.id, 'estimated', parseFloat(e.target.value) || 0)}
                          className="w-24 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-cyan-500 px-1 py-0.5 focus:outline-none font-bold"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-300">
                        <input
                          type="number"
                          step="0.01"
                          value={l.assessed ?? ''}
                          onChange={(e) => handleLabourFieldChange(l.id, 'assessed', parseFloat(e.target.value) || 0)}
                          className="w-24 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-cyan-500 px-1 py-0.5 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <select
                          value={l.gstRate ?? 18}
                          onChange={(e) => handleLabourFieldChange(l.id, 'gstRate', Number(e.target.value))}
                          className="bg-transparent border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-cyan-600 dark:text-cyan-400">
                        {formatINR(l.total)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1 font-sans">
                          <button
                            onClick={() => handleDuplicateLabour(l)}
                            className="p-1 rounded text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
                            title="Duplicate row"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteLabour(l.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Delete row"
                          >
                            <Trash2 className="w-3 h-3" />
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

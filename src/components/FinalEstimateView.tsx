import React, { useState } from 'react';
import {
  Calculator,
  Plus,
  Trash2,
  Copy,
  Receipt,
  Layers,
  ArrowRightLeft,
  Info,
  DollarSign,
  TrendingDown,
  ShieldCheck,
  FileText
} from 'lucide-react';
import {
  FinalPartRow,
  FinalLabourRow,
  InvoiceRow,
  GstSummaryRow,
  EstimateSummary,
  InitialPartRow,
  InitialLabourRow
} from '../types/survey';
import { formatINR } from '../utils/calculations';

interface FinalEstimateViewProps {
  finalParts: FinalPartRow[];
  finalLabour: FinalLabourRow[];
  invoices: InvoiceRow[];
  summary: EstimateSummary;
  gstSummary: GstSummaryRow[];
  initialParts: InitialPartRow[];
  initialLabour: InitialLabourRow[];
  policyExcess: number;
  salvage: number;
  onUpdateFinalParts: (parts: FinalPartRow[], changeDesc: string) => void;
  onUpdateFinalLabour: (labour: FinalLabourRow[], changeDesc: string) => void;
  onUpdateInvoices: (invoices: InvoiceRow[], changeDesc: string) => void;
  onUpdateExcessAndSalvage: (excess: number, salvage: number) => void;
  onNavigateToInitialEstimate?: () => void;
  onToggleInitialPart?: (id: string) => void;
  onToggleInitialLabour?: (id: string) => void;
}

export const FinalEstimateView: React.FC<FinalEstimateViewProps> = ({
  finalParts,
  finalLabour,
  invoices,
  summary,
  gstSummary,
  initialParts,
  initialLabour,
  policyExcess,
  salvage,
  onUpdateFinalParts,
  onUpdateFinalLabour,
  onUpdateInvoices,
  onUpdateExcessAndSalvage,
  onNavigateToInitialEstimate,
  onToggleInitialPart,
  onToggleInitialLabour,
}) => {
  const [activeTab, setActiveTab] = useState<'parts' | 'labour' | 'summary' | 'gst' | 'invoices' | 'comparison'>(
    'parts'
  );

  // Excluded items from Initial Estimate selection
  const excludedParts = initialParts.filter((ip) => ip.selectedForFinal === false);
  const excludedLabour = initialLabour.filter((il) => il.selectedForFinal === false);

  // Parts handlers
  const handlePartFieldChange = (id: string, field: keyof FinalPartRow, value: any) => {
    const updated = finalParts.map((p) => {
      if (p.id === id) {
        const next = { ...p, [field]: value };
        const ass = Number(next.assessed) || 0;
        const depPct = Number(next.depreciationPercent) || 0;
        const depAmt = Math.round(((ass * depPct) / 100) * 100) / 100;
        next.depreciationAmount = depAmt;
        next.netAmount = Math.max(0, Math.round((ass - depAmt) * 100) / 100);
        return next;
      }
      return p;
    });
    onUpdateFinalParts(updated, `Updated Final Part ${field}`);
  };

  const handleAddPart = () => {
    const nextENo = finalParts.length > 0 ? String(Number(finalParts[finalParts.length - 1].eNo || '0') + 1) : '1';
    const newPart: FinalPartRow = {
      id: `final-part-${Date.now()}`,
      eNo: nextENo,
      partsDescription: 'NEW ACCIDENTAL PART',
      hsnCode: '87089900',
      billSNo: nextENo,
      remark: 'Damage',
      estimated: 0,
      assessed: 0,
      depreciationPercent: 0,
      depreciationAmount: 0,
      glassSecondHandRepair: null,
      metal35: null,
      nonMetal: 0,
      gstRate: 18,
      netAmount: 0,
    };
    onUpdateFinalParts([...finalParts, newPart], 'Added Final Part Row');
  };

  const handleDuplicatePart = (part: FinalPartRow) => {
    const nextENo = String(Number(part.eNo || '0') + 1);
    const duplicated: FinalPartRow = {
      ...part,
      id: `final-part-${Date.now()}`,
      eNo: nextENo,
    };
    onUpdateFinalParts([...finalParts, duplicated], `Duplicated Final Part ${part.eNo}`);
  };

  const handleDeletePart = (id: string) => {
    onUpdateFinalParts(finalParts.filter((p) => p.id !== id), 'Deleted Final Part Row');
  };

  // Labour handlers
  const handleLabourFieldChange = (id: string, field: keyof FinalLabourRow, value: any) => {
    const updated = finalLabour.map((l) => {
      if (l.id === id) {
        const next = { ...l, [field]: value };
        const ass = Number(next.assessed) || 0;
        const rate = Number(next.gstRate) || 0;
        next.total = Math.round((ass + (ass * rate) / 100) * 100) / 100;
        return next;
      }
      return l;
    });
    onUpdateFinalLabour(updated, `Updated Final Labour ${field}`);
  };

  const handleAddLabour = () => {
    const nextSNo = finalLabour.length > 0 ? String(Number(finalLabour[finalLabour.length - 1].sNo || '0') + 1) : '1';
    const newLabour: FinalLabourRow = {
      id: `final-lab-${Date.now()}`,
      sNo: nextSNo,
      sac: '998729',
      billSNo: nextSNo,
      labourDescription: 'LABOUR / REPAIR CHARGES',
      estimated: 0,
      assessed: 0,
      gstRate: 18,
      total: 0,
    };
    onUpdateFinalLabour([...finalLabour, newLabour], 'Added Final Labour Row');
  };

  const handleDuplicateLabour = (item: FinalLabourRow) => {
    const nextSNo = String(Number(item.sNo || '0') + 1);
    const duplicated: FinalLabourRow = {
      ...item,
      id: `final-lab-${Date.now()}`,
      sNo: nextSNo,
    };
    onUpdateFinalLabour([...finalLabour, duplicated], `Duplicated Final Labour ${item.sNo}`);
  };

  const handleDeleteLabour = (id: string) => {
    onUpdateFinalLabour(finalLabour.filter((l) => l.id !== id), 'Deleted Final Labour Row');
  };

  // Invoice handlers
  const handleAddInvoice = () => {
    const newInv: InvoiceRow = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      invoiceAmount: 0,
      vendor: 'Authorized Bodyshop Workshop',
      gstNumber: '',
      description: 'Accidental repairs & spare parts bill',
    };
    onUpdateInvoices([...invoices, newInv], 'Added New Invoice');
  };

  const handleInvoiceChange = (id: string, field: keyof InvoiceRow, value: any) => {
    const updated = invoices.map((inv) => (inv.id === id ? { ...inv, [field]: value } : inv));
    onUpdateInvoices(updated, `Updated Invoice ${field}`);
  };

  const handleDeleteInvoice = (id: string) => {
    onUpdateInvoices(invoices.filter((inv) => inv.id !== id), 'Deleted Invoice Row');
  };

  // Comparison Calculations
  const initPartsEst = initialParts.reduce((a, b) => a + (Number(b.estimated) || 0), 0);
  const finalPartsAss = finalParts.reduce((a, b) => a + (Number(b.assessed) || 0), 0);
  const diffParts = finalPartsAss - initPartsEst;

  const initLabourEst = initialLabour.reduce((a, b) => a + (Number(b.estimated) || 0), 0);
  const finalLabourAss = finalLabour.reduce((a, b) => a + (Number(b.assessed) || 0), 0);
  const diffLabour = finalLabourAss - initLabourEst;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold font-mono">
                  Section 6
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Final Estimate & Survey Assessment
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Itemized assessment, parts depreciation, SAC labour, GST bucket breakdown, and final loss computation.
              </p>
            </div>
          </div>

          {/* Grand Total Highlight Badge */}
          <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 px-5 py-2.5 rounded-xl font-mono">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700 dark:text-emerald-400 block">
                Net Assessed Loss
              </span>
              <span className="text-xl font-extrabold text-emerald-800 dark:text-emerald-300">
                {formatINR(summary.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Selection Sync Notice Banner */}
        <div className="mt-4 p-3 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-blue-950 dark:text-blue-200 font-medium">
              Filtered by Initial Estimate Selection: Showing only items selected in Section 5 (<strong>{finalParts.length} Parts</strong>, <strong>{finalLabour.length} Labour items</strong>).
            </span>
          </div>
          {onNavigateToInitialEstimate && (
            <button
              onClick={onNavigateToInitialEstimate}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 whitespace-nowrap self-start sm:self-auto"
            >
              <span>Modify Selection in Initial Estimate</span>
              <span>→</span>
            </button>
          )}
        </div>

        {/* Sub Navigation Bar */}
        <div className="flex flex-wrap items-center gap-1.5 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('parts')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'parts'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Assessed Parts ({finalParts.length})
          </button>
          <button
            onClick={() => setActiveTab('labour')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'labour'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Assessed Labour ({finalLabour.length})
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'summary'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Estimate Summary
          </button>
          <button
            onClick={() => setActiveTab('gst')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'gst'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            GST Summary Table
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'invoices'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              activeTab === 'comparison'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Initial vs Final Comparison
          </button>
        </div>
      </div>

      {/* TAB 1: FINAL PARTS */}
      {activeTab === 'parts' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Assessed Parts Table</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Columns: E. No, Description, HSN, Bill S.No, Remark, Estimated, Assessed, Dep %, Dep ₹, Metal/Glass, GST %, Net Amount
              </p>
            </div>
            <button
              onClick={handleAddPart}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Assessed Part</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-2 py-2.5 w-12 text-center">E.No</th>
                  <th className="px-2 py-2.5 min-w-[190px]">Parts Description</th>
                  <th className="px-2 py-2.5 w-24">HSN Code</th>
                  <th className="px-2 py-2.5 w-16">Bill #</th>
                  <th className="px-2 py-2.5 w-24">Remark</th>
                  <th className="px-2 py-2.5 w-24 text-right">Estimated ₹</th>
                  <th className="px-2 py-2.5 w-24 text-right font-bold text-purple-600 dark:text-purple-400">Assessed ₹</th>
                  <th className="px-2 py-2.5 w-16 text-center">Dep %</th>
                  <th className="px-2 py-2.5 w-20 text-right">Dep ₹</th>
                  <th className="px-2 py-2.5 w-16 text-center">GST %</th>
                  <th className="px-2 py-2.5 w-24 text-right font-bold text-emerald-600 dark:text-emerald-400">Net Assessed</th>
                  <th className="px-2 py-2.5 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {finalParts.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-xs text-slate-400 font-sans">
                      No final parts recorded. Click 'Add Assessed Part' or paste text in Section 7.
                    </td>
                  </tr>
                ) : (
                  finalParts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="text"
                          value={p.eNo || ''}
                          onChange={(e) => handlePartFieldChange(p.id, 'eNo', e.target.value)}
                          className="w-10 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5 font-sans font-medium">
                        <input
                          type="text"
                          value={p.partsDescription || ''}
                          onChange={(e) => handlePartFieldChange(p.id, 'partsDescription', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 text-slate-900 dark:text-white px-1 py-0.5 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={p.hsnCode || ''}
                          onChange={(e) => handlePartFieldChange(p.id, 'hsnCode', e.target.value)}
                          className="w-20 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 text-slate-600 dark:text-slate-400 px-1 py-0.5 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={p.billSNo || ''}
                          onChange={(e) => handlePartFieldChange(p.id, 'billSNo', e.target.value)}
                          className="w-12 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 text-slate-600 dark:text-slate-400 px-1 py-0.5 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5 font-sans">
                        <input
                          type="text"
                          value={p.remark || ''}
                          onChange={(e) => handlePartFieldChange(p.id, 'remark', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 text-slate-600 dark:text-slate-400 px-1 py-0.5 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right text-slate-500">
                        <input
                          type="number"
                          step="0.01"
                          value={p.estimated ?? ''}
                          onChange={(e) => handlePartFieldChange(p.id, 'estimated', parseFloat(e.target.value) || 0)}
                          className="w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 px-1 py-0.5 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-bold text-slate-900 dark:text-white">
                        <input
                          type="number"
                          step="0.01"
                          value={p.assessed ?? ''}
                          onChange={(e) => handlePartFieldChange(p.id, 'assessed', parseFloat(e.target.value) || 0)}
                          className="w-20 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 px-1 py-0.5 focus:outline-none font-bold"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <input
                          type="number"
                          value={p.depreciationPercent ?? ''}
                          onChange={(e) =>
                            handlePartFieldChange(p.id, 'depreciationPercent', parseFloat(e.target.value) || 0)
                          }
                          className="w-12 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 px-1 py-0.5 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right text-rose-500">
                        {p.depreciationAmount ? `-${formatINR(p.depreciationAmount)}` : '₹0.00'}
                      </td>
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
                      <td className="px-2 py-1.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatINR(p.netAmount)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1 font-sans">
                          <button
                            onClick={() => handleDuplicatePart(p)}
                            className="p-1 rounded text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/40"
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Excluded Parts Notification & One-Click Include */}
          {excludedParts.length > 0 && (
            <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    {excludedParts.length} Part(s) Excluded from Initial Estimate (Section 5)
                  </span>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400">
                    — Checkbox unticked in Initial Estimate, so not assessed here
                  </span>
                </div>
                {onNavigateToInitialEstimate && (
                  <button
                    onClick={onNavigateToInitialEstimate}
                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    Manage all in Section 5 →
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {excludedParts.map((ep) => (
                  <div
                    key={ep.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-amber-200/60 dark:border-slate-700 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="font-mono text-[11px] font-bold text-slate-400">E.{ep.eNo}</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {ep.partsDescription}
                      </span>
                      <span className="font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        ({formatINR(ep.estimated)})
                      </span>
                    </div>
                    {onToggleInitialPart && (
                      <button
                        onClick={() => onToggleInitialPart(ep.id)}
                        className="flex-shrink-0 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] shadow-sm transition-all whitespace-nowrap"
                        title="Include this item in Final Estimate"
                      >
                        + Include in Final
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FINAL LABOUR */}
      {activeTab === 'labour' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Assessed Labour & Repairs</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Columns: S. No., SAC Code, Bill S. No, Labour Description, Estimated ₹, Assessed ₹, GST %, Total
              </p>
            </div>
            <button
              onClick={handleAddLabour}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Labour Row</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2.5 w-14 text-center">S. No.</th>
                  <th className="px-3 py-2.5 w-24">SAC Code</th>
                  <th className="px-3 py-2.5 w-20">Bill S.No</th>
                  <th className="px-3 py-2.5 min-w-[220px]">Labour Description</th>
                  <th className="px-3 py-2.5 w-28 text-right">Estimated ₹</th>
                  <th className="px-3 py-2.5 w-28 text-right font-bold text-purple-600 dark:text-purple-400">
                    Assessed ₹
                  </th>
                  <th className="px-3 py-2.5 w-20 text-center">GST %</th>
                  <th className="px-3 py-2.5 w-28 text-right font-bold text-emerald-600 dark:text-emerald-400">Total ₹</th>
                  <th className="px-3 py-2.5 w-20 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {finalLabour.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-slate-400 font-sans">
                      No final labour items recorded. Click 'Add Labour Row'.
                    </td>
                  </tr>
                ) : (
                  finalLabour.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2 text-center">
                        <input
                          type="text"
                          value={l.sNo || ''}
                          onChange={(e) => handleLabourFieldChange(l.id, 'sNo', e.target.value)}
                          className="w-10 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={l.sac || ''}
                          onChange={(e) => handleLabourFieldChange(l.id, 'sac', e.target.value)}
                          className="w-20 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 text-slate-600 dark:text-slate-400 px-1 py-0.5 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={l.billSNo || ''}
                          onChange={(e) => handleLabourFieldChange(l.id, 'billSNo', e.target.value)}
                          className="w-14 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 text-slate-600 dark:text-slate-400 px-1 py-0.5 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 font-sans font-medium">
                        <input
                          type="text"
                          value={l.labourDescription || ''}
                          onChange={(e) => handleLabourFieldChange(l.id, 'labourDescription', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 text-slate-900 dark:text-white px-1 py-0.5 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-slate-500">
                        <input
                          type="number"
                          step="0.01"
                          value={l.estimated ?? ''}
                          onChange={(e) => handleLabourFieldChange(l.id, 'estimated', parseFloat(e.target.value) || 0)}
                          className="w-24 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 px-1 py-0.5 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">
                        <input
                          type="number"
                          step="0.01"
                          value={l.assessed ?? ''}
                          onChange={(e) => handleLabourFieldChange(l.id, 'assessed', parseFloat(e.target.value) || 0)}
                          className="w-24 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 px-1 py-0.5 focus:outline-none font-bold"
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
                      <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatINR(l.total)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1 font-sans">
                          <button
                            onClick={() => handleDuplicateLabour(l)}
                            className="p-1 rounded text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/40"
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
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Excluded Labour Notification & One-Click Include */}
          {excludedLabour.length > 0 && (
            <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    {excludedLabour.length} Labour Item(s) Excluded from Initial Estimate (Section 5)
                  </span>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400">
                    — Checkbox unticked in Initial Estimate, so not assessed here
                  </span>
                </div>
                {onNavigateToInitialEstimate && (
                  <button
                    onClick={onNavigateToInitialEstimate}
                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    Manage all in Section 5 →
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {excludedLabour.map((el) => (
                  <div
                    key={el.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-amber-200/60 dark:border-slate-700 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="font-mono text-[11px] font-bold text-slate-400">S.{el.sNo}</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {el.labourDescription}
                      </span>
                      <span className="font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        ({formatINR(el.estimated)})
                      </span>
                    </div>
                    {onToggleInitialLabour && (
                      <button
                        onClick={() => onToggleInitialLabour(el.id)}
                        className="flex-shrink-0 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] shadow-sm transition-all whitespace-nowrap"
                        title="Include this labour row in Final Estimate"
                      >
                        + Include in Final
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ESTIMATE SUMMARY */}
      {activeTab === 'summary' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Estimate Assessment Summary</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Computed mathematically from verified source parts and labour rows with full transparency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Calculation Breakdown Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Itemized Survey Assessment Breakdown
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2 font-mono">
                <div className="flex items-center justify-between p-2">
                  <span className="font-sans text-slate-600 dark:text-slate-300">Total Parts Assessed (Gross)</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatINR(summary.totalPartsAssessed)}</span>
                </div>
                <div className="flex items-center justify-between p-2 text-rose-600">
                  <span className="font-sans">Less: Depreciation on Parts</span>
                  <span className="font-bold">-{formatINR(summary.depreciation)}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50/50 dark:bg-slate-800/40 font-semibold">
                  <span className="font-sans">Net Assessed Parts</span>
                  <span>{formatINR(summary.totalPartsAssessed - summary.depreciation)}</span>
                </div>
                <div className="flex items-center justify-between p-2">
                  <span className="font-sans text-slate-600 dark:text-slate-300">Total Labour & Repairs Assessed</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatINR(summary.totalLabourAssessed)}</span>
                </div>
                <div className="flex items-center justify-between p-2 text-purple-600">
                  <span className="font-sans">Add: Total Applicable GST (0, 5, 12, 18, 28%)</span>
                  <span className="font-bold">+{formatINR(summary.totalGstAssessed)}</span>
                </div>
                <div className="flex items-center justify-between p-2 text-rose-600">
                  <span className="font-sans">Less: Policy Excess / Contractual Deductible</span>
                  <div className="flex items-center gap-1 font-bold">
                    <span>-₹</span>
                    <input
                      type="number"
                      value={policyExcess}
                      onChange={(e) => onUpdateExcessAndSalvage(parseFloat(e.target.value) || 0, salvage)}
                      className="w-20 text-right bg-slate-100 dark:bg-slate-800 border rounded px-1.5 py-0.5 text-xs text-rose-600 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 text-rose-600">
                  <span className="font-sans">Less: Salvage / Scrap Recovery</span>
                  <div className="flex items-center gap-1 font-bold">
                    <span>-₹</span>
                    <input
                      type="number"
                      value={salvage}
                      onChange={(e) => onUpdateExcessAndSalvage(policyExcess, parseFloat(e.target.value) || 0)}
                      className="w-20 text-right bg-slate-100 dark:bg-slate-800 border rounded px-1.5 py-0.5 text-xs text-rose-600 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-sm font-extrabold border-t-2 border-emerald-500/40">
                  <span className="font-sans">Grand Total Net Assessed Amount</span>
                  <span>{formatINR(summary.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Calculation Source Transparency Panel */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900 text-xs space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-500" />
                <span>Calculation Source & Formula Audit</span>
              </h4>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                In accordance with IRDAI motor survey guidelines, no numbers are guessed or invented. Every value is
                derived from exact parsed rows:
              </p>

              <div className="space-y-2 font-mono text-[11px]">
                {Object.entries(summary.sources || {}).map(([key, val]) => (
                  <div key={key} className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block uppercase text-[10px]">
                      {key}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GST TABLE */}
      {activeTab === 'gst' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">GST Summary (Tax Analysis)</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Columns: Sr. No., Tax Percentage, Actual Allowed, CGST, SGST, IGST, Total (0%, 5%, 12%, 18%, 28%)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-2.5 w-16 text-center">Sr. No.</th>
                  <th className="px-4 py-2.5 w-32">Tax Percentage</th>
                  <th className="px-4 py-2.5 text-right">Actual Allowed ₹</th>
                  <th className="px-4 py-2.5 text-right">CGST ₹</th>
                  <th className="px-4 py-2.5 text-right">SGST ₹</th>
                  <th className="px-4 py-2.5 text-right">IGST ₹</th>
                  <th className="px-4 py-2.5 text-right font-bold text-purple-600 dark:text-purple-400">Total GST ₹</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {gstSummary.map((gst) => (
                  <tr key={gst.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2 text-center text-slate-400">{gst.srNo}</td>
                    <td className="px-4 py-2 font-bold text-slate-800 dark:text-slate-200">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">
                        {gst.taxPercentage}% GST
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">{formatINR(gst.actualAllowed)}</td>
                    <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-400">
                      {formatINR(gst.cgst)}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-400">
                      {formatINR(gst.sgst)}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-400">{formatINR(gst.igst)}</td>
                    <td className="px-4 py-2 text-right font-bold text-slate-900 dark:text-white">
                      {formatINR(gst.total)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                  <td colSpan={2} className="px-4 py-2.5 text-right uppercase">
                    Total Tax Assessment:
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {formatINR(gstSummary.reduce((a, b) => a + b.actualAllowed, 0))}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {formatINR(gstSummary.reduce((a, b) => a + b.cgst, 0))}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {formatINR(gstSummary.reduce((a, b) => a + b.sgst, 0))}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">₹0.00</td>
                  <td className="px-4 py-2.5 text-right font-mono text-purple-600 dark:text-purple-400">
                    {formatINR(gstSummary.reduce((a, b) => a + b.total, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: INVOICES TABLE */}
      {activeTab === 'invoices' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Garage & Parts Invoices</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Multiple invoices supported (Invoice 1, Invoice 2, Invoice 3...). Never overwrite previous invoices.
              </p>
            </div>
            <button
              onClick={handleAddInvoice}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Invoice</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2.5 w-12 text-center">#</th>
                  <th className="px-3 py-2.5 w-40">Invoice Number</th>
                  <th className="px-3 py-2.5 w-32">Invoice Date</th>
                  <th className="px-3 py-2.5 w-36 text-right">Invoice Amount ₹</th>
                  <th className="px-3 py-2.5 min-w-[180px]">Vendor Name</th>
                  <th className="px-3 py-2.5 w-36">GSTIN / Number</th>
                  <th className="px-3 py-2.5">Description</th>
                  <th className="px-3 py-2.5 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-slate-400">
                      No invoices recorded yet. Click 'Add Invoice' or paste invoice text in Section 7.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv, idx) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={inv.invoiceNumber}
                          onChange={(e) => handleInvoiceChange(inv.id, 'invoiceNumber', e.target.value)}
                          placeholder="e.g. RJ202G202610514"
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 font-mono font-bold px-1 py-0.5 text-slate-900 dark:text-white focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={inv.invoiceDate}
                          onChange={(e) => handleInvoiceChange(inv.id, 'invoiceDate', e.target.value)}
                          placeholder="YYYY-MM-DD"
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 font-mono px-1 py-0.5 text-slate-600 dark:text-slate-300 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={inv.invoiceAmount ?? ''}
                          onChange={(e) =>
                            handleInvoiceChange(inv.id, 'invoiceAmount', parseFloat(e.target.value) || 0)
                          }
                          className="w-28 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 font-mono font-bold px-1 py-0.5 text-slate-900 dark:text-white focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={inv.vendor}
                          onChange={(e) => handleInvoiceChange(inv.id, 'vendor', e.target.value)}
                          placeholder="Bodyshop / Supplier"
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 px-1 py-0.5 text-slate-800 dark:text-slate-200 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={inv.gstNumber}
                          onChange={(e) => handleInvoiceChange(inv.id, 'gstNumber', e.target.value)}
                          placeholder="08AABCS..."
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 font-mono px-1 py-0.5 text-slate-600 dark:text-slate-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={inv.description}
                          onChange={(e) => handleInvoiceChange(inv.id, 'description', e.target.value)}
                          placeholder="Remarks..."
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 px-1 py-0.5 text-slate-600 dark:text-slate-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleDeleteInvoice(inv.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Delete invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: INITIAL VS FINAL COMPARISON */}
      {activeTab === 'comparison' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-500" />
              <span>Initial Estimated vs Final Assessed Comparison</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clear side-by-side reconciliation between garage preliminary estimates and surveyor final assessed loss.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <span className="text-slate-400 text-xs block">Initial Garage Claim</span>
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
                {formatINR(initPartsEst + initLabourEst)}
              </span>
              <div className="mt-2 text-[11px] text-slate-500 space-y-0.5 font-mono">
                <div>Parts: {formatINR(initPartsEst)}</div>
                <div>Labour: {formatINR(initLabourEst)}</div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30">
              <span className="text-purple-600 dark:text-purple-400 text-xs block font-semibold">
                Surveyor Final Assessment
              </span>
              <span className="text-2xl font-bold font-mono text-purple-700 dark:text-purple-300 mt-1 block">
                {formatINR(finalPartsAss + finalLabourAss)}
              </span>
              <div className="mt-2 text-[11px] text-purple-600/80 dark:text-purple-400/80 space-y-0.5 font-mono">
                <div>Parts: {formatINR(finalPartsAss)}</div>
                <div>Labour: {formatINR(finalLabourAss)}</div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <span className="text-slate-400 text-xs block">Difference (Disallowance / Variance)</span>
              <span
                className={`text-2xl font-bold font-mono mt-1 block ${
                  diffParts + diffLabour < 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {formatINR(diffParts + diffLabour)}
              </span>
              <div className="mt-2 text-[11px] text-slate-500 space-y-0.5 font-mono">
                <div>Parts Variance: {formatINR(diffParts)}</div>
                <div>Labour Variance: {formatINR(diffLabour)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

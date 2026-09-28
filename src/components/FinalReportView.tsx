import React, { useState } from 'react';
import {
  Printer,
  Download,
  FileCheck2,
  CheckCircle,
  Building,
  Car,
  Shield,
  FileSpreadsheet,
  AlertTriangle,
  Camera,
  Edit3,
  Check,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Save,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Layers,
  HelpCircle,
  Receipt
} from 'lucide-react';
import {
  SurveyRecord,
  SurveyorSettings,
  PolicyData,
  VehicleData,
  DriverData,
  AccidentParticulars,
  ReportObservations
} from '../types/survey';
import { formatINR, numberToWordsINR } from '../utils/calculations';

interface FinalReportViewProps {
  record: SurveyRecord;
  settings: SurveyorSettings;
  onUpdateRecord?: (updated: SurveyRecord) => void;
  onNavigateTab?: (tab: string) => void;
}

export const FinalReportView: React.FC<FinalReportViewProps> = ({
  record,
  settings,
  onUpdateRecord,
  onNavigateTab,
}) => {
  // Quick-edit mode switch: allows surveyor to edit every section directly in place
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState<boolean>(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(record, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${(record.surveyNumber || 'survey').replace(/\//g, '_')}_final_report.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const policy = record.policy || {};
  const vehicle = record.vehicle || {};
  const driver = record.driver || {};
  const accident = record.accident || {};
  const observations = record.observations || {};
  const initialEstimate = record.initialEstimate || { parts: [], labour: [] };
  const finalEstimate = record.finalEstimate || { parts: [], labour: [] };
  const invoices = record.invoices || [];
  const gstSummary = record.gstSummary || [];
  const summary = record.summary;
  const photos = record.photos || [];

  // Helper for inline updating fields
  const handleFieldChange = (section: keyof SurveyRecord, field: string, value: any) => {
    if (!onUpdateRecord) return;
    const currentSectionData = (record[section] as any) || {};
    const updatedRecord: SurveyRecord = {
      ...record,
      [section]: {
        ...currentSectionData,
        [field]: value,
      },
    };
    onUpdateRecord(updatedRecord);
    setHasUnsavedEdits(true);
  };

  // Format monetary numbers helper
  const fmt = (n: any, fallback = '0.00') => {
    if (n === null || n === undefined || n === '' || isNaN(Number(n))) return fallback;
    return Number(n).toFixed(2);
  };

  // Compute live sub-totals for Parts Assessed table
  const totalEstimatedParts = initialEstimate.parts?.reduce((sum, p) => sum + (Number(p.estimated) || 0), 0) || 0;
  const totalAssessedParts = finalEstimate.parts?.reduce((sum, p) => sum + (Number(p.assessed) || 0), 0) || 0;
  const totalGlassParts = finalEstimate.parts?.reduce((sum, p) => sum + (Number(p.glassSecondHandRepair) || 0), 0) || 0;
  const totalMetalParts = finalEstimate.parts?.reduce((sum, p) => sum + (Number(p.metal35) || 0), 0) || 0;
  const totalNonMetalParts = finalEstimate.parts?.reduce((sum, p) => sum + (Number(p.nonMetal) || 0), 0) || 0;

  // Parts GST (calculated or from table)
  const partsGstTotal = finalEstimate.parts?.reduce((sum, p) => {
    const assessed = (Number(p.assessed) || 0) - (Number(p.depreciationAmount) || 0);
    return sum + (assessed * (Number(p.gstRate) || 18)) / 100;
  }, 0) || 0;

  // Labour Totals
  const totalLabourEstimated = finalEstimate.labour?.reduce((sum, l) => sum + (Number(l.estimated) || 0), 0) || 0;
  const totalLabourAssessed = finalEstimate.labour?.reduce((sum, l) => sum + (Number(l.assessed) || 0), 0) || 0;
  const labourGstTotal = finalEstimate.labour?.reduce((sum, l) => {
    return sum + ((Number(l.assessed) || 0) * (Number(l.gstRate) || 18)) / 100;
  }, 0) || 0;

  // Deductions: Depreciation, Excess, Salvage
  const totalDepreciation = summary?.depreciation || 0;
  const excess = Number(policy.policyExcess) || summary?.excess || 1000;
  const salvage = summary?.salvage || 0;

  // Net Grand Total: Gross Assessed (Parts + GST + Labour + GST) - Deductions (Depreciation + Excess + Salvage)
  const totalPartsGross = totalNonMetalParts + totalGlassParts + totalMetalParts + partsGstTotal;
  const totalLabourGross = totalLabourAssessed + labourGstTotal;
  const totalGrossAssessed = totalPartsGross + totalLabourGross;
  const totalDeductions = totalDepreciation + excess + salvage;

  const grandTotal = summary?.grandTotal || Math.max(0, Math.round(totalGrossAssessed - totalDeductions));
  const amountInWords = numberToWordsINR(grandTotal);

  return (
    <div className="space-y-6">
      {/* Top Action Bar (hidden when printing) */}
      <div className="print:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold font-mono">
                Section 10 • Final Report
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Motor Final Survey Report (Standard IRDAI Certificate)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Live synchronized with all survey inputs, initial estimate, final assessment, and photo attachments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Edit Mode Toggle */}
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isEditMode
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
              title="Toggle Live In-Place Editing for all report sections"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'Exit Quick-Edit Mode' : '✏️ Quick-Edit Report Directly'}</span>
            </button>

            {/* Export JSON */}
            <button
              onClick={handleDownloadJSON}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            {/* Print Official PDF */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official Final Report (PDF)</span>
            </button>
          </div>
        </div>

        {/* Quick Edit Banner Reminder */}
        {isEditMode && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>
                <strong>Quick-Edit Active:</strong> You can click and modify any field, date, amount or remark directly inside this official report layout. All edits auto-save.
              </span>
            </div>
            <button
              onClick={() => setIsEditMode(false)}
              className="px-2.5 py-1 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-bold text-[11px] hover:bg-amber-300"
            >
              Done Editing
            </button>
          </div>
        )}

        {/* FINANCIAL SUMMARY CARDS: Highlights Loss in Red and Profit/Net Claim in Green */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {/* Gross Assessed (Parts + Labour) */}
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>Gross Assessed</span>
              <Receipt className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-1">
              ₹ {fmt(totalGrossAssessed)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Parts ₹{fmt(totalPartsGross)} + Lab ₹{fmt(totalLabourGross)}
            </div>
          </div>

          {/* Total Loss / Deductions (Red) */}
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3">
            <div className="flex items-center justify-between text-[11px] text-rose-700 dark:text-rose-400 font-medium">
              <span>Less: Total Loss / Deductions</span>
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-base font-black text-rose-600 dark:text-rose-400 font-mono mt-1">
              - ₹ {fmt(totalDeductions)}
            </div>
            <div className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
              Dep ₹{fmt(totalDepreciation)} + Exc ₹{fmt(excess)} + Salv ₹{fmt(salvage)}
            </div>
          </div>

          {/* Applicable GST */}
          <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-3">
            <div className="flex items-center justify-between text-[11px] text-indigo-700 dark:text-indigo-400 font-medium">
              <span>Add: Total GST (18%)</span>
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1">
              + ₹ {fmt(partsGstTotal + labourGstTotal)}
            </div>
            <div className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5">
              CGST ₹{fmt((partsGstTotal + labourGstTotal) / 2)} + SGST ₹{fmt((partsGstTotal + labourGstTotal) / 2)}
            </div>
          </div>

          {/* Net Claim / Payable to Insured (Vibrant Green) */}
          <div className="bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-400 dark:border-emerald-600 rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
              <span>Net Claim / Grand Total</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">
              ₹ {fmt(grandTotal)}
            </div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider mt-0.5">
              ✓ Payable to Insured
            </div>
          </div>
        </div>
      </div>

      {/* PRINTABLE OFFICIAL REPORT CONTAINER */}
      <div
        id="official-final-report"
        className="bg-white text-black p-6 sm:p-10 rounded-2xl border border-slate-300 shadow-xl max-w-4xl mx-auto space-y-4 print:shadow-none print:border-none print:p-0 print:m-0 font-sans text-xs leading-normal"
        style={{ fontFamily: '"Calibri", "Arial", sans-serif' }}
      >
        {/* SURVEYOR LETTERHEAD */}
        <div className="text-center pb-3 border-b-2 border-black space-y-1 report-section">
          <h1 className="text-xl font-bold tracking-tight text-black uppercase">
            {settings.surveyorName || 'VINOD KUMAR KATARIA'}
          </h1>
          <p className="text-[11px] font-semibold text-slate-800">
            Surveyor & Loss Assessor
          </p>
          <p className="text-[10px] text-slate-700">
            {settings.surveyorAddress || 'P.no. - 19, Veer Tejaji Nagar, Opp.-PashuAahar, Sangaria, Jodhpur'}
          </p>
          <div className="text-[10px] text-slate-700 flex flex-wrap justify-center gap-x-3">
            <span>Email ID: {settings.surveyorEmail || 'vinodkumarkatariasla2009@gmail.com'}</span>
            <span>Mobile no.: {settings.surveyorPhone || '8875432727'}</span>
          </div>

          <div className="pt-2 flex justify-between text-[10px] border-t border-slate-300 mt-2 font-mono">
            <div className="text-left">
              <div>Licence No.: {settings.licenseNumber || 'SLA74182'}</div>
              <div>Validity: 22/10/2028</div>
            </div>
            <div className="text-right">
              <div>IISLAMembership : A/W/06406</div>
              <div>SLACategory- Motor, Fire, Marine, Misc., Engg.</div>
            </div>
          </div>
        </div>

        {/* REF NO. & REPORT HEADER */}
        <div className="flex justify-between items-center text-[11px] font-bold border-b border-black pb-1.5 report-section">
          <div className="flex items-center gap-1">
            <span>Ref No. :</span>
            {isEditMode ? (
              <input
                type="text"
                value={policy.surveyNumber || ''}
                onChange={(e) => handleFieldChange('policy', 'surveyNumber', e.target.value)}
                placeholder="Survey Reference No."
                className="font-mono text-[11px] font-bold border-b border-dashed border-amber-500 px-1 py-0.5 focus:outline-none bg-amber-50"
              />
            ) : (
              <span>{policy.surveyNumber || 'VN/UINC/5CA4929/08-26/F/00921'}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span>Date :</span>
            {isEditMode ? (
              <input
                type="text"
                value={accident.dateTimeOfSurvey?.split(' ')[0] || ''}
                onChange={(e) => handleFieldChange('accident', 'dateTimeOfSurvey', e.target.value)}
                placeholder="DD-MM-YYYY"
                className="font-mono text-[11px] font-bold border-b border-dashed border-amber-500 px-1 py-0.5 focus:outline-none bg-amber-50"
              />
            ) : (
              <span>{accident.dateTimeOfSurvey?.split(' ')[0] || new Date().toLocaleDateString('en-GB')}</span>
            )}
          </div>
        </div>

        <div className="text-center space-y-0.5 report-section">
          <h2 className="text-sm font-bold uppercase underline">
            MOTOR FINAL SURVEY REPORT - (NIL DEPRECIATION)
          </h2>
          <p className="text-[10px] italic text-slate-700">
            This report is issued by me/us as a licensed Surveyor(s) without prejudice in respect of cause, nature and extent of loss/damages and subject to the terms and conditions of the insurance policy.
          </p>
        </div>

        {/* 1. INSURANCE PARTICULARS */}
        <div className="space-y-1 report-section">
          <div className="flex items-center justify-between bg-slate-100 p-1 border-l-2 border-black">
            <h3 className="font-bold text-[11px] uppercase">
              INSURANCE PARTICULARS :
            </h3>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('policy')}
                className="print:hidden text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 font-semibold cursor-pointer"
              >
                <span>Edit in Tab</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <table className="w-full text-[11px] border-collapse">
            <tbody>
              <tr>
                <td className="w-48 py-0.5">(a) Policy / Cover Note No.</td>
                <td className="w-4">:</td>
                <td className="font-bold">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={policy.policyNumber || ''}
                      onChange={(e) => handleFieldChange('policy', 'policyNumber', e.target.value)}
                      className="w-full font-mono text-[11px] font-bold border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    policy.policyNumber || '2901033125P112095726'
                  )}
                </td>
                <td className="w-24 text-right">IDV :</td>
                <td className="w-28 font-bold text-right font-mono">
                  {isEditMode ? (
                    <input
                      type="number"
                      value={policy.idv || ''}
                      onChange={(e) => handleFieldChange('policy', 'idv', Number(e.target.value))}
                      className="w-24 font-mono text-[11px] text-right font-bold border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    fmt(policy.idv, '800000.00')
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-0.5">(b) Period of Insurance</td>
                <td>:</td>
                <td>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={policy.policyPeriodText || `${policy.policyStartDate || '29-10-2025'} to ${policy.policyEndDate || '28-10-2026'}`}
                      onChange={(e) => handleFieldChange('policy', 'policyPeriodText', e.target.value)}
                      className="w-full text-[11px] border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    policy.policyPeriodText || `${policy.policyStartDate || '29-10-2025'} to ${policy.policyEndDate || '28-10-2026'}`
                  )}
                </td>
                <td className="text-right">Claim No. :</td>
                <td className="font-bold text-right font-mono">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={policy.claimNumber || ''}
                      onChange={(e) => handleFieldChange('policy', 'claimNumber', e.target.value)}
                      className="w-24 font-mono text-[11px] text-right font-bold border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    policy.claimNumber || '2901033126C050071001'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-0.5">(c) Endorsement</td>
                <td>:</td>
                <td colSpan={3}>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={policy.endorsement || ''}
                      onChange={(e) => handleFieldChange('policy', 'endorsement', e.target.value)}
                      className="w-64 text-[11px] border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    policy.endorsement || '---'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">(d) Insurers</td>
                <td className="align-top">:</td>
                <td colSpan={3}>
                  {isEditMode ? (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={policy.insuranceCompany || ''}
                        onChange={(e) => handleFieldChange('policy', 'insuranceCompany', e.target.value)}
                        placeholder="Insurance Company Name"
                        className="w-full font-bold text-[11px] border-b border-dashed border-amber-500 bg-amber-50 px-1"
                      />
                      <input
                        type="text"
                        value={policy.insuranceOfficeAddress || ''}
                        onChange={(e) => handleFieldChange('policy', 'insuranceOfficeAddress', e.target.value)}
                        placeholder="Office Address"
                        className="w-full text-[10px] border-b border-dashed border-amber-500 bg-amber-50 px-1"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="font-bold">{policy.insuranceCompany || 'United India Insurance Co. Ltd.'}</div>
                      <div className="text-[10px] text-slate-600">{policy.insuranceOfficeAddress || 'JODHPUR 74/A FIRST FLOOR BHATI N PLAZZA MAIN PAL ROAD JODHPUR'}</div>
                    </>
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-0.5 align-top">(e) Insured</td>
                <td className="align-top">:</td>
                <td colSpan={3}>
                  {isEditMode ? (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={policy.insuredName || ''}
                        onChange={(e) => handleFieldChange('policy', 'insuredName', e.target.value)}
                        placeholder="Insured Full Name & Phone"
                        className="w-full font-bold text-[11px] border-b border-dashed border-amber-500 bg-amber-50 px-1"
                      />
                      <input
                        type="text"
                        value={policy.insuredAddress || ''}
                        onChange={(e) => handleFieldChange('policy', 'insuredAddress', e.target.value)}
                        placeholder="Insured Address"
                        className="w-full text-[10px] border-b border-dashed border-amber-500 bg-amber-50 px-1"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="font-bold">{policy.insuredName || 'UMMED SINGH (7339910687)'}</div>
                      <div className="text-[10px] text-slate-600">{policy.insuredAddress || 'SO/ GULAB SINGH DELASAR COJA PARA JAISALMER'}</div>
                    </>
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-0.5">(f) H. P. A.</td>
                <td>:</td>
                <td>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={policy.hpa || ''}
                      onChange={(e) => handleFieldChange('policy', 'hpa', e.target.value)}
                      className="w-48 text-[11px] border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    policy.hpa || '---'
                  )}
                </td>
                <td className="text-right">Appointed By :</td>
                <td className="font-bold text-right">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={policy.appointedBy || ''}
                      onChange={(e) => handleFieldChange('policy', 'appointedBy', e.target.value)}
                      className="w-24 text-[11px] text-right font-bold border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    policy.appointedBy || 'JODHPUR'
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. VEHICLE PARTICULARS */}
        <div className="space-y-1 report-section">
          <div className="flex items-center justify-between bg-slate-100 p-1 border-l-2 border-black">
            <h3 className="font-bold text-[11px] uppercase">
              VEHICLE PARTICULARS :
            </h3>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('policy')}
                className="print:hidden text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 font-semibold cursor-pointer"
              >
                <span>Edit in Tab</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <table className="w-full text-[11px] border-collapse">
            <tbody>
              <tr>
                <td className="w-48 py-0.5">(a) Registered Number</td>
                <td className="w-4">:</td>
                <td className="font-bold text-black font-mono">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={vehicle.registrationNumber || ''}
                      onChange={(e) => handleFieldChange('vehicle', 'registrationNumber', e.target.value)}
                      className="font-mono font-bold text-xs uppercase border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    vehicle.registrationNumber || 'RJ15CA4929'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-0.5">(b) Registered Owner</td>
                <td>:</td>
                <td>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={vehicle.registeredOwner || policy.insuredName || ''}
                      onChange={(e) => handleFieldChange('vehicle', 'registeredOwner', e.target.value)}
                      className="w-64 font-bold border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    vehicle.registeredOwner || policy.insuredName || 'UMMED SINGH'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-0.5 pl-4">Owner Serial No. / Transfer Date</td>
                <td>:</td>
                <td>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={vehicle.ownerSerialNo || ''}
                      onChange={(e) => handleFieldChange('vehicle', 'ownerSerialNo', e.target.value)}
                      className="w-24 border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    vehicle.ownerSerialNo || '01'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-0.5">(c) Date of Registration</td>
                <td>:</td>
                <td>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={vehicle.dateOfRegistration || ''}
                      onChange={(e) => handleFieldChange('vehicle', 'dateOfRegistration', e.target.value)}
                      className="w-32 border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    vehicle.dateOfRegistration || '01-04-2022'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-0.5">(d) Chassis Number</td>
                <td>:</td>
                <td className="font-bold font-mono">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={vehicle.chassisNumber || ''}
                      onChange={(e) => handleFieldChange('vehicle', 'chassisNumber', e.target.value)}
                      className="w-56 font-mono font-bold border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    vehicle.chassisNumber || 'MZBEU813LNN332776'
                  )}
                  <span className="font-normal text-[10px] italic text-slate-700 ml-4">( Physically Checked )</span>
                </td>
              </tr>
              <tr>
                <td className="py-0.5">(e) Engine Number</td>
                <td>:</td>
                <td className="font-bold font-mono">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={vehicle.engineNumber || ''}
                      onChange={(e) => handleFieldChange('vehicle', 'engineNumber', e.target.value)}
                      className="w-56 font-mono font-bold border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    vehicle.engineNumber || 'D4FAMM468112'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-0.5">(f) Make / Variant / Model / Color</td>
                <td>:</td>
                <td className="font-bold">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={vehicle.makeVariantColor || `${vehicle.make || 'KIA'} ${vehicle.model || 'SELTOS'} - ${vehicle.variant || 'WHITE'}`}
                      onChange={(e) => handleFieldChange('vehicle', 'makeVariantColor', e.target.value)}
                      className="w-72 font-bold border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    vehicle.makeVariantColor || `${vehicle.make || 'KIA'} ${vehicle.model || 'SELTOS'} - ${vehicle.variant || 'WHITE'}`
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-0.5">(g) Type of Body and Class of vehicle</td>
                <td>:</td>
                <td>{vehicle.typeOfBody || 'STATION WAGON - MOTOR CAR'}</td>
              </tr>
              <tr>
                <td className="py-0.5">(h) Pre Accident Condition</td>
                <td>:</td>
                <td>{vehicle.preAccidentCondition || 'GOOD'}</td>
              </tr>
              <tr>
                <td className="py-0.5">(k) Seating Capacity</td>
                <td>:</td>
                <td>{vehicle.seatingCapacity || '05 Nos.'}</td>
              </tr>
              <tr>
                <td className="py-0.5">(l) Cubic Capacity</td>
                <td>:</td>
                <td>
                  <span>{vehicle.cubicCapacity || '1493 CC'}</span>
                  <span className="ml-8 font-bold">Fuel Used : {vehicle.fuelUsed || 'DIESEL'}</span>
                </td>
              </tr>
              <tr>
                <td className="py-0.5">(m) Tax particulars</td>
                <td>:</td>
                <td>{vehicle.taxParticulars || 'LIFE TIME'}</td>
              </tr>
              <tr>
                <td className="py-0.5">(n) Odometer Reading</td>
                <td>:</td>
                <td>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={vehicle.odometerReading || ''}
                      onChange={(e) => handleFieldChange('vehicle', 'odometerReading', e.target.value)}
                      className="w-28 font-mono border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    <span className="font-mono">{vehicle.odometerReading || '83317 Kms.'}</span>
                  )}
                  <span className="ml-8">PUC No : {vehicle.pucNo || '---'}</span>
                  <span className="ml-4">Valid upto : {vehicle.pucValidUpto || '---'}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3. DRIVER PARTICULARS */}
        <div className="space-y-1 report-section">
          <div className="flex items-center justify-between bg-slate-100 p-1 border-l-2 border-black">
            <h3 className="font-bold text-[11px] uppercase">
              DRIVER PARTICULARS :
            </h3>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('policy')}
                className="print:hidden text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 font-semibold cursor-pointer"
              >
                <span>Edit in Tab</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <table className="w-full text-[11px] border-collapse">
            <tbody>
              <tr>
                <td className="w-48 py-0.5">(a) Name of Driver</td>
                <td className="w-4">:</td>
                <td className="font-bold">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={driver.name || ''}
                      onChange={(e) => handleFieldChange('driver', 'name', e.target.value)}
                      className="w-56 font-bold border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    driver.name || 'CHANDRVEER SINGH'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-0.5 pl-4">Age</td>
                <td>:</td>
                <td>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={driver.age || ''}
                      onChange={(e) => handleFieldChange('driver', 'age', e.target.value)}
                      className="w-48 border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    driver.age || '27 Years ( 01-11-1998 )'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-0.5">(b) Motor Driver License Number</td>
                <td>:</td>
                <td className="font-bold font-mono">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={driver.drivingLicenseNumber || ''}
                      onChange={(e) => handleFieldChange('driver', 'drivingLicenseNumber', e.target.value)}
                      className="w-48 font-mono font-bold border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    driver.drivingLicenseNumber || 'RJ1520190003224'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-0.5 pl-4">Date of Issue</td>
                <td>:</td>
                <td>
                  <span>{driver.dateOfIssue || '18-10-2019'}</span>
                  <span className="ml-12">Valid upto (NTV) : {driver.validUptoNTV || '31-10-2038'}</span>
                </td>
              </tr>
              <tr>
                <td className="py-0.5 pl-4">Valid from</td>
                <td>:</td>
                <td>
                  <span>{driver.validFrom || '---'}</span>
                  <span className="ml-16">Valid upto (TV) : {driver.validUptoTV || '---'}</span>
                </td>
              </tr>
              <tr>
                <td className="py-0.5">(c) Issuing Authority</td>
                <td>:</td>
                <td className="font-bold">{driver.issuingAuthority || 'JAISALMER'}</td>
              </tr>
              <tr>
                <td className="py-0.5">(d) Type of License</td>
                <td>:</td>
                <td>{driver.typeOfLicense || 'M/c wgr + LMV-NT Only.'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. ACCIDENT & SURVEY PARTICULARS */}
        <div className="space-y-1 report-section">
          <h3 className="font-bold text-[11px] uppercase bg-slate-100 p-1 border-l-2 border-black">
            ACCIDENT & SURVEY PARTICULARS :
          </h3>
          <table className="w-full text-[11px] border-collapse">
            <tbody>
              <tr>
                <td className="w-48 py-0.5">(a) Date & Time of Accident</td>
                <td className="w-4">:</td>
                <td className="font-bold">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={accident.dateTimeOfAccident || ''}
                      onChange={(e) => handleFieldChange('accident', 'dateTimeOfAccident', e.target.value)}
                      className="w-56 font-bold border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    accident.dateTimeOfAccident || '26-07-2026 09:27 PM'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-0.5">(b) Place of Accident</td>
                <td>:</td>
                <td className="font-bold">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={accident.placeOfAccident || ''}
                      onChange={(e) => handleFieldChange('accident', 'placeOfAccident', e.target.value)}
                      className="w-56 font-bold border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    accident.placeOfAccident || 'CHANDHAN JAISALMER'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-0.5">(c) Place of Survey</td>
                <td>:</td>
                <td className="font-bold">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={accident.placeOfSurvey || ''}
                      onChange={(e) => handleFieldChange('accident', 'placeOfSurvey', e.target.value)}
                      className="w-56 font-bold border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    accident.placeOfSurvey || 'KUMBHAT MOTORS LLP'
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-0.5">(d) Date of Allotment of Survey</td>
                <td>:</td>
                <td>{accident.dateOfAllotment || '06-08-2026'}</td>
              </tr>
              <tr>
                <td className="py-0.5">(e) Date & Time of Survey</td>
                <td>:</td>
                <td>{accident.dateTimeOfSurvey || '06-08-2026'}</td>
              </tr>
              <tr>
                <td className="py-0.5">(f) Date of Receipt of Spot Survey Report</td>
                <td>:</td>
                <td>{accident.dateOfReceiptSpotReport || '---'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 5. CAUSE & NATURE OF ACCIDENT */}
        <div className="space-y-2 report-section">
          <h3 className="font-bold text-[11px] uppercase bg-slate-100 p-1 border-l-2 border-black">
            CAUSE & NATURE OF ACCIDENT :
          </h3>
          {isEditMode ? (
            <textarea
              rows={3}
              value={observations.causeOfAccident || ''}
              onChange={(e) => handleFieldChange('observations', 'causeOfAccident', e.target.value)}
              placeholder="Detailed cause of accident..."
              className="w-full text-[11px] p-2 border border-amber-500 bg-amber-50/50 rounded focus:outline-none"
            />
          ) : (
            <p className="text-[11px] leading-relaxed text-justify">
              {observations.causeOfAccident ||
                'As stated by the insured, the vehicle was travelling from the village towards Chandhan at night. Suddenly, a nilgai came in front of the vehicle and collided with its side. Due to the impact, the insured vehicle lost control and went off the road. As a result, the front bumper was damaged, and the other side door was also damaged.'}
            </p>
          )}

          <table className="w-full text-[11px] border-collapse border border-black mt-2">
            <tbody>
              <tr className="border-b border-black">
                <td className="w-56 p-1 font-semibold border-r border-black">POLICE ACTION</td>
                <td className="p-1">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={observations.policeAction || ''}
                      onChange={(e) => handleFieldChange('observations', 'policeAction', e.target.value)}
                      className="w-full text-[11px] border-b border-dashed border-amber-500 bg-amber-50 px-1"
                    />
                  ) : (
                    observations.policeAction || 'Not reported as per claimform.'
                  )}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1 font-semibold border-r border-black">DETAILS OF LOAD / PASSENGER</td>
                <td className="p-1">{observations.detailsOfLoadPassenger || 'Not reported.'}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1 font-semibold border-r border-black">THIRD PARTY LOSS/ INJURIES</td>
                <td className="p-1">{observations.thirdPartyLossInjuries || 'Nil as per claimform.'}</td>
              </tr>
              <tr>
                <td className="p-1 font-semibold border-r border-black align-top">PARTICULARS OF LOSS/DAMAGES</td>
                <td className="p-1 text-justify leading-relaxed">
                  {isEditMode ? (
                    <textarea
                      rows={3}
                      value={observations.particularsOfLossDamages || ''}
                      onChange={(e) => handleFieldChange('observations', 'particularsOfLossDamages', e.target.value)}
                      className="w-full text-[11px] p-1 border border-amber-500 bg-amber-50/50 rounded"
                    />
                  ) : (
                    observations.particularsOfLossDamages ||
                    `In accordance with the instructions received from ${policy.insuranceCompany || 'United India Insurance Co. Ltd. JODHPUR'} dated ${accident.dateOfAllotment || '06-08-2026'} I visited ${accident.placeOfSurvey || 'KUMBHAT MOTORS LLP'} and inspected the subject vehicle, reported to have met with an accident on ${accident.dateTimeOfAccident?.split(' ')[0] || '26-07-2026'} ${accident.placeOfAccident || 'CHANDHAN JAISALMER'} and snapped the vehicle from different angles before and after dismantling.
Loss was discussed with the repairer and finally settled as under subject to policy terms, conditions and approval of the Insurers keeping in view the cause & nature of accident and my physical inspection before and after dismantling.`
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="p-2 border border-slate-300 rounded bg-slate-50 text-[11px] leading-relaxed">
            <span className="font-bold">Observation : </span>
            {isEditMode ? (
              <textarea
                rows={2}
                value={observations.observationDetailed || ''}
                onChange={(e) => handleFieldChange('observations', 'observationDetailed', e.target.value)}
                className="w-full text-[11px] p-1 border border-amber-500 bg-amber-50/50 rounded mt-1"
              />
            ) : (
              <span>
                {observations.observationDetailed ||
                  'I inspected the vehicle minutely & found that Front bumper damages are relevant with the cause of loss and Fresh in nature and other damages are not relevant with the cause of loss hence not allowed.'}
              </span>
            )}
          </div>

          <div className="p-2 border border-slate-300 rounded bg-slate-50 text-[11px] leading-relaxed">
            <span className="font-bold">Reinspection : </span>
            <span>
              {observations.reinspectionNotes ||
                `The vehicle was re-inspected after repair on dated ${accident.reinspectionDate || '20/08/2026'} & it was found that repair/replacement carried out are as per final assessment.`}
            </span>
          </div>
        </div>

        {/* 6. ESTIMATE & INVOICE DETAILS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-black p-2.5 rounded text-[11px] report-section">
          <div>
            <span className="font-bold block uppercase underline mb-1">
              Estimate details : INITIAL
            </span>
            <div>1. {accident.placeOfSurvey || 'KUMBHAT MOTORS LLP'}</div>
            <div className="font-bold font-mono mt-0.5">
              Rs.-{fmt(summary?.totalEstimatedAmount || totalEstimatedParts, '166916')}/-
            </div>
          </div>

          <div>
            <span className="font-bold block uppercase underline mb-1">Invoice details :</span>
            {invoices.length > 0 ? (
              <div className="space-y-0.5">
                {invoices.map((inv, idx) => (
                  <div key={inv.id} className="flex justify-between font-mono">
                    <span>
                      {idx + 1}. Invoice no: {inv.invoiceNumber}
                    </span>
                    <span>Amt: {fmt(inv.invoiceAmount)}/-</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-0.5 font-mono">
                <div>1. Invoice no :RJ202G202610514 (20/08/2026) - Amount: 17411/-</div>
                <div>2. Invoice no :RJ202G202610515 (20/08/2026) - Amount: 24447/-</div>
              </div>
            )}
          </div>
        </div>

        {/* 7. PARTS ASSESSED TABLE */}
        <div className="space-y-1 report-section">
          <div className="flex items-center justify-between bg-slate-100 p-1 border-l-2 border-black">
            <h3 className="font-bold text-[11px] uppercase">
              PARTS (SCHEDULE OF ASSESSMENT) :
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-600">
                Assessed Items: {finalEstimate.parts?.length || 0}
              </span>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('final-estimate')}
                  className="print:hidden text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 font-semibold cursor-pointer"
                >
                  <span>Edit in Final Estimate</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse border border-black">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-black text-center">
                  <th className="border border-black p-1 w-8" rowSpan={2}>E. No.</th>
                  <th className="border border-black p-1 text-left" rowSpan={2}>Parts Description</th>
                  <th className="border border-black p-1 w-16" rowSpan={2}>HSN Code</th>
                  <th className="border border-black p-1 w-10" rowSpan={2}>Bill S. No</th>
                  <th className="border border-black p-1 w-16" rowSpan={2}>Remark</th>
                  <th className="border border-black p-1 w-16" rowSpan={2}>Estimated ₹</th>
                  <th className="border border-black p-1" colSpan={3}>Assessed ₹</th>
                  <th className="border border-black p-1 w-12" rowSpan={2}>GST %</th>
                </tr>
                <tr className="bg-slate-100 font-bold border-b border-black text-center">
                  <th className="border border-black p-1 w-14">Glass/ 2nd Hand/ Repair</th>
                  <th className="border border-black p-1 w-14">Metal (35)</th>
                  <th className="border border-black p-1 w-14">Non Metal</th>
                </tr>
              </thead>
              <tbody>
                {finalEstimate.parts?.length > 0 ? (
                  finalEstimate.parts.map((part) => {
                    const isAllowed = (Number(part.assessed) || 0) > 0;
                    return (
                      <tr key={part.id} className="hover:bg-slate-50 border-b border-slate-300">
                        <td className="border border-black p-1 text-center font-mono">{part.eNo}</td>
                        <td className="border border-black p-1 font-semibold">{part.partsDescription}</td>
                        <td className="border border-black p-1 text-center font-mono">{part.hsnCode || '---'}</td>
                        <td className="border border-black p-1 text-center font-mono">{part.billSNo || '---'}</td>
                        <td className="border border-black p-1 text-center">
                          <span
                            className={`font-semibold ${
                              part.remark === 'Intact'
                                ? 'text-slate-500'
                                : part.remark === 'Not Allowed'
                                ? 'text-rose-600 font-bold'
                                : 'text-emerald-700'
                            }`}
                          >
                            {part.remark}
                          </span>
                        </td>
                        <td className="border border-black p-1 text-right font-mono">{fmt(part.estimated)}</td>
                        <td className="border border-black p-1 text-right font-mono">
                          {part.glassSecondHandRepair !== null ? fmt(part.glassSecondHandRepair) : '---'}
                        </td>
                        <td className="border border-black p-1 text-right font-mono">
                          {part.metal35 !== null ? fmt(part.metal35) : '---'}
                        </td>
                        <td className="border border-black p-1 text-right font-mono font-bold">
                          {part.nonMetal !== null ? (
                            <span className="text-emerald-700">{fmt(part.nonMetal)}</span>
                          ) : (
                            '---'
                          )}
                        </td>
                        <td className="border border-black p-1 text-center font-mono">
                          {isAllowed ? `${fmt(part.gstRate, '18.00')}%` : '0.00'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="border border-black p-3 text-center text-slate-500 italic">
                      No final estimate parts assessed yet. Select parts in Section 5 & 6.
                    </td>
                  </tr>
                )}

                {/* Sub-Total Row */}
                <tr className="bg-slate-100 font-bold border-t-2 border-black">
                  <td colSpan={5} className="border border-black p-1 text-right uppercase">Sub Total :</td>
                  <td className="border border-black p-1 text-right font-mono">{fmt(totalEstimatedParts)}</td>
                  <td className="border border-black p-1 text-right font-mono">{fmt(totalGlassParts)}</td>
                  <td className="border border-black p-1 text-right font-mono">{fmt(totalMetalParts)}</td>
                  <td className="border border-black p-1 text-right font-mono text-emerald-800">{fmt(totalNonMetalParts)}</td>
                  <td className="border border-black p-1"></td>
                </tr>

                {/* Add : Applicable GST */}
                <tr className="font-semibold">
                  <td colSpan={5} className="border border-black p-1 text-right">Add : Applicable GST :</td>
                  <td className="border border-black p-1 text-right font-mono text-slate-600">
                    {fmt(summary?.totalGstEstimated || 0)}
                  </td>
                  <td className="border border-black p-1 text-right font-mono">0.00</td>
                  <td className="border border-black p-1 text-right font-mono">0.00</td>
                  <td className="border border-black p-1 text-right font-mono text-emerald-800">{fmt(partsGstTotal)}</td>
                  <td className="border border-black p-1"></td>
                </tr>

                {/* Total */}
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={5} className="border border-black p-1 text-right">Total :</td>
                  <td className="border border-black p-1 text-right font-mono">
                    {fmt(totalEstimatedParts + (summary?.totalGstEstimated || 0))}
                  </td>
                  <td className="border border-black p-1 text-right font-mono">0.00</td>
                  <td className="border border-black p-1 text-right font-mono">0.00</td>
                  <td className="border border-black p-1 text-right font-mono text-emerald-900">
                    {fmt(totalNonMetalParts + partsGstTotal)}
                  </td>
                  <td className="border border-black p-1"></td>
                </tr>

                {/* Less : Depreciation (Highlighted in RED) */}
                <tr className="font-semibold bg-rose-50/50 text-rose-700">
                  <td colSpan={5} className="border border-black p-1 text-right font-bold">Less: Depreciation :</td>
                  <td className="border border-black p-1 text-right font-mono">0.00</td>
                  <td className="border border-black p-1 text-right font-mono">0.00</td>
                  <td className="border border-black p-1 text-right font-mono">0.00</td>
                  <td className="border border-black p-1 text-right font-mono text-rose-700 font-bold">
                    {isEditMode ? (
                      <input
                        type="number"
                        value={summary?.depreciation || 0}
                        onChange={(e) => handleFieldChange('summary', 'depreciation', Number(e.target.value))}
                        className="w-16 font-mono text-right text-rose-700 font-bold border-b border-rose-500 bg-white px-1"
                      />
                    ) : (
                      fmt(totalDepreciation)
                    )}
                  </td>
                  <td className="border border-black p-1"></td>
                </tr>

                {/* Net Total ₹ */}
                <tr className="font-bold bg-slate-100">
                  <td colSpan={5} className="border border-black p-1 text-right">Net Total ₹ :</td>
                  <td className="border border-black p-1 text-right font-mono">
                    {fmt(totalEstimatedParts + (summary?.totalGstEstimated || 0))}
                  </td>
                  <td className="border border-black p-1 text-right font-mono">0.00</td>
                  <td className="border border-black p-1 text-right font-mono">0.00</td>
                  <td className="border border-black p-1 text-right font-mono text-emerald-900">
                    {fmt(totalNonMetalParts + partsGstTotal - totalDepreciation)}
                  </td>
                  <td className="border border-black p-1"></td>
                </tr>

                {/* Grand Total ₹ for Parts */}
                <tr className="font-black bg-slate-200 border-b-2 border-black">
                  <td colSpan={5} className="border border-black p-1 text-right uppercase">Grand Total ₹ (Parts) :</td>
                  <td className="border border-black p-1 text-right font-mono">
                    {fmt(totalEstimatedParts + (summary?.totalGstEstimated || 0))}
                  </td>
                  <td colSpan={3} className="border border-black p-1 text-right font-mono text-emerald-900">
                    {fmt(totalNonMetalParts + partsGstTotal - totalDepreciation)}
                  </td>
                  <td className="border border-black p-1"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 8. LABOUR & REPAIRS TABLE */}
        <div className="space-y-1 report-section">
          <div className="flex items-center justify-between bg-slate-100 p-1 border-l-2 border-black">
            <h3 className="font-bold text-[11px] uppercase">
              LABOUR & REPAIRS :
            </h3>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('final-estimate')}
                className="print:hidden text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 font-semibold cursor-pointer"
              >
                <span>Edit Labour in Tab</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse border border-black">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-black text-center">
                  <th className="border border-black p-1 w-10">S. No.</th>
                  <th className="border border-black p-1 w-20">SAC</th>
                  <th className="border border-black p-1 w-14">Bill S. No</th>
                  <th className="border border-black p-1 text-left">Labour Description</th>
                  <th className="border border-black p-1 w-24">Estimated ₹</th>
                  <th className="border border-black p-1 w-24">Assessed ₹</th>
                </tr>
              </thead>
              <tbody>
                {finalEstimate.labour?.length > 0 ? (
                  finalEstimate.labour.map((lab) => (
                    <tr key={lab.id} className="hover:bg-slate-50 border-b border-slate-300">
                      <td className="border border-black p-1 text-center font-mono">{lab.sNo}</td>
                      <td className="border border-black p-1 text-center font-mono">{lab.sac || '998729'}</td>
                      <td className="border border-black p-1 text-center font-mono">{lab.billSNo || '---'}</td>
                      <td className="border border-black p-1 font-semibold">{lab.labourDescription}</td>
                      <td className="border border-black p-1 text-right font-mono">{fmt(lab.estimated)}</td>
                      <td className="border border-black p-1 text-right font-mono font-bold text-emerald-800">
                        {fmt(lab.assessed)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="border border-black p-3 text-center text-slate-500 italic">
                      No labour operations recorded.
                    </td>
                  </tr>
                )}

                <tr className="bg-slate-100 font-bold border-t border-black">
                  <td colSpan={4} className="border border-black p-1 text-right">Sub Total Labour Charges : ₹</td>
                  <td className="border border-black p-1 text-right font-mono">{fmt(totalLabourEstimated)}</td>
                  <td className="border border-black p-1 text-right font-mono text-emerald-900">{fmt(totalLabourAssessed)}</td>
                </tr>

                <tr className="font-semibold">
                  <td colSpan={4} className="border border-black p-1 text-right">
                    Add : GST on ₹ {fmt(totalLabourAssessed)} @ 18.00% :
                  </td>
                  <td className="border border-black p-1 text-right font-mono">
                    {fmt((totalLabourEstimated * 18) / 100)}
                  </td>
                  <td className="border border-black p-1 text-right font-mono text-emerald-900">{fmt(labourGstTotal)}</td>
                </tr>

                <tr className="bg-slate-200 font-black border-b-2 border-black">
                  <td colSpan={4} className="border border-black p-1 text-right uppercase">Total Labour Charges : ₹</td>
                  <td className="border border-black p-1 text-right font-mono">
                    {fmt(totalLabourEstimated + (totalLabourEstimated * 18) / 100)}
                  </td>
                  <td className="border border-black p-1 text-right font-mono text-emerald-900">
                    {fmt(totalLabourAssessed + labourGstTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 9. SUMMARY OF ASSESSMENT (PARTICULARS) */}
        <div className="space-y-1 report-section">
          <h3 className="font-bold text-[11px] uppercase bg-slate-100 p-1 border-l-2 border-black">
            SUMMARY OF ASSESSMENT :
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse border border-black">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-black text-center">
                  <th className="border border-black p-1 text-left">PARTICULARS</th>
                  <th className="border border-black p-1 w-36">ORIGINAL ESTIMATE</th>
                  <th className="border border-black p-1 w-36">ASSESSED FOR</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-1 font-semibold">Total Labour Charges ₹</td>
                  <td className="border border-black p-1 text-right font-mono">
                    {fmt(totalLabourEstimated + (totalLabourEstimated * 18) / 100, '0.00')}
                  </td>
                  <td className="border border-black p-1 text-right font-mono font-bold">
                    {fmt(totalLabourAssessed + labourGstTotal)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-semibold">Total Cost of Parts (+) ₹</td>
                  <td className="border border-black p-1 text-right font-mono">
                    {fmt(totalEstimatedParts + (summary?.totalGstEstimated || 0), '0.00')}
                  </td>
                  <td className="border border-black p-1 text-right font-mono font-bold">
                    {fmt(totalNonMetalParts + partsGstTotal - totalDepreciation)}
                  </td>
                </tr>
                <tr className="bg-slate-100 font-bold border-t border-black">
                  <td className="border border-black p-1 text-right">Total Assessed (Gross) ₹</td>
                  <td className="border border-black p-1 text-right font-mono">
                    {fmt(totalLabourEstimated + totalEstimatedParts, '0.00')}
                  </td>
                  <td className="border border-black p-1 text-right font-mono">
                    {fmt(totalLabourAssessed + labourGstTotal + totalNonMetalParts + partsGstTotal - totalDepreciation)}
                  </td>
                </tr>

                {/* LESS: EXCESS (Loss in Red) */}
                <tr className="text-rose-700 bg-rose-50/60 font-semibold">
                  <td className="border border-black p-1 text-right">Less: Policy Excess (Deductible) ₹</td>
                  <td className="border border-black p-1 text-right font-mono">---</td>
                  <td className="border border-black p-1 text-right font-mono text-rose-700 font-bold">
                    {isEditMode ? (
                      <input
                        type="number"
                        value={policy.policyExcess || excess}
                        onChange={(e) => handleFieldChange('policy', 'policyExcess', Number(e.target.value))}
                        className="w-20 font-mono text-right text-rose-700 font-bold border-b border-rose-500 bg-white px-1"
                      />
                    ) : (
                      `- ${fmt(excess)}`
                    )}
                  </td>
                </tr>

                {/* LESS: SALVAGE (Loss in Red) */}
                <tr className="text-rose-700 bg-rose-50/60 font-semibold">
                  <td className="border border-black p-1 text-right">Less: Salvage ₹</td>
                  <td className="border border-black p-1 text-right font-mono">---</td>
                  <td className="border border-black p-1 text-right font-mono text-rose-700 font-bold">
                    {isEditMode ? (
                      <input
                        type="number"
                        value={summary?.salvage || salvage}
                        onChange={(e) => handleFieldChange('summary', 'salvage', Number(e.target.value))}
                        className="w-20 font-mono text-right text-rose-700 font-bold border-b border-rose-500 bg-white px-1"
                      />
                    ) : (
                      `- ${fmt(salvage)}`
                    )}
                  </td>
                </tr>

                {/* NET ASSESSED LIABILITY HIGHLIGHT (Vibrant Green) */}
                <tr className="bg-emerald-50 font-black border-t-2 border-b-2 border-black text-emerald-950">
                  <td className="border border-black p-2 text-right text-xs uppercase font-extrabold">
                    Net Assessed Amount (Payable) ₹ :
                  </td>
                  <td className="border border-black p-2 text-right font-mono">
                    {fmt(totalLabourEstimated + totalEstimatedParts, '0.00')}
                  </td>
                  <td className="border border-black p-2 text-right font-mono text-sm font-black text-emerald-700">
                    ₹ {fmt(grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-slate-600 italic pt-1">
            Depreciation is not deducted being NIL DEPRECIATION policy.
          </p>
        </div>

        {/* 10. GST SUMMARY TAX WISE */}
        <div className="space-y-1 report-section">
          <h3 className="font-bold text-[11px] uppercase bg-slate-100 p-1 border-l-2 border-black">
            GST Summary Tax Wise :
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse border border-black text-center">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-black">
                  <th className="border border-black p-1 w-12">Sr. No.</th>
                  <th className="border border-black p-1">Tax Percentage</th>
                  <th className="border border-black p-1">Actual Allowed</th>
                  <th className="border border-black p-1">C GST</th>
                  <th className="border border-black p-1">S GST</th>
                  <th className="border border-black p-1">I GST</th>
                  <th className="border border-black p-1 font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-1 font-mono">1</td>
                  <td className="border border-black p-1 font-mono">0.00 %</td>
                  <td className="border border-black p-1 font-mono">0.00</td>
                  <td className="border border-black p-1 font-mono">0.00</td>
                  <td className="border border-black p-1 font-mono">0.00</td>
                  <td className="border border-black p-1 font-mono">0.00</td>
                  <td className="border border-black p-1 font-mono font-bold">0.00</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-mono">2</td>
                  <td className="border border-black p-1 font-mono">18.00 %</td>
                  <td className="border border-black p-1 font-mono">{fmt(totalNonMetalParts)}</td>
                  <td className="border border-black p-1 font-mono">{fmt(partsGstTotal / 2)}</td>
                  <td className="border border-black p-1 font-mono">{fmt(partsGstTotal / 2)}</td>
                  <td className="border border-black p-1 font-mono">0.00</td>
                  <td className="border border-black p-1 font-mono font-bold text-emerald-800">
                    {fmt(totalNonMetalParts + partsGstTotal)}
                  </td>
                </tr>
                <tr className="bg-slate-100 font-bold border-t border-black">
                  <td colSpan={2} className="border border-black p-1 text-right">Grand Total (Parts GST) :</td>
                  <td className="border border-black p-1 font-mono">{fmt(totalNonMetalParts)}</td>
                  <td className="border border-black p-1 font-mono">{fmt(partsGstTotal / 2)}</td>
                  <td className="border border-black p-1 font-mono">{fmt(partsGstTotal / 2)}</td>
                  <td className="border border-black p-1 font-mono">0.00</td>
                  <td className="border border-black p-1 font-mono">{fmt(totalNonMetalParts + partsGstTotal)}</td>
                </tr>
                <tr className="font-semibold">
                  <td colSpan={6} className="border border-black p-1 text-right">Total Tax (Parts) :</td>
                  <td className="border border-black p-1 font-mono font-bold text-emerald-800">{fmt(partsGstTotal)}</td>
                </tr>

                {/* Labour GST Row */}
                <tr className="border-t-2 border-black">
                  <td className="border border-black p-1 font-mono">1</td>
                  <td className="border border-black p-1 font-mono">SAC 998729 (18.00 %)</td>
                  <td className="border border-black p-1 font-mono">{fmt(totalLabourAssessed)}</td>
                  <td className="border border-black p-1 font-mono">{fmt(labourGstTotal / 2)}</td>
                  <td className="border border-black p-1 font-mono">{fmt(labourGstTotal / 2)}</td>
                  <td className="border border-black p-1 font-mono">0.00</td>
                  <td className="border border-black p-1 font-mono font-bold text-emerald-800">
                    {fmt(totalLabourAssessed + labourGstTotal)}
                  </td>
                </tr>
                <tr className="font-semibold bg-slate-100">
                  <td colSpan={6} className="border border-black p-1 text-right">Total Tax (Labour) :</td>
                  <td className="border border-black p-1 font-mono font-bold text-emerald-800">{fmt(labourGstTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 11. STATUTORY LIABILITY IN WORDS - Prominently Displayed */}
        <div className="p-3 border-2 border-black rounded bg-emerald-50/40 space-y-1.5 report-section">
          <p className="text-[11px] leading-relaxed">
            Based on details provided above, the liability under the subject policy of insurance works out to{' '}
            <strong className="text-black font-mono text-sm font-black">₹ {fmt(grandTotal)}</strong>
          </p>
          <div className="bg-white p-2 rounded border border-emerald-300">
            <p className="text-[11px] font-black text-emerald-900 uppercase tracking-wide font-mono">
              ( {amountInWords} )
            </p>
          </div>
          <p className="text-[10px] text-slate-700 italic">
            The assessment of loss, as detailed above, is subject to the terms and conditions of the policy of insurance.
          </p>
        </div>

        {/* 12. STATUTORY NOTES */}
        <div className="space-y-1 text-[10px] leading-relaxed report-section">
          <h4 className="font-bold text-[11px] uppercase">Notes :-</h4>
          <ol className="list-decimal pl-5 space-y-1 text-slate-800">
            <li>
              Pursuance to instruction received from Online Intimation, Undersign inspected the accidental vehicle at{' '}
              <strong>{accident.placeOfSurvey || 'M/s KUMBHAT MOTORS LLP , JODHPUR'}</strong>.
            </li>
            <li>
              The above accident was studied & damaged vehicle carefully inspected & have taken some necessary photographs of damages which are attached & Checked the effected parts & accordingly assessed the loss as the schedule of assessment provided by the insured.
            </li>
            <li>The Cost of Parts & Repair is allowed as per Dealer Price.</li>
            <li>
              Only those items were considered in my assessment for replacement / repair, which relevant with the cause of loss & Nature of accident & fresh.
            </li>
            <li>
              Loss covered by an indemnified peril in subject matter policy and same falls in ambit policy term & Condition.
            </li>
            <li>Payment make in INSURED Favor.</li>
          </ol>
          <p className="pt-2 text-slate-700 italic">Thanking you and assuring you of my best services at all times,</p>
        </div>

        {/* 13. SURVEYOR SIGNATURE BLOCK */}
        <div className="pt-8 flex justify-between items-end border-t border-black text-[11px] report-section">
          <div>
            <span className="font-bold block">Issued Without Prejudice</span>
            <span className="text-[10px] text-slate-600 block mt-1">
              Enclosures : Estimate of repairs, Claim form, Photographs [{photos.length > 0 ? photos.length : '<PT>'} Nos.], Survey fee bill.
            </span>
          </div>

          <div className="text-right space-y-0.5">
            <div className="font-bold uppercase text-xs">{settings.surveyorName || 'VINOD KUMAR KATARIA'}</div>
            <div className="font-semibold text-slate-800">Surveyor & Loss Assessor</div>
            <div className="font-mono text-[10px] text-slate-600">SLA: {settings.licenseNumber || 'SLA74182'}</div>
          </div>
        </div>

        {/* 14. ATTACHED ACCIDENTAL VEHICLE PHOTOGRAPHS APPENDIX */}
        {photos.length > 0 && (
          <div className="pt-6 border-t-2 border-black space-y-3 report-section">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[11px] uppercase bg-slate-100 p-1 border-l-2 border-black">
                ENCLOSURE : ACCIDENTAL VEHICLE PHOTOGRAPHS ({photos.length} NOS.)
              </h3>
              <span className="text-[10px] text-slate-600 font-mono">
                Reg: {vehicle.registrationNumber || 'RJ15CA4929'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {photos.map((photo, idx) => (
                <div key={photo.id} className="border border-slate-300 rounded-lg p-2 space-y-1">
                  <div className="aspect-4/3 overflow-hidden bg-slate-100 rounded">
                    <img
                      src={photo.dataUrl}
                      alt={photo.caption}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="font-bold">Photo #{idx + 1}: {photo.caption}</span>
                    <span className="text-slate-500">{photo.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

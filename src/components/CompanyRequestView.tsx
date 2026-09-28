import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Mail,
  Send,
  ExternalLink,
  Sparkles,
  Copy,
  Check,
  Globe,
  BookmarkCheck,
  FileText,
  Link as LinkIcon
} from 'lucide-react';
import { CompanyRequestData, DocumentRow, PolicyData, VehicleData, EstimateSummary, SurveyorSettings } from '../types/survey';

interface CompanyRequestViewProps {
  companyRequest: CompanyRequestData;
  policy?: PolicyData;
  vehicle?: VehicleData;
  summary?: EstimateSummary;
  settings?: SurveyorSettings;
  onChange: (updated: Partial<CompanyRequestData>, field: string, oldVal: any, newVal: any) => void;
  onCommitSection?: () => void;
}

// Popular Indian Insurance Company Surveyor Portals for 1-click setting
const POPULAR_INSURER_PORTALS = [
  { name: 'HDFC ERGO', url: 'https://claims.hdfcergo.com', email: 'claims@hdfcergo.com' },
  { name: 'ICICI Lombard', url: 'https://www.icicilombard.com/claims', email: 'motorclaims@icicilombard.com' },
  { name: 'Bajaj Allianz', url: 'https://www.bajajallianz.com/claims', email: 'motor.claims@bajajallianz.co.in' },
  { name: 'Go Digit', url: 'https://www.godigit.com/claims', email: 'claims@godigit.com' },
  { name: 'TATA AIG', url: 'https://www.tataaig.com/claims', email: 'claims.support@tataaig.com' },
  { name: 'New India', url: 'https://www.newindia.co.in/portal', email: 'motorclaims@newindia.co.in' },
  { name: 'United India', url: 'https://uiic.co.in/claims', email: 'motorclaims@uiic.co.in' },
  { name: 'National Insurance', url: 'https://nationalinsurance.nic.co.in', email: 'claims@nic.co.in' },
  { name: 'SBI General', url: 'https://www.sbigeneral.in/claims', email: 'claims@sbigeneral.in' },
];

export const CompanyRequestView: React.FC<CompanyRequestViewProps> = ({
  companyRequest,
  policy,
  vehicle,
  summary,
  settings,
  onChange,
  onCommitSection,
}) => {
  // Communication Hub State
  const [templateType, setTemplateType] = useState<'report_submission' | 'survey_conducted' | 'supplementary_estimate' | 'queries_raised'>('report_submission');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [customDraft, setCustomDraft] = useState<{ emailSubject: string; emailBody: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSectionCommitted, setIsSectionCommitted] = useState(false);
  const [commitTimestamp, setCommitTimestamp] = useState<string | null>(null);

  const handleFieldChange = (field: keyof CompanyRequestData, value: any) => {
    const oldVal = companyRequest[field];
    onChange({ [field]: value }, `companyRequest.${String(field)}`, oldVal, value);
    setIsSectionCommitted(false);
  };

  const handleDocumentChange = (id: string, field: keyof DocumentRow, value: any) => {
    const updatedDocs = companyRequest.requiredDocuments.map((doc) =>
      doc.id === id ? { ...doc, [field]: value } : doc
    );
    onChange({ requiredDocuments: updatedDocs }, `companyRequest.requiredDocuments.${id}.${field}`, null, value);
    setIsSectionCommitted(false);
  };

  const handleAddDocument = () => {
    const newDoc: DocumentRow = {
      id: `cdoc-${Date.now()}`,
      documentName: 'New Required Document',
      status: 'Pending',
      remarks: '',
    };
    const updatedDocs = [...companyRequest.requiredDocuments, newDoc];
    onChange({ requiredDocuments: updatedDocs }, 'companyRequest.requiredDocuments.add', null, newDoc);
    setIsSectionCommitted(false);
  };

  const handleDeleteDocument = (id: string) => {
    const updatedDocs = companyRequest.requiredDocuments.filter((d) => d.id !== id);
    onChange({ requiredDocuments: updatedDocs }, 'companyRequest.requiredDocuments.delete', id, null);
    setIsSectionCommitted(false);
  };

  // Section Commit
  const handleCommit = () => {
    if (onCommitSection) onCommitSection();
    setIsSectionCommitted(true);
    setCommitTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  // Open Company Portal in new tab
  const handleVisitPortal = (rawUrl?: string) => {
    const targetUrl = (rawUrl || companyRequest.portalUrl || '').trim();
    if (!targetUrl) return;
    const finalUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
      ? targetUrl
      : `https://${targetUrl}`;
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  };

  // Select a preset portal
  const handleSelectPreset = (preset: { name: string; url: string; email: string }) => {
    onChange(
      {
        companyName: companyRequest.companyName || preset.name,
        portalUrl: preset.url,
        companyEmail: companyRequest.companyEmail || preset.email,
      },
      'companyRequest.presetSelect',
      null,
      preset.name
    );
  };

  // Dynamic Email Generation
  const regNo = vehicle?.registrationNumber || companyRequest.vehicleNumber || 'Vehicle';
  const claimNo = companyRequest.claimNumber || policy?.claimNumber || 'N/A';
  const policyNo = companyRequest.policyNumber || policy?.policyNumber || 'N/A';
  const insurerName = companyRequest.companyName || policy?.insuranceCompany || 'Insurance Company';
  const surveyorName = settings?.surveyorName || companyRequest.surveyorName || 'Insurance Surveyor & Loss Assessor';
  const surveyorPhone = settings?.surveyorPhone || '';
  const netAssessed = Number(summary?.grandTotal || 0).toLocaleString('en-IN');

  const defaultTemplates = {
    report_submission: {
      subject: `Final Survey Report & Loss Assessment - Vehicle ${regNo} (Claim: ${claimNo})`,
      body: `To,\nThe Claims Department / Underwriting Office,\n${insurerName}\n\nDear Sir/Madam,\n\nRe: Motor Insurance Claim Survey & Loss Assessment Report\n- Policy No: ${policyNo}\n- Claim No: ${claimNo}\n- Vehicle Reg. No: ${regNo}\n- Insured Name: ${policy?.insuredName || 'Insured'}\n\nWith reference to your survey deputation, we have carried out the physical inspection and detailed loss assessment of the above mentioned vehicle.\n\nSummary of Loss Assessment:\n- Assessed Parts Total: ₹${Number(summary?.totalPartsAssessed || 0).toLocaleString('en-IN')}\n- Assessed Labour Total: ₹${Number(summary?.totalLabourAssessed || 0).toLocaleString('en-IN')}\n- Less Depreciation / Salvage / Excess: ₹${Number((summary?.depreciation || 0) + (summary?.excess || 0) + (summary?.salvage || 0)).toLocaleString('en-IN')}\n- Net Assessed Insurer Liability: ₹${netAssessed}\n\nThe detailed Final Survey Report along with photographs, repairer estimates, and verification documents has been finalized. Kindly process the settlement as per policy terms.\n\nThanking you,\n\nSincerely,\n${surveyorName}\nLicensed Surveyor & Loss Assessor\nPhone: ${surveyorPhone}\nEmail: ${settings?.surveyorEmail || ''}`,
    },
    survey_conducted: {
      subject: `Survey Inspection Conducted - Vehicle ${regNo} (Claim: ${claimNo})`,
      body: `To,\n${insurerName} Claims Desk,\n\nDear Sir/Madam,\n\nThis is to intimate that the physical survey inspection for vehicle ${regNo} (Claim No: ${claimNo}) has been conducted at the workshop on ${companyRequest.requestDate || new Date().toISOString().split('T')[0]}.\n\nPreliminary inspection shows front collision damage. The garage has been instructed to dismantle the front bumper and radiator for internal impact corroboration.\n\nStatus: Survey Conducted / Assessment in Progress.\n\nRegards,\n${surveyorName}\nPhone: ${surveyorPhone}`,
    },
    supplementary_estimate: {
      subject: `Supplementary Estimate Approval Requisition - Vehicle ${regNo} (Claim: ${claimNo})`,
      body: `To,\n${insurerName} Motor Claims Division,\n\nDear Sir/Madam,\n\nRegarding Claim No: ${claimNo} for vehicle ${regNo}, during mechanical dismantling at the workshop, additional internal damages were noticed requiring supplementary assessment.\n\nKindly note that revised estimates have been scrutinized and our supplementary assessment report will be uploaded to the portal shortly.\n\nSincerely,\n${surveyorName}\nPhone: ${surveyorPhone}`,
    },
    queries_raised: {
      subject: `Query / Document Clarification - Vehicle ${regNo} (Claim: ${claimNo})`,
      body: `To,\n${insurerName} Technical Claims Team,\n\nDear Sir/Madam,\n\nIn reference to Claim No: ${claimNo} for vehicle ${regNo}, we seek clarification regarding policy endorsement and NCB applicability.\n\nPlease refer to the uploaded document checklist for further details.\n\nRegards,\n${surveyorName}\nPhone: ${surveyorPhone}`,
    },
  };

  const activeEmailSubject = customDraft?.emailSubject || defaultTemplates[templateType].subject;
  const activeEmailBody = customDraft?.emailBody || defaultTemplates[templateType].body;

  // AI Polish Draft
  const handleAiDraft = async () => {
    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Draft a formal, concise, authoritative insurer email from the surveyor to "${insurerName}" regarding claim "${claimNo}" for vehicle "${regNo}". Topic: "${templateType}". Net assessed amount: ₹${netAssessed}. Format with a distinct "SUBJECT:" line and "BODY:".`,
          surveyContext: {
            policy,
            vehicle,
            companyRequest,
            summary,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.reply) {
        const text = data.reply;
        let subject = defaultTemplates[templateType].subject;
        let body = text;
        if (text.includes('SUBJECT:') && text.includes('BODY:')) {
          const parts = text.split('BODY:');
          subject = parts[0].replace('SUBJECT:', '').trim();
          body = parts[1].trim();
        }
        setCustomDraft({ emailSubject: subject, emailBody: body });
      }
    } catch (err) {
      console.error('Failed to AI polish company draft:', err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Launch Email
  const handleSendEmail = () => {
    const to = companyRequest.companyEmail || '';
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(activeEmailSubject)}&body=${encodeURIComponent(activeEmailBody)}`;
    window.location.href = mailto;
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold font-mono">
                Section 3
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Insurance Company Deputation & Portal Hub
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Insurer portal direct integration, claims desk email dispatch, and underwriting checklist tracking.
            </p>
          </div>
        </div>

        {/* Section Commit Status & Button */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          {isSectionCommitted && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Committed {commitTimestamp && `(${commitTimestamp})`}</span>
            </div>
          )}

          <button
            onClick={handleCommit}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
            title="Commit all Company Request details"
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>Commit Section</span>
          </button>
        </div>
      </div>

      {/* COMPANY PORTAL LINK & 1-CLICK VISIT CARD */}
      <div className="bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border-2 border-purple-500/30 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Insurer Surveyor Portal Direct Link</h3>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                  Instant Work Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Add company portal link to immediately open the insurer site in 1 click and work on the claim directly.
              </p>
            </div>
          </div>

          {companyRequest.portalUrl && (
            <button
              onClick={() => handleVisitPortal()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all active:scale-95"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Portal & Work Directly</span>
            </button>
          )}
        </div>

        {/* Portal Link Field */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Company Survey Portal URL / Direct Claim Link</span>
            {companyRequest.portalUrl && (
              <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                <Check className="w-3 h-3" /> Ready to Visit
              </span>
            )}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={companyRequest.portalUrl || ''}
                onChange={(e) => handleFieldChange('portalUrl', e.target.value)}
                placeholder="e.g. https://claims.hdfcergo.com/surveyor/dashboard or portal link..."
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
              />
            </div>
            <button
              onClick={() => handleVisitPortal()}
              disabled={!companyRequest.portalUrl}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Visit Portal</span>
            </button>
          </div>
        </div>

        {/* Popular Insurance Portal Presets */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Quick 1-Click Top Insurer Portals:
          </span>
          <div className="flex flex-wrap gap-2 text-xs">
            {POPULAR_INSURER_PORTALS.map((portal) => (
              <button
                key={portal.name}
                onClick={() => handleSelectPreset(portal)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950/70 hover:bg-purple-950/60 text-slate-300 hover:text-white border border-slate-800 hover:border-purple-500/40 text-[11px] font-medium transition-all flex items-center gap-1.5"
                title={`Set portal to ${portal.url} and email to ${portal.email}`}
              >
                <span>{portal.name}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* COMPANY EMAIL DISPATCH CARD */}
      <div className="bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border-2 border-blue-500/30 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Insurer Claims Desk Email Dispatch</h3>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                  Official Communication
                </span>
              </div>
              <p className="text-xs text-slate-400">
                1-Click dispatch formal survey intimations, assessment sheets, and query notes directly to insurer email.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendEmail}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Email to Company</span>
            </button>
          </div>
        </div>

        {/* Email Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
          <div>
            <label className="font-semibold text-slate-300">Company Claims Email</label>
            <input
              type="email"
              value={companyRequest.companyEmail || ''}
              onChange={(e) => handleFieldChange('companyEmail', e.target.value)}
              placeholder="e.g. claims@hdfcergo.com"
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-300">Email Purpose Template</label>
            <select
              value={templateType}
              onChange={(e: any) => setTemplateType(e.target.value)}
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="report_submission">📑 Final Survey Report Submission</option>
              <option value="survey_conducted">🚗 Survey Conducted Intimation</option>
              <option value="supplementary_estimate">⚙️ Supplementary Estimate Approval</option>
              <option value="queries_raised">❓ Underwriting Queries & Clarifications</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <button
              onClick={handleAiDraft}
              disabled={isAiGenerating}
              className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center justify-center gap-1.5 transition-all"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAiGenerating ? 'animate-spin' : ''}`} />
              <span>{isAiGenerating ? 'AI Polishing Draft...' : '✨ AI Polish Email'}</span>
            </button>
          </div>
        </div>

        {/* Live Email Preview */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <span>Prepared Email to Insurer</span>
            </span>
            <button
              onClick={() => handleCopy(`${activeEmailSubject}\n\n${activeEmailBody}`, 'comp_email')}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 transition-colors"
            >
              {copiedField === 'comp_email' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedField === 'comp_email' ? 'Copied' : 'Copy All'}</span>
            </button>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="p-2 bg-slate-900 border border-slate-800 rounded text-slate-200 font-semibold truncate">
              <span className="text-slate-500 font-mono text-[10px] mr-1.5 uppercase">Subject:</span>
              {activeEmailSubject}
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800/80 rounded-lg font-mono text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
              {activeEmailBody}
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            Recipient: <span className="font-mono text-slate-400 font-semibold">{companyRequest.companyEmail || 'Not set'}</span>
          </p>
        </div>
      </div>

      {/* Company Fields */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
          Deputation & Survey Particulars
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Insurance Company Name</label>
            <input
              type="text"
              value={companyRequest.companyName || ''}
              onChange={(e) => handleFieldChange('companyName', e.target.value)}
              placeholder="e.g. HDFC ERGO General Insurance"
              className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Surveyor Name & SLA</label>
            <input
              type="text"
              value={companyRequest.surveyorName || ''}
              onChange={(e) => handleFieldChange('surveyorName', e.target.value)}
              placeholder="e.g. Er. Sunil Mathur (SLA-48291)"
              className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Claim Number</label>
            <input
              type="text"
              value={companyRequest.claimNumber || ''}
              onChange={(e) => handleFieldChange('claimNumber', e.target.value)}
              className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Policy Number</label>
            <input
              type="text"
              value={companyRequest.policyNumber || ''}
              onChange={(e) => handleFieldChange('policyNumber', e.target.value)}
              className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Vehicle Number</label>
            <input
              type="text"
              value={companyRequest.vehicleNumber || ''}
              onChange={(e) => handleFieldChange('vehicleNumber', e.target.value)}
              className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Request / Intimation Date</label>
            <input
              type="date"
              value={companyRequest.requestDate || ''}
              onChange={(e) => handleFieldChange('requestDate', e.target.value)}
              className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Response / Deputation Status</label>
            <select
              value={companyRequest.responseStatus || 'Assigned'}
              onChange={(e) => handleFieldChange('responseStatus', e.target.value)}
              className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Assigned">Assigned</option>
              <option value="Survey Conducted">Survey Conducted</option>
              <option value="Queries Raised">Queries Raised</option>
              <option value="Report Submitted">Report Submitted</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Follow-up Date</label>
            <input
              type="date"
              value={companyRequest.followUpDate || ''}
              onChange={(e) => handleFieldChange('followUpDate', e.target.value)}
              className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Company Remarks / Special Instructions</label>
            <textarea
              rows={2}
              value={companyRequest.companyRemarks || ''}
              onChange={(e) => handleFieldChange('companyRemarks', e.target.value)}
              placeholder="e.g. Conduct spot inspection and verify pre-existing scratches on rear quarter panel..."
              className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Required Underwriting Documents */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Required Underwriting Documents</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Inspection photographs, spot survey reports, and original bills verification.
            </p>
          </div>
          <button
            onClick={handleAddDocument}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-2.5 w-12 text-center">#</th>
                <th className="px-3 py-2.5">Document / Deliverable</th>
                <th className="px-3 py-2.5 w-44">Status</th>
                <th className="px-3 py-2.5">Remarks / Upload Reference</th>
                <th className="px-3 py-2.5 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {companyRequest.requiredDocuments.map((doc, idx) => (
                <tr key={doc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-3 py-2 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={doc.documentName}
                      onChange={(e) => handleDocumentChange(doc.id, 'documentName', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-purple-500 px-1 py-0.5 text-slate-900 dark:text-white font-medium focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={doc.status || 'Pending'}
                      onChange={(e) => handleDocumentChange(doc.id, 'status', e.target.value)}
                      className={`text-xs font-semibold rounded-lg px-2.5 py-1 border focus:outline-none ${
                        doc.status === 'Submitted'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : doc.status === 'Pending'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <option value="Submitted">✓ Submitted</option>
                      <option value="Pending">⏳ Pending</option>
                      <option value="Not Required">━ Not Required</option>
                      <option value="Rejected">✕ Rejected</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={doc.remarks}
                      onChange={(e) => handleDocumentChange(doc.id, 'remarks', e.target.value)}
                      placeholder="e.g. Uploaded to insurer portal..."
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-purple-500 px-1 py-0.5 text-slate-600 dark:text-slate-300 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

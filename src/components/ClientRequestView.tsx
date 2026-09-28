import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  MessageSquare,
  Mail,
  Send,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  Phone,
  FileText,
  BookmarkCheck
} from 'lucide-react';
import { ClientRequestData, DocumentRow, PolicyData, VehicleData, EstimateSummary, SurveyorSettings } from '../types/survey';

interface ClientRequestViewProps {
  clientRequest: ClientRequestData;
  policy?: PolicyData;
  vehicle?: VehicleData;
  summary?: EstimateSummary;
  settings?: SurveyorSettings;
  onChange: (updated: Partial<ClientRequestData>, field: string, oldVal: any, newVal: any) => void;
  onCommitSection?: () => void;
}

export const ClientRequestView: React.FC<ClientRequestViewProps> = ({
  clientRequest,
  policy,
  vehicle,
  summary,
  settings,
  onChange,
  onCommitSection,
}) => {
  // Communication Hub State
  const [templateType, setTemplateType] = useState<'pending_docs' | 'survey_scheduled' | 'final_report' | 'custom'>('pending_docs');
  const [language, setLanguage] = useState<'en' | 'hi' | 'hinglish'>('en');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [customDraft, setCustomDraft] = useState<{ whatsappMessage: string; emailSubject: string; emailBody: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSectionCommitted, setIsSectionCommitted] = useState(false);
  const [commitTimestamp, setCommitTimestamp] = useState<string | null>(null);

  const handleFieldChange = (field: keyof ClientRequestData, value: any) => {
    const oldVal = clientRequest[field];
    onChange({ [field]: value }, `clientRequest.${String(field)}`, oldVal, value);
    setIsSectionCommitted(false);
  };

  const handleDocumentChange = (id: string, field: keyof DocumentRow, value: any) => {
    const updatedDocs = clientRequest.requestedDocuments.map((doc) =>
      doc.id === id ? { ...doc, [field]: value } : doc
    );
    onChange({ requestedDocuments: updatedDocs }, `clientRequest.requestedDocuments.${id}.${field}`, null, value);
    setIsSectionCommitted(false);
  };

  const handleAddDocument = () => {
    const newDoc: DocumentRow = {
      id: `doc-${Date.now()}`,
      documentName: 'New Document',
      status: 'Pending',
      remarks: '',
    };
    const updatedDocs = [...clientRequest.requestedDocuments, newDoc];
    onChange({ requestedDocuments: updatedDocs }, 'clientRequest.requestedDocuments.add', null, newDoc);
    setIsSectionCommitted(false);
  };

  const handleDeleteDocument = (id: string) => {
    const updatedDocs = clientRequest.requestedDocuments.filter((d) => d.id !== id);
    onChange({ requestedDocuments: updatedDocs }, 'clientRequest.requestedDocuments.delete', id, null);
    setIsSectionCommitted(false);
  };

  // Explicit Section Commit
  const handleCommit = () => {
    if (onCommitSection) {
      onCommitSection();
    }
    setIsSectionCommitted(true);
    setCommitTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  // Generate WhatsApp / Email message
  const handleGenerateCommunication = async () => {
    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/ai/draft-communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType,
          language,
          clientRequest,
          policy,
          vehicle,
          summary,
          settings,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCustomDraft(data.data);
      }
    } catch (err) {
      console.error('Failed to generate draft:', err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Default Quick Templates
  const regNo = vehicle?.registrationNumber || clientRequest.vehicleNumber || 'Vehicle';
  const claimNo = policy?.claimNumber || clientRequest.claimNumber || 'N/A';
  const clientName = clientRequest.clientName || policy?.insuredName || 'Client';
  const pendingDocs = clientRequest.requestedDocuments
    .filter((d) => d.status === 'Pending')
    .map((d) => `  • ${d.documentName}`);
  const pendingDocsText = pendingDocs.length > 0 ? pendingDocs.join('\n') : '  • Original RC Book\n  • Driving License\n  • Duly Signed Claim Form';

  const defaultWhatsapp = customDraft?.whatsappMessage || `*Insurance Survey Claim Notice*\n\nDear *${clientName}*,\n\nRegarding your vehicle *${regNo}* (Claim No: *${claimNo}*), please share the following pending documents to finalize your insurance claim assessment:\n\n${pendingDocsText}\n\nKindly send clear photos or PDF copies here on WhatsApp.\n\nRegards,\n*${settings?.surveyorName || 'Insurance Surveyor'}*\n📞 ${settings?.surveyorPhone || clientRequest.mobileNumber || ''}`;

  const defaultEmailSubject = customDraft?.emailSubject || `URGENT: Required Claim Documents - Vehicle ${regNo} (Claim: ${claimNo})`;
  const defaultEmailBody = customDraft?.emailBody || `Dear ${clientName},\n\nWith reference to your motor insurance claim for vehicle ${regNo} (Claim No: ${claimNo}), please submit the following required documents at your earliest convenience to expedite the physical loss assessment:\n\n${pendingDocsText}\n\nThank you for your cooperation.\n\nSincerely,\n${settings?.surveyorName || 'Insurance Surveyor & Loss Assessor'}\nPhone: ${settings?.surveyorPhone || ''}`;

  // Direct WhatsApp Launch
  const handleSendWhatsApp = () => {
    const rawMobile = clientRequest.mobileNumber || '';
    const cleanNumber = rawMobile.replace(/\D/g, '');
    const targetPhone = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(defaultWhatsapp)}`;
    window.open(url, '_blank');
  };

  // Direct Email Launch
  const handleSendEmail = () => {
    const to = clientRequest.email || '';
    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(defaultEmailSubject)}&body=${encodeURIComponent(defaultEmailBody)}`;
    window.location.href = mailtoUrl;
  };

  const handleCopyText = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Section Header & Commit Status */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-sm">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold font-mono">
                Section 2
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Client Request & Communication Dispatch Hub
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Client metadata, document verification checklist, and direct WhatsApp & Email communication.
            </p>
          </div>
        </div>

        {/* Section Commit Button & Status */}
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
            title="Explicitly commit all Client Request and checklist changes to survey record"
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>Commit Section</span>
          </button>
        </div>
      </div>

      {/* WHATSAPP & EMAIL COMMUNICATION DISPATCH CARD */}
      <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border-2 border-indigo-500/30 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Client Direct Dispatch Hub</h3>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  WhatsApp & Email Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                1-Click send formatted claim notifications, document reminders, and assessment updates to client.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendWhatsApp}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Send WhatsApp</span>
            </button>

            <button
              onClick={handleSendEmail}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Send Email</span>
            </button>
          </div>
        </div>

        {/* Dispatch Controls & AI Polish */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
          <div>
            <label className="font-semibold text-slate-300">Communication Template</label>
            <select
              value={templateType}
              onChange={(e: any) => setTemplateType(e.target.value)}
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="pending_docs">📄 Pending Documents Requisition</option>
              <option value="survey_scheduled">🚗 Physical Survey Scheduled</option>
              <option value="final_report">✅ Final Assessment Completed</option>
              <option value="custom">💬 General Claim Update</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-300">Language Tone</label>
            <select
              value={language}
              onChange={(e: any) => setLanguage(e.target.value)}
              className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="en">English (Professional Formal)</option>
              <option value="hi">Hindi (हिन्दी शुद्ध)</option>
              <option value="hinglish">Hinglish (Polite Conversational)</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <button
              onClick={handleGenerateCommunication}
              disabled={isAiGenerating}
              className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAiGenerating ? 'animate-spin' : ''}`} />
              <span>{isAiGenerating ? 'AI Polishing Draft...' : '✨ AI Polish & Draft'}</span>
            </button>
          </div>
        </div>

        {/* Live Message Previews */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* WhatsApp Message Preview */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-200">WhatsApp Message Content</span>
              </div>
              <button
                onClick={() => handleCopyText(defaultWhatsapp, 'wa')}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 transition-colors"
              >
                {copiedField === 'wa' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === 'wa' ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800/80 rounded-lg text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
              {defaultWhatsapp}
            </div>
            <p className="text-[10px] text-slate-500">
              Recipient: <span className="font-mono text-slate-400 font-semibold">{clientRequest.mobileNumber || 'Not set'}</span> ({clientRequest.clientName || 'Unnamed'})
            </p>
          </div>

          {/* Email Preview */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span className="text-xs font-bold text-slate-200">Email Draft</span>
              </div>
              <button
                onClick={() => handleCopyText(`${defaultEmailSubject}\n\n${defaultEmailBody}`, 'email')}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 transition-colors"
              >
                {copiedField === 'email' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === 'email' ? 'Copied' : 'Copy All'}</span>
              </button>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="p-2 bg-slate-900 border border-slate-800 rounded text-slate-200 font-semibold truncate">
                <span className="text-slate-500 font-mono text-[10px] mr-1.5 uppercase">Subject:</span>
                {defaultEmailSubject}
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800/80 rounded-lg font-mono text-slate-300 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                {defaultEmailBody}
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              Recipient: <span className="font-mono text-slate-400 font-semibold">{clientRequest.email || 'Not set'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Client Overview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
          Client & Claim Intimation Particulars
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Client Name</label>
            <input
              type="text"
              value={clientRequest.clientName || ''}
              onChange={(e) => handleFieldChange('clientName', e.target.value)}
              placeholder="e.g. Deepak Verma"
              className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">WhatsApp / Mobile Number</label>
            <input
              type="text"
              value={clientRequest.mobileNumber || ''}
              onChange={(e) => handleFieldChange('mobileNumber', e.target.value)}
              placeholder="10-digit number"
              className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
            <input
              type="email"
              value={clientRequest.email || ''}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              placeholder="client@example.com"
              className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Request Date</label>
            <input
              type="date"
              value={clientRequest.requestDate || ''}
              onChange={(e) => handleFieldChange('requestDate', e.target.value)}
              className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Policy Number</label>
            <input
              type="text"
              value={clientRequest.policyNumber || ''}
              onChange={(e) => handleFieldChange('policyNumber', e.target.value)}
              className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Claim Number</label>
            <input
              type="text"
              value={clientRequest.claimNumber || ''}
              onChange={(e) => handleFieldChange('claimNumber', e.target.value)}
              className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Vehicle Registration Number</label>
            <input
              type="text"
              value={clientRequest.vehicleNumber || ''}
              onChange={(e) => handleFieldChange('vehicleNumber', e.target.value)}
              className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300">Claim Request Status</label>
            <select
              value={clientRequest.requestStatus || 'Initiated'}
              onChange={(e) => handleFieldChange('requestStatus', e.target.value)}
              className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Initiated">Initiated</option>
              <option value="In Progress">In Progress</option>
              <option value="Documents Pending">Documents Pending</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Client Remarks / Intimation Note</label>
            <textarea
              rows={2}
              value={clientRequest.clientRemarks || ''}
              onChange={(e) => handleFieldChange('clientRemarks', e.target.value)}
              placeholder="e.g. Accidental impact with divider on Mandore Road..."
              className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Follow-up Date</label>
            <input
              type="date"
              value={clientRequest.followUpDate || ''}
              onChange={(e) => handleFieldChange('followUpDate', e.target.value)}
              className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Requested Documents Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Document Checklist & Status</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pending documents automatically feed into the WhatsApp & Email dispatch generator above.
            </p>
          </div>
          <button
            onClick={handleAddDocument}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Document Row</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-2.5 w-12 text-center">#</th>
                <th className="px-3 py-2.5">Document Name</th>
                <th className="px-3 py-2.5 w-44">Verification Status</th>
                <th className="px-3 py-2.5">Remarks / Source Note</th>
                <th className="px-3 py-2.5 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {clientRequest.requestedDocuments.map((doc, idx) => (
                <tr key={doc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-3 py-2 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={doc.documentName}
                      onChange={(e) => handleDocumentChange(doc.id, 'documentName', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 px-1 py-0.5 text-slate-900 dark:text-white font-medium focus:outline-none"
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
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold'
                          : doc.status === 'Rejected'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
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
                      placeholder="e.g. Verified original on DigiLocker..."
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 px-1 py-0.5 text-slate-600 dark:text-slate-300 focus:outline-none"
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

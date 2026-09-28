import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MessageSquare,
  Mail,
  Copy,
  ExternalLink,
  RefreshCw,
  HelpCircle,
  Calculator,
  ChevronRight,
  Bot,
  User,
  SlidersHorizontal,
  Flame,
  Check
} from 'lucide-react';
import { SurveyRecord, SurveyorSettings } from '../types/survey';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentRecord: SurveyRecord;
  settings: SurveyorSettings;
  onApplyObservation?: (obs: { causeOfAccident?: string; natureOfLoss?: string; surveyorNotes?: string }) => void;
  setCurrentTab: (tab: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  provider?: string;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  currentRecord,
  settings,
  onApplyObservation,
  setCurrentTab,
}) => {
  const [activeTab, setActiveTab] = useState<'copilot' | 'audit' | 'drafting' | 'norms'>('copilot');

  // Copilot Chat State
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hello Surveyor! I am your **SurveyFlow AI Copilot** (powered by Gemini 3.8 Flash). I have analyzed your active survey for vehicle **${currentRecord?.vehicle?.registrationNumber || 'N/A'}** (Policy: **${currentRecord?.policy?.policyNumber || 'N/A'}**).\n\nAsk me anything about IRDAI depreciation norms, accident cause corroboration, GST tax rules, or ask me to draft client communications and observations!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      provider: 'Gemini 3.8 Flash',
    },
  ]);

  // Audit State
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);

  // Drafting State
  const [draftType, setDraftType] = useState<'pending_docs' | 'survey_scheduled' | 'final_report' | 'custom'>('pending_docs');
  const [draftLang, setDraftLang] = useState<'en' | 'hi' | 'hinglish'>('en');
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState<{ whatsappMessage: string; emailSubject: string; emailBody: string } | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Copilot Send
  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          surveyContext: currentRecord,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'ai',
            text: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            provider: data.provider,
          },
        ]);
      } else {
        throw new Error(data.message || 'AI request failed');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: `⚠️ Error querying AI engine: ${err.message || 'Network error'}. Please try again.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Run IRDAI Quality Audit
  const handleRunAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await fetch('/api/ai/audit-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyRecord: currentRecord }),
      });
      const resData = await res.json();
      if (resData.success) {
        setAuditResult(resData.data);
      }
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  // Run Communication Drafter
  const handleGenerateDraft = async () => {
    setIsDrafting(true);
    try {
      const res = await fetch('/api/ai/draft-communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType: draftType,
          language: draftLang,
          clientRequest: currentRecord.clientRequest,
          policy: currentRecord.policy,
          vehicle: currentRecord.vehicle,
          summary: currentRecord.summary,
          settings,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setDraftResult(data.data);
      }
    } catch (err) {
      console.error('Draft error:', err);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleOpenWhatsApp = (text: string) => {
    const phone = currentRecord?.clientRequest?.mobileNumber || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleOpenEmail = (subject: string, body: string) => {
    const to = currentRecord?.clientRequest?.email || '';
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col shadow-2xl h-full animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-tight">SurveyFlow AI Copilot</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold font-mono">
                  Gemini 3.8
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Vehicle: <span className="font-mono text-indigo-300 font-semibold">{currentRecord?.vehicle?.registrationNumber || 'RJ15CA4929'}</span> • Claim: <span className="font-mono text-slate-300">{currentRecord?.policy?.claimNumber || 'N/A'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/80 px-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('copilot')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'copilot'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Copilot</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('audit');
              if (!auditResult) handleRunAudit();
            }}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'audit'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>IRDAI Quality Audit</span>
            {auditResult && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                auditResult.score >= 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {auditResult.score}%
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('drafting');
              if (!draftResult) handleGenerateDraft();
            }}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'drafting'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp & Email Drafter</span>
          </button>

          <button
            onClick={() => setActiveTab('norms')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'norms'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>IRDAI Norms & Rates</span>
          </button>
        </div>

        {/* Tab 1: AI Copilot Chat */}
        {activeTab === 'copilot' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/40">
            {/* Quick Action Chips */}
            <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2 overflow-x-auto text-[11px] scrollbar-none">
              <span className="text-slate-500 uppercase font-semibold text-[10px]">Quick:</span>
              <button
                onClick={() => handleSendMessage('Perform an IRDAI compliance audit on this claim and point out missing data.')}
                className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 whitespace-nowrap transition-colors"
              >
                🔍 Audit active claim
              </button>
              <button
                onClick={() => handleSendMessage('Draft formal surveyor technical observations explaining damage consistent with front collision.')}
                className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 whitespace-nowrap transition-colors"
              >
                📝 Draft technical observations
              </button>
              <button
                onClick={() => handleSendMessage('What is the IRDAI depreciation schedule for plastic, rubber, glass, and metal parts?')}
                className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 whitespace-nowrap transition-colors"
              >
                ⚖️ Depreciation rates
              </button>
              <button
                onClick={() => handleSendMessage('What is the net insurer liability breakdown with 18% GST and compulsory excess?')}
                className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 whitespace-nowrap transition-colors"
              >
                💰 Calculation breakdown
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.sender === 'ai' && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex-shrink-0 flex items-center justify-center mt-1">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-900 border border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.text}</div>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{m.timestamp}</span>
                      {m.provider && (
                        <span className="font-mono text-[9px] px-1 rounded bg-slate-800 text-indigo-300">
                          {m.provider}
                        </span>
                      )}
                    </div>
                  </div>

                  {m.sender === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex-shrink-0 flex items-center justify-center mt-1 shadow-sm">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3 justify-start items-center text-xs text-slate-400">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[11px] ml-1 text-slate-400 font-mono">Gemini analyzing survey fields...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex gap-2">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask Surveyor AI (e.g. 'Draft observation for front dent' or 'Check GST rate')..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputQuery.trim() || isTyping}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: IRDAI Quality Audit */}
        {activeTab === 'audit' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-slate-950/40">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">IRDAI Surveyor Assessment Quality Audit</h4>
                <p className="text-xs text-slate-400">
                  Comprehensive audit for Insurance Regulatory & Development Authority standards.
                </p>
              </div>
              <button
                onClick={handleRunAudit}
                disabled={isAuditing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
                <span>{isAuditing ? 'Auditing...' : 'Re-Run Audit'}</span>
              </button>
            </div>

            {auditResult ? (
              <div className="space-y-4">
                {/* Score Gauge Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Overall Compliance Score
                    </span>
                    <div className="text-2xl font-black text-white mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-indigo-400">{auditResult.score}</span>
                      <span className="text-slate-500 text-base font-normal">/ 100</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ml-2 ${
                        auditResult.score >= 85
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : auditResult.score >= 70
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {auditResult.verdict}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{auditResult.summary}</p>
                  </div>
                </div>

                {/* Audit Checklist Items */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Audit Items</h5>
                  <div className="space-y-2">
                    {auditResult.checklist?.map((c: any, i: number) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200">{c.item}</span>
                            <span className="text-[10px] text-slate-500 font-mono">({c.category})</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{c.detail}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                          c.status === 'PASS'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : c.status === 'WARN'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actionable Recommendations */}
                {auditResult.recommendations?.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
                    <h5 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Auditor Recommendations</span>
                    </h5>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {auditResult.recommendations.map((rec: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-400 font-mono text-[11px]">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Performing regulatory quality audit on active survey...</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: WhatsApp & Email Drafter */}
        {activeTab === 'drafting' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-slate-950/40">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Communication Dispatch Controls
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-400">Template Context</label>
                  <select
                    value={draftType}
                    onChange={(e: any) => setDraftType(e.target.value)}
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="pending_docs">📄 Pending Documents Requisition</option>
                    <option value="survey_scheduled">🚗 Survey Inspection Scheduled</option>
                    <option value="final_report">✅ Final Assessment Completed</option>
                    <option value="custom">💬 General Claim Update</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-400">Language</label>
                  <select
                    value={draftLang}
                    onChange={(e: any) => setDraftLang(e.target.value)}
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="en">English (Professional Formal)</option>
                    <option value="hi">Hindi (हिन्दी)</option>
                    <option value="hinglish">Hinglish (Polite Conversational)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateDraft}
                disabled={isDrafting}
                className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isDrafting ? 'Drafting with Gemini AI...' : 'Generate AI Message Drafts'}</span>
              </button>
            </div>

            {/* Generated WhatsApp Card */}
            {draftResult && (
              <div className="space-y-4">
                <div className="bg-slate-900 border border-emerald-900/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        WA
                      </div>
                      <span className="font-bold text-xs text-white">WhatsApp Message Draft</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy(draftResult.whatsappMessage, 'wa')}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        {copiedType === 'wa' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedType === 'wa' ? 'Copied!' : 'Copy'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenWhatsApp(draftResult.whatsappMessage)}
                        className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Send WhatsApp</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
                    {draftResult.whatsappMessage}
                  </div>
                </div>

                {/* Generated Email Card */}
                <div className="bg-slate-900 border border-blue-900/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                        @
                      </div>
                      <span className="font-bold text-xs text-white">Formal Email Draft</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopy(`${draftResult.emailSubject}\n\n${draftResult.emailBody}`, 'em')}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        {copiedType === 'em' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedType === 'em' ? 'Copied!' : 'Copy All'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenEmail(draftResult.emailSubject, draftResult.emailBody)}
                        className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Launch Mail</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-xs space-y-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Subject:</span>
                      <div className="p-2 bg-slate-950 border border-slate-800 rounded font-semibold text-slate-200 mt-0.5">
                        {draftResult.emailSubject}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Body:</span>
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded text-slate-300 font-mono whitespace-pre-wrap leading-relaxed mt-0.5">
                        {draftResult.emailBody}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: IRDAI Depreciation & Rates Reference Table */}
        {activeTab === 'norms' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-slate-950/40 text-xs">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-white text-sm">Official IRDAI Motor Depreciation Schedule</h4>
              <p className="text-slate-400 text-xs">
                Statutory depreciation percentages applicable on replacement parts for commercial and private vehicles under standard Indian Motor Tariff (IMT).
              </p>

              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="p-2.5">Category of Material / Part</th>
                      <th className="p-2.5 text-right">Depreciation Rate</th>
                      <th className="p-2.5">Statutory Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-medium text-slate-200">Rubber, Nylon, Plastic, Tyres, Tubes, Batteries, Airbags</td>
                      <td className="p-2.5 text-right font-mono font-bold text-rose-400">50%</td>
                      <td className="p-2.5 text-slate-400 text-[11px]">IMT Standard Norm</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-medium text-slate-200">Fibre Glass Components</td>
                      <td className="p-2.5 text-right font-mono font-bold text-amber-400">30%</td>
                      <td className="p-2.5 text-slate-400 text-[11px]">IMT Standard Norm</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-medium text-slate-200">All Glass Material / Windshields / Mirrors</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-400">Nil (0%)</td>
                      <td className="p-2.5 text-slate-400 text-[11px]">Zero Depreciation</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-medium text-slate-200">Metal Parts (Age up to 6 months)</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-400">Nil (0%)</td>
                      <td className="p-2.5 text-slate-400 text-[11px]">Vehicle Age Slab 1</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-medium text-slate-200">Metal Parts (6 months to 1 year)</td>
                      <td className="p-2.5 text-right font-mono font-bold text-blue-400">5%</td>
                      <td className="p-2.5 text-slate-400 text-[11px]">Vehicle Age Slab 2</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-medium text-slate-200">Metal Parts (1 to 2 years)</td>
                      <td className="p-2.5 text-right font-mono font-bold text-blue-400">10%</td>
                      <td className="p-2.5 text-slate-400 text-[11px]">Vehicle Age Slab 3</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-medium text-slate-200">Metal Parts (2 to 3 years)</td>
                      <td className="p-2.5 text-right font-mono font-bold text-indigo-400">15%</td>
                      <td className="p-2.5 text-slate-400 text-[11px]">Vehicle Age Slab 4</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-medium text-slate-200">Metal Parts (3 to 4 years)</td>
                      <td className="p-2.5 text-right font-mono font-bold text-indigo-400">25%</td>
                      <td className="p-2.5 text-slate-400 text-[11px]">Vehicle Age Slab 5</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-medium text-slate-200">Metal Parts (4 to 5 years)</td>
                      <td className="p-2.5 text-right font-mono font-bold text-purple-400">35%</td>
                      <td className="p-2.5 text-slate-400 text-[11px]">Vehicle Age Slab 6</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-medium text-slate-200">Metal Parts (5 to 10 years)</td>
                      <td className="p-2.5 text-right font-mono font-bold text-purple-400">40%</td>
                      <td className="p-2.5 text-slate-400 text-[11px]">Vehicle Age Slab 7</td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-medium text-slate-200">Metal Parts (Over 10 years)</td>
                      <td className="p-2.5 text-right font-mono font-bold text-rose-400">50%</td>
                      <td className="p-2.5 text-slate-400 text-[11px]">Maximum Metal Cap</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* GST Reference Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-white text-sm">Goods & Services Tax (GST) Slabs</h4>
              <p className="text-slate-400 text-xs">
                - **Spare Parts (HSN codes)**: Assessed at 18% or 28% depending on specific part classification.<br />
                - **Labour / Repairs (SAC 998729)**: Standard rate is 18% (9% CGST + 9% SGST for intra-state, or 18% IGST for inter-state).<br />
                - **Towing / Recovery (SAC 9965)**: 18% GST (standard claim reimbursement).
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

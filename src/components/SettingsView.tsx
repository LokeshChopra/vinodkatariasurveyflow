import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  Server,
  Shield,
  Activity,
  User,
  Building,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { SurveyorSettings } from '../types/survey';

interface SettingsViewProps {
  settings: SurveyorSettings;
  onSaveSettings: (settings: SurveyorSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSaveSettings }) => {
  const [form, setForm] = useState<SurveyorSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealthStatus(data);
      } else {
        setHealthStatus({ status: 'error', message: 'HTTP ' + res.status });
      }
    } catch (e: any) {
      setHealthStatus({ status: 'offline', message: e?.message || 'Server unreachable' });
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleChange = (key: keyof SurveyorSettings, val: any) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setSaveSuccess(false);
  };

  const handleSave = () => {
    onSaveSettings(form);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold font-mono">
                  Section 11
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Surveyor Profile & Engine Settings</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                License credentials, report letterhead metadata, calculation defaults, and AI backend connectivity.
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Surveyor settings saved successfully to local storage.</span>
        </div>
      )}

      {/* Backend & AI API Status Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">API Engine & Health Status</h3>
          </div>
          <button
            onClick={fetchHealth}
            disabled={healthLoading}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-500"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Health</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block text-[10px] uppercase">Service Name</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {healthStatus?.service || 'SurveyFlow API'}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block text-[10px] uppercase">AI Extraction Engine</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {healthStatus?.ai || 'Detecting...'}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block text-[10px] uppercase">OCR / Scanning Status</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>STRICTLY DISABLED (Pure Text)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Surveyor Details Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <User className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Surveyor Credentials & Contact</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Surveyor Full Name & Qualifications</label>
              <input
                type="text"
                value={form.surveyorName}
                onChange={(e) => handleChange('surveyorName', e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">SLA License Number</label>
              <input
                type="text"
                value={form.slaNumber}
                onChange={(e) => handleChange('slaNumber', e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">IRDAI Registration No.</label>
              <input
                type="text"
                value={form.irdaNumber}
                onChange={(e) => handleChange('irdaNumber', e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Office Phone</label>
              <input
                type="text"
                value={form.surveyorPhone}
                onChange={(e) => handleChange('surveyorPhone', e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
              <input
                type="email"
                value={form.surveyorEmail}
                onChange={(e) => handleChange('surveyorEmail', e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Office Address</label>
              <textarea
                rows={2}
                value={form.surveyorAddress}
                onChange={(e) => handleChange('surveyorAddress', e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Fee Settlement Bank Details</label>
              <input
                type="text"
                value={form.bankDetails}
                onChange={(e) => handleChange('bankDetails', e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Calculation Defaults */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Shield className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Assessment Calculation Defaults</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Default Policy Excess / Deductible (₹)
              </label>
              <input
                type="number"
                value={form.defaultPolicyExcess}
                onChange={(e) => handleChange('defaultPolicyExcess', parseFloat(e.target.value) || 0)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Standard contractual deductible automatically applied to new surveys.
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Default Salvage Value Estimate (%)
              </label>
              <input
                type="number"
                value={form.defaultSalvagePercent}
                onChange={(e) => handleChange('defaultSalvagePercent', parseFloat(e.target.value) || 0)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Suggested percentage deduction for scrap metal/radiator recovery.
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                GST Tax Computation Mode
              </label>
              <select
                value={form.taxMode || 'CGST_SGST'}
                onChange={(e) => handleChange('taxMode', e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CGST_SGST">Intra-State: Split into CGST (50%) & SGST (50%)</option>
                <option value="IGST">Inter-State: Integrated GST (IGST 100%)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

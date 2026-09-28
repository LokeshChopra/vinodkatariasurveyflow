import React, { useState } from 'react';
import {
  Shield,
  Car,
  AlertTriangle,
  Info,
  Calendar,
  CheckCircle2,
  FileCheck,
  BookmarkCheck
} from 'lucide-react';
import { PolicyData, VehicleData, FieldConfidence, ValidationError } from '../types/survey';

interface PolicyViewProps {
  policy: PolicyData;
  vehicle: VehicleData;
  fieldConfidences: Record<string, FieldConfidence>;
  validationErrors: ValidationError[];
  onChangePolicy: (updated: Partial<PolicyData>, fieldName: string, oldVal: any, newVal: any) => void;
  onChangeVehicle: (updated: Partial<VehicleData>, fieldName: string, oldVal: any, newVal: any) => void;
  onCommitSection?: () => void;
}

export const PolicyView: React.FC<PolicyViewProps> = ({
  policy,
  vehicle,
  fieldConfidences,
  validationErrors,
  onChangePolicy,
  onChangeVehicle,
  onCommitSection,
}) => {
  const [isCommitted, setIsCommitted] = useState(false);
  const [commitTime, setCommitTime] = useState<string | null>(null);

  const handleCommit = () => {
    if (onCommitSection) onCommitSection();
    setIsCommitted(true);
    setCommitTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  const getFieldError = (fieldKey: string) => {
    return validationErrors.find((e) => e.field === fieldKey);
  };

  const getConfidenceBadge = (fieldKey: string) => {
    const fc = fieldConfidences[fieldKey];
    if (!fc || fc.confidence === undefined) return null;
    const isLow = fc.confidence < 0.7;
    return (
      <span
        title={`Source: "${fc.sourceText || 'Extracted'}" | Confidence: ${Math.round(fc.confidence * 100)}%`}
        className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ml-1.5 cursor-help ${
          isLow
            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
        }`}
      >
        {isLow && <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />}
        {Math.round(fc.confidence * 100)}%
      </span>
    );
  };

  const handlePolicyInput = (key: keyof PolicyData, value: any) => {
    const oldVal = policy[key];
    onChangePolicy({ [key]: value }, `policy.${String(key)}`, oldVal, value);
    setIsCommitted(false);
  };

  const handleVehicleInput = (key: keyof VehicleData, value: any) => {
    const oldVal = vehicle[key];
    onChangeVehicle({ [key]: value }, `vehicle.${String(key)}`, oldVal, value);
    setIsCommitted(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold font-mono">
                Section 4
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Insurance Policy & Vehicle Particulars</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Exact field mapping according to predefined schemas. All values are editable with inline confidence ratings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          {isCommitted && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Committed {commitTime && `(${commitTime})`}</span>
            </div>
          )}

          <button
            onClick={handleCommit}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
            title="Explicitly commit all Policy and Vehicle changes"
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>Commit Section</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Policy on Left, Vehicle on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insurance Policy Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Shield className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Policy Particulars</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* Policy Number */}
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Policy Number *</span>
                {getConfidenceBadge('policy.policyNumber')}
              </label>
              <input
                type="text"
                value={policy.policyNumber || ''}
                onChange={(e) => handlePolicyInput('policyNumber', e.target.value)}
                placeholder="e.g. 2311200489120000001"
                className={`mt-1 w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  getFieldError('policy.policyNumber')
                    ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/20'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {getFieldError('policy.policyNumber') && (
                <span className="text-[11px] text-rose-500 mt-0.5 block">
                  {getFieldError('policy.policyNumber')?.message}
                </span>
              )}
            </div>

            {/* Insurance Company */}
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Insurance Company</span>
                {getConfidenceBadge('policy.insuranceCompany')}
              </label>
              <input
                type="text"
                value={policy.insuranceCompany || ''}
                onChange={(e) => handlePolicyInput('insuranceCompany', e.target.value)}
                placeholder="e.g. HDFC ERGO General Insurance Co. Ltd."
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Policy Start Date */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Policy Start Date</span>
                {getConfidenceBadge('policy.policyStartDate')}
              </label>
              <input
                type="date"
                value={policy.policyStartDate || ''}
                onChange={(e) => handlePolicyInput('policyStartDate', e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Policy End Date */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Policy End Date</span>
                {getConfidenceBadge('policy.policyEndDate')}
              </label>
              <input
                type="date"
                value={policy.policyEndDate || ''}
                onChange={(e) => handlePolicyInput('policyEndDate', e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Policy Type */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Policy Type</label>
              <input
                type="text"
                value={policy.policyType || ''}
                onChange={(e) => handlePolicyInput('policyType', e.target.value)}
                placeholder="Comprehensive / Nil Dep"
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Insured Name */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Insured Name *</span>
                {getConfidenceBadge('policy.insuredName')}
              </label>
              <input
                type="text"
                value={policy.insuredName || ''}
                onChange={(e) => handlePolicyInput('insuredName', e.target.value)}
                placeholder="e.g. Rajesh Kumar Sharma"
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Insured Mobile */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Insured Mobile</span>
                {getConfidenceBadge('policy.insuredMobile')}
              </label>
              <input
                type="text"
                value={policy.insuredMobile || ''}
                onChange={(e) => handlePolicyInput('insuredMobile', e.target.value)}
                placeholder="10-digit mobile"
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {getFieldError('policy.insuredMobile') && (
                <span className="text-[11px] text-amber-500 mt-0.5 block">
                  {getFieldError('policy.insuredMobile')?.message}
                </span>
              )}
            </div>

            {/* Claim Number */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Claim Number</span>
                {getConfidenceBadge('policy.claimNumber')}
              </label>
              <input
                type="text"
                value={policy.claimNumber || ''}
                onChange={(e) => handlePolicyInput('claimNumber', e.target.value)}
                placeholder="CLM-2026-..."
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Survey Number */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Survey Number</label>
              <input
                type="text"
                value={policy.surveyNumber || ''}
                onChange={(e) => handlePolicyInput('surveyNumber', e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Loss Date */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Loss Date</span>
                {getConfidenceBadge('policy.lossDate')}
              </label>
              <input
                type="text"
                value={policy.lossDate || ''}
                onChange={(e) => handlePolicyInput('lossDate', e.target.value)}
                placeholder="YYYY-MM-DD"
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Loss Location */}
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Loss Location</label>
              <input
                type="text"
                value={policy.lossLocation || ''}
                onChange={(e) => handlePolicyInput('lossLocation', e.target.value)}
                placeholder="City, Road, Highway..."
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* IDV & Sum Insured */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">IDV (₹)</label>
              <input
                type="number"
                value={policy.idv || ''}
                onChange={(e) => handlePolicyInput('idv', parseFloat(e.target.value) || 0)}
                placeholder="785000"
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Sum Insured (₹)</label>
              <input
                type="number"
                value={policy.sumInsured || ''}
                onChange={(e) => handlePolicyInput('sumInsured', parseFloat(e.target.value) || 0)}
                placeholder="785000"
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Policy Excess & Deductible */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Policy Excess (₹)</label>
              <input
                type="number"
                value={policy.policyExcess || ''}
                onChange={(e) => handlePolicyInput('policyExcess', parseFloat(e.target.value) || 0)}
                placeholder="1000"
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">No Claim Bonus (NCB)</label>
              <input
                type="text"
                value={policy.ncb || ''}
                onChange={(e) => handlePolicyInput('ncb', e.target.value)}
                placeholder="20% / 35% / 50%"
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Previous Policy & Insurer */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Previous Policy No.</label>
              <input
                type="text"
                value={policy.previousPolicyNumber || ''}
                onChange={(e) => handlePolicyInput('previousPolicyNumber', e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Previous Insurer</label>
              <input
                type="text"
                value={policy.previousInsuranceCompany || ''}
                onChange={(e) => handlePolicyInput('previousInsuranceCompany', e.target.value)}
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Vehicle Particulars Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Car className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Vehicle Particulars</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* Vehicle Registration Number */}
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Vehicle Registration Number (Regn Mark) *</span>
                {getConfidenceBadge('vehicle.registrationNumber')}
              </label>
              <input
                type="text"
                value={vehicle.registrationNumber || ''}
                onChange={(e) => handleVehicleInput('registrationNumber', e.target.value.toUpperCase())}
                placeholder="e.g. RJ15CA4929"
                className={`mt-1 w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  getFieldError('vehicle.registrationNumber')
                    ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/20'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {getFieldError('vehicle.registrationNumber') && (
                <span className="text-[11px] text-amber-500 mt-0.5 block">
                  {getFieldError('vehicle.registrationNumber')?.message}
                </span>
              )}
            </div>

            {/* RC Number */}
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>RC Number</span>
                {getConfidenceBadge('vehicle.rcNumber')}
              </label>
              <input
                type="text"
                value={vehicle.rcNumber || ''}
                onChange={(e) => handleVehicleInput('rcNumber', e.target.value.toUpperCase())}
                placeholder="e.g. RJ15CA4929"
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Make */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Vehicle Make</span>
                {getConfidenceBadge('vehicle.make')}
              </label>
              <input
                type="text"
                value={vehicle.make || ''}
                onChange={(e) => handleVehicleInput('make', e.target.value)}
                placeholder="Maruti Suzuki, Hyundai..."
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Model */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Vehicle Model</span>
                {getConfidenceBadge('vehicle.model')}
              </label>
              <input
                type="text"
                value={vehicle.model || ''}
                onChange={(e) => handleVehicleInput('model', e.target.value)}
                placeholder="Swift Dzire, Creta..."
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Variant */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Variant</label>
              <input
                type="text"
                value={vehicle.variant || ''}
                onChange={(e) => handleVehicleInput('variant', e.target.value)}
                placeholder="ZXI Plus, SX..."
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Vehicle Type */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Vehicle Type</label>
              <input
                type="text"
                value={vehicle.vehicleType || ''}
                onChange={(e) => handleVehicleInput('vehicleType', e.target.value)}
                placeholder="Private Car, Commercial..."
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Engine Number */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Engine Number</span>
                {getConfidenceBadge('vehicle.engineNumber')}
              </label>
              <input
                type="text"
                value={vehicle.engineNumber || ''}
                onChange={(e) => handleVehicleInput('engineNumber', e.target.value)}
                placeholder="K12MN..."
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Chassis Number */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Chassis Number</span>
                {getConfidenceBadge('vehicle.chassisNumber')}
              </label>
              <input
                type="text"
                value={vehicle.chassisNumber || ''}
                onChange={(e) => handleVehicleInput('chassisNumber', e.target.value)}
                placeholder="MA3FCE..."
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Year of Manufacture */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Year of Manufacture</label>
              <input
                type="text"
                value={vehicle.yearOfManufacture || ''}
                onChange={(e) => handleVehicleInput('yearOfManufacture', e.target.value)}
                placeholder="2024"
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date of Registration */}
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Date of Registration</label>
              <input
                type="text"
                value={vehicle.dateOfRegistration || ''}
                onChange={(e) => handleVehicleInput('dateOfRegistration', e.target.value)}
                placeholder="YYYY-MM-DD"
                className="mt-1 w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

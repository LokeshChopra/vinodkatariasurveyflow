import {
  SurveyRecord,
  ValidationError,
  FieldConfidence
} from '../types/survey';

// Indian vehicle registration regex: e.g., RJ15CA4929, DL01AB1234, MH02EE9999, HR26DQ5551
const RC_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/i;
// Indian mobile number: 10 digits starting with 6, 7, 8, 9
const MOBILE_REGEX = /^[6-9]\d{9}$/;
// HSN code: 4 to 8 digits
const HSN_REGEX = /^\d{4,8}$/;
// SAC code: 6 digits
const SAC_REGEX = /^\d{6}$/;

export function validateSurveyData(survey: Partial<SurveyRecord>): ValidationError[] {
  const errors: ValidationError[] = [];

  const policy = survey.policy;
  const vehicle = survey.vehicle;
  const invoices = survey.invoices || [];
  const initialEstimate = survey.initialEstimate;
  const finalEstimate = survey.finalEstimate;
  const fieldConfidences = survey.fieldConfidences || {};
  const unmappedText = survey.unmappedText || [];

  // SF001: Missing required field
  if (!policy?.policyNumber || policy.policyNumber.trim() === '') {
    errors.push({
      code: 'SF001',
      field: 'policy.policyNumber',
      message: 'Policy Number is missing or empty.',
      severity: 'error',
    });
  }

  if (!vehicle?.registrationNumber || vehicle.registrationNumber.trim() === '') {
    errors.push({
      code: 'SF001',
      field: 'vehicle.registrationNumber',
      message: 'Vehicle Registration Number is missing.',
      severity: 'error',
    });
  }

  if (!policy?.insuredName || policy.insuredName.trim() === '') {
    errors.push({
      code: 'SF001',
      field: 'policy.insuredName',
      message: 'Insured Name is required.',
      severity: 'warning',
    });
  }

  // SF002 & SF017: Invalid RC / Registration Number
  if (vehicle?.registrationNumber) {
    const cleanReg = vehicle.registrationNumber.replace(/\s+/g, '').toUpperCase();
    if (!RC_REGEX.test(cleanReg)) {
      errors.push({
        code: 'SF002',
        field: 'vehicle.registrationNumber',
        message: `RC / Vehicle Registration '${cleanReg}' does not match standard format (e.g. RJ15CA4929).`,
        severity: 'warning',
        expected: 'e.g. RJ15CA4929',
        actual: cleanReg,
      });
    }
  }

  if (vehicle?.rcNumber && vehicle.rcNumber !== vehicle.registrationNumber) {
    const cleanRc = vehicle.rcNumber.replace(/\s+/g, '').toUpperCase();
    if (!RC_REGEX.test(cleanRc) && cleanRc.length < 5) {
      errors.push({
        code: 'SF017',
        field: 'vehicle.rcNumber',
        message: `RC Number '${cleanRc}' appears invalid or corrupted.`,
        severity: 'warning',
        expected: 'Valid RC format',
        actual: cleanRc,
      });
    }
  }

  // Mobile validation
  if (policy?.insuredMobile) {
    const cleanMob = policy.insuredMobile.replace(/[^0-9]/g, '');
    const tenDigit = cleanMob.slice(-10);
    if (!MOBILE_REGEX.test(tenDigit)) {
      errors.push({
        code: 'SF001',
        field: 'policy.insuredMobile',
        message: `Mobile number '${policy.insuredMobile}' is not a valid 10-digit Indian phone number.`,
        severity: 'warning',
        actual: policy.insuredMobile,
      });
    }
  }

  // SF003: Invalid policy number
  if (policy?.policyNumber && policy.policyNumber.length < 4) {
    errors.push({
      code: 'SF003',
      field: 'policy.policyNumber',
      message: `Policy number '${policy.policyNumber}' is unusually short.`,
      severity: 'warning',
      actual: policy.policyNumber,
    });
  }

  // SF004: Invalid date
  const checkDate = (field: string, val: string | undefined, label: string) => {
    if (val && val.trim() !== '') {
      const parsed = Date.parse(val);
      if (isNaN(parsed)) {
        errors.push({
          code: 'SF004',
          field,
          message: `${label} '${val}' is not a valid recognized date format.`,
          severity: 'error',
          actual: val,
        });
      }
    }
  };

  checkDate('policy.policyStartDate', policy?.policyStartDate, 'Policy Start Date');
  checkDate('policy.policyEndDate', policy?.policyEndDate, 'Policy End Date');
  checkDate('policy.lossDate', policy?.lossDate, 'Date of Loss');

  // SF011: Conflicting dates
  if (policy?.policyStartDate && policy?.policyEndDate) {
    const start = new Date(policy.policyStartDate).getTime();
    const end = new Date(policy.policyEndDate).getTime();
    if (!isNaN(start) && !isNaN(end) && start > end) {
      errors.push({
        code: 'SF011',
        field: 'policy.policyStartDate',
        message: 'Policy Start Date cannot be later than Policy End Date.',
        severity: 'error',
      });
    }
  }

  // Parts validation (Initial & Final)
  const allParts = [
    ...(initialEstimate?.parts || []).map((p) => ({ ...p, table: 'Initial Estimate' })),
    ...(finalEstimate?.parts || []).map((p) => ({ ...p, table: 'Final Estimate' })),
  ];

  const validGstRates = [0, 5, 12, 18, 28];
  const seenENos = new Set<string>();

  (initialEstimate?.parts || []).forEach((part, idx) => {
    // SF008: Duplicate part row
    if (part.eNo && seenENos.has(part.eNo)) {
      errors.push({
        code: 'SF008',
        field: `initialEstimate.parts[${idx}].eNo`,
        message: `Duplicate part entry number E. No '${part.eNo}' in Initial Estimate.`,
        severity: 'warning',
        actual: part.eNo,
      });
    } else if (part.eNo) {
      seenENos.add(part.eNo);
    }

    // SF005: Invalid amount
    if (isNaN(Number(part.estimated)) || Number(part.estimated) < 0) {
      errors.push({
        code: 'SF005',
        field: `initialEstimate.parts[${idx}].estimated`,
        message: `Invalid estimated amount '${part.estimated}' for part '${part.partsDescription || 'Unnamed'}'.`,
        severity: 'error',
      });
    }

    // SF006: Invalid GST percentage
    if (!validGstRates.includes(Number(part.gstRate))) {
      errors.push({
        code: 'SF006',
        field: `initialEstimate.parts[${idx}].gstRate`,
        message: `GST Rate ${part.gstRate}% on part '${part.partsDescription}' is non-standard (allowed: 0%, 5%, 12%, 18%, 28%).`,
        severity: 'warning',
        actual: `${part.gstRate}%`,
      });
    }

    // SF009: Invalid HSN code
    if (part.hsnCode && !HSN_REGEX.test(part.hsnCode.trim())) {
      errors.push({
        code: 'SF009',
        field: `initialEstimate.parts[${idx}].hsnCode`,
        message: `HSN Code '${part.hsnCode}' should be 4, 6, or 8 digits.`,
        severity: 'warning',
        actual: part.hsnCode,
      });
    }
  });

  // Final Estimate Parts
  const seenFinalENos = new Set<string>();
  (finalEstimate?.parts || []).forEach((part, idx) => {
    if (part.eNo && seenFinalENos.has(part.eNo)) {
      errors.push({
        code: 'SF008',
        field: `finalEstimate.parts[${idx}].eNo`,
        message: `Duplicate part entry number E. No '${part.eNo}' in Final Estimate.`,
        severity: 'warning',
        actual: part.eNo,
      });
    } else if (part.eNo) {
      seenFinalENos.add(part.eNo);
    }

    if (isNaN(Number(part.assessed)) || Number(part.assessed) < 0) {
      errors.push({
        code: 'SF005',
        field: `finalEstimate.parts[${idx}].assessed`,
        message: `Invalid assessed amount '${part.assessed}' for part '${part.partsDescription}'.`,
        severity: 'error',
      });
    }

    if (!validGstRates.includes(Number(part.gstRate))) {
      errors.push({
        code: 'SF006',
        field: `finalEstimate.parts[${idx}].gstRate`,
        message: `GST Rate ${part.gstRate}% on part '${part.partsDescription}' is non-standard.`,
        severity: 'warning',
      });
    }

    if (part.hsnCode && !HSN_REGEX.test(part.hsnCode.trim())) {
      errors.push({
        code: 'SF009',
        field: `finalEstimate.parts[${idx}].hsnCode`,
        message: `HSN Code '${part.hsnCode}' must be 4, 6, or 8 digits.`,
        severity: 'warning',
      });
    }
  });

  // Labour validation (SF010, SF015)
  (initialEstimate?.labour || []).forEach((lab, idx) => {
    if (lab.sac && !SAC_REGEX.test(lab.sac.trim())) {
      errors.push({
        code: 'SF010',
        field: `initialEstimate.labour[${idx}].sac`,
        message: `SAC code '${lab.sac}' should be 6 digits (e.g., 998729).`,
        severity: 'warning',
      });
    }

    if (isNaN(Number(lab.estimated)) || Number(lab.estimated) <= 0) {
      errors.push({
        code: 'SF015',
        field: `initialEstimate.labour[${idx}].estimated`,
        message: `Labour '${lab.labourDescription}' has invalid or zero estimated charges.`,
        severity: 'warning',
      });
    }
  });

  (finalEstimate?.labour || []).forEach((lab, idx) => {
    if (lab.sac && !SAC_REGEX.test(lab.sac.trim())) {
      errors.push({
        code: 'SF010',
        field: `finalEstimate.labour[${idx}].sac`,
        message: `SAC code '${lab.sac}' should be 6 digits.`,
        severity: 'warning',
      });
    }

    if (isNaN(Number(lab.assessed)) || Number(lab.assessed) < 0) {
      errors.push({
        code: 'SF015',
        field: `finalEstimate.labour[${idx}].assessed`,
        message: `Labour '${lab.labourDescription}' has invalid assessed amount.`,
        severity: 'error',
      });
    }
  });

  // Invoice Validation (SF007, SF016)
  const seenInvoices = new Set<string>();
  invoices.forEach((inv, idx) => {
    if (inv.invoiceNumber && seenInvoices.has(inv.invoiceNumber)) {
      errors.push({
        code: 'SF007',
        field: `invoices[${idx}].invoiceNumber`,
        message: `Duplicate invoice number detected: '${inv.invoiceNumber}'.`,
        severity: 'error',
        actual: inv.invoiceNumber,
      });
    } else if (inv.invoiceNumber) {
      seenInvoices.add(inv.invoiceNumber);
    }

    if (isNaN(Number(inv.invoiceAmount)) || Number(inv.invoiceAmount) <= 0) {
      errors.push({
        code: 'SF016',
        field: `invoices[${idx}].invoiceAmount`,
        message: `Invoice '${inv.invoiceNumber || idx + 1}' has an invalid or zero amount.`,
        severity: 'warning',
      });
    }
  });

  // SF012: Low AI Confidence
  Object.values(fieldConfidences).forEach((fc) => {
    if (fc.confidence > 0 && fc.confidence < 0.7) {
      errors.push({
        code: 'SF012',
        field: fc.field,
        message: `Field '${fc.field}' was extracted with low confidence (${Math.round(fc.confidence * 100)}%). Source: "${fc.sourceText || fc.value}"`,
        severity: 'warning',
      });
    }
  });

  // SF013: Unmapped text
  if (unmappedText.length > 0) {
    errors.push({
      code: 'SF013',
      field: 'unmappedText',
      message: `${unmappedText.length} snippet(s) from document text could not be mapped to predefined fields.`,
      severity: 'warning',
    });
  }

  // SF014: Missing estimate section
  const totalPartsCount = (initialEstimate?.parts?.length || 0) + (finalEstimate?.parts?.length || 0);
  const totalLabourCount = (initialEstimate?.labour?.length || 0) + (finalEstimate?.labour?.length || 0);
  if (totalPartsCount === 0 && totalLabourCount === 0 && (survey.documentType === 'Final Estimate' || survey.documentType === 'Initial Estimate')) {
    errors.push({
      code: 'SF014',
      field: 'estimate',
      message: 'No parts or labour entries were extracted for this estimate document.',
      severity: 'error',
    });
  }

  return errors;
}

export const ERROR_CODE_DESCRIPTIONS: Record<string, string> = {
  SF001: 'Missing required field',
  SF002: 'Invalid RC number',
  SF003: 'Invalid policy number',
  SF004: 'Invalid date',
  SF005: 'Invalid amount',
  SF006: 'Invalid GST percentage',
  SF007: 'Duplicate invoice',
  SF008: 'Duplicate part row',
  SF009: 'Invalid HSN code',
  SF010: 'Invalid SAC code',
  SF011: 'Conflicting values',
  SF012: 'Low AI confidence',
  SF013: 'Unmapped text',
  SF014: 'Missing estimate section',
  SF015: 'Invalid labour amount',
  SF016: 'Invalid invoice amount',
  SF017: 'Invalid vehicle number',
};

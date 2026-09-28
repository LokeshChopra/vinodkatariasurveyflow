import {
  SurveyRecord,
  PolicyData,
  VehicleData,
  DriverData,
  AccidentParticulars,
  ClientRequestData,
  CompanyRequestData,
  InitialPartRow,
  InitialLabourRow,
  FinalPartRow,
  FinalLabourRow,
  InvoiceRow,
  ReportObservations,
  DocumentRow
} from '../types/survey';
import { calculateSummary } from './calculations';
import { validateSurveyData } from './validation';

export interface JsonImportStats {
  policyFields: number;
  vehicleFields: number;
  clientDocRows: number;
  companyDocRows: number;
  initialParts: number;
  initialLabour: number;
  finalParts: number;
  finalLabour: number;
  invoices: number;
  observations: number;
  totalFieldsFilled: number;
  /** Sections that actually received data from the supplied JSON (not pre-existing record data). */
  matchedSections: string[];
}

export interface JsonImportResult {
  success: boolean;
  record?: SurveyRecord;
  stats?: JsonImportStats;
  error?: string;
}

/**
 * Intelligent JSON normalizer and survey table populator.
 * Supports:
 * - Direct SurveyRecord format
 * - Flat keys (camelCase or snake_case)
 * - Mixed / Partial datasets
 * - Syncs Initial Estimate selection to Final Estimate
 */
export function populateSurveyFromJson(
  rawJsonInput: any,
  existingRecord: SurveyRecord
): JsonImportResult {
  try {
    let parsed: any;
    if (typeof rawJsonInput === 'string') {
      try {
        // Accept normal JSON plus common Markdown/code-block pastes such as
        // ```json ... ``` and stray BOM/whitespace. Users frequently copy
        // generated JSON directly from ChatGPT or a PDF/OCR workflow.
        const cleanedInput = rawJsonInput
          .replace(/^\uFEFF/, '')
          .trim()
          .replace(/^```(?:json|JSON|javascript|js)?\s*/i, '')
          .replace(/\s*```$/, '')
          .trim();
        parsed = JSON.parse(cleanedInput);
      } catch (err: any) {
        return {
          success: false,
          error: `Invalid JSON syntax: ${err?.message || 'Check quotes, brackets or commas'}`,
        };
      }
    } else if (typeof rawJsonInput === 'object' && rawJsonInput !== null) {
      parsed = rawJsonInput;
    } else {
      return {
        success: false,
        error: 'Provided JSON data must be a valid JSON object or string.',
      };
    }

    if (Array.isArray(parsed)) {
      // If user pasted an array of parts, labour, or invoices directly
      if (parsed.length > 0) {
        const first = parsed[0] || {};
        const isLabour = Boolean(first.sac || first['SAC Code'] || first.sacCode || first.labourDescription || first['Labour Description']);
        const isInvoice = Boolean(first.invoiceNumber || first['Invoice Number'] || first.vendor);
        if (isLabour) {
          parsed = { initialEstimate: { labour: parsed, parts: [] } };
        } else if (isInvoice) {
          parsed = { invoices: parsed };
        } else {
          // Default to parts list for Initial Estimate
          parsed = { initialEstimate: { parts: parsed, labour: [] } };
        }
      } else {
        parsed = { initialEstimate: { parts: [], labour: [] } };
      }
    } else if (typeof parsed === 'object' && parsed !== null) {
      // If user passed a single part row object directly at the root
      const hasPartKeys = Boolean(
        parsed['Parts Description'] ||
        parsed['partsDescription'] ||
        parsed['part_description'] ||
        parsed['Part Description'] ||
        parsed['description'] ||
        parsed['partName'] ||
        parsed['E. No.'] ||
        parsed['eNo'] ||
        parsed['Estimated ₹']
      );
      const hasSectionKeys = Boolean(
        parsed.policy ||
        parsed.vehicle ||
        parsed.initialEstimate ||
        parsed.initial_estimate ||
        parsed.finalEstimate ||
        parsed.final_estimate ||
        parsed.parts ||
        parsed.labour
      );

      if (hasPartKeys && !hasSectionKeys) {
        parsed = { initialEstimate: { parts: [parsed], labour: [] } };
      }
    }

    let stats: JsonImportStats = {
      policyFields: 0,
      vehicleFields: 0,
      clientDocRows: 0,
      companyDocRows: 0,
      initialParts: 0,
      initialLabour: 0,
      finalParts: 0,
      finalLabour: 0,
      invoices: 0,
      observations: 0,
      totalFieldsFilled: 0,
      matchedSections: [],
    };

    // Robust numeric parser for values with ₹, Rs, commas, slashes, or dashes
    const parseNumeric = (val: any, defaultVal: number = 0): number => {
      if (val === undefined || val === null || val === '' || val === '---' || val === '-' || val === 'null') {
        return defaultVal;
      }
      if (typeof val === 'number') {
        return isNaN(val) ? defaultVal : val;
      }
      if (typeof val === 'string') {
        const clean = val.replace(/[₹Rs,\s\/-]/gi, '').trim();
        if (!clean) return defaultVal;
        const num = parseFloat(clean);
        return isNaN(num) ? defaultVal : num;
      }
      return defaultVal;
    };

    const parseNullableNumeric = (val: any): number | null => {
      if (val === undefined || val === null || val === '' || val === '---' || val === '-' || val === 'null') {
        return null;
      }
      const num = parseNumeric(val, NaN);
      return isNaN(num) ? null : num;
    };

    // Normalize keys/labels so JSON can use human labels such as
    // "Policy / Cover Note No.", "Vehicle Registration Number (Regn Mark)",
    // "Insured Name", "Labour Description", etc.
    const normalizeKey = (value: any): string =>
      String(value ?? '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]/g, '');

    const hasValue = (value: any): boolean =>
      value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '');

    // Find a named section anywhere in the JSON tree. This lets imports work even
    // when the user sends sections under names such as "Insurance Particulars",
    // "Vehicle Particulars", "Policy & Vehicle", "Final Estimate", etc.
    const findSection = (root: any, aliases: string[]): any => {
      const aliasSet = new Set(aliases.map(normalizeKey));
      const visited = new Set<any>();
      const walk = (node: any): any => {
        if (!node || typeof node !== 'object' || visited.has(node)) return undefined;
        visited.add(node);
        for (const [key, value] of Object.entries(node)) {
          if (aliasSet.has(normalizeKey(key)) && value && typeof value === 'object') return value;
        }
        for (const value of Object.values(node)) {
          const found = walk(value);
          if (found) return found;
        }
        return undefined;
      };
      return walk(root);
    };

    // Find an array by semantic key anywhere in the JSON tree. This is used as
    // a last-resort importer fallback so estimate_parts/estimate_labour still
    // work when an AI/OCR response wraps them inside `data`, `result`, `survey`,
    // or another container object.
    const findArrayByAliases = (root: any, aliases: string[]): any[] | undefined => {
      const aliasSet = new Set(aliases.map(normalizeKey));
      const visited = new Set<any>();
      const walk = (node: any): any[] | undefined => {
        if (!node || typeof node !== 'object' || visited.has(node)) return undefined;
        visited.add(node);
        for (const [key, value] of Object.entries(node)) {
          if (aliasSet.has(normalizeKey(key)) && Array.isArray(value)) return value;
        }
        for (const value of Object.values(node)) {
          if (value && typeof value === 'object') {
            const found = walk(value);
            if (found) return found;
          }
        }
        return undefined;
      };
      return walk(root);
    };

    // Deep flexible field extractor matching case-insensitively, ignoring punctuation,
    // and searching nested sections as a fallback.
    const extractRowField = (row: any, ...fieldCandidates: string[]): any => {
      if (!row || typeof row !== 'object') return undefined;
      // 1. Direct candidate check
      for (const candidate of fieldCandidates) {
        if (row[candidate] !== undefined && row[candidate] !== null && row[candidate] !== '') {
          return row[candidate];
        }
      }
      // 2. Normalized check (lowercase alphanumeric only)
      const normCandidates = fieldCandidates.map((c) => c.toLowerCase().replace(/[^a-z0-9]/g, ''));
      for (const [k, v] of Object.entries(row)) {
        if (v !== undefined && v !== null && v !== '') {
          const normK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normCandidates.includes(normK)) {
            return v;
          }
        }
      }
      return undefined;
    };

    // Helper to get a value from a section using exact, normalized, or nested labels.
    // The final recursive fallback is what makes human-readable JSON labels work.
    const getVal = (nestedObj: any, ...keys: string[]): any => {
      const candidateSet = new Set(keys.map(normalizeKey));
      const search = (node: any, allowRecursive: boolean): any => {
        if (!node || typeof node !== 'object') return undefined;

        // First pass: exact/normalized keys at this level.
        for (const [key, value] of Object.entries(node)) {
          if (candidateSet.has(normalizeKey(key)) && hasValue(value)) return value;
        }

        if (!allowRecursive) return undefined;

        // Second pass: nested objects/arrays.
        for (const value of Object.values(node)) {
          if (value && typeof value === 'object') {
            const found = search(value, true);
            if (hasValue(found)) return found;
          }
        }
        return undefined;
      };

      const local = search(nestedObj, true);
      if (hasValue(local)) return local;
      return search(parsed, true);
    };

    const normalizeDateInput = (value: any): any => {
      if (!hasValue(value)) return value;
      const text = String(value).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
      const m = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
      if (m) {
        const [, dd, mm, yyyy] = m;
        return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      }
      const iso = text.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/);
      if (iso) {
        const [, yyyy, mm, dd] = iso;
        return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
      }
      return value;
    };

    // 1. Populate Policy. Section matching is deliberately broad so both
    // structured JSON and human-labelled JSON land in the same table.
    const polSrc = parsed.policy || parsed.policyDetails || parsed.insurancePolicy ||
      findSection(parsed, [
        'policy', 'policy details', 'insurance policy', 'insurance particulars',
        'policy particulars', 'policy information', 'insurance details', 'policy & vehicle',
        'policy and vehicle particulars'
      ]) || {};
    const newPolicy: PolicyData = { ...existingRecord.policy };

    const policyMappings: Array<{ key: keyof PolicyData; candidates: string[] }> = [
      { key: 'policyNumber', candidates: ['policyNumber', 'policy_number', 'policyNo', 'policy_no', 'polNo', 'coverNoteNo', 'cover_note_no', 'policyCoverNoteNo', 'policyCoverNoteNumber', 'Policy / Cover Note No.'] },
      { key: 'policyStartDate', candidates: ['policyStartDate', 'policy_start_date', 'startDate', 'start_date', 'periodFrom', 'period_from', 'periodOfInsuranceFrom', 'insuranceStartDate', 'fromDate', 'From'] },
      { key: 'policyEndDate', candidates: ['policyEndDate', 'policy_end_date', 'endDate', 'end_date', 'periodTo', 'period_to', 'periodOfInsuranceTo', 'insuranceEndDate', 'toDate', 'To'] },
      { key: 'policyType', candidates: ['policyType', 'policy_type', 'typeOfPolicy'] },
      { key: 'endorsement', candidates: ['endorsement', 'endorsementNo', 'endorsementNumber'] },
      { key: 'insuranceCompany', candidates: ['insuranceCompany', 'insurance_company', 'insurer', 'companyName', 'insurance_co', 'insurers', 'Insurers', 'Insurance Company'] },
      { key: 'insuredName', candidates: ['insuredName', 'insured_name', 'clientName', 'customerName', 'policyHolder', 'insured', 'Insured', 'Insured Name'] },
      { key: 'insuredAddress', candidates: ['insuredAddress', 'insured_address', 'address', 'insuredLocation'] },
      { key: 'insuredMobile', candidates: ['insuredMobile', 'insured_mobile', 'mobile', 'phone', 'contactNumber', 'insuredPhone'] },
      { key: 'idv', candidates: ['idv', 'insuredDeclaredValue', 'idvAmount', 'idv_amount', 'IDV', 'IDV Amount'] },
      { key: 'sumInsured', candidates: ['sumInsured', 'sum_insured', 'totalSumInsured'] },
      { key: 'claimNumber', candidates: ['claimNumber', 'claim_number', 'claimNo', 'claim_no', 'clmNo', 'Claim No.', 'Claim Number'] },
      { key: 'surveyNumber', candidates: ['surveyNumber', 'survey_number', 'surveyNo', 'survey_no'] },
      { key: 'lossDate', candidates: ['lossDate', 'loss_date', 'dateOfLoss', 'date_of_loss', 'accidentDate'] },
      { key: 'lossLocation', candidates: ['lossLocation', 'loss_location', 'placeOfLoss', 'place_of_accident', 'accidentLocation'] },
      { key: 'policyExcess', candidates: ['policyExcess', 'policy_excess', 'excess', 'compulsoryExcess', 'deductibleAmount'] },
      { key: 'deductible', candidates: ['deductible', 'compulsoryDeductible', 'excessDeductible'] },
      { key: 'ncb', candidates: ['ncb', 'noClaimBonus', 'ncbPercentage', 'ncb_percent'] },
      { key: 'previousPolicyNumber', candidates: ['previousPolicyNumber', 'previous_policy_number', 'prevPolicyNo'] },
      { key: 'previousInsuranceCompany', candidates: ['previousInsuranceCompany', 'previous_insurance_company', 'prevInsurer'] },
      { key: 'hpa', candidates: ['hpa', 'hpA', 'hypothecation', 'hypothecationBank', 'H. P. A.'] },
      { key: 'appointedBy', candidates: ['appointedBy', 'appointed_by', 'appointed', 'Appointed By'] },
    ];

    policyMappings.forEach(({ key, candidates }) => {
      const v = getVal(polSrc, ...candidates);
      if (v !== undefined) {
        (newPolicy as any)[key] = key === 'policyStartDate' || key === 'policyEndDate' || key === 'lossDate'
          ? normalizeDateInput(v)
          : v;
        stats.policyFields++;
      }
    });

    // 2. Populate Vehicle
    const vehSrc = parsed.vehicle || parsed.vehicleDetails ||
      findSection(parsed, ['vehicle', 'vehicle details', 'vehicle particulars', 'vehicle information', 'car details', 'vehicle data']) || {};
    const newVehicle: VehicleData = { ...existingRecord.vehicle };

    const vehicleMappings: Array<{ key: keyof VehicleData; candidates: string[] }> = [
      { key: 'registrationNumber', candidates: ['registrationNumber', 'registration_number', 'regNo', 'reg_no', 'vehicleNumber', 'vehicle_number', 'rcNumber', 'rc_number', 'rcNo', 'registeredNumber', 'registered_number', 'registeredNo', 'regnMark', 'regnMarkNumber', 'Vehicle Registration Number', 'Registration No.'] },
      { key: 'rcNumber', candidates: ['rcNumber', 'rc_number', 'rcNo', 'registrationNumber', 'regNo'] },
      { key: 'make', candidates: ['make', 'vehicleMake', 'manufacturer', 'brand', 'Make', 'Manufacturer'] },
      { key: 'model', candidates: ['model', 'vehicleModel', 'Model'] },
      { key: 'variant', candidates: ['variant', 'vehicleVariant', 'subModel', 'version'] },
      { key: 'vehicleType', candidates: ['vehicleType', 'vehicle_type', 'classOfVehicle', 'vehicleClass'] },
      { key: 'engineNumber', candidates: ['engineNumber', 'engine_number', 'engineNo', 'engine_no', 'Engine No.', 'Engine Number'] },
      { key: 'chassisNumber', candidates: ['chassisNumber', 'chassis_number', 'chassisNo', 'chassis_no', 'vin', 'Chassis No.', 'Chassis Number'] },
      { key: 'yearOfManufacture', candidates: ['yearOfManufacture', 'year_of_manufacture', 'manufacturingYear', 'mfgYear', 'year'] },
      { key: 'dateOfRegistration', candidates: ['dateOfRegistration', 'date_of_registration', 'regDate', 'registrationDate', 'Date of Registration'] },
    ];

    vehicleMappings.forEach(({ key, candidates }) => {
      const v = getVal(vehSrc, ...candidates);
      if (v !== undefined) {
        (newVehicle as any)[key] = key === 'dateOfRegistration' ? normalizeDateInput(v) : v;
        stats.vehicleFields++;
      }
    });

    if (stats.policyFields > 0 || stats.vehicleFields > 0) {
      stats.matchedSections.push('policy');
    }

    // Populate additional vehicle attributes from report
    newVehicle.registeredOwner = getVal(vehSrc, 'registeredOwner', 'registered_owner', 'owner') ?? newPolicy.insuredName ?? existingRecord.vehicle.registeredOwner;
    newVehicle.ownerSerialNo = getVal(vehSrc, 'ownerSerialNo', 'owner_serial_no', 'ownerSerial') ?? existingRecord.vehicle.ownerSerialNo ?? '01';
    newVehicle.makeVariantColor = getVal(vehSrc, 'makeVariantColor', 'make_variant_color', 'makeModelColor') ?? existingRecord.vehicle.makeVariantColor;
    newVehicle.typeOfBody = getVal(vehSrc, 'typeOfBody', 'type_of_body', 'bodyType') ?? existingRecord.vehicle.typeOfBody ?? 'STATION WAGON - MOTOR CAR';
    newVehicle.preAccidentCondition = getVal(vehSrc, 'preAccidentCondition', 'pre_accident_condition') ?? existingRecord.vehicle.preAccidentCondition ?? 'GOOD';
    newVehicle.seatingCapacity = getVal(vehSrc, 'seatingCapacity', 'seating_capacity') ?? existingRecord.vehicle.seatingCapacity ?? '05 Nos.';
    newVehicle.cubicCapacity = getVal(vehSrc, 'cubicCapacity', 'cubic_capacity', 'cc') ?? existingRecord.vehicle.cubicCapacity;
    newVehicle.fuelUsed = getVal(vehSrc, 'fuelUsed', 'fuel_used', 'fuel') ?? existingRecord.vehicle.fuelUsed ?? 'DIESEL';
    newVehicle.taxParticulars = getVal(vehSrc, 'taxParticulars', 'tax_particulars', 'tax') ?? existingRecord.vehicle.taxParticulars ?? 'LIFE TIME';
    newVehicle.odometerReading = getVal(vehSrc, 'odometerReading', 'odometer_reading', 'speedometerReading', 'odometer', 'kms') ?? existingRecord.vehicle.odometerReading;
    newVehicle.pucNo = getVal(vehSrc, 'pucNo', 'puc_no') ?? existingRecord.vehicle.pucNo;
    newVehicle.pucValidUpto = getVal(vehSrc, 'pucValidUpto', 'puc_valid_upto') ?? existingRecord.vehicle.pucValidUpto;

    // 2.1 Populate Driver Particulars
    const driverSrc = parsed.driver || parsed.driverDetails || parsed.driver_particulars ||
      findSection(parsed, ['driver', 'driver details', 'driver particulars', 'driver information']) || {};
    const newDriver: DriverData = {
      name: getVal(driverSrc, 'name', 'driverName', 'driver_name') ?? existingRecord.driver?.name ?? '',
      age: getVal(driverSrc, 'age', 'driverAge', 'driver_age') ?? existingRecord.driver?.age ?? '',
      drivingLicenseNumber: getVal(driverSrc, 'drivingLicenseNumber', 'dlNumber', 'licenseNumber', 'dl_number', 'dlNo') ?? existingRecord.driver?.drivingLicenseNumber ?? '',
      dateOfIssue: getVal(driverSrc, 'dateOfIssue', 'date_of_issue', 'issueDate') ?? existingRecord.driver?.dateOfIssue ?? '',
      validUptoNTV: getVal(driverSrc, 'validUptoNTV', 'valid_upto_ntv', 'validUpto', 'validityNTV') ?? existingRecord.driver?.validUptoNTV ?? '',
      validUptoTV: getVal(driverSrc, 'validUptoTV', 'valid_upto_tv', 'validityTV') ?? existingRecord.driver?.validUptoTV ?? '',
      validFrom: getVal(driverSrc, 'validFrom', 'valid_from') ?? existingRecord.driver?.validFrom ?? '',
      issuingAuthority: getVal(driverSrc, 'issuingAuthority', 'issuing_authority', 'rto') ?? existingRecord.driver?.issuingAuthority ?? '',
      typeOfLicense: getVal(driverSrc, 'typeOfLicense', 'type_of_license', 'licenseType') ?? existingRecord.driver?.typeOfLicense ?? 'M/c wgr + LMV-NT Only.',
    };

    // 2.2 Populate Accident & Survey Particulars
    const accSrc = parsed.accident || parsed.accidentDetails || parsed.accident_particulars ||
      findSection(parsed, ['accident', 'accident details', 'accident particulars', 'accident & survey particulars', 'survey particulars']) || {};
    const newAccident: AccidentParticulars = {
      dateTimeOfAccident: getVal(accSrc, 'dateTimeOfAccident', 'date_time_of_accident', 'accidentDateTime', 'lossDate') ?? existingRecord.accident?.dateTimeOfAccident ?? '',
      placeOfAccident: getVal(accSrc, 'placeOfAccident', 'place_of_accident', 'accidentPlace', 'lossLocation') ?? existingRecord.accident?.placeOfAccident ?? '',
      placeOfSurvey: getVal(accSrc, 'placeOfSurvey', 'place_of_survey', 'surveyPlace', 'workshop') ?? existingRecord.accident?.placeOfSurvey ?? '',
      dateOfAllotment: getVal(accSrc, 'dateOfAllotment', 'date_of_allotment', 'allotmentDate') ?? existingRecord.accident?.dateOfAllotment ?? '',
      dateTimeOfSurvey: getVal(accSrc, 'dateTimeOfSurvey', 'date_time_of_survey', 'surveyDate') ?? existingRecord.accident?.dateTimeOfSurvey ?? '',
      dateOfReceiptSpotReport: getVal(accSrc, 'dateOfReceiptSpotReport', 'date_of_receipt_spot_report') ?? existingRecord.accident?.dateOfReceiptSpotReport ?? '',
      reinspectionDate: getVal(accSrc, 'reinspectionDate', 'reinspection_date', 'reInspectionDate') ?? existingRecord.accident?.reinspectionDate ?? '',
    };

    // 3. Populate Client Request
    const crSrc = parsed.clientRequest || parsed.client_request ||
      findSection(parsed, ['client request', 'client requests', 'client request details', 'client particulars']) || {};
    const newClientRequest: ClientRequestData = {
      ...existingRecord.clientRequest,
      clientName: getVal(crSrc, 'clientName', 'client_name', 'customerName') ?? newPolicy.insuredName ?? existingRecord.clientRequest.clientName,
      mobileNumber: getVal(crSrc, 'mobileNumber', 'mobile_number', 'phone', 'contactMobile') ?? newPolicy.insuredMobile ?? existingRecord.clientRequest.mobileNumber,
      email: getVal(crSrc, 'email', 'clientEmail', 'contactEmail') ?? existingRecord.clientRequest.email,
      policyNumber: getVal(crSrc, 'policyNumber', 'policy_number', 'policyNo') ?? newPolicy.policyNumber ?? existingRecord.clientRequest.policyNumber,
      claimNumber: getVal(crSrc, 'claimNumber', 'claim_number', 'claimNo') ?? newPolicy.claimNumber ?? existingRecord.clientRequest.claimNumber,
      vehicleNumber: getVal(crSrc, 'vehicleNumber', 'vehicle_number', 'regNo') ?? newVehicle.registrationNumber ?? existingRecord.clientRequest.vehicleNumber,
      requestDate: getVal(crSrc, 'requestDate', 'request_date', 'date') ?? existingRecord.clientRequest.requestDate,
      clientRemarks: getVal(crSrc, 'clientRemarks', 'client_remarks', 'remarks') ?? existingRecord.clientRequest.clientRemarks,
      requestStatus: getVal(crSrc, 'requestStatus', 'request_status', 'status') ?? existingRecord.clientRequest.requestStatus,
      followUpDate: getVal(crSrc, 'followUpDate', 'follow_up_date', 'followupDate') ?? existingRecord.clientRequest.followUpDate,
    };

    if (Array.isArray(crSrc.requestedDocuments || crSrc.documents || crSrc.documentList)) {
      const docList = crSrc.requestedDocuments || crSrc.documents || crSrc.documentList;
      newClientRequest.requestedDocuments = docList.map((d: any, idx: number): DocumentRow => ({
        id: d.id || `doc-${Date.now()}-${idx}`,
        documentName: d.documentName || d.name || d.document || `Document ${idx + 1}`,
        status: d.status || 'Pending',
        remarks: d.remarks || d.remark || '',
      }));
      stats.clientDocRows = newClientRequest.requestedDocuments.length;
    }
    const clientHasInput = Boolean(parsed.clientRequest || parsed.client_request || findSection(parsed, ['client request', 'client requests', 'client request details', 'client particulars']));
    if (clientHasInput) stats.matchedSections.push('client-request');

    // 4. Populate Company Request
    const compSrc = parsed.companyRequest || parsed.company_request ||
      findSection(parsed, ['company request', 'company requests', 'company request details', 'company particulars']) || {};
    const newCompanyRequest: CompanyRequestData = {
      ...existingRecord.companyRequest,
      companyName: getVal(compSrc, 'companyName', 'company_name', 'insuranceCompany') ?? newPolicy.insuranceCompany ?? existingRecord.companyRequest.companyName,
      companyEmail: getVal(compSrc, 'companyEmail', 'company_email', 'email', 'insurerEmail', 'insurer_email') ?? existingRecord.companyRequest.companyEmail ?? '',
      portalUrl: getVal(compSrc, 'portalUrl', 'portal_url', 'portalLink', 'portal_link', 'companyPortalLink', 'link', 'url', 'claimUrl', 'claim_url') ?? existingRecord.companyRequest.portalUrl ?? '',
      claimNumber: getVal(compSrc, 'claimNumber', 'claim_number', 'claimNo') ?? newPolicy.claimNumber ?? existingRecord.companyRequest.claimNumber,
      policyNumber: getVal(compSrc, 'policyNumber', 'policy_number', 'policyNo') ?? newPolicy.policyNumber ?? existingRecord.companyRequest.policyNumber,
      vehicleNumber: getVal(compSrc, 'vehicleNumber', 'vehicle_number', 'regNo') ?? newVehicle.registrationNumber ?? existingRecord.companyRequest.vehicleNumber,
      requestDate: getVal(compSrc, 'requestDate', 'request_date') ?? existingRecord.companyRequest.requestDate,
      surveyorName: getVal(compSrc, 'surveyorName', 'surveyor_name', 'surveyor') ?? existingRecord.companyRequest.surveyorName,
      companyRemarks: getVal(compSrc, 'companyRemarks', 'company_remarks', 'remarks') ?? existingRecord.companyRequest.companyRemarks,
      responseStatus: getVal(compSrc, 'responseStatus', 'response_status', 'status') ?? existingRecord.companyRequest.responseStatus,
      followUpDate: getVal(compSrc, 'followUpDate', 'follow_up_date') ?? existingRecord.companyRequest.followUpDate,
    };

    if (Array.isArray(compSrc.requiredDocuments || compSrc.documents)) {
      const docList = compSrc.requiredDocuments || compSrc.documents;
      newCompanyRequest.requiredDocuments = docList.map((d: any, idx: number): DocumentRow => ({
        id: d.id || `cdoc-${Date.now()}-${idx}`,
        documentName: d.documentName || d.name || `Document ${idx + 1}`,
        status: d.status || 'Pending',
        remarks: d.remarks || '',
      }));
      stats.companyDocRows = newCompanyRequest.requiredDocuments.length;
    }
    const companyHasInput = Boolean(parsed.companyRequest || parsed.company_request || findSection(parsed, ['company request', 'company requests', 'company request details', 'company particulars']));
    if (companyHasInput) stats.matchedSections.push('company-request');

    // 5. Populate Initial Estimate (Parts & Labour)
    // Match both schema keys and human-readable section names such as
    // "Initial Estimate", "Parts Estimate" and "Labour & Repairs".
    const initialSection = parsed.initialEstimate || parsed.initial_estimate || parsed.estimate ||
      findSection(parsed, [
        'estimate', 'estimates', 'initial estimate', 'initial estimate details', 'initial estimate data',
        'parts estimate', 'parts estimates', 'parts', 'labour & repairs', 'labour and repairs',
        'labour estimate', 'labour estimates'
      ]);
    let rawInitParts: any[] = [];
    if (Array.isArray(parsed.initialEstimate)) {
      rawInitParts = parsed.initialEstimate;
    } else if (Array.isArray(parsed.initial_estimate)) {
      rawInitParts = parsed.initial_estimate;
    } else if (Array.isArray(parsed.initialEstimate?.parts)) {
      rawInitParts = parsed.initialEstimate.parts;
    } else if (Array.isArray(parsed.initial_estimate?.parts)) {
      rawInitParts = parsed.initial_estimate.parts;
    } else if (Array.isArray(initialSection)) {
      const first = initialSection[0] || {};
      const looksLikeLabour = Boolean(first.sac || first.SAC || first.sacCode || first.labourDescription || first['Labour Description']);
      if (!looksLikeLabour) rawInitParts = initialSection;
    } else if (Array.isArray(initialSection?.parts)) {
      rawInitParts = initialSection.parts;
    } else if (Array.isArray(initialSection?.partsEstimate)) {
      rawInitParts = initialSection.partsEstimate;
    } else if (Array.isArray(parsed.parts)) {
      rawInitParts = parsed.parts;
    } else if (Array.isArray(parsed.initialParts)) {
      rawInitParts = parsed.initialParts;
    } else if (Array.isArray(parsed.partsList)) {
      rawInitParts = parsed.partsList;
    } else if (Array.isArray(parsed.partsEstimate)) {
      rawInitParts = parsed.partsEstimate;
    } else if (Array.isArray(parsed.estimate_parts)) {
      rawInitParts = parsed.estimate_parts;
    } else if (Array.isArray(parsed.estimateParts)) {
      rawInitParts = parsed.estimateParts;
    } else if (Array.isArray(parsed['Parts Estimate'])) {
      rawInitParts = parsed['Parts Estimate'];
    } else if (Array.isArray(parsed.parts_estimate)) {
      rawInitParts = parsed.parts_estimate;
    } else if (Array.isArray(parsed.estimate?.parts)) {
      rawInitParts = parsed.estimate.parts;
    } else if (Array.isArray(parsed.estimate?.partsEstimate)) {
      rawInitParts = parsed.estimate.partsEstimate;
    } else if (Array.isArray(parsed.partsEstimate?.parts)) {
      rawInitParts = parsed.partsEstimate.parts;
    } else if (Array.isArray(parsed['Parts Estimate']?.parts)) {
      rawInitParts = parsed['Parts Estimate'].parts;
    } else if (Array.isArray(parsed.items)) {
      rawInitParts = parsed.items;
    } else if (Array.isArray(parsed.rows)) {
      rawInitParts = parsed.rows;
    } else if (Array.isArray(parsed.data)) {
      rawInitParts = parsed.data;
    } else if (Array.isArray(parsed['Initial Estimate'])) {
      rawInitParts = parsed['Initial Estimate'];
    } else if (Array.isArray(parsed['Initial Estimate']?.parts)) {
      rawInitParts = parsed['Initial Estimate'].parts;
    } else if (Array.isArray(parsed['Parts'])) {
      rawInitParts = parsed['Parts'];
    }

    let rawInitLabour: any[] = [];
    if (Array.isArray(initialSection) && initialSection.length > 0) {
      const first = initialSection[0] || {};
      const looksLikeLabour = Boolean(first.sac || first.SAC || first.sacCode || first.labourDescription || first['Labour Description']);
      if (looksLikeLabour) rawInitLabour = initialSection;
    } else if (Array.isArray(initialSection?.labour)) {
      rawInitLabour = initialSection.labour;
    } else if (Array.isArray(initialSection?.labourRepairs)) {
      rawInitLabour = initialSection.labourRepairs;
    } else if (Array.isArray(initialSection?.labourAndRepairs)) {
      rawInitLabour = initialSection.labourAndRepairs;
    } else if (Array.isArray(parsed.initialEstimate?.labour)) {
      rawInitLabour = parsed.initialEstimate.labour;
    } else if (Array.isArray(parsed.initial_estimate?.labour)) {
      rawInitLabour = parsed.initial_estimate.labour;
    } else if (Array.isArray(parsed.labour)) {
      rawInitLabour = parsed.labour;
    } else if (Array.isArray(parsed.initialLabour)) {
      rawInitLabour = parsed.initialLabour;
    } else if (Array.isArray(parsed.labourList)) {
      rawInitLabour = parsed.labourList;
    } else if (Array.isArray(parsed.labourEstimate)) {
      rawInitLabour = parsed.labourEstimate;
    } else if (Array.isArray(parsed['Labour Estimate'])) {
      rawInitLabour = parsed['Labour Estimate'];
    } else if (Array.isArray(parsed.labourRepairs)) {
      rawInitLabour = parsed.labourRepairs;
    } else if (Array.isArray(parsed.labourAndRepairs)) {
      rawInitLabour = parsed.labourAndRepairs;
    } else if (Array.isArray(parsed['Labour & Repairs'])) {
      rawInitLabour = parsed['Labour & Repairs'];
    } else if (Array.isArray(parsed.estimate_labour)) {
      rawInitLabour = parsed.estimate_labour;
    } else if (Array.isArray(parsed.estimateLabour)) {
      rawInitLabour = parsed.estimateLabour;
    } else if (Array.isArray(parsed.labour_estimate)) {
      rawInitLabour = parsed.labour_estimate;
    } else if (Array.isArray(parsed['Labour and Repairs'])) {
      rawInitLabour = parsed['Labour and Repairs'];
    } else if (Array.isArray(parsed.estimate?.labour)) {
      rawInitLabour = parsed.estimate.labour;
    } else if (Array.isArray(parsed.estimate?.labourRepairs)) {
      rawInitLabour = parsed.estimate.labourRepairs;
    } else if (Array.isArray(parsed.estimate?.labourAndRepairs)) {
      rawInitLabour = parsed.estimate.labourAndRepairs;
    } else if (Array.isArray(parsed['Labour'])) {
      rawInitLabour = parsed['Labour'];
    }

    // If a generic "Estimate" is supplied as one mixed array, split the rows
    // into Parts Estimate and Labour & Repairs by their field names.
    if (Array.isArray(initialSection) && initialSection.length > 0) {
      const labourRows = initialSection.filter((row: any) =>
        Boolean(row && (row.sac || row.SAC || row.sacCode || row.labourDescription || row['Labour Description'] || row.labourName || row.operation))
      );
      const partRows = initialSection.filter((row: any) =>
        !Boolean(row && (row.sac || row.SAC || row.sacCode || row.labourDescription || row['Labour Description'] || row.labourName || row.operation))
      );
      if (partRows.length > 0) rawInitParts = partRows;
      if (labourRows.length > 0) rawInitLabour = labourRows;
    }

    // Generic "estimate" payload fallback: parts and labour still belong to
    // Initial Estimate unless the JSON explicitly provides a Final Estimate section.
    // Explicit snake_case estimate keys are supported because many OCR/AI schemas
    // emit `estimate_parts` and `estimate_labour` at the root level.
    if (rawInitParts.length === 0 && Array.isArray(parsed.estimate_parts)) {
      rawInitParts = parsed.estimate_parts;
    }
    if (rawInitLabour.length === 0 && Array.isArray(parsed.estimate_labour)) {
      rawInitLabour = parsed.estimate_labour;
    }
    // Strong explicit aliases. These are checked recursively because this is
    // the canonical schema emitted by the user's estimate JSON.
    if (rawInitParts.length === 0) {
      rawInitParts = findArrayByAliases(parsed, [
        'estimate_parts', 'estimateParts', 'parts_estimate', 'partsEstimate',
        'initial_estimate_parts', 'initialEstimateParts'
      ]) || [];
    }
    if (rawInitLabour.length === 0) {
      rawInitLabour = findArrayByAliases(parsed, [
        'estimate_labour', 'estimateLabour', 'labour_estimate', 'labourEstimate',
        'initial_estimate_labour', 'initialEstimateLabour', 'labour_repairs'
      ]) || [];
    }

    const estimatePayload = parsed.estimate || parsed.Estimate || parsed['Estimate'] || {};
    if (rawInitParts.length === 0 && estimatePayload && typeof estimatePayload === 'object') {
      const estimateParts = estimatePayload.parts || estimatePayload.partsEstimate || estimatePayload['Parts Estimate'];
      if (Array.isArray(estimateParts)) rawInitParts = estimateParts;
    }
    if (rawInitLabour.length === 0 && estimatePayload && typeof estimatePayload === 'object') {
      const estimateLabour = estimatePayload.labour || estimatePayload.labourRepairs || estimatePayload.labourAndRepairs || estimatePayload['Labour & Repairs'] || estimatePayload['Labour and Repairs'];
      if (Array.isArray(estimateLabour)) rawInitLabour = estimateLabour;
    }

    const newInitialParts: InitialPartRow[] = rawInitParts.length > 0
      ? rawInitParts.map((p: any, idx: number): InitialPartRow => {
          const rawENo = extractRowField(p, 'eNo', 'E. No.', 'E. No', 'E.No.', 'E.No', 'E No', 'eno', 'e_no', 'itemNo', 'serialNo', 'sNo', 's_no', 'S.No');
          const eNo = rawENo !== undefined ? String(rawENo) : String(idx + 1);

          const desc = extractRowField(p, 'partsDescription', 'Parts Description', 'Part Description', 'parts_description', 'part_description', 'itemDescription', 'description', 'partName', 'part_name', 'name', 'item', 'particulars');
          const partsDescription = desc ? String(desc) : `Item ${eNo}`;

          const hsn = extractRowField(p, 'hsnCode', 'HSN Code', 'HSN code', 'HSN', 'hsn_code', 'hsn', 'tariffCode');
          const hsnCode = hsn ? String(hsn) : '87089900';

          const billS = extractRowField(p, 'billSNo', 'Bill S.No', 'Bill S.No.', 'Bill S No', 'Bill SNo', 'bill_s_no', 'bill_sno', 'billNo', 'bill_no', 'Bill No');
          const billSNo = billS ? String(billS) : eNo;

          const rem = extractRowField(p, 'remark', 'Remark', 'remarks', 'Remarks', 'damageRemark', 'status', 'note');
          const remark = rem ? String(rem) : 'Damage';

          const rawEstimated = extractRowField(p, 'estimated', 'Estimated ₹', 'Estimated (₹)', 'Estimated (Rs)', 'Estimated Rs', 'Estimated', 'estimatedAmount', 'estimated_amount', 'estimate', 'amount', 'est', 'rate', 'price', 'cost');
          const estimated = parseNumeric(rawEstimated, 0);

          const rawGlass = extractRowField(p, 'glassSecondHandRepair', 'Glass/Repair', 'Glass / Repair', 'Glass/2nd Hand/Repair', 'glass_repair', 'glass', 'Glass', 'glassRepair', 'repair');
          const glassSecondHandRepair = parseNullableNumeric(rawGlass);

          const rawMetal = extractRowField(p, 'metal35', 'Metal (35)', 'Metal (35%)', 'Metal(35)', 'Metal', 'metal', 'metal_35', 'metal35Percent');
          const metal35 = parseNullableNumeric(rawMetal);

          const rawNonMetal = extractRowField(p, 'nonMetal', 'Non Metal', 'Non-Metal', 'Non metal', 'non_metal', 'nonmetal', 'plastic', 'Plastic', 'fibre');
          let nonMetal = parseNullableNumeric(rawNonMetal);
          if (nonMetal === null && glassSecondHandRepair === null && metal35 === null) {
            nonMetal = estimated > 0 ? estimated : null;
          }

          const rawGst = extractRowField(p, 'gstRate', 'GST %', 'GST', 'GST%', 'gst_rate', 'gst', 'gstPercent', 'gst_percentage', 'GST Percentage', 'tax', 'taxPercent');
          const gstRate = parseNumeric(rawGst, 18);

          const selected = extractRowField(p, 'selectedForFinal', 'selected', 'select', 'isSelected', 'included');
          const selectedForFinal = selected !== undefined ? Boolean(selected) : true;

          return {
            id: p.id || `init-part-${Date.now()}-${idx}`,
            selectedForFinal,
            eNo,
            partsDescription,
            hsnCode,
            billSNo,
            remark,
            estimated,
            glassSecondHandRepair,
            metal35,
            nonMetal,
            gstRate,
          };
        })
      : existingRecord.initialEstimate.parts;

    stats.initialParts = rawInitParts.length;

    const newInitialLabour: InitialLabourRow[] = rawInitLabour.length > 0
      ? rawInitLabour.map((l: any, idx: number): InitialLabourRow => {
          const rawSNo = extractRowField(l, 'sNo', 'S.No', 'S.No.', 'S. No.', 's_no', 'sno', 'serialNo', 'id');
          const sNo = rawSNo !== undefined ? String(rawSNo) : String(idx + 1);

          const sac = extractRowField(l, 'sac', 'SAC Code', 'SAC', 'sacCode', 'sac_code');
          const sacCode = sac ? String(sac) : '998729';

          const billS = extractRowField(l, 'billSNo', 'Bill S.No', 'Bill S.No.', 'bill_s_no', 'billNo', 'bill_no');
          const billSNo = billS ? String(billS) : sNo;

          const desc = extractRowField(l, 'labourDescription', 'Labour Description', 'Description', 'labourName', 'description', 'operation');
          const labourDescription = desc ? String(desc) : `Labour Operation ${sNo}`;

          const rawEst = extractRowField(l, 'estimated', 'Estimated ₹', 'Estimated', 'estimatedAmount', 'amount', 'est', 'rate');
          const estimated = parseNumeric(rawEst, 0);

          const rawAss = extractRowField(l, 'assessed', 'Assessed ₹', 'Assessed', 'assessedAmount', 'ass');
          const assessed = rawAss !== undefined ? parseNumeric(rawAss, estimated) : estimated;

          const rawGst = extractRowField(l, 'gstRate', 'GST %', 'GST', 'GST%', 'gst_rate', 'gst_percentage', 'GST Percentage', 'gst');
          const gstRate = parseNumeric(rawGst, 18);

          const rawTot = extractRowField(l, 'total', 'Total', 'totalAmount');
          const total = rawTot !== undefined ? parseNumeric(rawTot, Math.round((estimated + (estimated * gstRate) / 100) * 100) / 100) : Math.round((estimated + (estimated * gstRate) / 100) * 100) / 100;

          const selected = extractRowField(l, 'selectedForFinal', 'selected', 'select', 'isSelected');
          const selectedForFinal = selected !== undefined ? Boolean(selected) : true;

          return {
            id: l.id || `init-lab-${Date.now()}-${idx}`,
            selectedForFinal,
            sNo,
            sac: sacCode,
            billSNo,
            labourDescription,
            estimated,
            assessed,
            gstRate,
            total,
          };
        })
      : existingRecord.initialEstimate.labour;

    stats.initialLabour = rawInitLabour.length;
    if (rawInitParts.length > 0 || rawInitLabour.length > 0) {
      stats.matchedSections.push('initial-estimate');
    }

    // 6. Populate Final Estimate (Parts & Labour)
    // Match both schema keys and human-readable section names.
    const finalEstSrc = parsed.finalEstimate || parsed.final_estimate ||
      findSection(parsed, ['final estimate', 'final estimate details', 'final survey estimate', 'assessed estimate']) || {};
    const rawFinalParts = Array.isArray(finalEstSrc)
      ? finalEstSrc
      : (finalEstSrc.parts || finalEstSrc.finalParts || finalEstSrc.assessedParts || null);
    const rawFinalLabour = Array.isArray(finalEstSrc)
      ? null
      : (finalEstSrc.labour || finalEstSrc.finalLabour || finalEstSrc.assessedLabour || null);

    let newFinalParts: FinalPartRow[] = [];

    if (Array.isArray(rawFinalParts) && rawFinalParts.length > 0) {
      // If user explicitly provided final estimate parts in JSON
      newFinalParts = rawFinalParts.map((fp: any, idx: number): FinalPartRow => {
        const eNo = String(fp.eNo || fp.eno || idx + 1);
        const estimated = Number(fp.estimated ?? fp.est ?? 0);
        const assessed = Number(fp.assessed ?? fp.ass ?? estimated);
        const depPct = Number(fp.depreciationPercent ?? fp.depPercent ?? fp.dep_pct ?? 0);
        const depAmt = Number(fp.depreciationAmount ?? fp.depAmount ?? Math.round(((assessed * depPct) / 100) * 100) / 100);
        const netAmt = Number(fp.netAmount ?? Math.max(0, Math.round((assessed - depAmt) * 100) / 100));
        return {
          id: fp.id || `final-part-${Date.now()}-${idx}`,
          sourceInitialId: fp.sourceInitialId,
          eNo,
          partsDescription: String(fp.partsDescription || fp.description || 'Assessed Part'),
          hsnCode: String(fp.hsnCode || fp.hsn || '87089900'),
          billSNo: String(fp.billSNo || eNo),
          remark: String(fp.remark || 'Damage'),
          estimated,
          assessed,
          depreciationPercent: depPct,
          depreciationAmount: depAmt,
          glassSecondHandRepair: fp.glassSecondHandRepair !== undefined ? (fp.glassSecondHandRepair === null ? null : Number(fp.glassSecondHandRepair)) : null,
          metal35: fp.metal35 !== undefined ? (fp.metal35 === null ? null : Number(fp.metal35)) : null,
          nonMetal: fp.nonMetal !== undefined ? (fp.nonMetal === null ? null : Number(fp.nonMetal)) : (assessed || 0),
          gstRate: Number(fp.gstRate ?? 18),
          netAmount: netAmt,
        };
      });
    } else {
      // Automatically generate Final Parts strictly from SELECTED Initial Parts!
      newInitialParts.forEach((ip) => {
        if (ip.selectedForFinal !== false) {
          const est = Number(ip.estimated) || 0;
          newFinalParts.push({
            id: `final-part-${ip.id}`,
            sourceInitialId: ip.id,
            eNo: ip.eNo,
            partsDescription: ip.partsDescription,
            hsnCode: ip.hsnCode,
            billSNo: ip.billSNo,
            remark: ip.remark,
            estimated: est,
            assessed: est,
            depreciationPercent: 0,
            depreciationAmount: 0,
            glassSecondHandRepair: ip.glassSecondHandRepair,
            metal35: ip.metal35,
            nonMetal: ip.nonMetal,
            gstRate: ip.gstRate ?? 18,
            netAmount: est,
          });
        }
      });
    }

    stats.finalParts = Array.isArray(rawFinalParts) ? rawFinalParts.length : 0;

    let newFinalLabour: FinalLabourRow[] = [];
    if (Array.isArray(rawFinalLabour) && rawFinalLabour.length > 0) {
      newFinalLabour = rawFinalLabour.map((fl: any, idx: number): FinalLabourRow => {
        const sNo = String(fl.sNo || fl.sno || idx + 1);
        const estimated = Number(fl.estimated ?? 0);
        const assessed = Number(fl.assessed ?? estimated);
        const gstRate = Number(fl.gstRate ?? 18);
        const total = Number(fl.total ?? Math.round((assessed + (assessed * gstRate) / 100) * 100) / 100);
        return {
          id: fl.id || `final-lab-${Date.now()}-${idx}`,
          sourceInitialId: fl.sourceInitialId,
          sNo,
          sac: String(fl.sac || '998729'),
          billSNo: String(fl.billSNo || sNo),
          labourDescription: String(fl.labourDescription || fl.description || 'Assessed Labour'),
          estimated,
          assessed,
          gstRate,
          total,
        };
      });
    } else {
      // Automatically generate Final Labour strictly from SELECTED Initial Labour!
      newInitialLabour.forEach((il) => {
        if (il.selectedForFinal !== false) {
          const est = Number(il.estimated) || 0;
          const ass = Number(il.assessed) || est;
          const rate = il.gstRate ?? 18;
          newFinalLabour.push({
            id: `final-lab-${il.id}`,
            sourceInitialId: il.id,
            sNo: il.sNo,
            sac: il.sac,
            billSNo: il.billSNo,
            labourDescription: il.labourDescription,
            estimated: est,
            assessed: ass,
            gstRate: rate,
            total: Math.round((ass + (ass * rate) / 100) * 100) / 100,
          });
        }
      });
    }

    stats.finalLabour = Array.isArray(rawFinalLabour) ? rawFinalLabour.length : 0;
    if (stats.finalParts > 0 || stats.finalLabour > 0) {
      stats.matchedSections.push('final-estimate');
    }

    // 7. Populate Invoices
    const rawInvoices = parsed.invoices || parsed.invoiceList || parsed.bills || [];
    const newInvoices: InvoiceRow[] = Array.isArray(rawInvoices)
      ? rawInvoices.map((inv: any, idx: number): InvoiceRow => ({
          id: inv.id || `inv-${Date.now()}-${idx}`,
          invoiceNumber: String(inv.invoiceNumber || inv.invoice_number || inv.invoiceNo || inv.billNo || `INV-00${idx + 1}`),
          invoiceDate: String(inv.invoiceDate || inv.invoice_date || inv.date || new Date().toISOString().split('T')[0]),
          invoiceAmount: Number(inv.invoiceAmount || inv.invoice_amount || inv.amount || 0),
          vendor: String(inv.vendor || inv.workshopName || inv.dealer || 'Authorized Bodyshop'),
          gstNumber: String(inv.gstNumber || inv.gst_number || inv.gstin || ''),
          description: String(inv.description || 'Repair and spare parts invoice'),
        }))
      : existingRecord.invoices;

    stats.invoices = Array.isArray(rawInvoices) ? rawInvoices.length : 0;
    if (stats.invoices > 0) stats.matchedSections.push('invoice');

    // 8. Populate Observations
    const obsSrc = parsed.observations || parsed.surveyorObservations || parsed.notes || {};
    const newObservations: ReportObservations = {
      causeOfAccident: getVal(obsSrc, 'causeOfAccident', 'cause_of_accident', 'accidentCause') ?? existingRecord.observations.causeOfAccident,
      natureOfLoss: getVal(obsSrc, 'natureOfLoss', 'nature_of_loss', 'lossNature') ?? existingRecord.observations.natureOfLoss,
      garageNameAndAddress: getVal(obsSrc, 'garageNameAndAddress', 'garage_name', 'garageAddress', 'workshop') ?? existingRecord.observations.garageNameAndAddress,
      inspectionDate: getVal(obsSrc, 'inspectionDate', 'inspection_date') ?? existingRecord.observations.inspectionDate,
      inspectionLocation: getVal(obsSrc, 'inspectionLocation', 'inspection_location', 'surveyLocation') ?? existingRecord.observations.inspectionLocation,
      speedometerReading: getVal(obsSrc, 'speedometerReading', 'speedometer_reading', 'odometer', 'kms') ?? existingRecord.observations.speedometerReading,
      tpDamageOrThirdPartyInjury: getVal(obsSrc, 'tpDamageOrThirdPartyInjury', 'tp_damage', 'thirdPartyDetails') ?? existingRecord.observations.tpDamageOrThirdPartyInjury,
      surveyorNotes: getVal(obsSrc, 'surveyorNotes', 'surveyor_notes', 'remarks') ?? existingRecord.observations.surveyorNotes,
      recommendations: getVal(obsSrc, 'recommendations', 'recommendation') ?? existingRecord.observations.recommendations,
      policeAction: getVal(obsSrc, 'policeAction', 'police_action') ?? existingRecord.observations.policeAction ?? 'Not reported as per claimform.',
      detailsOfLoadPassenger: getVal(obsSrc, 'detailsOfLoadPassenger', 'details_of_load_passenger') ?? existingRecord.observations.detailsOfLoadPassenger ?? 'Not reported.',
      thirdPartyLossInjuries: getVal(obsSrc, 'thirdPartyLossInjuries', 'third_party_loss_injuries') ?? existingRecord.observations.thirdPartyLossInjuries ?? 'Nil as per claimform.',
      particularsOfLossDamages: getVal(obsSrc, 'particularsOfLossDamages', 'particulars_of_loss_damages') ?? existingRecord.observations.particularsOfLossDamages,
      observationDetailed: getVal(obsSrc, 'observationDetailed', 'observation_detailed', 'observation') ?? existingRecord.observations.observationDetailed,
      reinspectionNotes: getVal(obsSrc, 'reinspectionNotes', 'reinspection_notes') ?? existingRecord.observations.reinspectionNotes,
    };

    if (obsSrc && Object.keys(obsSrc).length > 0) {
      stats.observations = Object.keys(obsSrc).length;
      stats.matchedSections.push('final-report');
    }

    // 8b. Preserve/ingest an explicitly supplied assessment summary when present.
    // Calculated totals remain authoritative for table-driven values, but these
    // imported fields are retained where the schema provides them.
    const suppliedSummary = parsed.summary_of_assessment || parsed.summaryOfAssessment || parsed.summary || {};
    const originalEstimate = suppliedSummary.original_estimate || suppliedSummary.originalEstimate || {};
    const assessedFor = suppliedSummary.assessed_for || suppliedSummary.assessedFor || {};
    const suppliedExcess = parseNumeric(assessedFor.less_excess ?? suppliedSummary.less_excess ?? suppliedSummary.excess, NaN);
    const suppliedNet = parseNumeric(assessedFor.net_assessed_amount ?? suppliedSummary.net_assessed_amount, NaN);
    const hasSummaryInput = Object.keys(originalEstimate || {}).length > 0 || Object.keys(assessedFor || {}).length > 0;
    if (hasSummaryInput) stats.matchedSections.push('initial-estimate');

    stats.matchedSections = Array.from(new Set(stats.matchedSections));

    // 9. Calculate Totals & GST Summary
    const excessFromJson = Number.isFinite(suppliedExcess) ? suppliedExcess : NaN;
    const excess = Number.isFinite(excessFromJson) ? excessFromJson : (Number(newPolicy.policyExcess) || 1000);
    const salvage = Number(parsed.salvage || suppliedSummary.salvage || 0);

    const { summary, gstSummary } = calculateSummary(
      newInitialParts,
      newInitialLabour,
      newFinalParts,
      newFinalLabour,
      excess,
      salvage
    );

    stats.totalFieldsFilled =
      stats.policyFields +
      stats.vehicleFields +
      stats.clientDocRows +
      stats.companyDocRows +
      stats.initialParts +
      stats.initialLabour +
      stats.finalParts +
      stats.finalLabour +
      stats.invoices +
      stats.observations;

    // Assemble new SurveyRecord
    const newRecord: SurveyRecord = {
      ...existingRecord,
      documentType: parsed.documentType || 'Final Survey Report',
      confidence: 1.0,
      confidenceLevel: 'High',
      updatedAt: new Date().toISOString(),
      policy: newPolicy,
      vehicle: newVehicle,
      driver: newDriver,
      accident: newAccident,
      photos: existingRecord.photos || [],
      clientRequest: newClientRequest,
      companyRequest: newCompanyRequest,
      initialEstimate: {
        parts: newInitialParts,
        labour: newInitialLabour,
      },
      finalEstimate: {
        parts: newFinalParts,
        labour: newFinalLabour,
      },
      invoices: newInvoices,
      gstSummary,
      summary,
      observations: newObservations,
      changeHistory: [
        {
          id: `chg-${Date.now()}`,
          timestamp: new Date().toISOString(),
          field: 'json_import',
          oldValue: null,
          newValue: 'JSON Document Loaded',
          description: `Imported full survey dataset from JSON (${stats.totalFieldsFilled} fields/rows populated)`,
        },
        ...(existingRecord.changeHistory || []),
      ].slice(0, 50),
    };

    // Run validations
    newRecord.validationErrors = validateSurveyData(newRecord);
    newRecord.status = newRecord.validationErrors.filter((e) => e.severity === 'error').length === 0 ? 'Validated' : 'Needs Review';

    return {
      success: true,
      record: newRecord,
      stats,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `JSON processing error: ${error?.message || 'Unknown parsing exception'}`,
    };
  }
}

/**
 * Rich realistic sample JSON for one-click loading and testing
 */
export const SAMPLE_COMPLETE_SURVEY_JSON = {
  documentType: "Final Survey Report",
  policy: {
    policyNumber: "2311200489120000001",
    policyStartDate: "2026-04-15",
    policyEndDate: "2027-04-14",
    policyType: "Comprehensive Nil Depreciation",
    insuranceCompany: "HDFC ERGO General Insurance Co. Ltd.",
    insuredName: "Mr. Rajesh Kumar Sharma",
    insuredAddress: "Plot No. 42, Gayatri Nagar, Mandore Road, Jodhpur - 342001",
    insuredMobile: "9829012345",
    idv: 850000,
    sumInsured: 850000,
    claimNumber: "CLM-2026-HDFC-99182",
    surveyNumber: "SF/SRV/2026/08/0421",
    lossDate: "2026-08-14",
    lossLocation: "Mandore Highway, Jodhpur (Near Petrol Pump)",
    policyExcess: 1000,
    deductible: 1000,
    ncb: "35%",
    previousPolicyNumber: "OG-25-1901-1801-0004918",
    previousInsuranceCompany: "Bajaj Allianz General Insurance Co. Ltd."
  },
  vehicle: {
    registrationNumber: "RJ15CA4929",
    rcNumber: "RJ15CA4929",
    make: "Maruti Suzuki India Ltd.",
    model: "Swift Dzire",
    variant: "ZXI Plus 1.2 Petrol",
    vehicleType: "Private Car",
    engineNumber: "K12MN8920194",
    chassisNumber: "MBHC711SLNM481920",
    yearOfManufacture: "2023",
    dateOfRegistration: "2023-06-20"
  },
  clientRequest: {
    clientName: "Mr. Rajesh Kumar Sharma",
    mobileNumber: "9829012345",
    email: "rajesh.sharma.jodhpur@gmail.com",
    policyNumber: "2311200489120000001",
    claimNumber: "CLM-2026-HDFC-99182",
    vehicleNumber: "RJ15CA4929",
    requestDate: "2026-08-15",
    clientRemarks: "Stray animal crossed the road suddenly. Vehicle collided with highway guard rail. Need early settlement.",
    requestStatus: "In Progress",
    followUpDate: "2026-08-25",
    requestedDocuments: [
      { id: "doc-1", documentName: "RC Smart Card Copy", status: "Submitted", remarks: "Verified online via mParivahan" },
      { id: "doc-2", documentName: "Driving License Copy", status: "Submitted", remarks: "Valid non-transport DL" },
      { id: "doc-3", documentName: "Insurance Policy Schedule", status: "Submitted", remarks: "Nil-depreciation active cover" },
      { id: "doc-4", documentName: "Signed Motor Claim Form", status: "Submitted", remarks: "Duly signed by insured" },
      { id: "doc-5", documentName: "Garage Repair Estimate", status: "Submitted", remarks: "Estimated ₹54,200" },
      { id: "doc-6", documentName: "Cancelled Cheque / Bank Details", status: "Submitted", remarks: "SBI A/c 30192849182 verified" }
    ]
  },
  companyRequest: {
    companyName: "HDFC ERGO General Insurance Co. Ltd.",
    claimNumber: "CLM-2026-HDFC-99182",
    policyNumber: "2311200489120000001",
    vehicleNumber: "RJ15CA4929",
    requestDate: "2026-08-15",
    surveyorName: "Er. Sunil Mathur (SLA-48291)",
    companyRemarks: "Inspect front structural members, AC condenser, radiator bracket and radiator fan motor.",
    responseStatus: "Survey Conducted",
    followUpDate: "2026-08-22",
    requiredDocuments: [
      { id: "cdoc-1", documentName: "Accident Spot & Garage Inspection Photos", status: "Submitted", remarks: "18 High-res photos uploaded" },
      { id: "cdoc-2", documentName: "Survey Assessment Sheet", status: "Submitted", remarks: "Assessment completed" },
      { id: "cdoc-3", documentName: "Original Workshop Tax Invoices", status: "Submitted", remarks: "Invoice # RJ202G202610514 verified" }
    ]
  },
  initialEstimate: {
    parts: [
      {
        id: "p1",
        selectedForFinal: true,
        eNo: "1",
        partsDescription: "FRONT BUMPER UPPER (FASICA)",
        hsnCode: "87089900",
        billSNo: "1",
        remark: "Damage",
        estimated: 1420.34,
        nonMetal: 1420.34,
        glassSecondHandRepair: null,
        metal35: null,
        gstRate: 18
      },
      {
        id: "p2",
        selectedForFinal: true,
        eNo: "2",
        partsDescription: "FRONT BUMPER LOWER GRILLE",
        hsnCode: "87089900",
        billSNo: "2",
        remark: "Broken",
        estimated: 890.00,
        nonMetal: 890.00,
        glassSecondHandRepair: null,
        metal35: null,
        gstRate: 18
      },
      {
        id: "p3",
        selectedForFinal: true,
        eNo: "3",
        partsDescription: "HEADLAMP ASSY RH (PROJECTOR LED)",
        hsnCode: "85122010",
        billSNo: "3",
        remark: "Broken Lug & Lens Crack",
        estimated: 5200.00,
        nonMetal: 5200.00,
        glassSecondHandRepair: null,
        metal35: null,
        gstRate: 18
      },
      {
        id: "p4",
        selectedForFinal: true,
        eNo: "4",
        partsDescription: "AC CONDENSER ASSY WITH DRIER",
        hsnCode: "84189900",
        billSNo: "4",
        remark: "Fins Crushed & Gas Leaked",
        estimated: 4600.00,
        nonMetal: null,
        metal35: 4600.00,
        glassSecondHandRepair: null,
        gstRate: 18
      },
      {
        id: "p5",
        selectedForFinal: true,
        eNo: "5",
        partsDescription: "RADIATOR SUPPORT LOWER CROSS MEMBER",
        hsnCode: "87089900",
        billSNo: "5",
        remark: "Bent & Distorted",
        estimated: 2350.00,
        nonMetal: null,
        metal35: 2350.00,
        glassSecondHandRepair: null,
        gstRate: 18
      },
      {
        id: "p6",
        selectedForFinal: false,
        eNo: "6",
        partsDescription: "FRONT WINDSHIELD GLASS (PRE-EXISTING CHIP)",
        hsnCode: "70071100",
        billSNo: "6",
        remark: "Pre-existing / Not Accidental",
        estimated: 4100.00,
        nonMetal: null,
        metal35: null,
        glassSecondHandRepair: 4100.00,
        gstRate: 18
      }
    ],
    labour: [
      {
        id: "l1",
        selectedForFinal: true,
        sNo: "1",
        sac: "998729",
        billSNo: "1",
        labourDescription: "FRONT BUMPER O/H, OPENING & REFITTING",
        estimated: 600.00,
        assessed: 500.00,
        gstRate: 18,
        total: 590.00
      },
      {
        id: "l2",
        selectedForFinal: true,
        sNo: "2",
        sac: "998729",
        billSNo: "2",
        labourDescription: "FRONT BUMPER COMPLETE PAINTING CHARGES",
        estimated: 2200.00,
        assessed: 1900.00,
        gstRate: 18,
        total: 2242.00
      },
      {
        id: "l3",
        selectedForFinal: true,
        sNo: "3",
        sac: "998729",
        billSNo: "3",
        labourDescription: "RADIATOR & CONDENSER R&R CHARGES",
        estimated: 950.00,
        assessed: 850.00,
        gstRate: 18,
        total: 1003.00
      },
      {
        id: "l4",
        selectedForFinal: true,
        sNo: "4",
        sac: "998729",
        billSNo: "4",
        labourDescription: "AC GAS EVACUATION & REFILLING CHARGES",
        estimated: 1800.00,
        assessed: 1600.00,
        gstRate: 18,
        total: 1888.00
      },
      {
        id: "l5",
        selectedForFinal: true,
        sNo: "5",
        sac: "998729",
        billSNo: "5",
        labourDescription: "RH HEADLAMP FOCUSING & BRACKET ADJUSTMENT",
        estimated: 450.00,
        assessed: 400.00,
        gstRate: 18,
        total: 472.00
      }
    ]
  },
  invoices: [
    {
      id: "inv-1",
      invoiceNumber: "RJ202G202610514",
      invoiceDate: "2026-08-20",
      invoiceAmount: 17411.00,
      vendor: "Shree Maruti Authorized Bodyshop Jodhpur",
      gstNumber: "08AABCS1429K1ZV",
      description: "Accident repairs, body spare parts and painting invoice"
    }
  ],
  observations: {
    causeOfAccident: "As reported by the insured, while driving on Mandore road, a stray animal suddenly crossed the path causing the driver to brake sharply and collide with the road divider barrier.",
    natureOfLoss: "Accidental frontal collision impact causing damage to front bumper, condenser, headlamp, and radiator support member.",
    garageNameAndAddress: "Shree Maruti Workshop, Mandore Industrial Area, Jodhpur",
    inspectionDate: "2026-08-16",
    inspectionLocation: "Shree Maruti Workshop, Mandore",
    speedometerReading: "18450 KM",
    tpDamageOrThirdPartyInjury: "No third party injury or third party property damage reported.",
    surveyorNotes: "Vehicle physical damage perfectly aligns with the reported accident circumstances and divider height. Item #6 Windshield glass had an old pre-existing stone chip and was unselected/disallowed.",
    recommendations: "Loss is genuine, accidental in nature and covered under policy terms. Recommended for prompt net settlement."
  },
  salvage: 350
};

/**
 * Empty schema template that users or external systems can copy
 */
export const EMPTY_SURVEY_JSON_TEMPLATE = {
  documentType: "Final Estimate",
  policy: {
    policyNumber: "",
    policyStartDate: "YYYY-MM-DD",
    policyEndDate: "YYYY-MM-DD",
    policyType: "Comprehensive",
    insuranceCompany: "",
    insuredName: "",
    insuredAddress: "",
    insuredMobile: "",
    idv: 0,
    sumInsured: 0,
    claimNumber: "",
    surveyNumber: "",
    lossDate: "YYYY-MM-DD",
    lossLocation: "",
    policyExcess: 1000,
    deductible: 1000,
    ncb: "0%"
  },
  vehicle: {
    registrationNumber: "RJ15CA4929",
    rcNumber: "RJ15CA4929",
    make: "",
    model: "",
    variant: "",
    vehicleType: "Private Car",
    engineNumber: "",
    chassisNumber: "",
    yearOfManufacture: "2023",
    dateOfRegistration: "YYYY-MM-DD"
  },
  clientRequest: {
    clientName: "",
    mobileNumber: "",
    email: "",
    policyNumber: "",
    claimNumber: "",
    vehicleNumber: "",
    requestDate: "YYYY-MM-DD",
    clientRemarks: "",
    requestStatus: "Initiated",
    requestedDocuments: [
      { documentName: "RC Copy", status: "Submitted", remarks: "" },
      { documentName: "Driving License", status: "Submitted", remarks: "" }
    ]
  },
  companyRequest: {
    companyName: "",
    claimNumber: "",
    surveyorName: "",
    companyRemarks: "",
    responseStatus: "Assigned"
  },
  initialEstimate: {
    parts: [
      {
        selectedForFinal: true,
        eNo: "1",
        partsDescription: "PART NAME",
        hsnCode: "87089900",
        billSNo: "1",
        remark: "Damage",
        estimated: 1000,
        gstRate: 18
      }
    ],
    labour: [
      {
        selectedForFinal: true,
        sNo: "1",
        sac: "998729",
        billSNo: "1",
        labourDescription: "LABOUR DESCRIPTION",
        estimated: 500,
        assessed: 500,
        gstRate: 18
      }
    ]
  },
  invoices: [
    {
      invoiceNumber: "INV-001",
      invoiceDate: "YYYY-MM-DD",
      invoiceAmount: 1500,
      vendor: "Workshop Name",
      gstNumber: "",
      description: "Repair bill"
    }
  ],
  observations: {
    causeOfAccident: "",
    natureOfLoss: "",
    garageNameAndAddress: "",
    speedometerReading: "",
    recommendations: ""
  },
  salvage: 0
};

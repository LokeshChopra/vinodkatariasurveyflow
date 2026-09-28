import {
  DocumentType,
  PolicyData,
  VehicleData,
  ClientRequestData,
  CompanyRequestData,
  InitialPartRow,
  InitialLabourRow,
  FinalPartRow,
  FinalLabourRow,
  InvoiceRow,
  UnmappedItem,
  FieldConfidence,
  ReportObservations
} from '../types/survey';

export interface ParsedSurveyResult {
  success: boolean;
  documentType: DocumentType;
  confidence: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  policy: Partial<PolicyData>;
  vehicle: Partial<VehicleData>;
  clientRequest: Partial<ClientRequestData>;
  companyRequest: Partial<CompanyRequestData>;
  invoices: InvoiceRow[];
  initialEstimate: {
    parts: InitialPartRow[];
    labour: InitialLabourRow[];
  };
  finalEstimate: {
    parts: FinalPartRow[];
    labour: FinalLabourRow[];
  };
  observations: Partial<ReportObservations>;
  fieldConfidences: Record<string, FieldConfidence>;
  unmappedText: UnmappedItem[];
}

/**
 * Intelligent Document Type Detector based on keyword occurrences and structure
 */
export function detectDocumentType(text: string, title?: string): {
  type: DocumentType;
  confidence: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
} {
  const lower = (text + ' ' + (title || '')).toLowerCase();

  let type: DocumentType = 'General Survey Data';
  let score = 0;

  if (lower.includes('final estimate') || lower.includes('final survey report') || lower.includes('loss assessment report')) {
    type = 'Final Estimate';
    score = 0.95;
  } else if (lower.includes('initial estimate') || lower.includes('preliminary estimate') || lower.includes('spot survey')) {
    type = 'Initial Estimate';
    score = 0.92;
  } else if (lower.includes('certificate of insurance') || lower.includes('policy schedule') || (lower.includes('policy no') && lower.includes('idv') && lower.includes('sum insured') && !lower.includes('labour'))) {
    type = 'Insurance Policy';
    score = 0.94;
  } else if (lower.includes('client survey intimation') || lower.includes('client request') || lower.includes('requested documents') || lower.includes('intimation & document status')) {
    type = 'Client Request';
    score = 0.91;
  } else if (lower.includes('company request') || lower.includes('surveyor intimation') || lower.includes('deputation letter')) {
    type = 'Company Request';
    score = 0.90;
  } else if (lower.includes('tax invoice') || lower.includes('cash memo') || lower.includes('invoice no') && lower.includes('vendor')) {
    type = 'Invoice';
    score = 0.88;
  } else if (lower.includes('labour') && lower.includes('sac') && !lower.includes('parts estimate')) {
    type = 'Labour & Repairs';
    score = 0.85;
  } else if (lower.includes('parts description') || lower.includes('hsn code')) {
    type = 'Parts Estimate';
    score = 0.86;
  } else {
    type = 'General Survey Data';
    score = 0.65;
  }

  const confidenceLevel = score >= 0.85 ? 'High' : score >= 0.7 ? 'Medium' : 'Low';

  return { type, confidence: score, confidenceLevel };
}

/**
 * Deterministic Regex and Heuristic Parser for Insurance Documents
 */
export function parsePastedTextRuleBased(text: string, title?: string): ParsedSurveyResult {
  const { type: detectedType, confidence: docConfidence, confidenceLevel } = detectDocumentType(text, title);

  const policy: Partial<PolicyData> = {};
  const vehicle: Partial<VehicleData> = {};
  const clientRequest: Partial<ClientRequestData> = { requestedDocuments: [] };
  const companyRequest: Partial<CompanyRequestData> = { requiredDocuments: [] };
  const invoices: InvoiceRow[] = [];
  const initialParts: InitialPartRow[] = [];
  const initialLabour: InitialLabourRow[] = [];
  const finalParts: FinalPartRow[] = [];
  const finalLabour: FinalLabourRow[] = [];
  const observations: Partial<ReportObservations> = {};
  const fieldConfidences: Record<string, FieldConfidence> = {};
  const unmappedText: UnmappedItem[] = [];

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const addConfidence = (field: string, value: any, conf: number, source: string) => {
    fieldConfidences[field] = {
      field,
      value,
      confidence: conf,
      sourceText: source.trim(),
    };
  };

  // Helper patterns
  const patterns: { [key: string]: RegExp } = {
    rcNumber: /(?:RC\s*(?:No|Number)?|Regn?\s*(?:No|Number|Mark)?)\s*[:=\-]?\s*([A-Z]{2}[0-9\s]{1,3}[A-Z]{0,3}[0-9]{4})/i,
    policyNumber: /(?:Policy\s*(?:No|Number)?)\s*[:=\-]?\s*([A-Z0-9\/\-]{5,35})/i,
    claimNumber: /(?:Claim\s*(?:No|Number)?)\s*[:=\-]?\s*([A-Z0-9\/\-]{4,35})/i,
    surveyNumber: /(?:Survey\s*(?:No|Number)?)\s*[:=\-]?\s*([A-Z0-9\/\-]{4,35})/i,
    insuredName: /(?:Insured\s*(?:Name)?|Client\s*(?:Name)?|Customer\s*Name)\s*[:=\-]?\s*([A-Za-z\s\.\,]{3,45})/i,
    mobile: /(?:Mobile\s*(?:No|Number)?|Contact|Phone)\s*[:=\-]?\s*([+0-9\s\-]{10,15})/i,
    email: /(?:Email\s*(?:ID)?)\s*[:=\-]?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    lossDate: /(?:Date\s*of\s*Loss|Loss\s*Date)\s*[:=\-]?\s*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4})/i,
    lossLocation: /(?:Loss\s*Location|Place\s*of\s*Loss|Accident\s*Spot)\s*[:=\-]?\s*([^\n\r,]+(?:,\s*[^\n\r,]+)*)/i,
    insuranceCompany: /(?:Insurance\s*Company|Insurer)\s*[:=\-]?\s*([A-Za-z0-9\s\.\,\&]+(?:Insurance|Assurance|Company|Ltd))/i,
    policyType: /(?:Policy\s*Type|Coverage)\s*[:=\-]?\s*([A-Za-z0-9\s\-\(\)]+)/i,
    idv: /(?:IDV|Insured\s*Declared\s*Value)\s*[:=\-]?\s*(?:Rs\.?|INR|₹)?\s*([0-9]+(?:\.[0-9]+)?)/i,
    sumInsured: /(?:Sum\s*Insured)\s*[:=\-]?\s*(?:Rs\.?|INR|₹)?\s*([0-9]+(?:\.[0-9]+)?)/i,
    policyExcess: /(?:Policy\s*Excess|Excess|Compulsory\s*Deductible)\s*[:=\-]?\s*(?:Rs\.?|INR|₹)?\s*([0-9]+(?:\.[0-9]+)?)/i,
    deductible: /(?:Deductible)\s*[:=\-]?\s*(?:Rs\.?|INR|₹)?\s*([0-9]+(?:\.[0-9]+)?)/i,
    ncb: /(?:NCB|No\s*Claim\s*Bonus)\s*[:=\-]?\s*([0-9]{1,2}\s*%)/i,
    make: /(?:Make)\s*[:=\-]?\s*([A-Za-z0-9\s\-]+)/i,
    model: /(?:Model)\s*[:=\-]?\s*([A-Za-z0-9\s\-]+)/i,
    variant: /(?:Variant)\s*[:=\-]?\s*([A-Za-z0-9\s\-]+)/i,
    vehicleType: /(?:Vehicle\s*Type|Class\s*of\s*Vehicle)\s*[:=\-]?\s*([A-Za-z0-9\s\-]+)/i,
    engineNumber: /(?:Engine\s*(?:No|Number)?)\s*[:=\-]?\s*([A-Z0-9]{6,25})/i,
    chassisNumber: /(?:Chassis\s*(?:No|Number)?|VIN)\s*[:=\-]?\s*([A-Z0-9]{10,25})/i,
    mfgYear: /(?:Year\s*of\s*Mfg|Mfg\s*Year|Year\s*of\s*Manufacture)\s*[:=\-]?\s*([12][09][0-9]{2})/i,
    regDate: /(?:Date\s*of\s*Regn?|Regn?\s*Date)\s*[:=\-]?\s*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4})/i,
    speedometer: /(?:Speedometer|Odometer|KMs?\s*Reading)\s*[:=\-]?\s*([0-9]+(?:\s*KM)?)/i,
    garage: /(?:Garage|Workshop)\s*[:=\-]?\s*([^\n\r]+)/i,
    surveyorName: /(?:Surveyor\s*(?:Name)?)\s*[:=\-]?\s*([A-Za-z\s\.\(\)\-]+)/i,
  };

  // Run header regex extractions
  lines.forEach((line) => {
    let matched = false;

    // Check Insurance Company
    if (!policy.insuranceCompany && patterns.insuranceCompany.test(line)) {
      const match = line.match(patterns.insuranceCompany);
      if (match) {
        policy.insuranceCompany = match[1].trim();
        addConfidence('policy.insuranceCompany', policy.insuranceCompany, 0.95, line);
        matched = true;
      }
    }

    // Check RC
    if (!vehicle.registrationNumber && patterns.rcNumber.test(line)) {
      const match = line.match(patterns.rcNumber);
      if (match) {
        const clean = match[1].replace(/\s+/g, '').toUpperCase();
        vehicle.registrationNumber = clean;
        vehicle.rcNumber = clean;
        addConfidence('vehicle.registrationNumber', clean, 0.98, line);
        addConfidence('vehicle.rcNumber', clean, 0.98, line);
        matched = true;
      }
    }

    // Check Policy No
    if (!policy.policyNumber && patterns.policyNumber.test(line)) {
      const match = line.match(patterns.policyNumber);
      if (match) {
        policy.policyNumber = match[1].trim();
        addConfidence('policy.policyNumber', policy.policyNumber, 0.97, line);
        matched = true;
      }
    }

    // Check Claim No
    if (!policy.claimNumber && patterns.claimNumber.test(line)) {
      const match = line.match(patterns.claimNumber);
      if (match) {
        policy.claimNumber = match[1].trim();
        addConfidence('policy.claimNumber', policy.claimNumber, 0.96, line);
        matched = true;
      }
    }

    // Check Survey No
    if (!policy.surveyNumber && patterns.surveyNumber.test(line)) {
      const match = line.match(patterns.surveyNumber);
      if (match) {
        policy.surveyNumber = match[1].trim();
        addConfidence('policy.surveyNumber', policy.surveyNumber, 0.95, line);
        matched = true;
      }
    }

    // Check Insured Name
    if (!policy.insuredName && patterns.insuredName.test(line)) {
      const match = line.match(patterns.insuredName);
      if (match) {
        policy.insuredName = match[1].trim();
        clientRequest.clientName = policy.insuredName;
        addConfidence('policy.insuredName', policy.insuredName, 0.94, line);
        matched = true;
      }
    }

    // Check Mobile
    if (!policy.insuredMobile && patterns.mobile.test(line)) {
      const match = line.match(patterns.mobile);
      if (match) {
        policy.insuredMobile = match[1].trim();
        clientRequest.mobileNumber = policy.insuredMobile;
        addConfidence('policy.insuredMobile', policy.insuredMobile, 0.95, line);
        matched = true;
      }
    }

    // Check Email
    if (!clientRequest.email && patterns.email.test(line)) {
      const match = line.match(patterns.email);
      if (match) {
        clientRequest.email = match[1].trim();
        addConfidence('clientRequest.email', clientRequest.email, 0.96, line);
        matched = true;
      }
    }

    // Check Loss Date
    if (!policy.lossDate && patterns.lossDate.test(line)) {
      const match = line.match(patterns.lossDate);
      if (match) {
        policy.lossDate = match[1].trim();
        addConfidence('policy.lossDate', policy.lossDate, 0.93, line);
        matched = true;
      }
    }

    // Check Loss Location
    if (!policy.lossLocation && patterns.lossLocation.test(line)) {
      const match = line.match(patterns.lossLocation);
      if (match) {
        policy.lossLocation = match[1].trim();
        addConfidence('policy.lossLocation', policy.lossLocation, 0.92, line);
        matched = true;
      }
    }

    // Check IDV
    if (!policy.idv && patterns.idv.test(line)) {
      const match = line.match(patterns.idv);
      if (match) {
        policy.idv = parseFloat(match[1]);
        addConfidence('policy.idv', policy.idv, 0.94, line);
        matched = true;
      }
    }

    // Check Sum Insured
    if (!policy.sumInsured && patterns.sumInsured.test(line)) {
      const match = line.match(patterns.sumInsured);
      if (match) {
        policy.sumInsured = parseFloat(match[1]);
        addConfidence('policy.sumInsured', policy.sumInsured, 0.94, line);
        matched = true;
      }
    }

    // Check Excess / Deductible
    if (!policy.policyExcess && patterns.policyExcess.test(line)) {
      const match = line.match(patterns.policyExcess);
      if (match) {
        policy.policyExcess = parseFloat(match[1]);
        policy.deductible = policy.policyExcess;
        addConfidence('policy.policyExcess', policy.policyExcess, 0.94, line);
        matched = true;
      }
    }

    // Check NCB
    if (!policy.ncb && patterns.ncb.test(line)) {
      const match = line.match(patterns.ncb);
      if (match) {
        policy.ncb = match[1].trim();
        addConfidence('policy.ncb', policy.ncb, 0.95, line);
        matched = true;
      }
    }

    // Check Make / Model / Variant
    if (!vehicle.make && patterns.make.test(line)) {
      const match = line.match(patterns.make);
      if (match) {
        vehicle.make = match[1].trim();
        addConfidence('vehicle.make', vehicle.make, 0.92, line);
        matched = true;
      }
    }
    if (!vehicle.model && patterns.model.test(line)) {
      const match = line.match(patterns.model);
      if (match) {
        vehicle.model = match[1].trim();
        addConfidence('vehicle.model', vehicle.model, 0.92, line);
        matched = true;
      }
    }
    if (!vehicle.variant && patterns.variant.test(line)) {
      const match = line.match(patterns.variant);
      if (match) {
        vehicle.variant = match[1].trim();
        addConfidence('vehicle.variant', vehicle.variant, 0.90, line);
        matched = true;
      }
    }

    // Check Engine & Chassis
    if (!vehicle.engineNumber && patterns.engineNumber.test(line)) {
      const match = line.match(patterns.engineNumber);
      if (match) {
        vehicle.engineNumber = match[1].trim();
        addConfidence('vehicle.engineNumber', vehicle.engineNumber, 0.95, line);
        matched = true;
      }
    }
    if (!vehicle.chassisNumber && patterns.chassisNumber.test(line)) {
      const match = line.match(patterns.chassisNumber);
      if (match) {
        vehicle.chassisNumber = match[1].trim();
        addConfidence('vehicle.chassisNumber', vehicle.chassisNumber, 0.95, line);
        matched = true;
      }
    }

    // Check Year of Mfg
    if (!vehicle.yearOfManufacture && patterns.mfgYear.test(line)) {
      const match = line.match(patterns.mfgYear);
      if (match) {
        vehicle.yearOfManufacture = match[1].trim();
        addConfidence('vehicle.yearOfManufacture', vehicle.yearOfManufacture, 0.93, line);
        matched = true;
      }
    }

    // Observations
    if (line.toLowerCase().includes('cause of accident:')) {
      observations.causeOfAccident = line.split(/cause of accident:/i)[1].trim();
      matched = true;
    }
    if (!observations.speedometerReading && patterns.speedometer.test(line)) {
      const match = line.match(patterns.speedometer);
      if (match) {
        observations.speedometerReading = match[1].trim();
        matched = true;
      }
    }
    if (!observations.garageNameAndAddress && patterns.garage.test(line)) {
      const match = line.match(patterns.garage);
      if (match) {
        observations.garageNameAndAddress = match[1].trim();
        matched = true;
      }
    }
    if (patterns.surveyorName.test(line) && !companyRequest.surveyorName) {
      const match = line.match(patterns.surveyorName);
      if (match) {
        companyRequest.surveyorName = match[1].trim();
        matched = true;
      }
    }

    // Check Invoices: "Invoice No: RJ202G202610514", "Date: 20/08/2026", "Amount: 17411"
    if (line.toLowerCase().includes('invoice no:')) {
      const invMatch = line.match(/invoice\s*no\s*[:=\-]?\s*([A-Za-z0-9\/\-]+)/i);
      if (invMatch) {
        const invNo = invMatch[1].trim();
        let invDate = '';
        let invAmount = 0;
        let invVendor = '';
        let invGst = '';

        // Check nearby text for date, amount, vendor
        const dateMatch = text.match(/Date\s*[:=\-]?\s*([0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4})/i);
        if (dateMatch) invDate = dateMatch[1];

        const amountMatch = text.match(/Amount\s*[:=\-]?\s*(?:Rs\.?|INR|₹)?\s*([0-9]+(?:\.[0-9]+)?)/i);
        if (amountMatch) invAmount = parseFloat(amountMatch[1]);

        const vendorMatch = text.match(/Vendor\s*[:=\-]?\s*([^\n\r]+)/i);
        if (vendorMatch) invVendor = vendorMatch[1].trim();

        const gstMatch = text.match(/GST\s*(?:Number|No|IN)?\s*[:=\-]?\s*([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i);
        if (gstMatch) invGst = gstMatch[1];

        invoices.push({
          id: `inv-${Date.now()}-${invoices.length}`,
          invoiceNumber: invNo,
          invoiceDate: invDate || new Date().toISOString().split('T')[0],
          invoiceAmount: invAmount || 0,
          vendor: invVendor || 'Authorized Bodyshop Workshop',
          gstNumber: invGst || '',
          description: 'Accidental repairs and parts replacement',
        });
        matched = true;
      }
    }

    // Check Document Checklist Rows: e.g., "Document: RC Copy | Status: Submitted | Remarks: Verified..."
    if (line.toLowerCase().includes('document:') || (line.includes(' - Status:') && line.includes('Remarks:'))) {
      const docMatch = line.match(/(?:Document:\s*([^\s|]+(?:\s+[^\s|]+)*))?.*Status:\s*([A-Za-z\s]+)(?:.*Remarks:\s*(.*))?/i);
      if (docMatch) {
        const docName = docMatch[1] || 'Document';
        const rawStatus = (docMatch[2] || '').trim();
        let docStatus: 'Submitted' | 'Pending' | 'Not Required' | 'Rejected' = 'Submitted';
        if (/pending/i.test(rawStatus)) docStatus = 'Pending';
        else if (/not required/i.test(rawStatus)) docStatus = 'Not Required';
        else if (/rejected/i.test(rawStatus)) docStatus = 'Rejected';

        clientRequest.requestedDocuments!.push({
          id: `doc-${clientRequest.requestedDocuments!.length + 1}`,
          documentName: docName.replace(/^\d+[\.\)]\s*/, ''),
          status: docStatus,
          remarks: docMatch[3] ? docMatch[3].trim() : '',
        });
        matched = true;
      }
    }
  });

  // Table Parser: Extract Parts and Labour Rows with strict row/column preservation
  // Case example: "18 FRONT BUMPER UPR 87089900 7 Damage 1420.34 --- --- 1420.34 18.00 1420.34 0.00"
  let inLabourSection = false;
  let inPartsSection = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('labour & repairs') || lower.includes('labour charges') || lower.includes('labour assessment')) {
      inLabourSection = true;
      inPartsSection = false;
      continue;
    }
    if (lower.includes('parts estimate') || lower.includes('parts assessment') || lower.includes('parts description')) {
      inPartsSection = true;
      inLabourSection = false;
      continue;
    }
    if (lower.includes('client request') || lower.includes('company request') || lower.includes('surveyor observations')) {
      inLabourSection = false;
      inPartsSection = false;
    }

    // Try parsing a Labour Row:
    // Starts with number (S.No) e.g. "1 998729 1 FRONT BUMPER OPENING & FITTING 650.00 650.00 18.00"
    // OR "1 | 998729 | 1 | FRONT BUMPER OPENING & FITTING | 650.00 | 650.00 | 18.00"
    if (inLabourSection || (lower.includes('painting') || lower.includes('denting') || lower.includes('fitting') || lower.includes('charges'))) {
      const labourTokens = line.split(/[|\t]+/).filter(Boolean);
      let sNo = '';
      let sac = '998729';
      let billSNo = '';
      let desc = '';
      let est = 0;
      let ass = 0;
      let gstRate = 18;

      // Check regex for space-separated or pipe-separated:
      // Pattern: ^(\d+)\s+(\d{6})?\s*(\d+)?\s+([A-Z\s&/]+?)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)?
      const labourMatch = line.match(/^(\d+)[\s|]+(?:(\d{6})[\s|]+)?(?:(\d+)[\s|]+)?([A-Za-z\s&/().-]+?)[\s|]+([0-9]+(?:\.[0-9]+)?)[\s|]+([0-9]+(?:\.[0-9]+)?)(?:[\s|]+([0-9]+(?:\.[0-9]+)?))?/);
      if (labourMatch) {
        sNo = labourMatch[1];
        sac = labourMatch[2] || '998729';
        billSNo = labourMatch[3] || sNo;
        desc = labourMatch[4].trim();
        est = parseFloat(labourMatch[5]) || 0;
        ass = parseFloat(labourMatch[6]) || est;
        gstRate = labourMatch[7] ? parseFloat(labourMatch[7]) : 18;

        const totalEst = est + (est * gstRate) / 100;
        const totalAss = ass + (ass * gstRate) / 100;

        initialLabour.push({
          id: `init-lab-${initialLabour.length + 1}`,
          selectedForFinal: true,
          sNo,
          sac,
          billSNo,
          labourDescription: desc,
          estimated: est,
          assessed: ass,
          gstRate,
          total: totalEst,
        });

        finalLabour.push({
          id: `final-lab-${finalLabour.length + 1}`,
          sNo,
          sac,
          billSNo,
          labourDescription: desc,
          estimated: est,
          assessed: ass,
          gstRate,
          total: totalAss,
        });
        continue;
      }
    }

    // Try parsing a Tab-separated or Pipe-separated Parts Row:
    if (line.includes('\t') || line.includes('|')) {
      const tokens = line.split(/[\t|]+/).map((t) => t.trim());
      // Skip header line itself
      if (tokens.some((t) => t.toLowerCase().includes('parts description') || t.toLowerCase() === 'e. no.' || t.toLowerCase() === 'e. no')) {
        continue;
      }
      if (tokens.length >= 4 && /^\d+$/.test(tokens[0])) {
        const eNo = tokens[0];
        const partsDescription = tokens[1] || `Part ${eNo}`;
        const hsnCode = tokens[2] || '87089900';
        const billSNo = tokens[3] || eNo;
        const remark = tokens[4] && !['---', '-', 'null'].includes(tokens[4]) ? tokens[4] : 'Damage';
        
        const cleanNum = (str: string | undefined): number => {
          if (!str) return 0;
          const c = str.replace(/[₹Rs,\s\/-]/gi, '').trim();
          const n = parseFloat(c);
          return isNaN(n) ? 0 : n;
        };
        const cleanNullNum = (str: string | undefined): number | null => {
          if (!str || str === '---' || str === '-' || str === 'null') return null;
          const c = str.replace(/[₹Rs,\s\/-]/gi, '').trim();
          if (!c) return null;
          const n = parseFloat(c);
          return isNaN(n) ? null : n;
        };

        const estimated = cleanNum(tokens[5]);
        const glassVal = cleanNullNum(tokens[6]);
        const metalVal = cleanNullNum(tokens[7]);
        const nonMetalVal = cleanNullNum(tokens[8]) ?? (glassVal === null && metalVal === null && estimated > 0 ? estimated : null);
        const gstRate = tokens[9] ? cleanNum(tokens[9]) : 18;

        initialParts.push({
          id: `init-part-${initialParts.length + 1}`,
          selectedForFinal: true,
          eNo,
          partsDescription,
          hsnCode,
          billSNo,
          remark,
          estimated,
          glassSecondHandRepair: glassVal,
          metal35: metalVal,
          nonMetal: nonMetalVal,
          gstRate: gstRate || 18,
        });

        finalParts.push({
          id: `final-part-${finalParts.length + 1}`,
          eNo,
          partsDescription,
          hsnCode,
          billSNo,
          remark,
          estimated,
          assessed: estimated,
          depreciationPercent: 0,
          depreciationAmount: 0,
          glassSecondHandRepair: glassVal,
          metal35: metalVal,
          nonMetal: nonMetalVal,
          gstRate: gstRate || 18,
          netAmount: estimated,
        });
        continue;
      }
    }

    // Try parsing a Parts Row via regex:
    // Example: "18 FRONT BUMPER UPR 87089900 7 Damage 1420.34 --- --- 1420.34 18.00 1420.34 0.00"
    // Starts with part item number e.g. "18"
    const partMatch = line.match(/^(\d+)[\s|]+([A-Za-z0-9\s&/().-]+?)[\s|]+(\d{4,8})?[\s|]*(?:(\d+)[\s|]+)?(?:([A-Za-z]+)[\s|]+)?([0-9]+(?:\.[0-9]+)?)[\s|]+(?:([-0-9.]+|---|null)[\s|]+)?(?:([-0-9.]+|---|null)[\s|]+)?(?:([-0-9.]+|---|null)[\s|]+)?([0-9]+(?:\.[0-9]+)?)(?:[\s|]+([0-9]+(?:\.[0-9]+)?))?(?:[\s|]+([0-9]+(?:\.[0-9]+)?))?/);
    if (partMatch) {
      const eNo = partMatch[1];
      const partsDescription = partMatch[2].trim();
      const hsnCode = partMatch[3] || '87089900';
      const billSNo = partMatch[4] || eNo;
      const remark = partMatch[5] && !['---', 'null'].includes(partMatch[5]) ? partMatch[5] : 'Accidental Damage';
      const estimated = parseFloat(partMatch[6]) || 0;
      
      const glassVal = partMatch[7] && !isNaN(parseFloat(partMatch[7])) ? parseFloat(partMatch[7]) : null;
      const metalVal = partMatch[8] && !isNaN(parseFloat(partMatch[8])) ? parseFloat(partMatch[8]) : null;
      const nonMetalVal = partMatch[9] && !isNaN(parseFloat(partMatch[9])) ? parseFloat(partMatch[9]) : estimated;
      const gstRate = partMatch[10] ? parseFloat(partMatch[10]) : 18;
      const assessed = partMatch[11] ? parseFloat(partMatch[11]) : estimated;
      const depPercent = partMatch[12] ? parseFloat(partMatch[12]) : 0;
      const depAmount = (assessed * depPercent) / 100;
      const netAmount = assessed - depAmount;

      initialParts.push({
        id: `init-part-${initialParts.length + 1}`,
        selectedForFinal: true,
        eNo,
        partsDescription,
        hsnCode,
        billSNo,
        remark,
        estimated,
        glassSecondHandRepair: glassVal,
        metal35: metalVal,
        nonMetal: nonMetalVal,
        gstRate,
      });

      finalParts.push({
        id: `final-part-${finalParts.length + 1}`,
        eNo,
        partsDescription,
        hsnCode,
        billSNo,
        remark,
        estimated,
        assessed,
        depreciationPercent: depPercent,
        depreciationAmount: depAmount,
        glassSecondHandRepair: glassVal,
        metal35: metalVal,
        nonMetal: nonMetalVal,
        gstRate,
        netAmount,
      });
      continue;
    }

    // If line has substantive content but wasn't mapped, save to unmappedText
    if (
      line.length > 5 &&
      !line.startsWith('---') &&
      !line.toLowerCase().startsWith('final motor survey') &&
      !line.toLowerCase().startsWith('e.no |') &&
      !line.toLowerCase().startsWith('s.no |') &&
      !line.toLowerCase().startsWith('insured & client') &&
      !line.toLowerCase().startsWith('vehicle particulars') &&
      !line.toLowerCase().startsWith('parts estimate') &&
      !line.toLowerCase().startsWith('labour & repairs')
    ) {
      unmappedText.push({
        id: `unmapped-${unmappedText.length + 1}`,
        originalText: line,
        possibleField: line.includes(':') ? line.split(':')[0].trim() : 'Surveyor Remarks / Notes',
        reason: 'Text structure did not match strict predefined field regex or table column format',
        suggestedMapping: 'observations.surveyorNotes',
      });
    }
  }

  // Fallback defaults for empty required structures
  if (clientRequest.requestedDocuments!.length === 0) {
    clientRequest.requestedDocuments = [
      { id: 'doc-1', documentName: 'RC Copy', status: 'Submitted', remarks: 'Verified' },
      { id: 'doc-2', documentName: 'Driving License', status: 'Submitted', remarks: 'Valid' },
      { id: 'doc-3', documentName: 'Policy Copy', status: 'Submitted', remarks: 'Valid' },
      { id: 'doc-4', documentName: 'Claim Form', status: 'Submitted', remarks: 'Signed' },
      { id: 'doc-5', documentName: 'Estimate', status: 'Submitted', remarks: 'Provided' },
      { id: 'doc-6', documentName: 'Invoice', status: invoices.length > 0 ? 'Submitted' : 'Pending', remarks: '' },
      { id: 'doc-7', documentName: 'Bank Details', status: 'Pending', remarks: '' },
    ];
  }

  return {
    success: true,
    documentType: detectedType,
    confidence: docConfidence,
    confidenceLevel,
    policy,
    vehicle,
    clientRequest,
    companyRequest,
    invoices,
    initialEstimate: {
      parts: initialParts,
      labour: initialLabour,
    },
    finalEstimate: {
      parts: finalParts,
      labour: finalLabour,
    },
    observations,
    fieldConfidences,
    unmappedText,
  };
}

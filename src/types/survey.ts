export interface FieldConfidence {
  field: string;
  value: any;
  confidence: number; // 0 to 1
  sourceText?: string;
}

export interface ValidationError {
  code: string; // SF001 to SF017
  field: string;
  message: string;
  severity: 'error' | 'warning';
  expected?: string;
  actual?: string;
}

export interface UnmappedItem {
  id: string;
  originalText: string;
  possibleField?: string;
  reason: string;
  suggestedMapping?: string;
}

export interface ChangeLogEntry {
  id: string;
  timestamp: string;
  field: string;
  oldValue: any;
  newValue: any;
  description: string;
}

export interface PolicyData {
  policyNumber: string;
  surveyNumber?: string;
  policyStartDate: string;
  policyEndDate: string;
  policyPeriodText?: string; // e.g. "29-10-2025 to 28-10-2026"
  endorsement?: string;
  policyType: string; // Comprehensive, Third Party, Nil Dep, etc.
  insuranceCompany: string;
  insuranceOfficeAddress?: string; // e.g. "JODHPUR 74/A FIRST FLOOR BHATI N PLAZZA..."
  insuredName: string;
  insuredAddress: string;
  insuredMobile: string;
  idv: number | string;
  sumInsured: number | string;
  claimNumber: string;
  surveyNumber: string;
  lossDate: string;
  lossLocation: string;
  policyExcess: number | string;
  deductible: number | string;
  ncb: string; // e.g., 20%, 35%, 50%
  previousPolicyNumber: string;
  previousInsuranceCompany: string;
  hpa?: string; // Hypothecation Bank e.g. "H.P. A. : ---"
  appointedBy?: string; // e.g. "JODHPUR"
}

export interface DriverData {
  name: string; // e.g. "CHANDRVEER SINGH"
  age: string; // e.g. "27 Years ( 01-11-1998 )"
  drivingLicenseNumber: string; // e.g. "RJ1520190003224"
  dateOfIssue: string; // e.g. "18-10-2019"
  validUptoNTV: string; // e.g. "31-10-2038"
  validUptoTV: string;
  validFrom: string;
  issuingAuthority: string; // e.g. "JAISALMER"
  typeOfLicense: string; // e.g. "M/c wgr + LMV-NT Only."
}

export interface AccidentParticulars {
  dateTimeOfAccident: string; // e.g. "26-07-2026 09:27 PM"
  placeOfAccident: string; // e.g. "CHANDHAN JAISALMER"
  placeOfSurvey: string; // e.g. "KUMBHAT MOTORS LLP"
  dateOfAllotment: string; // e.g. "06-08-2026"
  dateTimeOfSurvey: string; // e.g. "06-08-2026"
  dateOfReceiptSpotReport: string;
  reinspectionDate?: string; // e.g. "20/08/2026"
}

export interface VehiclePhoto {
  id: string;
  dataUrl: string; // base64 image data
  fileName: string;
  caption: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
}

export interface SourceFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath?: string;
  publicUrl?: string;
  uploadedAt: string;
}

export interface VehicleData {
  registrationNumber: string; // e.g. RJ15CA4929
  registeredOwner?: string; // e.g. "UMMED SINGH"
  ownerSerialNo?: string; // e.g. "01"
  dateOfRegistration: string; // e.g. "01-04-2022"
  chassisNumber: string; // e.g. MZBEU813LNN332776
  engineNumber: string; // e.g. D4FAMM468112
  make: string; // e.g. KIA
  model: string; // e.g. SELTOS
  variant: string; // e.g. WHITE
  makeVariantColor?: string; // e.g. "KIA SELTOS - WHITE"
  typeOfBody?: string; // e.g. "STATION WAGON - MOTOR CAR"
  vehicleType: string; // Private Car, Commercial, Two Wheeler
  preAccidentCondition?: string; // e.g. "GOOD"
  seatingCapacity?: string; // e.g. "05 Nos."
  cubicCapacity?: string; // e.g. "1493 CC"
  fuelUsed?: string; // e.g. "DIESEL"
  taxParticulars?: string; // e.g. "LIFE TIME"
  odometerReading?: string; // e.g. "83317 Kms."
  pucNo?: string;
  pucValidUpto?: string;
  rcNumber: string; // often same as registrationNumber or book number
  yearOfManufacture: string;
}

export interface DocumentRow {
  id: string;
  documentName: string;
  status: 'Submitted' | 'Pending' | 'Not Required' | 'Rejected';
  remarks: string;
}

export interface ClientRequestData {
  clientName: string;
  mobileNumber: string;
  email: string;
  policyNumber: string;
  claimNumber: string;
  vehicleNumber: string;
  requestDate: string;
  clientRemarks: string;
  requestStatus: 'Initiated' | 'In Progress' | 'Documents Pending' | 'Completed';
  followUpDate: string;
  requestedDocuments: DocumentRow[];
}

export interface CompanyRequestData {
  companyName: string;
  companyEmail?: string;
  portalUrl?: string; // Direct link to insurance company survey portal
  claimNumber: string;
  policyNumber: string;
  vehicleNumber: string;
  requestDate: string;
  surveyorName: string;
  companyRemarks: string;
  responseStatus: 'Assigned' | 'Survey Conducted' | 'Queries Raised' | 'Report Submitted';
  followUpDate: string;
  requiredDocuments: DocumentRow[];
}

export interface InitialPartRow {
  id: string;
  selectedForFinal?: boolean; // Selection box to decide whether item shows in Final Estimate
  eNo: string; // Part sequence number, e.g. "18"
  partsDescription: string;
  hsnCode: string;
  billSNo: string;
  remark: string; // e.g., "Damage", "Dent", "Broken"
  estimated: number;
  glassSecondHandRepair: number | null;
  metal35: number | null;
  nonMetal: number | null;
  gstRate: number; // e.g. 18
}

export interface InitialLabourRow {
  id: string;
  selectedForFinal?: boolean; // Selection box to decide whether item shows in Final Estimate
  sNo: string;
  sac: string; // SAC code e.g. 998729
  billSNo: string;
  labourDescription: string;
  estimated: number;
  assessed: number;
  gstRate: number;
  total: number;
}

export interface FinalPartRow {
  id: string;
  sourceInitialId?: string; // Link to InitialPartRow id
  eNo: string;
  partsDescription: string;
  hsnCode: string;
  billSNo: string;
  remark: string;
  estimated: number;
  assessed: number;
  depreciationPercent: number; // e.g. 0, 10, 35, 50
  depreciationAmount: number;
  glassSecondHandRepair: number | null;
  metal35: number | null;
  nonMetal: number | null;
  gstRate: number;
  netAmount: number;
}

export interface FinalLabourRow {
  id: string;
  sourceInitialId?: string; // Link to InitialLabourRow id
  sNo: string;
  sac: string;
  billSNo: string;
  labourDescription: string;
  estimated: number;
  assessed: number;
  gstRate: number;
  total: number;
}

export interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  vendor: string;
  gstNumber: string;
  description: string;
}

export interface GstSummaryRow {
  id: string;
  srNo: number;
  taxPercentage: number; // 0, 5, 12, 18, 28
  actualAllowed: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface EstimateSummary {
  totalPartsEstimated: number;
  totalPartsAssessed: number;
  totalLabourEstimated: number;
  totalLabourAssessed: number;
  totalGstEstimated: number;
  totalGstAssessed: number;
  totalEstimatedAmount: number;
  totalAssessedAmount: number;
  depreciation: number;
  excess: number;
  salvage: number;
  netAssessedAmount: number;
  grandTotal: number;
  sources: { [key: string]: string };
}

export interface ReportObservations {
  causeOfAccident: string;
  natureOfLoss: string;
  garageNameAndAddress: string;
  inspectionDate: string;
  inspectionLocation: string;
  speedometerReading: string;
  tpDamageOrThirdPartyInjury: string;
  surveyorNotes: string;
  recommendations: string;
  policeAction?: string; // e.g. "Not reported as per claimform."
  detailsOfLoadPassenger?: string; // e.g. "Not reported."
  thirdPartyLossInjuries?: string; // e.g. "Nil as per claimform."
  particularsOfLossDamages?: string;
  observationDetailed?: string; // Detailed observation text
  reinspectionNotes?: string;
  notesList?: string[]; // The 6 statutory notes
}

export type DocumentType =
  | 'Client Request'
  | 'Company Request'
  | 'Insurance Policy'
  | 'Initial Estimate'
  | 'Final Estimate'
  | 'Invoice'
  | 'Labour & Repairs'
  | 'Parts Estimate'
  | 'Final Survey Report'
  | 'General Survey Data';

export interface SurveyRecord {
  id: string;
  surveyNumber: string;
  createdAt: string;
  updatedAt: string;
  documentType: DocumentType;
  confidence: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  rawPastedText: string;
  status: 'Draft' | 'Validated' | 'Needs Review' | 'Report Generated' | 'Completed';
  
  policy: PolicyData;
  vehicle: VehicleData;
  driver?: DriverData;
  accident?: AccidentParticulars;
  photos?: VehiclePhoto[];
  sourceFiles?: SourceFile[];
  clientRequest: ClientRequestData;
  companyRequest: CompanyRequestData;
  initialEstimate: {
    parts: InitialPartRow[];
    labour: InitialLabourRow[];
  };
  finalEstimate: {
    parts: FinalPartRow[];
    labour: FinalLabourRow[];
  };
  invoices: InvoiceRow[];
  gstSummary: GstSummaryRow[];
  summary: EstimateSummary;
  observations: ReportObservations;

  fieldConfidences: Record<string, FieldConfidence>;
  validationErrors: ValidationError[];
  unmappedText: UnmappedItem[];
  changeHistory: ChangeLogEntry[];
}

export interface SurveyorSettings {
  surveyorName: string;
  licenseNumber: string;
  slaNumber: string;
  irdaNumber: string;
  surveyorAddress: string;
  surveyorPhone: string;
  surveyorEmail: string;
  bankDetails: string;
  defaultSalvagePercent: number;
  defaultPolicyExcess: number;
  taxMode: 'CGST_SGST' | 'IGST';
}

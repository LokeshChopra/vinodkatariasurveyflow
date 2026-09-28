import { SurveyRecord, SurveyorSettings } from '../types/survey';

export const SAMPLE_FINAL_ESTIMATE_TEXT = `FINAL MOTOR SURVEY & LOSS ASSESSMENT REPORT / FINAL ESTIMATE
Insurance Company: HDFC ERGO General Insurance Co. Ltd.
Policy No: 2311200489120000001
Claim No: CLM-2026-RAJ-091482
Survey No: SF/SRV/2026/08/0421
Date of Loss: 2026-08-14
Loss Location: Near Circuit House, Mandore Road, Jodhpur, Rajasthan
Policy Period: 2026-01-10 to 2027-01-09
Policy Type: Private Car Package Policy - Comprehensive Nil Depreciation
IDV: 785000.00
Sum Insured: 785000.00
Policy Excess: 1000.00
Deductible: 1000.00
NCB: 20%
Previous Policy No: 1204891100234
Previous Insurance Company: ICICI Lombard General Insurance

INSURED & CLIENT DETAILS:
Insured Name: Rajesh Kumar Sharma
Insured Address: Plot 42, Krishna Nagar, Paota, Jodhpur, Rajasthan - 342001
Insured Mobile: 9829012345
Email: rajesh.sharma@example.com

VEHICLE PARTICULARS:
Registration No: RJ15CA4929
RC No: RJ15CA4929
Make: Maruti Suzuki
Model: Swift Dzire
Variant: ZXI Plus
Vehicle Type: Private Car
Engine No: K12MN8492019
Chassis No: MA3FCEB1S00849102
Year of Manufacture: 2024
Date of Registration: 2024-03-18

INVOICE DETAILS:
Invoice No: RJ202G202610514
Date: 20/08/2026
Amount: 17411
Vendor: Shree Maruti Authorized Bodyshop Workshop
GST Number: 08AABCS1429G1Z8
Description: Accidental repairs for front end impact

PARTS ESTIMATE / ASSESSMENT:
E.No | Description | HSN Code | Bill S.No | Remark | Estimated | Glass/Repair | Metal | Non Metal | GST% | Assessed | Dep%
18 FRONT BUMPER UPR 87089900 7 Damage 1420.34 --- --- 1420.34 18.00 1420.34 0.00
19 FRONT BUMPER LOWER GRILLE 87089900 8 Broken 890.00 --- --- 890.00 18.00 890.00 0.00
20 RH HEADLAMP ASSY 85122010 9 Cracked 4650.00 4650.00 --- --- 18.00 4650.00 0.00
21 RADIATOR SUPPORT PANEL 87089900 10 Bent & Dent 2850.00 --- 2850.00 --- 18.00 2850.00 0.00
22 AC CONDENSER ASSY 84189900 11 Punctured 6200.00 --- --- 6200.00 18.00 6200.00 0.00
23 FRONT NUMBER PLATE & BRACKET 83100000 12 Damaged 350.00 --- --- 350.00 18.00 350.00 0.00

LABOUR & REPAIRS:
S.No | SAC | Bill S.No | Labour Description | Estimated | Assessed | GST%
1 998729 1 FRONT BUMPER OPENING & FITTING 650.00 650.00 18.00
2 998729 2 FRONT BUMPER PAINTING CHARGES 2400.00 2200.00 18.00
3 998729 3 RADIATOR SUPPORT ALIGNMENT & DENTING 1200.00 1000.00 18.00
4 998729 4 AC GAS REFILLING & CONDENSER FITTING 1800.00 1600.00 18.00
5 998729 5 HEADLAMP FOCUSING & BRACKET ADJUSTMENT 450.00 400.00 18.00

CLIENT REQUEST CHECKLIST:
Document: RC Copy | Status: Submitted | Remarks: Verified original on DigiLocker
Document: Driving License | Status: Submitted | Remarks: DL valid till 2038
Document: Policy Copy | Status: Submitted | Remarks: Valid nil-dep policy
Document: Claim Form | Status: Submitted | Remarks: Signed by insured
Document: Repair Estimate | Status: Submitted | Remarks: From authorized workshop
Document: Final Invoice | Status: Submitted | Remarks: Bill # RJ202G202610514
Document: Bank Details / Cancelled Cheque | Status: Pending | Remarks: Requested NEFT details

COMPANY REQUEST:
Surveyor Name: Er. Sunil Mathur (SLA-48291)
Request Date: 2026-08-15
Company Remarks: Please verify front apron integrity and odometer reading. Check for any pre-existing damages on bonnet.
Response Status: Survey Conducted
Follow-up Date: 2026-08-22

SURVEYOR OBSERVATIONS:
Cause of Accident: As stated by the insured, while driving on Mandore road, a stray animal suddenly crossed the path causing the driver to brake hard and hit an iron road divider barrier.
Speedometer Reading: 18450 KM
Garage: Shree Maruti Workshop, Mandore Industrial Area
Salvage Value: Scrap value assessed at 350.00 for damaged condenser and plastic scrap.`;

export const SAMPLE_POLICY_TEXT = `THE ORIENTAL INSURANCE COMPANY LIMITED
MOTOR POLICY SCHEDULE / CERTIFICATE OF INSURANCE
Policy Number: 233200/31/2026/0019284
Policy Period: From 00:00 hrs of 15/04/2026 to Midnight of 14/04/2027
Policy Type: Private Car Comprehensive Bundled Policy
Branch Office: Paota Branch, Jodhpur (Code: 233200)

Insured Name: Mrs. Sunita Devi Rathore
Address: House No. 18, Defense Colony, Air Force Area, Jodhpur - 342011
Mobile No: 9414128910
Email: sunita.rathore@example.in

Vehicle Details:
Registration Mark: RJ19CB8842
RC Number: RJ19CB8842
Date of Registration: 12/05/2022
Make: Hyundai Motor India
Model: Creta
Variant: SX 1.5 Petrol
Engine No: G4FLM2049182
Chassis No: MALC811CLPM918234
Year of Manufacture: 2022
Class of Vehicle: Private Car
IDV: 1150000.00
Sum Insured: 1150000.00
Compulsory Deductible / Excess: 1000.00
No Claim Bonus (NCB): 35%
Previous Policy No: OG-25-1901-1801-0004918
Previous Insurer: Bajaj Allianz General Insurance Co. Ltd.`;

export const SAMPLE_CLIENT_REQUEST_TEXT = `CLIENT SURVEY INTIMATION & DOCUMENT STATUS
Client Name: Deepak Verma
Contact Mobile: 9828551420
Email: deepak.verma90@gmail.com
Policy No: 10003/31/26/1948290
Claim No: MOTOR-2026-08291
Vehicle Registration No: RJ14TC0921
Date of Intimation: 2026-08-18
Vehicle Model: Tata Nexon Fearless Plus
Status: Documents Pending
Follow up Date: 2026-08-25

Document Verification List:
1. Registration Certificate (RC) - Status: Submitted - Smart card scan verified
2. Driving License (DL) - Status: Submitted - Valid commercial endorsement
3. Insurance Policy Schedule - Status: Submitted - Period valid
4. Motor Claim Form Duly Signed - Status: Submitted - Form filled
5. Garage Repair Estimate - Status: Submitted - Estimate amount Rs 45,800
6. Final Cash Memo / Tax Invoice - Status: Pending - Workshop preparing bill
7. Cancelled Cheque / NEFT Mandate - Status: Pending - Client to send via WhatsApp
8. Satisfaction Voucher - Status: Not Required - Direct settlement to workshop

Client Remarks: Vehicle was towed to Tata Motors Workshop Jaipur. Front bumper and intercooler damaged due to impact with road pothole. Request early approval.`;

export const DEFAULT_SURVEYOR_SETTINGS: SurveyorSettings = {
  surveyorName: 'Er. Sunil Mathur, B.E. (Mech), F.I.I.I.',
  licenseNumber: 'SLA-48291',
  slaNumber: 'SLA/WZ/2018/00482',
  irdaNumber: 'IRDA/IND/SL/48291/EXP/2028',
  surveyorAddress: 'Office #302, Royal Plaza, Mandore Road, Jodhpur - 342001 (Raj.)',
  surveyorPhone: '+91 98290 44829',
  surveyorEmail: 'mathur.surveys@gmail.com',
  bankDetails: 'SBI A/C: 30491820491, IFSC: SBIN0003284, Paota Branch',
  defaultSalvagePercent: 5,
  defaultPolicyExcess: 1000,
  taxMode: 'CGST_SGST',
};

export const INITIAL_EMPTY_SURVEY: SurveyRecord = {
  id: 'survey-init-01',
  surveyNumber: 'SF/SRV/2026/08/0421',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  documentType: 'Final Estimate',
  confidence: 0.96,
  confidenceLevel: 'High',
  rawPastedText: '',
  status: 'Draft',
  policy: {
    policyNumber: '',
    policyStartDate: '',
    policyEndDate: '',
    policyType: 'Comprehensive Nil Depreciation',
    insuranceCompany: '',
    insuredName: '',
    insuredAddress: '',
    insuredMobile: '',
    idv: 0,
    sumInsured: 0,
    claimNumber: '',
    surveyNumber: 'SF/SRV/2026/08/0421',
    lossDate: '',
    lossLocation: '',
    policyExcess: 1000,
    deductible: 1000,
    ncb: '20%',
    previousPolicyNumber: '',
    previousInsuranceCompany: '',
  },
  vehicle: {
    registrationNumber: '',
    registeredOwner: '',
    ownerSerialNo: '01',
    dateOfRegistration: '',
    chassisNumber: '',
    engineNumber: '',
    make: '',
    model: '',
    variant: '',
    makeVariantColor: '',
    typeOfBody: 'STATION WAGON - MOTOR CAR',
    vehicleType: 'Private Car',
    preAccidentCondition: 'GOOD',
    seatingCapacity: '05 Nos.',
    cubicCapacity: '',
    fuelUsed: 'DIESEL',
    taxParticulars: 'LIFE TIME',
    odometerReading: '',
    pucNo: '',
    pucValidUpto: '',
    rcNumber: '',
    yearOfManufacture: '',
  },
  driver: {
    name: '',
    age: '',
    drivingLicenseNumber: '',
    dateOfIssue: '',
    validUptoNTV: '',
    validUptoTV: '',
    validFrom: '',
    issuingAuthority: '',
    typeOfLicense: 'M/c wgr + LMV-NT Only.',
  },
  accident: {
    dateTimeOfAccident: '',
    placeOfAccident: '',
    placeOfSurvey: '',
    dateOfAllotment: '',
    dateTimeOfSurvey: '',
    dateOfReceiptSpotReport: '',
    reinspectionDate: '',
  },
  photos: [],
  sourceFiles: [],
  clientRequest: {
    clientName: '',
    mobileNumber: '',
    email: '',
    policyNumber: '',
    claimNumber: '',
    vehicleNumber: '',
    requestDate: new Date().toISOString().split('T')[0],
    clientRemarks: '',
    requestStatus: 'Initiated',
    followUpDate: '',
    requestedDocuments: [
      { id: 'doc-1', documentName: 'RC Copy', status: 'Pending', remarks: '' },
      { id: 'doc-2', documentName: 'Driving License', status: 'Pending', remarks: '' },
      { id: 'doc-3', documentName: 'Policy Copy', status: 'Pending', remarks: '' },
      { id: 'doc-4', documentName: 'Claim Form', status: 'Pending', remarks: '' },
      { id: 'doc-5', documentName: 'Estimate', status: 'Pending', remarks: '' },
      { id: 'doc-6', documentName: 'Invoice', status: 'Pending', remarks: '' },
      { id: 'doc-7', documentName: 'Bank Details', status: 'Pending', remarks: '' },
      { id: 'doc-8', documentName: 'Repair Bills', status: 'Pending', remarks: '' },
      { id: 'doc-9', documentName: 'Satisfaction Voucher', status: 'Not Required', remarks: '' },
    ],
  },
  companyRequest: {
    companyName: '',
    companyEmail: '',
    portalUrl: '',
    claimNumber: '',
    policyNumber: '',
    vehicleNumber: '',
    requestDate: new Date().toISOString().split('T')[0],
    surveyorName: 'Er. Sunil Mathur (SLA-48291)',
    companyRemarks: '',
    responseStatus: 'Assigned',
    followUpDate: '',
    requiredDocuments: [
      { id: 'cdoc-1', documentName: 'Inspection Photos', status: 'Pending', remarks: '' },
      { id: 'cdoc-2', documentName: 'Survey Assessment Sheet', status: 'Pending', remarks: '' },
      { id: 'cdoc-3', documentName: 'Original Bills Verification', status: 'Pending', remarks: '' },
    ],
  },
  initialEstimate: {
    parts: [],
    labour: [],
  },
  finalEstimate: {
    parts: [],
    labour: [],
  },
  invoices: [],
  gstSummary: [
    { id: 'gst-0', srNo: 1, taxPercentage: 0, actualAllowed: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
    { id: 'gst-5', srNo: 2, taxPercentage: 5, actualAllowed: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
    { id: 'gst-12', srNo: 3, taxPercentage: 12, actualAllowed: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
    { id: 'gst-18', srNo: 4, taxPercentage: 18, actualAllowed: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
    { id: 'gst-28', srNo: 5, taxPercentage: 28, actualAllowed: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
  ],
  summary: {
    totalPartsEstimated: 0,
    totalPartsAssessed: 0,
    totalLabourEstimated: 0,
    totalLabourAssessed: 0,
    totalGstEstimated: 0,
    totalGstAssessed: 0,
    totalEstimatedAmount: 0,
    totalAssessedAmount: 0,
    depreciation: 0,
    excess: 1000,
    salvage: 0,
    netAssessedAmount: 0,
    grandTotal: 0,
    sources: {},
  },
  observations: {
    causeOfAccident: '',
    natureOfLoss: '',
    garageNameAndAddress: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectionLocation: '',
    speedometerReading: '',
    tpDamageOrThirdPartyInjury: 'No third party injury or property damage reported.',
    surveyorNotes: '',
    recommendations: 'Loss is genuine, accidental in nature and falls within policy terms.',
  },
  fieldConfidences: {},
  validationErrors: [],
  unmappedText: [],
  changeHistory: [],
};

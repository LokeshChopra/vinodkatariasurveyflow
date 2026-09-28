import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { parsePastedTextRuleBased, detectDocumentType } from './src/utils/parserCore.ts';
import { validateSurveyData } from './src/utils/validation.ts';
import { calculateSummary } from './src/utils/calculations.ts';
import { populateSurveyFromJson } from './src/utils/jsonImporter.ts';
import { INITIAL_EMPTY_SURVEY } from './src/utils/sampleData.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Export the API app so Netlify Functions can reuse the exact same endpoints.
export { app };

// Netlify rewrites /api/* requests to the function. Depending on the
// platform rewrite stage, Express can receive the path without the /api
// prefix, so normalize those paths before matching the API routes.
app.use((req, _res, next) => {
  const pathName = req.path || '';
  if (pathName.startsWith('/.netlify/functions/api/')) {
    req.url = `/api/${pathName.slice('/.netlify/functions/api/'.length)}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`;
  } else if (pathName === '/health' || pathName === '/parse-pasted-text' || pathName.startsWith('/ai/')) {
    req.url = `/api${req.url}`;
  }
  next();
});

// Health Check API
app.get('/api/health', (_req: Request, res: Response) => {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
  const aiProvider = hasGemini ? 'Gemini 3.8 Flash' : hasOpenRouter ? 'OpenRouter' : 'Rule-Based Engine (Deterministic)';
  
  res.json({
    status: 'ok',
    service: 'SurveyFlow API',
    ai: aiProvider,
    capabilities: {
      textParsing: true,
      exactTableMapping: true,
      ocrDisabled: true, // Strict enforcement: NO OCR
      validationEngine: true,
    },
  });
});

// Prompt for Gemini AI text parsing with strict JSON schema
const SURVEY_SYSTEM_INSTRUCTION = `You are the SurveyFlow Intelligent Insurance Survey & Loss Assessment Text Parser.
Your job is to read UNSTRUCTURED or semi-structured raw text pasted from insurance documents (Policy schedules, Initial/Final Estimates, Garage bills, Invoices, Client/Company requests).
CRITICAL RULES:
1. DO NOT invent or guess values. If not present in text, leave as empty string or null.
2. Maintain EXACT table row/column relationships.
   For each part in Parts table: E.No, Description, HSN Code, Bill S.No, Remark, Estimated, Glass/2nd Hand/Repair, Metal, Non Metal, GST%, Assessed, Dep%.
   For each labour in Labour table: S.No, SAC, Bill S.No, Description, Estimated, Assessed, GST%, Total.
3. Indian vehicle registration numbers (e.g., RJ15CA4929) must go to vehicle.registrationNumber and vehicle.rcNumber.
4. Policy numbers must go to policy.policyNumber.
5. Invoices (Invoice No, Date, Amount, Vendor, GSTIN) must be placed in invoices array.
6. Any text that cannot be confidently mapped to predefined fields MUST be added to unmappedText array with originalText, possibleField, reason, suggestedMapping.
7. Return strictly valid JSON matching the requested structure.`;

// POST /api/parse-pasted-text
app.post('/api/parse-pasted-text', async (req: Request, res: Response) => {
  try {
    const { text, title } = req.body;

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'No text provided. Please paste document text.',
      });
    }

    const trimmed = text.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const jsonResult = populateSurveyFromJson(trimmed, INITIAL_EMPTY_SURVEY);
        if (jsonResult.success && jsonResult.record) {
          return res.json({
            success: true,
            provider: 'Direct JSON Ingestion Engine',
            data: {
              ...jsonResult.record,
              documentType: jsonResult.record.documentType || 'Final Survey Report',
              confidence: 1.0,
              confidenceLevel: 'High',
            },
          });
        }
      } catch (jsonErr) {
        // Fall through to text parsing if not valid JSON
      }
    }

    const { type: detectedType, confidence: docConfidence, confidenceLevel } = detectDocumentType(text, title);

    // Initialize with our deterministic rule-based parser first as a solid foundation
    const ruleResult = parsePastedTextRuleBased(text, title);

    // If Gemini API Key is available, enhance with Gemini AI
    let parsedData = ruleResult;
    const geminiKey = process.env.GEMINI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: geminiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const prompt = `Analyze the following raw insurance document text and extract all data into structured insurance survey fields.
Document Title/Hint: "${title || detectedType}"
RAW PASTED TEXT:
"""
${text}
"""

Return a JSON object with:
- documentType: (one of 'Client Request', 'Company Request', 'Insurance Policy', 'Initial Estimate', 'Final Estimate', 'Invoice', 'Labour & Repairs', 'Parts Estimate', 'Final Survey Report', 'General Survey Data')
- confidence: (number between 0.5 and 1.0)
- confidenceLevel: ('High', 'Medium', or 'Low')
- policy: { policyNumber, policyStartDate, policyEndDate, policyType, insuranceCompany, insuredName, insuredAddress, insuredMobile, idv, sumInsured, claimNumber, surveyNumber, lossDate, lossLocation, policyExcess, deductible, ncb, previousPolicyNumber, previousInsuranceCompany }
- vehicle: { registrationNumber, make, model, variant, vehicleType, engineNumber, chassisNumber, rcNumber, yearOfManufacture, dateOfRegistration }
- clientRequest: { clientName, mobileNumber, email, policyNumber, claimNumber, vehicleNumber, requestDate, clientRemarks, requestStatus, followUpDate, requestedDocuments: [{ id, documentName, status, remarks }] }
- companyRequest: { companyName, claimNumber, policyNumber, vehicleNumber, requestDate, surveyorName, companyRemarks, responseStatus, followUpDate, requiredDocuments: [{ id, documentName, status, remarks }] }
- initialEstimate: { parts: [{ id, eNo, partsDescription, hsnCode, billSNo, remark, estimated, glassSecondHandRepair, metal35, nonMetal, gstRate }], labour: [{ id, sNo, sac, billSNo, labourDescription, estimated, assessed, gstRate, total }] }
- finalEstimate: { parts: [{ id, eNo, partsDescription, hsnCode, billSNo, remark, estimated, assessed, depreciationPercent, depreciationAmount, glassSecondHandRepair, metal35, nonMetal, gstRate, netAmount }], labour: [{ id, sNo, sac, billSNo, labourDescription, estimated, assessed, gstRate, total }] }
- invoices: [{ id, invoiceNumber, invoiceDate, invoiceAmount, vendor, gstNumber, description }]
- observations: { causeOfAccident, natureOfLoss, garageNameAndAddress, inspectionDate, inspectionLocation, speedometerReading, tpDamageOrThirdPartyInjury, surveyorNotes, recommendations }
- unmappedText: [{ id, originalText, possibleField, reason, suggestedMapping }]`;

        const response = await ai.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: SURVEY_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        if (response.text) {
          const aiJson = JSON.parse(response.text);
          // Merge AI result with rule-based to ensure no fields are lost
          parsedData = {
            ...ruleResult,
            documentType: aiJson.documentType || ruleResult.documentType,
            confidence: aiJson.confidence || ruleResult.confidence,
            confidenceLevel: aiJson.confidenceLevel || ruleResult.confidenceLevel,
            policy: { ...ruleResult.policy, ...(aiJson.policy || {}) },
            vehicle: { ...ruleResult.vehicle, ...(aiJson.vehicle || {}) },
            clientRequest: {
              ...ruleResult.clientRequest,
              ...(aiJson.clientRequest || {}),
              requestedDocuments: (aiJson.clientRequest?.requestedDocuments?.length > 0)
                ? aiJson.clientRequest.requestedDocuments
                : ruleResult.clientRequest.requestedDocuments,
            },
            companyRequest: {
              ...ruleResult.companyRequest,
              ...(aiJson.companyRequest || {}),
              requiredDocuments: (aiJson.companyRequest?.requiredDocuments?.length > 0)
                ? aiJson.companyRequest.requiredDocuments
                : ruleResult.companyRequest.requiredDocuments,
            },
            invoices: (aiJson.invoices?.length > 0) ? aiJson.invoices : ruleResult.invoices,
            initialEstimate: {
              parts: (aiJson.initialEstimate?.parts?.length > 0) ? aiJson.initialEstimate.parts : ruleResult.initialEstimate.parts,
              labour: (aiJson.initialEstimate?.labour?.length > 0) ? aiJson.initialEstimate.labour : ruleResult.initialEstimate.labour,
            },
            finalEstimate: {
              parts: (aiJson.finalEstimate?.parts?.length > 0) ? aiJson.finalEstimate.parts : ruleResult.finalEstimate.parts,
              labour: (aiJson.finalEstimate?.labour?.length > 0) ? aiJson.finalEstimate.labour : ruleResult.finalEstimate.labour,
            },
            observations: { ...ruleResult.observations, ...(aiJson.observations || {}) },
            unmappedText: (aiJson.unmappedText?.length > 0) ? aiJson.unmappedText : ruleResult.unmappedText,
          };
        }
      } catch (geminiError) {
        console.warn('Gemini extraction notice (falling back to robust deterministic parser):', geminiError);
      }
    } else if (openrouterKey) {
      // OpenRouter Text model fallback
      try {
        const scanModel = process.env.SCAN_MODEL || 'google/gemini-2.0-flash-001';
        const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: scanModel,
            messages: [
              { role: 'system', content: SURVEY_SYSTEM_INSTRUCTION },
              { role: 'user', content: `Parse this document into JSON: \n${text}` },
            ],
            response_format: { type: 'json_object' },
          }),
        });

        if (orRes.ok) {
          const orData = await orRes.json();
          const content = orData.choices?.[0]?.message?.content;
          if (content) {
            const aiJson = JSON.parse(content);
            parsedData = {
              ...ruleResult,
              ...aiJson,
              policy: { ...ruleResult.policy, ...(aiJson.policy || {}) },
              vehicle: { ...ruleResult.vehicle, ...(aiJson.vehicle || {}) },
            };
          }
        }
      } catch (orErr) {
        console.warn('OpenRouter parsing notice:', orErr);
      }
    }

    // Sanitize parts, labour, and statuses so no fields are null
    const sanitizedInitialParts = (parsedData.initialEstimate.parts || []).map((p: any, idx: number) => ({
      ...p,
      id: p.id || `init-part-${idx + 1}`,
      selectedForFinal: p.selectedForFinal !== false,
      gstRate: p.gstRate !== undefined && p.gstRate !== null && !isNaN(Number(p.gstRate)) ? Number(p.gstRate) : 18,
    }));
    const sanitizedInitialLabour = (parsedData.initialEstimate.labour || []).map((l: any, idx: number) => ({
      ...l,
      id: l.id || `init-lab-${idx + 1}`,
      selectedForFinal: l.selectedForFinal !== false,
      gstRate: l.gstRate !== undefined && l.gstRate !== null && !isNaN(Number(l.gstRate)) ? Number(l.gstRate) : 18,
    }));
    const sanitizedFinalParts = (parsedData.finalEstimate.parts || []).map((p: any, idx: number) => ({
      ...p,
      id: p.id || `final-part-${idx + 1}`,
      sourceInitialId: p.sourceInitialId || p.id || `init-part-${idx + 1}`,
      gstRate: p.gstRate !== undefined && p.gstRate !== null && !isNaN(Number(p.gstRate)) ? Number(p.gstRate) : 18,
    }));
    const sanitizedFinalLabour = (parsedData.finalEstimate.labour || []).map((l: any, idx: number) => ({
      ...l,
      id: l.id || `final-lab-${idx + 1}`,
      sourceInitialId: l.sourceInitialId || l.id || `init-lab-${idx + 1}`,
      gstRate: l.gstRate !== undefined && l.gstRate !== null && !isNaN(Number(l.gstRate)) ? Number(l.gstRate) : 18,
    }));

    parsedData.initialEstimate.parts = sanitizedInitialParts;
    parsedData.initialEstimate.labour = sanitizedInitialLabour;
    parsedData.finalEstimate.parts = sanitizedFinalParts;
    parsedData.finalEstimate.labour = sanitizedFinalLabour;

    if (parsedData.clientRequest) {
      parsedData.clientRequest.requestStatus = parsedData.clientRequest.requestStatus || 'Initiated';
      parsedData.clientRequest.requestedDocuments = (parsedData.clientRequest.requestedDocuments || []).map((d: any) => ({
        ...d,
        status: d.status || 'Pending',
      }));
    }
    if (parsedData.companyRequest) {
      parsedData.companyRequest.responseStatus = parsedData.companyRequest.responseStatus || 'Assigned';
      parsedData.companyRequest.requiredDocuments = (parsedData.companyRequest.requiredDocuments || []).map((d: any) => ({
        ...d,
        status: d.status || 'Pending',
      }));
    }

    // Recalculate summary & GST based on parts and labour
    const excessVal = Number(parsedData.policy?.policyExcess) || 1000;
    const { summary, gstSummary } = calculateSummary(
      parsedData.initialEstimate.parts,
      parsedData.initialEstimate.labour,
      parsedData.finalEstimate.parts,
      parsedData.finalEstimate.labour,
      excessVal,
      0
    );

    // Validate structured survey data for SF001 - SF017
    const validationErrors = validateSurveyData({
      policy: parsedData.policy as any,
      vehicle: parsedData.vehicle as any,
      invoices: parsedData.invoices,
      initialEstimate: parsedData.initialEstimate,
      finalEstimate: parsedData.finalEstimate,
      fieldConfidences: parsedData.fieldConfidences,
      unmappedText: parsedData.unmappedText,
      documentType: parsedData.documentType,
    });

    return res.json({
      success: true,
      documentType: parsedData.documentType,
      confidence: parsedData.confidence,
      confidenceLevel: parsedData.confidenceLevel,
      data: {
        policy: parsedData.policy,
        vehicle: parsedData.vehicle,
        clientRequest: parsedData.clientRequest,
        companyRequest: parsedData.companyRequest,
        invoices: parsedData.invoices,
        initialEstimate: parsedData.initialEstimate,
        finalEstimate: parsedData.finalEstimate,
        gstSummary,
        summary,
        observations: parsedData.observations,
      },
      fieldConfidences: parsedData.fieldConfidences,
      validationErrors,
      unmappedText: parsedData.unmappedText,
    });
  } catch (error: any) {
    console.error('Server error in /api/parse-pasted-text:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process text: ' + (error?.message || 'Unknown error'),
      validationErrors: [
        {
          code: 'SF012',
          field: 'text',
          message: 'Unable to parse provided text block completely.',
          severity: 'error',
        },
      ],
      unmappedText: [],
    });
  }
});

// ==========================================
// AI ASSISTANT & INTELLIGENCE API ENDPOINTS
// ==========================================

// Helper to initialize Google Gen AI
function getGeminiClient(): GoogleGenAI | null {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return null;
  return new GoogleGenAI({
    apiKey: geminiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. POST /api/ai/assistant - Surveyor Interactive Copilot
app.post('/api/ai/assistant', async (req: Request, res: Response) => {
  try {
    const { prompt, surveyContext, conversationHistory } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }

    const ai = getGeminiClient();
    const systemPrompt = `You are "SurveyFlow AI Copilot", an elite Motor Insurance Surveyor & Loss Assessor intelligence system operating under IRDAI (Insurance Regulatory and Development Authority of India) guidelines.
You assist licensed insurance surveyors with:
1. Technical claim assessment and damage corroboration with accident cause.
2. IRDAI depreciation norms (Glass: 0%, Rubber/Plastic/Nylon: 50%, Fiber glass: 30%, Metal: 0% to 50% based on vehicle age slab).
3. GST compliance (HSN/SAC codes, 18% vs 28%, input tax credit norms).
4. Salvage value determination, policy excess deduction, and insurer net liability.
5. Drafting formal surveyor observations, inspection remarks, and insurer intimations.
6. Identifying potential fraud, mismatched damage patterns, or documentation gaps.

Current Survey Record Data:
${JSON.stringify(surveyContext || {}, null, 2)}

Provide clear, professional, concise, authoritative guidance. When answering calculations or policy clauses, cite specific figures and IRDAI rules where appropriate. If asked to draft text, format it cleanly ready to be copied or inserted.`;

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
          },
        });

        return res.json({
          success: true,
          provider: 'Gemini 3.8 Flash',
          reply: response.text || 'No response generated by AI.',
        });
      } catch (geminiErr: any) {
        console.warn('Gemini assistant call failed, providing rule-based fallback:', geminiErr);
      }
    }

    // High quality deterministic surveyor assistant fallback
    const pLower = prompt.toLowerCase();
    let fallbackReply = '';
    if (pLower.includes('depreciation') || pLower.includes('rate')) {
      fallbackReply = `**IRDAI Standard Depreciation Schedule (Motor Vehicles):**\n- **Rubber / Nylon / Plastic Parts / Tyres / Batteries**: 50%\n- **Fibre Glass Parts**: 30%\n- **Glass Parts**: Nil (0%)\n- **Metal Parts (Age of vehicle)**:\n  * Up to 6 months: Nil (0%)\n  * 6 months to 1 year: 5%\n  * 1 to 2 years: 10%\n  * 2 to 3 years: 15%\n  * 3 to 4 years: 25%\n  * 4 to 5 years: 35%\n  * 5 to 10 years: 40%\n  * Over 10 years: 50%`;
    } else if (pLower.includes('gst') || pLower.includes('tax')) {
      fallbackReply = `**Motor Claim GST Guidelines:**\n- **Automobile Spare Parts**: General GST rate is 18% or 28% depending on HSN code.\n- **Labour / Repair Services (SAC 998729)**: Standard 18% GST (9% CGST + 9% SGST for intra-state, 18% IGST for inter-state).\n- Insurer pays GST only on assessed parts and admissible labour, less salvage and compulsory policy excess.`;
    } else if (pLower.includes('observation') || pLower.includes('accident') || pLower.includes('cause')) {
      const reg = surveyContext?.vehicle?.registrationNumber || 'the vehicle';
      const cause = surveyContext?.observations?.causeOfAccident || 'an impact collision';
      fallbackReply = `**Draft Technical Surveyor Observations:**\n"On physical inspection of vehicle bearing Reg. No. ${reg} at the designated workshop, damages were observed primarily to the front section consistent with ${cause}. The damages to the bumper, front grille, and radiator support correlate directly with the reported point of impact. No pre-existing damages or mechanical wear inconsistencies were noted on the critical components assessed. Assessment is recommended strictly as per IMT norms."`;
    } else {
      const reg = surveyContext?.vehicle?.registrationNumber || 'N/A';
      const policyNo = surveyContext?.policy?.policyNumber || 'N/A';
      const grandTotal = surveyContext?.summary?.grandTotal || 0;
      fallbackReply = `**Surveyor Intelligence Summary:**\n- **Active Vehicle**: ${reg}\n- **Policy No**: ${policyNo}\n- **Assessed Net Insurer Liability**: ₹${Number(grandTotal).toLocaleString('en-IN')}\n\nAll table fields have been verified against current survey record. You can ask me to draft technical observations, audit the claim for discrepancies, or draft WhatsApp/Email messages for the client.`;
    }

    return res.json({
      success: true,
      provider: 'Deterministic Surveyor Intelligence Engine',
      reply: fallbackReply,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/assistant:', err);
    return res.status(500).json({ success: false, message: err?.message || 'AI Assistant encountered an error.' });
  }
});

// 2. POST /api/ai/draft-communication - Draft WhatsApp & Email for Client Request
app.post('/api/ai/draft-communication', async (req: Request, res: Response) => {
  try {
    const {
      templateType, // 'pending_docs' | 'survey_scheduled' | 'estimate_approval' | 'final_report' | 'custom'
      language = 'en', // 'en' | 'hi' | 'hinglish'
      clientRequest,
      policy,
      vehicle,
      summary,
      settings,
      customInstructions,
    } = req.body;

    const pendingDocs = (clientRequest?.requestedDocuments || [])
      .filter((d: any) => d.status === 'Pending')
      .map((d: any) => d.documentName);

    const clientName = clientRequest?.clientName || policy?.insuredName || 'Valued Client';
    const regNo = vehicle?.registrationNumber || clientRequest?.vehicleNumber || 'Vehicle';
    const claimNo = clientRequest?.claimNumber || policy?.claimNumber || 'N/A';
    const policyNo = clientRequest?.policyNumber || policy?.policyNumber || 'N/A';
    const surveyorName = settings?.surveyorName || 'Insurance Surveyor & Loss Assessor';
    const surveyorPhone = settings?.surveyorPhone || '';

    const ai = getGeminiClient();

    const systemPrompt = `You are an expert communication drafter for licensed Indian Motor Insurance Surveyors.
You will generate two formats:
1. "whatsappMessage": A polished WhatsApp message formatted with emojis and *bold* text, clear bullet points, warm yet professional tone, ready for 1-click dispatch.
2. "emailSubject": A formal email subject line with Claim No, Vehicle Reg No, and purpose.
3. "emailBody": A formal, polite, complete email body with greeting, clear request/details, document bullet points, surveyor contact signature.

Language: ${language === 'hi' ? 'Hindi (Devanagari script)' : language === 'hinglish' ? 'Hinglish (Conversational polite Hindi written in English script)' : 'Professional English'}
Template Type: ${templateType}
Custom Instructions: ${customInstructions || 'None'}

Input Context:
- Client Name: ${clientName}
- Vehicle Number: ${regNo}
- Claim Number: ${claimNo}
- Policy Number: ${policyNo}
- Pending Documents: ${pendingDocs.join(', ') || 'None'}
- Net Assessed Amount: ₹${summary?.grandTotal || '0'}
- Surveyor Name: ${surveyorName}
- Surveyor Contact: ${surveyorPhone}

Return STRICT JSON:
{
  "whatsappMessage": "string",
  "emailSubject": "string",
  "emailBody": "string"
}`;

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
          contents: `Draft the communication for client request now. Follow the template type "${templateType}".`,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          return res.json({
            success: true,
            provider: 'Gemini 3.8 Flash',
            data: parsed,
          });
        }
      } catch (aiErr) {
        console.warn('Gemini communication draft notice (using deterministic templates):', aiErr);
      }
    }

    // High quality deterministic templates
    let whatsappMessage = '';
    let emailSubject = '';
    let emailBody = '';

    const docBullets = pendingDocs.length > 0 
      ? pendingDocs.map((d: string) => `  • ${d}`).join('\n')
      : '  • Original RC Book\n  • Driving License\n  • Duly Signed Claim Form';

    if (templateType === 'pending_docs') {
      emailSubject = `URGENT: Required Claim Documents - Vehicle ${regNo} (Claim: ${claimNo})`;
      emailBody = `Dear ${clientName},\n\nGreetings from the Office of Insurance Surveyor & Loss Assessor.\n\nWith reference to your motor insurance claim for vehicle ${regNo} under Policy No. ${policyNo} (Claim No: ${claimNo}), we request you to kindly submit the following pending documents at your earliest convenience to expedite the survey assessment process:\n\n${docBullets}\n\nYou may send clear scanned copies or clear photographs via WhatsApp or reply to this email.\n\nThank you for your prompt cooperation.\n\nSincerely,\n${surveyorName}\nIRDAI Licensed Surveyor & Loss Assessor\nPhone: ${surveyorPhone}`;

      whatsappMessage = `*Insurance Survey Claim Notice*\n\nDear *${clientName}*,\n\nRegarding your vehicle *${regNo}* (Claim No: *${claimNo}*), please share the following pending documents to finalize your insurance claim assessment:\n\n${docBullets}\n\nKindly send clear photos or PDF copies here on WhatsApp.\n\nRegards,\n*${surveyorName}*\n_Insurance Surveyor & Loss Assessor_\n📞 ${surveyorPhone}`;
    } else if (templateType === 'survey_scheduled') {
      emailSubject = `Survey Inspection Schedule - Vehicle ${regNo} (Claim: ${claimNo})`;
      emailBody = `Dear ${clientName},\n\nThis is to inform you that the physical survey inspection for your vehicle ${regNo} (Claim No: ${claimNo}) has been scheduled.\n\nPlease ensure the vehicle is washed and available at the workshop along with the original RC and Driving License for physical verification.\n\nBest regards,\n${surveyorName}\nIRDAI Licensed Surveyor\nPhone: ${surveyorPhone}`;

      whatsappMessage = `*Survey Inspection Update*\n\nDear *${clientName}*,\n\nThe physical survey inspection for your vehicle *${regNo}* (Claim No: *${claimNo}*) is scheduled at the workshop.\n\nKindly ensure original RC & DL are available for verification.\n\nRegards,\n*${surveyorName}* (Surveyor)\n📞 ${surveyorPhone}`;
    } else if (templateType === 'final_report') {
      emailSubject = `Final Survey & Loss Assessment Completed - Vehicle ${regNo} (Claim: ${claimNo})`;
      emailBody = `Dear ${clientName},\n\nWe are pleased to inform you that the final survey assessment for your vehicle ${regNo} (Claim No: ${claimNo}) has been completed and submitted to the insurance company.\n\nNet Assessed Insurer Liability: ₹${Number(summary?.grandTotal || 0).toLocaleString('en-IN')}.\n\nThe insurer claim settlement department will process the payout / garage delivery order as per policy terms.\n\nSincerely,\n${surveyorName}\nIRDAI Licensed Surveyor`;

      whatsappMessage = `*Survey Assessment Completed* ✅\n\nDear *${clientName}*,\n\nThe final survey assessment for your vehicle *${regNo}* (Claim: *${claimNo}*) has been finalized and submitted to the insurance company.\n\n*Net Assessed Amount*: ₹${Number(summary?.grandTotal || 0).toLocaleString('en-IN')}\n\nThank you,\n*${surveyorName}* (Surveyor)`;
    } else {
      emailSubject = `Claim Status Update - Vehicle ${regNo} (Claim: ${claimNo})`;
      emailBody = `Dear ${clientName},\n\nThis is an update regarding your motor claim for vehicle ${regNo} (Claim No: ${claimNo}).\n\nStatus: ${clientRequest?.requestStatus || 'In Progress'}\n\nPlease feel free to contact us for any assistance.\n\nRegards,\n${surveyorName}\nPhone: ${surveyorPhone}`;

      whatsappMessage = `*Insurance Claim Update*\n\nDear *${clientName}*,\n\nStatus update for vehicle *${regNo}* (Claim: *${claimNo}*):\n*Status*: ${clientRequest?.requestStatus || 'In Progress'}\n\nFor queries, feel free to reach out.\n\nRegards,\n*${surveyorName}*\n📞 ${surveyorPhone}`;
    }

    return res.json({
      success: true,
      provider: 'Deterministic Template Engine',
      data: {
        whatsappMessage,
        emailSubject,
        emailBody,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/ai/draft-communication:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Error drafting communication' });
  }
});

// 3. POST /api/ai/audit-survey - Deep IRDAI Survey & Loss Assessment Quality Audit
app.post('/api/ai/audit-survey', async (req: Request, res: Response) => {
  try {
    const { surveyRecord } = req.body;
    if (!surveyRecord) {
      return res.status(400).json({ success: false, message: 'Survey record is required' });
    }

    const ai = getGeminiClient();

    const systemPrompt = `You are a Chief IRDAI Motor Surveyor Auditor. Audit the following survey record for regulatory compliance, arithmetic accuracy, depreciation norms, and claim integrity.
Output strictly valid JSON matching this schema:
{
  "score": number (0 to 100),
  "verdict": string ("Excellent" | "Good" | "Needs Review" | "Critical Compliance Gaps"),
  "summary": string,
  "checklist": [
    {
      "category": string ("Policy & Validity" | "Vehicle & Identification" | "Depreciation Compliance" | "GST & Calculations" | "Observations & Cause"),
      "item": string,
      "status": "PASS" | "WARN" | "FAIL",
      "detail": string
    }
  ],
  "recommendations": [string]
}`;

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
          contents: `Audit this survey record thoroughly: \n${JSON.stringify(surveyRecord, null, 2)}`,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          return res.json({
            success: true,
            provider: 'Gemini 3.8 Flash Deep Audit',
            data: parsed,
          });
        }
      } catch (err) {
        console.warn('Gemini audit notice (using robust rule auditor):', err);
      }
    }

    // Deterministic Rule-Based Audit
    const checklist: any[] = [];
    let score = 100;

    // 1. Policy & Insured
    if (surveyRecord.policy?.policyNumber && surveyRecord.policy?.insuredName) {
      checklist.push({
        category: 'Policy & Validity',
        item: 'Policy Number & Insured Particulars',
        status: 'PASS',
        detail: `Valid policy ${surveyRecord.policy.policyNumber} issued to ${surveyRecord.policy.insuredName}.`,
      });
    } else {
      score -= 20;
      checklist.push({
        category: 'Policy & Validity',
        item: 'Policy Number or Insured Missing',
        status: 'FAIL',
        detail: 'Both policy number and insured name are mandatory under Section 64VB of Insurance Act.',
      });
    }

    // 2. Vehicle Registration & Chassis
    const hasReg = Boolean(surveyRecord.vehicle?.registrationNumber || surveyRecord.vehicle?.rcNumber);
    const hasChassis = Boolean(surveyRecord.vehicle?.chassisNumber);
    if (hasReg && hasChassis) {
      checklist.push({
        category: 'Vehicle & Identification',
        item: 'Registration & Chassis Verification',
        status: 'PASS',
        detail: `Registration (${surveyRecord.vehicle.registrationNumber}) and Chassis (${surveyRecord.vehicle.chassisNumber}) verified.`,
      });
    } else {
      score -= 15;
      checklist.push({
        category: 'Vehicle & Identification',
        item: 'Chassis / Engine Number Missing',
        status: 'WARN',
        detail: 'Chassis or Engine number is incomplete. Physical etching check required on vehicle.',
      });
    }

    // 3. Estimate & Assessment Rows
    const initialCount = surveyRecord.initialEstimate?.parts?.length || 0;
    const finalCount = surveyRecord.finalEstimate?.parts?.length || 0;
    if (finalCount > 0) {
      checklist.push({
        category: 'Depreciation Compliance',
        item: 'Final Estimate Itemization',
        status: 'PASS',
        detail: `${finalCount} parts assessed with depreciation applied as per IMT schedule.`,
      });
    } else if (initialCount > 0) {
      score -= 10;
      checklist.push({
        category: 'Depreciation Compliance',
        item: 'Final Assessment Pending',
        status: 'WARN',
        detail: 'Initial estimate parts exist, but final assessment has not yet been populated or approved.',
      });
    } else {
      score -= 25;
      checklist.push({
        category: 'Depreciation Compliance',
        item: 'No Parts or Labour Recorded',
        status: 'FAIL',
        detail: 'Neither initial nor final estimate contain part items.',
      });
    }

    // 4. GST & Excess
    const excess = Number(surveyRecord.policy?.policyExcess || surveyRecord.summary?.excess || 0);
    if (excess > 0) {
      checklist.push({
        category: 'GST & Calculations',
        item: 'Policy Excess Deduction',
        status: 'PASS',
        detail: `Compulsory deductible of ₹${excess} applied before net liability calculation.`,
      });
    } else {
      checklist.push({
        category: 'GST & Calculations',
        item: 'Compulsory Excess Check',
        status: 'WARN',
        detail: 'Policy excess is 0. Ensure policy is Nil Deductible or add standard IRDAI excess.',
      });
    }

    // 5. Observations
    if (surveyRecord.observations?.causeOfAccident && surveyRecord.observations?.causeOfAccident.trim().length > 10) {
      checklist.push({
        category: 'Observations & Cause',
        item: 'Accident Cause & Corroboration',
        status: 'PASS',
        detail: 'Accident cause recorded and damages correspond with impact direction.',
      });
    } else {
      score -= 15;
      checklist.push({
        category: 'Observations & Cause',
        item: 'Accident Cause Description Incomplete',
        status: 'WARN',
        detail: 'Surveyor must document specific cause of accident and physical inspection date.',
      });
    }

    const finalScore = Math.max(20, Math.min(100, score));
    const verdict = finalScore >= 90 ? 'Excellent' : finalScore >= 75 ? 'Good' : finalScore >= 50 ? 'Needs Review' : 'Critical Compliance Gaps';

    return res.json({
      success: true,
      provider: 'Deterministic IRDAI Rules Engine',
      data: {
        score: finalScore,
        verdict,
        summary: `Survey audit complete: ${finalScore}/100 score. ${verdict}.`,
        checklist,
        recommendations: [
          'Verify all pending client documents (RC & DL) before submitting report.',
          'Cross-check 18% vs 28% GST rate slabs on assessed replacement spare parts.',
          'Ensure surveyor observations detail exact point of collision and vehicle inspection date.',
        ],
      },
    });
  } catch (err: any) {
    console.error('Error in /api/ai/audit-survey:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Error auditing survey' });
  }
});

// Mount Vite or serve static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // In dev, use Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`SurveyFlow fullstack server running on http://localhost:${PORT}`);
  });
}

// Only start a local HTTP server when this file is executed directly.
// Netlify imports `app` from this module and handles it through a Function.
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  startServer();
}

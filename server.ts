import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

import {
  parsePastedTextRuleBased,
  detectDocumentType,
} from './src/utils/parserCore.ts';

import { validateSurveyData } from './src/utils/validation.ts';
import { calculateSummary } from './src/utils/calculations.ts';
import { populateSurveyFromJson } from './src/utils/jsonImporter.ts';
import { INITIAL_EMPTY_SURVEY } from './src/utils/sampleData.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '10mb' }));

// IMPORTANT:
// Netlify Function imports this Express app.
// Do NOT import Vite here.
export { app };


// ============================================================
// NETLIFY / API PATH NORMALIZATION
// ============================================================

app.use((req, _res, next) => {
  const pathName = req.path || '';

  // Netlify Function direct path
  if (pathName.startsWith('/.netlify/functions/api/')) {
    const apiPath = pathName.slice('/.netlify/functions/api/'.length);

    const query =
      req.url.includes('?')
        ? req.url.slice(req.url.indexOf('?'))
        : '';

    req.url = `/api/${apiPath}${query}`;
  }

  // Netlify rewrite can remove /api prefix
  else if (
    pathName === '/health' ||
    pathName === '/parse-pasted-text' ||
    pathName.startsWith('/ai/')
  ) {
    req.url = `/api${req.url}`;
  }

  next();
});


// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/health', (_req: Request, res: Response) => {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);

  const aiProvider = hasGemini
    ? 'Gemini 3.8 Flash'
    : hasOpenRouter
      ? 'OpenRouter'
      : 'Rule-Based Engine (Deterministic)';

  res.json({
    status: 'ok',
    service: 'SurveyFlow API',
    ai: aiProvider,

    capabilities: {
      textParsing: true,
      exactTableMapping: true,
      ocrDisabled: true,
      validationEngine: true,
    },
  });
});


// ============================================================
// GEMINI SYSTEM INSTRUCTION
// ============================================================

const SURVEY_SYSTEM_INSTRUCTION = `
You are the SurveyFlow Intelligent Insurance Survey & Loss Assessment Text Parser.

Your job is to read UNSTRUCTURED or semi-structured raw text pasted from insurance documents:

- Policy schedules
- Initial Estimates
- Final Estimates
- Garage Bills
- Invoices
- Client Requests
- Company Requests

CRITICAL RULES:

1. DO NOT invent or guess values.
   If a value is not present in the text, return empty string or null.

2. Maintain EXACT table row/column relationships.

For Parts table:

E.No
Description
HSN Code
Bill S.No
Remark
Estimated
Glass/2nd Hand/Repair
Metal
Non Metal
GST%
Assessed
Dep%

For Labour table:

S.No
SAC
Bill S.No
Description
Estimated
Assessed
GST%
Total

3. Indian vehicle registration numbers such as RJ15CA4929
must go to:

vehicle.registrationNumber
vehicle.rcNumber

4. Policy numbers must go to:

policy.policyNumber

5. Invoice information must go to invoices array.

6. Any text that cannot confidently be mapped to a predefined field
must go to unmappedText array with:

originalText
possibleField
reason
suggestedMapping

7. Return STRICTLY VALID JSON.
`;


// ============================================================
// POST /api/parse-pasted-text
// ============================================================

app.post(
  '/api/parse-pasted-text',
  async (req: Request, res: Response) => {

    try {

      const { text, title } = req.body;

      if (
        !text ||
        typeof text !== 'string' ||
        text.trim() === ''
      ) {
        return res.status(400).json({
          success: false,
          message: 'No text provided. Please paste document text.',
        });
      }

      const trimmed = text.trim();


      // ======================================================
      // DIRECT JSON IMPORT
      // ======================================================

      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {

        try {

          const jsonResult =
            populateSurveyFromJson(
              trimmed,
              INITIAL_EMPTY_SURVEY
            );

          if (
            jsonResult.success &&
            jsonResult.record
          ) {

            return res.json({
              success: true,

              provider:
                'Direct JSON Ingestion Engine',

              data: {
                ...jsonResult.record,

                documentType:
                  jsonResult.record.documentType ||
                  'Final Survey Report',

                confidence: 1.0,

                confidenceLevel: 'High',
              },
            });
          }

        } catch (_jsonErr) {
          // Continue with text parser
        }
      }


      // ======================================================
      // DOCUMENT TYPE
      // ======================================================

      const {
        type: detectedType,
        confidence: docConfidence,
        confidenceLevel,
      } =
        detectDocumentType(
          text,
          title
        );


      // ======================================================
      // RULE BASED PARSER FIRST
      // ======================================================

      const ruleResult =
        parsePastedTextRuleBased(
          text,
          title
        );

      let parsedData: any = ruleResult;


      // ======================================================
      // AI PROVIDERS
      // ======================================================

      const geminiKey =
        process.env.GEMINI_API_KEY;

      const openrouterKey =
        process.env.OPENROUTER_API_KEY;


      // ======================================================
      // GEMINI
      // ======================================================

      if (geminiKey) {

        try {

          const ai =
            new GoogleGenAI({
              apiKey: geminiKey,

              httpOptions: {
                headers: {
                  'User-Agent': 'SurveyFlow-Netlify',
                },
              },
            });


          const prompt = `
Analyze the following raw insurance document text.

Document Title/Hint:
"${title || detectedType}"

RAW DOCUMENT TEXT:
"""
${text}
"""

Return a JSON object with:

- documentType
- confidence
- confidenceLevel

- policy:
{
 policyNumber,
 policyStartDate,
 policyEndDate,
 policyType,
 insuranceCompany,
 insuredName,
 insuredAddress,
 insuredMobile,
 idv,
 sumInsured,
 claimNumber,
 surveyNumber,
 lossDate,
 lossLocation,
 policyExcess,
 deductible,
 ncb,
 previousPolicyNumber,
 previousInsuranceCompany
}

- vehicle:
{
 registrationNumber,
 make,
 model,
 variant,
 vehicleType,
 engineNumber,
 chassisNumber,
 rcNumber,
 yearOfManufacture,
 dateOfRegistration
}

- clientRequest:
{
 clientName,
 mobileNumber,
 email,
 policyNumber,
 claimNumber,
 vehicleNumber,
 requestDate,
 clientRemarks,
 requestStatus,
 followUpDate,
 requestedDocuments:
 [
   {
     id,
     documentName,
     status,
     remarks
   }
 ]
}

- companyRequest:
{
 companyName,
 claimNumber,
 policyNumber,
 vehicleNumber,
 requestDate,
 surveyorName,
 companyRemarks,
 responseStatus,
 followUpDate,
 requiredDocuments:
 [
   {
     id,
     documentName,
     status,
     remarks
   }
 ]
}

- initialEstimate:
{
 parts:
 [
   {
     id,
     eNo,
     partsDescription,
     hsnCode,
     billSNo,
     remark,
     estimated,
     glassSecondHandRepair,
     metal35,
     nonMetal,
     gstRate
   }
 ],

 labour:
 [
   {
     id,
     sNo,
     sac,
     billSNo,
     labourDescription,
     estimated,
     assessed,
     gstRate,
     total
   }
 ]
}

- finalEstimate:
{
 parts:
 [
   {
     id,
     eNo,
     partsDescription,
     hsnCode,
     billSNo,
     remark,
     estimated,
     assessed,
     depreciationPercent,
     depreciationAmount,
     glassSecondHandRepair,
     metal35,
     nonMetal,
     gstRate,
     netAmount
   }
 ],

 labour:
 [
   {
     id,
     sNo,
     sac,
     billSNo,
     labourDescription,
     estimated,
     assessed,
     gstRate,
     total
   }
 ]
}

- invoices:
[
 {
   id,
   invoiceNumber,
   invoiceDate,
   invoiceAmount,
   vendor,
   gstNumber,
   description
 }
]

- observations:
{
 causeOfAccident,
 natureOfLoss,
 garageNameAndAddress,
 inspectionDate,
 inspectionLocation,
 speedometerReading,
 tpDamageOrThirdPartyInjury,
 surveyorNotes,
 recommendations
}

- unmappedText:
[
 {
   id,
   originalText,
   possibleField,
   reason,
   suggestedMapping
 }
]
`;


          const response =
            await ai.models.generateContent({

              model:
                process.env.GEMINI_MODEL ||
                'gemini-3.8-flash',

              contents: prompt,

              config: {

                systemInstruction:
                  SURVEY_SYSTEM_INSTRUCTION,

                responseMimeType:
                  'application/json',

                temperature: 0.1,
              },
            });


          if (response.text) {

            const aiJson =
              JSON.parse(response.text);


            parsedData = {

              ...ruleResult,

              documentType:
                aiJson.documentType ||
                ruleResult.documentType,

              confidence:
                aiJson.confidence ||
                ruleResult.confidence,

              confidenceLevel:
                aiJson.confidenceLevel ||
                ruleResult.confidenceLevel,

              policy: {
                ...ruleResult.policy,
                ...(aiJson.policy || {}),
              },

              vehicle: {
                ...ruleResult.vehicle,
                ...(aiJson.vehicle || {}),
              },

              clientRequest: {
                ...ruleResult.clientRequest,
                ...(aiJson.clientRequest || {}),

                requestedDocuments:
                  aiJson.clientRequest
                    ?.requestedDocuments
                    ?.length > 0
                    ? aiJson.clientRequest.requestedDocuments
                    : ruleResult.clientRequest
                        .requestedDocuments,
              },

              companyRequest: {
                ...ruleResult.companyRequest,
                ...(aiJson.companyRequest || {}),

                requiredDocuments:
                  aiJson.companyRequest
                    ?.requiredDocuments
                    ?.length > 0
                    ? aiJson.companyRequest.requiredDocuments
                    : ruleResult.companyRequest
                        .requiredDocuments,
              },

              invoices:
                aiJson.invoices?.length > 0
                  ? aiJson.invoices
                  : ruleResult.invoices,

              initialEstimate: {

                parts:
                  aiJson.initialEstimate?.parts
                    ?.length > 0
                    ? aiJson.initialEstimate.parts
                    : ruleResult.initialEstimate.parts,

                labour:
                  aiJson.initialEstimate?.labour
                    ?.length > 0
                    ? aiJson.initialEstimate.labour
                    : ruleResult.initialEstimate.labour,
              },

              finalEstimate: {

                parts:
                  aiJson.finalEstimate?.parts
                    ?.length > 0
                    ? aiJson.finalEstimate.parts
                    : ruleResult.finalEstimate.parts,

                labour:
                  aiJson.finalEstimate?.labour
                    ?.length > 0
                    ? aiJson.finalEstimate.labour
                    : ruleResult.finalEstimate.labour,
              },

              observations: {
                ...ruleResult.observations,
                ...(aiJson.observations || {}),
              },

              unmappedText:
                aiJson.unmappedText?.length > 0
                  ? aiJson.unmappedText
                  : ruleResult.unmappedText,
            };
          }

        } catch (geminiError) {

          console.warn(
            'Gemini extraction failed. Falling back to deterministic parser:',
            geminiError
          );
        }
      }


      // ======================================================
      // OPENROUTER FALLBACK
      // ======================================================

      else if (openrouterKey) {

        try {

          const scanModel =
            process.env.SCAN_MODEL ||
            'google/gemini-2.0-flash-001';


          const orRes =
            await fetch(
              'https://openrouter.ai/api/v1/chat/completions',
              {
                method: 'POST',

                headers: {
                  Authorization:
                    `Bearer ${openrouterKey}`,

                  'Content-Type':
                    'application/json',
                },

                body: JSON.stringify({

                  model: scanModel,

                  messages: [

                    {
                      role: 'system',
                      content:
                        SURVEY_SYSTEM_INSTRUCTION,
                    },

                    {
                      role: 'user',
                      content:
                        `Parse this insurance document into structured JSON:\n\n${text}`,
                    },

                  ],

                  response_format: {
                    type: 'json_object',
                  },

                }),
              }
            );


          if (orRes.ok) {

            const orData =
              await orRes.json();

            const content =
              orData.choices?.[0]?.message?.content;


            if (content) {

              const aiJson =
                JSON.parse(content);


              parsedData = {

                ...ruleResult,

                ...aiJson,

                policy: {
                  ...ruleResult.policy,
                  ...(aiJson.policy || {}),
                },

                vehicle: {
                  ...ruleResult.vehicle,
                  ...(aiJson.vehicle || {}),
                },
              };
            }

          } else {

            const errorText =
              await orRes.text();

            console.warn(
              'OpenRouter HTTP error:',
              orRes.status,
              errorText
            );
          }

        } catch (orErr) {

          console.warn(
            'OpenRouter parsing failed:',
            orErr
          );
        }
      }


      // ======================================================
      // SANITIZE INITIAL PARTS
      // ======================================================

      const sanitizedInitialParts =
        (
          parsedData.initialEstimate?.parts ||
          []
        ).map(
          (p: any, idx: number) => ({

            ...p,

            id:
              p.id ||
              `init-part-${idx + 1}`,

            selectedForFinal:
              p.selectedForFinal !== false,

            gstRate:
              p.gstRate !== undefined &&
              p.gstRate !== null &&
              !isNaN(Number(p.gstRate))
                ? Number(p.gstRate)
                : 18,
          })
        );


      // ======================================================
      // SANITIZE INITIAL LABOUR
      // ======================================================

      const sanitizedInitialLabour =
        (
          parsedData.initialEstimate?.labour ||
          []
        ).map(
          (l: any, idx: number) => ({

            ...l,

            id:
              l.id ||
              `init-lab-${idx + 1}`,

            selectedForFinal:
              l.selectedForFinal !== false,

            gstRate:
              l.gstRate !== undefined &&
              l.gstRate !== null &&
              !isNaN(Number(l.gstRate))
                ? Number(l.gstRate)
                : 18,
          })
        );


      // ======================================================
      // SANITIZE FINAL PARTS
      // ======================================================

      const sanitizedFinalParts =
        (
          parsedData.finalEstimate?.parts ||
          []
        ).map(
          (p: any, idx: number) => ({

            ...p,

            id:
              p.id ||
              `final-part-${idx + 1}`,

            sourceInitialId:
              p.sourceInitialId ||
              p.id ||
              `init-part-${idx + 1}`,

            gstRate:
              p.gstRate !== undefined &&
              p.gstRate !== null &&
              !isNaN(Number(p.gstRate))
                ? Number(p.gstRate)
                : 18,
          })
        );


      // ======================================================
      // SANITIZE FINAL LABOUR
      // ======================================================

      const sanitizedFinalLabour =
        (
          parsedData.finalEstimate?.labour ||
          []
        ).map(
          (l: any, idx: number) => ({

            ...l,

            id:
              l.id ||
              `final-lab-${idx + 1}`,

            sourceInitialId:
              l.sourceInitialId ||
              l.id ||
              `init-lab-${idx + 1}`,

            gstRate:
              l.gstRate !== undefined &&
              l.gstRate !== null &&
              !isNaN(Number(l.gstRate))
                ? Number(l.gstRate)
                : 18,
          })
        );


      parsedData.initialEstimate.parts =
        sanitizedInitialParts;

      parsedData.initialEstimate.labour =
        sanitizedInitialLabour;

      parsedData.finalEstimate.parts =
        sanitizedFinalParts;

      parsedData.finalEstimate.labour =
        sanitizedFinalLabour;


      // ======================================================
      // REQUEST STATUS
      // ======================================================

      if (parsedData.clientRequest) {

        parsedData.clientRequest.requestStatus =
          parsedData.clientRequest.requestStatus ||
          'Initiated';

        parsedData.clientRequest.requestedDocuments =
          (
            parsedData.clientRequest
              .requestedDocuments ||
            []
          ).map(
            (d: any) => ({
              ...d,
              status:
                d.status ||
                'Pending',
            })
          );
      }


      if (parsedData.companyRequest) {

        parsedData.companyRequest.responseStatus =
          parsedData.companyRequest.responseStatus ||
          'Assigned';

        parsedData.companyRequest.requiredDocuments =
          (
            parsedData.companyRequest
              .requiredDocuments ||
            []
          ).map(
            (d: any) => ({
              ...d,
              status:
                d.status ||
                'Pending',
            })
          );
      }


      // ======================================================
      // CALCULATIONS
      // ======================================================

      const excessVal =
        Number(
          parsedData.policy?.policyExcess
        ) || 1000;


      const {
        summary,
        gstSummary,
      } =
        calculateSummary(

          parsedData.initialEstimate.parts,

          parsedData.initialEstimate.labour,

          parsedData.finalEstimate.parts,

          parsedData.finalEstimate.labour,

          excessVal,

          0
        );


      // ======================================================
      // VALIDATION
      // ======================================================

      const validationErrors =
        validateSurveyData({

          policy:
            parsedData.policy as any,

          vehicle:
            parsedData.vehicle as any,

          invoices:
            parsedData.invoices,

          initialEstimate:
            parsedData.initialEstimate,

          finalEstimate:
            parsedData.finalEstimate,

          fieldConfidences:
            parsedData.fieldConfidences,

          unmappedText:
            parsedData.unmappedText,

          documentType:
            parsedData.documentType,
        });


      // ======================================================
      // RESPONSE
      // ======================================================

      return res.json({

        success: true,

        documentType:
          parsedData.documentType,

        confidence:
          parsedData.confidence,

        confidenceLevel:
          parsedData.confidenceLevel,

        data: {

          policy:
            parsedData.policy,

          vehicle:
            parsedData.vehicle,

          clientRequest:
            parsedData.clientRequest,

          companyRequest:
            parsedData.companyRequest,

          invoices:
            parsedData.invoices,

          initialEstimate:
            parsedData.initialEstimate,

          finalEstimate:
            parsedData.finalEstimate,

          gstSummary,

          summary,

          observations:
            parsedData.observations,
        },

        fieldConfidences:
          parsedData.fieldConfidences,

        validationErrors,

        unmappedText:
          parsedData.unmappedText,
      });

    } catch (error: any) {

      console.error(
        'Server error in /api/parse-pasted-text:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Failed to process text: ' +
          (error?.message || 'Unknown error'),

        validationErrors: [

          {
            code: 'SF012',

            field: 'text',

            message:
              'Unable to parse provided text block completely.',

            severity: 'error',
          },

        ],

        unmappedText: [],
      });
    }
  }
);


// ============================================================
// GEMINI CLIENT
// ============================================================

function getGeminiClient():
  GoogleGenAI | null {

  const geminiKey =
    process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    return null;
  }

  return new GoogleGenAI({

    apiKey: geminiKey,

    httpOptions: {
      headers: {
        'User-Agent':
          'SurveyFlow-Netlify',
      },
    },
  });
}


// ============================================================
// AI ASSISTANT
// ============================================================

app.post(
  '/api/ai/assistant',
  async (req: Request, res: Response) => {

    try {

      const {
        prompt,
        surveyContext,
        conversationHistory,
      } = req.body;


      if (
        !prompt ||
        typeof prompt !== 'string'
      ) {

        return res.status(400).json({
          success: false,
          message: 'Prompt is required',
        });
      }


      const ai =
        getGeminiClient();


      const systemPrompt = `
You are SurveyFlow AI Copilot.

You assist licensed motor insurance surveyors with:

1. Technical claim assessment.
2. Damage corroboration.
3. Depreciation calculations.
4. GST calculations.
5. Salvage calculations.
6. Policy excess calculations.
7. Surveyor observations.
8. Documentation gaps.

Current Survey Record:

${JSON.stringify(
  surveyContext || {},
  null,
  2
)}

Provide concise professional guidance.
`;


      if (ai) {

        try {

          const response =
            await ai.models.generateContent({

              model:
                process.env.GEMINI_MODEL ||
                'gemini-3.8-flash',

              contents:
                prompt,

              config: {

                systemInstruction:
                  systemPrompt,

                temperature: 0.2,
              },
            });


          return res.json({

            success: true,

            provider:
              'Gemini 3.8 Flash',

            reply:
              response.text ||
              'No response generated by AI.',
          });

        } catch (geminiErr) {

          console.warn(
            'Gemini assistant failed:',
            geminiErr
          );
        }
      }


      // ======================================================
      // FALLBACK ASSISTANT
      // ======================================================

      const pLower =
        prompt.toLowerCase();

      let fallbackReply = '';


      if (
        pLower.includes('depreciation') ||
        pLower.includes('rate')
      ) {

        fallbackReply = `
**Motor Insurance Depreciation Reference**

Rubber / Nylon / Plastic / Tyres / Batteries: 50%

Fibre Glass Parts: 30%

Glass Parts: 0%

Metal Parts:
- Up to 6 months: 0%
- 6 months to 1 year: 5%
- 1 to 2 years: 10%
- 2 to 3 years: 15%
- 3 to 4 years: 25%
- 4 to 5 years: 35%
- 5 to 10 years: 40%
- Over 10 years: 50%
`;

      } else if (
        pLower.includes('gst') ||
        pLower.includes('tax')
      ) {

        fallbackReply = `
**Motor Claim GST Reference**

Automobile spare parts:
18% or 28% depending on applicable HSN.

Labour / repair services:
Generally 18% GST.

Final liability should be calculated according to the applicable policy,
assessment and admissibility rules.
`;

      } else if (
        pLower.includes('observation') ||
        pLower.includes('accident') ||
        pLower.includes('cause')
      ) {

        const reg =
          surveyContext?.vehicle
            ?.registrationNumber ||
          'the vehicle';

        const cause =
          surveyContext?.observations
            ?.causeOfAccident ||
          'an impact collision';


        fallbackReply = `
**Draft Technical Surveyor Observation**

On physical inspection of vehicle bearing
Registration No. ${reg}, damages were observed
primarily to the affected section of the vehicle.

The observed damages are consistent with
${cause}.

The assessment is recommended strictly based
on physical inspection, available documents,
policy terms and applicable assessment norms.
`;

      } else {

        const reg =
          surveyContext?.vehicle
            ?.registrationNumber ||
          'N/A';

        const policyNo =
          surveyContext?.policy
            ?.policyNumber ||
          'N/A';

        const grandTotal =
          surveyContext?.summary
            ?.grandTotal ||
          0;


        fallbackReply = `
**SurveyFlow Intelligence Summary**

Vehicle: ${reg}

Policy No: ${policyNo}

Assessed Amount:
₹${Number(
  grandTotal
).toLocaleString('en-IN')}

You can ask me to draft observations,
check calculations or prepare communication.
`;
      }


      return res.json({

        success: true,

        provider:
          'Deterministic Surveyor Intelligence Engine',

        reply:
          fallbackReply,
      });

    } catch (err: any) {

      console.error(
        'Error in /api/ai/assistant:',
        err
      );

      return res.status(500).json({

        success: false,

        message:
          err?.message ||
          'AI Assistant encountered an error.',
      });
    }
  }
);


// ============================================================
// DRAFT COMMUNICATION
// ============================================================

app.post(
  '/api/ai/draft-communication',
  async (req: Request, res: Response) => {

    try {

      const {
        templateType,
        language = 'en',
        clientRequest,
        policy,
        vehicle,
        summary,
        settings,
        customInstructions,
      } = req.body;


      const pendingDocs =
        (
          clientRequest?.requestedDocuments ||
          []
        )
          .filter(
            (d: any) =>
              d.status === 'Pending'
          )
          .map(
            (d: any) =>
              d.documentName
          );


      const clientName =
        clientRequest?.clientName ||
        policy?.insuredName ||
        'Valued Client';

      const regNo =
        vehicle?.registrationNumber ||
        clientRequest?.vehicleNumber ||
        'Vehicle';

      const claimNo =
        clientRequest?.claimNumber ||
        policy?.claimNumber ||
        'N/A';

      const policyNo =
        clientRequest?.policyNumber ||
        policy?.policyNumber ||
        'N/A';

      const surveyorName =
        settings?.surveyorName ||
        'Insurance Surveyor & Loss Assessor';

      const surveyorPhone =
        settings?.surveyorPhone ||
        '';


      const ai =
        getGeminiClient();


      const systemPrompt = `
You are an expert communication drafter
for Indian Motor Insurance Surveyors.

Generate:

1. whatsappMessage
2. emailSubject
3. emailBody

Language:
${
  language === 'hi'
    ? 'Hindi'
    : language === 'hinglish'
      ? 'Hinglish'
      : 'Professional English'
}

Template Type:
${templateType}

Client:
${clientName}

Vehicle:
${regNo}

Claim:
${claimNo}

Policy:
${policyNo}

Pending Documents:
${pendingDocs.join(', ') || 'None'}

Net Assessed Amount:
₹${summary?.grandTotal || 0}

Surveyor:
${surveyorName}

Phone:
${surveyorPhone}

Custom Instructions:
${customInstructions || 'None'}

Return STRICT JSON.
`;


      if (ai) {

        try {

          const response =
            await ai.models.generateContent({

              model:
                process.env.GEMINI_MODEL ||
                'gemini-3.8-flash',

              contents:
                'Draft the communication now.',

              config: {

                systemInstruction:
                  systemPrompt,

                responseMimeType:
                  'application/json',

                temperature: 0.2,
              },
            });


          if (response.text) {

            const parsed =
              JSON.parse(
                response.text
              );

            return res.json({

              success: true,

              provider:
                'Gemini 3.8 Flash',

              data:
                parsed,
            });
          }

        } catch (aiErr) {

          console.warn(
            'Gemini communication failed:',
            aiErr
          );
        }
      }


      // ======================================================
      // DETERMINISTIC TEMPLATE
      // ======================================================

      const docBullets =
        pendingDocs.length > 0

          ? pendingDocs
              .map(
                (d: string) =>
                  `• ${d}`
              )
              .join('\n')

          : `• Original RC Book
• Driving License
• Duly Signed Claim Form`;


      let whatsappMessage = '';
      let emailSubject = '';
      let emailBody = '';


      if (
        templateType ===
        'pending_docs'
      ) {

        emailSubject =
          `Required Claim Documents - Vehicle ${regNo} (Claim: ${claimNo})`;


        emailBody = `
Dear ${clientName},

Greetings from the Office of Insurance Surveyor & Loss Assessor.

With reference to your motor insurance claim for vehicle ${regNo}, Policy No. ${policyNo}, Claim No. ${claimNo}, kindly submit the following documents:

${docBullets}

You may send clear scanned copies or photographs.

Thank you.

Regards,
${surveyorName}
Insurance Surveyor & Loss Assessor
${surveyorPhone}
`;


        whatsappMessage = `
*Insurance Survey Claim Notice*

Dear *${clientName}*,

Regarding vehicle *${regNo}* and Claim No. *${claimNo}*, please share:

${docBullets}

Kindly send clear photos or PDF copies.

Regards,
*${surveyorName}*
${surveyorPhone}
`;

      } else if (
        templateType ===
        'survey_scheduled'
      ) {

        emailSubject =
          `Survey Inspection Schedule - Vehicle ${regNo}`;


        emailBody = `
Dear ${clientName},

The physical survey inspection for vehicle ${regNo} has been scheduled.

Please ensure the vehicle and original RC/DL are available.

Regards,
${surveyorName}
${surveyorPhone}
`;


        whatsappMessage = `
*Survey Inspection Update*

Dear *${clientName}*,

Physical survey inspection for vehicle *${regNo}* has been scheduled.

Please keep original RC & DL available.

Regards,
*${surveyorName}*
${surveyorPhone}
`;

      } else if (
        templateType ===
        'final_report'
      ) {

        emailSubject =
          `Final Survey Assessment Completed - Vehicle ${regNo}`;


        emailBody = `
Dear ${clientName},

The final survey assessment for vehicle ${regNo}, Claim No. ${claimNo}, has been completed.

Net Assessed Amount:
₹${Number(
  summary?.grandTotal || 0
).toLocaleString('en-IN')}

Regards,
${surveyorName}
`;


        whatsappMessage = `
*Survey Assessment Completed* ✅

Dear *${clientName}*,

The final survey assessment for vehicle *${regNo}* has been completed.

*Net Assessed Amount:*
₹${Number(
  summary?.grandTotal || 0
).toLocaleString('en-IN')}

Regards,
*${surveyorName}*
`;

      } else {

        emailSubject =
          `Claim Status Update - Vehicle ${regNo}`;


        emailBody = `
Dear ${clientName},

This is an update regarding your motor claim.

Vehicle:
${regNo}

Claim:
${claimNo}

Status:
${clientRequest?.requestStatus || 'In Progress'}

Regards,
${surveyorName}
${surveyorPhone}
`;


        whatsappMessage = `
*Insurance Claim Update*

Dear *${clientName}*,

Vehicle: *${regNo}*

Claim: *${claimNo}*

Status:
*${clientRequest?.requestStatus || 'In Progress'}*

Regards,
*${surveyorName}*
`;
      }


      return res.json({

        success: true,

        provider:
          'Deterministic Template Engine',

        data: {

          whatsappMessage,

          emailSubject,

          emailBody,
        },
      });

    } catch (err: any) {

      console.error(
        'Error in /api/ai/draft-communication:',
        err
      );

      return res.status(500).json({

        success: false,

        message:
          err?.message ||
          'Error drafting communication',
      });
    }
  }
);


// ============================================================
// AUDIT SURVEY
// ============================================================

app.post(
  '/api/ai/audit-survey',
  async (req: Request, res: Response) => {

    try {

      const {
        surveyRecord,
      } = req.body;


      if (!surveyRecord) {

        return res.status(400).json({

          success: false,

          message:
            'Survey record is required',
        });
      }


      const ai =
        getGeminiClient();


      const systemPrompt = `
You are a Motor Insurance Survey Auditor.

Audit the survey record for:

- Policy data
- Vehicle data
- Depreciation
- GST
- Calculations
- Accident observations
- Documentation

Return JSON:
{
  "score": number,
  "verdict": string,
  "summary": string,
  "checklist": [],
  "recommendations": []
}
`;


      if (ai) {

        try {

          const response =
            await ai.models.generateContent({

              model:
                process.env.GEMINI_MODEL ||
                'gemini-3.8-flash',

              contents:
                `Audit this survey record:\n${JSON.stringify(
                  surveyRecord,
                  null,
                  2
                )}`,

              config: {

                systemInstruction:
                  systemPrompt,

                responseMimeType:
                  'application/json',

                temperature: 0.1,
              },
            });


          if (response.text) {

            const parsed =
              JSON.parse(
                response.text
              );


            return res.json({

              success: true,

              provider:
                'Gemini 3.8 Flash Deep Audit',

              data:
                parsed,
            });
          }

        } catch (err) {

          console.warn(
            'Gemini audit failed:',
            err
          );
        }
      }


      // ======================================================
      // DETERMINISTIC AUDIT
      // ======================================================

      const checklist: any[] = [];

      let score = 100;


      // Policy
      if (
        surveyRecord.policy?.policyNumber &&
        surveyRecord.policy?.insuredName
      ) {

        checklist.push({

          category:
            'Policy & Validity',

          item:
            'Policy Number & Insured Particulars',

          status:
            'PASS',

          detail:
            `Policy ${surveyRecord.policy.policyNumber} issued to ${surveyRecord.policy.insuredName}.`,
        });

      } else {

        score -= 20;

        checklist.push({

          category:
            'Policy & Validity',

          item:
            'Policy Number or Insured Missing',

          status:
            'FAIL',

          detail:
            'Policy number or insured name is missing.',
        });
      }


      // Vehicle
      const hasReg =
        Boolean(
          surveyRecord.vehicle?.registrationNumber ||
          surveyRecord.vehicle?.rcNumber
        );

      const hasChassis =
        Boolean(
          surveyRecord.vehicle?.chassisNumber
        );


      if (
        hasReg &&
        hasChassis
      ) {

        checklist.push({

          category:
            'Vehicle & Identification',

          item:
            'Registration & Chassis Verification',

          status:
            'PASS',

          detail:
            `Registration ${surveyRecord.vehicle.registrationNumber} and chassis verified.`,
        });

      } else {

        score -= 15;

        checklist.push({

          category:
            'Vehicle & Identification',

          item:
            'Vehicle Identification Incomplete',

          status:
            'WARN',

          detail:
            'Registration/chassis information requires verification.',
        });
      }


      // Estimates
      const initialCount =
        surveyRecord.initialEstimate
          ?.parts?.length || 0;

      const finalCount =
        surveyRecord.finalEstimate
          ?.parts?.length || 0;


      if (finalCount > 0) {

        checklist.push({

          category:
            'Depreciation Compliance',

          item:
            'Final Estimate Itemization',

          status:
            'PASS',

          detail:
            `${finalCount} final estimate parts recorded.`,
        });

      } else if (
        initialCount > 0
      ) {

        score -= 10;

        checklist.push({

          category:
            'Depreciation Compliance',

          item:
            'Final Assessment Pending',

          status:
            'WARN',

          detail:
            'Initial estimate exists but final assessment is incomplete.',
        });

      } else {

        score -= 25;

        checklist.push({

          category:
            'Depreciation Compliance',

          item:
            'No Parts Recorded',

          status:
            'FAIL',

          detail:
            'No estimate parts found.',
        });
      }


      // Excess
      const excess =
        Number(
          surveyRecord.policy?.policyExcess ||
          surveyRecord.summary?.excess ||
          0
        );


      if (excess > 0) {

        checklist.push({

          category:
            'GST & Calculations',

          item:
            'Policy Excess Deduction',

          status:
            'PASS',

          detail:
            `Policy excess ₹${excess} recorded.`,
        });

      } else {

        checklist.push({

          category:
            'GST & Calculations',

          item:
            'Compulsory Excess Check',

          status:
            'WARN',

          detail:
            'Policy excess is zero. Verify policy terms.',
        });
      }


      // Observation
      if (
        surveyRecord.observations
          ?.causeOfAccident &&
        surveyRecord.observations
          .causeOfAccident
          .trim()
          .length > 10
      ) {

        checklist.push({

          category:
            'Observations & Cause',

          item:
            'Accident Cause & Corroboration',

          status:
            'PASS',

          detail:
            'Accident cause has been recorded.',
        });

      } else {

        score -= 15;

        checklist.push({

          category:
            'Observations & Cause',

          item:
            'Accident Cause Description Incomplete',

          status:
            'WARN',

          detail:
            'Accident cause requires documentation.',
        });
      }


      const finalScore =
        Math.max(
          20,
          Math.min(
            100,
            score
          )
        );


      const verdict =
        finalScore >= 90
          ? 'Excellent'
          : finalScore >= 75
            ? 'Good'
            : finalScore >= 50
              ? 'Needs Review'
              : 'Critical Compliance Gaps';


      return res.json({

        success: true,

        provider:
          'Deterministic IRDAI Rules Engine',

        data: {

          score:
            finalScore,

          verdict,

          summary:
            `Survey audit complete: ${finalScore}/100 score. ${verdict}.`,

          checklist,

          recommendations: [

            'Verify pending client documents.',

            'Cross-check applicable GST rates.',

            'Ensure accident observations are complete.',
          ],
        },
      });

    } catch (err: any) {

      console.error(
        'Error in /api/ai/audit-survey:',
        err
      );

      return res.status(500).json({

        success: false,

        message:
          err?.message ||
          'Error auditing survey',
      });
    }
  }
);


// ============================================================
// IMPORTANT NETLIFY CONFIGURATION
// ============================================================
//
// DO NOT PUT VITE IMPORTS HERE.
//
// Netlify imports:
//     netlify/functions/api.ts
//
// which imports:
//     app
//
// from this file.
//
// Therefore this file must only contain the Express API.
//
// Local development should run the frontend using:
//     npm run dev
//
// Netlify production serves React from /dist
// and Express API through Netlify Functions.
//
// ============================================================


// Export app only.
// NO app.listen()
// NO Vite middleware
// NO createServer('vite')
//
// This prevents Netlify Function bundling from trying to
// package Vite and @vitejs/devtools.

export default app;
import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TextEntryView } from './components/TextEntryView';
import { PolicyView } from './components/PolicyView';
import { ClientRequestView } from './components/ClientRequestView';
import { CompanyRequestView } from './components/CompanyRequestView';
import { InitialEstimateView } from './components/InitialEstimateView';
import { FinalEstimateView } from './components/FinalEstimateView';
import { ValidationView } from './components/ValidationView';
import { FinalReportView } from './components/FinalReportView';
import { RecordsHistoryView } from './components/RecordsHistoryView';
import { SettingsView } from './components/SettingsView';
import { ChangeHistoryDrawer } from './components/ChangeHistoryDrawer';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { VehiclePhotosView } from './components/VehiclePhotosView';
import { CombinedSurveyDataView } from './components/CombinedSurveyDataView';
import { Sparkles } from 'lucide-react';
import {
  SurveyRecord,
  SurveyorSettings,
  PolicyData,
  VehicleData,
  VehiclePhoto,
  ClientRequestData,
  CompanyRequestData,
  InitialPartRow,
  InitialLabourRow,
  FinalPartRow,
  FinalLabourRow,
  InvoiceRow,
  ChangeLogEntry
} from './types/survey';
import { StorageService } from './utils/storage';
import { calculateSummary } from './utils/calculations';
import { validateSurveyData } from './utils/validation';
import { DEFAULT_SURVEYOR_SETTINGS } from './utils/sampleData';
import { JsonImportStats } from './utils/jsonImporter';
import { SupabaseService, isSupabaseConfigured } from './utils/supabase';

export default function App() {
  // Master State
  const [allRecords, setAllRecords] = useState<SurveyRecord[]>([]);
  const [currentRecord, setCurrentRecord] = useState<SurveyRecord | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [settings, setSettings] = useState<SurveyorSettings>(DEFAULT_SURVEYOR_SETTINGS);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);


  // Initialize from Supabase first (when configured), with localStorage as an offline cache/fallback.
  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      const savedSettings = StorageService.getSettings();
      setSettings(savedSettings);

      let savedRecords = StorageService.getAllRecords();
      if (isSupabaseConfigured) {
        try {
          const remoteRecords = await SupabaseService.loadAllRecords();
          if (remoteRecords.length) {
            savedRecords = remoteRecords;
            StorageService.replaceLocalRecords(remoteRecords);
          }
        } catch (error) {
          console.warn('[Supabase] Remote load failed; using local cache:', error);
        }
      }

      if (cancelled) return;
      if (savedRecords.length > 0) {
        setAllRecords(savedRecords);
        const activeId = StorageService.getActiveRecordId();
        const active = savedRecords.find((r) => r.id === activeId) || savedRecords[0];
        setCurrentRecord(active);
      } else {
        const initial = StorageService.createNewRecord();
        setAllRecords([initial]);
        setCurrentRecord(initial);
      }
    };
    void initialize();
    return () => { cancelled = true; };
  }, []);

  // Sync Dark Mode class with <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Persistent Auto-Save
  // Save immediately instead of waiting for a debounce timer. This prevents a
  // reload/navigation from losing the latest JSON import or manual field edit.
  const triggerAutoSave = (record: SurveyRecord) => {
    setSaveStatus('saving');
    try {
      StorageService.saveRecord(record);
      setAllRecords(StorageService.getAllRecords());
      setSaveStatus('saved');
    } catch (error) {
      console.error('SurveyFlow auto-save failed:', error);
      setSaveStatus('unsaved');
    }
  };

  // Change Log Helper
  const logChange = (field: string, oldValue: any, newValue: any, description: string) => {
    if (!currentRecord) return;
    const newEntry: ChangeLogEntry = {
      id: `chg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      field,
      oldValue,
      newValue,
      description,
    };
    const updatedHistory = [newEntry, ...(currentRecord.changeHistory || [])].slice(0, 50);
    return updatedHistory;
  };

  // Updaters for Sub-sections
  const handleUpdatePolicy = (
    updatedFields: Partial<PolicyData>,
    fieldKey: string,
    oldVal: any,
    newVal: any
  ) => {
    if (!currentRecord) return;
    const newPolicy = { ...currentRecord.policy, ...updatedFields };
    const history = logChange(fieldKey, oldVal, newVal, `Edited ${fieldKey}`) || currentRecord.changeHistory;
    const validationErrors = validateSurveyData({
      ...currentRecord,
      policy: newPolicy,
    });
    const updated = {
      ...currentRecord,
      policy: newPolicy,
      changeHistory: history,
      validationErrors,
    };
    setCurrentRecord(updated);
    triggerAutoSave(updated);
  };

  const handleUpdateVehicle = (
    updatedFields: Partial<VehicleData>,
    fieldKey: string,
    oldVal: any,
    newVal: any
  ) => {
    if (!currentRecord) return;
    const newVehicle = { ...currentRecord.vehicle, ...updatedFields };
    const history = logChange(fieldKey, oldVal, newVal, `Edited ${fieldKey}`) || currentRecord.changeHistory;
    const validationErrors = validateSurveyData({
      ...currentRecord,
      vehicle: newVehicle,
    });
    const updated = {
      ...currentRecord,
      vehicle: newVehicle,
      changeHistory: history,
      validationErrors,
    };
    setCurrentRecord(updated);
    triggerAutoSave(updated);
  };

  const handleUpdateClientRequest = (
    updatedFields: Partial<ClientRequestData>,
    fieldKey: string,
    oldVal: any,
    newVal: any
  ) => {
    if (!currentRecord) return;
    const newCR = { ...currentRecord.clientRequest, ...updatedFields };
    const history = logChange(fieldKey, oldVal, newVal, `Edited Client Request`) || currentRecord.changeHistory;
    const updated = {
      ...currentRecord,
      clientRequest: newCR,
      changeHistory: history,
    };
    setCurrentRecord(updated);
    triggerAutoSave(updated);
  };

  const handleUpdateCompanyRequest = (
    updatedFields: Partial<CompanyRequestData>,
    fieldKey: string,
    oldVal: any,
    newVal: any
  ) => {
    if (!currentRecord) return;
    const newCR = { ...currentRecord.companyRequest, ...updatedFields };
    const history = logChange(fieldKey, oldVal, newVal, `Edited Company Request`) || currentRecord.changeHistory;
    const updated = {
      ...currentRecord,
      companyRequest: newCR,
      changeHistory: history,
    };
    setCurrentRecord(updated);
    triggerAutoSave(updated);
  };

  const handleUpdateInitialParts = (parts: InitialPartRow[], changeDesc: string) => {
    if (!currentRecord) return;
    const history = logChange('initialEstimate.parts', null, null, changeDesc) || currentRecord.changeHistory;
    const excess = Number(currentRecord.policy.policyExcess) || 1000;

    // Sync finalEstimate.parts based on initial selection
    const currentFinalParts = currentRecord.finalEstimate?.parts || [];
    const newFinalParts: FinalPartRow[] = [];

    // Keep / populate only selected initial parts
    parts.forEach((ip) => {
      if (ip.selectedForFinal !== false) {
        const existing = currentFinalParts.find(
          (fp) => fp.id === ip.id || fp.sourceInitialId === ip.id || (fp.eNo === ip.eNo && fp.partsDescription === ip.partsDescription)
        );
        if (existing) {
          newFinalParts.push({
            ...existing,
            sourceInitialId: ip.id,
            eNo: ip.eNo,
            partsDescription: ip.partsDescription,
            hsnCode: ip.hsnCode,
            billSNo: ip.billSNo,
            remark: ip.remark,
            estimated: ip.estimated,
            glassSecondHandRepair: ip.glassSecondHandRepair,
            metal35: ip.metal35,
            nonMetal: ip.nonMetal,
            gstRate: ip.gstRate ?? existing.gstRate ?? 18,
          });
        } else {
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
      }
    });

    // Also retain any independent custom final parts that don't match any initial parts
    currentFinalParts.forEach((fp) => {
      const isFromInitial = parts.some(
        (ip) => ip.id === fp.sourceInitialId || ip.id === fp.id || (ip.eNo === fp.eNo && ip.partsDescription === fp.partsDescription)
      );
      if (!isFromInitial && !newFinalParts.some((p) => p.id === fp.id)) {
        newFinalParts.push(fp);
      }
    });

    const { summary, gstSummary } = calculateSummary(
      parts,
      currentRecord.initialEstimate.labour,
      newFinalParts,
      currentRecord.finalEstimate.labour,
      excess,
      currentRecord.summary.salvage || 0
    );
    const updated: SurveyRecord = {
      ...currentRecord,
      initialEstimate: {
        ...currentRecord.initialEstimate,
        parts,
      },
      finalEstimate: {
        ...currentRecord.finalEstimate,
        parts: newFinalParts,
      },
      summary,
      gstSummary,
      changeHistory: history,
    };
    updated.validationErrors = validateSurveyData(updated);
    setCurrentRecord(updated);
    triggerAutoSave(updated);
  };

  const handleUpdateInitialLabour = (labour: InitialLabourRow[], changeDesc: string) => {
    if (!currentRecord) return;
    const history = logChange('initialEstimate.labour', null, null, changeDesc) || currentRecord.changeHistory;
    const excess = Number(currentRecord.policy.policyExcess) || 1000;

    // Sync finalEstimate.labour based on initial selection
    const currentFinalLabour = currentRecord.finalEstimate?.labour || [];
    const newFinalLabour: FinalLabourRow[] = [];

    // Keep / populate only selected initial labour
    labour.forEach((il) => {
      if (il.selectedForFinal !== false) {
        const existing = currentFinalLabour.find(
          (fl) => fl.id === il.id || fl.sourceInitialId === il.id || (fl.sNo === il.sNo && fl.labourDescription === il.labourDescription)
        );
        if (existing) {
          newFinalLabour.push({
            ...existing,
            sourceInitialId: il.id,
            sNo: il.sNo,
            sac: il.sac,
            billSNo: il.billSNo,
            labourDescription: il.labourDescription,
            estimated: il.estimated,
            gstRate: il.gstRate ?? existing.gstRate ?? 18,
          });
        } else {
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
      }
    });

    // Also retain any independent custom final labour
    currentFinalLabour.forEach((fl) => {
      const isFromInitial = labour.some(
        (il) => il.id === fl.sourceInitialId || il.id === fl.id || (il.sNo === fl.sNo && il.labourDescription === fl.labourDescription)
      );
      if (!isFromInitial && !newFinalLabour.some((l) => l.id === fl.id)) {
        newFinalLabour.push(fl);
      }
    });

    const { summary, gstSummary } = calculateSummary(
      currentRecord.initialEstimate.parts,
      labour,
      currentRecord.finalEstimate.parts,
      newFinalLabour,
      excess,
      currentRecord.summary.salvage || 0
    );
    const updated: SurveyRecord = {
      ...currentRecord,
      initialEstimate: {
        ...currentRecord.initialEstimate,
        labour,
      },
      finalEstimate: {
        ...currentRecord.finalEstimate,
        labour: newFinalLabour,
      },
      summary,
      gstSummary,
      changeHistory: history,
    };
    updated.validationErrors = validateSurveyData(updated);
    setCurrentRecord(updated);
    triggerAutoSave(updated);
  };

  const handleUpdateFinalParts = (parts: FinalPartRow[], changeDesc: string) => {
    if (!currentRecord) return;
    const history = logChange('finalEstimate.parts', null, null, changeDesc) || currentRecord.changeHistory;
    const excess = Number(currentRecord.policy.policyExcess) || 1000;
    const { summary, gstSummary } = calculateSummary(
      currentRecord.initialEstimate.parts,
      currentRecord.initialEstimate.labour,
      parts,
      currentRecord.finalEstimate.labour,
      excess,
      currentRecord.summary.salvage || 0
    );
    const updated: SurveyRecord = {
      ...currentRecord,
      finalEstimate: {
        ...currentRecord.finalEstimate,
        parts,
      },
      summary,
      gstSummary,
      changeHistory: history,
    };
    updated.validationErrors = validateSurveyData(updated);
    setCurrentRecord(updated);
    triggerAutoSave(updated);
  };

  const handleUpdateFinalLabour = (labour: FinalLabourRow[], changeDesc: string) => {
    if (!currentRecord) return;
    const history = logChange('finalEstimate.labour', null, null, changeDesc) || currentRecord.changeHistory;
    const excess = Number(currentRecord.policy.policyExcess) || 1000;
    const { summary, gstSummary } = calculateSummary(
      currentRecord.initialEstimate.parts,
      currentRecord.initialEstimate.labour,
      currentRecord.finalEstimate.parts,
      labour,
      excess,
      currentRecord.summary.salvage || 0
    );
    const updated: SurveyRecord = {
      ...currentRecord,
      finalEstimate: {
        ...currentRecord.finalEstimate,
        labour,
      },
      summary,
      gstSummary,
      changeHistory: history,
    };
    updated.validationErrors = validateSurveyData(updated);
    setCurrentRecord(updated);
    triggerAutoSave(updated);
  };

  const handleUpdateInvoices = (invoices: InvoiceRow[], changeDesc: string) => {
    if (!currentRecord) return;
    const history = logChange('invoices', null, null, changeDesc) || currentRecord.changeHistory;
    const updated: SurveyRecord = {
      ...currentRecord,
      invoices,
      changeHistory: history,
    };
    updated.validationErrors = validateSurveyData(updated);
    setCurrentRecord(updated);
    triggerAutoSave(updated);
  };

  const handleUpdateExcessAndSalvage = (excess: number, salvage: number) => {
    if (!currentRecord) return;
    const { summary, gstSummary } = calculateSummary(
      currentRecord.initialEstimate.parts,
      currentRecord.initialEstimate.labour,
      currentRecord.finalEstimate.parts,
      currentRecord.finalEstimate.labour,
      excess,
      salvage
    );
    const updated: SurveyRecord = {
      ...currentRecord,
      policy: {
        ...currentRecord.policy,
        policyExcess: excess,
      },
      summary: {
        ...summary,
        excess,
        salvage,
      },
      gstSummary,
    };
    setCurrentRecord(updated);
    triggerAutoSave(updated);
  };

  const handleUpdatePhotos = (photos: VehiclePhoto[]) => {
    if (!currentRecord) return;
    const updated: SurveyRecord = {
      ...currentRecord,
      photos,
      updatedAt: new Date().toISOString(),
    };
    setCurrentRecord(updated);
    triggerAutoSave(updated);
  };

  // AI Text Processing Handler
  const handleProcessText = async (text: string, title?: string, mode: 'replace' | 'merge' = 'replace') => {
    if (!currentRecord) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/parse-pasted-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, title }),
      });

      if (!res.ok) {
        throw new Error(`AI service responded with status ${res.status}`);
      }

      const resData = await res.json();
      if (!resData.success) {
        throw new Error(resData.message || 'Failed to parse pasted text.');
      }

      const extracted = resData.data;

      let updatedRecord: SurveyRecord;

      if (mode === 'replace') {
        const excess = Number(extracted.policy?.policyExcess) || 1000;
        const { summary, gstSummary } = calculateSummary(
          extracted.initialEstimate?.parts || [],
          extracted.initialEstimate?.labour || [],
          extracted.finalEstimate?.parts || [],
          extracted.finalEstimate?.labour || [],
          excess,
          0
        );

        updatedRecord = {
          ...currentRecord,
          documentType: resData.documentType || currentRecord.documentType,
          confidence: resData.confidence || currentRecord.confidence,
          confidenceLevel: resData.confidenceLevel || currentRecord.confidenceLevel,
          rawPastedText: text,
          policy: {
            ...currentRecord.policy,
            ...(extracted.policy || {}),
            surveyNumber: extracted.policy?.surveyNumber || currentRecord.surveyNumber,
          },
          vehicle: {
            ...currentRecord.vehicle,
            ...(extracted.vehicle || {}),
          },
          clientRequest: {
            ...currentRecord.clientRequest,
            ...(extracted.clientRequest || {}),
          },
          companyRequest: {
            ...currentRecord.companyRequest,
            ...(extracted.companyRequest || {}),
          },
          initialEstimate: extracted.initialEstimate || { parts: [], labour: [] },
          finalEstimate: extracted.finalEstimate || { parts: [], labour: [] },
          invoices: extracted.invoices || [],
          gstSummary,
          summary,
          observations: {
            ...currentRecord.observations,
            ...(extracted.observations || {}),
          },
          fieldConfidences: resData.fieldConfidences || {},
          validationErrors: resData.validationErrors || [],
          unmappedText: resData.unmappedText || [],
          status: 'Validated',
        };
      } else {
        // Merge mode: keep existing parts/labour and append/update
        const mergedInitialParts = [
          ...currentRecord.initialEstimate.parts,
          ...(extracted.initialEstimate?.parts || []),
        ];
        const mergedFinalParts = [
          ...currentRecord.finalEstimate.parts,
          ...(extracted.finalEstimate?.parts || []),
        ];
        const mergedInitialLabour = [
          ...currentRecord.initialEstimate.labour,
          ...(extracted.initialEstimate?.labour || []),
        ];
        const mergedFinalLabour = [
          ...currentRecord.finalEstimate.labour,
          ...(extracted.finalEstimate?.labour || []),
        ];
        const mergedInvoices = [...currentRecord.invoices, ...(extracted.invoices || [])];

        const excess = Number(extracted.policy?.policyExcess || currentRecord.policy.policyExcess) || 1000;
        const { summary, gstSummary } = calculateSummary(
          mergedInitialParts,
          mergedInitialLabour,
          mergedFinalParts,
          mergedFinalLabour,
          excess,
          currentRecord.summary.salvage || 0
        );

        updatedRecord = {
          ...currentRecord,
          rawPastedText: currentRecord.rawPastedText + '\n\n' + text,
          policy: { ...currentRecord.policy, ...(extracted.policy || {}) },
          vehicle: { ...currentRecord.vehicle, ...(extracted.vehicle || {}) },
          clientRequest: { ...currentRecord.clientRequest, ...(extracted.clientRequest || {}) },
          companyRequest: { ...currentRecord.companyRequest, ...(extracted.companyRequest || {}) },
          initialEstimate: { parts: mergedInitialParts, labour: mergedInitialLabour },
          finalEstimate: { parts: mergedFinalParts, labour: mergedFinalLabour },
          invoices: mergedInvoices,
          gstSummary,
          summary,
          fieldConfidences: { ...(currentRecord.fieldConfidences || {}), ...(resData.fieldConfidences || {}) },
          unmappedText: [...(currentRecord.unmappedText || []), ...(resData.unmappedText || [])],
        };
        updatedRecord.validationErrors = validateSurveyData(updatedRecord);
      }

      setCurrentRecord(updatedRecord);
      triggerAutoSave(updatedRecord);

      // Auto route to final estimate if parts were extracted, else policy
      if (
        updatedRecord.finalEstimate?.parts?.length > 0 ||
        updatedRecord.initialEstimate?.parts?.length > 0
      ) {
        setCurrentTab('final-estimate');
      } else {
        setCurrentTab('policy');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Unmapped Text Triage
  const handleAssignUnmappedText = (unmappedId: string, targetField: string) => {
    if (!currentRecord) return;
    const item = currentRecord.unmappedText.find((u) => u.id === unmappedId);
    if (!item) return;

    const remainingUnmapped = currentRecord.unmappedText.filter((u) => u.id !== unmappedId);
    let updatedRecord = { ...currentRecord, unmappedText: remainingUnmapped };

    // Apply value to the target field path
    if (targetField.startsWith('observations.')) {
      const obsKey = targetField.replace('observations.', '') as keyof typeof currentRecord.observations;
      const prev = currentRecord.observations[obsKey] || '';
      updatedRecord.observations = {
        ...updatedRecord.observations,
        [obsKey]: prev ? `${prev}\n${item.originalText}` : item.originalText,
      };
    } else if (targetField.startsWith('policy.')) {
      const polKey = targetField.replace('policy.', '') as keyof typeof currentRecord.policy;
      updatedRecord.policy = {
        ...updatedRecord.policy,
        [polKey]: item.originalText,
      };
    } else if (targetField.startsWith('clientRequest.')) {
      const crKey = targetField.replace('clientRequest.', '') as keyof typeof currentRecord.clientRequest;
      updatedRecord.clientRequest = {
        ...updatedRecord.clientRequest,
        [crKey]: item.originalText,
      };
    }

    updatedRecord.validationErrors = validateSurveyData(updatedRecord);
    setCurrentRecord(updatedRecord);
    triggerAutoSave(updatedRecord);
  };

  const handleRemoveUnmappedItem = (unmappedId: string) => {
    if (!currentRecord) return;
    const remaining = currentRecord.unmappedText.filter((u) => u.id !== unmappedId);
    const updated = { ...currentRecord, unmappedText: remaining };
    updated.validationErrors = validateSurveyData(updated);
    setCurrentRecord(updated);
    triggerAutoSave(updated);
  };

  // Undo Log Entry
  const handleUndo = (entry: ChangeLogEntry) => {
    if (!currentRecord) return;
    alert(`Reverting "${entry.field}" back to "${entry.oldValue}"`);
    // Remove entry from log
    const updatedHistory = currentRecord.changeHistory.filter((h) => h.id !== entry.id);
    const updated = { ...currentRecord, changeHistory: updatedHistory };
    setCurrentRecord(updated);
    triggerAutoSave(updated);
  };

  const handleUploadSourceFile = async (file: File) => {
    if (!currentRecord) return null;
    const uploaded = await SupabaseService.uploadSourceFile(currentRecord.id, file);
    const updated = { ...currentRecord, sourceFiles: [...(currentRecord.sourceFiles || []), uploaded] };
    setCurrentRecord(updated);
    triggerAutoSave(updated);
    return uploaded;
  };

  const handleRemoveSourceFile = async (id: string) => {
    if (!currentRecord) return;
    const file = (currentRecord.sourceFiles || []).find((f) => f.id === id);
    try {
      await SupabaseService.deleteSourceFile(id, file?.storagePath);
    } catch (error) {
      console.warn('[Supabase] Source file metadata delete failed:', error);
    }
    const updated = { ...currentRecord, sourceFiles: (currentRecord.sourceFiles || []).filter((f) => f.id !== id) };
    setCurrentRecord(updated);
    triggerAutoSave(updated);
  };

  // Direct JSON Ingestion Handler
  const handleApplyJsonRecord = async (newRecord: SurveyRecord, _stats: JsonImportStats) => {
    const oldPolicyNo = String(currentRecord?.policy?.policyNumber || '').trim();
    const newPolicyNo = String(newRecord.policy?.policyNumber || '').trim();
    const isNewPolicy = Boolean(newPolicyNo) && newPolicyNo !== oldPolicyNo;

    if (isNewPolicy) {
      try {
        const remoteRef = await SupabaseService.generateNextSurveyNumber();
        newRecord.surveyNumber = remoteRef || StorageService.generateNextSurveyNumber();
      } catch {
        newRecord.surveyNumber = StorageService.generateNextSurveyNumber();
      }
      newRecord.policy = { ...newRecord.policy, surveyNumber: newRecord.surveyNumber };
    } else if (!newRecord.surveyNumber) {
      const refNo = currentRecord?.surveyNumber || StorageService.generateNextSurveyNumber();
      newRecord.surveyNumber = refNo;
      newRecord.policy = { ...newRecord.policy, surveyNumber: refNo };
    }

    StorageService.saveRecord(newRecord);
    StorageService.setActiveRecordId(newRecord.id);
    const persisted = StorageService.getRecordById(newRecord.id) || newRecord;
    setCurrentRecord(persisted);
    setAllRecords(StorageService.getAllRecords());
    setSaveStatus('saved');
  };

  // Toggle Initial Part Selection from Final Estimate
  const handleToggleInitialPart = (id: string) => {
    if (!currentRecord) return;
    const updatedParts = currentRecord.initialEstimate.parts.map((p) =>
      p.id === id ? { ...p, selectedForFinal: p.selectedForFinal === false ? true : false } : p
    );
    handleUpdateInitialParts(updatedParts, 'Toggled part selection for Final Estimate');
  };

  // Toggle Initial Labour Selection from Final Estimate
  const handleToggleInitialLabour = (id: string) => {
    if (!currentRecord) return;
    const updatedLabour = currentRecord.initialEstimate.labour.map((l) =>
      l.id === id ? { ...l, selectedForFinal: l.selectedForFinal === false ? true : false } : l
    );
    handleUpdateInitialLabour(updatedLabour, 'Toggled labour selection for Final Estimate');
  };

  // New Survey
  const handleNewSurvey = async () => {
    const newRec = StorageService.createNewRecord();
    try {
      const remoteRef = await SupabaseService.generateNextSurveyNumber();
      if (remoteRef && remoteRef !== newRec.surveyNumber) {
        newRec.surveyNumber = remoteRef;
        newRec.policy = { ...newRec.policy, surveyNumber: remoteRef };
        StorageService.saveRecord(newRec);
      }
    } catch (error) {
      console.warn('[Supabase] Remote reference generation failed:', error);
    }
    setAllRecords(StorageService.getAllRecords());
    setCurrentRecord(newRec);
    setCurrentTab('text-entry');
  };

  // Delete Record
  const handleDeleteRecord = (id: string) => {
    StorageService.deleteRecord(id);
    const records = StorageService.getAllRecords();
    setAllRecords(records);
    if (currentRecord?.id === id) {
      if (records.length > 0) {
        setCurrentRecord(records[0]);
      } else {
        const fresh = StorageService.createNewRecord();
        setAllRecords([fresh]);
        setCurrentRecord(fresh);
      }
    }
  };

  // Duplicate / Clone Survey Record
  const handleDuplicateRecord = (rec: SurveyRecord) => {
    const newSurveyNumber = `SF/SRV/${new Date().getFullYear()}/${String(
      new Date().getMonth() + 1
    ).padStart(2, '0')}/${Math.floor(1000 + Math.random() * 9000)}`;
    const cloned: SurveyRecord = {
      ...rec,
      id: `srv-${Date.now()}`,
      surveyNumber: newSurveyNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      policy: { ...rec.policy, surveyNumber: newSurveyNumber },
    };
    StorageService.saveRecord(cloned);
    setAllRecords(StorageService.getAllRecords());
    setCurrentRecord(cloned);
    setCurrentTab('dashboard');
  };

  // Global Search Filter Results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allRecords.filter((r) => {
      return (
        (r.surveyNumber || '').toLowerCase().includes(q) ||
        (r.vehicle?.registrationNumber || '').toLowerCase().includes(q) ||
        (r.vehicle?.rcNumber || '').toLowerCase().includes(q) ||
        (r.policy?.policyNumber || '').toLowerCase().includes(q) ||
        (r.policy?.claimNumber || '').toLowerCase().includes(q) ||
        (r.policy?.insuredName || '').toLowerCase().includes(q) ||
        (r.clientRequest?.clientName || '').toLowerCase().includes(q)
      );
    });
  }, [allRecords, searchQuery]);

  if (!currentRecord) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-mono">Initializing SurveyFlow Loss Assessment Engine...</p>
        </div>
      </div>
    );
  }

  const initialPartsCount = currentRecord.initialEstimate?.parts?.length || 0;
  const finalPartsCount = currentRecord.finalEstimate?.parts?.length || 0;
  const errorCount = currentRecord.validationErrors?.length || 0;
  const unmappedCount = currentRecord.unmappedText?.length || 0;

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'} flex flex-col font-sans transition-colors duration-200`}>
      {/* Sticky Global Top Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        saveStatus={saveStatus}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        onSelectRecord={(rec) => {
          setCurrentRecord(rec);
          StorageService.setActiveRecordId(rec.id);
        }}
        onNewSurvey={handleNewSurvey}
        historyCount={currentRecord.changeHistory?.length || 0}
        onOpenHistory={() => setIsHistoryOpen(true)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        errorCount={errorCount}
        onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
        activeRecord={currentRecord}
      />

      {/* Main Workspace: Sidebar + Dynamic Section View */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          errorCount={errorCount}
          initialPartsCount={initialPartsCount}
          finalPartsCount={finalPartsCount}
          unmappedCount={unmappedCount}
          photosCount={currentRecord.photos?.length || 0}
          onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
          activeRecord={currentRecord}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentTab === 'combined-data' && (
            <CombinedSurveyDataView
              currentRecord={currentRecord}
              onProcessText={handleProcessText}
              onApplyJsonRecord={handleApplyJsonRecord}
              onSave={() => triggerAutoSave(currentRecord)}
              onReset={() => {
                if (confirm('Reset active survey fields to empty?')) {
                  const resetRec = StorageService.createNewRecord();
                  setCurrentRecord(resetRec);
                  StorageService.setActiveRecordId(resetRec.id);
                }
              }}
              isProcessing={isProcessing}
              setCurrentTab={setCurrentTab}
              onChangePolicy={handleUpdatePolicy}
              onChangeVehicle={handleUpdateVehicle}
              onChangeParts={handleUpdateInitialParts}
              onChangeLabour={handleUpdateInitialLabour}
            />
          )}

          {currentTab === 'dashboard' && (
            <DashboardView
              currentRecord={currentRecord}
              allRecords={allRecords}
              onSelectRecord={(rec) => {
                setCurrentRecord(rec);
                StorageService.setActiveRecordId(rec.id);
              }}
              setCurrentTab={setCurrentTab}
              onNewSurvey={handleNewSurvey}
            />
          )}

          {currentTab === 'text-entry' && (
            <TextEntryView
              currentRecord={currentRecord}
              onProcessText={handleProcessText}
              onApplyJsonRecord={handleApplyJsonRecord}
              onUploadSourceFile={handleUploadSourceFile}
              onRemoveSourceFile={handleRemoveSourceFile}
              onSave={() => triggerAutoSave(currentRecord)}
              onReset={() => {
                if (confirm('Reset active survey fields to empty?')) {
                  const resetRec = StorageService.createNewRecord();
                  setCurrentRecord(resetRec);
                }
              }}
              isProcessing={isProcessing}
              setCurrentTab={setCurrentTab}
            />
          )}

          {currentTab === 'policy' && (
            <PolicyView
              policy={currentRecord.policy}
              vehicle={currentRecord.vehicle}
              fieldConfidences={currentRecord.fieldConfidences || {}}
              validationErrors={currentRecord.validationErrors || []}
              onChangePolicy={handleUpdatePolicy}
              onChangeVehicle={handleUpdateVehicle}
              onCommitSection={() => {
                triggerAutoSave(currentRecord);
              }}
            />
          )}

          {currentTab === 'client-request' && (
            <ClientRequestView
              clientRequest={currentRecord.clientRequest}
              policy={currentRecord.policy}
              vehicle={currentRecord.vehicle}
              summary={currentRecord.summary}
              settings={settings}
              onChange={handleUpdateClientRequest}
              onCommitSection={() => {
                triggerAutoSave(currentRecord);
              }}
            />
          )}

          {currentTab === 'company-request' && (
            <CompanyRequestView
              companyRequest={currentRecord.companyRequest}
              policy={currentRecord.policy}
              vehicle={currentRecord.vehicle}
              summary={currentRecord.summary}
              settings={settings}
              onChange={handleUpdateCompanyRequest}
              onCommitSection={() => {
                triggerAutoSave(currentRecord);
              }}
            />
          )}

          {currentTab === 'initial-estimate' && (
            <InitialEstimateView
              parts={currentRecord.initialEstimate?.parts || []}
              labour={currentRecord.initialEstimate?.labour || []}
              validationErrors={currentRecord.validationErrors || []}
              onChangeParts={handleUpdateInitialParts}
              onChangeLabour={handleUpdateInitialLabour}
              onNavigateToFinalEstimate={() => setCurrentTab('final-estimate')}
              onCommitSection={() => {
                triggerAutoSave(currentRecord);
              }}
            />
          )}

          {currentTab === 'final-estimate' && (
            <FinalEstimateView
              finalParts={currentRecord.finalEstimate?.parts || []}
              finalLabour={currentRecord.finalEstimate?.labour || []}
              invoices={currentRecord.invoices || []}
              summary={currentRecord.summary}
              gstSummary={currentRecord.gstSummary || []}
              initialParts={currentRecord.initialEstimate?.parts || []}
              initialLabour={currentRecord.initialEstimate?.labour || []}
              policyExcess={Number(currentRecord.policy?.policyExcess) || 1000}
              salvage={currentRecord.summary?.salvage || 0}
              onUpdateFinalParts={handleUpdateFinalParts}
              onUpdateFinalLabour={handleUpdateFinalLabour}
              onUpdateInvoices={handleUpdateInvoices}
              onUpdateExcessAndSalvage={handleUpdateExcessAndSalvage}
              onNavigateToInitialEstimate={() => setCurrentTab('initial-estimate')}
              onToggleInitialPart={handleToggleInitialPart}
              onToggleInitialLabour={handleToggleInitialLabour}
            />
          )}

          {currentTab === 'vehicle-photos' && (
            <VehiclePhotosView
              photos={currentRecord.photos || []}
              registrationNumber={currentRecord.vehicle?.registrationNumber || 'RJ15CA4929'}
              onUpdatePhotos={handleUpdatePhotos}
              onCommitSection={() => {
                triggerAutoSave(currentRecord);
              }}
            />
          )}

          {currentTab === 'validation' && (
            <ValidationView
              errors={currentRecord.validationErrors || []}
              unmappedItems={currentRecord.unmappedText || []}
              currentRecord={currentRecord}
              onAssignUnmappedText={handleAssignUnmappedText}
              onRemoveUnmappedItem={handleRemoveUnmappedItem}
              setCurrentTab={setCurrentTab}
            />
          )}

          {currentTab === 'final-report' && (
            <FinalReportView
              record={currentRecord}
              settings={settings}
              onUpdateRecord={(updated) => {
                setCurrentRecord(updated);
                triggerAutoSave(updated);
              }}
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'records' && (
            <RecordsHistoryView
              records={allRecords}
              activeRecordId={currentRecord.id}
              onSelectRecord={(rec) => {
                setCurrentRecord(rec);
                StorageService.setActiveRecordId(rec.id);
              }}
              onDeleteRecord={handleDeleteRecord}
              onDuplicateRecord={handleDuplicateRecord}
              setCurrentTab={setCurrentTab}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={(newSettings) => {
                setSettings(newSettings);
                StorageService.saveSettings(newSettings);
              }}
            />
          )}
        </main>
      </div>

      {/* Floating AI Copilot Trigger Button */}
      <button
        onClick={() => setIsAIAssistantOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs shadow-2xl shadow-purple-600/40 hover:scale-105 active:scale-95 transition-all group"
        title="Open SurveyFlow AI Intelligence Copilot"
      >
        <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
        <span className="tracking-wide">AI Copilot</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
      </button>

      {/* AI Assistant Drawer */}
      <AIAssistantDrawer
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        currentRecord={currentRecord}
        settings={settings}
        setCurrentTab={setCurrentTab}
        onApplyObservation={(obs) => {
          if (!currentRecord) return;
          const updated = {
            ...currentRecord,
            observations: { ...currentRecord.observations, ...obs },
          };
          setCurrentRecord(updated);
          triggerAutoSave(updated);
        }}
      />

      {/* Change History Drawer */}
      <ChangeHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={currentRecord.changeHistory || []}
        onUndo={handleUndo}
      />
    </div>
  );
}

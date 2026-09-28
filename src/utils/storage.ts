import { SurveyRecord, SurveyorSettings } from '../types/survey';
import { DEFAULT_SURVEYOR_SETTINGS, INITIAL_EMPTY_SURVEY } from './sampleData';
import { SupabaseService, isSupabaseConfigured } from './supabase';

const STORAGE_KEYS = {
  RECORDS: 'surveyflow_records',
  POLICIES: 'surveyflow_policies',
  CLIENTS: 'surveyflow_clients',
  COMPANIES: 'surveyflow_companies',
  ESTIMATES: 'surveyflow_estimates',
  REPORTS: 'surveyflow_reports',
  HISTORY: 'surveyflow_history',
  SETTINGS: 'surveyflow_settings',
  ACTIVE_ID: 'surveyflow_active_id',
};

// Safe JSON get/set
function getStorageItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage`, err);
    return fallback;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to localStorage`, err);
  }
}

export const StorageService = {
  getAllRecords(): SurveyRecord[] {
    const records = getStorageItem<SurveyRecord[]>(STORAGE_KEYS.RECORDS, []);
    return records;
  },

  getRecordById(id: string): SurveyRecord | null {
    const records = this.getAllRecords();
    return records.find((r) => r.id === id) || null;
  },

  replaceLocalRecords(records: SurveyRecord[]): void {
    setStorageItem(STORAGE_KEYS.RECORDS, records);
  },

  saveRecord(record: SurveyRecord): void {
    const records = this.getAllRecords();
    const index = records.findIndex((r) => r.id === record.id);
    const updated = {
      ...record,
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      records[index] = updated;
    } else {
      records.unshift(updated);
    }

    setStorageItem(STORAGE_KEYS.RECORDS, records);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, updated.id);

    // Sync domain-specific secondary stores as requested by specification
    this.syncDomainStores(records);
    if (isSupabaseConfigured) {
      void SupabaseService.upsertRecord(updated).catch((error) =>
        console.warn('[Supabase] Background record sync failed:', error)
      );
    }
  },

  deleteRecord(id: string): void {
    const records = this.getAllRecords().filter((r) => r.id !== id);
    setStorageItem(STORAGE_KEYS.RECORDS, records);
    this.syncDomainStores(records);
    if (isSupabaseConfigured) {
      void SupabaseService.deleteRecord(id).catch((error) =>
        console.warn('[Supabase] Background delete sync failed:', error)
      );
    }
  },

  getActiveRecordId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ID);
  },

  setActiveRecordId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, id);
  },

  getSettings(): SurveyorSettings {
    return getStorageItem<SurveyorSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SURVEYOR_SETTINGS);
  },

  saveSettings(settings: SurveyorSettings): void {
    setStorageItem(STORAGE_KEYS.SETTINGS, settings);
  },

  syncDomainStores(records: SurveyRecord[]) {
    try {
      const policies = records.map((r) => ({ surveyId: r.id, ...r.policy, vehicle: r.vehicle }));
      setStorageItem(STORAGE_KEYS.POLICIES, policies);

      const clients = records.map((r) => ({ surveyId: r.id, ...r.clientRequest }));
      setStorageItem(STORAGE_KEYS.CLIENTS, clients);

      const companies = records.map((r) => ({ surveyId: r.id, ...r.companyRequest }));
      setStorageItem(STORAGE_KEYS.COMPANIES, companies);

      const estimates = records.map((r) => ({
        surveyId: r.id,
        initial: r.initialEstimate,
        final: r.finalEstimate,
        summary: r.summary,
      }));
      setStorageItem(STORAGE_KEYS.ESTIMATES, estimates);

      const reports = records.map((r) => ({
        surveyId: r.id,
        surveyNumber: r.surveyNumber,
        policy: r.policy,
        vehicle: r.vehicle,
        summary: r.summary,
        observations: r.observations,
      }));
      setStorageItem(STORAGE_KEYS.REPORTS, reports);

      const history = records.flatMap((r) =>
        r.changeHistory.map((h) => ({ ...h, surveyId: r.id, surveyNumber: r.surveyNumber }))
      );
      setStorageItem(STORAGE_KEYS.HISTORY, history);
    } catch (e) {
      console.warn('Error syncing domain stores:', e);
    }
  },

  generateNextSurveyNumber(): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const prefix = `SF/SRV/${year}/${month}/`;
    const records = this.getAllRecords();
    let max = 0;
    records.forEach((r) => {
      const value = String(r.surveyNumber || '');
      if (value.startsWith(prefix)) {
        const n = Number(value.slice(prefix.length));
        if (Number.isFinite(n)) max = Math.max(max, n);
      }
    });
    return `${prefix}${String(max + 1).padStart(4, '0')}`;
  },

  createNewRecord(): SurveyRecord {
    const newSurveyNumber = this.generateNextSurveyNumber();
    const newId = `srv-${Date.now()}`;

    const newRecord: SurveyRecord = {
      ...INITIAL_EMPTY_SURVEY,
      id: newId,
      surveyNumber: newSurveyNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      policy: {
        ...INITIAL_EMPTY_SURVEY.policy,
        surveyNumber: newSurveyNumber,
      },
    };

    this.saveRecord(newRecord);
    return newRecord;
  },
};

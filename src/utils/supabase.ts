import type { SurveyRecord, VehiclePhoto, SourceFile } from '../types/survey';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
export const SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || 'survey-files';
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

const headers = (extra: Record<string, string> = {}) => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  ...extra,
});

const rest = (table: string) => `${SUPABASE_URL}/rest/v1/${table}`;
const storage = (path: string) => `${SUPABASE_URL}/storage/v1/${path}`;

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => (await fetch(dataUrl)).blob();

const publicStorageUrl = (path: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${path}`;

const dbRecord = (record: SurveyRecord): SurveyRecord => ({
  ...record,
  photos: (record.photos || []).map((photo) => ({
    ...photo,
    dataUrl: photo.dataUrl?.startsWith('data:') ? '' : photo.dataUrl,
  })),
});

async function requestJson(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: headers((init.headers as Record<string, string>) || {}),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function deleteRows(table: string, surveyId: string) {
  const response = await fetch(`${rest(table)}?survey_id=eq.${encodeURIComponent(surveyId)}`, {
    method: 'DELETE',
    headers: headers({ Prefer: 'return=minimal' }),
  });
  if (!response.ok) throw new Error(`Delete ${table} failed: ${await response.text()}`);
}

export const SupabaseService = {
  async generateNextSurveyNumber(): Promise<string | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const value = await requestJson(`${SUPABASE_URL}/rest/v1/rpc/generate_survey_number`, {
        method: 'POST',
        body: '{}',
      });
      return typeof value === 'string' ? value : null;
    } catch (error) {
      console.warn('[Supabase] Reference number RPC failed:', error);
      return null;
    }
  },

  async ping(): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    try {
      await requestJson(`${rest('survey_records')}?select=id&limit=1`);
      return true;
    } catch (error) {
      console.warn('[Supabase] Connection check failed:', error);
      return false;
    }
  },

  async loadAllRecords(): Promise<SurveyRecord[]> {
    if (!isSupabaseConfigured) return [];
    const rows = await requestJson(`${rest('survey_records')}?select=id,record,updated_at&order=updated_at.desc`);
    const records = (rows || []).map((row: any) => row.record as SurveyRecord);
    if (!records.length) return [];

    const ids = records.map((r) => encodeURIComponent(r.id)).join(',');
    const photos = await requestJson(`${rest('survey_photos')}?select=survey_id,photo_id,public_url&survey_id=in.(${ids})`).catch(() => []);
    const sourceFiles = await requestJson(`${rest('survey_files')}?select=survey_id,id,file_name,file_type,file_size,storage_path,public_url,uploaded_at&survey_id=in.(${ids})`).catch(() => []);
    const bySurvey = new Map<string, any[]>();
    for (const row of photos || []) {
      const arr = bySurvey.get(row.survey_id) || [];
      arr.push(row);
      bySurvey.set(row.survey_id, arr);
    }

    const filesBySurvey = new Map<string, any[]>();
    for (const row of sourceFiles || []) {
      const arr = filesBySurvey.get(row.survey_id) || [];
      arr.push(row);
      filesBySurvey.set(row.survey_id, arr);
    }

    return records.map((record) => ({
      ...record,
      photos: (record.photos || []).map((photo) => ({
        ...photo,
        dataUrl: bySurvey.get(record.id)?.find((r) => r.photo_id === photo.id)?.public_url || photo.dataUrl || '',
      })),
      sourceFiles: (filesBySurvey.get(record.id) || []).map((f) => ({
        id: f.id, fileName: f.file_name, fileType: f.file_type, fileSize: Number(f.file_size) || 0,
        storagePath: f.storage_path, publicUrl: f.public_url, uploadedAt: f.uploaded_at,
      })),
    }));
  },

  async uploadPhoto(recordId: string, photo: VehiclePhoto): Promise<string> {
    if (!isSupabaseConfigured || !photo.dataUrl?.startsWith('data:')) return photo.dataUrl;
    const blob = await dataUrlToBlob(photo.dataUrl);
    const safeName = (photo.fileName || `${photo.id}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${recordId}/photos/${photo.id}-${safeName}`;
    const response = await fetch(storage(`object/${SUPABASE_BUCKET}/${path}`), {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': blob.type || 'image/jpeg',
        'x-upsert': 'true',
        'cache-control': '31536000',
      },
      body: blob,
    });
    if (!response.ok) throw new Error(`Photo upload failed: ${await response.text()}`);
    return publicStorageUrl(path);
  },

  async uploadSourceFile(recordId: string, file: File): Promise<SourceFile> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${recordId}/documents/${id}-${safeName}`;
    const response = await fetch(storage(`object/${SUPABASE_BUCKET}/${path}`), {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true',
      },
      body: file,
    });
    if (!response.ok) throw new Error(`File upload failed: ${await response.text()}`);
    const publicUrl = publicStorageUrl(path);
    const item: SourceFile = { id, fileName: file.name, fileType: file.type || 'application/octet-stream', fileSize: file.size, storagePath: path, publicUrl, uploadedAt: new Date().toISOString() };
    await requestJson(rest('survey_files'), { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
      survey_id: recordId, id, file_name: item.fileName, file_type: item.fileType, file_size: item.fileSize, storage_path: path, public_url: publicUrl, uploaded_at: item.uploadedAt,
    }) });
    return item;
  },

  async deleteSourceFile(fileId: string, storagePath?: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    if (storagePath) {
      try {
        await requestJson(storage(`object/${SUPABASE_BUCKET}`), {
          method: 'DELETE',
          body: JSON.stringify({ prefixes: [storagePath] }),
        });
      } catch (error) {
        console.warn('[Supabase] Source file object delete failed:', error);
      }
    }
    await requestJson(`${rest('survey_files')}?id=eq.${encodeURIComponent(fileId)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  },

  async upsertRecord(record: SurveyRecord): Promise<void> {
    if (!isSupabaseConfigured) return;
    const workingRecord: SurveyRecord = { ...record, photos: [...(record.photos || [])] };

    for (let i = 0; i < workingRecord.photos.length; i += 1) {
      const photo = workingRecord.photos[i];
      if (photo.dataUrl?.startsWith('data:')) {
        try {
          workingRecord.photos[i] = { ...photo, dataUrl: await this.uploadPhoto(workingRecord.id, photo) };
        } catch (error) {
          console.warn('[Supabase] Photo upload failed:', error);
        }
      }
    }

    const recordForDb = dbRecord(workingRecord);
    await requestJson(`${rest('survey_records')}?on_conflict=id`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        id: recordForDb.id,
        survey_number: recordForDb.surveyNumber,
        policy_number: recordForDb.policy?.policyNumber || null,
        registration_number: recordForDb.vehicle?.registrationNumber || null,
        document_type: recordForDb.documentType,
        status: recordForDb.status,
        confidence: recordForDb.confidence,
        record: recordForDb,
        raw_text: recordForDb.rawPastedText || '',
        created_at: recordForDb.createdAt,
        updated_at: recordForDb.updatedAt,
      }),
    });

    for (const table of ['survey_parts', 'survey_labour', 'survey_invoices', 'survey_client_documents', 'survey_company_documents', 'survey_photos']) {
      await deleteRows(table, record.id);
    }

    const inserts: Array<[string, any[]]> = [];
    inserts.push(['survey_parts', (record.initialEstimate?.parts || []).map((p) => ({
      survey_id: record.id, row_id: p.id, e_no: p.eNo, parts_description: p.partsDescription,
      hsn_code: p.hsnCode, bill_s_no: p.billSNo, remark: p.remark, estimated: Number(p.estimated) || 0,
      glass_second_hand_repair: p.glassSecondHandRepair, metal_35: p.metal35, non_metal: p.nonMetal,
      gst_rate: Number(p.gstRate) || 0, selected_for_final: p.selectedForFinal !== false,
    }))]);
    inserts.push(['survey_labour', (record.initialEstimate?.labour || []).map((l) => ({
      survey_id: record.id, row_id: l.id, s_no: l.sNo, sac: l.sac, bill_s_no: l.billSNo,
      labour_description: l.labourDescription, estimated: Number(l.estimated) || 0, assessed: Number(l.assessed) || 0,
      gst_rate: Number(l.gstRate) || 0, total: Number(l.total) || 0, selected_for_final: l.selectedForFinal !== false,
    }))]);
    inserts.push(['survey_invoices', (record.invoices || []).map((i) => ({
      survey_id: record.id, row_id: i.id, invoice_number: i.invoiceNumber, invoice_date: i.invoiceDate || null,
      invoice_amount: Number(i.invoiceAmount) || 0, vendor: i.vendor, gst_number: i.gstNumber, description: i.description,
    }))]);
    inserts.push(['survey_client_documents', (record.clientRequest?.requestedDocuments || []).map((d) => ({
      survey_id: record.id, document_id: d.id, document_name: d.documentName, status: d.status, remarks: d.remarks,
    }))]);
    inserts.push(['survey_company_documents', (record.companyRequest?.requiredDocuments || []).map((d) => ({
      survey_id: record.id, document_id: d.id, document_name: d.documentName, status: d.status, remarks: d.remarks,
    }))]);
    inserts.push(['survey_photos', (workingRecord.photos || []).map((p) => ({
      survey_id: record.id, photo_id: p.id, file_name: p.fileName, caption: p.caption,
      captured_at: p.timestamp || null, public_url: p.dataUrl || null,
    }))]);

    for (const [table, rows] of inserts) {
      if (!rows.length) continue;
      try {
        await requestJson(rest(table), {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(rows),
        });
      } catch (error) {
        console.warn(`[Supabase] ${table} sync failed:`, error);
      }
    }
  },

  async deleteRecord(id: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    await deleteRows('survey_files', id).catch(() => undefined);
    await requestJson(`${rest('survey_records')}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });
  },
};

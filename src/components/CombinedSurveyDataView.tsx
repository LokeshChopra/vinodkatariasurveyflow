import React from 'react';
import { TextEntryView } from './TextEntryView';
import { PolicyView } from './PolicyView';
import { InitialEstimateView } from './InitialEstimateView';
import { SurveyRecord, PolicyData, VehicleData, InitialPartRow, InitialLabourRow } from '../types/survey';
import { JsonImportStats } from '../utils/jsonImporter';

interface CombinedSurveyDataViewProps {
  currentRecord: SurveyRecord;
  onProcessText: (text: string, title?: string, mode?: 'replace' | 'merge') => Promise<void>;
  onApplyJsonRecord: (newRecord: SurveyRecord, stats: JsonImportStats) => void;
  onSave: () => void;
  onReset: () => void;
  isProcessing: boolean;
  setCurrentTab: (tab: string) => void;
  onChangePolicy: (updatedFields: Partial<PolicyData>, fieldKey: string, oldVal: any, newVal: any) => void;
  onChangeVehicle: (updatedFields: Partial<VehicleData>, fieldKey: string, oldVal: any, newVal: any) => void;
  onChangeParts: (parts: InitialPartRow[], changeDesc: string) => void;
  onChangeLabour: (labour: InitialLabourRow[], changeDesc: string) => void;
}

/**
 * Unified data-entry screen.
 * JSON is entered once at the top and the same screen immediately shows the
 * Policy/Vehicle fields and Initial Estimate tables underneath it.
 * Existing Initial -> Final selection/sync logic remains owned by App.tsx.
 */
export const CombinedSurveyDataView: React.FC<CombinedSurveyDataViewProps> = ({
  currentRecord,
  onProcessText,
  onApplyJsonRecord,
  onSave,
  onReset,
  isProcessing,
  setCurrentTab,
  onChangePolicy,
  onChangeVehicle,
  onChangeParts,
  onChangeLabour,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
            <span className="text-lg">4</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Policy, Vehicle & Initial Estimate Data</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter one JSON document above. Matching Policy, Vehicle, Parts and Labour fields are filled below automatically.
              Initial Estimate selections continue to drive Final Estimate exactly as before.
            </p>
          </div>
        </div>
      </div>

      <TextEntryView
        currentRecord={currentRecord}
        onProcessText={onProcessText}
        onApplyJsonRecord={onApplyJsonRecord}
        onSave={onSave}
        onReset={onReset}
        isProcessing={isProcessing}
        setCurrentTab={setCurrentTab}
        suppressAutoNavigation
        embedded
      />

      <PolicyView
        policy={currentRecord.policy}
        vehicle={currentRecord.vehicle}
        fieldConfidences={currentRecord.fieldConfidences || {}}
        validationErrors={currentRecord.validationErrors || []}
        onChangePolicy={onChangePolicy}
        onChangeVehicle={onChangeVehicle}
        onCommitSection={onSave}
      />

      <InitialEstimateView
        parts={currentRecord.initialEstimate?.parts || []}
        labour={currentRecord.initialEstimate?.labour || []}
        validationErrors={currentRecord.validationErrors || []}
        onChangeParts={onChangeParts}
        onChangeLabour={onChangeLabour}
        onNavigateToFinalEstimate={() => setCurrentTab('final-estimate')}
        onCommitSection={onSave}
      />
    </div>
  );
};

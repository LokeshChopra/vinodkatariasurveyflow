import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  Upload,
  Trash2,
  Download,
  Image as ImageIcon,
  CheckCircle2,
  Eye,
  X,
  Save,
  Share2,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { VehiclePhoto } from '../types/survey';

interface VehiclePhotosViewProps {
  photos: VehiclePhoto[];
  registrationNumber?: string;
  onUpdatePhotos: (photos: VehiclePhoto[]) => void;
  onCommitSection?: () => void;
}

const PRESET_TAGS = [
  'Front View',
  'Chassis Plate Punching',
  'Engine Compartment',
  'Odometer / Speedometer',
  'Front Bumper Damage',
  'RH Side Door & Fender',
  'LH Side Quarter Panel',
  'Rear View / Tail Lamp',
  'Underbody / Suspension',
  'Re-inspection Completed',
];

export const VehiclePhotosView: React.FC<VehiclePhotosViewProps> = ({
  photos = [],
  registrationNumber = 'RJ15CA4929',
  onUpdatePhotos,
  onCommitSection,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<VehiclePhoto | null>(null);
  const [isCommitted, setIsCommitted] = useState(false);
  const [commitTime, setCommitTime] = useState<string | null>(null);
  const [autoSaveToGallery, setAutoSaveToGallery] = useState<boolean>(true);
  const [lastSavedMessage, setLastSavedMessage] = useState<string | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);

  // Clear toast after 4 seconds
  useEffect(() => {
    if (lastSavedMessage) {
      const timer = setTimeout(() => setLastSavedMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [lastSavedMessage]);

  // Helper to trigger save/download to the user's phone gallery / downloads
  const saveToDeviceGallery = (dataUrl: string, fileName: string) => {
    try {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    } catch (err) {
      console.error('Error saving image to device gallery:', err);
      return false;
    }
  };

  // Compress & normalize image via Canvas to ~1600px width/height and 0.82 JPEG quality
  // This produces crisp, official surveyor quality while keeping size ~150-250KB for permanent storage
  const processAndCompressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
            resolve(compressedDataUrl);
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Process selected file(s) from either Camera capture or File Uploader
  const handleFiles = async (files: FileList | null, isFromCamera: boolean = false) => {
    if (!files || files.length === 0) return;

    const newPhotosList: VehiclePhoto[] = [];
    const now = new Date();
    const timeStampStr = now.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const fileTimestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl = await processAndCompressImage(file);
      const regSanitized = registrationNumber.replace(/[^a-zA-Z0-9]/g, '');
      const downloadName = `${regSanitized}_DamagePhoto_${fileTimestamp}_${i + 1}.jpg`;

      const newPhoto: VehiclePhoto = {
        id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        dataUrl,
        fileName: downloadName,
        caption: isFromCamera ? 'Accidental Damage Inspection' : file.name.replace(/\.[^/.]+$/, ''),
        timestamp: timeStampStr,
      };

      newPhotosList.push(newPhoto);

      // Auto save to device/phone gallery if enabled
      if (autoSaveToGallery) {
        saveToDeviceGallery(dataUrl, downloadName);
      }
    }

    onUpdatePhotos([...photos, ...newPhotosList]);
    setIsCommitted(false);

    if (autoSaveToGallery) {
      setLastSavedMessage(`✓ ${newPhotosList.length} photo(s) attached and saved directly to your Phone Gallery!`);
    } else {
      setLastSavedMessage(`✓ ${newPhotosList.length} photo(s) permanently attached to survey record!`);
    }
  };

  const confirmDelete = (id: string) => {
    const updated = photos.filter((p) => p.id !== id);
    onUpdatePhotos(updated);
    if (selectedPhoto?.id === id) {
      setSelectedPhoto(null);
    }
    setPhotoToDelete(null);
    setIsCommitted(false);
    setLastSavedMessage('Photo permanently deleted from survey record.');
  };

  const handleUpdateCaption = (id: string, caption: string) => {
    const updated = photos.map((p) => (p.id === id ? { ...p, caption } : p));
    onUpdatePhotos(updated);
    setIsCommitted(false);
  };

  const handleApplyPresetTag = (photoId: string, tag: string) => {
    handleUpdateCaption(photoId, tag);
  };

  const handleDownload = (photo: VehiclePhoto) => {
    const regSanitized = registrationNumber.replace(/[^a-zA-Z0-9]/g, '');
    const fileName = photo.fileName || `${regSanitized}_photo_${photo.id}.jpg`;
    saveToDeviceGallery(photo.dataUrl, fileName);
    setLastSavedMessage(`Downloaded "${photo.caption || fileName}" to device gallery.`);
  };

  const handleShareMobile = async (photo: VehiclePhoto) => {
    try {
      if (navigator.share) {
        // Convert base64 dataUrl to Blob file for native Web Share API
        const res = await fetch(photo.dataUrl);
        const blob = await res.blob();
        const file = new File([blob], photo.fileName || 'vehicle_photo.jpg', { type: 'image/jpeg' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${registrationNumber} - ${photo.caption}`,
            text: `Vehicle inspection photograph for ${registrationNumber}`,
          });
          return;
        }
      }
      // Fallback: download to phone
      handleDownload(photo);
    } catch {
      handleDownload(photo);
    }
  };

  const handleCommit = () => {
    if (onCommitSection) onCommitSection();
    setIsCommitted(true);
    setCommitTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setLastSavedMessage('✓ Vehicle photos section committed to survey file.');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {lastSavedMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 text-white border border-emerald-500/40 shadow-2xl shadow-emerald-900/30 text-xs font-semibold animate-in slide-in-from-top-4 fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{lastSavedMessage}</span>
          <button onClick={() => setLastSavedMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-950/80 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold shadow-sm">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 font-semibold font-mono">
                Section 7
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Accidental Vehicle Photographs & Inspection Hub
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click with phone camera directly or upload damage pictures. Automatically saved to phone gallery and permanently embedded in the final survey report.
            </p>
          </div>
        </div>

        {/* Action Controls & Commit */}
        <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end">
          {isCommitted && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Committed {commitTime && `(${commitTime})`}</span>
            </div>
          )}

          <button
            onClick={handleCommit}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            title="Commit vehicle photographs to survey file"
          >
            <Save className="w-4 h-4" />
            <span>Commit Section</span>
          </button>
        </div>
      </div>

      {/* Upload & Mobile Camera Hub */}
      <div className="bg-gradient-to-br from-pink-950/40 via-slate-900 to-slate-900 border-2 border-pink-500/30 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Live Phone Camera & Gallery Retention</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  {registrationNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Clicking with your phone camera directly saves images to your mobile gallery & permanent survey storage.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Hidden Input for Phone Camera with capture */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files, true)}
            />
            {/* Hidden Input for Standard File Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files, false)}
            />

            {/* Direct Phone Camera Button */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-pink-600/30 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Click with Phone Camera</span>
            </button>

            {/* Device Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 active:scale-95 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 text-pink-400" />
              <span>Upload from Gallery / PC</span>
            </button>
          </div>
        </div>

        {/* Options & Auto-save Setting */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 hover:bg-slate-800">
            <input
              type="checkbox"
              checked={autoSaveToGallery}
              onChange={(e) => setAutoSaveToGallery(e.target.checked)}
              className="rounded text-pink-600 focus:ring-pink-500 accent-pink-600"
            />
            <span className="text-slate-300 font-medium">
              Auto-save clicked photos to Phone Gallery / Downloads (Recommended)
            </span>
          </label>

          <div className="flex items-center gap-3">
            <span>
              Attached Photographs: <strong className="text-pink-300 font-mono text-sm">{photos.length}</strong>
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              *Full resolution included in print appendices
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Uploaded Photos */}
      {photos.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-pink-50 dark:bg-pink-950/50 text-pink-500 dark:text-pink-400 flex items-center justify-center mx-auto shadow-inner">
            <Camera className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No Accidental Vehicle Inspection Photos Attached
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              Tap <strong className="text-pink-600 dark:text-pink-400">&quot;Click with Phone Camera&quot;</strong> to take pictures on-site. Every picture is automatically saved to your phone gallery and embedded into the official Final Survey Report.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Launch Phone Camera</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Select Files</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all flex flex-col justify-between"
            >
              {/* Image Preview with Badges */}
              <div
                className="relative aspect-4/3 bg-slate-950 overflow-hidden cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.dataUrl}
                  alt={photo.caption}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Photo Index Badge */}
                <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-[10px] font-mono text-white font-bold">
                  Photo #{idx + 1}
                </span>

                {/* Registration Number Stamp */}
                <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[10px] font-mono text-amber-300 font-semibold">
                  {registrationNumber}
                </span>

                {/* Overlay Hover Actions */}
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPhoto(photo);
                    }}
                    className="p-2.5 rounded-xl bg-white/95 text-slate-900 hover:bg-white text-xs font-bold shadow-lg cursor-pointer"
                    title="View Full Size Lightbox"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(photo);
                    }}
                    className="p-2.5 rounded-xl bg-pink-600 text-white hover:bg-pink-500 text-xs font-bold shadow-lg cursor-pointer flex items-center gap-1.5"
                    title="Save Image to Phone Gallery"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-[11px]">Save</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareMobile(photo);
                    }}
                    className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-bold shadow-lg cursor-pointer"
                    title="Share / Save to Camera Roll"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Caption & Metadata Input */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      <span>Description / Inspection Angle</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={photo.caption}
                    onChange={(e) => handleUpdateCaption(photo.id, e.target.value)}
                    placeholder="e.g. Front Bumper Impact & Radiator"
                    className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />

                  {/* Quick Preset Tag Chips */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {PRESET_TAGS.slice(0, 4).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleApplyPresetTag(photo.id, tag)}
                        className={`text-[9px] px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                          photo.caption === tag
                            ? 'bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 font-bold border border-pink-300 dark:border-pink-700'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Footer details & Action Bar */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-mono">
                  <span>{photo.timestamp}</span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDownload(photo)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/40 text-[10px] font-bold transition-colors cursor-pointer"
                      title="Save to Phone Gallery / Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={() => setPhotoToDelete(photo.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Delete Photo Permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {photoToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Photo Permanently?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This image will be permanently removed from this survey record and its final report appendix.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPhotoToDelete(null)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(photoToDelete)}
                className="flex-1 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Size Modal Viewer */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 font-mono font-bold">
                  {registrationNumber}
                </span>
                <span className="text-xs font-bold text-white">{selectedPhoto.caption}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedPhoto)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save to Phone Gallery</span>
                </button>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="max-h-[75vh] flex items-center justify-center p-2 bg-black">
              <img
                src={selectedPhoto.dataUrl}
                alt={selectedPhoto.caption}
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

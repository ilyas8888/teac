import { useRef, useState } from 'react';
import { Image, Upload, X, Loader2 } from 'lucide-react';
import { uploadToCloudinary } from '../lib/cloudinary';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  aspectRatio?: 'video' | 'square' | 'wide';
  className?: string;
}

export default function ImageUpload({
  value,
  onChange,
  label = 'Image de couverture',
  aspectRatio = 'video',
  className = '',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aspectClass = { video: 'aspect-video', square: 'aspect-square', wide: 'aspect-[3/1]' }[aspectRatio];

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Fichier non supporté — utilisez JPG, PNG ou WebP.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onChange(url);
    } catch {
      setError("Échec de l'upload. Réessayez.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
      )}
      <div
        className={`relative ${aspectClass} w-full rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden group cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors`}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Téléverser une image"
      >
        {value ? (
          <>
            <img src={value} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="text-white text-sm font-medium flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                <Upload size={14} /> Changer
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-700 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Supprimer l'image"
            >
              <X size={14} />
            </button>
          </>
        ) : uploading ? (
          <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
            <Loader2 size={22} className="text-indigo-500 animate-spin" />
            <span className="text-xs text-gray-400">Upload en cours…</span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center flex-col gap-2 text-gray-400 select-none">
            <Image size={24} className="opacity-40" />
            <span className="text-xs">Cliquer pour ajouter une image</span>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
    </div>
  );
}

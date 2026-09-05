import { useState, useRef } from 'react';
import { Plus, Image as ImageIcon, X, Upload, Link2 } from 'lucide-react';

/**
 * Resizes and compresses an image File to a base64 Data URL.
 * Keeps output under ~80KB so it safely fits within standard payload limits.
 */
function compressImage(file, maxWidth = 600, maxHeight = 600, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export default function ImageUpload({
  label = 'Product Image',
  value = '',
  onChange,
  shape = 'rounded-xl', // 'rounded-xl' or 'rounded-full'
  helperText = 'Click the + to choose photo from local gallery',
}) {
  const fileInputRef = useRef(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WEBP, etc.)');
      return;
    }

    try {
      setIsProcessing(true);
      const compressedDataUrl = await compressImage(file);
      onChange?.(compressedDataUrl);
    } catch (err) {
      console.error('Error processing image:', err);
      // Fallback: direct FileReader
      const reader = new FileReader();
      reader.onloadend = () => onChange?.(reader.result);
      reader.readAsDataURL(file);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.('');
    setUrlDraft('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApplyUrl = () => {
    if (urlDraft.trim()) {
      onChange?.(urlDraft.trim());
      setShowUrlInput(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="label mb-0">{label}</label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1 font-medium transition"
        >
          <Link2 size={12} />
          {showUrlInput ? 'Hide URL input' : 'Paste web link'}
        </button>
      </div>

      {showUrlInput && (
        <div className="flex gap-2 mb-2">
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            className="input text-xs flex-1 py-1.5"
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            Apply
          </button>
        </div>
      )}

      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        id="image-file-input"
      />

      <div className="flex items-center gap-4">
        {value ? (
          /* Preview Mode with image loaded */
          <div className="relative group">
            <div
              className={`w-28 h-28 ${shape} overflow-hidden border-2 border-primary-500/40 shadow-sm bg-slate-100 dark:bg-slate-800 flex items-center justify-center`}
            >
              <img
                src={value}
                alt="Uploaded preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '';
                  e.currentTarget.alt = 'Invalid image';
                }}
              />
            </div>

            {/* Change photo button (overlay) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-xs font-medium backdrop-blur-[1px]"
              title="Change photo from gallery"
            >
              <Upload size={18} />
              <span>Change</span>
            </button>

            {/* Clear photo button */}
            <button
              type="button"
              onClick={handleClear}
              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-md transition"
              title="Remove photo"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          /* Empty Mode: Big Plus icon to add photo from local gallery */
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`w-28 h-28 ${shape} border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary-500 dark:hover:border-primary-400 bg-slate-50 dark:bg-slate-800/60 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-all group shadow-sm`}
            title="Click to add photo from local gallery"
          >
            {isProcessing ? (
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus size={22} className="stroke-[2.5]" />
                </div>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 group-hover:text-primary-600 dark:group-hover:text-primary-300">
                  Add Photo
                </span>
              </>
            )}
          </div>
        )}

        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <ImageIcon size={14} className="text-primary-500" />
            Local Gallery Upload
          </p>
          <p>{helperText}</p>
          <p className="text-[11px] text-slate-400">Supported: JPG, PNG, WEBP, GIF</p>
        </div>
      </div>
    </div>
  );
}


import React, { useCallback, useEffect } from 'react';
import { Upload, ClipboardPaste } from 'lucide-react';

interface UploaderProps {
  onImageSelect: (file: File, base64: string, mimeType: string) => void;
}

export const Uploader: React.FC<UploaderProps> = ({ onImageSelect }) => {
  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, envie apenas arquivos de imagem.');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onImageSelect(file, base64, file.type);
    };
    reader.readAsDataURL(file);
  }, [onImageSelect]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
          break;
        }
      }
    }
  }, [processFile]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  return (
    <div 
      className="w-full h-64 md:h-96 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center p-6 md:p-8 text-center hover:border-yellow-400/50 hover:bg-slate-800/50 transition-all cursor-pointer group bg-slate-900/50 relative overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <label className="flex flex-col items-center cursor-pointer w-full h-full justify-center">
        <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform shadow-xl shadow-black/20 relative border border-indigo-500/20 group-hover:border-yellow-400/30">
          <Upload className="w-5 h-5 md:w-6 md:h-6 text-indigo-400 group-hover:text-yellow-400 group-hover:opacity-0 transition-all absolute" />
          <ClipboardPaste className="w-5 h-5 md:w-6 md:h-6 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity absolute" />
        </div>
        <h3 className="text-base md:text-lg font-light text-white mb-1 md:mb-2 group-hover:text-yellow-400 transition-colors uppercase tracking-elegant">Selecione ou Arraste</h3>
        <p className="text-slate-400 mb-4 md:mb-6 max-w-xs mx-auto font-extralight tracking-soft text-[10px] md:text-xs leading-relaxed">
          JPG, PNG ou WebP. <span className="hidden sm:inline">Use <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-400 border border-slate-700 text-[10px] group-hover:text-yellow-400">CTRL+V</kbd> para colar.</span>
        </p>
        <div className="px-6 md:px-8 py-2 md:py-2.5 bg-indigo-600/10 text-indigo-400 rounded-full text-[9px] md:text-[10px] uppercase tracking-elegant border border-indigo-500/30 group-hover:bg-yellow-400 group-hover:text-slate-900 group-hover:border-yellow-400 transition-all">
          Importar
        </div>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="hidden" 
        />
      </label>
    </div>
  );
};

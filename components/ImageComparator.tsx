
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';

interface ImageComparatorProps {
  original: string;
  processed: string;
  onDownload: () => void;
}

export const ImageComparator: React.FC<ImageComparatorProps> = ({ original, processed, onDownload }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => setIsResizing(true), []);
  const handleMouseUp = useCallback(() => setIsResizing(false), []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percent);
  }, [isResizing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isResizing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percent);
  }, [isResizing]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove]);

  const toggleFullScreen = () => setIsFullScreen(!isFullScreen);

  const containerClasses = isFullScreen
    ? "fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-8"
    : "relative w-full h-full flex flex-col gap-3 md:gap-4";

  const imageWrapperClasses = isFullScreen
    ? "relative w-full h-full max-w-7xl mx-auto overflow-hidden rounded-xl shadow-2xl border border-slate-700 select-none group cursor-col-resize"
    : "relative w-full aspect-[4/5] sm:aspect-[4/3] md:aspect-video rounded-xl overflow-hidden shadow-2xl bg-black border border-slate-700 select-none group cursor-col-resize";

  return (
    <div className={containerClasses}>
      <div 
        ref={containerRef}
        className={imageWrapperClasses}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <img 
          src={processed} 
          alt="Restaurada" 
          className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none bg-black/20"
        />
        
        <div 
          className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none border-r-2 border-yellow-400 bg-black/5"
          style={{ width: `${sliderPosition}%` }}
        >
          <img 
            src={original} 
            alt="Original" 
            className="absolute top-0 left-0 w-full h-full object-contain max-w-none bg-black/20"
            style={{ width: containerRef.current?.getBoundingClientRect().width || '100%' }}
          />
        </div>

        <div 
          className="absolute top-0 bottom-0 w-1 bg-yellow-400 cursor-col-resize shadow-[0_0_10px_rgba(250,204,21,0.3)] z-10 hover:bg-yellow-300 transition-colors"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-900">
            <svg className="w-3 h-3 md:w-4 md:h-4 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 9l4-4 4 4m0 6l-4 4-4-4" transform="rotate(90 12 12)" />
            </svg>
          </div>
        </div>

        <div className="absolute top-3 left-3 md:top-4 md:left-4 bg-black/60 backdrop-blur-md text-white px-2.5 md:px-4 py-1 rounded-full text-[8px] md:text-[10px] uppercase tracking-elegant border border-white/10 pointer-events-none z-20">
          Original
        </div>
        <div className="absolute top-3 right-3 md:top-4 md:right-4 bg-indigo-600/80 backdrop-blur-md text-white px-2.5 md:px-4 py-1 rounded-full text-[8px] md:text-[10px] uppercase tracking-elegant border border-indigo-400/30 pointer-events-none z-20">
          Pronta
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFullScreen();
          }}
          className="absolute bottom-3 right-3 md:bottom-4 md:right-4 bg-black/50 hover:bg-yellow-400 hover:text-slate-900 backdrop-blur-md text-white p-1.5 md:p-2 rounded-lg border border-white/10 transition-colors z-30"
          title={isFullScreen ? "Sair" : "Tela Cheia"}
        >
          {isFullScreen ? <Minimize2 className="w-4 h-4 md:w-5 md:h-5" /> : <Maximize2 className="w-4 h-4 md:w-5 md:h-5" />}
        </button>
      </div>

      <div className={`flex justify-between items-center bg-slate-800/50 p-3 md:p-4 rounded-xl border border-slate-700 ${isFullScreen ? 'mt-4 w-full max-w-7xl' : ''}`}>
        <div className="flex items-center text-slate-400 text-[8px] md:text-[10px] uppercase tracking-tight md:tracking-soft font-extralight">
          <AlertCircle className="w-3 h-3 mr-1.5 md:mr-2 text-yellow-400 shrink-0" />
          <span className="line-clamp-1">Compare os detalhes deslizando</span>
        </div>
        <button 
          onClick={onDownload}
          className="flex items-center gap-1.5 md:gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 px-3 md:px-5 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs uppercase tracking-elegant transition-colors whitespace-nowrap"
        >
          <Download className="w-3 h-3" />
          <span>Salvar</span>
        </button>
      </div>
    </div>
  );
};

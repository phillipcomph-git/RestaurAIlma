
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Wand2, Palette, ScanLine, Sparkles, RotateCcw,
  Settings, History, X, Clock, Zap, MessageSquare, RefreshCw, 
  Maximize2, Camera, ImageOff, Heart, Info, Send, Layers, 
  Image as ImageIcon, Undo2, Redo2, Download, Minimize2, Edit3, 
  Moon, Sun, UserCheck, SlidersHorizontal, ChevronLeft, ChevronRight, Key, Cpu, AlertCircle, Trash2
} from 'lucide-react';

import { Uploader } from './components/Uploader';
import { ImageComparator } from './components/ImageComparator';
import { Button } from './components/Button';
import { processImage, mergeImages, generateImageFromPrompt } from './services/geminiService';
import { ImageState, MergeState, AppTab, ProcessingStatus, RestorationMode, ActionOption, HistoryItem, AppSettings, GenerateState } from './types';

const RESTORATION_OPTIONS: ActionOption[] = [
  {
    id: 'auto-all',
    label: 'Mágica Total',
    icon: Zap,
    description: 'Restaura danos, cores e nitidez automaticamente.',
    prompt: 'Full masterpiece restoration: remove noise, fix cracks/scratches, sharpen details, and apply natural colorization.'
  },
  {
    id: 'remove-bg',
    label: 'Remover Fundo',
    icon: ImageOff,
    description: 'Isola o objeto principal removendo o fundo.',
    prompt: 'Background removal: Remove the background completely, isolating the main subject.'
  },
  {
    id: 'upscale',
    label: 'Upscale (4K)',
    icon: Maximize2,
    description: 'Aumenta a resolução e remove pixelização.',
    prompt: 'Super-resolution upscale: Increase image resolution significantly, maintaining sharp details.'
  },
  {
    id: 'restore',
    label: 'Limpar Danos',
    icon: ScanLine,
    description: 'Remove riscos, rasgos e manchas físicas.',
    prompt: 'Heavy restoration: fix physical damage like tears, scratches, and stains.'
  },
  {
    id: 'colorize',
    label: 'Colorir',
    icon: Palette,
    description: 'Cores naturais para fotos P&B.',
    prompt: 'Natural colorization: add vivid and realistic colors to this monochrome photo.'
  },
  {
    id: 'enhance',
    label: 'Aprimorar',
    icon: Sparkles,
    description: 'Melhora o contraste e detalhes finos.',
    prompt: 'Image enhancement: fine-tune contrast and sharpen features.'
  }
];

const LOGO_THUMBNAIL_URL = "https://drive.google.com/thumbnail?id=1HDrJBoLQcPsSduQvx1GX5Vs9MkkIbwLA&sz=w800";

const ABOUT_CAROUSEL_IMAGES = [
  "https://drive.google.com/thumbnail?id=1HDrJBoLQcPsSduQvx1GX5Vs9MkkIbwLA&sz=w800",
  "https://drive.google.com/thumbnail?id=1qvU6V2KpAl60XSSCicKkmZI90WHNdX8Q&sz=w800",
  "https://drive.google.com/thumbnail?id=16-788ZCK7vsexkBpYYwy7LEYG1QKrsi7&sz=w800",
  "https://drive.google.com/thumbnail?id=1yKylSvOGMiF0ANi6JKntad68ewqWMCsZ&sz=w800",
  "https://drive.google.com/thumbnail?id=1f-EBhQxCNG05lufyKkoM0TKMBfV5zgpH&sz=w800",
  "https://drive.google.com/thumbnail?id=1ZxIgVQLxxnAoMYEZ8oZ3Pq7Cw50j1oeV&sz=w800",
  "https://drive.google.com/thumbnail?id=1CylddNKFy5f2GzC83mma3U6RyIZ88VCc&sz=w800",
  "https://drive.google.com/thumbnail?id=1siGvNVD186qQmut3tWTXbQloKrUaickB&sz=w800"
];

// Utility for safe LocalStorage usage
const safeStorage = {
  save: (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("Storage quota exceeded. Clearing older items.", e);
      if (key === 'restaurai_history') {
        const partial = Array.isArray(value) ? value.slice(0, 5) : [];
        try { localStorage.setItem(key, JSON.stringify(partial)); } catch (err) { localStorage.removeItem(key); }
      }
    }
  },
  load: (key: string, defaultValue: any) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('restore');
  const [imageState, setImageState] = useState<ImageState>({
    file: null, originalPreview: null, processedPreview: null, mimeType: ''
  });
  
  const [mergeState, setMergeState] = useState<MergeState>({
    imageA: null, imageB: null, mimeTypeA: '', mimeTypeB: '', results: null, resultIndex: 0
  });
  const [mergeCount, setMergeCount] = useState(1);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [activeMode, setActiveMode] = useState<RestorationMode | null>(null);
  const [imageDescription, setImageDescription] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [restorationStrength, setRestorationStrength] = useState(70);
  const [preserveFacialTraits, setPreserveFacialTraits] = useState(true);

  const [generateState, setGenerateState] = useState<GenerateState>({
    prompt: '', baseImage: null, baseMimeType: null, results: null, resultIndex: 0
  });
  const [generateCount, setGenerateCount] = useState(1);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  const [chatMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([
    { role: 'assistant', text: 'Olá! Sou seu assistente de memória. Como posso ajudar hoje?' }
  ]);

  const [settings, setSettings] = useState<AppSettings>(() => safeStorage.load('restaurai_settings', { language: 'pt', theme: 'dark', preferredModel: 'gemini-2.5-flash-image' }));
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => safeStorage.load('restaurai_history', []));

  const isLight = settings.theme === 'light';
  const cardBg = isLight ? 'bg-slate-50 shadow-lg border-slate-200' : 'bg-slate-900/80 shadow-2xl border-slate-800';
  const textMain = isLight ? 'text-slate-950 font-extralight' : 'text-white font-extralight';
  const textSub = isLight ? 'text-slate-700 font-normal' : 'text-slate-400 font-light';

  useEffect(() => {
    safeStorage.save('restaurai_settings', settings);
    if (isLight) document.body.classList.add('theme-light');
    else document.body.classList.remove('theme-light');
  }, [settings, isLight]);

  useEffect(() => {
    safeStorage.save('restaurai_history', history);
  }, [history]);

  const checkApiKeyRequirement = async () => {
    if (settings.preferredModel === 'gemini-3-pro-image-preview') {
      // @ts-ignore
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        return true; 
      }
    }
    return true;
  };

  const navigateResults = useCallback((direction: 'next' | 'prev') => {
    if (activeTab === 'merge' && mergeState.results && mergeState.results.length > 0) {
      const len = mergeState.results.length;
      const nextIdx = direction === 'next' ? (mergeState.resultIndex + 1) % len : (mergeState.resultIndex - 1 + len) % len;
      setMergeState(prev => ({ ...prev, resultIndex: nextIdx }));
      if (fullScreenImage) setFullScreenImage(mergeState.results[nextIdx]);
    } else if (activeTab === 'generate' && generateState.results && generateState.results.length > 0) {
      const len = generateState.results.length;
      const nextIdx = direction === 'next' ? (generateState.resultIndex + 1) % len : (generateState.resultIndex - 1 + len) % len;
      setGenerateState(prev => ({ ...prev, resultIndex: nextIdx }));
      if (fullScreenImage) setFullScreenImage(generateState.results[nextIdx]);
    }
  }, [activeTab, mergeState.results, mergeState.resultIndex, generateState.results, generateState.resultIndex, fullScreenImage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') navigateResults('next');
      if (e.key === 'ArrowLeft') navigateResults('prev');
      if (e.key === 'Escape') {
        setFullScreenImage(null);
        setShowSettings(false);
        setShowHistory(false);
        setShowAbout(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateResults]);

  const handleImageSelect = (file: File, base64: string, mimeType: string) => {
    setImageState({ file, originalPreview: base64, processedPreview: null, mimeType });
    setImageDescription(null);
    setStatus('idle');
    setErrorMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMergeImageSelect = (slot: 'A' | 'B', file: File, base64: string, mimeType: string) => {
    setMergeState(prev => ({
      ...prev,
      [slot === 'A' ? 'imageA' : 'imageB']: base64,
      [slot === 'A' ? 'mimeTypeA' : 'mimeTypeB']: mimeType,
      results: null,
      resultIndex: 0
    }));
    setErrorMsg(null);
  };

  const handleGenerateImageSelect = (file: File, base64: string, mimeType: string) => {
    setGenerateState(prev => ({
      ...prev,
      baseImage: base64,
      baseMimeType: mimeType,
      results: null,
      resultIndex: 0
    }));
    setErrorMsg(null);
  };

  const handleProcess = async (mode: RestorationMode, useProcessedAsBase = false) => {
    const baseImage = useProcessedAsBase ? imageState.processedPreview : imageState.originalPreview;
    if (!baseImage) return;

    await checkApiKeyRequirement();
    setStatus('processing');
    setActiveMode(mode);
    setErrorMsg(null);

    const promptBase = mode === 'custom' ? customPrompt : RESTORATION_OPTIONS.find(o => o.id === mode)?.prompt || '';
    const faceDesc = preserveFacialTraits ? "CRITICAL: Do NOT alter facial features." : "Enhance facial details.";
    const finalPrompt = `${promptBase}. Strength: ${restorationStrength}%. ${faceDesc}`;

    try {
      const result = await processImage(baseImage, imageState.mimeType, finalPrompt, settings.preferredModel);
      setImageState(prev => ({ ...prev, processedPreview: result.base64 }));
      setImageDescription(result.description || null);
      
      setHistory(prev => [{
        id: Date.now().toString(),
        original: baseImage,
        processed: result.base64,
        mode: mode === 'custom' ? 'Personalizado' : (RESTORATION_OPTIONS.find(o => o.id === mode)?.label || mode),
        timestamp: Date.now(),
        genModel: result.model,
        description: result.description
      }, ...prev].slice(0, 10));

      setStatus('success');
    } catch (err: any) {
      if (err.message?.includes("re-selecione sua chave paga")) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
      }
      setErrorMsg(err.message || "Ocorreu um erro inesperado ao analisar a imagem.");
      setStatus('error');
    }
  };

  const handleMergeAction = async () => {
    if (!mergeState.imageA || !mergeState.imageB || !customPrompt.trim()) return;
    
    await checkApiKeyRequirement();
    setStatus('processing');
    setErrorMsg(null);
    try {
      const results = await mergeImages(mergeState.imageA, mergeState.mimeTypeA, mergeState.imageB, mergeState.mimeTypeB, customPrompt, mergeCount);
      if (results && results.length > 0) {
        setMergeState(prev => ({ ...prev, results: results.map(r => r.base64), resultIndex: 0 }));
        setImageDescription(results[0].description || null);
        
        const newHistoryItems: HistoryItem[] = results.map((r, i) => ({
          id: `${Date.now()}-merge-${i}`,
          original: mergeState.imageA!,
          processed: r.base64,
          mode: 'Mesclagem',
          timestamp: Date.now(),
          genModel: r.model,
          description: r.description
        }));
        
        setHistory(prev => [...newHistoryItems, ...prev].slice(0, 10));
        setStatus('success');
      } else {
        throw new Error("Nenhum resultado retornado da mesclagem.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao mesclar as imagens.");
      setStatus('error');
    }
  };

  const handleGenerate = async (isRefining = false) => {
    const currentPrompt = isRefining ? customPrompt : generateState.prompt;
    if (!currentPrompt.trim()) return;

    await checkApiKeyRequirement();
    setStatus('processing');
    setErrorMsg(null);

    const baseImg = isRefining && generateState.results ? { data: generateState.results[generateState.resultIndex], mimeType: 'image/png' } : (generateState.baseImage ? { data: generateState.baseImage, mimeType: generateState.baseMimeType! } : undefined);

    try {
      const results = await generateImageFromPrompt(currentPrompt, isRefining ? 1 : generateCount, aspectRatio, baseImg);
      if (results && results.length > 0) {
        if (isRefining && generateState.results) {
          const newResults = [...generateState.results];
          newResults[generateState.resultIndex] = results[0].base64;
          setGenerateState(prev => ({ ...prev, results: newResults }));
        } else {
          setGenerateState(prev => ({ ...prev, results: results.map(r => r.base64), resultIndex: 0 }));
        }
        
        setImageDescription(results[0].description || null);
        
        const newHistoryItems: HistoryItem[] = results.map((r, i) => ({
          id: `${Date.now()}-gen-${i}`,
          original: generateState.baseImage || r.base64,
          processed: r.base64,
          mode: 'Geração',
          timestamp: Date.now(),
          genModel: r.model,
          description: r.description
        }));
        
        setHistory(prev => [...newHistoryItems, ...prev].slice(0, 10));
        setStatus('success');
      } else {
        throw new Error("Nenhum resultado retornado da geração.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao gerar as imagens.");
      setStatus('error');
    }
  };

  const handleFullReset = () => {
    setImageState({ file: null, originalPreview: null, processedPreview: null, mimeType: '' });
    setMergeState({ imageA: null, imageB: null, mimeTypeA: '', mimeTypeB: '', results: null, resultIndex: 0 });
    setGenerateState({ prompt: '', baseImage: null, baseMimeType: null, results: null, resultIndex: 0 });
    setStatus('idle');
    setCustomPrompt('');
    setErrorMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDownloadImage = (img: string | null) => {
    if (!img) return;
    const link = document.createElement('a');
    link.href = img;
    link.download = `restaurailma-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-300 text-slate-950' : 'bg-slate-950 text-white'} transition-colors duration-300 pb-24 md:pb-20`}>
      <header className={`border-b ${isLight ? 'border-slate-200 bg-slate-50/95' : 'border-slate-800 bg-slate-900/50'} backdrop-blur-md sticky top-0 z-50 h-16 md:h-20 shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <button className="flex items-center gap-2 md:gap-5 cursor-pointer group outline-none relative" onClick={handleFullReset}>
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-16 bg-yellow-500/10 blur-[40px] rounded-full opacity-40 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            <div className="relative w-9 h-9 md:w-11 md:h-11 overflow-hidden rounded-2xl border border-white/20 bg-slate-800 flex items-center justify-center z-10 shadow-[0_0_15px_rgba(234,179,8,0.2)] transition-all group-hover:shadow-[0_0_30px_rgba(234,179,8,0.5)] group-hover:scale-105">
              <img src={LOGO_THUMBNAIL_URL} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className="relative text-[16px] xs:text-lg sm:text-xl md:text-2xl lg:text-3xl tracking-[0.25em] transition-all duration-300 flex items-center uppercase whitespace-nowrap z-10 select-none">
               <span className={`transition-all duration-500 ${isLight ? 'text-slate-950 group-hover:text-indigo-700' : 'text-white group-hover:text-indigo-400'}`}>RESTAUR</span>
               <span className="text-indigo-600 font-bold transition-all duration-500">A</span>
               <span className={`font-bold transition-all duration-500 text-indigo-600 group-hover:text-yellow-500`}>I</span>
               <span className={`transition-all duration-500 ${isLight ? 'text-slate-950 group-hover:text-yellow-600' : 'text-white group-hover:text-yellow-400'}`}>LMA</span>
            </div>
          </button>
          <nav className="hidden md:flex items-center bg-slate-800/20 p-1 rounded-2xl border border-slate-400/30 backdrop-blur-sm">
             <button onClick={() => setActiveTab('restore')} className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all text-xs uppercase font-bold ${activeTab === 'restore' ? 'bg-indigo-600 text-white shadow-md' : isLight ? 'text-slate-700 hover:text-slate-950' : 'text-slate-400 hover:text-white'}`}><RefreshCw className="w-3 h-3" /> Restaurar</button>
             <button onClick={() => setActiveTab('merge')} className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all text-xs uppercase font-bold ${activeTab === 'merge' ? 'bg-indigo-600 text-white shadow-md' : isLight ? 'text-slate-700 hover:text-slate-950' : 'text-slate-400 hover:text-white'}`}><Layers className="w-3 h-3" /> Mesclar</button>
             <button onClick={() => setActiveTab('generate')} className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all text-xs uppercase font-bold ${activeTab === 'generate' ? 'bg-indigo-600 text-white shadow-md' : isLight ? 'text-slate-700 hover:text-slate-950' : 'text-slate-400 hover:text-white'}`}><ImageIcon className="w-3 h-3" /> Gerar</button>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAbout(true)} className="p-2 text-indigo-600 hover:text-indigo-700 transition-colors" title="Sobre"><Info className="w-5 h-5" /></button>
            <button onClick={() => setShowHistory(true)} className="p-2 text-indigo-600 hover:text-indigo-700 transition-colors" title="Histórico"><History className="w-5 h-5" /></button>
            <button onClick={() => setShowSettings(true)} className="p-2 text-indigo-600 hover:text-indigo-700 transition-colors" title="Configurações"><Settings className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-bold flex items-center gap-3 animate-in slide-in-from-top duration-300">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="flex-1">{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-red-500/20 rounded-md transition-colors"><X className="w-4 h-4" /></button>
          </div>
        )}

        {activeTab === 'restore' && (
          !imageState.originalPreview ? (
            <div className="grid md:grid-cols-2 gap-12 items-center min-h-[60vh] py-10">
              <div className="space-y-6">
                <h1 className={`text-4xl lg:text-6xl uppercase ${textMain} leading-tight`}>Dê vida nova às suas <span className="text-yellow-500 font-normal">fotos</span>.</h1>
                <p className={`${textSub} text-sm max-w-sm tracking-soft`}>Restauração inteligente para preservar memórias preciosas com perfeição total.</p>
                <Uploader onImageSelect={handleImageSelect} />
              </div>
              <ChatAssistant messages={chatMessages} isLight={isLight} cardBg={cardBg} textMain={textMain} />
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2 space-y-6">
                <div className={`${cardBg} rounded-3xl border p-2 min-h-[400px] flex items-center justify-center relative overflow-hidden transition-all`}>
                  {status === 'processing' && <LoaderOverlay />}
                  {imageState.processedPreview ? (
                    <ImageComparator 
                      original={imageState.originalPreview} 
                      processed={imageState.processedPreview} 
                      onDownload={() => handleDownloadImage(imageState.processedPreview)} 
                    />
                  ) : (
                    <img src={imageState.originalPreview} className="max-h-[70vh] rounded-xl shadow-xl" alt="Preview" />
                  )}
                </div>
              </div>
              <div className="space-y-6">
                <div className={`${cardBg} rounded-3xl border p-6 shadow-xl`}>
                  <h2 className={`text-sm flex items-center gap-2 mb-6 uppercase tracking-elegant font-bold ${textMain}`}><Wand2 className="w-4 h-4 text-indigo-600" /> Ações Disponíveis</h2>
                  <div className="grid gap-3">
                    {RESTORATION_OPTIONS.map(opt => (
                      <ActionCard 
                        key={opt.id} 
                        option={opt} 
                        active={activeMode === opt.id} 
                        onClick={() => handleProcess(opt.id, !!imageState.processedPreview)} 
                        isLight={isLight} 
                      />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <Button onClick={handleFullReset} variant="ghost" className={`w-full h-14 uppercase tracking-elegant text-xs border ${isLight ? 'border-slate-300 text-slate-900' : 'border-slate-700/30 text-white'}`} icon={RotateCcw}>Limpar e Recomeçar</Button>
                </div>
              </div>
            </div>
          )
        )}

        {(activeTab === 'merge' || activeTab === 'generate') && (
          <div className="grid md:grid-cols-2 gap-12 py-10">
            {activeTab === 'merge' ? (
               !mergeState.results ? (
                <div className="space-y-8">
                  <h1 className={`text-4xl lg:text-6xl uppercase ${textMain} leading-tight`}>Mescle <span className="text-yellow-500 font-normal">pessoas</span> e cenas.</h1>
                  <p className={`${textSub} text-sm max-w-sm tracking-soft`}>Combine o melhor de duas fotos em uma imagem unificada e realista.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <UploaderCompact label="Foto A" current={mergeState.imageA} onSelect={(f:any, b:any, m:any) => handleMergeImageSelect('A', f, b, m)} isLight={isLight} />
                    <UploaderCompact label="Foto B" current={mergeState.imageB} onSelect={(f:any, b:any, m:any) => handleMergeImageSelect('B', f, b, m)} isLight={isLight} />
                  </div>
                  <div className={`${cardBg} p-6 rounded-3xl border shadow-xl`}>
                    <div className="flex justify-between items-center mb-4">
                      <p className={`text-[10px] uppercase font-bold tracking-elegant ${textSub}`}>Variações</p>
                      <QuantitySelector count={mergeCount} onSelect={setMergeCount} options={[1, 2, 4]} />
                    </div>
                    <textarea className={`w-full ${isLight ? 'bg-white text-slate-900 border-slate-200' : 'bg-slate-950 text-white border-slate-800'} rounded-xl p-4 text-sm h-32 outline-none border transition-all focus:border-indigo-600 placeholder:text-slate-500 font-medium`} placeholder="Descreva a cena final..." value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} />
                    <Button onClick={handleMergeAction} disabled={status === 'processing' || !mergeState.imageA || !mergeState.imageB || !customPrompt.trim()} className="w-full mt-4 h-14 uppercase tracking-elegant font-bold" isLoading={status === 'processing'} icon={Layers}>Gerar Mesclagem</Button>
                  </div>
                </div>
               ) : (
                <ResultsGallery results={mergeState.results} index={mergeState.resultIndex} onSelect={(idx:any) => setMergeState(p => ({...p, resultIndex: idx}))} onFullScreen={setFullScreenImage} navigate={navigateResults} cardBg={cardBg} status={status} onReset={() => setMergeState(p => ({...p, results: null}))} onDownload={() => handleDownloadImage(mergeState.results ? mergeState.results[mergeState.resultIndex] : null)} />
               )
            ) : (
              !generateState.results ? (
                <div className="space-y-8">
                  <h1 className={`text-4xl lg:text-6xl uppercase ${textMain} leading-tight`}>Crie novas <span className="text-yellow-500 font-normal">realidades</span>.</h1>
                  <p className={`${textSub} text-sm max-w-sm tracking-soft`}>Transforme texto em arte visual detalhada com o poder da IA generativa.</p>
                  <div className="flex items-center gap-4">
                     <div className="w-32 h-32 flex-shrink-0">
                       <UploaderCompact label="Base (Opcional)" current={generateState.baseImage} onSelect={handleGenerateImageSelect} isLight={isLight} />
                     </div>
                     <div className="flex-1">
                        <p className={`text-[10px] uppercase font-bold tracking-elegant mb-2 ${textSub}`}>Referência Visual</p>
                        <p className={`text-[9px] leading-relaxed ${textSub} opacity-80`}>Use uma imagem como guia ou deixe o campo vazio para criar do zero.</p>
                     </div>
                  </div>
                  <div className={`${cardBg} p-6 rounded-3xl border shadow-xl`}>
                    <div className="flex justify-between items-center mb-6">
                      <p className={`text-[10px] uppercase font-bold tracking-elegant ${textSub}`}>Variações</p>
                      <QuantitySelector count={generateCount} onSelect={setGenerateCount} options={[1, 2, 4]} />
                    </div>
                    <textarea className={`w-full ${isLight ? 'bg-white text-slate-900 border-slate-200' : 'bg-slate-950 text-white border-slate-800'} rounded-xl p-4 text-sm h-40 outline-none border transition-all focus:border-indigo-600 placeholder:text-slate-500 font-medium`} placeholder="Descreva o que você imagina..." value={generateState.prompt} onChange={e => setGenerateState(p => ({...p, prompt: e.target.value}))} />
                    <Button onClick={() => handleGenerate()} disabled={status === 'processing' || !generateState.prompt.trim()} className="w-full mt-4 h-14 uppercase tracking-elegant font-bold" isLoading={status === 'processing'} icon={Sparkles}>Criar Imagens</Button>
                  </div>
                </div>
              ) : (
                <ResultsGallery results={generateState.results} index={generateState.resultIndex} onSelect={(idx:any) => setGenerateState(p => ({...p, resultIndex: idx}))} onFullScreen={setFullScreenImage} navigate={navigateResults} cardBg={cardBg} status={status} onReset={() => setGenerateState(p => ({...p, results: null}))} onDownload={() => handleDownloadImage(generateState.results ? generateState.results[generateState.resultIndex] : null)} />
              )
            )}
            <ChatAssistant messages={chatMessages} isLight={isLight} cardBg={cardBg} textMain={textMain} />
          </div>
        )}
      </main>

      {fullScreenImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setFullScreenImage(null)}>
          <button className="absolute top-6 right-6 p-3 text-white/50 hover:text-white transition-colors" onClick={() => setFullScreenImage(null)}><Minimize2 className="w-8 h-8" /></button>
          <div className="relative w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={(e) => { e.stopPropagation(); navigateResults('prev'); }} className="absolute left-4 p-4 bg-white/10 hover:bg-yellow-400 hover:text-slate-900 rounded-full transition-all shadow-xl"><ChevronLeft className="w-10 h-10" /></button>
            <button onClick={(e) => { e.stopPropagation(); navigateResults('next'); }} className="absolute right-4 p-4 bg-white/10 hover:bg-yellow-400 hover:text-slate-900 rounded-full transition-all shadow-xl"><ChevronRight className="w-10 h-10" /></button>
            <img src={fullScreenImage} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" alt="Fullscreen" />
          </div>
        </div>
      )}

      <Modal isOpen={showAbout} onClose={() => setShowAbout(false)} title="Sobre RestaurAIlma" isLight={isLight}>
        <div className="space-y-8 text-center">
          <div className="relative w-full aspect-square rounded-[2rem] overflow-hidden shadow-2xl border border-indigo-600/20">
             <AboutCarousel images={ABOUT_CAROUSEL_IMAGES} />
             <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          </div>
          <div className={`space-y-6 ${isLight ? 'text-slate-950' : 'text-slate-100'}`}>
            <p className="text-sm italic font-light leading-relaxed tracking-soft">"Para conservar a história de quem nos trouxe atá aqui."</p>
            <div className="flex flex-col items-center gap-1">
               <div className="h-[1px] w-12 bg-indigo-600/30 mb-2"></div>
               <span className="text-xs font-bold uppercase tracking-elegant flex items-center gap-2">Para Ilma <Heart className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" /></span>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title="Histórico de Criações" isLight={isLight}>
        {history.length === 0 ? (
          <div className="text-center py-12 opacity-40"><Clock className="w-12 h-12 mx-auto mb-4" /><p className="text-xs uppercase tracking-elegant">Nada por aqui ainda.</p></div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
            {history.map((item) => (
              <div key={item.id} className={`flex gap-4 p-3 ${isLight ? 'bg-white' : 'bg-slate-800/40'} rounded-2xl border ${isLight ? 'border-slate-200' : 'border-slate-700/50'} group`}>
                <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-xl"><img src={item.processed} className="w-full h-full object-cover" alt="History" /></div>
                <div className="flex-1 flex flex-col justify-between py-1 overflow-hidden">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-indigo-600 mb-1 flex items-center justify-between">{item.mode} <span className="text-[8px] opacity-40">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
                    <div className={`text-[9px] line-clamp-2 italic truncate ${isLight ? 'text-slate-950 font-bold' : 'text-slate-300'}`}>{item.description || 'Sem descrição.'}</div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[8px] opacity-40">{new Date(item.timestamp).toLocaleDateString()}</span>
                    <div className="flex gap-2">
                      <button onClick={() => handleDownloadImage(item.processed)} className="p-1.5 hover:bg-indigo-600 rounded-lg transition-colors text-slate-400 hover:text-white"><Download className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setHistory(h => h.filter(x => x.id !== item.id))} className="p-1.5 hover:bg-red-600 rounded-lg transition-colors text-slate-400 hover:text-white"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Configurações" isLight={isLight}>
        <div className="space-y-8">
          <section>
            <h3 className="text-[10px] uppercase tracking-elegant font-bold text-indigo-600 mb-4">Aparência</h3>
            <div className="flex bg-slate-800/10 p-1 rounded-xl border border-slate-400/20">
              <button onClick={() => setSettings(s => ({...s, theme: 'dark'}))} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs transition-all font-bold ${!isLight ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}><Moon className="w-3 h-3" /> Dark</button>
              <button onClick={() => setSettings(s => ({...s, theme: 'light'}))} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs transition-all font-bold ${isLight ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}><Sun className="w-3 h-3" /> Light</button>
            </div>
          </section>
          <section>
            <div className="flex items-center justify-between mb-4"><h3 className="text-[10px] uppercase tracking-elegant font-bold text-indigo-600">Motor de IA</h3></div>
            <div className="grid gap-2">
              {[
                { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash', desc: 'Rápido e gratuito' },
                { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro', desc: 'Máxima qualidade (requer chave paga)' }
              ].map(m => (
                <button key={m.id} onClick={() => setSettings(s => ({...s, preferredModel: m.id}))} className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${settings.preferredModel === m.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800/5 border-slate-400/20 text-slate-600 hover:border-indigo-400'}`}>
                  <div className="overflow-hidden"><div className="text-[11px] uppercase font-bold truncate">{m.name}</div><div className="text-[9px] opacity-60 truncate font-medium">{m.desc}</div></div>
                  {settings.preferredModel === m.id && <UserCheck className="w-4 h-4 shrink-0 ml-3" />}
                </button>
              ))}
            </div>
          </section>
        </div>
      </Modal>
    </div>
  );
}

function AboutCarousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => { setIndex(prev => (prev + 1) % images.length); }, 4000);
    return () => clearInterval(timer);
  }, [images.length]);
  return (
    <div className="w-full h-full relative group">
      {images.map((img, i) => (
        <img key={i} src={img} className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${index === i ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`} alt="Exemplo" />
      ))}
      <div className="absolute bottom-4 right-4 flex gap-1.5 z-20">
        {images.map((_, i) => ( <div key={i} className={`h-1 rounded-full transition-all duration-300 ${index === i ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} /> ))}
      </div>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children, isLight }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" onClick={onClose} />
      <div className={`relative w-full max-w-md ${isLight ? 'bg-slate-50 text-slate-950' : 'bg-slate-900 text-white'} rounded-[2.5rem] border ${isLight ? 'border-slate-200 shadow-2xl' : 'border-slate-800'} overflow-hidden`}>
        <div className={`p-6 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'} flex items-center justify-between`}>
          <h2 className="text-xs uppercase font-bold tracking-elegant">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ResultsGallery({ results, index, onSelect, onFullScreen, navigate, cardBg, status, onReset, onDownload }: any) {
  if (!results || results.length === 0) return null;
  return (
    <div className={`${cardBg} rounded-3xl border p-4 relative overflow-hidden flex flex-col items-center justify-center min-h-[500px] shadow-2xl transition-all`}>
      {status === 'processing' && <LoaderOverlay />}
      <div className="w-full mb-4 flex justify-between items-center px-2">
        <p className="text-[10px] uppercase font-bold tracking-elegant text-indigo-600">Resultados</p>
        <div className="flex gap-4">
          <button onClick={onDownload} className="text-[10px] uppercase font-bold hover:text-indigo-600 transition-colors flex items-center gap-1"><Download className="w-3 h-3" /> Baixar</button>
          <button onClick={onReset} className="text-[10px] uppercase font-bold hover:text-indigo-600 transition-colors">Voltar</button>
        </div>
      </div>
      <div className="relative w-full flex items-center justify-center">
        {results.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); navigate('prev'); }} className="absolute -left-2 z-10 p-2 bg-black/40 hover:bg-yellow-400 hover:text-slate-900 rounded-full transition-colors shadow-lg"><ChevronLeft /></button>
            <button onClick={(e) => { e.stopPropagation(); navigate('next'); }} className="absolute -right-2 z-10 p-2 bg-black/40 hover:bg-yellow-400 hover:text-slate-900 rounded-full transition-colors shadow-lg"><ChevronRight /></button>
          </>
        )}
        <div className={`grid gap-4 w-full ${results.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {results.map((res: string, idx: number) => (
            <div key={idx} onClick={() => onSelect(idx)} className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${index === idx ? 'border-indigo-600 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}>
              <img src={res} className="w-full aspect-square object-cover" alt={`Variação ${idx + 1}`} />
              <button onClick={(e) => { e.stopPropagation(); onFullScreen(res); }} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg hover:bg-yellow-400 hover:text-slate-900 transition-colors opacity-0 group-hover:opacity-100"><Maximize2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuantitySelector({ count, onSelect, options }: any) {
  return (
    <div className="flex bg-slate-950/10 p-1 rounded-lg border border-slate-400/20 backdrop-blur-md">
      {options.map((n: number) => ( <button key={n} onClick={() => onSelect(n)} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${count === n ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>{n}x</button> ))}
    </div>
  );
}

function LoaderOverlay() {
  return (
    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
      <div className="w-16 h-16 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
      <p className="text-xl font-bold uppercase tracking-elegant text-white animate-pulse">Tecendo sua Memória...</p>
    </div>
  );
}

function ChatAssistant({ messages, cardBg, isLight }: any) {
  return (
    <div className={`${cardBg} rounded-[2.5rem] border h-[500px] flex flex-col overflow-hidden shadow-xl`}>
      <div className={`p-4 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'} flex items-center justify-between bg-black/5`}>
        <span className={`text-[10px] font-bold uppercase tracking-elegant opacity-60 ${isLight ? 'text-slate-950' : 'text-white'}`}>Assistente Virtual</span>
        <MessageSquare className="w-4 h-4 text-indigo-600" />
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
        {messages.map((msg: any, i: number) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed shadow-sm font-bold ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : isLight ? 'bg-white text-slate-950 border border-slate-200 rounded-tl-none' : 'bg-slate-800 text-slate-100 rounded-tl-none font-light'}`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UploaderCompact({ label, current, onSelect, isLight }: any) {
  return (
    <label className={`aspect-square rounded-2xl border-2 border-dashed ${isLight ? 'border-slate-300 bg-white/50' : 'border-slate-700 bg-slate-900/50'} flex flex-col items-center justify-center cursor-pointer transition-all hover:border-indigo-600 group relative overflow-hidden h-full w-full`}>
      {current ? ( <img src={current} className="w-full h-full object-cover rounded-xl transition-transform group-hover:scale-105" alt="Preview" /> ) : (
        <div className="flex flex-col items-center p-2 text-center">
          <ImageIcon className="w-5 h-5 text-indigo-600 mb-1" />
          <span className={`text-[9px] font-bold uppercase tracking-soft ${isLight ? 'text-slate-900' : 'text-slate-500'}`}>{label}</span>
        </div>
      )}
      <input type="file" className="hidden" onChange={(e:any) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onloadend = () => onSelect(f, r.result as string, f.type); r.readAsDataURL(f); } }} />
    </label>
  );
}

function ActionCard({ option, active, onClick, isLight }: any) {
  return (
    <button onClick={onClick} className={`flex items-center p-4 rounded-2xl border text-left transition-all group w-full ${active ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : isLight ? 'bg-white border-slate-300 text-slate-950 hover:border-indigo-600 shadow-sm' : 'bg-slate-800/50 border-slate-700 text-white hover:border-indigo-400'}`}>
      <div className={`p-2 rounded-xl mr-4 transition-all ${active ? 'bg-white/20' : 'bg-indigo-600/10 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
        <option.icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <div className="text-xs uppercase font-bold tracking-soft">{option.label}</div>
        <div className={`text-[9px] opacity-70 line-clamp-1 mt-0.5 ${isLight ? 'font-bold' : 'font-light'}`}>{option.description}</div>
      </div>
    </button>
  );
}

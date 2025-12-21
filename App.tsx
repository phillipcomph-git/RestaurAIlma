
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Wand2, Palette, ScanLine, Sparkles, RotateCcw,
  Settings, History, X, Clock, Zap, MessageSquare, RefreshCw, 
  Maximize2, Camera, ImageOff, Heart, Info, Send, Layers, 
  Image as ImageIcon, Undo2, Redo2, Download, Minimize2, Edit3, 
  Moon, Sun, UserCheck, SlidersHorizontal, ChevronLeft, ChevronRight, Key, Cpu, AlertCircle, Trash2,
  ArrowRight, ExternalLink
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
    description: 'Restaura tudo automaticamente.',
    prompt: 'Full masterpiece restoration: remove noise, fix cracks, sharpen details, and apply natural colorization.'
  },
  {
    id: 'restore',
    label: 'Limpar Danos',
    icon: ScanLine,
    description: 'Remove riscos e rasgos físicos.',
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
    description: 'Melhora contraste e nitidez.',
    prompt: 'Image enhancement: fine-tune contrast and sharpen features.'
  },
  {
    id: 'upscale',
    label: 'Upscale (4K)',
    icon: Maximize2,
    description: 'Aumenta a resolução drasticamente.',
    prompt: 'Super-resolution upscale: Increase image resolution significantly, maintaining sharp details.'
  },
  {
    id: 'remove-bg',
    label: 'Remover Fundo',
    icon: ImageOff,
    description: 'Isola o objeto principal.',
    prompt: 'Background removal: Remove the background completely, isolating the main subject.'
  }
];

const LOGO_THUMBNAIL_URL = "https://drive.google.com/thumbnail?id=1FyVZ-9tvJCQ2-txXy2yZSbxWkATDwZsK&sz=w800";

const ABOUT_CAROUSEL_IMAGES = [
  "https://drive.google.com/thumbnail?id=1FyVZ-9tvJCQ2-txXy2yZSbxWkATDwZsK&sz=w800",
  "https://drive.google.com/thumbnail?id=1qvU6V2KpAl60XSSCicKkmZI90WHNdX8Q&sz=w800",
  "https://drive.google.com/thumbnail?id=16-788ZCK7vsexkBpYYwy7LEYG1QKrsi7&sz=w800",
  "https://drive.google.com/thumbnail?id=1y8mt4eiQquA-LQ9dohIl3Uvp_g3xDgKK&sz=w800",
  "https://drive.google.com/thumbnail?id=1ZxIgVQLxxnAoMYEZ8oZ3Pq7Cw50j1oeV&sz=w800",
  "https://drive.google.com/thumbnail?id=1yKylSvOGMiF0ANi6JKntad68ewqWMCsZ&sz=w800",
  "https://drive.google.com/thumbnail?id=1CylddNKFy5f2GzC83mma3U6RyIZ88VCc&sz=w800"
];

const safeStorage = {
  save: (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      if (key === 'restaurai_history') {
        const partial = Array.isArray(value) ? value.slice(0, 3) : [];
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
  const [isKeyMissing, setIsKeyMissing] = useState(false);
  const [imageState, setImageState] = useState<ImageState>({
    file: null, originalPreview: null, processedPreview: null, mimeType: '', history: [], future: []
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
    { role: 'assistant', text: 'Oi! Sou seu assistente. Posso ajudar a guiar sua restauração.' }
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

  const utilityIconColor = isLight ? 'text-indigo-600 hover:text-indigo-700' : 'text-yellow-400 hover:text-yellow-300';

  useEffect(() => {
    // Verifica se a chave de API está configurada no ambiente ou selecionada via ponte
    const checkKey = async () => {
      const envKey = process.env.API_KEY;
      const hasBridgeKey = typeof window !== 'undefined' && (window as any).aistudio && await (window as any).aistudio.hasSelectedApiKey();
      setIsKeyMissing(!envKey && !hasBridgeKey);
    };
    checkKey();
  }, []);

  useEffect(() => {
    safeStorage.save('restaurai_settings', settings);
    if (isLight) document.body.classList.add('theme-light');
    else document.body.classList.remove('theme-light');
  }, [settings, isLight]);

  useEffect(() => {
    safeStorage.save('restaurai_history', history);
  }, [history]);

  const handleOpenKeySelector = async () => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setIsKeyMissing(false);
      setErrorMsg(null);
    }
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
    setImageState({ file, originalPreview: base64, processedPreview: null, mimeType, history: [], future: [] });
    setImageDescription(null);
    setStatus('idle');
    setErrorMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMergeAction = async () => {
    if (!mergeState.imageA || !mergeState.imageB || !customPrompt.trim()) return;
    setStatus('processing');
    setErrorMsg(null);
    try {
      const results = await mergeImages(mergeState.imageA, mergeState.mimeTypeA, mergeState.imageB, mergeState.mimeTypeB, customPrompt, mergeCount);
      if (results && results.length > 0) {
        setMergeState(prev => ({ ...prev, results: results.map(r => r.base64), resultIndex: 0 }));
        setImageDescription(results[0].description || null);
        setStatus('success');
      }
    } catch (err: any) {
      setStatus('error');
      if (err.message === "API Key") {
        setErrorMsg("API Key ausente. Selecione uma chave para continuar no Vercel.");
        handleOpenKeySelector();
      } else {
        setErrorMsg(err.message || "Erro ao mesclar imagens.");
      }
    }
  };

  const handleGenerate = async (isRefining = false) => {
    const currentPrompt = isRefining ? customPrompt : generateState.prompt;
    if (!currentPrompt.trim()) return;
    setStatus('processing');
    setErrorMsg(null);
    try {
      const baseImg = isRefining && generateState.results ? { data: generateState.results[generateState.resultIndex], mimeType: 'image/png' } : (generateState.baseImage ? { data: generateState.baseImage, mimeType: generateState.baseMimeType! } : undefined);
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
        setStatus('success');
      }
    } catch (err: any) {
      setStatus('error');
      if (err.message === "API Key") {
        setErrorMsg("API Key ausente. Selecione uma chave para continuar no Vercel.");
        handleOpenKeySelector();
      } else {
        setErrorMsg(err.message || "Erro ao gerar arte.");
      }
    }
  };

  const handleMergeImageSelect = (side: 'A' | 'B', file: File, base64: string, mimeType: string) => {
    if (side === 'A') {
      setMergeState(prev => ({ ...prev, imageA: base64, mimeTypeA: mimeType }));
    } else {
      setMergeState(prev => ({ ...prev, imageB: base64, mimeTypeB: mimeType }));
    }
    setErrorMsg(null);
  };

  const handleGenerateImageSelect = (file: File, base64: string, mimeType: string) => {
    setGenerateState(prev => ({ ...prev, baseImage: base64, baseMimeType: mimeType }));
    setErrorMsg(null);
  };

  const handleProcess = async (mode: RestorationMode) => {
    if (!imageState.originalPreview) return;
    setStatus('processing');
    setActiveMode(mode);
    setErrorMsg(null);
    try {
      const toolPrompt = RESTORATION_OPTIONS.find(o => o.id === mode)?.prompt || '';
      const userContext = customPrompt.trim() ? `ADDITIONAL USER INSTRUCTION: ${customPrompt}. ` : '';
      const faceDesc = preserveFacialTraits ? "CRITICAL: Do NOT alter facial features." : "Enhance facial details.";
      const finalPrompt = `${userContext}${toolPrompt}. Strength: ${restorationStrength}%. ${faceDesc}`;
      const result = await processImage(imageState.originalPreview, imageState.mimeType, finalPrompt, settings.preferredModel);
      setImageState(prev => ({ 
        ...prev, 
        processedPreview: result.base64,
        history: [...prev.history, prev.originalPreview!],
        future: [] 
      }));
      setImageDescription(result.description || null);
      setHistory(prev => [{
        id: Date.now().toString(),
        original: imageState.originalPreview!,
        processed: result.base64,
        mode: mode === 'custom' ? 'Manual' : (RESTORATION_OPTIONS.find(o => o.id === mode)?.label || mode),
        timestamp: Date.now(),
        genModel: result.model,
        description: result.description
      }, ...prev].slice(0, 8));
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      if (err.message === "API Key") {
        setErrorMsg("A chave de API não foi detectada no Vercel. Selecione uma chave para continuar.");
        handleOpenKeySelector();
      } else {
        setErrorMsg(err.message || "Ocorreu um erro inesperado.");
      }
    }
  };

  const handleContinueEditing = () => {
    if (!imageState.processedPreview) return;
    setImageState(prev => ({
      ...prev,
      originalPreview: prev.processedPreview,
      processedPreview: null,
      history: [...prev.history, prev.originalPreview!],
      future: []
    }));
    setImageDescription(null);
    setStatus('idle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUndo = () => {
    if (imageState.history.length === 0) return;
    const previousState = imageState.history[imageState.history.length - 1];
    setImageState(prev => ({
      ...prev,
      originalPreview: previousState,
      processedPreview: null,
      future: [prev.originalPreview!, ...prev.future],
      history: prev.history.slice(0, -1)
    }));
    setImageDescription(null);
    setStatus('idle');
  };

  const handleRedo = () => {
    if (imageState.future.length === 0) return;
    const nextState = imageState.future[0];
    setImageState(prev => ({
      ...prev,
      originalPreview: nextState,
      processedPreview: null,
      history: [...prev.history, prev.originalPreview!],
      future: prev.future.slice(1)
    }));
    setImageDescription(null);
    setStatus('idle');
  };

  const handleFullReset = () => {
    setImageState({ file: null, originalPreview: null, processedPreview: null, mimeType: '', history: [], future: [] });
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
    link.download = `restaurai-${Date.now()}.png`;
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
            <div className="relative text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl tracking-[0.25em] transition-all duration-300 flex items-center uppercase whitespace-nowrap z-10 select-none group-hover:scale-[1.02]">
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
            {isKeyMissing && (
              <button 
                onClick={handleOpenKeySelector} 
                className="p-2 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-full border border-yellow-500/30 animate-pulse text-yellow-500 transition-colors"
                title="Configurar Chave API"
              >
                <Key className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => setShowAbout(true)} className={`p-2 transition-colors ${utilityIconColor}`} title="Sobre"><Info className="w-5 h-5" /></button>
            <button onClick={() => setShowHistory(true)} className={`p-2 transition-colors ${utilityIconColor}`} title="Histórico"><History className="w-5 h-5" /></button>
            <button onClick={() => setShowSettings(true)} className={`p-2 transition-colors ${utilityIconColor}`} title="Configurações"><Settings className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-bold flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="flex-1">
              <p>{errorMsg}</p>
              {isKeyMissing && (
                <button onClick={handleOpenKeySelector} className="mt-2 text-indigo-600 underline hover:text-indigo-500">Configurar chave agora</button>
              )}
            </div>
            <button onClick={() => setErrorMsg(null)} className="p-1 hover:bg-red-500/20 rounded-md"><X className="w-4 h-4" /></button>
          </div>
        )}

        {activeTab === 'restore' && (
          !imageState.originalPreview ? (
            <div className="grid md:grid-cols-2 gap-12 items-center min-h-[60vh] py-10">
              <div className="space-y-6">
                <h1 className={`text-4xl lg:text-6xl uppercase ${textMain} leading-tight`}>Dê vida nova às suas <span className="text-yellow-500 font-normal">fotos</span>.</h1>
                <p className={`${textSub} text-sm max-w-sm tracking-soft`}>Restauração inteligente preservando memórias preciosas com perfeição.</p>
                <Uploader onImageSelect={handleImageSelect} />
              </div>
              <ChatAssistant messages={chatMessages} isLight={isLight} cardBg={cardBg} textMain={textMain} />
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2 space-y-6">
                <div className={`${cardBg} rounded-3xl border p-2 min-h-[400px] flex items-center justify-center relative overflow-hidden transition-all shadow-2xl`}>
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

                {/* Ações após processamento */}
                {imageState.processedPreview && (
                   <div className="flex gap-4 items-center justify-center animate-in fade-in slide-in-from-top-4 duration-300">
                      <Button onClick={handleContinueEditing} className="h-12 px-8 uppercase text-xs tracking-elegant bg-yellow-500 hover:bg-yellow-400 text-slate-900 border-none" icon={ArrowRight}>Editar sobre este resultado</Button>
                      <Button onClick={() => handleDownloadImage(imageState.processedPreview)} variant="secondary" className="h-12 px-8 uppercase text-xs tracking-elegant" icon={Download}>Baixar Agora</Button>
                   </div>
                )}
              </div>
              
              <div className="space-y-6">
                {/* Painel de Contexto com Botão Integrado */}
                <div className={`${cardBg} rounded-3xl border p-5 shadow-xl`}>
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-elegant text-indigo-600">
                         <MessageSquare className="w-3.5 h-3.5" /> Contexto Personalizado
                      </div>
                      <div className="flex bg-slate-800/50 p-0.5 rounded-lg border border-slate-700">
                        <button onClick={handleUndo} disabled={imageState.history.length === 0} className="p-1.5 hover:bg-slate-700 rounded-md text-yellow-400 disabled:opacity-20 transition-all" title="Desfazer"><Undo2 className="w-3.5 h-3.5" /></button>
                        <button onClick={handleRedo} disabled={imageState.future.length === 0} className="p-1.5 hover:bg-slate-700 rounded-md text-yellow-400 disabled:opacity-20 transition-all" title="Refazer"><Redo2 className="w-3.5 h-3.5" /></button>
                      </div>
                   </div>
                   
                   <div className="relative group">
                     <textarea 
                       className={`w-full ${isLight ? 'bg-slate-50 text-slate-950 border-slate-200' : 'bg-slate-950 text-white border-slate-800'} rounded-2xl p-4 pr-12 text-xs h-24 outline-none border transition-all focus:border-indigo-600 placeholder:text-slate-500 font-medium no-scrollbar`} 
                       placeholder="Ex: 'Mantenha as roupas verdes' ou 'Não remova a cicatriz'..." 
                       value={customPrompt} 
                       onChange={e => setCustomPrompt(e.target.value)} 
                     />
                     <button 
                       onClick={() => handleProcess('custom')}
                       disabled={!customPrompt.trim() || status === 'processing'}
                       className="absolute right-2 bottom-2 p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg disabled:opacity-50"
                       title="Aplicar Ajuste Manual"
                     >
                       <Sparkles className="w-4 h-4" />
                     </button>
                   </div>
                </div>

                {/* Ferramentas de Restauração */}
                <div className={`${cardBg} rounded-3xl border p-5 shadow-xl`}>
                  <h2 className={`text-[10px] flex items-center gap-2 mb-6 uppercase tracking-elegant font-bold ${textMain}`}><Wand2 className="w-3.5 h-3.5 text-indigo-600" /> Escolha o Método</h2>
                  <div className="grid grid-cols-1 gap-2.5">
                    {RESTORATION_OPTIONS.map(opt => (
                      <ActionCard 
                        key={opt.id} 
                        option={opt} 
                        active={activeMode === opt.id && status === 'success'} 
                        onClick={() => handleProcess(opt.id)} 
                        isLight={isLight} 
                      />
                    ))}
                  </div>
                </div>

                {/* Assistente Compacto na Sidebar */}
                <div className={`${cardBg} rounded-3xl border p-4 shadow-xl`}>
                   <div className="flex items-center gap-2 mb-3 text-[9px] uppercase font-bold text-slate-500">
                      <Cpu className="w-3 h-3" /> Assistente
                   </div>
                   <div className={`p-3 rounded-2xl text-[10px] leading-relaxed mb-3 ${isLight ? 'bg-white text-slate-950 border border-slate-200' : 'bg-slate-950/50 text-slate-300 font-light'}`}>
                      {status === 'processing' ? "Estou processando os pixels com cuidado..." : "Selecione uma ferramenta ou descreva o que deseja mudar na imagem."}
                   </div>
                   <div className="flex gap-2">
                      <Button onClick={handleFullReset} variant="ghost" className="flex-1 h-10 uppercase text-[9px] tracking-elegant border border-slate-700/30" icon={RotateCcw}>Limpar</Button>
                      <Button onClick={() => setShowAbout(true)} variant="secondary" className="h-10 px-3" icon={Info}></Button>
                   </div>
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
            <p className="text-sm italic font-light leading-relaxed tracking-soft">"Para conservar a história de quem nos trouxe até aqui."</p>
            <div className="flex flex-col items-center gap-1">
               <div className="h-[1px] w-12 bg-indigo-600/30 mb-2"></div>
               <span className="text-xs font-bold uppercase tracking-elegant flex items-center gap-2">Para Ilma S2 <Heart className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" /></span>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title="Histórico de Criações" isLight={isLight}>
        {history.length === 0 ? (
          <div className="text-center py-12 opacity-40"><Clock className="w-12 h-12 mx-auto mb-4" /><p className="text-xs uppercase tracking-elegant">Sem histórico recente.</p></div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
            {history.map((item) => (
              <div key={item.id} className={`flex gap-4 p-3 ${isLight ? 'bg-white' : 'bg-slate-800/40'} rounded-2xl border ${isLight ? 'border-slate-200' : 'border-slate-700/50'} group`}>
                <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-xl"><img src={item.processed} className="w-full h-full object-cover" alt="History" /></div>
                <div className="flex-1 flex flex-col justify-between py-1 overflow-hidden">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-indigo-600 mb-1 flex items-center justify-between">{item.mode} <span className="text-[8px] opacity-40">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
                    <div className={`text-[9px] line-clamp-2 italic truncate ${isLight ? 'text-slate-950 font-bold' : 'text-slate-300'}`}>{item.description || 'Restauração de imagem.'}</div>
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
            <h3 className="text-[10px] uppercase tracking-elegant font-bold text-indigo-600 mb-4">Chave de API (GCP)</h3>
            <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'} mb-4`}>
              <div className="flex items-center justify-between mb-3">
                 <span className="text-[10px] uppercase font-bold opacity-60">Status</span>
                 {isKeyMissing ? (
                   <span className="text-[9px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-bold">Pendente</span>
                 ) : (
                   <span className="text-[9px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-bold">Configurada</span>
                 )}
              </div>
              <p className="text-[9px] text-slate-500 leading-relaxed mb-4">Para funcionar no Vercel sem chaves de ambiente, selecione uma chave paga do seu projeto GCP.</p>
              <Button onClick={handleOpenKeySelector} className="w-full h-10 text-[10px] uppercase tracking-elegant" icon={Key}>Selecionar Chave</Button>
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noreferrer" 
                className="mt-3 flex items-center justify-center gap-1.5 text-[8px] uppercase font-bold text-indigo-600 hover:underline"
              >
                Docs de Faturamento <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </section>

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
                { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash', desc: 'Opção padrão (gratuita/incluída)' },
                { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro', desc: 'Qualidade Premium (requer faturamento)' }
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
      <p className="text-xl font-bold uppercase tracking-elegant text-white animate-pulse">Refazendo Histórias...</p>
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
          <span className={`text-[10px] font-bold uppercase tracking-soft ${isLight ? 'text-slate-950' : 'text-slate-500'}`}>{label}</span>
        </div>
      )}
      <input type="file" className="hidden" onChange={(e:any) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onloadend = () => onSelect(f, r.result as string, f.type); r.readAsDataURL(f); } }} />
    </label>
  );
}

function ActionCard({ option, active, onClick, isLight }: any) {
  return (
    <button onClick={onClick} className={`flex items-center p-3.5 rounded-2xl border text-left transition-all group w-full ${active ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : isLight ? 'bg-white border-slate-300 text-slate-950 hover:border-indigo-600 shadow-sm' : 'bg-slate-800/50 border-slate-700 text-white hover:border-indigo-400'}`}>
      <div className={`p-2 rounded-xl mr-3.5 transition-all ${active ? 'bg-white/20' : 'bg-indigo-600/10 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
        <option.icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <div className="text-[10px] uppercase font-bold tracking-soft">{option.label}</div>
        <div className={`text-[8px] opacity-70 line-clamp-1 mt-0.5 ${isLight ? 'font-bold' : 'font-light'}`}>{option.description}</div>
      </div>
    </button>
  );
}

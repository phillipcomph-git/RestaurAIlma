
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Wand2, Palette, ScanLine, Sparkles, RotateCcw,
  Settings, History, X, Clock, Zap, MessageSquare, RefreshCw, 
  Maximize2, Camera, ImageOff, Heart, Info, Send, Layers, 
  Image as ImageIcon, Undo2, Redo2, Download, Minimize2, Edit3, 
  Moon, Sun, UserCheck, SlidersHorizontal, ChevronLeft, ChevronRight, Key, Cpu, AlertCircle, Trash2,
  ArrowRight, ExternalLink, Square, RectangleHorizontal, RectangleVertical, Loader2, CreditCard, Check
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
    id: 'remove-flaws',
    label: 'Remover Falhas',
    icon: Edit3,
    description: 'Limpa poeira e manchas leves.',
    prompt: 'Advanced flaw removal: clean up dust, specks, and minor surface imperfections from the photo.'
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
    label: 'Aumentar Nitidez',
    icon: Maximize2,
    description: 'Melhora a definição dos detalhes.',
    prompt: 'Sharpen details and increase clarity significantly.'
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
  const [imageState, setImageState] = useState<ImageState>({
    file: null, originalPreview: null, processedPreview: null, mimeType: '', history: [], future: []
  });
  
  const [mergeState, setMergeState] = useState<MergeState>({
    imageA: null, imageB: null, mimeTypeA: '', mimeTypeB: '', results: null, resultIndex: 0
  });
  const [mergeCount, setMergeCount] = useState(1);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [processingProgress, setProcessingProgress] = useState<string>('');
  const [activeMode, setActiveMode] = useState<RestorationMode | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [generateState, setGenerateState] = useState<GenerateState>({
    prompt: '', baseImage: null, baseMimeType: null, results: null, resultIndex: 0
  });
  const [generateCount, setGenerateCount] = useState(1);
  const [aspectRatio, setAspectRatio] = useState('1:1');

  const [settings, setSettings] = useState<AppSettings>(() => safeStorage.load('restaurai_settings', { language: 'pt', theme: 'dark', preferredModel: 'gemini-2.5-flash-image' }));
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => safeStorage.load('restaurai_history', []));

  useEffect(() => { safeStorage.save('restaurai_history', history); }, [history]);
  useEffect(() => { safeStorage.save('restaurai_settings', settings); }, [settings]);

  const isLight = settings.theme === 'light';
  const cardBg = isLight ? 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] border-slate-200' : 'bg-slate-900/80 shadow-2xl border-slate-800';
  const textMain = isLight ? 'text-slate-900 font-extralight' : 'text-white font-extralight';
  const textSub = isLight ? 'text-slate-600 font-medium' : 'text-slate-400 font-light';

  const utilityIconColor = isLight ? 'text-indigo-600 hover:text-indigo-700' : 'text-yellow-400 hover:text-yellow-300';

  const handleApiError = (err: any) => {
    setStatus('error');
    setProcessingProgress('');
    setErrorMsg(err.message || "Erro de conexão com a API.");
  };

  const handleImageSelect = (file: File, base64: string, mimeType: string) => {
    setImageState({ file, originalPreview: base64, processedPreview: null, mimeType, history: [], future: [] });
    setStatus('idle');
    setErrorMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProcess = async (mode: RestorationMode) => {
    if (!imageState.originalPreview) return;
    setStatus('processing');
    setActiveMode(mode);
    setErrorMsg(null);
    try {
      const toolPrompt = RESTORATION_OPTIONS.find(o => o.id === mode)?.prompt || '';
      const userContext = customPrompt.trim() ? `ADICIONAL: ${customPrompt}. ` : '';
      const finalPrompt = `${userContext}${toolPrompt}`;
      const result = await processImage(imageState.originalPreview, imageState.mimeType, finalPrompt, settings.preferredModel);
      
      setImageState(prev => ({ 
        ...prev, 
        processedPreview: result.base64,
        history: [...prev.history, prev.originalPreview!],
        future: [] 
      }));
      
      setHistory(prev => [{
        id: Date.now().toString(),
        original: imageState.originalPreview!,
        processed: result.base64,
        mode: RESTORATION_OPTIONS.find(o => o.id === mode)?.label || 'Personalizado',
        timestamp: Date.now(),
        description: result.description
      }, ...prev].slice(0, 15));
      
      setStatus('success');
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleApplyResult = () => {
    if (!imageState.processedPreview) return;
    setImageState(prev => ({
      ...prev,
      originalPreview: prev.processedPreview,
      processedPreview: null,
      history: [...prev.history], 
      future: []
    }));
    setStatus('idle');
    setActiveMode(null);
    setCustomPrompt('');
  };

  const handleUndo = () => {
    if (imageState.history.length === 0) return;
    const last = imageState.history[imageState.history.length - 1];
    setImageState(prev => ({
      ...prev,
      originalPreview: last,
      processedPreview: null,
      future: [prev.originalPreview!, ...prev.future],
      history: prev.history.slice(0, -1)
    }));
    setStatus('idle');
  };

  const handleRedo = () => {
    if (imageState.future.length === 0) return;
    const next = imageState.future[0];
    setImageState(prev => ({
      ...prev,
      originalPreview: next,
      processedPreview: null,
      history: [...prev.history, prev.originalPreview!],
      future: prev.future.slice(1)
    }));
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

  const handleGenerate = async () => {
    if (!generateState.prompt.trim()) return;
    setStatus('processing');
    setErrorMsg(null);
    try {
      const baseImg = generateState.baseImage ? { data: generateState.baseImage, mimeType: generateState.baseMimeType! } : undefined;
      const results = await generateImageFromPrompt(generateState.prompt, generateCount, aspectRatio, baseImg);
      setGenerateState(prev => ({ ...prev, results: results.map(r => r.base64), resultIndex: 0 }));
      setStatus('success');
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleMergeAction = async () => {
    if (!mergeState.imageA || !mergeState.imageB || !customPrompt.trim()) return;
    setStatus('processing');
    setErrorMsg(null);
    try {
      const results = await mergeImages(mergeState.imageA, mergeState.mimeTypeA, mergeState.imageB, mergeState.mimeTypeB, customPrompt, mergeCount);
      setMergeState(prev => ({ ...prev, results: results.map(r => r.base64), resultIndex: 0 }));
      setStatus('success');
    } catch (err: any) {
      handleApiError(err);
    }
  };

  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-300 text-slate-950' : 'bg-slate-950 text-white'} transition-colors duration-300 pb-24 md:pb-20`}>
      <header className={`border-b ${isLight ? 'border-slate-400 bg-white/95 shadow-sm' : 'border-slate-800 bg-slate-900/50'} backdrop-blur-md sticky top-0 z-50 h-16 md:h-20`}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <button className="flex items-center gap-2 md:gap-5 cursor-pointer group outline-none relative py-2 px-4" onClick={handleFullReset}>
            {/* Glow Effect on Hover - Refined and Stronger */}
            <div className="absolute inset-0 bg-yellow-400/0 blur-[15px] rounded-full z-0 pointer-events-none group-hover:bg-yellow-400/30 transition-all duration-500 scale-90" />
            
            <div className="relative w-9 h-9 md:w-11 md:h-11 overflow-hidden rounded-2xl border border-white/20 bg-slate-800 flex items-center justify-center z-10 shadow-lg">
              <img src={LOGO_THUMBNAIL_URL} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className="relative text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl tracking-[0.25em] transition-all duration-300 flex items-center uppercase whitespace-nowrap z-10 select-none group-hover:scale-[1.01]">
               <span className={`transition-all duration-500 font-extralight ${isLight ? 'text-slate-950 group-hover:text-indigo-700' : 'text-white group-hover:text-indigo-400'}`}>RESTAUR</span>
               <span className="text-indigo-600 font-bold transition-all duration-500">A</span>
               <span className={`font-bold transition-all duration-500 text-indigo-600 group-hover:text-yellow-500`}>I</span>
               <span className={`transition-all duration-500 font-extralight ${isLight ? 'text-slate-950 group-hover:text-yellow-600' : 'text-white group-hover:text-yellow-400'}`}>LMA</span>
            </div>
          </button>
          
          <nav className={`hidden md:flex items-center p-1 rounded-2xl border backdrop-blur-sm ${isLight ? 'bg-slate-400/50 border-slate-500' : 'bg-slate-800/20 border-slate-400/30'}`}>
             <button onClick={() => setActiveTab('restore')} className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all text-xs uppercase font-bold ${activeTab === 'restore' ? 'bg-indigo-600 text-white shadow-md' : isLight ? 'text-slate-700 hover:text-slate-950' : 'text-slate-400 hover:text-white'}`}><RefreshCw className="w-3 h-3" /> Restaurar</button>
             <button onClick={() => setActiveTab('merge')} className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all text-xs uppercase font-bold ${activeTab === 'merge' ? 'bg-indigo-600 text-white shadow-md' : isLight ? 'text-slate-700 hover:text-slate-950' : 'text-slate-400 hover:text-white'}`}><Layers className="w-3 h-3" /> Mesclar</button>
             <button onClick={() => setActiveTab('generate')} className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all text-xs uppercase font-bold ${activeTab === 'generate' ? 'bg-indigo-600 text-white shadow-md' : isLight ? 'text-slate-700 hover:text-slate-950' : 'text-slate-400 hover:text-white'}`}><ImageIcon className="w-3 h-3" /> Gerar</button>
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowAbout(true)} className={`p-2 transition-colors ${utilityIconColor}`} title="Sobre"><Info className="w-5 h-5" /></button>
            <button onClick={() => setShowHistory(true)} className={`p-2 transition-colors ${utilityIconColor}`} title="Histórico"><History className="w-5 h-5" /></button>
            <button onClick={() => setShowSettings(true)} className={`p-2 transition-colors ${utilityIconColor}`} title="Configurações"><Settings className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {errorMsg && (
          <div className={`mb-6 p-5 rounded-3xl border bg-red-500/10 border-red-500/30 text-red-600 text-xs font-bold animate-in slide-in-from-top-4 shadow-xl`}>
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-full bg-red-500 text-white">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm uppercase tracking-soft mb-1">Erro de Processamento</p>
                <p className="font-light opacity-90">{errorMsg}</p>
              </div>
              <button onClick={() => setErrorMsg(null)} className="p-2 hover:bg-black/5 rounded-full"><X className="w-5 h-5" /></button>
            </div>
          </div>
        )}

        {activeTab === 'restore' && (
          !imageState.originalPreview ? (
            <div className="grid md:grid-cols-2 gap-12 items-center min-h-[60vh] py-10">
              <div className="space-y-6">
                <h1 className={`text-4xl lg:text-6xl uppercase ${textMain} leading-tight`}>Dê vida nova às suas <span className="text-yellow-500 font-bold">fotos</span>.</h1>
                <p className={`${textSub} text-sm max-w-sm tracking-soft`}>Restauração inteligente preservando memórias preciosas com perfeição.</p>
                <Uploader onImageSelect={handleImageSelect} />
              </div>
              <ChatAssistant cardBg={cardBg} isLight={isLight} />
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2 space-y-6">
                <div className={`${cardBg} rounded-3xl border p-2 min-h-[400px] flex items-center justify-center relative overflow-hidden transition-all shadow-2xl`}>
                  {status === 'processing' && <LoaderOverlay progress={processingProgress} />}
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

                {imageState.processedPreview && (
                   <div className="flex flex-col sm:flex-row gap-4 items-center justify-center animate-in fade-in slide-in-from-top-4 duration-300">
                      <Button 
                        onClick={handleApplyResult} 
                        variant="primary" 
                        className="h-14 px-10 uppercase text-xs tracking-elegant font-bold w-full sm:w-auto bg-green-600 hover:bg-green-500 shadow-green-500/20" 
                        icon={Check}
                      >
                        Aplicar e Continuar
                      </Button>
                      <Button 
                        onClick={() => handleDownloadImage(imageState.processedPreview)} 
                        variant="secondary" 
                        className="h-14 px-10 uppercase text-xs tracking-elegant font-bold w-full sm:w-auto" 
                        icon={Download}
                      >
                        Baixar Agora
                      </Button>
                   </div>
                )}
              </div>
              
              <div className="space-y-6">
                <div className={`${cardBg} rounded-3xl border p-5 shadow-xl`}>
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-elegant text-indigo-600">
                         <MessageSquare className="w-3.5 h-3.5" /> Ajuste Manual
                      </div>
                      <div className={`flex p-1 rounded-xl border space-x-1 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800/50 border-slate-700'}`}>
                        <button onClick={handleUndo} disabled={imageState.history.length === 0} className={`p-2 rounded-lg disabled:opacity-20 transition-all ${isLight ? 'text-indigo-600 hover:bg-slate-200' : 'text-yellow-400 hover:bg-slate-700'}`}><Undo2 className="w-4 h-4" /></button>
                        <button onClick={handleRedo} disabled={imageState.future.length === 0} className={`p-2 rounded-lg disabled:opacity-20 transition-all ${isLight ? 'text-indigo-600 hover:bg-slate-200' : 'text-yellow-400 hover:bg-slate-700'}`}><Redo2 className="w-4 h-4" /></button>
                      </div>
                   </div>
                   
                   <div className="relative group">
                     <textarea 
                       className={`w-full ${isLight ? 'bg-slate-50 text-slate-900 border-slate-300' : 'bg-slate-950 text-white border-slate-800'} rounded-2xl p-4 pr-12 text-xs h-24 outline-none border transition-all focus:border-indigo-600 placeholder:text-slate-500 font-medium`} 
                       placeholder="O que deseja ajustar na próxima edição?..." 
                       value={customPrompt} 
                       onChange={e => setCustomPrompt(e.target.value)} 
                     />
                     <button onClick={() => handleProcess('custom')} disabled={!customPrompt.trim() || status === 'processing'} className="absolute right-2 bottom-2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg disabled:opacity-50"><Sparkles className="w-4 h-4" /></button>
                   </div>
                </div>

                <div className={`${cardBg} rounded-3xl border p-5 shadow-xl`}>
                  <h2 className={`text-[10px] flex items-center gap-2 mb-6 uppercase tracking-elegant font-bold ${textMain}`}><Wand2 className="w-3.5 h-3.5 text-indigo-600" /> Métodos de Restauração</h2>
                  <div className="grid grid-cols-1 gap-2.5">
                    {RESTORATION_OPTIONS.map(opt => (
                      <ActionCard key={opt.id} option={opt} active={activeMode === opt.id && status === 'success'} onClick={() => handleProcess(opt.id)} isLight={isLight} />
                    ))}
                  </div>
                </div>
                <Button onClick={handleFullReset} variant="ghost" className={`w-full h-10 uppercase text-[9px] tracking-elegant border ${isLight ? 'border-slate-400 text-slate-500 hover:text-slate-900' : 'border-slate-700/30'}`} icon={RotateCcw}>Limpar Estúdio</Button>
              </div>
            </div>
          )
        )}

        {activeTab === 'merge' && (
          <div className="grid md:grid-cols-2 gap-12 py-10">
            <div className="space-y-8">
               <h1 className={`text-4xl lg:text-6xl uppercase ${textMain} leading-tight`}>Mescle <span className="text-yellow-500 font-bold">pessoas</span>.</h1>
               <div className="grid grid-cols-2 gap-4">
                  <UploaderCompact label="Foto A" current={mergeState.imageA} onSelect={(f:any, b:any, m:any) => setMergeState(p => ({...p, imageA: b, mimeTypeA: m}))} isLight={isLight} />
                  <UploaderCompact label="Foto B" current={mergeState.imageB} onSelect={(f:any, b:any, m:any) => setMergeState(p => ({...p, imageB: b, mimeTypeB: m}))} isLight={isLight} />
               </div>
               <div className={`${cardBg} p-6 rounded-3xl border shadow-xl space-y-4`}>
                  <textarea className={`w-full ${isLight ? 'bg-slate-50 text-slate-900 border-slate-300' : 'bg-slate-950 text-white border-slate-800'} rounded-xl p-4 text-sm h-32 outline-none border transition-all focus:border-indigo-600`} placeholder="Instrução de mesclagem..." value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} />
                  <div className="flex flex-col gap-2">
                    <p className={`text-[10px] uppercase font-bold tracking-elegant ${textSub}`}>Quantidade de Variações</p>
                    <div className={`flex p-1 rounded-xl border ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-800 border-slate-700'}`}>
                        {[1, 2, 3, 4].map(n => (
                          <button key={n} onClick={() => setMergeCount(n)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${mergeCount === n ? 'bg-indigo-600 text-white shadow-md' : isLight ? 'text-slate-500 hover:text-indigo-600' : 'text-slate-500 hover:text-indigo-400'}`}>{n}x</button>
                        ))}
                    </div>
                  </div>
                  <Button onClick={handleMergeAction} className="w-full h-14 uppercase tracking-elegant font-bold" isLoading={status === 'processing'} icon={Layers}>Gerar Fusão</Button>
               </div>
            </div>
            {mergeState.results && (
              <ResultsGallery 
                results={mergeState.results} 
                currentIndex={mergeState.resultIndex}
                onIndexChange={(idx: number) => setMergeState(p => ({...p, resultIndex: idx}))}
                onDownload={() => handleDownloadImage(mergeState.results![mergeState.resultIndex])} 
                cardBg={cardBg} 
                onReset={() => setMergeState(p => ({...p, results: null}))} 
              />
            )}
            {!mergeState.results && <ChatAssistant cardBg={cardBg} isLight={isLight} />}
          </div>
        )}

        {activeTab === 'generate' && (
          <div className="grid md:grid-cols-2 gap-12 py-10">
            <div className="space-y-8">
               <h1 className={`text-4xl lg:text-6xl uppercase ${textMain} leading-tight`}>Crie <span className="text-yellow-500 font-bold">arte</span>.</h1>
               
               <div className="flex items-center gap-4">
                  <div className="w-24 h-24 sm:w-32 sm:h-32">
                    <UploaderCompact 
                      label="Referência" 
                      current={generateState.baseImage} 
                      onSelect={(f:any, b:any, m:any) => setGenerateState(p => ({...p, baseImage: b, baseMimeType: m}))} 
                      isLight={isLight} 
                    />
                  </div>
                  <div className="flex-1">
                     <p className={`text-[10px] uppercase font-bold tracking-elegant mb-1 ${textSub}`}>Base (Opcional)</p>
                     <p className={`text-[9px] leading-relaxed ${textSub} opacity-80`}>Use uma imagem como guia visual para a IA.</p>
                  </div>
               </div>

               <div className={`${cardBg} p-6 rounded-3xl border shadow-xl space-y-6`}>
                  <textarea className={`w-full ${isLight ? 'bg-slate-50 text-slate-900 border-slate-300' : 'bg-slate-950 text-white border-slate-800'} rounded-xl p-4 text-sm h-40 outline-none border transition-all focus:border-indigo-600`} placeholder="Descreva sua visão..." value={generateState.prompt} onChange={e => setGenerateState(p => ({...p, prompt: e.target.value}))} />
                  <div className="grid grid-cols-2 gap-4">
                     <div className="flex flex-col gap-2">
                        <p className={`text-[10px] uppercase font-bold tracking-elegant ${textSub}`}>Quantidade</p>
                        <div className={`flex p-1 rounded-xl border ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-800 border-slate-700'}`}>
                           {[1, 2, 3, 4].map(n => (
                             <button key={n} onClick={() => setGenerateCount(n)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${generateCount === n ? 'bg-indigo-600 text-white shadow-md' : isLight ? 'text-slate-500 hover:text-indigo-600' : 'text-slate-500 hover:text-indigo-400'}`}>{n}x</button>
                           ))}
                        </div>
                     </div>
                     <div className="flex flex-col gap-2">
                        <p className={`text-[10px] uppercase font-bold tracking-elegant ${textSub}`}>Proporção</p>
                        <div className={`flex p-1 rounded-xl border ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-800 border-slate-700'}`}>
                           <button onClick={() => setAspectRatio('1:1')} className={`flex-1 flex justify-center py-1.5 rounded-lg ${aspectRatio === '1:1' ? 'bg-indigo-600 text-white' : isLight ? 'text-slate-500 hover:text-indigo-600' : 'text-slate-500'}`}><Square className="w-3.5 h-3.5" /></button>
                           <button onClick={() => setAspectRatio('16:9')} className={`flex-1 flex justify-center py-1.5 rounded-lg ${aspectRatio === '16:9' ? 'bg-indigo-600 text-white' : isLight ? 'text-slate-500 hover:text-indigo-600' : 'text-slate-500'}`}><RectangleHorizontal className="w-3.5 h-3.5" /></button>
                        </div>
                     </div>
                  </div>
                  <Button onClick={handleGenerate} className="w-full h-14 uppercase tracking-elegant font-bold" isLoading={status === 'processing'} icon={Sparkles}>Criar Imagem</Button>
               </div>
            </div>
            {generateState.results && (
              <ResultsGallery 
                results={generateState.results} 
                currentIndex={generateState.resultIndex}
                onIndexChange={(idx: number) => setGenerateState(p => ({...p, resultIndex: idx}))}
                onDownload={() => handleDownloadImage(generateState.results![generateState.resultIndex])} 
                cardBg={cardBg} 
                onReset={() => setGenerateState(p => ({...p, results: null}))} 
              />
            )}
            {!generateState.results && <ChatAssistant cardBg={cardBg} isLight={isLight} />}
          </div>
        )}
      </main>

      <nav className={`md:hidden fixed bottom-4 left-4 right-4 z-50 p-2 rounded-[2rem] border backdrop-blur-3xl shadow-2xl flex justify-between ${isLight ? 'bg-white/95 border-slate-300 shadow-xl' : 'bg-slate-950/80 border-slate-800'}`}>
         {(['restore', 'merge', 'generate'] as AppTab[]).map(tab => (
           <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 flex flex-col items-center gap-1 rounded-[1.5rem] transition-all ${activeTab === tab ? 'bg-indigo-600 text-white' : isLight ? 'text-slate-400 hover:text-indigo-600' : 'text-slate-500'}`}>
             {tab === 'restore' ? <RotateCcw className="w-4 h-4" /> : tab === 'merge' ? <Layers className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
             <span className="text-[7px] uppercase font-bold tracking-widest">{tab === 'restore' ? 'Restaurar' : tab === 'merge' ? 'Mesclar' : 'Gerar'}</span>
           </button>
         ))}
      </nav>

      <Modal isOpen={showAbout} onClose={() => setShowAbout(false)} title="Sobre RestaurAIlma" isLight={isLight}>
        <div className="space-y-8 text-center">
          <div className={`relative w-full aspect-square rounded-[2rem] overflow-hidden shadow-2xl border ${isLight ? 'border-indigo-600/10' : 'border-indigo-600/20'}`}>
             <AboutCarousel images={ABOUT_CAROUSEL_IMAGES} />
             <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          </div>
          <div className="space-y-6">
            <p className={`text-sm italic leading-relaxed tracking-soft ${isLight ? 'text-indigo-700 font-medium' : 'text-indigo-400 font-extralight'}`}>
              "para conservar a memória de quem nos trouxe até aqui"
            </p>
            <div className="flex flex-col items-center gap-1.5 opacity-80">
              <div className={`h-[1px] w-8 ${isLight ? 'bg-indigo-600/50' : 'bg-indigo-600/30'} mb-2`}></div>
              <span className={`text-[10px] font-bold uppercase tracking-elegant flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Para Ilma S2 <Heart className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" />
              </span>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title="Histórico" isLight={isLight}>
        {history.length === 0 ? (
          <div className="text-center py-12 opacity-40"><Clock className={`w-12 h-12 mx-auto mb-4 ${isLight ? 'text-slate-400' : ''}`} /><p className={`text-xs uppercase tracking-elegant ${isLight ? 'text-slate-500' : ''}`}>Sem registros ainda.</p></div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
            {history.map((item) => (
              <div key={item.id} className={`flex gap-4 p-3 rounded-2xl border transition-colors ${isLight ? 'bg-slate-50 border-slate-200 hover:border-indigo-400' : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-500'}`}>
                <div className={`w-16 h-16 flex-shrink-0 overflow-hidden rounded-xl border ${isLight ? 'border-slate-200' : 'border-slate-700'}`}><img src={item.processed} className="w-full h-full object-cover" /></div>
                <div className="flex-1 flex flex-col justify-center">
                  <div className={`text-[9px] uppercase font-bold mb-1 ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>{item.mode}</div>
                  <div className="flex gap-2">
                    <button onClick={() => handleDownloadImage(item.processed)} className={`p-1.5 rounded-lg transition-colors ${isLight ? 'text-slate-500 hover:bg-indigo-600 hover:text-white' : 'text-slate-400 hover:bg-indigo-600 hover:text-white'}`}><Download className="w-3 h-3" /></button>
                    <button onClick={() => setHistory(h => h.filter(x => x.id !== item.id))} className={`p-1.5 rounded-lg transition-colors ${isLight ? 'text-slate-500 hover:bg-red-600 hover:text-white' : 'text-slate-400 hover:bg-red-600 hover:text-white'}`}><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Configurações" isLight={isLight}>
        <div className="space-y-6">
           <h3 className={`text-[10px] uppercase tracking-elegant font-bold mb-2 ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>Tema Visual</h3>
           <div className={`flex p-1 rounded-xl border ${isLight ? 'bg-slate-200 border-slate-300' : 'bg-slate-800/10 border-slate-400/20'}`}>
              <button onClick={() => setSettings(s => ({...s, theme: 'dark'}))} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${!isLight ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}><Moon className="w-3 h-3" /> Dark</button>
              <button onClick={() => setSettings(s => ({...s, theme: 'light'}))} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${isLight ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}><Sun className="w-3 h-3" /> Light</button>
           </div>
        </div>
      </Modal>
    </div>
  );
}

function LoaderOverlay({ progress }: { progress?: string }) {
  return (
    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
      <div className="w-16 h-16 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <p className="text-lg font-bold uppercase tracking-elegant text-white">Processando...</p>
      {progress && <p className="text-[10px] uppercase tracking-widest text-indigo-400 mt-2">{progress}</p>}
    </div>
  );
}

function ResultsGallery({ results, currentIndex = 0, onIndexChange, onDownload, onReset, cardBg }: any) {
  const hasMultiple = results.length > 1;

  const handleNext = () => {
    onIndexChange((currentIndex + 1) % results.length);
  };

  const handlePrev = () => {
    onIndexChange((currentIndex - 1 + results.length) % results.length);
  };

  return (
    <div className={`${cardBg} rounded-3xl border p-4 flex flex-col items-center justify-center min-h-[400px] shadow-2xl relative`}>
      <div className="relative group w-full flex flex-col items-center">
        <img src={results[currentIndex]} className="max-w-full rounded-2xl shadow-xl mb-4 transition-all duration-300" alt={`Resultado ${currentIndex + 1}`} />
        
        {hasMultiple && (
          <>
            <button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-indigo-600 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-indigo-600 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm">
              <ChevronRight className="w-6 h-6" />
            </button>
            <div className="absolute bottom-6 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/10">
              {currentIndex + 1} / {results.length}
            </div>
          </>
        )}
      </div>

      <div className="flex gap-4 w-full">
         <Button onClick={onDownload} variant="primary" className="flex-1 h-12 uppercase text-xs font-bold" icon={Download}>Baixar</Button>
         <Button onClick={onReset} variant="secondary" className="flex-1 h-12 uppercase text-xs font-bold">Refazer</Button>
      </div>
    </div>
  );
}

function ChatAssistant({ cardBg, isLight }: any) {
  return (
    <div className={`${cardBg} rounded-[2rem] border h-[400px] flex flex-col overflow-hidden shadow-xl`}>
      <div className={`p-4 border-b ${isLight ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800 bg-black/5'} flex items-center justify-between`}>
        <span className={`text-[10px] font-bold uppercase tracking-elegant opacity-60 ${isLight ? 'text-slate-900' : ''}`}>IA Concierge</span>
        <MessageSquare className="w-4 h-4 text-indigo-600" />
      </div>
      <div className="flex-1 p-6 space-y-4">
        <div className={`p-4 rounded-2xl text-xs leading-relaxed border ${isLight ? 'bg-slate-50 text-slate-800 border-slate-200' : 'bg-slate-800 border-transparent'}`}>
          Olá! Sou seu assistente de IA. Como posso ajudar a recuperar suas memórias hoje?
        </div>
      </div>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children, isLight }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" onClick={onClose} />
      <div className={`relative w-full max-w-md ${isLight ? 'bg-white text-slate-950' : 'bg-slate-900 text-white'} rounded-[2rem] border border-slate-800/50 overflow-hidden shadow-2xl`}>
        <div className={`p-6 border-b flex items-center justify-between ${isLight ? 'border-slate-100' : 'border-slate-800/20'}`}>
          <h2 className={`text-xs uppercase font-bold tracking-elegant ${isLight ? 'text-indigo-700' : ''}`}>{title}</h2>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-400 hover:text-slate-900' : 'hover:bg-black/5'}`}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function UploaderCompact({ label, current, onSelect, isLight }: any) {
  return (
    <label className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all hover:border-indigo-600 relative overflow-hidden h-full w-full ${isLight ? 'bg-slate-50 border-slate-400 hover:bg-slate-100' : 'border-slate-700'}`}>
      {current ? <img src={current} className="w-full h-full object-cover rounded-xl" /> : (
        <div className="flex flex-col items-center p-2 text-center">
          <ImageIcon className="w-5 h-5 text-indigo-600 mb-1" />
          <span className={`text-[10px] font-bold uppercase ${isLight ? 'text-slate-600' : ''}`}>{label}</span>
        </div>
      )}
      <input type="file" className="hidden" onChange={(e:any) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onloadend = () => onSelect(f, r.result, f.type); r.readAsDataURL(f); } }} />
    </label>
  );
}

function AboutCarousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => { setIndex(p => (p + 1) % images.length); }, 4000);
    return () => clearInterval(timer);
  }, [images.length]);
  return (
    <div className="w-full h-full relative">
      {images.map((img, i) => (
        <img key={i} src={img} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${index === i ? 'opacity-100' : 'opacity-0'}`} />
      ))}
    </div>
  );
}

function ActionCard({ option, active, onClick, isLight }: any) {
  return (
    <button onClick={onClick} className={`flex items-center p-3.5 rounded-2xl border text-left transition-all w-full ${active ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : isLight ? 'bg-white border-slate-300 text-slate-900 hover:border-indigo-400 hover:bg-slate-50 shadow-sm' : 'bg-slate-800 border-slate-700 hover:border-indigo-400'}`}>
      <div className={`p-2 rounded-xl mr-3.5 ${active ? 'bg-white/20' : isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-600/10 text-indigo-600'}`}>
        <option.icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <div className={`text-[10px] uppercase font-bold ${active ? 'text-white' : ''}`}>{option.label}</div>
        <div className={`text-[8px] line-clamp-1 ${active ? 'text-white/70' : isLight ? 'text-slate-500' : 'opacity-70'}`}>{option.description}</div>
      </div>
    </button>
  );
}

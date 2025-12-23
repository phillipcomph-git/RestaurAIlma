
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Wand2, Palette, ScanLine, Sparkles, RotateCcw,
  Settings, History, X, Clock, Zap, MessageSquare, RefreshCw, 
  Maximize2, ImageOff, Heart, Info, Send, Layers, 
  Image as ImageIcon, Undo2, Redo2, Download, Trash2,
  ChevronLeft, ChevronRight, AlertCircle, Square, RectangleHorizontal, Check,
  Edit3, Key, ExternalLink
} from 'lucide-react';

import { Uploader } from '../components/Uploader';
import { ImageComparator } from '../components/ImageComparator';
import { Button } from '../components/Button';
import { useImageProcessing } from '../hooks/useImageProcessing';
import { ImageState, MergeState, AppTab, ProcessingStatus, RestorationMode, ActionOption, HistoryItem, AppSettings, GenerateState } from '../types';

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

// Showcase data for the carousel
const ABOUT_SHOWCASE = [
  {
    url: "https://drive.google.com/thumbnail?id=1FyVZ-9tvJCQ2-txXy2yZSbxWkATDwZsK&sz=w800",
    title: "Restauração Completa",
    desc: "Remoção de rasgos e reconstrução facial inteligente."
  },
  {
    url: "https://drive.google.com/thumbnail?id=1qvU6V2KpAl60XSSCicKkmZI90WHNdX8Q&sz=w800",
    title: "Colorização Natural",
    desc: "Transformando preto e branco em memórias vivas."
  },
  {
    url: "https://drive.google.com/thumbnail?id=16-788ZCK7vsexkBpYYwy7LEYG1QKrsi7&sz=w800",
    title: "Aprimoramento 4K",
    desc: "Mais nitidez e resolução para fotos de baixa qualidade."
  },
  {
    url: "https://drive.google.com/thumbnail?id=1y8mt4eiQquA-LQ9dohIl3Uvp_g3xDgKK&sz=w800",
    title: "Remoção de Danos",
    desc: "Limpeza de fungos, poeira e oxidação do tempo."
  }
];

const safeStorage = {
  save: (key: string, value: any) => {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { }
  },
  load: (key: string, defaultValue: any) => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) { return defaultValue; }
  }
};

export default function Home() {
  const { processImage: apiProcess, mergeImages: apiMerge, generateImage: apiGenerate, chat: apiChat, isProcessing } = useImageProcessing();
  const [activeTab, setActiveTab] = useState<AppTab>('restore');
  const [imageState, setImageState] = useState<ImageState>({
    file: null, originalPreview: null, processedPreview: null, mimeType: '', history: [], future: []
  });
  const [mergeState, setMergeState] = useState<MergeState>({
    imageA: null, imageB: null, mimeTypeA: '', mimeTypeB: '', results: null, resultIndex: 0
  });
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [activeMode, setActiveMode] = useState<RestorationMode | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState(false);
  
  const [generateState, setGenerateState] = useState<GenerateState>({
    prompt: '', baseImage: null, baseMimeType: null, results: null, resultIndex: 0
  });
  const [generateCount, setGenerateCount] = useState(1);
  const [aspectRatio, setAspectRatio] = useState('1:1');

  const [settings, setSettings] = useState<AppSettings>({ language: 'pt', theme: 'dark', preferredModel: 'gemini-2.5-flash-image' });
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const checkApiKey = async () => {
      if (typeof window !== 'undefined' && (window as any).aistudio && settings.preferredModel === 'gemini-3-pro-image-preview') {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await (window as any).aistudio.openSelectKey();
        }
      }
    };
    checkApiKey();
  }, [settings.preferredModel]);

  useEffect(() => {
    setSettings(safeStorage.load('restaurai_settings', { language: 'pt', theme: 'dark', preferredModel: 'gemini-2.5-flash-image' }));
    setHistory(safeStorage.load('restaurai_history', []));
  }, []);

  useEffect(() => { if (history.length) safeStorage.save('restaurai_history', history); }, [history]);
  useEffect(() => { safeStorage.save('restaurai_settings', settings); }, [settings]);

  const isLight = settings.theme === 'light';
  const cardBg = isLight ? 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] border-slate-200' : 'bg-slate-900/80 shadow-2xl border-slate-800';
  const textMain = isLight ? 'text-slate-900 font-extralight' : 'text-white font-extralight';
  const textSub = isLight ? 'text-slate-600 font-medium' : 'text-slate-400 font-light';
  const utilityIconColor = isLight ? 'text-indigo-600 hover:text-indigo-700' : 'text-yellow-400 hover:text-yellow-300';

  const handleApiError = (err: any) => {
    const msg = err.message || "";
    if (msg.includes('Requested entity was not found')) {
      handleOpenKeyDialog();
      return;
    }
    if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exhausted')) {
      setIsQuotaError(true);
      setErrorMsg("Limite de uso atingido. O Google limita a quantidade de fotos que podemos processar gratuitamente por minuto.");
    } else {
      setErrorMsg(msg || "Erro de conexão com o servidor.");
      setIsQuotaError(false);
    }
    setStatus('error');
  };

  const handleOpenKeyDialog = async () => {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setErrorMsg(null);
      setIsQuotaError(false);
      setStatus('idle');
    }
  };

  const handleImageSelect = (file: File, base64: string, mimeType: string) => {
    setImageState({ file, originalPreview: base64, processedPreview: null, mimeType, history: [], future: [] });
    setErrorMsg(null);
    setIsQuotaError(false);
    setStatus('idle');
  };

  const handleProcess = async (mode: RestorationMode) => {
    if (!imageState.originalPreview) return;
    setStatus('processing');
    setActiveMode(mode);
    setErrorMsg(null);
    setIsQuotaError(false);
    try {
      const toolPrompt = RESTORATION_OPTIONS.find(o => o.id === mode)?.prompt || '';
      const userContext = customPrompt.trim() ? `ADICIONAL: ${customPrompt}. ` : '';
      const finalPrompt = `${userContext}${toolPrompt}`;
      const result = await apiProcess(imageState.originalPreview, imageState.mimeType, finalPrompt, settings.preferredModel);
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
        timestamp: Date.now()
      }, ...prev].slice(0, 15));
      setStatus('success');
    } catch (err: any) { handleApiError(err); }
  };

  const handleMergeAction = async () => {
    if (!mergeState.imageA || !mergeState.imageB) return;
    setStatus('processing');
    setErrorMsg(null);
    setIsQuotaError(false);
    try {
      const results = await apiMerge(mergeState.imageA, mergeState.mimeTypeA, mergeState.imageB, mergeState.mimeTypeB, customPrompt || 'Fusão realista.', 1);
      setMergeState(prev => ({ ...prev, results: results.map((r: any) => r.base64), resultIndex: 0 }));
      setStatus('success');
    } catch (err: any) { handleApiError(err); }
  };

  const handleGenerateAction = async () => {
    if (!generateState.prompt.trim()) return;
    setStatus('processing');
    setErrorMsg(null);
    setIsQuotaError(false);
    try {
      const base = generateState.baseImage ? { data: generateState.baseImage, mimeType: generateState.baseMimeType! } : undefined;
      const results = await apiGenerate(generateState.prompt, generateCount, aspectRatio, base);
      setGenerateState(prev => ({ ...prev, results: results.map((r: any) => r.base64), resultIndex: 0 }));
      setStatus('success');
    } catch (err: any) { handleApiError(err); }
  };

  const handleApplyResult = () => {
    if (!imageState.processedPreview) return;
    setImageState(prev => ({ ...prev, originalPreview: prev.processedPreview, processedPreview: null }));
    setActiveMode(null);
    setCustomPrompt('');
    setStatus('idle');
  };

  const handleFullReset = () => {
    setImageState({ file: null, originalPreview: null, processedPreview: null, mimeType: '', history: [], future: [] });
    setMergeState({ imageA: null, imageB: null, mimeTypeA: '', mimeTypeB: '', results: null, resultIndex: 0 });
    setGenerateState({ prompt: '', baseImage: null, baseMimeType: null, results: null, resultIndex: 0 });
    setStatus('idle');
    setCustomPrompt('');
    setErrorMsg(null);
    setIsQuotaError(false);
  };

  const handleDownloadImage = (img: string | null) => {
    if (!img) return;
    const link = document.createElement('a');
    link.href = img;
    link.download = `restaurailma-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-300 text-slate-950' : 'bg-slate-950 text-white'} transition-colors duration-500 pb-24`}>
      <header className={`border-b ${isLight ? 'border-slate-400 bg-white/95 shadow-sm' : 'border-slate-800 bg-slate-900/50'} backdrop-blur-md sticky top-0 z-50 h-16 md:h-20`}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <button className="flex items-center gap-3 md:gap-5 group" onClick={handleFullReset}>
            <div className="w-10 h-10 md:w-12 md:h-12 overflow-hidden rounded-2xl border border-white/10 bg-slate-800 shadow-lg group-hover:scale-110 transition-transform">
              <img src={LOGO_THUMBNAIL_URL} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className={`text-xl md:text-3xl tracking-[0.25em] flex items-center uppercase ${textMain}`}>
               RESTAUR<span className="text-indigo-600 font-bold">A</span><span className="font-bold text-indigo-600">I</span>LMA
            </div>
          </button>
          
          <nav className="hidden md:flex items-center p-1 rounded-2xl border bg-slate-800/20 border-slate-400/30">
             <button onClick={() => { setActiveTab('restore'); setStatus('idle'); setErrorMsg(null); }} className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${activeTab === 'restore' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Restauração</button>
             <button onClick={() => { setActiveTab('merge'); setStatus('idle'); setErrorMsg(null); }} className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${activeTab === 'merge' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Mesclar</button>
             <button onClick={() => { setActiveTab('generate'); setStatus('idle'); setErrorMsg(null); }} className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${activeTab === 'generate' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Gerar</button>
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={handleOpenKeyDialog} className={`p-2 ${utilityIconColor} hidden sm:block`} title="Trocar Chave de API"><Key className="w-5 h-5" /></button>
            <button onClick={() => setShowAbout(true)} className={`p-2 ${utilityIconColor}`}><Info className="w-5 h-5" /></button>
            <button onClick={() => setShowHistory(true)} className={`p-2 ${utilityIconColor}`}><History className="w-5 h-5" /></button>
            <button onClick={() => setShowSettings(true)} className={`p-2 ${utilityIconColor}`}><Settings className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {(isProcessing || status === 'processing') && <LoaderOverlay />}

        {errorMsg && (
          <div className={`mb-6 p-6 rounded-[2rem] border shadow-2xl flex flex-col sm:flex-row items-center gap-6 animate-in slide-in-from-top-4 duration-500 ${isQuotaError ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-red-500/10 border-red-500/30 text-red-600'}`}>
              <div className={`p-3 rounded-2xl ${isQuotaError ? 'bg-amber-500' : 'bg-red-500'} text-white shadow-lg`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm uppercase mb-1 font-black tracking-widest">{isQuotaError ? 'Limite de Uso (Quota)' : 'Atenção'}</p>
                <p className="font-light text-xs sm:text-sm leading-relaxed">{errorMsg}</p>
                {isQuotaError && (
                  <div className="mt-4 flex flex-wrap gap-3 justify-center sm:justify-start">
                    <button onClick={handleOpenKeyDialog} className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg"><Key className="w-4 h-4" /> Usar minha própria chave</button>
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-current rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-current/10">Docs <ExternalLink className="w-3 h-3" /></a>
                  </div>
                )}
              </div>
              <button onClick={() => { setErrorMsg(null); setIsQuotaError(false); }} className="p-2 opacity-40 hover:opacity-100"><X className="w-5 h-5" /></button>
          </div>
        )}

        {activeTab === 'restore' && (
          !imageState.originalPreview ? (
            <div className="grid md:grid-cols-2 gap-12 items-center min-h-[60vh] py-10">
              <div className="space-y-8">
                <h1 className={`text-5xl lg:text-7xl uppercase ${textMain} leading-tight`}>Suas <span className="text-indigo-600 font-bold">Memórias</span> eternas.</h1>
                <p className={`${textSub} text-lg max-w-sm`}>Restauração profissional e colorização movida por Inteligência Artificial.</p>
                <Uploader onImageSelect={handleImageSelect} />
              </div>
              <ChatAssistant cardBg={cardBg} isLight={isLight} apiChat={apiChat} />
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2 space-y-6">
                <div className={`${cardBg} rounded-[2.5rem] border p-2 min-h-[500px] flex items-center justify-center relative overflow-hidden shadow-2xl transition-all`}>
                  {imageState.processedPreview ? (
                    <ImageComparator 
                      original={imageState.originalPreview} 
                      processed={imageState.processedPreview} 
                      onDownload={() => handleDownloadImage(imageState.processedPreview)} 
                    />
                  ) : (
                    <img src={imageState.originalPreview} className="max-h-[75vh] rounded-[2rem] shadow-2xl" alt="Preview" />
                  )}
                </div>
                {imageState.processedPreview && (
                   <div className="flex gap-4 justify-center">
                      <Button onClick={handleApplyResult} className="bg-green-600 hover:bg-green-500 h-14 px-10" icon={Check}>Aplicar Melhoria</Button>
                      <Button onClick={() => handleDownloadImage(imageState.processedPreview)} variant="secondary" className="h-14 px-10" icon={Download}>Baixar Foto</Button>
                   </div>
                )}
              </div>
              <div className="space-y-6">
                <div className={`${cardBg} rounded-[2rem] border p-6 shadow-xl`}>
                   <h3 className="text-[10px] uppercase font-bold text-indigo-500 mb-6 tracking-widest flex items-center gap-2"><Wand2 className="w-4 h-4" /> Ferramentas</h3>
                   <div className="grid grid-cols-1 gap-2.5">
                    {RESTORATION_OPTIONS.map(opt => (
                      <ActionCard key={opt.id} option={opt} active={activeMode === opt.id && status === 'success'} onClick={() => handleProcess(opt.id)} isLight={isLight} />
                    ))}
                  </div>
                </div>
                <div className={`${cardBg} rounded-[2rem] border p-6 shadow-xl space-y-4`}>
                   <h3 className="text-[10px] uppercase font-bold text-indigo-500 tracking-widest flex items-center gap-2"><Edit3 className="w-4 h-4" /> Ajuste Fino</h3>
                   <textarea className={`w-full ${isLight ? 'bg-slate-50' : 'bg-slate-950'} rounded-2xl p-4 text-xs h-32 outline-none border border-white/5 focus:border-indigo-600 transition-all`} placeholder="Ex: 'Remover o risco verde no canto superior'..." value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} />
                   <Button onClick={() => handleProcess('custom')} className="w-full" disabled={!customPrompt.trim()} icon={Sparkles}>Processar Customizado</Button>
                </div>
                <Button onClick={handleFullReset} variant="ghost" className="w-full border border-white/5" icon={RotateCcw}>Novo Projeto</Button>
              </div>
            </div>
          )
        )}

        {activeTab === 'merge' && (
           <div className="grid md:grid-cols-2 gap-12 py-10">
              <div className="space-y-8">
                 <h1 className={`text-5xl lg:text-7xl uppercase ${textMain} leading-tight`}>Mesclar <span className="text-indigo-600 font-bold">Pessoas</span>.</h1>
                 <div className="grid grid-cols-2 gap-4">
                    <UploaderCompact label="Foto Base" current={mergeState.imageA} onSelect={(_:any, b:any, m:any) => setMergeState(p => ({...p, imageA: b, mimeTypeA: m}))} isLight={isLight} />
                    <UploaderCompact label="Referência" current={mergeState.imageB} onSelect={(_:any, b:any, m:any) => setMergeState(p => ({...p, imageB: b, mimeTypeB: m}))} isLight={isLight} />
                 </div>
                 <div className={`${cardBg} p-8 rounded-[2.5rem] border shadow-xl space-y-6`}>
                    <textarea className={`w-full ${isLight ? 'bg-slate-50' : 'bg-slate-950'} rounded-2xl p-4 text-sm h-40 outline-none border border-white/5 focus:border-indigo-600`} placeholder="Instrução de mesclagem (ex: Mescle os rostos mantendo o cabelo da Foto A)..." value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} />
                    <Button onClick={handleMergeAction} className="w-full h-16 uppercase font-bold" icon={Layers} disabled={!mergeState.imageA || !mergeState.imageB}>Criar Fusão</Button>
                 </div>
              </div>
              {mergeState.results ? (
                 <div className={`${cardBg} rounded-[2.5rem] border p-6 flex flex-col items-center justify-center min-h-[500px] shadow-2xl`}>
                    <img src={mergeState.results[0]} className="max-h-[60vh] rounded-3xl mb-8 shadow-2xl" />
                    <div className="flex gap-4 w-full">
                       <Button onClick={() => handleDownloadImage(mergeState.results![0])} className="flex-1 h-14" icon={Download}>Baixar</Button>
                       <Button onClick={() => setMergeState(p => ({...p, results: null}))} variant="secondary" className="flex-1 h-14" icon={RotateCcw}>Refazer</Button>
                    </div>
                 </div>
              ) : (
                <ChatAssistant cardBg={cardBg} isLight={isLight} apiChat={apiChat} />
              )}
           </div>
        )}

        {activeTab === 'generate' && (
           <div className="grid md:grid-cols-2 gap-12 py-10">
              <div className="space-y-8">
                 <h1 className={`text-5xl lg:text-7xl uppercase ${textMain} leading-tight`}>Gerar <span className="text-indigo-600 font-bold">Artes</span>.</h1>
                 <div className="flex items-center gap-6">
                    <div className="w-32 h-32"><UploaderCompact label="Ref. Visual" current={generateState.baseImage} onSelect={(_:any, b:any, m:any) => setGenerateState(p => ({...p, baseImage: b, baseMimeType: m}))} isLight={isLight} /></div>
                    <div className="flex-1 space-y-1"><p className="text-xs uppercase font-bold text-indigo-500">Imagem de Guia</p><p className={`${textSub} text-[10px]`}>Opcional. Use uma foto para guiar a composição.</p></div>
                 </div>
                 <div className={`${cardBg} p-8 rounded-[2.5rem] border shadow-xl space-y-6`}>
                    <textarea className={`w-full ${isLight ? 'bg-slate-50' : 'bg-slate-950'} rounded-2xl p-4 text-sm h-40 outline-none border border-white/5 focus:border-indigo-600`} placeholder="Descreva o que deseja criar..." value={generateState.prompt} onChange={e => setGenerateState(p => ({...p, prompt: e.target.value}))} />
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <p className="text-[10px] uppercase font-bold text-slate-500">Proporção</p>
                           <div className="flex bg-black/20 p-1 rounded-xl">
                              <button onClick={() => setAspectRatio('1:1')} className={`flex-1 flex justify-center py-2 rounded-lg transition-all ${aspectRatio === '1:1' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><Square className="w-4 h-4" /></button>
                              <button onClick={() => setAspectRatio('16:9')} className={`flex-1 flex justify-center py-2 rounded-lg transition-all ${aspectRatio === '16:9' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><RectangleHorizontal className="w-4 h-4" /></button>
                           </div>
                        </div>
                        <div className="space-y-2">
                           <p className="text-[10px] uppercase font-bold text-slate-500">Variações</p>
                           <div className="flex bg-black/20 p-1 rounded-xl">
                              {[1, 2, 4].map(n => (
                                <button key={n} onClick={() => setGenerateCount(n)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${generateCount === n ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{n}x</button>
                              ))}
                           </div>
                        </div>
                    </div>

                    <Button onClick={handleGenerateAction} className="w-full h-16 uppercase font-bold" icon={Sparkles} disabled={!generateState.prompt.trim()}>Criar Agora</Button>
                 </div>
              </div>
              {generateState.results ? (
                 <div className={`${cardBg} rounded-[2.5rem] border p-6 flex flex-col items-center justify-center min-h-[500px] shadow-2xl`}>
                    <img src={generateState.results[generateState.resultIndex]} className="max-h-[60vh] rounded-3xl mb-8 shadow-2xl" />
                    {generateState.results.length > 1 && (
                      <div className="flex gap-4 mb-6 items-center">
                        <button onClick={() => setGenerateState(p => ({...p, resultIndex: (p.resultIndex - 1 + p.results!.length) % p.results!.length}))} className="p-2 bg-slate-800 rounded-full"><ChevronLeft /></button>
                        <span className="text-xs font-bold uppercase tabular-nums">{generateState.resultIndex + 1} / {generateState.results.length}</span>
                        <button onClick={() => setGenerateState(p => ({...p, resultIndex: (p.resultIndex + 1) % p.results!.length}))} className="p-2 bg-slate-800 rounded-full"><ChevronRight /></button>
                      </div>
                    )}
                    <div className="flex gap-4 w-full">
                       <Button onClick={() => handleDownloadImage(generateState.results![generateState.resultIndex])} className="flex-1 h-14" icon={Download}>Baixar</Button>
                       <Button onClick={() => setGenerateState(p => ({...p, results: null}))} variant="secondary" className="flex-1 h-14" icon={RotateCcw}>Novo</Button>
                    </div>
                 </div>
              ) : (
                <ChatAssistant cardBg={cardBg} isLight={isLight} apiChat={apiChat} />
              )}
           </div>
        )}
      </main>

      <nav className={`md:hidden fixed bottom-4 left-4 right-4 z-50 p-2 rounded-[2.5rem] border backdrop-blur-3xl flex justify-between shadow-2xl ${isLight ? 'bg-white/95 border-slate-300' : 'bg-slate-950/80 border-slate-800'}`}>
         {(['restore', 'merge', 'generate'] as AppTab[]).map(tab => (
           <button key={tab} onClick={() => { setActiveTab(tab); setStatus('idle'); setErrorMsg(null); }} className={`flex-1 py-4 flex flex-col items-center gap-1.5 rounded-[2rem] transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500'}`}>
             {tab === 'restore' ? <RotateCcw className="w-5 h-5" /> : tab === 'merge' ? <Layers className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
             <span className="text-[8px] uppercase font-bold tracking-widest">{tab === 'restore' ? 'Restaurar' : tab === 'merge' ? 'Mesclar' : 'Gerar'}</span>
           </button>
         ))}
      </nav>

      <Modal isOpen={showAbout} onClose={() => setShowAbout(false)} title="Sobre RestaurAIlma" isLight={isLight}>
        <div className="space-y-8 text-center">
          <div className="aspect-square rounded-[2rem] overflow-hidden border border-indigo-600/20 relative shadow-2xl bg-black">
            <AboutCarousel showcase={ABOUT_SHOWCASE} />
          </div>
          <div className="space-y-4 px-2">
            <h4 className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">A Nossa Missão</h4>
            <p className="text-sm font-light leading-relaxed opacity-80">
              A <strong>RestaurAIlma</strong> nasceu para eternizar o que o tempo tenta apagar. Usamos tecnologia de ponta para devolver a cor e o detalhe às suas memórias mais valiosas.
            </p>
            <p className="italic text-xs text-indigo-500/60 pt-4">"Em homenagem à Ilma, cujo brilho nunca se apagará."</p>
          </div>
          <div className="flex justify-center gap-4 text-[9px] font-bold uppercase tracking-widest opacity-40">
            <span>v2.7.0-PRO-SHOWCASE</span>
            <span>•</span>
            <span>Gemini IA Engine</span>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title="Meu Histórico" isLight={isLight}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
          {history.length === 0 ? (
            <div className="py-12 text-center opacity-30"><History className="w-12 h-12 mx-auto mb-2" /><p className="text-xs uppercase">Vazio</p></div>
          ) : (
            history.map(item => (
              <div key={item.id} className="flex gap-4 p-4 rounded-3xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                <img src={item.processed} className="w-20 h-20 object-cover rounded-2xl border border-white/10" />
                <div className="flex-1 flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase text-indigo-500 mb-1">{item.mode}</span>
                  <span className="text-[9px] opacity-40">{new Date(item.timestamp).toLocaleDateString()}</span>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleDownloadImage(item.processed)} className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg"><Download className="w-3 h-3" /></button>
                    <button onClick={() => setHistory(h => h.filter(x => x.id !== item.id))} className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Configurações" isLight={isLight}>
        <div className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase opacity-50 tracking-widest">Tema Visual</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/50 rounded-2xl border border-white/5">
              <button onClick={() => setSettings(s => ({ ...s, theme: 'dark' }))} className={`py-3 rounded-xl text-xs font-bold transition-all ${!isLight ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Escuro</button>
              <button onClick={() => setSettings(s => ({ ...s, theme: 'light' }))} className={`py-3 rounded-xl text-xs font-bold transition-all ${isLight ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Claro</button>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase opacity-50 tracking-widest">Modelo de IA</label>
            <select 
              value={settings.preferredModel}
              onChange={e => setSettings(s => ({ ...s, preferredModel: e.target.value }))}
              className={`w-full ${isLight ? 'bg-slate-100 text-slate-900 border-slate-300' : 'bg-slate-800 text-white border-white/5'} rounded-2xl p-4 text-xs outline-none focus:border-indigo-500`}
            >
              <option value="gemini-2.5-flash-image">Gemini 2.5 Flash (Rápido)</option>
              <option value="gemini-3-pro-image-preview">Gemini 3 Pro (Alta Qualidade - Requer Chave Própria)</option>
            </select>
          </div>
          <Button onClick={handleOpenKeyDialog} className="w-full h-14 bg-amber-600 hover:bg-amber-500" icon={Key}>Trocar Chave de API</Button>
        </div>
      </Modal>
    </div>
  );
}

// Sub-components
function LoaderOverlay() {
  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-3xl z-[200] flex flex-col items-center justify-center text-center p-6">
      <div className="relative mb-10">
        <div className="w-24 h-24 border-[6px] border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Wand2 className="w-8 h-8 text-indigo-400 animate-pulse" />
        </div>
      </div>
      <p className="text-2xl font-extralight uppercase text-white tracking-[0.4em] animate-pulse">Processando</p>
      <p className="text-[10px] text-slate-500 mt-4 uppercase tracking-[0.2em] max-w-xs leading-relaxed">
        Recriando pixels perdidos no tempo para trazer sua memória de volta à vida.
      </p>
    </div>
  );
}

function ChatAssistant({ cardBg, isLight, apiChat }: any) {
  const [messages, setMessages] = useState([{ role: 'model', text: 'Olá! Sou o assistente da RestaurAIlma. Como posso ajudar com suas fotos hoje?' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const resp = await apiChat(msg);
      setMessages(prev => [...prev, { role: 'model', text: resp }]);
    } catch {
      setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, tive um problema de conexão.' }]);
    } finally { setLoading(false); }
  };

  return (
    <div className={`${cardBg} rounded-[2.5rem] border overflow-hidden flex flex-col h-[500px] shadow-2xl`}>
      <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/5">
        <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Concierge IA
        </span>
        <MessageSquare className="w-4 h-4 text-indigo-500" />
      </div>
      <div ref={scrollRef} className="flex-1 p-5 space-y-4 overflow-y-auto no-scrollbar scroll-smooth">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-[11px] border ${m.role === 'user' ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-white/5 border-white/10 text-slate-200'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-[9px] uppercase font-bold text-indigo-500/50 animate-pulse">IA está digitando...</div>}
      </div>
      <div className="p-4 border-t border-white/5 bg-black/5 flex gap-2">
        <input 
          className={`flex-1 ${isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-slate-950 text-white border-white/5'} rounded-2xl px-5 py-3 text-xs outline-none border focus:border-indigo-600 transition-all shadow-inner`}
          placeholder="Tire suas dúvidas..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend} className="p-3 text-indigo-500 hover:scale-110 transition-transform"><Send className="w-5 h-5" /></button>
      </div>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children, isLight }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={onClose} />
      <div className={`relative w-full max-w-md ${isLight ? 'bg-white text-slate-950' : 'bg-slate-900 text-white'} rounded-[3rem] border border-white/5 overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300`}>
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em]">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}

function ActionCard({ option, active, onClick, isLight }: any) {
  return (
    <button onClick={onClick} className={`flex items-center p-5 rounded-[1.5rem] border text-left transition-all w-full group ${active ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl translate-x-1' : isLight ? 'bg-slate-50 border-slate-200 hover:border-indigo-300' : 'bg-white/5 border-white/5 hover:border-indigo-500/30'}`}>
      <div className={`p-3 rounded-2xl mr-4 transition-all ${active ? 'bg-white/20' : 'bg-indigo-600/10 text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white shadow-lg'}`}>
        <option.icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <div className="text-[11px] font-bold uppercase tracking-tight">{option.label}</div>
        <div className="text-[9px] opacity-60 font-light line-clamp-1">{option.description}</div>
      </div>
    </button>
  );
}

function UploaderCompact({ label, current, onSelect, isLight }: any) {
  return (
    <label className={`aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all hover:border-indigo-600 relative overflow-hidden w-full ${isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-900/40 border-slate-700'}`}>
      {current ? <img src={current} className="w-full h-full object-cover" /> : (
        <div className="text-center p-2">
          <ImageIcon className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest">{label}</span>
        </div>
      )}
      <input 
        type="file" 
        className="hidden" 
        accept="image/*"
        onChange={(e: any) => { 
          const f = e.target.files[0]; 
          if (f) { 
            const r = new FileReader(); 
            r.onloadend = () => onSelect(f, r.result, f.type); 
            r.readAsDataURL(f); 
          } 
        }} 
      />
    </label>
  );
}

function AboutCarousel({ showcase }: { showcase: Array<{url: string, title: string, desc: string}> }) {
  const [idx, setIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<any>(null);

  const startInterval = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setIdx(p => (p + 1) % showcase.length);
    }, 5000);
  };

  useEffect(() => {
    startInterval();
    return () => clearInterval(intervalRef.current);
  }, [showcase.length]);

  const goToNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIdx(p => (p + 1) % showcase.length);
    startInterval();
  };

  const goToPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIdx(p => (p - 1 + showcase.length) % showcase.length);
    startInterval();
  };

  return (
    <div 
      className="relative w-full h-full group bg-black"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showcase.map((item, i) => (
        <div 
          key={i}
          className={`absolute inset-0 transition-all duration-1000 ${idx === i ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}
        >
          <img 
            src={item.url} 
            className="w-full h-full object-cover opacity-60" 
            alt={item.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end p-8 text-left">
            <h4 className="text-white font-bold text-lg mb-1">{item.title}</h4>
            <p className="text-indigo-200/80 text-xs font-light">{item.desc}</p>
          </div>
        </div>
      ))}
      
      {/* Controles */}
      <div className={`absolute inset-0 flex items-center justify-between px-4 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
        <button 
          onClick={goToPrev}
          className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/10 hover:bg-indigo-600 transition-all hover:scale-110"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button 
          onClick={goToNext}
          className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/10 hover:bg-indigo-600 transition-all hover:scale-110"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Indicadores */}
      <div className="absolute top-6 left-0 right-0 flex justify-center gap-2 px-4">
        {showcase.map((_, i) => (
          <button 
            key={i} 
            onClick={() => { setIdx(i); startInterval(); }}
            className={`h-1 transition-all duration-500 rounded-full ${idx === i ? 'w-10 bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.8)]' : 'w-4 bg-white/20 hover:bg-white/40'}`}
          />
        ))}
      </div>

      {/* Badge de Progresso */}
      <div className="absolute bottom-6 right-6 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[8px] font-bold text-white tracking-widest uppercase">
        {idx + 1} / {showcase.length}
      </div>
    </div>
  );
}

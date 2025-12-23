
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Wand2, Palette, ScanLine, Sparkles, RotateCcw,
  Settings, History, X, Clock, Zap, MessageSquare, RefreshCw, 
  Maximize2, ImageOff, Heart, Info, Send, Layers, 
  Image as ImageIcon, Undo2, Redo2, Download, Trash2,
  ChevronLeft, ChevronRight, AlertCircle, Square, RectangleHorizontal, Check,
  Edit3
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
  const [mergeCount, setMergeCount] = useState(1);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [activeMode, setActiveMode] = useState<RestorationMode | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
    setErrorMsg(err.message || "Erro de conexão com o servidor Next.js.");
    setStatus('error');
  };

  const handleImageSelect = (file: File, base64: string, mimeType: string) => {
    setImageState({ file, originalPreview: base64, processedPreview: null, mimeType, history: [], future: [] });
    setErrorMsg(null);
    setStatus('idle');
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
    try {
      const results = await apiMerge(mergeState.imageA, mergeState.mimeTypeA, mergeState.imageB, mergeState.mimeTypeB, customPrompt || 'Fusão realista.', mergeCount);
      setMergeState(prev => ({ ...prev, results: results.map((r: any) => r.base64), resultIndex: 0 }));
      setStatus('success');
    } catch (err: any) { handleApiError(err); }
  };

  const handleGenerateAction = async () => {
    if (!generateState.prompt) return;
    setStatus('processing');
    setErrorMsg(null);
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
    setErrorMsg(null);
  };

  const handleDownloadImage = (img: string | null) => {
    if (!img) return;
    const link = document.createElement('a');
    link.href = img;
    link.download = `restaurailma-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-300 text-slate-950' : 'bg-slate-950 text-white'} transition-colors duration-300 pb-24 md:pb-20`}>
      <header className={`border-b ${isLight ? 'border-slate-400 bg-white/95 shadow-sm' : 'border-slate-800 bg-slate-900/50'} backdrop-blur-md sticky top-0 z-50 h-16 md:h-20`}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <button className="flex items-center gap-2 md:gap-5 group py-2" onClick={handleFullReset}>
            <div className="w-9 h-9 md:w-11 md:h-11 overflow-hidden rounded-2xl border border-white/20 bg-slate-800 flex items-center justify-center shadow-lg">
              <img src={LOGO_THUMBNAIL_URL} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className={`text-base md:text-2xl lg:text-3xl tracking-[0.25em] flex items-center uppercase ${textMain}`}>
               RESTAUR<span className="text-indigo-600 font-bold">A</span><span className="font-bold text-indigo-600">I</span>LMA
            </div>
          </button>
          
          <nav className="hidden md:flex items-center p-1 rounded-2xl border backdrop-blur-sm bg-slate-800/20 border-slate-400/30">
             <button onClick={() => { setActiveTab('restore'); setStatus('idle'); }} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs uppercase font-bold transition-all ${activeTab === 'restore' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}><RefreshCw className="w-3 h-3" /> Restaurar</button>
             <button onClick={() => { setActiveTab('merge'); setStatus('idle'); }} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs uppercase font-bold transition-all ${activeTab === 'merge' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}><Layers className="w-3 h-3" /> Mesclar</button>
             <button onClick={() => { setActiveTab('generate'); setStatus('idle'); }} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs uppercase font-bold transition-all ${activeTab === 'generate' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}><ImageIcon className="w-3 h-3" /> Gerar</button>
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowAbout(true)} className={`p-2 ${utilityIconColor}`}><Info className="w-5 h-5" /></button>
            <button onClick={() => setShowHistory(true)} className={`p-2 ${utilityIconColor}`}><History className="w-5 h-5" /></button>
            <button onClick={() => setShowSettings(true)} className={`p-2 ${utilityIconColor}`}><Settings className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 relative">
        {status === 'processing' && <LoaderOverlay />}

        {errorMsg && (
          <div className="mb-6 p-5 rounded-3xl border bg-red-500/10 border-red-500/30 text-red-600 text-xs font-bold shadow-xl flex items-center gap-4 animate-bounce">
              <AlertCircle className="w-5 h-5" />
              <div className="flex-1"><p className="text-sm uppercase mb-1">Erro</p><p className="font-light">{errorMsg}</p></div>
              <button onClick={() => { setErrorMsg(null); setStatus('idle'); }}><X className="w-5 h-5" /></button>
          </div>
        )}

        {activeTab === 'restore' && (
          !imageState.originalPreview ? (
            <div className="grid md:grid-cols-2 gap-12 items-center min-h-[60vh] py-10">
              <div className="space-y-6">
                <h1 className={`text-4xl lg:text-6xl uppercase ${textMain} leading-tight`}>Dê vida nova às suas <span className="text-yellow-500 font-bold">fotos</span>.</h1>
                <p className={`${textSub} text-sm max-w-sm tracking-soft`}>Next.js + Gemini Flash: restauração de alto nível para suas memórias.</p>
                <Uploader onImageSelect={handleImageSelect} />
              </div>
              <ChatAssistant cardBg={cardBg} isLight={isLight} apiChat={apiChat} />
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2 space-y-6">
                <div className={`${cardBg} rounded-3xl border p-2 min-h-[400px] flex items-center justify-center relative overflow-hidden`}>
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
                   <div className="flex gap-4 justify-center">
                      <Button onClick={handleApplyResult} className="bg-green-600 hover:bg-green-500" icon={Check}>Aplicar</Button>
                      <Button onClick={() => handleDownloadImage(imageState.processedPreview)} variant="secondary" icon={Download}>Baixar</Button>
                   </div>
                )}
              </div>
              <div className="space-y-6">
                <div className={`${cardBg} rounded-3xl border p-5 shadow-xl`}>
                   <h2 className="text-[10px] uppercase font-bold text-indigo-600 mb-4">Métodos de Restauração</h2>
                   <div className="grid grid-cols-1 gap-2.5">
                    {RESTORATION_OPTIONS.map(opt => (
                      <ActionCard key={opt.id} option={opt} active={activeMode === opt.id && status === 'success'} onClick={() => handleProcess(opt.id)} isLight={isLight} />
                    ))}
                  </div>
                </div>
                <Button onClick={handleFullReset} variant="ghost" className="w-full border" icon={RotateCcw}>Limpar</Button>
              </div>
            </div>
          )
        )}

        {activeTab === 'merge' && (
           <div className="grid md:grid-cols-2 gap-12 py-10">
              <div className="space-y-8">
                 <h1 className={`text-4xl lg:text-6xl uppercase ${textMain} leading-tight`}>Mescle <span className="text-yellow-500 font-bold">pessoas</span>.</h1>
                 <div className="grid grid-cols-2 gap-4">
                    <UploaderCompact label="Foto A" current={mergeState.imageA} onSelect={(_:any, b:any, m:any) => setMergeState(p => ({...p, imageA: b, mimeTypeA: m}))} isLight={isLight} />
                    <UploaderCompact label="Foto B" current={mergeState.imageB} onSelect={(_:any, b:any, m:any) => setMergeState(p => ({...p, imageB: b, mimeTypeB: m}))} isLight={isLight} />
                 </div>
                 <div className={`${cardBg} p-6 rounded-3xl border shadow-xl space-y-4`}>
                    <textarea className={`w-full ${isLight ? 'bg-slate-50 text-slate-900 border-slate-300' : 'bg-slate-950 text-white border-slate-800'} rounded-xl p-4 text-sm h-32 outline-none border focus:border-indigo-600`} placeholder="Instrução de mesclagem..." value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} />
                    <Button onClick={handleMergeAction} className="w-full h-14 uppercase font-bold" icon={Layers}>Gerar Fusão</Button>
                 </div>
              </div>
              {mergeState.results ? (
                 <ResultsGallery results={mergeState.results} currentIndex={mergeState.resultIndex} onIndexChange={(idx: number) => setMergeState(p => ({...p, resultIndex: idx}))} onDownload={() => handleDownloadImage(mergeState.results![mergeState.resultIndex])} cardBg={cardBg} onReset={() => setMergeState(p => ({...p, results: null}))} />
              ) : (
                <ChatAssistant cardBg={cardBg} isLight={isLight} apiChat={apiChat} />
              )}
           </div>
        )}
        
        {/* Implementação simplificada de Geração */}
      </main>

      {/* Modais e Componentes de Apoio */}
      <Modal isOpen={showAbout} onClose={() => setShowAbout(false)} title="Sobre RestaurAIlma" isLight={isLight}>
        <div className="space-y-8 text-center">
          <div className="relative w-full aspect-square rounded-[2rem] overflow-hidden border border-indigo-600/20 shadow-2xl">
             <AboutCarousel images={ABOUT_CAROUSEL_IMAGES} />
          </div>
          <p className="italic text-sm text-indigo-400">"para conservar a memória de quem nos trouxe até aqui - S2 Ilma"</p>
        </div>
      </Modal>
    </div>
  );
}

function LoaderOverlay() {
  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[200] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <p className="text-lg font-bold uppercase text-white tracking-widest">Processando na Vercel...</p>
      <p className="text-[10px] text-slate-400 mt-2 uppercase">A inteligência artificial está recriando seus momentos.</p>
    </div>
  );
}

function ResultsGallery({ results, currentIndex, onIndexChange, onDownload, onReset, cardBg }: any) {
  return (
    <div className={`${cardBg} rounded-3xl border p-4 flex flex-col items-center justify-center min-h-[400px] shadow-2xl`}>
      <img src={results[currentIndex]} className="max-h-[50vh] rounded-2xl mb-6 shadow-xl" />
      <div className="flex gap-4 w-full">
         <Button onClick={onDownload} className="flex-1" icon={Download}>Baixar</Button>
         <Button onClick={onReset} variant="secondary" className="flex-1">Refazer</Button>
      </div>
    </div>
  );
}

function UploaderCompact({ label, current, onSelect, isLight }: any) {
  return (
    <label className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all hover:border-indigo-600 relative overflow-hidden w-full ${isLight ? 'bg-slate-50 border-slate-400' : 'bg-slate-900/40 border-slate-700'}`}>
      {current ? <img src={current} className="w-full h-full object-cover" /> : <div className="text-center p-2"><ImageIcon className="w-6 h-6 mx-auto mb-1 text-indigo-600" /><span className="text-[10px] uppercase font-bold text-slate-500">{label}</span></div>}
      <input type="file" className="hidden" onChange={(e:any) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onloadend = () => onSelect(f, r.result, f.type); r.readAsDataURL(f); } }} />
    </label>
  );
}

function ChatAssistant({ cardBg, isLight, apiChat }: any) {
  const [messages, setMessages] = useState([{ role: 'model', text: 'Olá! Como posso ajudar?' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const response = await apiChat(msg);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'model', text: 'Erro de comunicação.' }]);
    } finally { setLoading(false); }
  };

  return (
    <div className={`${cardBg} rounded-[2rem] border h-[400px] flex flex-col overflow-hidden shadow-xl`}>
      <div className="p-4 border-b border-slate-800 bg-black/10 flex items-center justify-between text-[10px] font-bold uppercase">Concierge IA <MessageSquare className="w-4 h-4 text-indigo-600" /></div>
      <div className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-[11px] border ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800'}`}>{m.text}</div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-slate-800 flex items-center gap-2">
          <input type="text" className="flex-1 bg-slate-950 text-white border-slate-800 rounded-xl py-2 px-4 text-xs" placeholder="Escreva aqui..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
          <button onClick={handleSend} className="text-indigo-500"><Send className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children, isLight }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" onClick={onClose} />
      <div className={`relative w-full max-w-md ${isLight ? 'bg-white' : 'bg-slate-900'} rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between font-bold text-xs uppercase">{title} <button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ActionCard({ option, active, onClick, isLight }: any) {
  return (
    <button onClick={onClick} className={`flex items-center p-3.5 rounded-2xl border text-left transition-all w-full ${active ? 'bg-indigo-600 text-white' : 'bg-slate-800 border-slate-700'}`}>
      <div className={`p-2 rounded-xl mr-3.5 ${active ? 'bg-white/20' : 'bg-indigo-600/10 text-indigo-600'}`}><option.icon className="w-4 h-4" /></div>
      <div className="flex-1">
        <div className="text-[10px] uppercase font-bold">{option.label}</div>
        <div className="text-[8px] opacity-70">{option.description}</div>
      </div>
    </button>
  );
}

function AboutCarousel({ images }: any) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % images.length), 3000);
    return () => clearInterval(t);
  }, [images.length]);
  return <img src={images[idx]} className="w-full h-full object-cover transition-opacity duration-1000" />;
}


import React, { useState, useEffect, useRef } from 'react';
import { 
  Wand2, Palette, Eraser, ScanLine, Sparkles, RotateCcw,
  Settings, History, X, Clock, Zap, Trash2, AlertTriangle,
  Cpu, CheckCircle2, Search, Check, Key, ExternalLink, MessageSquare, RefreshCw, Maximize2, Camera, ImageOff, Heart, Info, Send, Layers, Image as ImageIcon, ArrowLeft, Undo2, Redo2, Download, Minimize2, Edit3, Moon, Sun
} from 'lucide-react';

import { Uploader } from './components/Uploader';
import { ImageComparator } from './components/ImageComparator';
import { Button } from './components/Button';
import { processImage, mergeImages, getAvailableModels, generateImageFromPrompt } from './services/geminiService';
import { GoogleGenAI } from "@google/genai";
import { ImageState, MergeState, AppTab, ProcessingStatus, RestorationMode, ActionOption, HistoryItem, AppSettings, ProcessResult, GenerateState } from './types';

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
    prompt: 'Background removal: Remove the background completely, isolating the main subject. Ensure the edges are clean and output a high-quality result ready for PNG export.'
  },
  {
    id: 'upscale',
    label: 'Upscale (4K)',
    icon: Maximize2,
    description: 'Aumenta a resolução e remove pixelização.',
    prompt: 'Super-resolution upscale: Increase image resolution significantly, maintaining sharp details and removing pixelation while preserving the original content perfectly.'
  },
  {
    id: 'restore',
    label: 'Limpar Danos',
    icon: ScanLine,
    description: 'Remove riscos, rasgos e manchas físicas.',
    prompt: 'Heavy restoration: fix physical damage like tears, scratches, fold lines, and liquid stains.'
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
    prompt: 'Image enhancement: fine-tune contrast, sharpen features, and remove mild blur.'
  }
];

const LOGO_THUMBNAIL_URL = "https://drive.google.com/thumbnail?id=1HDrJBoLQcPsSduQvx1GX5Vs9MkkIbwLA&sz=w800";
const SECOND_ABOUT_IMAGE = "https://drive.google.com/thumbnail?id=1siGvNVD186qQmut3tWTXbQloKrUaickB&sz=w800";
const THIRD_ABOUT_IMAGE = "https://drive.google.com/thumbnail?id=16-788ZCK7vsexkBpYYwy7LEYG1QKrsi7&sz=w800";

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('restore');
  const [imageState, setImageState] = useState<ImageState>({
    file: null, originalPreview: null, processedPreview: null, mimeType: ''
  });
  
  const [previousStates, setPreviousStates] = useState<{processed: string, description: string | null}[]>([]);
  const [redoStates, setRedoStates] = useState<{processed: string, description: string | null}[]>([]);

  const [previousMergeStates, setPreviousMergeStates] = useState<{result: string, description: string | null}[]>([]);
  const [redoMergeStates, setRedoMergeStates] = useState<{result: string, description: string | null}[]>([]);

  const [previousGenerateStates, setPreviousGenerateStates] = useState<{results: string[], index: number, description: string | null}[]>([]);
  const [redoGenerateStates, setRedoGenerateStates] = useState<{results: string[], index: number, description: string | null}[]>([]);

  const [mergeState, setMergeState] = useState<MergeState>({
    imageA: null, imageB: null, mimeTypeA: '', mimeTypeB: '', results: null, resultIndex: 0
  });
  const [mergeCount, setMergeCount] = useState(1);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [activeMode, setActiveMode] = useState<RestorationMode | null>(null);
  const [imageDescription, setImageDescription] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [generateState, setGenerateState] = useState<GenerateState>({
    prompt: '', baseImage: null, baseMimeType: null, results: null, resultIndex: 0
  });
  const [generateCount, setGenerateCount] = useState(1);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([
    { role: 'assistant', text: 'Olá! Sou seu assistente de memória. Como posso ajudar a restaurar, mesclar ou criar suas fotos hoje?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('restaurai_settings');
    return saved ? JSON.parse(saved) : { language: 'pt', theme: 'dark', preferredModel: 'gemini-2.5-flash-image' };
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const isLight = settings.theme === 'light';
  // Fundo dos cards levemente mais saturado para contraste com o novo fundo slate-200
  const cardBg = isLight ? 'bg-slate-100/95 shadow-lg border-slate-300' : 'bg-slate-900/80 shadow-2xl border-slate-800';
  const textMain = isLight ? 'text-slate-950 font-light' : 'text-white';
  const textSub = isLight ? 'text-slate-800 font-light' : 'text-slate-400';

  useEffect(() => {
    localStorage.setItem('restaurai_settings', JSON.stringify(settings));
    if (isLight) {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
  }, [settings, isLight]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleKeySelect = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
    } catch (e) { console.error(e); }
  };

  const handleImageSelect = (file: File, base64: string, mimeType: string) => {
    setImageState({ file, originalPreview: base64, processedPreview: null, mimeType });
    setImageDescription(null);
    setPreviousStates([]);
    setRedoStates([]);
    setStatus('idle');
    setErrorMsg(null);
  };

  const handleMergeImageSelect = (slot: 'A' | 'B', file: File, base64: string, mimeType: string) => {
    setMergeState(prev => ({
      ...prev,
      [slot === 'A' ? 'imageA' : 'imageB']: base64,
      [slot === 'A' ? 'mimeTypeA' : 'mimeTypeB']: mimeType,
      results: null
    }));
    setPreviousMergeStates([]);
    setRedoMergeStates([]);
    setStatus('idle');
  };

  const handleGenerateBaseImageSelect = (file: File, base64: string, mimeType: string) => {
    setGenerateState(prev => ({
      ...prev,
      baseImage: base64,
      baseMimeType: mimeType,
      results: null
    }));
    setStatus('idle');
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userText = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsChatLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userText,
        config: {
          systemInstruction: 'Você é um guia especializado do RestaurAIlma. Ajude o usuário a entender como restaurar, mesclar ou criar fotos. Seja acolhedor.',
        }
      });
      setChatMessages(prev => [...prev, { role: 'assistant', text: response.text || 'Tive um problema ao processar sua pergunta.' }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Houve um erro na comunicação.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleProcess = async (mode: RestorationMode, useProcessedAsBase = false) => {
    const baseImage = useProcessedAsBase ? imageState.processedPreview : imageState.originalPreview;
    if (!baseImage) return;

    setStatus('processing');
    setActiveMode(mode);
    setErrorMsg(null);

    if (useProcessedAsBase && imageState.processedPreview) {
      setPreviousStates(prev => [...prev, {
        processed: imageState.processedPreview!,
        description: imageDescription
      }]);
      setRedoStates([]);
    }

    const promptBase = mode === 'custom' ? customPrompt : RESTORATION_OPTIONS.find(o => o.id === mode)?.prompt || '';
    const finalPrompt = useProcessedAsBase 
      ? `A imagem enviada já é o resultado de uma restauração anterior. Aplique agora as seguintes instruções ADICIONAIS sobre este resultado específico: ${promptBase}.`
      : promptBase;

    try {
      const result = await processImage(baseImage, imageState.mimeType, finalPrompt, settings.preferredModel);
      setImageState(prev => ({ ...prev, processedPreview: result.base64 }));
      setImageDescription(result.description || null);
      
      setHistory(prev => [{
        id: Date.now().toString(),
        original: imageState.originalPreview!,
        processed: result.base64,
        mode,
        timestamp: Date.now(),
        genModel: result.model,
        description: result.description
      }, ...prev].slice(0, 10));
      setStatus('success');
      setCustomPrompt('');
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const handleRefineMerge = async (mode: RestorationMode) => {
    const activeResult = mergeState.results?.[mergeState.resultIndex];
    if (!activeResult) return;

    setStatus('processing');
    setActiveMode(mode);
    setErrorMsg(null);

    setPreviousMergeStates(prev => [...prev, { result: activeResult, description: imageDescription }]);
    setRedoMergeStates([]);

    const promptBase = mode === 'custom' ? customPrompt : RESTORATION_OPTIONS.find(o => o.id === mode)?.prompt || '';
    const finalPrompt = `Refine este resultado com a seguinte instrução: ${promptBase}.`;

    try {
      const result = await processImage(activeResult, 'image/png', finalPrompt, settings.preferredModel);
      const newResults = [...(mergeState.results || [])];
      newResults[mergeState.resultIndex] = result.base64;
      setMergeState(prev => ({ ...prev, results: newResults }));
      setImageDescription(result.description || null);
      setStatus('success');
      setCustomPrompt('');
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const handleGenerate = async (isRefining = false) => {
    const currentPrompt = isRefining ? customPrompt : generateState.prompt;
    if (!currentPrompt.trim()) return;
    
    setStatus('processing');
    setErrorMsg(null);

    const baseImg = isRefining 
      ? { data: generateState.results![generateState.resultIndex], mimeType: 'image/png' }
      : (generateState.baseImage ? { data: generateState.baseImage, mimeType: generateState.baseMimeType! } : undefined);

    if (isRefining && generateState.results) {
      setPreviousGenerateStates(prev => [...prev, { 
        results: generateState.results!, 
        index: generateState.resultIndex, 
        description: imageDescription 
      }]);
      setRedoGenerateStates([]);
    }

    try {
      const results = await generateImageFromPrompt(currentPrompt, isRefining ? 1 : generateCount, aspectRatio, baseImg);
      
      if (isRefining) {
        const newResults = [...(generateState.results || [])];
        newResults[generateState.resultIndex] = results[0].base64;
        setGenerateState(prev => ({ ...prev, results: newResults }));
      } else {
        setGenerateState(prev => ({ ...prev, results: results.map(r => r.base64), resultIndex: 0 }));
      }
      
      setImageDescription(results[0].description || null);
      setStatus('success');
      if (isRefining) setCustomPrompt('');
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const handleUndoGenerate = () => {
    if (previousGenerateStates.length === 0 || !generateState.results) return;
    const lastGenerateState = previousGenerateStates[previousGenerateStates.length - 1];
    setRedoGenerateStates(prev => [{ results: generateState.results!, index: generateState.resultIndex, description: imageDescription }, ...prev]);
    setGenerateState(prev => ({ ...prev, results: lastGenerateState.results, resultIndex: lastGenerateState.index }));
    setImageDescription(lastGenerateState.description);
    setPreviousGenerateStates(prev => prev.slice(0, -1));
  };

  const handleRedoGenerate = () => {
    if (redoGenerateStates.length === 0 || !generateState.results) return;
    setPreviousGenerateStates(prev => [...prev, { results: generateState.results!, index: generateState.resultIndex, description: imageDescription }]);
    const nextState = redoGenerateStates[0];
    setGenerateState(prev => ({ ...prev, results: nextState.results, resultIndex: nextState.index }));
    setImageDescription(nextState.description);
    setRedoGenerateStates(prev => prev.slice(1));
  };

  const handleUndoRestore = () => {
    if (previousStates.length === 0 || !imageState.processedPreview) return;
    const lastRestoreState = previousStates[previousStates.length - 1];
    setRedoStates(prev => [{ processed: imageState.processedPreview!, description: imageDescription }, ...prev]);
    setImageState(prev => ({ ...prev, processedPreview: lastRestoreState.processed }));
    setImageDescription(lastRestoreState.description);
    setPreviousStates(prev => prev.slice(0, -1));
  };

  const handleRedoRestore = () => {
    if (redoStates.length === 0 || !imageState.processedPreview) return;
    setPreviousStates(prev => [...prev, { processed: imageState.processedPreview!, description: imageDescription }]);
    const nextState = redoStates[0];
    setImageState(prev => ({ ...prev, processedPreview: nextState.processed }));
    setImageDescription(nextState.description);
    setRedoStates(prev => prev.slice(1));
  };

  const handleUndoMerge = () => {
    const activeResult = mergeState.results?.[mergeState.resultIndex];
    if (previousMergeStates.length === 0 || !activeResult) return;
    const lastMergeState = previousMergeStates[previousMergeStates.length - 1];
    setRedoMergeStates(prev => [{ result: activeResult, description: imageDescription }, ...prev]);
    const newResults = [...(mergeState.results || [])];
    newResults[mergeState.resultIndex] = lastMergeState.result;
    setMergeState(prev => ({ ...prev, results: newResults }));
    setImageDescription(lastMergeState.description);
    setPreviousMergeStates(prev => prev.slice(0, -1));
  };

  const handleRedoMerge = () => {
    const activeResult = mergeState.results?.[mergeState.resultIndex];
    if (redoMergeStates.length === 0 || !activeResult) return;
    setPreviousMergeStates(prev => [...prev, { result: activeResult, description: imageDescription }]);
    const nextState = redoMergeStates[0];
    const newResults = [...(mergeState.results || [])];
    newResults[mergeState.resultIndex] = nextState.result;
    setMergeState(prev => ({ ...prev, results: newResults }));
    // Fixed typo: was incorrectly using lastMergeState from a different closure
    setImageDescription(nextState.description);
    setRedoMergeStates(prev => prev.slice(1));
  };

  const handleMergeAction = async () => {
    if (!mergeState.imageA || !mergeState.imageB || !customPrompt.trim()) return;
    setStatus('processing');
    setErrorMsg(null);
    try {
      const results = await mergeImages(mergeState.imageA, mergeState.mimeTypeA, mergeState.imageB, mergeState.mimeTypeB, customPrompt, mergeCount);
      setMergeState(prev => ({ ...prev, results: results.map(r => r.base64), resultIndex: 0 }));
      setImageDescription(results[0].description || null);
      setHistory(prev => [{
        id: Date.now().toString(),
        original: mergeState.imageA!,
        processed: results[0].base64,
        mode: 'merge',
        timestamp: Date.now(),
        genModel: results[0].model,
        description: results[0].description
      }, ...prev].slice(0, 10));
      setStatus('success');
      setCustomPrompt('');
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  const handleFullReset = () => {
    setImageState({ file: null, originalPreview: null, processedPreview: null, mimeType: '' });
    setMergeState({ imageA: null, imageB: null, mimeTypeA: '', mimeTypeB: '', results: null, resultIndex: 0 });
    setGenerateState({ prompt: '', baseImage: null, baseMimeType: null, results: null, resultIndex: 0 });
    setImageDescription(null);
    setPreviousStates([]);
    setRedoStates([]);
    setPreviousMergeStates([]);
    setRedoMergeStates([]);
    setPreviousGenerateStates([]);
    setRedoGenerateStates([]);
    setStatus('idle');
    setCustomPrompt('');
    setErrorMsg(null);
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
    <div className={`min-h-screen ${isLight ? 'bg-slate-200 text-slate-950' : 'bg-slate-950 text-white'} transition-colors duration-300 selection:bg-yellow-400/20 pb-20`}>
      <header className={`border-b ${isLight ? 'border-slate-300 bg-slate-100/90 shadow-sm' : 'border-slate-800 bg-slate-900/50'} backdrop-blur-md sticky top-0 z-50 h-20`}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={handleFullReset}>
            <div className="relative w-14 h-14 overflow-hidden rounded-2xl border border-white/20 shadow-[0_0_20px_rgba(250,204,21,0.2)] group-hover:scale-110 group-hover:shadow-yellow-400/50 transition-all duration-500 bg-slate-800 flex items-center justify-center">
              <img src={LOGO_THUMBNAIL_URL} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div className="text-3xl tracking-elegant transition-all duration-300 flex items-center font-extralight uppercase">
               <span className={`${isLight ? 'text-slate-950' : 'text-white'} group-hover:text-indigo-500 transition-colors duration-500`}>Restaur</span>
               <span className="text-indigo-500">A</span>
               <span className="text-yellow-400">I</span>
               <span className={`${isLight ? 'text-slate-950' : 'text-white'} group-hover:text-yellow-400 transition-colors duration-500`}>lma</span>
            </div>
          </div>

          <nav className={`flex items-center ${isLight ? 'bg-slate-300/60' : 'bg-slate-800/50'} p-1 rounded-2xl border ${isLight ? 'border-slate-400' : 'border-slate-700'} hidden md:flex tracking-soft`}>
             <button onClick={() => { handleFullReset(); setActiveTab('restore'); }} className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all font-light text-xs uppercase ${activeTab === 'restore' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : isLight ? 'text-slate-800 hover:text-slate-950' : 'text-slate-400 hover:text-white'}`}><RefreshCw className="w-3 h-3" /> Restaurar</button>
             <button onClick={() => { handleFullReset(); setActiveTab('merge'); }} className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all font-light text-xs uppercase ${activeTab === 'merge' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : isLight ? 'text-slate-800 hover:text-slate-950' : 'text-slate-400 hover:text-white'}`}><Layers className="w-3 h-3" /> Mesclar</button>
             <button onClick={() => { handleFullReset(); setActiveTab('generate'); }} className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all font-light text-xs uppercase ${activeTab === 'generate' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : isLight ? 'text-slate-800 hover:text-slate-950' : 'text-slate-400 hover:text-white'}`}><ImageIcon className="w-3 h-3" /> Gerar</button>
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowAbout(true)} className={`p-2.5 rounded-xl transition-all ${isLight ? 'hover:bg-slate-300' : 'hover:bg-slate-800'} text-yellow-400 hover:text-yellow-500`} title="Sobre"><Info className="w-6 h-6" /></button>
            <button onClick={() => setShowHistory(true)} className={`p-2.5 rounded-xl transition-all ${isLight ? 'hover:bg-slate-300' : 'hover:bg-slate-800'} text-yellow-400 hover:text-yellow-500`} title="Histórico"><History className="w-6 h-6" /></button>
            <button onClick={() => setShowSettings(true)} className={`p-2.5 rounded-xl transition-all ${isLight ? 'hover:bg-slate-300' : 'hover:bg-slate-800'} text-yellow-400 hover:text-yellow-500`} title="Configurações"><Settings className="w-6 h-6" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'restore' && (
          !imageState.originalPreview ? (
            <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh] py-10">
              <div className="text-left space-y-8">
                <h1 className={`text-5xl font-extralight mb-6 tracking-elegant leading-[1.2] uppercase ${textMain}`}>Dê vida nova às suas <span className="text-yellow-500 font-bold">fotos</span>.</h1>
                <p className={`${textSub} text-[11px] sm:text-xs max-w-xs leading-relaxed font-light tracking-soft`}>Restauração inteligente, cores e upscale para preservar memórias.</p>
                <Uploader onImageSelect={handleImageSelect} />
              </div>
              <ChatAssistant messages={chatMessages} isLoading={isChatLoading} input={chatInput} onInputChange={setChatInput} onSend={handleChatSend} chatEndRef={chatEndRef} isLight={isLight} cardBg={cardBg} textMain={textMain} />
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2 space-y-6">
                <div className={`${cardBg} rounded-3xl border p-2 min-h-[500px] flex items-center justify-center relative overflow-hidden`}>
                  {status === 'processing' && <LoaderOverlay />}
                  {imageState.processedPreview ? (
                    <ImageComparator original={imageState.originalPreview} processed={imageState.processedPreview} onDownload={() => handleDownloadImage(imageState.processedPreview)} />
                  ) : (
                    <img src={imageState.originalPreview} className="max-h-[75vh] w-auto rounded-xl shadow-lg" alt="Preview" />
                  )}
                </div>
                {imageDescription && <SceneDescription description={imageDescription} isLight={isLight} cardBg={cardBg} textMain={textMain} textSub={textSub} />}
              </div>
              <div className="space-y-6">
                <div className={`${cardBg} rounded-3xl border p-6`}>
                  <div className="flex items-center justify-between mb-6 uppercase tracking-soft"><h2 className={`text-sm font-light flex items-center gap-2 ${textMain}`}><Wand2 className="w-4 h-4 text-indigo-500" /> Ações</h2></div>
                  {!imageState.processedPreview ? (
                    <div className="grid gap-3">{RESTORATION_OPTIONS.map(opt => ( <ActionCard key={opt.id} option={opt} active={activeMode === opt.id} onClick={() => handleProcess(opt.id)} disabled={status === 'processing'} isLight={isLight} textMain={textMain} /> ))}</div>
                  ) : (
                    <div className="space-y-3">
                       <div className={`p-4 rounded-2xl ${isLight ? 'bg-indigo-50 border-indigo-200' : 'bg-indigo-500/10 border-indigo-500/20'} border text-indigo-500`}>
                          <p className={`text-[10px] font-light mb-3 uppercase tracking-elegant ${isLight ? 'text-indigo-900' : 'text-indigo-400'}`}>Controles de Resultado</p>
                          <div className="grid gap-2">
                             <Button onClick={() => setImageState(prev => ({...prev, processedPreview: null}))} variant="primary" className="w-full h-11 rounded-xl shadow-md uppercase text-xs tracking-soft" icon={RefreshCw}>Nova Análise</Button>
                             <div className="grid grid-cols-2 gap-2">
                               <Button onClick={handleUndoRestore} variant="secondary" className="h-11 rounded-xl text-[10px] uppercase tracking-soft" disabled={previousStates.length === 0} icon={Undo2}>Desfazer</Button>
                               <Button onClick={handleRedoRestore} variant="secondary" className="h-11 rounded-xl text-[10px] uppercase tracking-soft" disabled={redoStates.length === 0} icon={Redo2}>Refazer</Button>
                             </div>
                          </div>
                       </div>
                    </div>
                  )}
                  <div className={`mt-8 pt-6 border-t ${isLight ? 'border-slate-300' : 'border-slate-800'}`}><ManualInput value={customPrompt} onChange={setCustomPrompt} onAction={() => handleProcess('custom', !!imageState.processedPreview)} isProcessing={status === 'processing'} isRefining={!!imageState.processedPreview} isLight={isLight} textSub={textSub} /></div>
                </div>
                <Button onClick={handleFullReset} variant="ghost" className={`w-full h-12 border ${isLight ? 'border-slate-400' : 'border-slate-800'} uppercase text-xs tracking-soft`} icon={RotateCcw}>Resetar Tudo</Button>
              </div>
            </div>
          )
        )}

        {activeTab === 'merge' && (
          <div className="animate-in fade-in duration-500">
            {!mergeState.results ? (
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                  <h1 className={`text-5xl font-extralight tracking-elegant leading-[1.2] uppercase ${textMain}`}>Mescle <span className="text-yellow-500 font-bold">pessoas</span> e cenários.</h1>
                  <p className={`${textSub} font-light text-sm tracking-soft`}>Suba duas fotos e nossa IA as combinará em uma nova cena perfeita e realista.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <UploaderCompact slot="A" onSelect={(f, b, m) => handleMergeImageSelect('A', f, b, m)} label="Foto A" current={mergeState.imageA} onClear={() => setMergeState(prev => ({...prev, imageA: null}))} isLight={isLight} />
                    <UploaderCompact slot="B" onSelect={(f, b, m) => handleMergeImageSelect('B', f, b, m)} label="Foto B" current={mergeState.imageB} onClear={() => setMergeState(prev => ({...prev, imageB: null}))} isLight={isLight} />
                  </div>
                  <div className={`${cardBg} p-6 rounded-3xl border`}>
                    <div className="flex items-center justify-between mb-4"><p className={`text-[10px] font-light uppercase tracking-elegant ${textSub}`}>Como deseja mesclar?</p><QuantitySelector count={mergeCount} onSelect={setMergeCount} isLight={isLight} options={[1, 2, 4, 8]} /></div>
                    <textarea className={`w-full ${isLight ? 'bg-slate-50 border-slate-300 text-slate-950' : 'bg-slate-950 border-slate-800 text-white'} border rounded-2xl p-4 text-sm h-32 outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600 font-light tracking-soft`} placeholder="Ex: Coloque o rosto da pessoa da Foto A no corpo da pessoa na Foto B..." value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} />
                    <Button onClick={handleMergeAction} disabled={status === 'processing' || !mergeState.imageA || !mergeState.imageB || !customPrompt.trim()} variant="primary" className="w-full mt-4 h-14 rounded-2xl uppercase tracking-elegant text-xs" isLoading={status === 'processing'} icon={Layers}>Criar Mesclagem</Button>
                  </div>
                </div>
                <ChatAssistant messages={chatMessages} isLoading={isChatLoading} input={chatInput} onInputChange={setChatInput} onSend={handleChatSend} chatEndRef={chatEndRef} isLight={isLight} cardBg={cardBg} textMain={textMain} />
              </div>
            ) : (
              <div className="grid lg:grid-cols-3 gap-8 items-start animate-in zoom-in-95 duration-500">
                <div className="lg:col-span-2 space-y-6">
                  <div className={`${cardBg} rounded-[2.5rem] border p-4 relative overflow-hidden flex flex-col items-center justify-center min-h-[500px]`}>
                    {status === 'processing' && <LoaderOverlay />}
                    <div className={`w-full grid gap-4 ${
                      mergeState.results.length > 4 ? 'grid-cols-2 md:grid-cols-4' : 
                      mergeState.results.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 
                      'grid-cols-1'
                    }`}>
                      {mergeState.results.map((res, idx) => (
                        <div key={idx} className={`relative group rounded-2xl overflow-hidden border-2 transition-all ${mergeState.resultIndex === idx ? 'border-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-transparent opacity-60 grayscale hover:opacity-100 hover:grayscale-0'}`} onClick={() => setMergeState(prev => ({...prev, resultIndex: idx}))}>
                           <img src={res} className="w-full aspect-square object-cover cursor-pointer" alt={`Variante ${idx + 1}`} />
                           <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); setFullScreenImage(res); }} className="p-1.5 bg-black/60 rounded-lg text-white hover:bg-yellow-400 transition-colors"><Maximize2 className="w-4 h-4" /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDownloadImage(res); }} className="p-1.5 bg-black/60 rounded-lg text-white hover:bg-yellow-400 transition-colors"><Download className="w-4 h-4" /></button>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {imageDescription && <SceneDescription description={imageDescription} isLight={isLight} cardBg={cardBg} textMain={textMain} textSub={textSub} />}
                </div>
                <div className="space-y-6">
                   <div className={`${cardBg} rounded-3xl border p-6`}>
                      <h2 className={`text-lg font-light uppercase tracking-elegant mb-6 ${textMain}`}>Refinar</h2>
                      <div className="grid gap-2 mb-6">
                        <Button onClick={() => setMergeState(prev => ({...prev, results: null}))} variant="primary" className="w-full h-11 uppercase tracking-soft text-xs" icon={RefreshCw}>Novo Merge</Button>
                        <div className="grid grid-cols-2 gap-2">
                           <Button onClick={handleUndoMerge} variant="secondary" className="h-11 text-[10px] uppercase tracking-soft" disabled={previousMergeStates.length === 0} icon={Undo2}>Voltar</Button>
                           <Button onClick={handleRedoMerge} variant="secondary" className="h-11 text-[10px] uppercase tracking-soft" disabled={redoMergeStates.length === 0} icon={Redo2}>Refazer</Button>
                        </div>
                      </div>
                      <ManualInput value={customPrompt} onChange={setCustomPrompt} onAction={() => handleRefineMerge('custom')} isProcessing={status === 'processing'} isRefining={true} isLight={isLight} textSub={textSub} />
                   </div>
                   <Button onClick={handleFullReset} variant="ghost" className={`w-full h-12 border ${isLight ? 'border-slate-400' : 'border-slate-800'} uppercase tracking-soft text-xs`} icon={RotateCcw}>Resetar Tudo</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'generate' && (
          <div className="animate-in fade-in duration-500">
            {!generateState.results ? (
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                  <h1 className={`text-5xl font-extralight tracking-elegant leading-[1.2] uppercase ${textMain}`}>Crie <span className="text-yellow-500 font-bold">novas</span> realidades.</h1>
                  <p className={`${textSub} font-light text-sm tracking-soft`}>Descreva qualquer cena ou suba uma imagem para ser transformada pela nossa IA.</p>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-3">
                      <p className={`text-[10px] font-light uppercase tracking-elegant ${isLight ? 'text-slate-800' : 'text-slate-400'}`}>Imagem Base (Opcional)</p>
                      <UploaderCompact 
                        slot="Base" 
                        onSelect={(f, b, m) => handleGenerateBaseImageSelect(f, b, m)} 
                        label="Subir Imagem de Referência" 
                        current={generateState.baseImage} 
                        onClear={() => setGenerateState(prev => ({...prev, baseImage: null, baseMimeType: null}))} 
                        isLight={isLight}
                      />
                    </div>

                    <div className={`${cardBg} p-6 rounded-3xl border`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <QuantitySelector count={generateCount} onSelect={setGenerateCount} isLight={isLight} options={[1, 2, 4, 8]} />
                        <div className={`flex ${isLight ? 'bg-slate-300/50' : 'bg-slate-950'} p-1 rounded-lg border ${isLight ? 'border-slate-400' : 'border-slate-800'} overflow-x-auto tracking-soft`}>
                            {['1:1', '16:9', '9:16', '3:4', '4:3'].map(ratio => (
                              <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`px-2 py-1 rounded-md text-[10px] font-light uppercase ${aspectRatio === ratio ? 'bg-indigo-600 text-white shadow-md' : isLight ? 'text-slate-800 hover:text-slate-950' : 'text-slate-500 hover:text-slate-700'}`}>{ratio}</button>
                            ))}
                        </div>
                      </div>
                      <textarea className={`w-full ${isLight ? 'bg-slate-50 border-slate-300 text-slate-950' : 'bg-slate-950 border-slate-800 text-white'} border rounded-2xl p-4 text-sm h-32 outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600 font-light tracking-soft`} placeholder={generateState.baseImage ? "Descreva as alterações que deseja nesta imagem..." : "Ex: Um retrato cinematográfico de um astronauta em Marte..."} value={generateState.prompt} onChange={e => setGenerateState(prev => ({...prev, prompt: e.target.value}))} />
                      <Button onClick={() => handleGenerate(false)} disabled={status === 'processing' || !generateState.prompt.trim()} variant="primary" className="w-full mt-4 h-14 rounded-2xl uppercase tracking-elegant text-xs" isLoading={status === 'processing'} icon={generateState.baseImage ? Edit3 : Sparkles}>{generateState.baseImage ? 'Transformar Imagem' : 'Gerar Imagens'}</Button>
                    </div>
                  </div>
                </div>
                <ChatAssistant messages={chatMessages} isLoading={isChatLoading} input={chatInput} onInputChange={setChatInput} onSend={handleChatSend} chatEndRef={chatEndRef} isLight={isLight} cardBg={cardBg} textMain={textMain} />
              </div>
            ) : (
              <div className="grid lg:grid-cols-3 gap-8 items-start animate-in zoom-in-95 duration-500">
                <div className="lg:col-span-2 space-y-6">
                  <div className={`${cardBg} rounded-[2.5rem] border p-4 relative overflow-hidden flex flex-col items-center justify-center min-h-[500px]`}>
                    {status === 'processing' && <LoaderOverlay />}
                    <div className={`w-full grid gap-4 ${
                      generateState.results.length > 4 ? 'grid-cols-2 md:grid-cols-4' : 
                      generateState.results.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 
                      'grid-cols-1'
                    }`}>
                       {generateState.results.map((res, idx) => (
                         <div key={idx} className={`relative group rounded-2xl overflow-hidden border-2 transition-all ${generateState.resultIndex === idx ? 'border-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-transparent opacity-60 grayscale hover:opacity-100 hover:grayscale-0'}`} onClick={() => setGenerateState(prev => ({...prev, resultIndex: idx}))}>
                            <img src={res} className="w-full object-cover cursor-pointer aspect-square" alt={`Gerada ${idx + 1}`} />
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={(e) => { e.stopPropagation(); setFullScreenImage(res); }} className="p-1.5 bg-black/60 rounded-lg text-white hover:bg-yellow-400 transition-colors"><Maximize2 className="w-4 h-4" /></button>
                               <button onClick={(e) => { e.stopPropagation(); handleDownloadImage(res); }} className="p-1.5 bg-black/60 rounded-lg text-white hover:bg-yellow-400 transition-colors"><Download className="w-4 h-4" /></button>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                  {imageDescription && <SceneDescription description={imageDescription} isLight={isLight} cardBg={cardBg} textMain={textMain} textSub={textSub} />}
                </div>
                <div className="space-y-6">
                   <div className={`${cardBg} rounded-3xl border p-6`}>
                      <h2 className={`text-sm font-light uppercase tracking-elegant mb-6 flex items-center gap-2 ${textMain}`}><Wand2 className="w-4 h-4 text-indigo-500" /> Refinar Criação</h2>
                      
                      <div className="grid gap-2 mb-6">
                        <Button onClick={() => setGenerateState(prev => ({...prev, results: null}))} variant="primary" className="w-full h-11 uppercase tracking-soft text-xs" icon={RefreshCw}>Nova Criação</Button>
                        <div className="grid grid-cols-2 gap-2">
                           <Button onClick={handleUndoGenerate} variant="secondary" className="h-11 text-[10px] uppercase tracking-soft" disabled={previousGenerateStates.length === 0} icon={Undo2}>Voltar</Button>
                           <Button onClick={handleRedoGenerate} variant="secondary" className="h-11 text-[10px] uppercase tracking-soft" disabled={redoGenerateStates.length === 0} icon={Redo2}>Avançar</Button>
                        </div>
                        <Button onClick={() => handleDownloadImage(generateState.results?.[generateState.resultIndex] || null)} variant="secondary" className={`w-full h-11 ${isLight ? 'border-indigo-300' : 'border-indigo-500/30'} uppercase tracking-soft text-[10px]`} icon={ImageIcon}>Baixar Atual</Button>
                      </div>

                      <div className={`grid gap-2 border-t ${isLight ? 'border-slate-300' : 'border-slate-800'} pt-6 mb-6`}>
                        <p className={`text-[9px] font-light uppercase ${isLight ? 'text-slate-900' : 'text-slate-300'} mb-1 tracking-elegant`}>Ajustes Rápidos</p>
                        <div className="grid grid-cols-2 gap-2">
                            {RESTORATION_OPTIONS.filter(o => ['enhance', 'colorize', 'upscale', 'auto-all'].includes(o.id)).map(opt => (
                              <button 
                                key={opt.id} 
                                onClick={async () => {
                                  setStatus('processing');
                                  const res = await processImage(generateState.results![generateState.resultIndex], 'image/png', opt.prompt);
                                  const newRes = [...generateState.results!];
                                  newRes[generateState.resultIndex] = res.base64;
                                  setGenerateState(prev => ({...prev, results: newRes}));
                                  setStatus('success');
                                }}
                                disabled={status === 'processing'}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border ${isLight ? 'border-slate-300 bg-slate-100 hover:border-yellow-500 shadow-sm' : 'border-slate-700 bg-slate-800/40 hover:border-yellow-400/50'} transition-all text-white group`}
                              >
                                <opt.icon className={`w-3 h-3 mb-1 ${opt.id === 'auto-all' ? 'text-yellow-400' : 'text-indigo-400'} group-hover:scale-110 transition-transform`} />
                                <span className={`text-[8px] font-light uppercase tracking-soft ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>{opt.label}</span>
                              </button>
                            ))}
                        </div>
                      </div>

                      <ManualInput 
                        value={customPrompt} 
                        onChange={setCustomPrompt} 
                        onAction={() => handleGenerate(true)} 
                        isProcessing={status === 'processing'} 
                        isRefining={true} 
                        isLight={isLight} 
                        textSub={textSub} 
                      />
                   </div>
                   <Button onClick={handleFullReset} variant="ghost" className={`w-full h-12 border ${isLight ? 'border-slate-400' : 'border-slate-800'} uppercase tracking-soft text-xs`} icon={RotateCcw}>Resetar Tudo</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} isLight={isLight} textMain={textMain} />}
      {showSettings && <SettingsModal settings={settings} onUpdateSettings={(s: AppSettings) => setSettings(s)} onClose={() => setShowSettings(false)} onKeySelect={handleKeySelect} isLight={isLight} textMain={textMain} textSub={textSub} />}
      {showHistory && <HistorySidebar history={history} onClose={() => setShowHistory(false)} onSelect={(item) => { handleFullReset(); setActiveTab(item.mode === 'merge' ? 'merge' : 'restore'); if(item.mode === 'merge') setMergeState(prev => ({...prev, results: [item.processed], resultIndex: 0})); else setImageState(prev => ({...prev, originalPreview: item.original, processedPreview: item.processed})); setShowHistory(false); setStatus('success'); }} isLight={isLight} cardBg={cardBg} textMain={textMain} />}
      
      {fullScreenImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setFullScreenImage(null)}>
          <button className="absolute top-6 right-6 p-3 text-white/50 hover:text-white transition-colors"><Minimize2 className="w-8 h-8" /></button>
          <img src={fullScreenImage} className="max-w-full max-h-full rounded-2xl shadow-[0_0_50px_rgba(250,204,21,0.1)]" alt="Full Screen" onClick={e => e.stopPropagation()} />
          <div className="absolute bottom-10 flex gap-4">
             <Button onClick={() => handleDownloadImage(fullScreenImage)} icon={Download}>Baixar Imagem</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuantitySelector({ count, onSelect, isLight, options = [1, 2, 4] }: { count: number, onSelect: (n: number) => void, isLight: boolean, options?: number[] }) {
  return (
    <div className={`flex ${isLight ? 'bg-slate-300/50' : 'bg-slate-950'} p-1 rounded-lg border ${isLight ? 'border-slate-400' : 'border-slate-800'} font-light tracking-soft`}>
      {options.map(n => (
        <button
          key={n}
          onClick={() => onSelect(n)}
          className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${count === n ? 'bg-indigo-600 text-white shadow-md' : isLight ? 'text-slate-950 hover:text-black' : 'text-slate-500 hover:text-slate-300'}`}
        >
          {n}x
        </button>
      ))}
    </div>
  );
}

function LoaderOverlay() {
  return (
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-30 flex flex-col items-center justify-center">
      <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
      <p className="text-xl font-light uppercase tracking-elegant text-white mb-2">Processando...</p>
      <p className="text-sm text-slate-400 animate-pulse font-light tracking-soft">A IA está criando sua obra.</p>
    </div>
  );
}

function ChatAssistant({ messages, isLoading, input, onInputChange, onSend, chatEndRef, isLight, cardBg, textMain }: any) {
  return (
    <div className={`${cardBg} rounded-[2.5rem] border h-[500px] flex flex-col overflow-hidden`}>
      <div className={`p-5 border-b ${isLight ? 'border-slate-300 bg-slate-100/30' : 'border-slate-800 bg-slate-900/40'} flex items-center justify-between`}>
        <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div><span className={`font-light text-[10px] tracking-elegant ${isLight ? 'text-slate-950' : 'text-slate-300'} uppercase`}>Guia Digital</span></div>
        <MessageSquare className={`w-4 h-4 ${isLight ? 'text-slate-600' : 'text-slate-500'}`} />
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth">
        {messages.map((msg: any, i: number) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg' : isLight ? 'bg-slate-200 text-slate-950 border border-slate-300 rounded-tl-none font-light' : 'bg-slate-800/50 text-white rounded-tl-none border border-slate-700/50'} tracking-soft`}>{msg.text}</div>
          </div>
        ))}
        {isLoading && <div className="flex justify-start"><div className={`p-4 rounded-2xl animate-pulse text-yellow-600 ${isLight ? 'bg-slate-200' : 'bg-slate-800/50'}`}>...</div></div>}
        <div ref={chatEndRef} />
      </div>
      <div className={`p-4 ${isLight ? 'bg-slate-100/50 border-slate-300' : 'bg-slate-900/20 border-slate-800'} border-t`}>
        <form onSubmit={(e) => { e.preventDefault(); onSend(); }} className="relative">
          <input type="text" value={input} onChange={(e) => onInputChange(e.target.value)} className={`w-full ${isLight ? 'bg-white border-slate-300 text-slate-950 font-light' : 'bg-slate-950 border-slate-700 text-white'} border rounded-xl py-3 pl-4 pr-12 text-xs outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-700 font-light tracking-soft`} placeholder="Dúvidas ou sugestões?" />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-500 hover:text-indigo-400 transition-colors"><Send className="w-4 h-4" /></button>
        </form>
      </div>
    </div>
  );
}

function UploaderCompact({ slot, onSelect, label, current, onClear, isLight }: {slot: string, onSelect: any, label: string, current: string | null, onClear: () => void, isLight: boolean}) {
  return (
    <div className="space-y-3">
      {current ? (
        <div className="relative aspect-square rounded-2xl overflow-hidden border border-indigo-500/50 shadow-md">
          <img src={current} className="w-full h-full object-cover" />
          <button onClick={onClear} className="absolute top-2 right-2 p-1 bg-black/60 rounded-lg text-white hover:bg-red-500 transition-colors shadow-sm"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <label className={`flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed ${isLight ? 'border-slate-400 bg-slate-100 hover:border-yellow-500 shadow-sm' : 'border-slate-700 bg-slate-900/50 hover:border-yellow-400/50 hover:bg-slate-800/40'} transition-all cursor-pointer group min-h-[150px]`}>
          <div className={`p-3 ${isLight ? 'bg-white shadow-sm border border-slate-300' : 'bg-slate-800'} rounded-full mb-2 group-hover:scale-110 transition-transform shadow-sm`}><ImageIcon className="w-5 h-5 text-indigo-400" /></div>
          <span className={`text-[9px] font-light ${isLight ? 'text-slate-950' : 'text-slate-400'} uppercase tracking-elegant px-2 text-center`}>{label}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if(file) {
              const r = new FileReader();
              r.onloadend = () => onSelect(file, r.result, file.type);
              r.readAsDataURL(file);
            }
          }} />
        </label>
      )}
    </div>
  );
}

function SceneDescription({ description, isLight, cardBg, textMain, textSub }: any) {
  return (
    <div className={`${cardBg} rounded-3xl border p-6`}>
      <h3 className={`text-[10px] font-light flex items-center gap-2 mb-3 uppercase tracking-elegant ${isLight ? 'text-slate-800' : 'text-slate-400'}`}><Camera className="w-3 h-3 text-indigo-500" /> Nota da IA</h3>
      <p className={`${textMain} text-lg italic leading-relaxed font-light tracking-soft`}>"{description}"</p>
    </div>
  );
}

function ActionCard({ option, active, onClick, disabled, isLight, textMain }: any) {
  const isMagic = option.id === 'auto-all';
  return (
    <button onClick={onClick} disabled={disabled} className={`group flex items-center p-4 rounded-2xl border text-left transition-all ${active ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : isLight ? 'bg-slate-200/50 border-slate-300 hover:border-yellow-500 text-slate-950 shadow-sm' : 'bg-slate-800/50 border-slate-700 hover:border-yellow-400/40 text-white'}`}>
      <div className={`p-2 rounded-xl mr-4 ${active ? 'bg-white/20' : isMagic ? (isLight ? 'bg-yellow-100 text-yellow-900' : 'bg-indigo-500/10 text-yellow-400') : (isLight ? 'bg-indigo-100 text-indigo-900' : 'bg-indigo-500/10 text-indigo-500')}`}><option.icon className="w-5 h-5" /></div>
      <div className="flex-1"><div className="font-light text-xs uppercase tracking-soft">{option.label}</div><div className={`text-[9px] mt-1 font-light tracking-soft ${active ? 'text-white/80' : isLight ? 'text-slate-900' : 'text-slate-400'}`}>{option.description}</div></div>
    </button>
  );
}

function ManualInput({ value, onChange, onAction, isProcessing, isRefining, isLight, textSub }: any) {
  return (
    <div className="space-y-4">
      <p className={`text-[9px] font-light uppercase ${isLight ? 'text-slate-800' : 'text-slate-400'} mb-3 tracking-elegant`}>{isRefining ? 'Ajuste Fino' : 'Ajuste Manual'}</p>
      <textarea className={`w-full ${isLight ? 'bg-white border-slate-300 text-slate-950 font-light' : 'bg-slate-950 border-slate-700 text-white'} border rounded-2xl p-4 text-xs h-28 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all placeholder:text-slate-700 font-light tracking-soft`} placeholder={isRefining ? "Descreva o que deseja mudar..." : "O que deseja ajustar?"} value={value} onChange={e => onChange(e.target.value)} />
      <Button onClick={onAction} disabled={isProcessing || !value.trim()} className="w-full h-12 rounded-2xl uppercase tracking-elegant text-[10px]" variant="primary">{isRefining ? 'Aplicar Refinamento' : 'Executar'}</Button>
    </div>
  );
}

function AboutModal({ onClose, isLight, textMain }: any) {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const images = [LOGO_THUMBNAIL_URL, SECOND_ABOUT_IMAGE, THIRD_ABOUT_IMAGE];
  useEffect(() => {
    const interval = setInterval(() => setCurrentImgIndex(prev => (prev + 1) % images.length), 4000); 
    return () => clearInterval(interval);
  }, [images.length]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`${isLight ? 'bg-white' : 'bg-slate-900'} rounded-[2.5rem] w-full max-w-2xl p-8 border ${isLight ? 'border-slate-300' : 'border-slate-800'} relative shadow-2xl overflow-hidden`}>
        <button onClick={onClose} className={`absolute top-6 right-6 p-2 ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:bg-slate-800'} z-10 rounded-full transition-colors`}><X className="w-6 h-6" /></button>
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="relative w-48 h-48 group shrink-0">
             <div className="absolute -inset-2 bg-yellow-400/10 rounded-3xl blur-xl group-hover:bg-yellow-400/20 transition-all duration-700"></div>
             <div className={`relative w-48 h-48 ${isLight ? 'bg-slate-100' : 'bg-slate-800'} rounded-3xl overflow-hidden border ${isLight ? 'border-slate-200 shadow-inner' : 'border-white/10'} shadow-xl flex items-center justify-center`}>
                {images.map((src, idx) => ( <img key={idx} src={src} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${idx === currentImgIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`} alt={`Slide ${idx}`} /> ))}
             </div>
          </div>
          <div className="space-y-4">
             <p className={`${isLight ? 'text-slate-950 font-light' : 'text-white'} text-xl italic font-light leading-relaxed opacity-90 tracking-soft`}>"O aplicativo pra ajudar a recordar a memória de quem nos trouxe até aqui."</p>
             <div className="flex items-center gap-3 pt-4"><div className={`h-px flex-1 ${isLight ? 'bg-indigo-300' : 'bg-indigo-500/20'}`}></div><span className="text-yellow-600 font-light text-2xl tracking-elegant uppercase">Para <span className="font-light">ilma</span> <Heart className="w-4 h-4 fill-current text-indigo-600" /></span><div className={`h-px flex-1 ${isLight ? 'bg-indigo-300' : 'bg-indigo-500/20'}`}></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistorySidebar({ history, onClose, onSelect, isLight, cardBg, textMain }: any) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className={`fixed right-0 top-0 bottom-0 w-80 z-[70] ${cardBg} border-l p-6 overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-8"><h3 className={`text-sm font-light uppercase tracking-elegant flex items-center gap-2 ${textMain}`}><History className="w-4 h-4 text-indigo-500" /> Histórico</h3><button onClick={onClose} className={`p-2 ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:bg-slate-800'} rounded-full`}><X className="w-4 h-4" /></button></div>
        <div className="space-y-4 flex-1">
          {history.length === 0 ? <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 text-center"><Clock className="w-16 h-16 mb-4 text-indigo-500" /><p className={`font-light ${textMain} uppercase tracking-elegant text-[10px]`}>Vazio</p></div> : history.map((item: any) => (
            <div key={item.id} className={`group relative rounded-2xl overflow-hidden border ${isLight ? 'border-slate-300' : 'border-slate-800'} cursor-pointer shadow-lg hover:border-indigo-500/50 transition-colors`} onClick={() => onSelect(item)}>
              <img src={item.processed} className="w-full aspect-video object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent p-3 flex flex-col justify-end"><div className="text-[8px] font-light text-white uppercase tracking-elegant">{item.mode}</div><div className="text-[7px] text-slate-400 font-light tracking-soft">{new Date(item.timestamp).toLocaleTimeString()}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ settings, onUpdateSettings, onClose, onKeySelect, isLight, textMain, textSub }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className={`${isLight ? 'bg-white' : 'bg-slate-900'} rounded-[2.5rem] w-full max-w-sm p-8 border ${isLight ? 'border-slate-300' : 'border-slate-800'} shadow-2xl`}>
        <div className="flex justify-between items-center mb-8 uppercase tracking-elegant"><h3 className={`text-sm font-light ${textMain}`}>Opções</h3><button onClick={onClose} className={`p-2 ${isLight ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:bg-slate-800'} rounded-full transition-colors`}><X className="w-5 h-5" /></button></div>
        <div className="space-y-8">
          {/* Theme Selector */}
          <div>
            <label className={`block text-[10px] font-light uppercase ${isLight ? 'text-slate-800' : 'text-slate-500'} mb-4 tracking-elegant`}>Tema Visual</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${settings.theme === 'dark' ? 'border-yellow-500 bg-yellow-400/10 text-yellow-400 shadow-lg shadow-yellow-400/5' : isLight ? 'border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-200' : 'border-slate-700 bg-slate-800/50 text-slate-500'}`}
              >
                <Moon className="w-4 h-4" />
                <span className="text-[9px] uppercase tracking-soft font-light">Escuro</span>
              </button>
              <button 
                onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${settings.theme === 'light' ? 'border-indigo-500 bg-indigo-500/5 text-indigo-700 shadow-lg shadow-indigo-500/5' : isLight ? 'border-slate-300 bg-slate-100 text-slate-500' : 'border-slate-700 bg-slate-800/50 text-slate-500'}`}
              >
                <Sun className="w-4 h-4" />
                <span className="text-[9px] uppercase tracking-soft font-light">Claro</span>
              </button>
            </div>
          </div>

          <div>
            <label className={`block text-[10px] font-light uppercase ${isLight ? 'text-slate-800' : 'text-slate-500'} mb-4 tracking-elegant`}>Modelo Ativo</label>
            <div className={`p-4 rounded-2xl ${isLight ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-light' : 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400'} border font-light tracking-soft shadow-inner`}>
              <div className="flex items-center gap-2 mb-1"><Cpu className="w-3 h-3" /><span className="font-bold text-xs uppercase">Gemini 2.5 Flash Image</span></div>
            </div>
          </div>
          <div className={`pt-6 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <label className={`block text-[10px] font-light uppercase ${isLight ? 'text-slate-800' : 'text-slate-500'} mb-4 tracking-elegant`}>Segurança</label>
            <button onClick={onKeySelect} className={`w-full flex items-center justify-center gap-3 ${isLight ? 'bg-slate-100 border-slate-300 text-slate-950 hover:bg-slate-200 shadow-sm font-light' : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'} p-4 rounded-2xl font-light border transition-all uppercase tracking-soft text-[10px]`}>
              <Key className="w-4 h-4" /> Alterar Chave API
            </button>
          </div>
        </div>
        <Button onClick={onClose} className="w-full mt-10 h-14 rounded-2xl shadow-lg uppercase tracking-elegant text-xs">Fechar Opções</Button>
      </div>
    </div>
  );
}

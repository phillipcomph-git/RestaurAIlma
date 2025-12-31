'use client';

import React, { useState, useEffect } from 'react';
import { 
  Palette, ScanLine, Sparkles, RotateCcw,
  Settings, X, Zap, MessageSquare, 
  ImageOff, Heart, Info, Send, Layers, 
  Image as ImageIcon, Download, 
  ChevronLeft, ChevronRight, AlertCircle, Square, RectangleHorizontal, Check
} from 'lucide-react';

import { Uploader } from '../components/Uploader';
import { ImageComparator } from '../components/ImageComparator';
import { Button } from '../components/Button';
import { useImageProcessing } from '../hooks/useImageProcessing';
import { ImageState, ProcessingStatus, RestorationMode, ActionOption, AppSettings } from '../types';

const RESTORATION_OPTIONS: ActionOption[] = [
  { id: 'auto-all', label: 'Mágica Total', icon: Zap, description: 'Restaura tudo automaticamente.', prompt: 'Full masterpiece restoration: remove noise, fix cracks, sharpen details, and apply natural colorization.' },
  { id: 'restore', label: 'Limpar Danos', icon: ScanLine, description: 'Remove riscos e rasgos físicos.', prompt: 'Heavy restoration: fix physical damage like tears, scratches, and stains.' },
  { id: 'colorize', label: 'Colorir', icon: Palette, description: 'Cores naturais para fotos P&B.', prompt: 'Natural colorization: add vivid and realistic colors to this monochrome photo.' },
  { id: 'enhance', label: 'Aprimorar', icon: Sparkles, description: 'Melhora contraste e nitidez.', prompt: 'Image enhancement: fine-tune contrast and sharpen features.' }
];

const SHOWCASE_IMAGES = [
  { url: "https://drive.google.com/thumbnail?id=1FyVZ-9tvJCQ2-txXy2yZSbxWkATDwZsK&sz=w800", title: "Restauração", desc: "Recuperação de danos físicos e rasgos." },
  { url: "https://drive.google.com/thumbnail?id=1qvU6V2KpAl60XSSCicKkmZI90WHNdX8Q&sz=w800", title: "Colorização", desc: "Cores vivas para memórias em P&B." },
  { url: "https://drive.google.com/thumbnail?id=16-788ZCK7vsexkBpYYwy7LEYG1QKrsi7&sz=w800", title: "Aprimoramento", desc: "Nitidez e resolução ultra-definida." }
];

export default function Home() {
  const { processImage, chat, isProcessing } = useImageProcessing();
  const [imageState, setImageState] = useState<ImageState>({ file: null, originalPreview: null, processedPreview: null, mimeType: '', history: [], future: [] });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ language: 'pt', theme: 'dark', preferredModel: 'gemini-2.5-flash-image' });

  const handleProcess = async (mode: RestorationMode) => {
    if (!imageState.originalPreview) return;
    setErrorMsg(null);
    try {
      const opt = RESTORATION_OPTIONS.find(o => o.id === mode);
      const result = await processImage(imageState.originalPreview, imageState.mimeType, opt?.prompt || '', settings.preferredModel);
      // Fix: result is an array of ProcessResult, take the first item
      setImageState(prev => ({ ...prev, processedPreview: result[0].base64 }));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erro ao processar imagem. Verifique sua conexão ou tente um arquivo menor.");
    }
  };

  const isLight = settings.theme === 'light';

  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-200 text-slate-900' : 'bg-slate-950 text-white'} transition-colors duration-500`}>
      <header className={`border-b ${isLight ? 'bg-white/80 border-slate-300' : 'bg-slate-900/50 border-slate-800'} backdrop-blur-xl sticky top-0 z-50 h-16 md:h-20`}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
             <img src="https://drive.google.com/thumbnail?id=1FyVZ-9tvJCQ2-txXy2yZSbxWkATDwZsK&sz=w800" className="w-10 h-10 rounded-xl" alt="Logo" />
             <span className="text-xl tracking-elegant font-extralight uppercase">RESTAUR<span className="text-indigo-600 font-bold">A</span>ILMA</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAbout(true)} className="p-2 text-indigo-500 hover:scale-110 transition-transform"><Info className="w-5 h-5" /></button>
            <button onClick={() => setSettings(s => ({...s, theme: s.theme === 'dark' ? 'light' : 'dark'}))} className="p-2 text-slate-400">
               <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {isProcessing && <LoaderOverlay />}

        {errorMsg && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3 text-red-500 text-xs font-bold uppercase tracking-wider">
              <AlertCircle className="w-5 h-5" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="p-2 hover:bg-red-500/10 rounded-full"><X className="w-4 h-4" /></button>
          </div>
        )}

        {!imageState.originalPreview ? (
          <div className="text-center space-y-8 py-20">
            <h1 className="text-5xl md:text-7xl font-extralight uppercase tracking-tight">Memórias que <span className="text-indigo-600 font-bold">Respiram</span>.</h1>
            <p className="text-slate-500 max-w-lg mx-auto">Restauração profunda de fotos antigas com a inteligência do Google Gemini.</p>
            <div className="max-w-xl mx-auto"><Uploader onImageSelect={(f, b, m) => setImageState({ ...imageState, file: f, originalPreview: b, mimeType: m })} /></div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className={`aspect-video rounded-[2.5rem] border ${isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'} p-2 shadow-2xl relative overflow-hidden flex items-center justify-center`}>
                {imageState.processedPreview ? (
                  <ImageComparator original={imageState.originalPreview} processed={imageState.processedPreview} onDownload={() => {}} />
                ) : (
                  <img src={imageState.originalPreview} className="max-h-full rounded-2xl transition-all duration-700" alt="Preview" />
                )}
              </div>
            </div>
            <div className="space-y-6">
              <div className={`p-6 rounded-[2rem] border ${isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'} shadow-xl`}>
                <h3 className="text-[10px] uppercase font-bold text-indigo-500 mb-6 flex items-center gap-2 tracking-widest"><Sparkles className="w-4 h-4" /> Ferramentas</h3>
                <div className="space-y-3">
                  {RESTORATION_OPTIONS.map(opt => (
                    <button key={opt.id} onClick={() => handleProcess(opt.id)} disabled={isProcessing} className="w-full flex items-center p-4 rounded-2xl border border-slate-800 bg-slate-950/50 hover:border-indigo-600 transition-all text-left group disabled:opacity-50">
                      <div className="p-2 rounded-xl bg-indigo-600/10 text-indigo-500 mr-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><opt.icon className="w-4 h-4" /></div>
                      <div>
                        <div className="text-[10px] font-bold uppercase">{opt.label}</div>
                        <div className="text-[8px] opacity-50 font-light">{opt.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={() => setImageState({ ...imageState, originalPreview: null, processedPreview: null })} variant="ghost" className="w-full border border-slate-800 rounded-2xl py-4 uppercase text-[10px] font-bold" icon={RotateCcw}>Novo Projeto</Button>
            </div>
          </div>
        )}
      </main>

      <Modal isOpen={showAbout} onClose={() => setShowAbout(false)} title="Sobre o RestaurAIlma" isLight={isLight}>
        <div className="space-y-8">
           <AboutCarousel images={SHOWCASE_IMAGES} />
           <div className="text-center space-y-4 px-4">
              <p className="text-sm font-light leading-relaxed opacity-80 italic">"Para conservar a memória de quem nos trouxe até aqui. Em homenagem à Ilma S2"</p>
              <div className="pt-4 border-t border-white/5">
                 <p className="text-[9px] uppercase font-bold tracking-[0.3em] opacity-40">Versão 2.8.7 • Powered by Gemini IA</p>
              </div>
           </div>
        </div>
      </Modal>
    </div>
  );
}

function AboutCarousel({ images }: any) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIdx(p => (p + 1) % images.length), 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-black shadow-2xl">
      {images.map((item: any, i: number) => (
        <div key={i} className={`absolute inset-0 transition-all duration-1000 ${idx === i ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}>
          <img src={item.url} className="w-full h-full object-cover opacity-60" alt={item.title} />
          <div className="absolute inset-0 bg-gradient-to-t from-black flex flex-col justify-end p-8">
            <h4 className="text-white font-bold text-lg mb-1">{item.title}</h4>
            <p className="text-indigo-300 text-xs">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function LoaderOverlay() {
  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-3xl z-[200] flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-300">
      <div className="w-20 h-20 border-[6px] border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-6 shadow-[0_0_30px_rgba(79,70,229,0.3)]"></div>
      <p className="text-2xl font-extralight uppercase tracking-[0.4em] text-white">Processando</p>
      <p className="text-[9px] text-slate-500 mt-2 uppercase tracking-widest leading-relaxed">A inteligência artificial está reconstruindo sua foto.</p>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children, isLight }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={onClose} />
      <div className={`relative w-full max-w-md ${isLight ? 'bg-white text-slate-950' : 'bg-slate-900 text-white'} rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300`}>
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em]">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}

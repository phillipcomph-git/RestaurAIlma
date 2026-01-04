
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Wand2, Palette, ScanLine, Sparkles, RotateCcw,
  Settings, History, X, Clock, Zap, MessageSquare, RefreshCw, 
  Maximize2, Camera, ImageOff, Heart, Info, Send, Layers, 
  Image as ImageIcon, Undo2, Redo2, Download, Minimize2, Edit3, 
  Moon, Sun, UserCheck, SlidersHorizontal, ChevronLeft, ChevronRight, Key, Cpu, AlertCircle, Trash2,
  ArrowRight, ExternalLink, Square, RectangleHorizontal, RectangleVertical, Loader2, CreditCard, Check, Globe, Monitor
} from 'lucide-react';

import { Uploader } from './components/Uploader';
import { ImageComparator } from './components/ImageComparator';
import { Button } from './components/Button';
import { useImageProcessing } from './hooks/useImageProcessing';
import { ImageState, MergeState, AppTab, ProcessingStatus, RestorationMode, ActionOption, HistoryItem, AppSettings, GenerateState, Language } from './types';

// Sistema de Traduções
const TRANSLATIONS = {
  pt: {
    restore: 'Restaurar',
    merge: 'Mesclar',
    generate: 'Gerar',
    about: 'Sobre',
    history: 'Histórico',
    settings: 'Configurações',
    apply: 'Aplicar',
    download: 'Baixar',
    manual_adjust: 'Ajuste Manual',
    variations: 'Variações',
    methods: 'Métodos',
    clear_studio: 'Limpar Estúdio',
    hero_restore_title: 'Dê vida nova às suas',
    hero_restore_highlight: 'fotos',
    hero_restore_sub: 'Restauração inteligente preservando memórias preciosas com perfeição.',
    hero_merge_title: 'Mescle',
    hero_merge_highlight: 'pessoas',
    hero_gen_title: 'Crie',
    hero_gen_highlight: 'arte',
    upload_photo_a: 'Foto A',
    upload_photo_b: 'Foto B',
    upload_ref: 'Referência',
    base_optional: 'Base (Opcional)',
    base_desc: 'Use uma imagem como guia visual.',
    prompt_placeholder_custom: 'Instrução personalizada...',
    prompt_placeholder_merge: 'Instrução de mesclagem...',
    prompt_placeholder_gen: 'Descreva sua visão...',
    quantity: 'Quantidade',
    aspect_ratio: 'Proporção',
    concierge_title: 'Concierge Online',
    concierge_placeholder: 'Dúvidas? Escreva aqui...',
    concierge_intro: 'Olá! Sou seu assistente de IA. Como posso ajudar na restauração hoje?',
    processing: 'Processando...',
    processing_sub: 'A inteligência artificial está desenhando as melhorias',
    history_empty: 'Sem registros.',
    theme: 'Tema',
    language: 'Idioma',
    scale: 'Escala do Layout',
    opt_auto: 'Mágica Total',
    opt_auto_desc: 'Restaura tudo automaticamente.',
    opt_restore: 'Limpar Danos',
    opt_restore_desc: 'Remove riscos e rasgos físicos.',
    opt_flaws: 'Remover Falhas',
    opt_flaws_desc: 'Limpa poeira e manchas leves.',
    opt_colorize: 'Colorir',
    opt_colorize_desc: 'Cores naturais para fotos P&B.',
    opt_enhance: 'Aprimorar',
    opt_enhance_desc: 'Melhora contraste e nitidez.',
    opt_upscale: 'Aumentar Nitidez',
    opt_upscale_desc: 'Melhora a definição dos detalhes.',
    opt_bg: 'Remover Fundo',
    opt_bg_desc: 'Isola o objeto principal.'
  },
  en: {
    restore: 'Restore',
    merge: 'Merge',
    generate: 'Generate',
    about: 'About',
    history: 'History',
    settings: 'Settings',
    apply: 'Apply',
    download: 'Download',
    manual_adjust: 'Manual Adjust',
    variations: 'Variations',
    methods: 'Methods',
    clear_studio: 'Clear Studio',
    hero_restore_title: 'Give new life to your',
    hero_restore_highlight: 'photos',
    hero_restore_sub: 'Intelligent restoration preserving precious memories perfectly.',
    hero_merge_title: 'Merge',
    hero_merge_highlight: 'people',
    hero_gen_title: 'Create',
    hero_gen_highlight: 'art',
    upload_photo_a: 'Photo A',
    upload_photo_b: 'Photo B',
    upload_ref: 'Reference',
    base_optional: 'Base (Optional)',
    base_desc: 'Use an image as a visual guide.',
    prompt_placeholder_custom: 'Custom instruction...',
    prompt_placeholder_merge: 'Merge instruction...',
    prompt_placeholder_gen: 'Describe your vision...',
    quantity: 'Quantity',
    aspect_ratio: 'Aspect Ratio',
    concierge_title: 'Concierge Online',
    concierge_placeholder: 'Questions? Write here...',
    concierge_intro: 'Hello! I am your AI assistant. How can I help with restoration today?',
    processing: 'Processing...',
    processing_sub: 'Artificial intelligence is drawing the improvements',
    history_empty: 'No records.',
    theme: 'Theme',
    language: 'Language',
    scale: 'Layout Scale',
    opt_auto: 'Full Magic',
    opt_auto_desc: 'Restores everything automatically.',
    opt_restore: 'Clean Damage',
    opt_restore_desc: 'Removes physical scratches and tears.',
    opt_flaws: 'Remove Flaws',
    opt_flaws_desc: 'Cleans dust and light spots.',
    opt_colorize: 'Colorize',
    opt_colorize_desc: 'Natural colors for B&W photos.',
    opt_enhance: 'Enhance',
    opt_enhance_desc: 'Improves contrast and sharpness.',
    opt_upscale: 'Upscale',
    opt_upscale_desc: 'Improves detail definition.',
    opt_bg: 'Remove Background',
    opt_bg_desc: 'Isolates the main subject.'
  },
  es: {
    restore: 'Restaurar',
    merge: 'Fusionar',
    generate: 'Generar',
    about: 'Acerca de',
    history: 'Historial',
    settings: 'Ajustes',
    apply: 'Aplicar',
    download: 'Descargar',
    manual_adjust: 'Ajuste Manual',
    variations: 'Variaciones',
    methods: 'Métodos',
    clear_studio: 'Limpiar Estudio',
    hero_restore_title: 'Da nueva vida a tus',
    hero_restore_highlight: 'fotos',
    hero_restore_sub: 'Restauración inteligente preservando recuerdos preciosos a la perfección.',
    hero_merge_title: 'Fusiona',
    hero_merge_highlight: 'personas',
    hero_gen_title: 'Crea',
    hero_gen_highlight: 'arte',
    upload_photo_a: 'Foto A',
    upload_photo_b: 'Foto B',
    upload_ref: 'Referencia',
    base_optional: 'Base (Opcional)',
    base_desc: 'Usa una imagen como guía visual.',
    prompt_placeholder_custom: 'Instrucción personalizada...',
    prompt_placeholder_merge: 'Instrucción de fusión...',
    prompt_placeholder_gen: 'Describe tu visión...',
    quantity: 'Cantidad',
    aspect_ratio: 'Proporción',
    concierge_title: 'Conserje en línea',
    concierge_placeholder: '¿Dudas? Escribe aquí...',
    concierge_intro: '¡Hola! Soy tu asistente de IA. ¿Cómo puedo ayudar con la restauración hoy?',
    processing: 'Procesando...',
    processing_sub: 'La inteligencia artificial está dibujando las mejoras',
    history_empty: 'Sin registros.',
    theme: 'Tema',
    language: 'Idioma',
    scale: 'Escala del Diseño',
    opt_auto: 'Magia Total',
    opt_auto_desc: 'Restaura todo automáticamente.',
    opt_restore: 'Limpiar Daños',
    opt_restore_desc: 'Elimina rasguños y roturas físicas.',
    opt_flaws: 'Eliminar Fallas',
    opt_flaws_desc: 'Limpia polvo y manchas ligeras.',
    opt_colorize: 'Colorear',
    opt_colorize_desc: 'Colores naturales para fotos en B&N.',
    opt_enhance: 'Mejorar',
    opt_enhance_desc: 'Mejora contraste y nitidez.',
    opt_upscale: 'Aumentar Nitidez',
    opt_upscale_desc: 'Mejora la definición de detalles.',
    opt_bg: 'Eliminar Fondo',
    opt_bg_desc: 'Aísla el objeto principal.'
  },
  cn: {
    restore: '修复',
    merge: '合并',
    generate: '生成',
    about: '关于',
    history: '历史记录',
    settings: '设置',
    apply: '应用',
    download: '下载',
    manual_adjust: '手动调整',
    variations: '变体',
    methods: '方法',
    clear_studio: '清空工作室',
    hero_restore_title: '赋予您的',
    hero_restore_highlight: '照片新生命',
    hero_restore_sub: '智能修复，完美保存珍贵记忆。',
    hero_merge_title: '合并',
    hero_merge_highlight: '人物',
    hero_gen_title: '创造',
    hero_gen_highlight: '艺术',
    upload_photo_a: '照片 A',
    upload_photo_b: '照片 B',
    upload_ref: '参考图',
    base_optional: '基础 (可选)',
    base_desc: '使用图像作为视觉指南。',
    prompt_placeholder_custom: '自定义指令...',
    prompt_placeholder_merge: '合并指令...',
    prompt_placeholder_gen: '描述您的构想...',
    quantity: '数量',
    aspect_ratio: '比例',
    concierge_title: '在线礼宾',
    concierge_placeholder: '有问题？请在此输入...',
    concierge_intro: '您好！我是您的 AI 助手。今天可以帮您修复什么？',
    processing: '处理中...',
    processing_sub: '人工智能正在绘制改进方案',
    history_empty: '无记录。',
    theme: '主题',
    language: '语言',
    scale: '布局缩放',
    opt_auto: '全能魔法',
    opt_auto_desc: '自动修复所有问题。',
    opt_restore: '清理损伤',
    opt_restore_desc: '去除物理划痕和撕裂。',
    opt_flaws: '去除瑕疵',
    opt_flaws_desc: '清理灰尘和轻微污渍。',
    opt_colorize: '上色',
    opt_colorize_desc: '为黑白照片添加自然色彩。',
    opt_enhance: '增强',
    opt_enhance_desc: '改善对比度和清晰度。',
    opt_upscale: '提高清晰度',
    opt_upscale_desc: '显著提高细节清晰度。',
    opt_bg: '移除背景',
    opt_bg_desc: '完全隔离主体对象。'
  }
};

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

// Base options configuration (icons and prompts remain constant)
const BASE_OPTIONS = [
  { id: 'auto-all', icon: Zap, prompt: 'Full masterpiece restoration: remove noise, fix cracks, sharpen details, and apply natural colorization.' },
  { id: 'restore', icon: ScanLine, prompt: 'Heavy restoration: fix physical damage like tears, scratches, and stains.' },
  { id: 'remove-flaws', icon: Edit3, prompt: 'Advanced flaw removal: clean up dust, specks, and minor surface imperfections from the photo.' },
  { id: 'colorize', icon: Palette, prompt: 'Natural colorization: add vivid and realistic colors to this monochrome photo.' },
  { id: 'enhance', icon: Sparkles, prompt: 'Image enhancement: fine-tune contrast and sharpen features.' },
  { id: 'upscale', icon: Maximize2, prompt: 'Sharpen details and increase clarity significantly.' },
  { id: 'remove-bg', icon: ImageOff, prompt: 'Background removal: Remove the background completely, isolating the main subject.' }
];

export default function App() {
  const { processImage: apiProcess, mergeImages: apiMerge, generateImage: apiGenerate, chat: apiChat, isProcessing } = useImageProcessing();
  const [activeTab, setActiveTab] = useState<AppTab>('restore');
  const [imageState, setImageState] = useState<ImageState>({
    file: null, originalPreview: null, processedPreview: null, processedCandidates: [], mimeType: '', history: [], future: []
  });
  
  const [mergeState, setMergeState] = useState<MergeState>({
    imageA: null, imageB: null, mimeTypeA: '', mimeTypeB: '', results: null, resultIndex: 0
  });
  const [mergeCount, setMergeCount] = useState(1);
  const [restoreCount, setRestoreCount] = useState(1);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [activeMode, setActiveMode] = useState<RestorationMode | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [generateState, setGenerateState] = useState<GenerateState>({
    prompt: '', baseImage: null, baseMimeType: null, results: null, resultIndex: 0
  });
  const [generateCount, setGenerateCount] = useState(1);
  const [aspectRatio, setAspectRatio] = useState('1:1');

  // Inicializa settings com scale: 1 por padrão
  const [settings, setSettings] = useState<AppSettings>(() => safeStorage.load('restaurai_settings', { language: 'pt', theme: 'dark', scale: 1, preferredModel: 'gemini-2.5-flash-image' }));
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => safeStorage.load('restaurai_history', []));
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  useEffect(() => { setStatus(isProcessing ? 'processing' : 'idle'); }, [isProcessing]);
  useEffect(() => { safeStorage.save('restaurai_history', history); }, [history]);
  useEffect(() => { safeStorage.save('restaurai_settings', settings); }, [settings]);

  // Efeito para aplicar a escala no HTML root
  useEffect(() => {
    // Tailwind usa rem, então mudar o font-size do html escala tudo
    // 100% = 16px (padrão), 125% = 20px, 150% = 24px
    document.documentElement.style.fontSize = `${settings.scale * 100}%`;
  }, [settings.scale]);

  const isLight = settings.theme === 'light';
  const cardBg = isLight ? 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] border-slate-200' : 'bg-slate-900/80 shadow-2xl border-slate-800';
  const textMain = isLight ? 'text-slate-900 font-extralight' : 'text-white font-extralight';
  const textSub = isLight ? 'text-slate-600 font-medium' : 'text-slate-400 font-light';
  const utilityIconColor = isLight ? 'text-indigo-600 hover:text-indigo-700' : 'text-yellow-400 hover:text-yellow-300';

  // Helper de tradução
  const t = useCallback((key: keyof typeof TRANSLATIONS.pt) => {
    const lang = settings.language || 'pt';
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.pt[key];
  }, [settings.language]);

  // Construir opções com tradução dinâmica
  const restorationOptions: ActionOption[] = BASE_OPTIONS.map(opt => ({
    ...opt,
    id: opt.id as RestorationMode,
    label: t(`opt_${opt.id}` as any),
    description: t(`opt_${opt.id}_desc` as any)
  }));

  const handleApiError = (err: any) => {
    let msg = err.message || "Erro de conexão com a API.";
    if (msg.includes("API_KEY")) msg = "Chave de API inválida ou não encontrada. Recarregue a página.";
    if (msg.includes("403")) msg = "Acesso negado (API Key inválida).";
    
    setErrorMsg(msg);
    setStatus('error');
    console.error("Erro no processamento:", err);
  };

  const handleImageSelect = (file: File, base64: string, mimeType: string) => {
    setImageState({ file, originalPreview: base64, processedPreview: null, processedCandidates: [], mimeType, history: [], future: [] });
    setErrorMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProcess = async (mode: RestorationMode) => {
    if (!imageState.originalPreview) return;
    setActiveMode(mode);
    setErrorMsg(null);
    try {
      const toolPrompt = restorationOptions.find(o => o.id === mode)?.prompt || '';
      const userContext = customPrompt.trim() ? `ADICIONAL: ${customPrompt}. ` : '';
      const finalPrompt = `${userContext}${toolPrompt}`;
      
      const count = mode === 'custom' ? restoreCount : 1;

      const results = await apiProcess(imageState.originalPreview, imageState.mimeType, finalPrompt, settings.preferredModel, count);
      
      if (!results || results.length === 0) throw new Error("Nenhum resultado gerado.");

      const firstResult = results[0].base64;
      const candidates = results.map(r => r.base64);

      setImageState(prev => ({ 
        ...prev, 
        processedPreview: firstResult,
        processedCandidates: candidates,
        history: [...prev.history, prev.originalPreview!],
        future: [] 
      }));
      
      setHistory(prev => [{
        id: Date.now().toString(),
        original: imageState.originalPreview!,
        processed: firstResult,
        mode: restorationOptions.find(o => o.id === mode)?.label || 'Personalizado',
        timestamp: Date.now(),
        description: results[0].description
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
      processedCandidates: [],
      history: [...prev.history], 
      future: []
    }));
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
      processedCandidates: [],
      future: [prev.originalPreview!, ...prev.future],
      history: prev.history.slice(0, -1)
    }));
  };

  const handleRedo = () => {
    if (imageState.future.length === 0) return;
    const next = imageState.future[0];
    setImageState(prev => ({
      ...prev,
      originalPreview: next,
      processedPreview: null,
      processedCandidates: [],
      history: [...prev.history, prev.originalPreview!],
      future: prev.future.slice(1)
    }));
  };

  const handleFullReset = () => {
    setImageState({ file: null, originalPreview: null, processedPreview: null, processedCandidates: [], mimeType: '', history: [], future: [] });
    setMergeState({ imageA: null, imageB: null, mimeTypeA: '', mimeTypeB: '', results: null, resultIndex: 0 });
    setGenerateState({ prompt: '', baseImage: null, baseMimeType: null, results: null, resultIndex: 0 });
    setStatus('idle');
    setCustomPrompt('');
    setErrorMsg(null);
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
    setErrorMsg(null);
    try {
      const baseImg = generateState.baseImage ? { data: generateState.baseImage, mimeType: generateState.baseMimeType! } : undefined;
      const results = await apiGenerate(generateState.prompt, generateCount, aspectRatio, baseImg);
      setGenerateState(prev => ({ ...prev, results: results.map((r: any) => r.base64), resultIndex: 0 }));
      setStatus('success');
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleMergeAction = async () => {
    if (!mergeState.imageA || !mergeState.imageB || !customPrompt.trim()) return;
    setErrorMsg(null);
    try {
      const results = await apiMerge(mergeState.imageA, mergeState.mimeTypeA, mergeState.imageB, mergeState.mimeTypeB, customPrompt, mergeCount);
      setMergeState(prev => ({ ...prev, results: results.map((r: any) => r.base64), resultIndex: 0 }));
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
            <div className="absolute inset-0 bg-yellow-400/0 blur-[15px] rounded-full z-0 pointer-events-none group-hover:bg-yellow-400/20 transition-all duration-500 scale-90" />
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
             <button onClick={() => setActiveTab('restore')} className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all text-xs uppercase font-bold ${activeTab === 'restore' ? 'bg-indigo-600 text-white shadow-md' : isLight ? 'text-slate-700 hover:text-slate-950' : 'text-slate-400 hover:text-white'}`}><RefreshCw className="w-3 h-3" /> {t('restore')}</button>
             <button onClick={() => setActiveTab('merge')} className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all text-xs uppercase font-bold ${activeTab === 'merge' ? 'bg-indigo-600 text-white shadow-md' : isLight ? 'text-slate-700 hover:text-slate-950' : 'text-slate-400 hover:text-white'}`}><Layers className="w-3 h-3" /> {t('merge')}</button>
             <button onClick={() => setActiveTab('generate')} className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all text-xs uppercase font-bold ${activeTab === 'generate' ? 'bg-indigo-600 text-white shadow-md' : isLight ? 'text-slate-700 hover:text-slate-950' : 'text-slate-400 hover:text-white'}`}><ImageIcon className="w-3 h-3" /> {t('generate')}</button>
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowAbout(true)} className={`p-2 transition-colors ${utilityIconColor}`} title={t('about')}><Info className="w-5 h-5" /></button>
            <button onClick={() => setShowHistory(true)} className={`p-2 transition-colors ${utilityIconColor}`} title={t('history')}><History className="w-5 h-5" /></button>
            <button onClick={() => setShowSettings(true)} className={`p-2 transition-colors ${utilityIconColor}`} title={t('settings')}><Settings className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {errorMsg && (
          <div className="mb-6 p-5 rounded-3xl border bg-red-500/10 border-red-500/30 text-red-600 text-xs font-bold shadow-xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="p-2 rounded-full bg-red-500 text-white"><AlertCircle className="w-5 h-5" /></div>
              <div className="flex-1"><p className="text-sm uppercase mb-1 font-bold">Atenção</p><p className="font-light">{errorMsg}</p></div>
              <button onClick={() => setErrorMsg(null)} className="p-2 hover:bg-black/5 rounded-full"><X className="w-5 h-5" /></button>
          </div>
        )}

        {activeTab === 'restore' && (
          !imageState.originalPreview ? (
            <div className="grid md:grid-cols-2 gap-12 items-center min-h-[60vh] py-10">
              <div className="space-y-6">
                <h1 className={`text-4xl lg:text-6xl uppercase ${textMain} leading-tight`}>{t('hero_restore_title')} <span className="text-yellow-500 font-bold">{t('hero_restore_highlight')}</span>.</h1>
                <p className={`${textSub} text-sm max-w-sm tracking-soft`}>{t('hero_restore_sub')}</p>
                <Uploader onImageSelect={handleImageSelect} />
              </div>
              <ChatAssistant cardBg={cardBg} isLight={isLight} apiChat={apiChat} t={t} />
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2 space-y-6">
                <div className={`${cardBg} rounded-3xl border p-2 min-h-[400px] flex items-center justify-center relative overflow-hidden transition-all shadow-2xl`}>
                  {status === 'processing' && <LoaderOverlay t={t} />}
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

                {/* Miniaturas das variações se houver mais de uma */}
                {imageState.processedCandidates && imageState.processedCandidates.length > 1 && (
                  <div className={`flex justify-center gap-3 p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'}`}>
                    {imageState.processedCandidates.map((src, idx) => (
                       <button 
                          key={idx}
                          onClick={() => setImageState(p => ({...p, processedPreview: src}))}
                          className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${imageState.processedPreview === src ? 'border-indigo-600 scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                       >
                         <img src={src} className="w-full h-full object-cover" />
                         <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] px-1">{idx + 1}x</span>
                       </button>
                    ))}
                  </div>
                )}

                {imageState.processedPreview && (
                   <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                      <Button onClick={handleApplyResult} variant="primary" className="h-14 px-10 uppercase text-xs font-bold w-full sm:w-auto bg-green-600 hover:bg-green-500" icon={Check}>{t('apply')}</Button>
                      <Button onClick={() => handleDownloadImage(imageState.processedPreview)} variant="secondary" className="h-14 px-10 uppercase text-xs font-bold w-full sm:w-auto" icon={Download}>{t('download')}</Button>
                   </div>
                )}
              </div>
              <div className="space-y-6">
                <div className={`${cardBg} rounded-3xl border p-5 shadow-xl`}>
                   <div className="flex items-center justify-between mb-4">
                      <div className="text-[10px] uppercase font-bold tracking-elegant text-indigo-600 flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5" /> {t('manual_adjust')}</div>
                      <div className={`flex p-1 rounded-xl border space-x-1 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800/50 border-slate-700'}`}>
                        <button onClick={handleUndo} disabled={imageState.history.length === 0} className="p-2 rounded-lg disabled:opacity-20"><Undo2 className="w-4 h-4" /></button>
                        <button onClick={handleRedo} disabled={imageState.future.length === 0} className="p-2 rounded-lg disabled:opacity-20"><Redo2 className="w-4 h-4" /></button>
                      </div>
                   </div>
                   <div className="relative group space-y-4">
                     <textarea className={`w-full ${isLight ? 'bg-slate-50 text-slate-900 border-slate-300' : 'bg-slate-950 text-white border-slate-800'} rounded-2xl p-4 pr-12 text-xs h-24 outline-none border transition-all focus:border-indigo-600`} placeholder={t('prompt_placeholder_custom')} value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} />
                     
                     <div className="flex items-center justify-between">
                        <div className={`text-[9px] uppercase font-bold tracking-elegant ${textSub}`}>{t('variations')}</div>
                        <div className={`flex p-0.5 rounded-lg border ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-800 border-slate-700'}`}>
                            {[1, 2, 4].map(n => (
                              <button key={n} onClick={() => setRestoreCount(n)} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${restoreCount === n ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}>{n}x</button>
                            ))}
                        </div>
                     </div>

                     <Button onClick={() => handleProcess('custom')} disabled={!customPrompt.trim() || status === 'processing'} className="w-full" variant="primary" icon={Sparkles}>{t('generate')}</Button>
                   </div>
                </div>
                <div className={`${cardBg} rounded-3xl border p-5 shadow-xl`}>
                  <h2 className={`text-[10px] flex items-center gap-2 mb-6 uppercase tracking-elegant font-bold ${textMain}`}><Wand2 className="w-3.5 h-3.5 text-indigo-600" /> {t('methods')}</h2>
                  <div className="grid grid-cols-1 gap-2.5">
                    {restorationOptions.map(opt => (
                      <ActionCard key={opt.id} option={opt} active={activeMode === opt.id && status === 'success'} onClick={() => handleProcess(opt.id)} isLight={isLight} />
                    ))}
                  </div>
                </div>
                <Button onClick={handleFullReset} variant="ghost" className="w-full h-10 uppercase text-[9px] border" icon={RotateCcw}>{t('clear_studio')}</Button>
              </div>
            </div>
          )
        )}

        {activeTab === 'merge' && (
          <div className="grid md:grid-cols-2 gap-12 py-10">
            <div className="space-y-8">
               <h1 className={`text-4xl lg:text-6xl uppercase ${textMain} leading-tight`}>{t('hero_merge_title')} <span className="text-yellow-500 font-bold">{t('hero_merge_highlight')}</span>.</h1>
               <div className="grid grid-cols-2 gap-4">
                  <UploaderCompact label={t('upload_photo_a')} current={mergeState.imageA} onSelect={(f:any, b:any, m:any) => setMergeState(p => ({...p, imageA: b, mimeTypeA: m}))} isLight={isLight} />
                  <UploaderCompact label={t('upload_photo_b')} current={mergeState.imageB} onSelect={(f:any, b:any, m:any) => setMergeState(p => ({...p, imageB: b, mimeTypeB: m}))} isLight={isLight} />
               </div>
               <div className={`${cardBg} p-6 rounded-3xl border shadow-xl space-y-4`}>
                  <textarea className={`w-full ${isLight ? 'bg-slate-50 text-slate-900 border-slate-300' : 'bg-slate-950 text-white border-slate-800'} rounded-xl p-4 text-sm h-32 outline-none border transition-all focus:border-indigo-600`} placeholder={t('prompt_placeholder_merge')} value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} />
                  <div className="flex flex-col gap-2">
                    <p className={`text-[10px] uppercase font-bold tracking-elegant ${textSub}`}>{t('variations')}</p>
                    <div className={`flex p-1 rounded-xl border ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-800 border-slate-700'}`}>
                        {[1, 2, 4].map(n => (
                          <button key={n} onClick={() => setMergeCount(n)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${mergeCount === n ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>{n}x</button>
                        ))}
                    </div>
                  </div>
                  <Button onClick={handleMergeAction} className="w-full h-14 uppercase font-bold" isLoading={status === 'processing'} icon={Layers}>{t('generate')}</Button>
               </div>
            </div>
            {mergeState.results ? (
              <ResultsGallery results={mergeState.results} currentIndex={mergeState.resultIndex} onIndexChange={(idx: number) => setMergeState(p => ({...p, resultIndex: idx}))} onDownload={() => handleDownloadImage(mergeState.results![mergeState.resultIndex])} cardBg={cardBg} onReset={() => setMergeState(p => ({...p, results: null}))} t={t} />
            ) : (
              <ChatAssistant cardBg={cardBg} isLight={isLight} apiChat={apiChat} t={t} />
            )}
          </div>
        )}

        {activeTab === 'generate' && (
          <div className="grid md:grid-cols-2 gap-12 py-10">
            <div className="space-y-8">
               <h1 className={`text-4xl lg:text-6xl uppercase ${textMain} leading-tight`}>{t('hero_gen_title')} <span className="text-yellow-500 font-bold">{t('hero_gen_highlight')}</span>.</h1>
               <div className="flex items-center gap-4">
                  <div className="w-32 h-32"><UploaderCompact label={t('upload_ref')} current={generateState.baseImage} onSelect={(f:any, b:any, m:any) => setGenerateState(p => ({...p, baseImage: b, baseMimeType: m}))} isLight={isLight} /></div>
                  <div className="flex-1"><p className={`text-[10px] uppercase font-bold mb-1 ${textSub}`}>{t('base_optional')}</p><p className={`text-[9px] ${textSub} opacity-80`}>{t('base_desc')}</p></div>
               </div>
               <div className={`${cardBg} p-6 rounded-3xl border shadow-xl space-y-6`}>
                  <textarea className={`w-full ${isLight ? 'bg-slate-50 text-slate-900 border-slate-300' : 'bg-slate-950 text-white border-slate-800'} rounded-xl p-4 text-sm h-40 outline-none border focus:border-indigo-600`} placeholder={t('prompt_placeholder_gen')} value={generateState.prompt} onChange={e => setGenerateState(p => ({...p, prompt: e.target.value}))} />
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="flex flex-col gap-2">
                        <p className={`text-[10px] uppercase font-bold tracking-elegant ${textSub}`}>{t('quantity')}</p>
                        <div className={`flex p-1 rounded-xl border ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-800 border-slate-700'}`}>
                           {[1, 2, 4].map(n => (
                             <button key={n} onClick={() => setGenerateCount(n)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${generateCount === n ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}>{n}x</button>
                           ))}
                        </div>
                     </div>
                     <div className="flex flex-col gap-2">
                        <p className={`text-[10px] uppercase font-bold tracking-elegant ${textSub}`}>{t('aspect_ratio')}</p>
                        <div className={`flex p-1 rounded-xl border ${isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-800 border-slate-700'}`}>
                           <button onClick={() => setAspectRatio('1:1')} className={`flex-1 flex justify-center py-1.5 rounded-lg ${aspectRatio === '1:1' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}><Square className="w-3.5 h-3.5" /></button>
                           <button onClick={() => setAspectRatio('16:9')} className={`flex-1 flex justify-center py-1.5 rounded-lg ${aspectRatio === '16:9' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}><RectangleHorizontal className="w-3.5 h-3.5" /></button>
                        </div>
                     </div>
                  </div>

                  <Button onClick={handleGenerate} className="w-full h-14 uppercase font-bold" isLoading={status === 'processing'} icon={Sparkles}>{t('generate')}</Button>
               </div>
            </div>
            {generateState.results ? (
              <ResultsGallery results={generateState.results} currentIndex={generateState.resultIndex} onIndexChange={(idx: number) => setGenerateState(p => ({...p, resultIndex: idx}))} onDownload={() => handleDownloadImage(generateState.results![generateState.resultIndex])} cardBg={cardBg} onReset={() => setGenerateState(p => ({...p, results: null}))} t={t} />
            ) : (
              <ChatAssistant cardBg={cardBg} isLight={isLight} apiChat={apiChat} t={t} />
            )}
          </div>
        )}
      </main>

      <nav className={`md:hidden fixed bottom-4 left-4 right-4 z-50 p-2 rounded-[2rem] border backdrop-blur-3xl shadow-2xl flex justify-between ${isLight ? 'bg-white/95 border-slate-300 shadow-xl' : 'bg-slate-950/80 border-slate-800'}`}>
         {(['restore', 'merge', 'generate'] as AppTab[]).map(tab => (
           <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 flex flex-col items-center gap-1 rounded-[1.5rem] transition-all ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>
             {tab === 'restore' ? <RotateCcw className="w-4 h-4" /> : tab === 'merge' ? <Layers className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
             <span className="text-[7px] uppercase font-bold">{t(tab)}</span>
           </button>
         ))}
      </nav>

      {/* Histórico e Outros Modais */}
      <Modal isOpen={showAbout} onClose={() => setShowAbout(false)} title={t('about')} isLight={isLight}>
        <div className="space-y-8 text-center">
          <div className="relative w-full aspect-square rounded-[2rem] overflow-hidden border border-indigo-600/20 shadow-2xl">
             <AboutCarousel images={ABOUT_CAROUSEL_IMAGES} />
          </div>
          <div className="space-y-6 italic leading-relaxed text-sm">
            <p className={isLight ? 'text-indigo-700' : 'text-indigo-400'}>"para conservar a memória de quem nos trouxe até aqui"</p>
            <div className="flex flex-col items-center gap-1.5 uppercase text-[10px] font-bold opacity-80">
              <span className="flex items-center gap-2">Para Ilma S2 <Heart className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" /></span>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title={t('history')} isLight={isLight}>
        {history.length === 0 ? (
          <div className="text-center py-12 opacity-40"><Clock className="w-12 h-12 mx-auto mb-4" /><p className="text-xs uppercase">{t('history_empty')}</p></div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
            {history.map((item) => (
              <div key={item.id} className={`flex gap-4 p-3 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'}`}>
                <div 
                  className={`w-16 h-16 overflow-hidden rounded-xl border border-slate-700 shrink-0 cursor-pointer transition-all hover:scale-105 hover:border-indigo-500`} 
                  onClick={() => setFullScreenImage(item.processed)}
                  title="Ver em tela cheia"
                >
                  <img src={item.processed} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <div className="text-[9px] uppercase font-bold mb-1 text-indigo-400">{item.mode}</div>
                  <div className="flex gap-2">
                    <button onClick={() => setFullScreenImage(item.processed)} className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 hover:text-white hover:bg-indigo-600 transition-colors" title="Tela cheia"><Maximize2 className="w-3 h-3" /></button>
                    <button onClick={() => handleDownloadImage(item.processed)} className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 hover:text-white hover:bg-indigo-600 transition-colors" title={t('download')}><Download className="w-3 h-3" /></button>
                    <button onClick={() => setHistory(h => h.filter(x => x.id !== item.id))} className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 hover:text-white hover:bg-red-600 transition-colors" title="Apagar"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title={t('settings')} isLight={isLight}>
        <div className="space-y-6">
           
           {/* Seletor de Tema */}
           <div>
             <h3 className="text-[10px] uppercase font-bold mb-2 flex items-center gap-2"><Sun className="w-3 h-3" /> {t('theme')}</h3>
             <div className="flex p-1 rounded-xl border border-slate-700">
                <button onClick={() => setSettings(s => ({...s, theme: 'dark'}))} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${!isLight ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Dark</button>
                <button onClick={() => setSettings(s => ({...s, theme: 'light'}))} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${isLight ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Light</button>
             </div>
           </div>

           {/* Seletor de Idioma */}
           <div>
             <h3 className="text-[10px] uppercase font-bold mb-2 flex items-center gap-2"><Globe className="w-3 h-3" /> {t('language')}</h3>
             <div className="grid grid-cols-4 gap-2">
                {[
                  {code: 'pt', label: 'PT'},
                  {code: 'en', label: 'EN'},
                  {code: 'es', label: 'ES'},
                  {code: 'cn', label: 'CN'}
                ].map((lang) => (
                  <button 
                    key={lang.code}
                    onClick={() => setSettings(s => ({...s, language: lang.code as Language}))}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all ${settings.language === lang.code ? 'bg-indigo-600 text-white border-indigo-500' : 'border-slate-700 text-slate-500 hover:border-slate-500'}`}
                  >
                    {lang.label}
                  </button>
                ))}
             </div>
           </div>

           {/* Seletor de Escala */}
           <div>
             <h3 className="text-[10px] uppercase font-bold mb-2 flex items-center gap-2"><Monitor className="w-3 h-3" /> {t('scale')}</h3>
             <div className="flex p-1 rounded-xl border border-slate-700">
                {[1, 1.25, 1.5].map((scaleVal) => (
                  <button 
                    key={scaleVal}
                    onClick={() => setSettings(s => ({...s, scale: scaleVal}))} 
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${settings.scale === scaleVal ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    {scaleVal * 100}%
                  </button>
                ))}
             </div>
           </div>

        </div>
      </Modal>

      {/* Full Screen Image Overlay */}
      {fullScreenImage && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col items-center justify-center p-2 md:p-4 animate-in zoom-in-95 duration-200" onClick={() => setFullScreenImage(null)}>
            <button onClick={() => setFullScreenImage(null)} className="absolute top-4 right-4 z-50 p-3 bg-black/50 hover:bg-white/20 rounded-full text-white/80 hover:text-white backdrop-blur-sm transition-all"><X className="w-6 h-6" /></button>
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <img src={fullScreenImage} className="max-w-full max-h-full object-contain rounded-md shadow-2xl" onClick={(e) => e.stopPropagation()} />
            </div>
            <div className="absolute bottom-6 flex gap-4 z-50" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => handleDownloadImage(fullScreenImage)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-bold uppercase text-xs tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-900/20 transition-transform hover:scale-105 border border-indigo-400/20 backdrop-blur-md">
                    <Download className="w-4 h-4" /> {t('download')}
                </button>
            </div>
        </div>
      )}
    </div>
  );
}
// ... components ResultsGallery, LoaderOverlay, ChatAssistant, Modal, UploaderCompact, AboutCarousel, ActionCard remain unchanged
function LoaderOverlay({ t }: { t: any }) {
  return (
    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-4 shadow-[0_0_20px_rgba(79,70,229,0.3)]"></div>
      <p className="text-lg font-bold uppercase text-white tracking-widest">{t('processing')}</p>
      <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-elegant">{t('processing_sub')}</p>
    </div>
  );
}

function ResultsGallery({ results, currentIndex, onIndexChange, onDownload, onReset, cardBg, t }: any) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  return (
    <>
      <div className={`${cardBg} rounded-3xl border p-4 flex flex-col items-center justify-center min-h-[400px] shadow-2xl relative animate-in zoom-in-95 duration-500`}>
        <div className="relative group w-full flex flex-col items-center">
          <div className="relative w-full aspect-square flex items-center justify-center bg-black/5 rounded-2xl overflow-hidden mb-4 border border-white/5">
             <img src={results[currentIndex]} className="max-h-full max-w-full object-contain shadow-xl" />
             <button onClick={() => setIsFullScreen(true)} className="absolute top-2 right-2 p-2 bg-black/60 rounded-full text-white hover:bg-indigo-600 transition-colors opacity-0 group-hover:opacity-100"><Maximize2 className="w-4 h-4" /></button>
          </div>
          {results.length > 1 && (
            <div className="flex gap-4 mb-4">
              <button onClick={() => onIndexChange((currentIndex - 1 + results.length) % results.length)} className="p-2 bg-slate-800 rounded-full text-white hover:bg-indigo-600 transition-colors"><ChevronLeft /></button>
              <span className="flex items-center text-xs font-bold uppercase tabular-nums tracking-widest">{currentIndex + 1} / {results.length}</span>
              <button onClick={() => onIndexChange((currentIndex + 1) % results.length)} className="p-2 bg-slate-800 rounded-full text-white hover:bg-indigo-600 transition-colors"><ChevronRight /></button>
            </div>
          )}
        </div>
        <div className="flex gap-4 w-full">
           <Button onClick={onDownload} variant="primary" className="flex-1 h-12 uppercase text-xs font-bold" icon={Download}>{t('download')}</Button>
           <Button onClick={onReset} variant="secondary" className="flex-1 h-12 uppercase text-xs font-bold">{t('clear_studio')}</Button>
        </div>
      </div>

      {isFullScreen && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-2 md:p-4">
           <button onClick={() => setIsFullScreen(false)} className="absolute top-4 right-4 z-50 p-3 bg-black/50 hover:bg-white/20 rounded-full text-white/80 hover:text-white backdrop-blur-sm transition-all"><X className="w-6 h-6" /></button>
           <div className="w-full h-full flex items-center justify-center overflow-hidden">
             <img src={results[currentIndex]} className="max-w-full max-h-full object-contain" />
           </div>
        </div>
      )}
    </>
  );
}

function ChatAssistant({ cardBg, isLight, apiChat, t }: { cardBg: string; isLight: boolean; apiChat: (m: string) => Promise<string>, t: any }) {
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: t('concierge_intro') }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reinicia mensagem se mudar idioma
  useEffect(() => {
    setMessages([{ role: 'model', text: t('concierge_intro') }]);
  }, [t]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    try {
      const response = await apiChat(userMsg);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, tive um problema de conexão. Poderia tentar novamente?' }]);
    } finally { setLoading(false); }
  };

  return (
    <div className={`${cardBg} rounded-[2rem] border h-[450px] flex flex-col overflow-hidden shadow-xl`}>
      <div className={`p-4 border-b ${isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-black/5'} flex items-center justify-between`}>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div><span className="text-[10px] font-bold uppercase opacity-60">{t('concierge_title')}</span></div>
        <MessageSquare className="w-4 h-4 text-indigo-600" />
      </div>
      <div ref={scrollRef} className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar scroll-smooth">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-[11px] leading-relaxed border ${m.role === 'user' ? 'bg-indigo-600 text-white border-indigo-400' : isLight ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'}`}>{m.text}</div>
          </div>
        ))}
        {loading && (
           <div className="flex justify-start animate-pulse">
              <div className="bg-slate-800 p-2 rounded-xl text-[10px] uppercase font-bold text-slate-500">...</div>
           </div>
        )}
      </div>
      <div className={`p-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
        <div className="relative">
          <input type="text" className={`w-full ${isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-slate-950 text-white border-slate-800'} rounded-xl py-2.5 pl-4 pr-12 text-xs outline-none border focus:border-indigo-600 transition-all`} placeholder={t('concierge_placeholder')} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
          <button onClick={handleSend} disabled={!input.trim() || loading} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-indigo-500 disabled:opacity-30 hover:scale-110 transition-transform"><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children, isLight }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      <div className={`relative w-full max-w-md ${isLight ? 'bg-white text-slate-950' : 'bg-slate-900 text-white'} rounded-[2rem] border border-slate-800/50 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300`}>
        <div className={`p-6 border-b flex items-center justify-between ${isLight ? 'border-slate-100' : 'border-slate-800/20'}`}>
          <h2 className="text-xs uppercase font-bold tracking-elegant">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function UploaderCompact({ label, current, onSelect, isLight }: any) {
  return (
    <label className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all hover:border-indigo-600 relative overflow-hidden h-full w-full ${isLight ? 'bg-slate-50 border-slate-400' : 'bg-slate-900/40 border-slate-700'}`}>
      {current ? <img src={current} className="w-full h-full object-cover rounded-xl" /> : (
        <div className="flex flex-col items-center p-2 text-center">
          <ImageIcon className="w-5 h-5 text-indigo-600 mb-1" />
          <span className="text-[10px] font-bold uppercase text-slate-500">{label}</span>
        </div>
      )}
      <input type="file" className="hidden" onChange={(e:any) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onloadend = () => onSelect(f, r.result, f.type); r.readAsDataURL(f); } }} />
    </label>
  );
}

function AboutCarousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  useEffect(() => {
    if (isFullScreen) return; 
    const timer = setInterval(() => { setIndex(p => (p + 1) % images.length); }, 4000);
    return () => clearInterval(timer);
  }, [images.length, isFullScreen]);

  const handlePrev = (e: React.MouseEvent) => { e.stopPropagation(); setIndex(p => (p - 1 + images.length) % images.length); };
  const handleNext = (e: React.MouseEvent) => { e.stopPropagation(); setIndex(p => (p + 1) % images.length); };

  return (
    <>
      <div className="w-full h-full relative group">
        {images.map((img, i) => (
          <img key={i} src={img} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${index === i ? 'opacity-100' : 'opacity-0'}`} />
        ))}
        <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <button onClick={handlePrev} className="p-1 bg-black/50 rounded-full text-white hover:bg-indigo-600"><ChevronLeft className="w-5 h-5" /></button>
           <button onClick={handleNext} className="p-1 bg-black/50 rounded-full text-white hover:bg-indigo-600"><ChevronRight className="w-5 h-5" /></button>
        </div>
        <button onClick={() => setIsFullScreen(true)} className="absolute bottom-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-indigo-600 opacity-0 group-hover:opacity-100 transition-all">
           <Maximize2 className="w-4 h-4" />
        </button>
      </div>
      {isFullScreen && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-2 md:p-4">
           <button onClick={() => setIsFullScreen(false)} className="absolute top-4 right-4 z-50 p-3 bg-black/50 hover:bg-white/20 rounded-full text-white/80 hover:text-white backdrop-blur-sm transition-all"><X className="w-6 h-6" /></button>
           <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
             <img src={images[index]} className="max-w-full max-h-full object-contain" />
             <button onClick={handlePrev} className="absolute left-2 md:left-4 p-3 md:p-4 bg-black/50 hover:bg-indigo-600/80 rounded-full text-white backdrop-blur-sm transition-all"><ChevronLeft className="w-6 h-6 md:w-8 md:h-8" /></button>
             <button onClick={handleNext} className="absolute right-2 md:right-4 p-3 md:p-4 bg-black/50 hover:bg-indigo-600/80 rounded-full text-white backdrop-blur-sm transition-all"><ChevronRight className="w-6 h-6 md:w-8 md:h-8" /></button>
           </div>
        </div>
      )}
    </>
  );
}

function ActionCard({ option, active, onClick, isLight }: any) {
  return (
    <button onClick={onClick} className={`flex items-center p-3.5 rounded-2xl border text-left transition-all w-full group ${active ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : isLight ? 'bg-white border-slate-300 hover:border-indigo-500' : 'bg-slate-800 border-slate-700 hover:border-indigo-500'}`}>
      <div className={`p-2 rounded-xl mr-3.5 transition-colors ${active ? 'bg-white/20' : 'bg-indigo-600/10 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
        <option.icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <div className="text-[10px] uppercase font-bold tracking-soft">{option.label}</div>
        <div className="text-[8px] line-clamp-1 opacity-70 font-light">{option.description}</div>
      </div>
    </button>
  );
}


import React from 'react';

export interface ImageState {
  file: File | null;
  originalPreview: string | null; // Base64 url
  processedPreview: string | null; // Base64 url
  mimeType: string;
  history: string[]; // Pilha para desfazer ações
  future: string[]; // Pilha para refazer ações
}

export interface MergeState {
  imageA: string | null;
  imageB: string | null;
  mimeTypeA: string;
  mimeTypeB: string;
  results: string[] | null;
  resultIndex: number; 
}

export interface GenerateState {
  prompt: string;
  baseImage: string | null;
  baseMimeType: string | null;
  results: string[] | null;
  resultIndex: number;
}

export type AppTab = 'restore' | 'merge' | 'generate';

export type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export type RestorationMode = 
  | 'auto-all'
  | 'restore' 
  | 'colorize' 
  | 'enhance' 
  | 'upscale'
  | 'remove-bg'
  | 'remove-flaws' 
  | 'custom';

export interface ActionOption {
  id: RestorationMode;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  prompt: string;
}

export interface ProcessResult {
  base64: string;
  model: string;
  description?: string;
}

export interface HistoryItem {
  id: string;
  original: string;
  processed: string;
  mode: string;
  timestamp: number;
  genModel?: string;
  description?: string;
}

export type Language = 'pt' | 'en';
export type Theme = 'dark' | 'light';

export interface AppSettings {
  language: Language;
  theme: Theme;
  preferredModel: string;
}

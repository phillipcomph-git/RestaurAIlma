
import { useState } from 'react';
import { ProcessResult } from '../types';

export function useImageProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processImage = async (base64Image: string, mimeType: string, prompt: string, model: string): Promise<ProcessResult> => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/process-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image, mimeType, prompt, model }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro no servidor.');
      }
      return await response.json();
    } finally {
      setIsProcessing(false);
    }
  };

  const mergeImages = async (imageA: string, mimeA: string, imageB: string, mimeB: string, prompt: string, count: number): Promise<ProcessResult[]> => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/merge-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageA, mimeA, imageB, mimeB, prompt, count }),
      });
      if (!response.ok) throw new Error('Falha na mesclagem.');
      return await response.json();
    } finally {
      setIsProcessing(false);
    }
  };

  const generateImage = async (prompt: string, count: number, aspectRatio: string, baseImage?: { data: string, mimeType: string }): Promise<ProcessResult[]> => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, count, aspectRatio, baseImage }),
      });
      if (!response.ok) throw new Error('Falha na geração.');
      return await response.json();
    } finally {
      setIsProcessing(false);
    }
  };

  const chat = async (message: string): Promise<string> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      return data.text || "Sem resposta.";
    } catch {
      return "Erro de conexão com o assistente.";
    }
  };

  return { processImage, mergeImages, generateImage, chat, isProcessing };
}

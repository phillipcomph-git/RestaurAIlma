
import { useState } from 'react';
import { ProcessResult } from '../types';
import * as geminiService from '../services/geminiService';

export function useImageProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);

  // Verifica se estamos no ambiente do AI Studio/Local onde a chave é injetada no browser
  const canRunLocally = !!process.env.API_KEY;

  const handleProcessing = async <T>(localFn: () => Promise<T>, apiEndpoint: string, body: any): Promise<T> => {
    setIsProcessing(true);
    try {
      if (canRunLocally) {
        console.log(`Executando localmente via SDK (Ambiente AI Studio)`);
        return await localFn();
      }

      console.log(`Executando via API Route: ${apiEndpoint} (Ambiente Vercel)`);
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro no processamento remoto.');
      }

      return await response.json();
    } finally {
      setIsProcessing(false);
    }
  };

  const processImage = async (base64Image: string, mimeType: string, prompt: string, model: string): Promise<ProcessResult> => {
    return handleProcessing(
      () => geminiService.processImage(base64Image, mimeType, prompt, model),
      '/api/process-image',
      { base64Image, mimeType, prompt, model }
    );
  };

  const mergeImages = async (imageA: string, mimeA: string, imageB: string, mimeB: string, prompt: string, count: number): Promise<ProcessResult[]> => {
    return handleProcessing(
      () => geminiService.mergeImages(imageA, mimeA, imageB, mimeB, prompt, count),
      '/api/merge-images',
      { imageA, mimeA, imageB, mimeB, prompt, count }
    );
  };

  const generateImage = async (prompt: string, count: number, aspectRatio: string, baseImage?: { data: string, mimeType: string }): Promise<ProcessResult[]> => {
    return handleProcessing(
      () => geminiService.generateImageFromPrompt(prompt, count, aspectRatio, baseImage),
      '/api/generate-image',
      { prompt, count, aspectRatio, baseImage }
    );
  };

  const chat = async (message: string): Promise<string> => {
    return handleProcessing(
      () => geminiService.chatWithAI(message, []),
      '/api/chat',
      { message }
    );
  };

  return { processImage, mergeImages, generateImage, chat, isProcessing };
}

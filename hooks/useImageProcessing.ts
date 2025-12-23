
import { useState } from 'react';
import { ProcessResult } from '../types';

export function useImageProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);

  const callApi = async (endpoint: string, body: any) => {
    setIsProcessing(true);
    try {
      const response = await fetch(endpoint, {
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
    return callApi('/api/process-image', { base64Image, mimeType, prompt, model });
  };

  const mergeImages = async (imageA: string, mimeA: string, imageB: string, mimeB: string, prompt: string, count: number): Promise<ProcessResult[]> => {
    return callApi('/api/merge-images', { imageA, mimeA, imageB, mimeB, prompt, count });
  };

  const generateImage = async (prompt: string, count: number, aspectRatio: string, baseImage?: { data: string, mimeType: string }): Promise<ProcessResult[]> => {
    return callApi('/api/generate-image', { prompt, count, aspectRatio, baseImage });
  };

  const chat = async (message: string): Promise<string> => {
    const res = await callApi('/api/chat', { message });
    return res.text;
  };

  return { processImage, mergeImages, generateImage, chat, isProcessing };
}

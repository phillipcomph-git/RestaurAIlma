
import { useState, useCallback } from 'react';
import { ProcessResult } from '../types';
import * as geminiService from '../services/geminiService';

// Utilitário de compressão
const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    const timeoutId = setTimeout(() => resolve(base64Str), 2000);

    img.onload = () => {
      clearTimeout(timeoutId);
      const maxWidth = 768; // Podemos usar um pouco mais de qualidade no client-side
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxWidth) {
          width *= maxWidth / height;
          height = maxWidth;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => { clearTimeout(timeoutId); resolve(base64Str); };
  });
};

export function useImageProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processImage = useCallback(async (base64Image: string, mimeType: string, prompt: string, model: string, count: number = 1): Promise<ProcessResult[]> => {
    if (isProcessing) return [];
    setIsProcessing(true);
    
    try {
      const optimizedImage = await compressImage(base64Image);
      
      // Chamadas paralelas diretas ao serviço
      const promises = Array(count).fill(0).map(() => 
        geminiService.processImage(optimizedImage, 'image/jpeg', prompt, model)
      );

      const results = await Promise.all(promises);
      return results; // Retorna array de ProcessResult
    } catch (error: any) {
      console.error(error);
      throw new Error(error.message || "Falha ao processar imagem.");
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  const mergeImages = useCallback(async (imageA: string, mimeA: string, imageB: string, mimeB: string, prompt: string, count: number): Promise<ProcessResult[]> => {
    if (isProcessing) return [];
    setIsProcessing(true);
    try {
      const optimizedA = await compressImage(imageA);
      const optimizedB = await compressImage(imageB);

      const results = await geminiService.mergeImages(optimizedA, 'image/jpeg', optimizedB, 'image/jpeg', prompt, count);
      if (results.length === 0) throw new Error("Não foi possível mesclar as imagens.");
      return results;
    } catch (error: any) {
       console.error(error);
       throw new Error(error.message || "Erro na mesclagem.");
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  const generateImage = useCallback(async (prompt: string, count: number, aspectRatio: string, baseImage?: { data: string, mimeType: string }): Promise<ProcessResult[]> => {
    if (isProcessing) return [];
    setIsProcessing(true);
    try {
      let payloadBaseImage = baseImage;
      if (baseImage) {
        const optimized = await compressImage(baseImage.data);
        payloadBaseImage = { data: optimized, mimeType: 'image/jpeg' };
      }

      const results = await geminiService.generateImageFromPrompt(prompt, count, aspectRatio, payloadBaseImage);
      if (results.length === 0) throw new Error("Não foi possível gerar a imagem.");
      return results;
    } catch (error: any) {
        console.error(error);
        throw new Error(error.message || "Erro na geração.");
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  const chat = useCallback(async (message: string): Promise<string> => {
    return await geminiService.chatWithAI(message, []);
  }, []);

  return { processImage, mergeImages, generateImage, chat, isProcessing };
}

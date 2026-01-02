
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
      const maxWidth = 768; // Otimizado para payload de API serverless
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

// Helper para tentar usar API Server-side primeiro, fallback para Client-side
async function tryServerApi(endpoint: string, body: any, fallbackFn: () => Promise<any>) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    // Se recebermos HTML (comum em erros 404 do Vite/SPA) ou 404, jogamos erro para usar fallback
    const contentType = response.headers.get("content-type");
    if (!response.ok || !contentType || !contentType.includes("application/json")) {
      throw new Error("API indisponível ou erro no servidor");
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    
    // Algumas APIs retornam array, outras objeto. Normalizamos aqui se necessário.
    return Array.isArray(data) ? data[0] : data;
    
  } catch (error) {
    console.warn(`Tentativa de API Server-side falhou (${endpoint}), usando fallback Client-side.`, error);
    return fallbackFn();
  }
}

export function useImageProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processImage = useCallback(async (base64Image: string, mimeType: string, prompt: string, model: string, count: number = 1): Promise<ProcessResult[]> => {
    if (isProcessing) return [];
    setIsProcessing(true);
    
    try {
      const optimizedImage = await compressImage(base64Image);
      
      const promises = Array(count).fill(0).map(() => 
        tryServerApi(
          '/api/process-image',
          { image: optimizedImage, mimeType: 'image/jpeg', prompt, model },
          () => geminiService.processImage(optimizedImage, 'image/jpeg', prompt, model)
        )
      );

      const results = await Promise.all(promises);
      return results;
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

      const promises = Array(count).fill(0).map(() => 
        tryServerApi(
            '/api/merge-images',
            { imageA: optimizedA, mimeA: 'image/jpeg', imageB: optimizedB, mimeB: 'image/jpeg', prompt },
            async () => {
                const res = await geminiService.mergeImages(optimizedA, 'image/jpeg', optimizedB, 'image/jpeg', prompt, 1);
                return res[0];
            }
        )
      );
      
      const results = await Promise.all(promises);
      if (results.length === 0 || !results[0]) throw new Error("Não foi possível mesclar as imagens.");
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

      const promises = Array(count).fill(0).map(() => 
        tryServerApi(
            '/api/generate-image',
            { prompt, aspectRatio, baseImage: payloadBaseImage },
            async () => {
                const res = await geminiService.generateImageFromPrompt(prompt, 1, aspectRatio, payloadBaseImage);
                return res[0];
            }
        )
      );

      const results = await Promise.all(promises);
      if (results.length === 0 || !results[0]) throw new Error("Não foi possível gerar a imagem.");
      return results;
    } catch (error: any) {
        console.error(error);
        throw new Error(error.message || "Erro na geração.");
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  const chat = useCallback(async (message: string): Promise<string> => {
    return tryServerApi(
        '/api/chat',
        { message },
        () => geminiService.chatWithAI(message, [])
    ).then(res => res.text || res); // A API retorna { text: ... }, o serviço retorna string direta
  }, []);

  return { processImage, mergeImages, generateImage, chat, isProcessing };
}

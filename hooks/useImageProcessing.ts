
import { useState } from 'react';
import { ProcessResult } from '../types';
import * as gemini from '../services/geminiService';

export function useImageProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processImage = async (base64Image: string, mimeType: string, prompt: string, model: string): Promise<ProcessResult> => {
    setIsProcessing(true);
    try {
      const result = await gemini.processImage(base64Image, mimeType, prompt, model);
      return result;
    } catch (err: any) {
      console.error("Erro detalhado no processamento:", err);
      // Propaga o erro com a mensagem original da IA se disponível
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const mergeImages = async (imageA: string, mimeA: string, imageB: string, mimeB: string, prompt: string, count: number): Promise<ProcessResult[]> => {
    setIsProcessing(true);
    try {
      const results = await gemini.mergeImages(imageA, mimeA, imageB, mimeB, prompt, count);
      return results;
    } catch (err: any) {
      console.error("Erro na mesclagem:", err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const generateImage = async (prompt: string, count: number, aspectRatio: string, baseImage?: { data: string, mimeType: string }): Promise<ProcessResult[]> => {
    setIsProcessing(true);
    try {
      const results = await gemini.generateImageFromPrompt(prompt, count, aspectRatio, baseImage);
      return results;
    } catch (err: any) {
      console.error("Erro na geração:", err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const chat = async (message: string): Promise<string> => {
    try {
      const response = await gemini.chatWithAI(message, []);
      return response;
    } catch (err: any) {
      return "Desculpe, tive um erro ao processar sua mensagem.";
    }
  };

  return { processImage, mergeImages, generateImage, chat, isProcessing };
}


import { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ProcessResult } from '../types';

export function useImageProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);

  // Inicializa o AI apenas quando necessário para garantir a chave mais recente
  const getAI = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY não configurada no ambiente.");
    return new GoogleGenAI({ apiKey });
  };

  const cleanBase64 = (base64Str: string) => {
    return base64Str.includes(',') ? base64Str.split(',')[1] : base64Str;
  };

  const processImage = async (base64Image: string, mimeType: string, prompt: string, model: string, count: number = 1): Promise<ProcessResult[]> => {
    setIsProcessing(true);
    try {
      const ai = getAI();
      const modelName = model || 'gemini-2.5-flash-image';
      const results: ProcessResult[] = [];
      
      for (let i = 0; i < count; i++) {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              { inlineData: { mimeType: mimeType || 'image/jpeg', data: cleanBase64(base64Image) } },
              { text: `Aja como um mestre restaurador de fotos. Instrução: ${prompt}. Retorne a imagem restaurada com alta fidelidade, mantendo as feições originais e removendo danos.` }
            ]
          },
          config: {
            temperature: 0.1 + (i * 0.1), // Varia levemente a temperatura para gerar resultados diferentes
          }
        });

        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) continue;

        const imgPart = candidates[0].content.parts.find(p => p.inlineData);
        const textPart = candidates[0].content.parts.find(p => p.text);

        if (imgPart?.inlineData?.data) {
          results.push({
            base64: `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`,
            model: modelName,
            description: textPart?.text
          });
        }
      }

      if (results.length === 0) throw new Error("A IA não retornou nenhuma imagem editada.");
      return results;

    } catch (error: any) {
      console.error("Erro no processamento local:", error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const chat = async (message: string): Promise<string> => {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: message,
        config: {
          systemInstruction: "Você é o Concierge da RestaurAIlma. Ajude o usuário a restaurar fotos de forma gentil.",
        }
      });
      return response.text || "Não consegui processar sua mensagem.";
    } catch (error) {
      console.error("Erro no chat local:", error);
      return "Erro de conexão com o assistente.";
    }
  };

  const mergeImages = async (imageA: string, mimeA: string, imageB: string, mimeB: string, prompt: string, count: number): Promise<ProcessResult[]> => {
    setIsProcessing(true);
    try {
      const ai = getAI();
      const results: ProcessResult[] = [];
      
      // Para múltiplos resultados, fazemos chamadas individuais
      for (let i = 0; i < count; i++) {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              { inlineData: { mimeType: mimeA, data: cleanBase64(imageA) } },
              { inlineData: { mimeType: mimeB, data: cleanBase64(imageB) } },
              { text: `Mescle estas fotos: ${prompt}. Crie um resultado ultra-realista.` }
            ]
          },
          config: { temperature: 0.5 }
        });

        const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imgPart?.inlineData?.data) {
          results.push({
            base64: `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`,
            model: 'gemini-2.5-flash-image'
          });
        }
      }
      return results;
    } finally {
      setIsProcessing(false);
    }
  };

  const generateImage = async (prompt: string, count: number, aspectRatio: string, baseImage?: { data: string, mimeType: string }): Promise<ProcessResult[]> => {
    setIsProcessing(true);
    try {
      const ai = getAI();
      const results: ProcessResult[] = [];
      const parts: any[] = [{ text: prompt }];
      
      if (baseImage) {
        parts.push({ inlineData: { mimeType: baseImage.mimeType, data: cleanBase64(baseImage.data) } });
      }

      for (let i = 0; i < count; i++) {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts },
          config: { 
            imageConfig: { aspectRatio: aspectRatio as any || "1:1" },
            temperature: 0.8
          }
        });

        const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imgPart?.inlineData?.data) {
          results.push({
            base64: `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`,
            model: 'gemini-2.5-flash-image'
          });
        }
      }
      return results;
    } finally {
      setIsProcessing(false);
    }
  };

  return { processImage, mergeImages, generateImage, chat, isProcessing };
}

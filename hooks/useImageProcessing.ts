
import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ProcessResult } from '../types';

export function useImageProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);

  const cleanBase64 = (base64: string) => base64.includes(',') ? base64.split(',')[1] : base64;

  const getAIInstance = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("Chave de API não configurada no ambiente.");
    return new GoogleGenAI({ apiKey });
  };

  const processImage = async (base64Image: string, mimeType: string, prompt: string, model: string): Promise<ProcessResult> => {
    setIsProcessing(true);
    try {
      const ai = getAIInstance();
      const data = cleanBase64(base64Image);

      const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { mimeType, data } },
            { text: `Restauração Profissional: ${prompt}. Recupere detalhes, remova ruído, limpe manchas e melhore a nitidez preservando a identidade original.` }
          ]
        },
        config: {
          systemInstruction: "Você é um mestre em restauração fotográfica. Sua missão é recuperar fotos antigas, colorir e remover danos físicos mantendo a fidelidade das pessoas. Retorne sempre a imagem modificada.",
          temperature: 0.1
        }
      });

      const parts = response.candidates?.[0]?.content?.parts;
      const imagePart = parts?.find(p => p.inlineData);
      
      if (imagePart?.inlineData?.data) {
        return {
          base64: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
          model: model || 'gemini-2.5-flash-image'
        };
      }
      throw new Error("A IA não retornou uma imagem válida.");
    } catch (error: any) {
      console.error("Erro no processamento:", error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const mergeImages = async (imageA: string, mimeA: string, imageB: string, mimeB: string, prompt: string, count: number): Promise<ProcessResult[]> => {
    setIsProcessing(true);
    try {
      const ai = getAIInstance();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { mimeType: mimeA, data: cleanBase64(imageA) } },
            { inlineData: { mimeType: mimeB, data: cleanBase64(imageB) } },
            { text: `Fusion Instruction: ${prompt}. Crie uma composição natural e realista mesclando as duas imagens.` }
          ]
        },
        config: { 
          systemInstruction: "Especialista em fusão de imagens e composição digital realista.",
          temperature: 0.4 
        }
      });

      const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (imgPart?.inlineData?.data) {
        return [{
          base64: `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`,
          model: 'gemini-2.5-flash-image'
        }];
      }
      return [];
    } catch (error: any) {
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const generateImage = async (prompt: string, count: number, aspectRatio: string, baseImage?: { data: string, mimeType: string }): Promise<ProcessResult[]> => {
    setIsProcessing(true);
    try {
      const ai = getAIInstance();
      const parts: any[] = [{ text: prompt }];
      if (baseImage) {
        parts.push({ inlineData: { mimeType: baseImage.mimeType, data: cleanBase64(baseImage.data) } });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { 
          imageConfig: { aspectRatio: aspectRatio as any || "1:1" }
        }
      });

      const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (imgPart?.inlineData?.data) {
        return [{
          base64: `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`,
          model: 'gemini-2.5-flash-image'
        }];
      }
      return [];
    } catch (error: any) {
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const chat = async (message: string): Promise<string> => {
    try {
      const ai = getAIInstance();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: message,
        config: {
          systemInstruction: "Você é o Concierge da RestaurAIlma. Ajude os usuários de forma breve e gentil.",
        }
      });
      return response.text || "Sem resposta.";
    } catch (error) {
      return "Desculpe, tive um problema de conexão.";
    }
  };

  return { processImage, mergeImages, generateImage, chat, isProcessing };
}

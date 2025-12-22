
import { GoogleGenAI } from "@google/genai";
import { ProcessResult } from "../types";

const cleanBase64 = (base64Str: string) => {
  if (!base64Str) return "";
  if (base64Str.includes(',')) {
    return base64Str.split(',')[1];
  }
  return base64Str;
};

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 3000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = error.status === 429 || 
                         error.message?.includes("429") || 
                         error.message?.includes("quota") ||
                         error.message?.includes("limit");

    if (retries > 0 && isQuotaError) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const processImage = async (
  base64Image: string,
  mimeType: string,
  promptInstruction: string,
  modelPreference: string = 'gemini-2.5-flash-image'
): Promise<ProcessResult> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: modelPreference,
      contents: {
        parts: [
          { inlineData: { mimeType, data: cleanBase64(base64Image) } },
          { text: `Restauração profissional: ${promptInstruction}. Mantenha a identidade e remova falhas.` }
        ]
      },
      config: {
        systemInstruction: "Você é um especialista em restauração fotográfica. Sua tarefa é recuperar fotos danificadas, colorir se necessário e aprimorar a qualidade preservando a identidade original.",
        temperature: 0.1,
        imageConfig: { aspectRatio: "1:1" },
      }
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("Não foi possível processar a imagem.");
    }

    const parts = candidates[0].content?.parts;
    const imagePart = parts?.find(p => p.inlineData);
    const textPart = parts?.find(p => p.text);

    if (imagePart?.inlineData?.data) {
      return {
        base64: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
        model: modelPreference,
        description: textPart?.text?.trim() || "Processamento concluído."
      };
    }
    
    throw new Error("A IA não retornou uma imagem válida.");
  });
};

export const generateImageFromPrompt = async (
  prompt: string,
  count: number = 1,
  aspectRatio: string = "1:1",
  baseImage?: { data: string, mimeType: string }
): Promise<ProcessResult[]> => {
  const results: ProcessResult[] = [];
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = 'gemini-2.5-flash-image';
  
  for (let i = 0; i < count; i++) {
    const result = await withRetry(async () => {
      const parts: any[] = [{ text: prompt }];
      if (baseImage) parts.push({ inlineData: { mimeType: baseImage.mimeType, data: cleanBase64(baseImage.data) } });

      const response = await ai.models.generateContent({
        model: modelId,
        contents: { parts },
        config: {
          temperature: 0.7 + (i * 0.1),
          imageConfig: { aspectRatio: aspectRatio as any }
        }
      });

      const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      
      if (imgPart?.inlineData?.data) {
        return {
          base64: `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`,
          model: modelId
        };
      }
      throw new Error("Falha na geração.");
    });
    
    results.push(result);
    if (count > 1 && i < count - 1) await new Promise(r => setTimeout(r, 1000));
  }
  
  return results;
};

export const mergeImages = async (
  imageA: string,
  mimeA: string,
  imageB: string,
  mimeB: string,
  instruction: string
): Promise<ProcessResult[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = 'gemini-2.5-flash-image';

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeA, data: cleanBase64(imageA) } },
          { inlineData: { mimeType: mimeB, data: cleanBase64(imageB) } },
          { text: instruction }
        ]
      },
      config: {
        systemInstruction: "Mescle os elementos de ambas as imagens de forma harmoniosa e realista.",
        temperature: 0.5, 
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    
    if (imgPart?.inlineData?.data) {
      return [{
        base64: `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`,
        model: modelId
      }];
    }
    throw new Error("Falha na mesclagem.");
  });
};

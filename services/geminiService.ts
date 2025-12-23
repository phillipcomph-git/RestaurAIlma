
import { GoogleGenAI } from "@google/genai";
import { ProcessResult } from "../types";

const cleanBase64 = (base64Str: string) => {
  if (!base64Str) return "";
  if (base64Str.includes(',')) {
    return base64Str.split(',')[1];
  }
  return base64Str;
};

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY não encontrada.");
  return new GoogleGenAI({ apiKey });
};

export const chatWithAI = async (message: string, history: any[]): Promise<string> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: message,
    config: {
      systemInstruction: "Você é o Concierge da RestaurAIlma. Ajude o usuário com dicas de restauração. Seja breve.",
    }
  });
  return response.text || "Sem resposta.";
};

export const processImage = async (
  base64Image: string,
  mimeType: string,
  promptInstruction: string,
  modelPreference: string = 'gemini-2.5-flash-image'
): Promise<ProcessResult> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: modelPreference,
    contents: {
      parts: [
        { inlineData: { mimeType, data: cleanBase64(base64Image) } },
        { text: `Restauração: ${promptInstruction}` }
      ]
    }
  });

  const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (imgPart?.inlineData?.data) {
    return {
      base64: `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`,
      model: modelPreference
    };
  }
  throw new Error("Falha ao processar.");
};

export const generateImageFromPrompt = async (
  prompt: string,
  count: number = 1,
  aspectRatio: string = "1:1",
  baseImage?: { data: string, mimeType: string }
): Promise<ProcessResult[]> => {
  const ai = getAIClient();
  const results: ProcessResult[] = [];
  
  for (let i = 0; i < (count || 1); i++) {
    const parts: any[] = [{ text: prompt }];
    if (baseImage) parts.push({ inlineData: { mimeType: baseImage.mimeType, data: cleanBase64(baseImage.data) } });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { 
        imageConfig: { aspectRatio: aspectRatio as any },
        temperature: 0.7 + (i * 0.05) // Pequena variação para resultados diferentes
      }
    });

    const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (imgPart?.inlineData?.data) {
      results.push({
        base64: `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`,
        model: 'gemini-2.5-flash-image'
      });
    }
    // Pequeno delay para evitar sobrecarga em chamadas locais sequenciais
    if (count > 1 && i < count - 1) await new Promise(r => setTimeout(r, 800));
  }
  return results;
};

export const mergeImages = async (
  imageA: string,
  mimeA: string,
  imageB: string,
  mimeB: string,
  instruction: string,
  count: number = 1
): Promise<ProcessResult[]> => {
  const ai = getAIClient();
  const results: ProcessResult[] = [];

  for (let i = 0; i < (count || 1); i++) {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeA, data: cleanBase64(imageA) } },
          { inlineData: { mimeType: mimeB, data: cleanBase64(imageB) } },
          { text: instruction }
        ]
      },
      config: {
        temperature: 0.4 + (i * 0.1)
      }
    });

    const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (imgPart?.inlineData?.data) {
      results.push({
        base64: `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`,
        model: 'gemini-2.5-flash-image'
      });
    }
    if (count > 1 && i < count - 1) await new Promise(r => setTimeout(r, 800));
  }
  return results;
};

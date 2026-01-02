
import { GoogleGenAI } from "@google/genai";
import { ProcessResult } from "../types";

const cleanBase64 = (base64Str: string) => {
  if (!base64Str) return "";
  if (base64Str.includes(',')) {
    return base64Str.split(',')[1];
  }
  return base64Str;
};

const getAI = () => {
  // Prioridade:
  // 1. Variável pública (Client-side Vercel)
  // 2. Variável de servidor (Server-side/Node)
  // 3. Chave Hardcoded (Fallback de segurança para garantir funcionamento imediato)
  const apiKey = process.env.NEXT_PUBLIC_API_KEY || process.env.API_KEY || "AIzaSyBzS3qGhMPqn0P7n-E6j8gjUeFvh_0m0aE";
  
  if (!apiKey || apiKey.trim() === '') {
    console.error("CRÍTICO: API Key não encontrada em nenhuma variável de ambiente.");
    // Retorna uma instância vazia para evitar crash imediato, mas vai falhar na chamada
    return new GoogleGenAI({ apiKey: 'chave_faltando' });
  }
  
  return new GoogleGenAI({ apiKey: apiKey });
};

export const chatWithAI = async (message: string, history: any[]): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: message }] }],
      config: {
        systemInstruction: "Você é o Concierge da RestaurAIlma, um app de restauração de fotos. Seja breve, gentil e útil.",
      }
    });
    return response.text || "Sem resposta.";
  } catch (error: any) {
    console.error("Chat Error:", error);
    return "O assistente está dormindo um pouco. Tente novamente.";
  }
};

export const processImage = async (
  base64Image: string,
  mimeType: string,
  promptInstruction: string,
  modelPreference: string = 'gemini-2.5-flash-image'
): Promise<ProcessResult> => {
  const ai = getAI();
  const safeMimeType = mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
  const data = cleanBase64(base64Image);

  if (!data) throw new Error("Imagem inválida.");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: safeMimeType, data: data } },
          { text: `Restaure esta imagem. ${promptInstruction}` }
        ]
      },
      config: {
        temperature: 0.3,
      }
    });

    const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);

    if (imgPart?.inlineData?.data) {
      return {
        base64: `data:${imgPart.inlineData.mimeType || 'image/jpeg'};base64,${imgPart.inlineData.data}`,
        model: 'gemini-2.5-flash-image',
        description: textPart?.text
      };
    }
    throw new Error("A IA processou mas não retornou a imagem.");
  } catch (err: any) {
    console.error("Erro detalhado do Gemini:", err);
    const msg = err.message || "Erro desconhecido";
    if (msg.includes("API_KEY")) throw new Error("Chave de API inválida. Verifique as configurações.");
    throw err;
  }
};

export const generateImageFromPrompt = async (
  prompt: string,
  count: number = 1,
  aspectRatio: string = "1:1",
  baseImage?: { data: string, mimeType: string }
): Promise<ProcessResult[]> => {
  const ai = getAI();
  const results: ProcessResult[] = [];
  
  for (let i = 0; i < count; i++) {
    const parts: any[] = [{ text: prompt }];
    if (baseImage) {
      parts.push({ 
        inlineData: { 
          mimeType: baseImage.mimeType, 
          data: cleanBase64(baseImage.data) 
        } 
      });
    }

    try {
        const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { 
            imageConfig: { aspectRatio: aspectRatio as any },
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
    } catch (e) {
        console.error("Erro na geração:", e);
    }
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
  const ai = getAI();
  const results: ProcessResult[] = [];

  for (let i = 0; i < count; i++) {
    try {
        const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
            { inlineData: { mimeType: mimeA, data: cleanBase64(imageA) } },
            { inlineData: { mimeType: mimeB, data: cleanBase64(imageB) } },
            { text: `FUSÃO: ${instruction}. Crie uma imagem composta.` }
            ]
        },
        config: { temperature: 0.4 }
        });

        const imgPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imgPart?.inlineData?.data) {
        results.push({
            base64: `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`,
            model: 'gemini-2.5-flash-image'
        });
        }
    } catch (e) {
        console.error("Erro no merge:", e);
    }
  }
  return results;
};

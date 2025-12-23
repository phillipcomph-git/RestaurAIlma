
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
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY não encontrada. Verifique se você configurou a chave no ambiente.");
  }
  return new GoogleGenAI({ apiKey });
};

export const chatWithAI = async (message: string, history: any[]): Promise<string> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: message }] }],
      config: {
        systemInstruction: "Você é o Concierge da RestaurAIlma, um app de restauração de fotos em homenagem à Ilma. Seja breve e gentil.",
      }
    });
    return response.text || "Sem resposta.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Erro ao conversar com o assistente.";
  }
};

export const processImage = async (
  base64Image: string,
  mimeType: string,
  promptInstruction: string,
  modelPreference: string = 'gemini-2.5-flash-image'
): Promise<ProcessResult> => {
  const ai = getAI();
  
  // Garantimos que o mimeType seja compatível
  const safeMimeType = mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
  const data = cleanBase64(base64Image);

  if (!data) throw new Error("Dados da imagem inválidos ou vazios.");

  const response = await ai.models.generateContent({
    model: modelPreference,
    contents: {
      parts: [
        { inlineData: { mimeType: safeMimeType, data: data } },
        { text: `TASK: ${promptInstruction}. OUTPUT: You MUST return the modified image as your primary response part. Focus on realistic photo restoration, preserving facial features and removing defects.` }
      ]
    },
    config: {
      systemInstruction: "You are an expert photo restoration AI. Your task is to process the provided image and return the restored version. If there are scratches, remove them. If it is black and white and requested to colorize, apply natural colors. If it is blurry, sharpen it. ALWAYS prioritize returning the image part.",
      temperature: 0.1, // Temperatura baixa para mais fidelidade
    }
  });

  if (!response.candidates || response.candidates.length === 0) {
    throw new Error("A IA não gerou candidatos. Verifique se a imagem viola alguma política de segurança.");
  }

  const parts = response.candidates[0].content.parts;
  const imgPart = parts.find(p => p.inlineData);
  const textPart = parts.find(p => p.text);

  if (imgPart?.inlineData?.data) {
    return {
      base64: `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${imgPart.inlineData.data}`,
      model: modelPreference,
      description: textPart?.text
    };
  } else if (textPart?.text) {
    // Se a IA respondeu apenas com texto, é provável que seja uma recusa ou explicação
    throw new Error(`A IA não editou a imagem. Resposta: "${textPart.text}"`);
  }

  throw new Error("Ocorreu um erro desconhecido: a IA não retornou imagem nem texto explicativo.");
};

export const generateImageFromPrompt = async (
  prompt: string,
  count: number = 1,
  aspectRatio: string = "1:1",
  baseImage?: { data: string, mimeType: string }
): Promise<ProcessResult[]> => {
  const ai = getAI();
  const results: ProcessResult[] = [];
  
  for (let i = 0; i < (count || 1); i++) {
    const parts: any[] = [{ text: prompt }];
    if (baseImage) {
      parts.push({ 
        inlineData: { 
          mimeType: baseImage.mimeType, 
          data: cleanBase64(baseImage.data) 
        } 
      });
    }

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

  for (let i = 0; i < (count || 1); i++) {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeA, data: cleanBase64(imageA) } },
          { inlineData: { mimeType: mimeB, data: cleanBase64(imageB) } },
          { text: `Fusion Instruction: ${instruction}. Create a single natural, high-quality composite image.` }
        ]
      },
      config: {
        temperature: 0.4,
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
};

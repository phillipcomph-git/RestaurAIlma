
import { GoogleGenAI } from "@google/genai";
import { ProcessResult } from "../types";

const cleanBase64 = (base64Str: string) => {
  if (!base64Str) return "";
  if (base64Str.includes(',')) {
    return base64Str.split(',')[1];
  }
  return base64Str;
};

// Função auxiliar para inicializar a IA com segurança
const getAIInstance = () => {
  const apiKey = process.env.API_KEY || "";
  // Se não houver chave, retornamos null ou lançamos um erro capturável pelo front
  if (!apiKey) {
    throw new Error("API Key");
  }
  return new GoogleGenAI({ apiKey });
};

export const getAvailableModels = async (): Promise<string[]> => {
  return ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'];
};

export const processImage = async (
  base64Image: string,
  mimeType: string,
  promptInstruction: string,
  modelPreference: string = 'gemini-2.5-flash-image'
): Promise<ProcessResult> => {
  const ai = getAIInstance();
  const modelId = modelPreference;
  
  const systemInstruction = `
    You are a world-class AI specialized in photographic restoration and enhancement.
    CRITICAL RULES:
    1. IDENTITY: Keep facial features and historical identity exactly as they are. No distortions.
    2. RESTORATION: Remove scratches, noise, cracks, and blur.
    3. COLOR: If the photo is old or B&W, provide realistic, natural colorization.
    4. OUTPUT FORMAT: Return the processed image.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType, data: cleanBase64(base64Image) } },
          { text: `Task: ${promptInstruction}. Perform high-quality restoration.` }
        ]
      },
      config: {
        systemInstruction,
        temperature: 0.1,
        imageConfig: { aspectRatio: "1:1" },
      }
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("A IA não retornou resultados devido a filtros de segurança.");
    }

    const parts = candidates[0].content?.parts;
    const imagePart = parts?.find(p => p.inlineData);
    const textPart = parts?.find(p => p.text);

    if (imagePart?.inlineData?.data) {
      return {
        base64: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
        model: modelId,
        description: textPart?.text?.trim() || "Restauração concluída."
      };
    }
    
    throw new Error("Falha ao gerar dados da imagem.");
  } catch (error: any) {
    if (error.message === "API Key") throw error;
    throw new Error(error.message || "Erro na comunicação com a API Gemini.");
  }
};

export const generateImageFromPrompt = async (
  prompt: string,
  count: number = 1,
  aspectRatio: string = "1:1",
  baseImage?: { data: string, mimeType: string }
): Promise<ProcessResult[]> => {
  const ai = getAIInstance();
  const modelId = 'gemini-2.5-flash-image';

  try {
    const requests = Array.from({ length: count }).map((_, i) => {
      const parts: any[] = [{ text: `Prompt: ${prompt}` }];
      if (baseImage) parts.push({ inlineData: { mimeType: baseImage.mimeType, data: cleanBase64(baseImage.data) } });

      return ai.models.generateContent({
        model: modelId,
        contents: { parts },
        config: {
          systemInstruction: "Generate a photorealistic high-detail image based on the prompt.",
          temperature: 0.7 + (i * 0.1),
          imageConfig: { aspectRatio: aspectRatio as any }
        }
      });
    });

    const responses = await Promise.all(requests);
    return responses.map(response => {
      const parts = response.candidates?.[0]?.content?.parts;
      const imagePart = parts?.find(p => p.inlineData);
      if (imagePart?.inlineData?.data) {
        return {
          base64: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
          model: modelId,
          description: "Arte gerada com sucesso."
        };
      }
      throw new Error("Falha na geração.");
    });
  } catch (error: any) {
    if (error.message === "API Key") throw error;
    throw error;
  }
};

export const mergeImages = async (
  imageA: string,
  mimeA: string,
  imageB: string,
  mimeB: string,
  instruction: string,
  count: number = 1
): Promise<ProcessResult[]> => {
  const ai = getAIInstance();
  const modelId = 'gemini-2.5-flash-image';

  try {
    const requests = Array.from({ length: count }).map((_, i) => {
      return ai.models.generateContent({
        model: modelId,
        contents: {
          parts: [
            { inlineData: { mimeType: mimeA, data: cleanBase64(imageA) } },
            { inlineData: { mimeType: mimeB, data: cleanBase64(imageB) } },
            { text: `Instruction: ${instruction}` }
          ]
        },
        config: {
          systemInstruction: "Merge subjects from both photos into a single realistic scene.",
          temperature: 0.5, 
          imageConfig: { aspectRatio: "1:1" }
        }
      });
    });

    const responses = await Promise.all(requests);
    return responses.map(response => {
      const parts = response.candidates?.[0]?.content?.parts;
      const imagePart = parts?.find(p => p.inlineData);
      if (imagePart?.inlineData?.data) {
        return {
          base64: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
          model: modelId,
          description: "Mesclagem concluída."
        };
      }
      throw new Error("Falha na mesclagem.");
    });
  } catch (error: any) {
    if (error.message === "API Key") throw error;
    throw error;
  }
};

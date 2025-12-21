
import { GoogleGenAI } from "@google/genai";
import { ProcessResult } from "../types";

const cleanBase64 = (base64Str: string) => {
  if (!base64Str) return "";
  if (base64Str.includes(',')) {
    return base64Str.split(',')[1];
  }
  return base64Str;
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
  // Criar nova instância para garantir o uso da chave mais recente do diálogo aistudio
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
      throw new Error("A IA não retornou resultados. Isso pode ocorrer devido a filtros de segurança ou falha no servidor.");
    }

    const parts = candidates[0].content?.parts;
    const imagePart = parts?.find(p => p.inlineData);
    const textPart = parts?.find(p => p.text);

    if (imagePart?.inlineData?.data) {
      return {
        base64: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
        model: modelId,
        description: textPart?.text?.trim() || "Restauração concluída com sucesso."
      };
    }
    
    // Fallback caso a IA responda apenas com texto (ex: recusando a tarefa por política)
    if (textPart?.text) {
      throw new Error(`A IA não pôde processar a imagem: ${textPart.text}`);
    }

    throw new Error("A IA falhou em gerar os dados da imagem final.");
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("Chave de API inválida ou projeto não encontrado. Por favor, re-selecione sua chave paga.");
    }
    throw error;
  }
};

export const generateImageFromPrompt = async (
  prompt: string,
  count: number = 1,
  aspectRatio: string = "1:1",
  baseImage?: { data: string, mimeType: string }
): Promise<ProcessResult[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = 'gemini-2.5-flash-image';

  const systemInstruction = `
    You are a world-class artist and digital creator.
    ${baseImage ? 'Modify the provided image based on the user prompt while preserving overall structure.' : 'Generate a high-quality, photorealistic image.'}
    Style: cinematic, high detail.
  `;

  const requests = Array.from({ length: count }).map((_, i) => {
    const parts: any[] = [{ text: `Prompt: ${prompt}` }];
    
    if (baseImage) {
      parts.push({
        inlineData: {
          mimeType: baseImage.mimeType,
          data: cleanBase64(baseImage.data)
        }
      });
    }

    return ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        systemInstruction,
        temperature: 0.7 + (i * 0.1),
        imageConfig: { aspectRatio: aspectRatio as any }
      }
    });
  });

  const responses = await Promise.all(requests);
  
  return responses.map(response => {
    const parts = response.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find(p => p.inlineData);
    const textPart = parts?.find(p => p.text);

    if (imagePart?.inlineData?.data) {
      return {
        base64: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
        model: modelId,
        description: textPart?.text?.trim() || "Imagem gerada com sucesso."
      };
    }
    throw new Error("Falha ao gerar uma das variantes de imagem.");
  });
};

export const mergeImages = async (
  imageA: string,
  mimeA: string,
  imageB: string,
  mimeB: string,
  instruction: string,
  count: number = 1
): Promise<ProcessResult[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = 'gemini-2.5-flash-image';

  const systemInstruction = `
    Merge subjects from Photo A and Photo B into a single, highly realistic and photorealistic scene.
    Keep facial identities identical. Ensure natural lighting and blending.
  `;

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
        systemInstruction,
        temperature: 0.5 + (i * 0.1), 
        imageConfig: { aspectRatio: "1:1" }
      }
    });
  });

  const responses = await Promise.all(requests);
  
  return responses.map(response => {
    const parts = response.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find(p => p.inlineData);
    const textPart = parts?.find(p => p.text);

    if (imagePart?.inlineData?.data) {
      return {
        base64: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
        model: modelId,
        description: textPart?.text?.trim() || "Mesclagem concluída."
      };
    }
    throw new Error("Falha ao mesclar as imagens.");
  });
};

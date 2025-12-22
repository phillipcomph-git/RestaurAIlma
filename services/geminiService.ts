
import { GoogleGenAI } from "@google/genai";
import { ProcessResult } from "../types";

const cleanBase64 = (base64Str: string) => {
  if (!base64Str) return "";
  if (base64Str.includes(',')) {
    return base64Str.split(',')[1];
  }
  return base64Str;
};

/**
 * Helper para realizar retentativas em caso de erro 429 (Rate Limit).
 * Aumentamos o delay para dar tempo da cota resetar.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 3000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = error.status === 429 || 
                         error.message?.includes("429") || 
                         error.message?.includes("quota") ||
                         error.message?.includes("limit");

    if (retries > 0 && isQuotaError) {
      console.warn(`Limite de cota atingido. Tentando novamente em ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Sempre cria uma nova instância para garantir que use a chave mais atual do ambiente/localStorage
const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

export const processImage = async (
  base64Image: string,
  mimeType: string,
  promptInstruction: string,
  modelPreference: string = 'gemini-2.5-flash-image'
): Promise<ProcessResult> => {
  return withRetry(async () => {
    const ai = getAIInstance();
    const modelId = modelPreference;
    
    const systemInstruction = `
      Você é uma IA de elite especializada em restauração fotográfica.
      REGRAS CRÍTICAS:
      1. IDENTIDADE: Mantenha as feições faciais e identidade histórica intactas. Sem distorções.
      2. RESTAURAÇÃO: Remova riscos, ruídos, rachaduras e borrões.
      3. COR: Se a foto for P&B, aplique colorização natural e realista.
      4. SAÍDA: Retorne a imagem processada com a maior fidelidade possível.
    `;

    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: {
          parts: [
            { inlineData: { mimeType, data: cleanBase64(base64Image) } },
            { text: `Tarefa: ${promptInstruction}. Realize restauração de alta qualidade.` }
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
        throw new Error("A IA não pôde gerar um resultado para esta imagem por motivos de segurança.");
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
      
      throw new Error("Falha ao extrair imagem da resposta da API.");
    } catch (error: any) {
      if (error.message?.includes("Requested entity was not found")) {
        throw new Error("API_KEY_INVALID");
      }
      throw error;
    }
  });
};

export const generateImageFromPrompt = async (
  prompt: string,
  count: number = 1,
  aspectRatio: string = "1:1",
  baseImage?: { data: string, mimeType: string }
): Promise<ProcessResult[]> => {
  const results: ProcessResult[] = [];
  
  for (let i = 0; i < count; i++) {
    const result = await withRetry(async () => {
      const ai = getAIInstance();
      const modelId = 'gemini-2.5-flash-image';

      const parts: any[] = [{ text: `Prompt: ${prompt}` }];
      if (baseImage) parts.push({ inlineData: { mimeType: baseImage.mimeType, data: cleanBase64(baseImage.data) } });

      const response = await ai.models.generateContent({
        model: modelId,
        contents: { parts },
        config: {
          systemInstruction: "Gere uma imagem fotorrealista com alto nível de detalhe baseada no prompt.",
          temperature: 0.7 + (i * 0.1),
          imageConfig: { aspectRatio: aspectRatio as any }
        }
      });

      const candidateParts = response.candidates?.[0]?.content?.parts;
      const imagePart = candidateParts?.find(p => p.inlineData);
      
      if (imagePart?.inlineData?.data) {
        return {
          base64: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
          model: modelId,
          description: "Arte gerada com sucesso."
        };
      }
      throw new Error("Falha na geração.");
    });
    
    results.push(result);
    // Intervalo maior entre imagens para evitar 429 em planos gratuitos se o usuário ainda estiver usando um
    if (count > 1 && i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
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
  const results: ProcessResult[] = [];

  for (let i = 0; i < count; i++) {
    const result = await withRetry(async () => {
      const ai = getAIInstance();
      const modelId = 'gemini-2.5-flash-image';

      const response = await ai.models.generateContent({
        model: modelId,
        contents: {
          parts: [
            { inlineData: { mimeType: mimeA, data: cleanBase64(imageA) } },
            { inlineData: { mimeType: mimeB, data: cleanBase64(imageB) } },
            { text: `Instrução: ${instruction}` }
          ]
        },
        config: {
          systemInstruction: "Mescle os sujeitos de ambas as fotos em uma única cena realista.",
          temperature: 0.5, 
          imageConfig: { aspectRatio: "1:1" }
        }
      });

      const candidateParts = response.candidates?.[0]?.content?.parts;
      const imagePart = candidateParts?.find(p => p.inlineData);
      
      if (imagePart?.inlineData?.data) {
        return {
          base64: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
          model: modelId,
          description: "Mesclagem concluída."
        };
      }
      throw new Error("Falha na mesclagem.");
    });

    results.push(result);
    if (count > 1 && i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
};

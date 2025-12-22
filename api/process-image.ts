import { GoogleGenAI } from "@google/genai";
import { VercelRequest, VercelResponse } from "@vercel/node";

interface ProcessImageRequest {
  base64Image: string;
  mimeType: string;
  promptInstruction: string;
  modelPreference?: string;
}

interface ProcessImageResponse {
  base64: string;
  description: string;
  status: "success" | "error";
}

const cleanBase64 = (base64Str: string): string => {
  if (!base64Str) return "";
  if (base64Str.includes(",")) {
    return base64Str.split(",")[1];
  }
  return base64Str;
};

const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 3000
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError =
      error.status === 429 ||
      error.message?.includes("429") ||
      error.message?.includes("quota");

    if (retries > 0 && isQuotaError) {
      console.warn(`RestaurAIlma: Erro de cota (429). Tentando novamente em ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

const getAIClient = () => {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    const errorMsg =
      "GOOGLE_GENAI_API_KEY não encontrada no ambiente. Configure a variável de ambiente no Vercel.";
    console.error("RestaurAIlma: " + errorMsg);
    throw new Error(errorMsg);
  }
  return new GoogleGenAI({ apiKey });
};

export const processImage = async (
  base64Image: string,
  mimeType: string,
  promptInstruction: string,
  modelPreference: string = "gemini-2.5-flash-image"
): Promise<ProcessImageResponse> => {
  return withRetry(async () => {
    const ai = getAIClient();
    const cleanedBase64 = cleanBase64(base64Image);

    const response = await ai.models.generateContent({
      model: modelPreference,
      contents: {
        parts: [
          { inlineData: { mimeType, data: cleanedBase64 } },
          { text: promptInstruction },
        ],
      },
      config: {
        systemInstruction:
          "Você é um especialista em restauração fotográfica. Sua missão é recuperar fotos antigas.",
        temperature: 0.2,
        imageConfig: { aspectRatio: "1:1" },
      },
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("A IA não retornou resultados válidos.");
    }

    const content = candidates[0].content;
    const parts = content?.parts;

    if (!parts || parts.length === 0) {
      throw new Error("Nenhuma parte de conteúdo foi retornada.");
    }

    const imagePart = parts.find((part: any) => part.inlineData);
    const textPart = parts.find((part: any) => part.text);

    if (!imagePart || !imagePart.inlineData) {
      throw new Error("A IA não gerou uma imagem válida.");
    }

    return {
      base64: imagePart.inlineData.data,
      description: textPart?.text || "Imagem processada com sucesso.",
      status: "success",
    };
  });
};

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { base64Image, mimeType, promptInstruction, modelPreference } =
      req.body as ProcessImageRequest;

    if (!base64Image) {
      return res.status(400).json({ error: "base64Image é obrigatório" });
    }
    if (!mimeType) {
      return res.status(400).json({ error: "mimeType é obrigatório" });
    }
    if (!promptInstruction) {
      return res.status(400).json({ error: "promptInstruction é obrigatório" });
    }

    const result = await processImage(
      base64Image,
      mimeType,
      promptInstruction,
      modelPreference
    );

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Erro ao processar imagem:", error);

    if (error.message?.includes("API_KEY")) {
      return res.status(500).json({
        error: "Configuração de API inválida. Verifique as variáveis de ambiente.",
        status: "error",
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        error: "Limite de requisições atingido. Tente novamente em alguns segundos.",
        status: "error",
      });
    }

    return res.status(500).json({
      error: error.message || "Erro ao processar imagem",
      status: "error",
    });
  }
};

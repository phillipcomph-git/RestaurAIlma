
import { GoogleGenAI } from "@google/genai";
import { ProcessResult } from "../types";

const cleanBase64 = (base64Str: string) => {
  return base64Str.split(',')[1] || base64Str;
};

// Removed getAvailableModels as it used undocumented models.list() method.
// Hardcoding recommended models instead to follow Gemini API SDK best practices.
export const getAvailableModels = async (): Promise<string[]> => {
  return ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview', 'gemini-3-flash-preview', 'gemini-3-pro-preview'];
};

export const processImage = async (
  base64Image: string,
  mimeType: string,
  promptInstruction: string,
  modelPreference: string = 'gemini-2.5-flash-image'
): Promise<ProcessResult> => {
  // Always use { apiKey: process.env.API_KEY } directly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = modelPreference === 'auto' ? 'gemini-2.5-flash-image' : modelPreference;
  
  // Define system instruction separately as per best practices
  const systemInstruction = `
    You are a world-class AI specialized in photographic restoration and enhancement.
    CRITICAL RULES:
    1. IDENTITY: Keep facial features and historical identity exactly as they are. No distortions.
    2. RESTORATION: Remove scratches, noise, cracks, and blur.
    3. COLOR: If the photo is old or B&W, provide realistic, natural colorization.
    4. OUTPUT FORMAT: You MUST return exactly TWO parts: 
       - An IMAGE part with the final processed result.
       - A TEXT part with a very brief (1 sentence) description in Portuguese ONLY.
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: {
      parts: [
        { inlineData: { mimeType, data: cleanBase64(base64Image) } },
        { text: `Task: ${promptInstruction}` }
      ]
    },
    config: {
      systemInstruction,
      temperature: 0.2,
      imageConfig: { aspectRatio: "1:1" },
    }
  });

  const parts = response.candidates?.[0]?.content?.parts;
  const imagePart = parts?.find(p => p.inlineData);
  const textPart = parts?.find(p => p.text);

  if (imagePart?.inlineData?.data) {
    return {
      base64: `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`,
      model: modelId,
      description: textPart?.text?.trim() || undefined
    };
  }
  throw new Error("Falha ao gerar imagem.");
};

export const generateImageFromPrompt = async (
  prompt: string,
  count: number = 1,
  aspectRatio: string = "1:1",
  baseImage?: { data: string, mimeType: string }
): Promise<ProcessResult[]> => {
  // Always use { apiKey: process.env.API_KEY } directly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = 'gemini-2.5-flash-image';

  const systemInstruction = `
    You are a world-class artist and digital creator.
    ${baseImage ? 'Modify the provided image based on the user prompt while preserving overall structure and identity.' : 'Generate a high-quality, photorealistic image based on the user\'s prompt.'}
    Style: cinematic, high detail, balanced colors.
    Output format: return an IMAGE part with the generated result and a TEXT part with a short description in Portuguese.
  `;

  const requests = Array.from({ length: count }).map((_, i) => {
    const parts: any[] = [{ text: `Prompt: ${prompt}\nVariation: ${i + 1}` }];
    
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
        temperature: 0.7 + (i * 0.05),
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
        description: textPart?.text?.trim() || undefined
      };
    }
    throw new Error("Falha ao gerar uma das imagens.");
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
  // Always use { apiKey: process.env.API_KEY } directly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = 'gemini-2.5-flash-image';

  const systemInstruction = `
    You are a master of photorealistic image synthesis and seamless composition.
    Your goal is to CREATE A UNIFIED MASTERPIECE that blends subjects from Photo A and Photo B realistically.
    
    CRITICAL REALISM GUIDELINES:
    1. NO COLLAGE: Do not simply overlay images. Synthesize a brand new scene where both subjects coexist naturally.
    2. COHERENT LIGHTING: Analyze the light sources in both photos. Adjust shadows, highlights, and skin tones so they match the synthesized environment perfectly.
    3. INTERACTION & DEPTH: Place subjects in a shared 3D space. Add realistic contact shadows and depth-of-field effects where appropriate.
    4. ANATOMICAL INTEGRITY: Ensure the perspective and scale are correct for all subjects.
    5. IDENTITY PRESERVATION: Facial features must remain 100% faithful to the originals.
    
    Output format: return an IMAGE part with the merged result and a TEXT part describing the scene in Portuguese.
  `;

  const requests = Array.from({ length: count }).map((_, i) => {
    return ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeA, data: cleanBase64(imageA) } },
          { inlineData: { mimeType: mimeB, data: cleanBase64(imageB) } },
          { text: `Instrução do usuário: ${instruction}\nVariation hint: ${i + 1}` }
        ]
      },
      config: {
        systemInstruction,
        temperature: 0.4 + (i * 0.1), 
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
        description: textPart?.text?.trim() || undefined
      };
    }
    throw new Error("Falha ao mesclar uma das variantes.");
  });
};

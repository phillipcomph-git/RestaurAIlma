import { useState, useCallback } from "react";

interface UseImageProcessingOptions {
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
}

export const useImageProcessing = (options?: UseImageProcessingOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const processImage = useCallback(
    async (
      base64Image: string,
      mimeType: string,
      promptInstruction: string,
      modelPreference?: string
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/process-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            base64Image,
            mimeType,
            promptInstruction,
            modelPreference,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `Erro HTTP: ${response.status}`
          );
        }

        const result = await response.json();

        if (result.status === "error") {
          throw new Error(result.error || "Erro ao processar imagem");
        }

        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options?.onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  return {
    processImage,
    isLoading,
    error,
  };
};

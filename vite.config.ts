
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Configuração exclusiva para o Preview (Vite).
// O Next.js ignorará este arquivo na produção.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  define: {
    // Removemos a definição forçada de 'process.env.API_KEY' para permitir que
    // o ambiente (como IDX ou AI Studio) injete a variável globalmente se necessário.
    // Apenas definimos se ela realmente existir no processo de build.
    ...(process.env.API_KEY ? { 'process.env.API_KEY': JSON.stringify(process.env.API_KEY) } : {}),
    'process.env.NEXT_PUBLIC_API_KEY': JSON.stringify(process.env.NEXT_PUBLIC_API_KEY || ''),
  }
});

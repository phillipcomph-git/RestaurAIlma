
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
    // Injeta as variáveis de ambiente de forma segura no navegador do Preview
    // Tenta pegar API_KEY, se não, tenta NEXT_PUBLIC_API_KEY, se não, string vazia.
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || ''),
    'process.env.NEXT_PUBLIC_API_KEY': JSON.stringify(process.env.NEXT_PUBLIC_API_KEY || ''),
  }
});

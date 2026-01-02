import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Esta configuração é usada APENAS pelo preview do AI Studio.
// O Next.js (Vercel) ignora este arquivo graças ao tsconfig.json.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  define: {
    // Evita crash ao acessar process.env no navegador durante o preview
    'process.env': {} 
  }
});

import React from 'react';
import { createRoot } from 'react-dom/client';
import Home from './app/page';

// Polyfill para API Key no ambiente de Preview (Client-side puro)
if (typeof window !== 'undefined' && !(window as any).process) {
  (window as any).process = {
    env: {
      NEXT_PUBLIC_API_KEY: '',
      API_KEY: ''
    }
  };
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <div className="font-sans antialiased bg-slate-950 text-slate-100 min-h-screen">
        <Home />
      </div>
    </React.StrictMode>
  );
}
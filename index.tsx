
import React from 'react';
import { createRoot } from 'react-dom/client';
import Home from './app/page';

// Polyfill seguro para process.env no navegador
if (typeof window !== 'undefined') {
  if (!(window as any).process) {
    (window as any).process = { env: {} };
  }
  // Não sobrescrevemos se o Vite já tiver definido via 'define'
  if (!(window as any).process.env) {
    (window as any).process.env = {};
  }
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

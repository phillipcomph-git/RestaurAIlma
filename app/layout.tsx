
import React from "react";
import type { Metadata } from "next";
import { Jost } from "next/font/google";
import "./globals.css";

const jost = Jost({ 
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RestaurAIlma",
  description: "Restauração inteligente de memórias",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={jost.variable}>
      <head>
        {/* Fallback de segurança para garantir que o Tailwind carregue em alguns ambientes edge */}
      </head>
      <body className="antialiased font-sans bg-slate-950 text-slate-100 font-extralight tracking-tight selection:bg-yellow-400/20 selection:text-white">
        {children}
      </body>
    </html>
  );
}

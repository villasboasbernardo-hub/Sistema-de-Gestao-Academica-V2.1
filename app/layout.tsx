import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { FaixaDeAmbiente } from "@/components/faixa-de-ambiente";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CIAARA-11 — Gestão Acadêmica",
  description:
    "Sistema de gestão acadêmica da Divisão de Administração Acadêmica do CIAARA. Versão 2.1.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <FaixaDeAmbiente />
        {children}
      </body>
    </html>
  );
}

/**
 * Casca raiz da aplicação.
 *
 * ⚠️ ESTE ARQUIVO NÃO TEM `"use client"`, E NÃO PODE TER. O marcador contamina toda a subárvore de
 * importação: um deles aqui mandaria o catálogo inteiro de telas para o pacote do navegador. O
 * `tsc` NÃO acusa isso; só o `next build`. É o achado nº 1 do Épico 0, e é por isso que o provedor
 * de tema vive num componente próprio, em `components/ciaara/provedor-de-tema.tsx`.
 *
 * ⚠️ `suppressHydrationWarning` É OBRIGATÓRIO, e não é gambiarra: o provedor escreve a classe do
 * tema no elemento raiz **antes da hidratação**, para que não haja um quadro sequer com o tema
 * errado (`FR-009`). Sem esta propriedade, o React acusa divergência entre servidor e cliente —
 * e a divergência é intencional.
 */
import type { Metadata } from "next";
import localFont from "next/font/local";

import { FaixaDeAmbiente } from "@/components/faixa-de-ambiente";
import { ProvedorDeTema } from "@/components/ciaara/provedor-de-tema";

import "./globals.css";

/**
 * Tipografia institucional Rawline, **auto-hospedada** (`FR-015`, `RF-INI-05`).
 *
 * ⚠️ AUTO-HOSPEDADA NÃO É PREFERÊNCIA: é o requisito. Na v2.0 a fonte vinha por CDN, e dependência
 * externa quebraria a impressão, que não pode depender de rede no momento em que alguém manda
 * imprimir. Os quatro arquivos estão versionados em `public/fontes/`, com a licença OFL-1.1 ao
 * lado — ver a procedência na spec, porque licença de fonte não se presume.
 *
 * A variável é consumida por `--font-sans` em `globals.css`.
 */
const rawline = localFont({
  src: [
    { path: "../public/fontes/rawline-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fontes/rawline-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fontes/rawline-600.woff2", weight: "600", style: "normal" },
    { path: "../public/fontes/rawline-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--fonte-rawline",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
});

export const metadata: Metadata = {
  title: "CIAARA-11 — Gestão Acadêmica",
  description:
    "Sistema de gestão acadêmica da Divisão de Administração Acadêmica do CIAARA. Versão 2.1.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${rawline.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ProvedorDeTema>
          <FaixaDeAmbiente />
          {children}
        </ProvedorDeTema>
      </body>
    </html>
  );
}

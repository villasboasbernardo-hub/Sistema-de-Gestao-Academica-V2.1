/**
 * Casca das rotas autenticadas.
 *
 * ⚠️ SEM `"use client"`. O marcador contamina toda a subárvore de importação, e um deles aqui
 * mandaria o catálogo inteiro de telas para o bundle. Ele só entra em folha.
 *
 * Carrega usuário e matriz **uma vez por requisição** e os repassa. Não guarda nada entre
 * requisições — é o que faz a desativação valer na seguinte (FR-015, contrato sessao-e-rotas C-4).
 */
import { redirect } from "next/navigation";

import { permissoesDoPerfil } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";

export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioDaSessao();

  // O middleware já barrou quem não tem sessão. Isto cobre o outro caso: sessão válida SEM linha
  // ativa em `usuarios` — credencial órfã, ou conta desativada com o token ainda no navegador.
  // Ele não alcança dado nenhum pela RLS; aqui ele também não vê a casca.
  if (!usuario) redirect("/login");

  const permissoes = await permissoesDoPerfil(usuario.perfil);

  return (
    <div>
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold">CIAARA-11</span>
        <span className="text-sm opacity-80">
          {usuario.nomeExibicao ?? usuario.nome} · {usuario.perfil}
        </span>
      </header>
      <main className="p-4" data-permissoes={permissoes.size}>
        {children}
      </main>
    </div>
  );
}

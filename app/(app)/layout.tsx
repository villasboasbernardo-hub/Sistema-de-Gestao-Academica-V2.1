/**
 * Casca das rotas autenticadas.
 *
 * ⚠️ SEM `"use client"`. O marcador contamina toda a subárvore de importação, e um deles aqui
 * mandaria o catálogo inteiro de telas para o bundle. Ele só entra em folha.
 *
 * Carrega usuário e matriz **uma vez por requisição** e os repassa. Não guarda nada entre
 * requisições — é o que faz a desativação valer na seguinte (FR-015, contrato sessao-e-rotas C-4).
 *
 * ⚠️ O CABEÇALHO PROVISÓRIO DO ÉPICO 3 SAIU DAQUI EM 11/09/2026 (`FR-016`, `FR-018`). Ele mostrava
 * nome do sistema, nome do usuário e perfil — **e nenhum link**: quem entrava caía numa página sem
 * um único lugar para ir, e a única forma de alcançar outra tela era digitar a URL. É o que a
 * História 3 da fatia (c) corrige, e é substituição, não acréscimo.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { CascaDoApp } from "@/components/casca/casca-do-app";
import { permissoesDoPerfil } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { CABECALHO_DO_CAMINHO, caminhoOuRaiz } from "@/lib/navegacao/caminho";

export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioDaSessao();

  // O middleware já barrou quem não tem sessão. Isto cobre o outro caso: sessão válida SEM linha
  // ativa em `usuarios` — credencial órfã, ou conta desativada com o token ainda no navegador.
  // Ele não alcança dado nenhum pela RLS; aqui ele também não vê a casca.
  if (!usuario) redirect("/login");

  const permissoes = await permissoesDoPerfil(usuario.perfil);
  const caminho = caminhoOuRaiz((await headers()).get(CABECALHO_DO_CAMINHO));

  return (
    <div data-permissoes={permissoes.size}>
      <CascaDoApp
        nome={usuario.nomeExibicao ?? usuario.nome}
        perfil={usuario.perfil}
        caminho={caminho}
      >
        {children}
      </CascaDoApp>
    </div>
  );
}

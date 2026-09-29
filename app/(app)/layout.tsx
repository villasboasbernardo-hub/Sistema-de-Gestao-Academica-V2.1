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
import { encerrarSessao } from "@/lib/acoes/sessao";
import { permissoesDoPerfil } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { CABECALHO_DO_CAMINHO, caminhoOuRaiz } from "@/lib/navegacao/caminho";
import { enderecoDaFoto } from "@/lib/supabase/avatar";

export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioDaSessao();

  // O middleware já barrou quem não tem sessão. Isto cobre o outro caso: sessão válida SEM linha
  // ativa em `usuarios` — credencial órfã, ou conta desativada com o token ainda no navegador.
  // Ele não alcança dado nenhum pela RLS; aqui ele também não vê a casca.
  if (!usuario) redirect("/login");

  // ⚠️ Três consultas INDEPENDENTES, em paralelo. Encadeá-las somaria as três esperas em toda
  //    tela do sistema, e a convenção de código proíbe `await` em laço justamente por isso.
  //    ⚠️ E a foto é a única que pode falhar sem consequência: `enderecoDaFoto` devolve `null`
  //       em qualquer erro, e a tela cai nas iniciais (`RN-DEG-01`).
  const [permissoes, cabecalhos, fotoUrl] = await Promise.all([
    permissoesDoPerfil(usuario.perfil),
    headers(),
    enderecoDaFoto(usuario.avatarCaminho),
  ]);
  const caminho = caminhoOuRaiz(cabecalhos.get(CABECALHO_DO_CAMINHO));

  return (
    // ⚠️ `aoSair` DESCE DAQUI porque componente não importa `@/lib/acoes/` (Princípio XI,
    //    guardado por `fronteira-casca` e `fronteira-componentes`). O layout é servidor e
    //    conhece a origem da ação; a casca só dispara o que recebeu.
    <div data-permissoes={permissoes.size}>
      <CascaDoApp
        nome={usuario.nomeExibicao ?? usuario.nome}
        email={usuario.email}
        perfil={usuario.perfil}
        caminho={caminho}
        fotoUrl={fotoUrl}
        aoSair={encerrarSessao}
      >
        {children}
      </CascaDoApp>
    </div>
  );
}

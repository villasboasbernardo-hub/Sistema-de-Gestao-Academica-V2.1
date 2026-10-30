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
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CascaDoApp } from "@/components/casca/casca-do-app";
import { encerrarSessao } from "@/lib/acoes/sessao";
import { permissoesDoPerfil } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { COOKIE_DA_LATERAL, lateralFixadaNoCookie } from "@/lib/navegacao/lateral";
import { enderecoDaFoto } from "@/lib/supabase/avatar";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { idsArquivados } from "@/lib/dominio/arquivamento-da-turma";
import { anoEscolhido } from "@/lib/navegacao/ano-da-tela";
import { arvoreDeCursos, arvoreDeTurmas } from "@/lib/dominio/submenu-da-lateral";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { enderecoDaTurma, enderecoDoCurso } from "@/lib/navegacao/endereco-de-turma";

/**
 * As duas árvores do submenu (spec 019, C-14): os cursos EM OFERTA na de *Cursos*; na de *Turmas*, as turmas não
 * arquivadas de qualquer curso que a pessoa vê — inclusive o fora de oferta, para a turma dele não sumir da lateral.
 */
function arvoresDoSubmenu(
  cursos: readonly {
    id: string;
    codigo: string;
    nome_curso: string;
    classificacao: string;
    status: string;
  }[],
  turmas: readonly {
    codigo: string;
    ano_letivo: number;
    id: string;
    curso_id: string;
  }[],
  arquivadas: readonly { turma_id: string | null }[],
  ano: number,
) {
  const arquivada = idsArquivados(arquivadas);
  const doSubmenu = cursos.map((c) => ({
    id: c.id,
    codigo: c.codigo,
    nome: c.nome_curso,
    classificacao: c.classificacao,
  }));
  const cursoPorId = new Map(cursos.map((c) => [c.id, c] as const));
  return {
    cursos: arvoreDeCursos(
      doSubmenu.filter((_, i) => cursos[i]?.status === "ativo"),
      enderecoDoCurso,
    ),
    turmas: arvoreDeTurmas(
      turmas.map((t) => ({
        codigo: t.codigo,
        ano: Number(t.ano_letivo),
        arquivada: arquivada.has(t.id),
        /* Spec 022 (FR-003): a ordem das turmas é a do curso — a classificação, depois a sigla. */
        cursoCodigo: cursoPorId.get(t.curso_id)?.codigo ?? t.codigo,
        cursoClassificacao: cursoPorId.get(t.curso_id)?.classificacao ?? null,
      })),
      ano,
      enderecoDaTurma,
    ),
  };
}

export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioDaSessao();

  // O middleware já barrou quem não tem sessão. Isto cobre o outro caso: sessão válida SEM linha
  // ativa em `usuarios` — credencial órfã, ou conta desativada com o token ainda no navegador.
  // Ele não alcança dado nenhum pela RLS; aqui ele também não vê a casca.
  if (!usuario) redirect("/login");

  // ⚠️ Três leituras INDEPENDENTES, em paralelo. Encadeá-las somaria as esperas em toda
  //    tela do sistema, e a convenção de código proíbe `await` em laço justamente por isso.
  //    ⚠️ O CAMINHO SAIU DAQUI EM 17/10/2026 (conferência do PR #67): o layout não é redesenhado na
  //       navegação por clique, e o caminho que ele lia da requisição deixava o ativo do menu preso
  //       à primeira página. Quem lê o caminho agora é `components/casca/entrada-do-menu.tsx`.
  //    ⚠️ E a foto é a única que pode falhar sem consequência: `enderecoDaFoto` devolve `null`
  //       em qualquer erro, e a tela cai nas iniciais (`RN-DEG-01`).
  const supabase = await criarClienteDeServidor();
  /*
   * ⚠️ **AS TURMAS DO SUBMENU SÃO AS DO ANO ESCOLHIDO** (RT-6 do Bloco 10, spec 025, D-24 e D-26; era o ano vigente, do
   *    ajuste A-5 de 20/10/2026): o guardado no navegador pelo seletor, senão o de hoje em São Paulo — em 01/01 a escolha
   *    expira e a lista troca sozinha. O layout não lê a URL: um link com `?ano=` mostra a página no ano do link e a
   *    lateral no da escolha de quem abre, até ele escolher de novo.
   */
  const escolhaDoAno = await anoEscolhido("", hojeNaCiaara());
  const anoVigente = escolhaDoAno.ano;
  const [permissoes, armazemDeCookies, fotoUrl, cursosRes, turmasRes, arquivadasRes] =
    await Promise.all([
      permissoesDoPerfil(usuario.perfil),
      cookies(),
      enderecoDaFoto(usuario.avatarCaminho),
      /*
       * ⚠️ **O SUBMENU DA LATERAL** (spec 019, C-14): cursos e turmas pela RLS — cada perfil vê o que alcança. Falha de
       *    leitura não derruba a casca: o submenu some, e *Cursos* e *Turmas* continuam links para as listas
       *    (`RN-DEG-01`).
       */
      supabase.from("cursos").select("id, codigo, nome_curso, classificacao, status"),
      supabase
        .from("turmas")
        .select("codigo, ano_letivo, id, curso_id")
        .eq("ano_letivo", anoVigente),
      supabase.from("vw_turmas_arquivadas").select("turma_id"),
    ]);
  const submenu = arvoresDoSubmenu(
    cursosRes.data ?? [],
    turmasRes.data ?? [],
    arquivadasRes.data ?? [],
    anoVigente,
  );

  /*
   * ⚠️ **O ESTADO DA LATERAL É DECIDIDO AQUI, NO SERVIDOR, E ISSO É O QUE ELIMINA O FLASH**
   *    (`FR-005` da spec 012). A largura da lateral muda o layout do conteúdo inteiro: lido só no
   *    navegador, a tela abriria recolhida e **saltaria** para expandida depois da hidratação.
   *    ⚠️ **Não é o padrão do tema**, e a diferença é deliberada: o tema vive em `localStorage` e se
   *       corrige com um script antes da pintura — o servidor não sabe qual é. Aqui ele sabe, porque
   *       cookie viaja na requisição — e o estado é só o INICIAL: depois do primeiro desenho quem
   *       manda é a folha, então o layout não redesenhar na navegação não o deixa preso.
   */
  const lateralFixada = lateralFixadaNoCookie(armazemDeCookies.get(COOKIE_DA_LATERAL)?.value);

  return (
    // ⚠️ `aoSair` DESCE DAQUI porque componente não importa `@/lib/acoes/` (Princípio XI,
    //    guardado por `fronteira-casca` e `fronteira-componentes`). O layout é servidor e
    //    conhece a origem da ação; a casca só dispara o que recebeu.
    <div data-permissoes={permissoes.size}>
      <CascaDoApp
        nome={usuario.nomeExibicao ?? usuario.nome}
        email={usuario.email}
        perfil={usuario.perfil}
        lateralFixada={lateralFixada}
        fotoUrl={fotoUrl}
        aoSair={encerrarSessao}
        submenu={submenu}
        /* Bloco 15 (`FR-003`): o ano guardado (ou o de hoje) — o seletor do cabeçalho lê o `?ano=` do link sozinho. */
        anoEscolhido={{
          ano: escolhaDoAno.ano,
          vigente: escolhaDoAno.vigente,
          origem: escolhaDoAno.origem,
        }}
      >
        {children}
      </CascaDoApp>
    </div>
  );
}

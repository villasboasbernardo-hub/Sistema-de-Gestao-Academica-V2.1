/**
 * Cursos — o catálogo (`RF-CURSOS-01`, `RF-CURSOS-02`, `FR-001` a `FR-005`, `FR-047`).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Os cartões e os indicadores são servidor; só a barra de filtros é
 * folha. Um `"use client"` aqui mandaria o catálogo inteiro para o navegador, e o erro **não aparece
 * no `tsc`** — aparece no `next build`.
 *
 * ⚠️ **UMA CONSULTA PARA A TELA INTEIRA** (`FR-012`). Cartões e indicadores saem das **mesmas** linhas.
 * Se os agregados tivessem leitura própria, a tela mostraria "3 cursos regulares" ao lado de dois
 * cartões e ninguém saberia qual dos dois recortes mudou.
 *
 * ⚠️ **ERRO DE LEITURA NÃO ESTOURA** (`RN-DEG-01`): vira o vazio de "você não vê", que é o que uma
 * negativa da RLS de fato significa.
 *
 * ⚠️ **TRÊS VAZIOS, TRÊS FRASES** (`FR-047`). "Não há para estes filtros", "você não alcança nenhum
 * curso" e "ainda não existe curso no sistema" são fatos diferentes. A Production hoje é o terceiro,
 * e mostrar-lhe o primeiro ensinaria a concluir que a migração falhou.
 */
import Link from "next/link";

import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { SePodeVer } from "@/components/ciaara/SePodeVer";
import { buttonVariants } from "@/components/ui/button";
import { permissoesDoPerfil } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { indicadoresDoCatalogo } from "@/lib/dominio/indicadores-do-catalogo";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { CatalogoDeCursos, type CartaoDeCurso } from "./CatalogoDeCursos";
import {
  alcanceDoPerfil,
  COLUNAS_DO_CATALOGO,
  montarConsultaDeCursos,
  motivoDoVazio,
  PARAMETROS_SEM_RECORTE,
  type ParametrosDoCatalogo,
} from "./consulta";
import { FiltrosDoCatalogo } from "./FiltrosDoCatalogo";
import { IndicadoresDoCatalogo } from "./IndicadoresDoCatalogo";

/** O texto de cada um dos três vazios do `FR-047`. */
const TEXTO_DO_VAZIO = {
  "nao-ha": {
    motivo: "sem-dado" as const,
    titulo: "Nenhum curso com estes filtros",
    detalhe: "Há cursos no sistema — nenhum deles atende ao recorte atual. Limpe um filtro.",
  },
  "nao-ve": {
    motivo: "sem-permissao" as const,
    titulo: "Você não alcança nenhum curso",
    detalhe:
      "O seu perfil enxerga um recorte do catálogo, e ele está vazio. Fale com o Admin se " +
      "precisar de outro escopo.",
  },
  "ainda-nao-existe": {
    motivo: "sem-dado" as const,
    titulo: "Ainda não há curso no sistema",
    detalhe: "Nenhum curso foi cadastrado neste ambiente até agora.",
  },
};

export default async function Cursos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /*
   * ⚠️ A VALIDAÇÃO ACONTECE ANTES DE O VALOR ALCANÇAR A CONSULTA. Com o `RF-NAV-01`, a barra de
   * endereço é entrada de usuário; valor fora do domínio cai para o padrão e nunca vira predicado.
   */
  const { valores } = lerParametros("/cursos", await searchParams);
  const parametros: ParametrosDoCatalogo = {
    classificacao: String(valores.classificacao),
    modalidade: String(valores.modalidade),
    situacao: String(valores.situacao),
  };

  const supabase = await criarClienteDeServidor();
  const [usuario, { data, error }] = await Promise.all([
    usuarioDaSessao(),
    montarConsultaDeCursos(supabase.from("cursos").select(COLUNAS_DO_CATALOGO), parametros),
  ]);
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);

  /*
   * ⚠️ **A ÚNICA ENTRADA CLICÁVEL PARA `/cursos/novo`** — e até 24/09/2026 não havia nenhuma:
   *    a tela existia e só se chegava nela digitando o endereço. A conferência de Bernardo
   *    encontrou, e a causa foi a suíte: os percursos chegavam por `page.goto`, que prova que a
   *    tela funciona e **não** prova que alguém a alcança. **Tela sem caminho clicável é tela não
   *    entregue** (regra do `CLAUDE.md`).
   *
   * ⚠️ **ELE SEGUE A PERMISSÃO DA PÁGINA, e não uma regra própria.** `/cursos/novo` recusa quem
   *    não tem `cursos.criar`; oferecer o botão a quem vai ser recusado é ensinar a bater na
   *    porta. Esconder **não** é a proteção — quem protege é a policy `cursos_criar`.
   */
  const cabecalho = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-texto text-lg font-semibold">Cursos</h1>
        <p className="text-texto-suave text-sm">
          O catálogo agrupado por classificação. Clique num curso para abrir a página dele.
        </p>
      </div>
      <SePodeVer permissoes={permissoes} recurso="cursos" acao="criar">
        <Link
          href="/cursos/novo"
          className={buttonVariants({ size: "sm" })}
          data-slot="ir-para-novo-curso"
        >
          Novo curso
        </Link>
      </SePodeVer>
    </div>
  );

  if (error) {
    return (
      <section className="flex flex-col gap-4">
        {cabecalho}
        <EstadoVazio motivo="sem-permissao" />
      </section>
    );
  }

  const linhas = data ?? [];
  const cursos: CartaoDeCurso[] = linhas.map((c) => ({
    codigo: c.codigo as string,
    nome: c.nome_curso as string,
    classificacao: c.classificacao as string,
    modalidade: c.modalidade,
    proposito: c.proposito,
    duracaoDias: c.duracao_dias === null ? null : Number(c.duracao_dias),
    duracaoSemanas: c.duracao_semanas === null ? null : Number(c.duracao_semanas),
    ativo: c.status === "ativo",
  }));

  const agregados = indicadoresDoCatalogo(
    cursos.map((c) => ({ classificacao: c.classificacao, duracaoDias: c.duracaoDias })),
  );

  /*
   * ⚠️ O RECORTE É MEDIDO CONTRA O PADRÃO DO CONTRATO, e não contra "a URL tem parâmetro". `/cursos`
   * limpo já manda `situacao=ativo` à consulta; tratá-lo como recorte faria a tela vazia de uma base
   * vazia dizer "nenhum curso com estes filtros".
   */
  const haRecorte = (Object.keys(PARAMETROS_SEM_RECORTE) as (keyof ParametrosDoCatalogo)[]).some(
    (chave) => parametros[chave] !== PARAMETROS_SEM_RECORTE[chave],
  );

  const vazio = motivoDoVazio({
    cursosMostrados: cursos.length,
    haRecorte,
    alcanceDoPerfil: alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso),
  });

  return (
    <section className="flex flex-col gap-5">
      {cabecalho}
      <FiltrosDoCatalogo />

      {vazio ? (
        <EstadoVazio
          motivo={TEXTO_DO_VAZIO[vazio].motivo}
          titulo={TEXTO_DO_VAZIO[vazio].titulo}
          detalhe={TEXTO_DO_VAZIO[vazio].detalhe}
        />
      ) : (
        <>
          <IndicadoresDoCatalogo agregados={agregados} />
          <CatalogoDeCursos cursos={cursos} />
        </>
      )}
    </section>
  );
}

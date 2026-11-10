/**
 * Os filtros das abas **Palestras** e **APOINST** de `/atividades` — **folha de cliente** (Bloco 18, spec 033,
 * FR-006.2).
 *
 * > *"Filtros (ícone, RT-4): turma, curso, (…) vínculo (do currículo / avulsa) (…). Na aba Palestras: situação
 * > (cumprida/a cumprir); na APOINST: situação (as quatro)."* — spec 033, FR-006.2
 *
 * ⚠️ **TODOS VÃO PARA A URL, por `useParametro`** (deep-link de graça); os parâmetros já estão no contrato de
 *    `/atividades`. **O `situacao` é um só para as duas abas**, e cada uma oferece e conta só as situações dela — um valor
 *    da outra aba não filtra nem acende o número.
 * ⚠️ **AS ESCOLHAS VÃO PELO `FiltroAvancado`** (gotcha 12) e o *Limpar filtros* é o único do sistema. As opções de turma
 *    chegam do servidor já SEM a arquivada (RT-8) e com a contagem do recorte.
 */
"use client";

import { BotaoLimparFiltros } from "@/components/ciaara/botao-limpar-filtros";
import {
  FiltroAvancado,
  type CampoDeFiltro,
  type EstadoDeFiltro,
  type OpcaoDeFiltro,
} from "@/components/ciaara/filtro-avancado";
import {
  ROTULO_DA_SITUACAO_DA_APOINST,
  SITUACOES_DA_APOINST,
} from "@/lib/dominio/atividades/apoinst";
import {
  ROTULO_DA_SITUACAO_NO_FILTRO_DE_PALESTRAS,
  SITUACOES_DO_FILTRO_DE_PALESTRAS,
  situacaoDeApoinstValida,
  situacaoDePalestraValida,
} from "@/lib/dominio/atividades/palestras-e-apoinst-na-tela";
import { filtrosForaDoPadrao } from "@/lib/navegacao/filtros-fora-do-padrao";
import { useParametro } from "@/lib/navegacao/usar-parametro";

const ROTA = "/atividades" as const;

const ROTULO_DO_VINCULO = {
  do_curriculo: "Do currículo",
  avulsa: "Fora do currículo (avulsa)",
} as const;

type PropsDosFiltros = {
  readonly turmas: readonly OpcaoDeFiltro[];
  readonly cursos: readonly OpcaoDeFiltro[];
};

const um = (v: string) => (v === "" ? [] : [v]);
const escolha = (proximo: EstadoDeFiltro, chave: string) => proximo[chave]?.[0] ?? "";

export function FiltrosDePalestras({ turmas, cursos }: PropsDosFiltros) {
  const [turma, definirTurma] = useParametro(ROTA, "turma");
  const [curso, definirCurso] = useParametro(ROTA, "curso");
  const [situacaoNaUrl, definirSituacao] = useParametro(ROTA, "situacao");
  const [vinculo, definirVinculo] = useParametro(ROTA, "vinculo");
  const situacao = situacaoDePalestraValida(situacaoNaUrl) ? situacaoNaUrl : "";

  const campos: readonly CampoDeFiltro[] = [
    { chave: "turma", rotulo: "Turma", tipo: "escolha", opcoes: turmas },
    { chave: "curso", rotulo: "Curso", tipo: "escolha", opcoes: cursos },
    {
      chave: "situacao",
      rotulo: "Situação",
      tipo: "escolha",
      opcoes: SITUACOES_DO_FILTRO_DE_PALESTRAS.map((s) => ({
        valor: s,
        rotulo: ROTULO_DA_SITUACAO_NO_FILTRO_DE_PALESTRAS[s],
      })),
    },
    {
      chave: "vinculo",
      rotulo: "Vínculo",
      tipo: "escolha",
      opcoes: (["do_curriculo", "avulsa"] as const).map((v) => ({
        valor: v,
        rotulo: ROTULO_DO_VINCULO[v],
      })),
    },
  ];

  const estado: EstadoDeFiltro = {
    turma: um(turma),
    curso: um(curso),
    situacao: um(situacao),
    vinculo: um(vinculo),
  };

  const aoMudar = (proximo: EstadoDeFiltro) => {
    if (escolha(proximo, "turma") !== turma) void definirTurma(escolha(proximo, "turma") || null);
    if (escolha(proximo, "curso") !== curso) void definirCurso(escolha(proximo, "curso") || null);
    if (escolha(proximo, "situacao") !== situacao) {
      void definirSituacao((escolha(proximo, "situacao") || null) as typeof situacaoNaUrl | null);
    }
    if (escolha(proximo, "vinculo") !== vinculo) {
      void definirVinculo((escolha(proximo, "vinculo") || null) as typeof vinculo | null);
    }
  };

  // ⚠️ A régua é o padrão do contrato: o número do ícone e o *Limpar filtros*.
  const ativos = filtrosForaDoPadrao(ROTA, { turma, curso, situacao, vinculo });

  const limpar = () => {
    void definirTurma(null);
    void definirCurso(null);
    void definirSituacao(null);
    void definirVinculo(null);
  };

  return (
    <div className="flex flex-col gap-2" data-slot="filtros-de-palestras">
      <FiltroAvancado campos={campos} estado={estado} aoMudar={aoMudar} ativos={ativos} />
      <BotaoLimparFiltros haFiltroAtivo={ativos > 0} aoLimpar={limpar} />
    </div>
  );
}

export function FiltrosDeApoinst({ turmas, cursos }: PropsDosFiltros) {
  const [turma, definirTurma] = useParametro(ROTA, "turma");
  const [curso, definirCurso] = useParametro(ROTA, "curso");
  const [situacaoNaUrl, definirSituacao] = useParametro(ROTA, "situacao");
  const situacao = situacaoDeApoinstValida(situacaoNaUrl) ? situacaoNaUrl : "";

  const campos: readonly CampoDeFiltro[] = [
    { chave: "turma", rotulo: "Turma", tipo: "escolha", opcoes: turmas },
    { chave: "curso", rotulo: "Curso", tipo: "escolha", opcoes: cursos },
    {
      chave: "situacao",
      rotulo: "Situação",
      tipo: "escolha",
      opcoes: SITUACOES_DA_APOINST.map((s) => ({
        valor: s,
        rotulo: ROTULO_DA_SITUACAO_DA_APOINST[s],
      })),
    },
  ];

  const estado: EstadoDeFiltro = { turma: um(turma), curso: um(curso), situacao: um(situacao) };

  const aoMudar = (proximo: EstadoDeFiltro) => {
    if (escolha(proximo, "turma") !== turma) void definirTurma(escolha(proximo, "turma") || null);
    if (escolha(proximo, "curso") !== curso) void definirCurso(escolha(proximo, "curso") || null);
    if (escolha(proximo, "situacao") !== situacao) {
      void definirSituacao((escolha(proximo, "situacao") || null) as typeof situacaoNaUrl | null);
    }
  };

  const ativos = filtrosForaDoPadrao(ROTA, { turma, curso, situacao });

  const limpar = () => {
    void definirTurma(null);
    void definirCurso(null);
    void definirSituacao(null);
  };

  return (
    <div className="flex flex-col gap-2" data-slot="filtros-de-apoinst">
      <FiltroAvancado campos={campos} estado={estado} aoMudar={aoMudar} ativos={ativos} />
      <BotaoLimparFiltros haFiltroAtivo={ativos > 0} aoLimpar={limpar} />
    </div>
  );
}

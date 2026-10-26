/**
 * O formulário de lançamento (`RF-DSA-04`, `RF-AVAL-04` a `06`, `RF-EXTRA-01`, `Q-1`, `Q-8`,
 * `D-DSA-1` · spec 013, PR 2 e correções de 08/10/2026).
 *
 * ⚠️ **FOLHA DE CLIENTE, DECLARADA.** Abrir, escolher e gravar é interação; a grade e a leitura do
 * banco continuam no servidor.
 *
 * ⚠️ **A ORDEM DAS ESCOLHAS É A DO COMANDO DE 08/10/2026** *(decisão de Bernardo Villas Boas, item 1)*:
 *   a) **tipo** primeiro — Aula · Avaliação · Vista de prova · AEC · TAD · TR · Estudo Individual
 *      (os não letivos com o subtipo da lista);
 *   b) **disciplina** da turma — obrigatória em aula, avaliação e vista; opcional na AEC;
 *   c) **unidade de ensino** da disciplina escolhida — OPCIONAL, com a CH prevista, a lançada e a
 *      restante de cada uma. Sem unidade, um ALERTA visível e o tópico obrigatório; grava assim
 *      mesmo (`RN-DEG-02`: alerta, não bloqueio — e a `D-DSA-1` é o que o banco passou a aceitar);
 *   d) **em qual tempo começa** — os TA do dia com o horário, pré-selecionado pela célula clicada;
 *   e) **quantos tempos**.
 * Até ali o formulário pulava direto para a unidade, e o TA inicial vinha só da célula clicada.
 *
 * ⚠️ **TÉCNICA, LOCAL E QUEM MINISTRA CHEGAM PRÉ-PREENCHIDOS E CONTINUAM EDITÁVEIS** — trocar um deles
 * vale **naquele** lançamento e não toca o cadastro, que é o conserto do `D-4` da planilha.
 *
 * ⚠️ **A AÇÃO CHEGA POR PROPRIEDADE, não por `import`** (Princípio XI): `fronteira-componentes` e
 * `fronteira-casca` proíbem `@/lib/acoes/` dentro de componente.
 *
 * ⚠️ **TODO CAMPO DE ESCOLHA VEM DE `EscolhaSimples`**: a guarda `SC-002` reprova arquivo que cite quem
 * ministra e escreva o elemento de escolha nativo à mão (`RN-ANT-01`, *Risco: Alto*, ponto único).
 *
 * ⚠️ **QUEM RESPONDE POR CADA PAPEL SAI DE `regraDoResponsavel`** (`RN-RESP-1`, emenda de 15/10/2026): aula e aplicador
 * da prova pedem o instrutor do cadastro; fiscal, quem conduz a vista e toda atividade aceitam também o «outro
 * responsável (nome livre)», sem cadastro e sem alerta. O campo livre aparece porque a regra o aceita
 * (`ResponsavelOuNomeLivre`), nunca por lista de tipos escrita aqui.
 *
 * ⚠️ **A SESSÃO DE APLICAÇÃO É UM TIPO PRÓPRIO, E NÃO OUTRA AVALIAÇÃO** (`RN-AV-12`, emenda de 15/10/2026; desenho
 * aprovado por Bernardo Villas Boas em 16/10/2026): escolhida a disciplina, o formulário oferece as provas VIVAS da
 * turma nela aplicadas no dia ou antes (`provasParaSessaoNoDia`), e grava a 2ª, 3ª… sessão da MESMA prova. Sem
 * aplicador nem fiscal próprios — são os da prova —, e por isso o campo de quem responde não aparece.
 *
 * ⚠️ **O INSTRUMENTO DA PROVA SEM ITEM** (A2 do mesmo desenho): na avaliação sem item do currículo escolhido, o
 * «Instrumento» é oferecido, opcional (os ativos de `instrumentos_avaliacao`, menos a OD). Com item, ele não aparece
 * e vai nulo — o instrumento é o do item.
 */
"use client";

import {
  fraseDaListaDaAula,
  idsDaListaDaAula,
  instrutoresDaAula,
  type HabilitacaoAtiva,
} from "@/lib/dominio/dsa/instrutores-da-aula";
import * as React from "react";

import type { TipoOferecido } from "./leitura";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import type { InstrumentoOferecido } from "@/lib/dominio/dsa/instrumento-da-prova";
import {
  frasePara,
  preencherLancamento,
  type AtribuicaoPorDisciplina,
  type AtribuicaoPorUnidade,
  type MotivoDoInstrutorVazio,
} from "@/lib/dominio/dsa/pre-preenchimento";
import { LOCAL_DO_ESTUDO_INDIVIDUAL } from "@/lib/dominio/dsa/rotulos";
import { provasParaSessaoNoDia } from "@/lib/dominio/dsa/sessao-de-aplicacao";
import type { TempoParaEscolher } from "@/lib/dominio/dsa/tempos-do-dia";
import type { InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";
import { regraDoResponsavel } from "@/lib/dominio/responsavel";
import { dataComDiaDaSemana, dataParaLeitura } from "@/lib/formato/data";

import { EscolhaSimples } from "./EscolhaSimples";
import { ResponsavelOuNomeLivre } from "./ResponsavelOuNomeLivre";

/** Uma unidade oferecida, com os **três números** que a operação acompanha (`FR-018`, `P-3`). */
export type UnidadeOferecida = {
  readonly id: string;
  readonly disciplinaId: string;
  readonly disciplinaCodigo: string;
  readonly numero: number;
  readonly topico: string;
  readonly prevista: number;
  readonly lancada: number;
  readonly restante: number;
  /** A técnica sugerida da unidade — o pré-preenchimento da coluna T/E. */
  readonly tecnicaSugerida: string | null;
};

/** Uma disciplina da turma (todas as ativas do curso — `D-DSA-1`). */
export type DisciplinaOferecida = {
  readonly id: string;
  readonly codigo: string;
  readonly nome: string;
};

/**
 * Uma avaliação da turma que pode receber a vista — a vista é uma SESSÃO dela (spec 014, FR-040): a próxima abre o
 * número seguinte ao maior ativo.
 */
export type AvaliacaoOferecida = {
  readonly id: string;
  readonly disciplinaId: string;
  readonly tipo: string;
  readonly aplicadaEm: string | null;
  readonly titulo: string | null;
  readonly sessoes: readonly number[];
  readonly proximaSessao: number;
  /** As sessões de APLICAÇÃO ativas (2, 3…; `RN-AV-12`): a seguinte é a que o tipo «Sessão de aplicação» abre. */
  readonly sessoesDeAplicacao: readonly number[];
  readonly rotulo: string;
};

/** Uma avaliação do currículo oferecida, por disciplina (spec 014, FR-032 — `ofertaDaDisciplina`). */
export type ItemDoCurriculoOferecido = {
  readonly disciplinaId: string;
  readonly itemId: string;
  readonly rotulo: string;
  readonly tempo: number | null;
  readonly aplicada: boolean;
};

export type ResultadoDaAcao =
  | {
      readonly ok: true;
      readonly id: string;
      readonly avisos: readonly { readonly codigo: string; readonly texto: string }[];
    }
  | { readonly ok: false; readonly mensagem: string; readonly campo?: string };

export type FormularioDeLancamentoProps = {
  readonly turmaId: string;
  readonly cursoId: string;
  readonly salaDaTurma: string | null;
  /** O dia que a célula clicada fixou. */
  readonly dia: string;
  /** O TA da célula clicada — o PONTO DE PARTIDA da escolha do tempo, que continua editável. */
  readonly taInicial: number;
  /** Os TA do dia, com o horário de cada um (`temposParaEscolher`). */
  readonly temposDoDia: readonly TempoParaEscolher[];
  readonly unidades: readonly UnidadeOferecida[];
  /**
   * As atribuições da turma, em antiguidade — por UE e por disciplina: os dois primeiros degraus da
   * sugestão de instrutor (`preencherLancamento`, FR-012.2 da spec 016). Ausentes, nada é sugerido.
   */
  readonly atribuicoesPorUe?: readonly AtribuicaoPorUnidade[];
  readonly atribuicoesPorDisciplina?: readonly AtribuicaoPorDisciplina[];
  readonly disciplinas: readonly DisciplinaOferecida[];
  readonly avaliacoesParaVista: readonly AvaliacaoOferecida[];
  readonly avaliacoesDoCurriculo?: readonly ItemDoCurriculoOferecido[];
  readonly instrutores: readonly InstrutorParaExibir[];
  /**
   * RD-1 (Bloco 11): as habilitações ATIVAS. Na aula, a lista de quem ministra é só dos habilitados na disciplina, e
   * o padrão é o designado para a turma — se for habilitado (D-3).
   */
  readonly habilitacoes?: readonly HabilitacaoAtiva[];
  readonly escala: EscalaDeAntiguidade;
  readonly tecnicas: readonly string[];
  readonly tiposDeAvaliacao: readonly string[];
  /** A2 (16/10/2026): os instrumentos da prova sem item do currículo — os ativos, menos a OD. */
  readonly instrumentos?: readonly InstrumentoOferecido[];
  readonly subtipos: readonly TipoOferecido[];
  readonly podeAtividadeGlobal?: boolean;
  readonly lancar: (entrada: unknown) => Promise<ResultadoDaAcao>;
  readonly aoFechar: () => void;
};

/** Os demais instrutores, escritos como no documento — *"1ºTen B. / SO C."* — viram a lista (FR-046). */
function listaDeOutros(texto: string): string[] {
  return texto
    .split("/")
    .map((n) => n.trim())
    .filter((n) => n !== "");
}

type Tipo =
  | "aula"
  | "avaliacao"
  | "sessao_aplicacao"
  | "vista_prova"
  | "AEC"
  | "TAD"
  | "TR"
  | "Estudo_Individual"
  | "Apoio_Individualizado";

const TIPOS: readonly (readonly [Tipo, string])[] = [
  ["aula", "Aula"],
  ["avaliacao", "Avaliação"],
  ["sessao_aplicacao", "Sessão de aplicação (prova já aplicada)"],
  ["vista_prova", "Vista de prova"],
  ["AEC", "AEC"],
  ["TAD", "TAD"],
  ["TR", "TR"],
  ["Estudo_Individual", "Estudo Individual"],
  ["Apoio_Individualizado", "Apoio Individualizado"],
];

const NAO_LETIVOS: ReadonlySet<Tipo> = new Set<Tipo>([
  "AEC",
  "TAD",
  "TR",
  "Estudo_Individual",
  "Apoio_Individualizado",
]);

/** O rótulo da categoria que o tipo dá, mostrado antes de gravar (spec 014, FR-011). */
const ROTULO_DA_CATEGORIA: Readonly<Record<string, string>> = {
  AEC: "AEC",
  TAD: "TAD",
  TR: "TR",
  Estudo_Individual: "Estudo Individual (fora da CHT)",
  Apoio_Individualizado: "Apoio Individualizado — alunos específicos (fora da CHT)",
};

/** O alerta do item 1c, com as palavras do comando de 08/10/2026. */
export const ALERTA_SEM_UNIDADE =
  "Sem unidade de ensino escolhida — a CH desta aula não entra no controle por UE. O tópico passa a ser obrigatório.";

export function FormularioDeLancamento({
  turmaId,
  cursoId,
  salaDaTurma,
  dia,
  taInicial,
  temposDoDia,
  unidades,
  atribuicoesPorUe = [],
  atribuicoesPorDisciplina = [],
  disciplinas,
  avaliacoesParaVista,
  avaliacoesDoCurriculo = [],
  instrutores,
  habilitacoes = [],
  escala,
  tecnicas,
  tiposDeAvaliacao,
  instrumentos = [],
  subtipos,
  podeAtividadeGlobal = false,
  lancar,
  aoFechar,
}: FormularioDeLancamentoProps) {
  const [tipo, definirTipo] = React.useState<Tipo>("aula");
  /* Por que o instrutor não veio sugerido — a frase de `frasePara` (`RN-DEG-01`), nunca campo mudo. */
  const [motivoDoInstrutor, definirMotivoDoInstrutor] =
    React.useState<MotivoDoInstrutorVazio>(null);
  /* O último instrutor que a SUGESTÃO pôs — só ele sai quando a disciplina nova não sugere ninguém. */
  const [instrutorSugerido, definirInstrutorSugerido] = React.useState<string | null>(null);
  const [disciplinaId, definirDisciplina] = React.useState("");
  /* RD-1 (Bloco 11): quem pode ministrar a aula — os habilitados na disciplina escolhida (nenhum sem disciplina). */
  const listaDaAula = instrutoresDaAula(
    instrutores,
    habilitacoes,
    disciplinaId === "" ? null : disciplinaId,
  );
  const [unidadeId, definirUnidade] = React.useState("");
  const [avaliacaoId, definirAvaliacao] = React.useState("");
  const [ta, definirTa] = React.useState(String(taInicial));
  const [tempos, definirTempos] = React.useState(1);
  const [quemMinistra, definirQuemMinistra] = React.useState("");
  const [tecnica, definirTecnica] = React.useState("");
  const [local, definirLocal] = React.useState(salaDaTurma ?? "");
  /* O local só acompanha o tipo enquanto ninguém o editou — depois, é escolha da pessoa. */
  const [localEditado, definirLocalEditado] = React.useState(false);
  const [conteudo, definirConteudo] = React.useState("");
  const [tipoAvaliacao, definirTipoAvaliacao] = React.useState("");
  /* `RN-RESP-1`: o fiscal do cadastro OU de nome livre — exclusivos, como no banco (`fiscal_id` × nome). */
  const [fiscalId, definirFiscal] = React.useState("");
  const [nomeFiscalExterno, definirFiscalExterno] = React.useState("");
  const [subtipo, definirSubtipo] = React.useState("");
  const [descricao, definirDescricao] = React.useState("");
  const [responsavelExterno, definirResponsavelExterno] = React.useState("");
  const [todasAsTurmas, definirTodasAsTurmas] = React.useState(false);
  const [quantidadeAlunos, definirQuantidadeAlunos] = React.useState("");
  /* Spec 014: o item do currículo (FR-039), a faixa de UEs (FR-033), os demais instrutores (FR-046) e quem conduz
     a sessão de vista (FR-043). */
  const [itemId, definirItem] = React.useState("");
  /* A2: o instrumento da prova SEM item do currículo — opcional. */
  const [instrumentoId, definirInstrumento] = React.useState("");
  const [uesAbordadas, definirUesAbordadas] = React.useState("");
  const [outros, definirOutros] = React.useState("");
  const [quemConduz, definirQuemConduz] = React.useState("");
  const [conduzExterno, definirConduzExterno] = React.useState("");
  const [recusa, definirRecusa] = React.useState<string | null>(null);
  const [avisos, definirAvisos] = React.useState<readonly { codigo: string; texto: string }[]>([]);
  const [gravando, definirGravando] = React.useState(false);

  const naoLetivo = NAO_LETIVOS.has(tipo);
  const unidadesDaDisciplina = unidades.filter((u) => u.disciplinaId === disciplinaId);
  const avaliacoesDaDisciplina = avaliacoesParaVista.filter((a) => a.disciplinaId === disciplinaId);
  const itensDaDisciplina = avaliacoesDoCurriculo.filter((i) => i.disciplinaId === disciplinaId);
  /* `RN-AV-12`: as provas da disciplina aplicadas no dia ou antes, cada uma com a sessão que abriria. */
  const provasDaSessao = provasParaSessaoNoDia(avaliacoesParaVista, { disciplinaId, dia });
  /* ⚠️ O alerta do item 1c: aula, com disciplina, e SEM unidade. */
  const semUnidade = tipo === "aula" && disciplinaId !== "" && unidadeId === "";
  /* `RN-RESP-1`: a regra do papel principal deste tipo — quem ministra, quem aplica, quem conduz, quem responde. */
  const regraPrincipal = regraDoResponsavel(
    tipo === "aula"
      ? { tipo: "aula" }
      : tipo === "avaliacao" || tipo === "sessao_aplicacao"
        ? { tipo: "avaliacao", papel: "aplicador" }
        : tipo === "vista_prova"
          ? { tipo: "vista" }
          : { tipo: "atividade", categoria: tipo },
  );

  function escolherTipo(novo: Tipo): void {
    definirTipo(novo);
    definirSubtipo("");
    if (novo === "Estudo_Individual") definirTodasAsTurmas(false);
    definirUnidade("");
    definirAvaliacao("");
    /* Disciplina só existe em aula, avaliação, vista e AEC. */
    if (NAO_LETIVOS.has(novo) && novo !== "AEC") definirDisciplina("");
    /*
     * ⚠️ **O ESTUDO INDIVIDUAL É NA BIBLIOTECA** (decisão de 07/10/2026) — pelo MESMO texto que o
     * lançamento da semana em um clique usa, nunca escrito aqui. Só enquanto ninguém editou o local.
     */
    if (!localEditado) {
      definirLocal(novo === "Estudo_Individual" ? LOCAL_DO_ESTUDO_INDIVIDUAL : (salaDaTurma ?? ""));
    }
  }

  /*
   * ⚠️ **A SUGESTÃO É A DE `preencherLancamento`, A FUNÇÃO ÚNICA** (FR-012.2 da spec 016; `FR-014` da spec
   * 013): instrutor pela cascata UE da turma → disciplina na turma → vazio; técnica e tópico da UE. A mesma
   * que a planilha de contingência usa — até 18/10/2026 a tela pré-preenchia à mão, só pela UE, e a planilha
   * sugeria mais do que a tela. ⚠️ **Só na aula**: é dela a cascata, e é ela que exige instrutor.
   */
  function sugerir(disciplina: string, unidade: string | null) {
    const u = unidade === null ? undefined : unidades.find((x) => x.id === unidade);
    /* RD-1, D-3, D-5: só o designado da lista da aula (ATIVO e habilitado) é sugerido. */
    const habilitados = idsDaListaDaAula(instrutores, habilitacoes, disciplina);
    const p = preencherLancamento({
      disciplinaId: disciplina,
      unidadeEnsinoId: unidade,
      porUnidade: atribuicoesPorUe,
      porDisciplina: atribuicoesPorDisciplina,
      tecnicaSugerida: u?.tecnicaSugerida ?? null,
      topico: u?.topico ?? null,
      salaDaTurma,
      habilitados,
    });
    if (tipo === "aula") {
      /*
       * ⚠️ **O QUE A PESSOA ESCOLHEU NÃO É APAGADO; O QUE A SUGESTÃO PÔS, É** — trocar de disciplina para uma
       *    sem atribuição deixaria o instrutor da anterior no campo, um valor plausível e errado que grava.
       * ⚠️ **RD-1: E O ESCOLHIDO QUE NÃO É HABILITADO NA DISCIPLINA NOVA SAI** — ele deixou de estar na lista.
       */
      if (p.instrutorId !== null) definirQuemMinistra(p.instrutorId);
      else if (
        quemMinistra !== "" &&
        (quemMinistra === instrutorSugerido || !habilitados.has(quemMinistra))
      )
        definirQuemMinistra("");
      definirInstrutorSugerido(p.instrutorId);
      definirMotivoDoInstrutor(p.motivoDoInstrutorVazio);
    }
    return p;
  }

  function escolherDisciplina(id: string): void {
    definirDisciplina(id);
    definirUnidade("");
    definirAvaliacao("");
    definirItem("");
    if (id === "") definirMotivoDoInstrutor(null);
    else sugerir(id, null);
  }

  /* O tempo do item é o palpite dos tempos — editável, como todo pré-preenchimento. */
  function escolherItem(id: string): void {
    definirItem(id);
    /* Com item, o instrumento é o dele: o escolhido à mão sai. */
    if (id !== "") definirInstrumento("");
    const i = avaliacoesDoCurriculo.find((x) => x.itemId === id);
    if (i?.tempo) definirTempos(i.tempo);
  }

  /*
   * ⚠️ **O PRÉ-PREENCHIMENTO ACONTECE AO ESCOLHER A UNIDADE, e cada campo que ele toca continua
   * EDITÁVEL.** É a diferença entre pré-preencher e impor: a planilha impunha (`D-4`).
   */
  function escolherUnidade(id: string): void {
    definirUnidade(id);
    const u = unidades.find((x) => x.id === id);
    if (!u) return;
    const p = sugerir(u.disciplinaId, id);
    if (p.tecnica) definirTecnica(p.tecnica);
    if (p.conteudo) definirConteudo(p.conteudo);
    /* O restante da unidade é um bom palpite para os tempos — nunca mais que isso. */
    if (u.restante > 0) definirTempos(Math.min(u.restante, 4));
  }

  const texto = (v: string) => (v.trim() === "" ? null : v.trim());
  const nulo = (v: string) => (v === "" ? null : v);

  function montarBloco(): unknown {
    const comum = {
      turmaId,
      data: dia,
      taInicial: Number(ta),
      tempos,
      local: texto(local),
    };
    if (tipo === "aula") {
      return {
        tipo: "aula",
        ...comum,
        cursoId,
        /* ⚠️ UMA FONTE SÓ: com unidade, a disciplina é a dela; sem unidade, a da coluna (`D-DSA-1`). */
        unidadeEnsinoId: nulo(unidadeId),
        disciplinaId: unidadeId === "" ? nulo(disciplinaId) : null,
        conteudo: texto(conteudo),
        tecnica: texto(tecnica),
        instrutorId: quemMinistra,
        outrosInstrutores: listaDeOutros(outros),
      };
    }
    if (tipo === "avaliacao") {
      return {
        tipo: "avaliacao",
        ...comum,
        cursoId,
        disciplinaId,
        tipoAvaliacao,
        instrutorId: quemMinistra,
        conteudo: texto(conteudo),
        tecnica: texto(tecnica),
        /* Com o fiscal do cadastro escolhido, o nome livre não viaja (o esquema recusa os dois). */
        fiscalId: nulo(fiscalId),
        nomeFiscalExterno: fiscalId === "" ? texto(nomeFiscalExterno) : null,
        avaliacaoCurriculoId: nulo(itemId),
        /* A2: o instrumento só viaja SEM item — com item, vai nulo (o instrumento é o do item). */
        instrumentoId: itemId === "" ? nulo(instrumentoId) : null,
        uesAbordadas: texto(uesAbordadas),
        outrosInstrutores: listaDeOutros(outros),
      };
    }
    if (tipo === "sessao_aplicacao") {
      /* `RN-AV-12`: só a prova e o horário — o número, o aplicador e o fiscal são do servidor e da prova. */
      return { tipo: "sessao_aplicacao", ...comum, avaliacaoId };
    }
    if (tipo === "vista_prova") {
      return {
        tipo: "vista_prova",
        ...comum,
        avaliacaoId,
        conduzInstrutorId: nulo(quemConduz),
        conduzNomeExterno: quemConduz === "" ? texto(conduzExterno) : null,
      };
    }
    const global = podeAtividadeGlobal && todasAsTurmas && tipo !== "Estudo_Individual";
    return {
      tipo: "atividade",
      ...comum,
      /* ⚠️ Spec 014, FR-014: «todas as turmas» grava com a turma nula (escopo global). */
      turmaId: global ? null : turmaId,
      /* ⚠️ Spec 014, FR-011: o TIPO; a categoria é do banco, pelo tipo. */
      tipoAtividadeId: subtipo,
      descricao,
      instrutorId: nulo(quemMinistra),
      /* `RN-RESP-1`: com instrutor do cadastro, o nome livre não viaja (`ativ_responsavel_exclusivo`). */
      responsavelExterno: quemMinistra === "" ? texto(responsavelExterno) : null,
      /* A disciplina da AEC é opcional, e só da AEC (item 1b). */
      disciplinaId: tipo === "AEC" && !global ? nulo(disciplinaId) : null,
      /* A quantidade de alunos, opcional, só no Apoio (FR-020). */
      quantidadeAlunos:
        tipo === "Apoio_Individualizado" && quantidadeAlunos.trim() !== ""
          ? Number(quantidadeAlunos)
          : null,
      outrosInstrutores: listaDeOutros(outros),
    };
  }

  async function gravar(evento: React.FormEvent): Promise<void> {
    evento.preventDefault();
    definirRecusa(null);
    definirAvisos([]);
    definirGravando(true);
    const resposta = await lancar(montarBloco());
    definirGravando(false);
    if (!resposta.ok) {
      definirRecusa(resposta.mensagem);
      return;
    }
    definirAvisos(resposta.avisos);
    /* Sem aviso, o formulário fecha; com aviso, ele fica para a pessoa LER (`RN-DEG-02`). */
    if (resposta.avisos.length === 0) aoFechar();
  }

  /* Os subtipos filtram por categoria — é o que a `H2` do analyze pôs em `metadados.categoria`. */
  const subtiposDoTipo = subtipos.filter((s) => s.categoria === tipo);
  const tipoEscolhido = subtipos.find((s) => s.id === subtipo);

  return (
    <form
      onSubmit={gravar}
      data-slot="formulario-de-lancamento"
      className="flex flex-col gap-3"
      aria-label={`Lançar em ${dataParaLeitura(dia)}`}
    >
      {/* O DIA É MOSTRADO, NÃO PEDIDO: ele vem da célula clicada. */}
      <p className="text-texto-suave text-sm" data-slot="alvo-do-lancamento">
        Dia <strong className="text-texto">{dataComDiaDaSemana(dia)}</strong>
      </p>

      {/* a) O TIPO, primeiro. */}
      <div className="flex flex-wrap gap-1" role="group" aria-label="O que lançar">
        {TIPOS.map(([valor, rotulo]) => (
          <Button
            key={valor}
            type="button"
            size="sm"
            variant={tipo === valor ? "default" : "outline"}
            aria-pressed={tipo === valor}
            onClick={() => escolherTipo(valor)}
            data-tipo={valor}
          >
            {rotulo}
          </Button>
        ))}
      </div>

      {naoLetivo ? (
        /*
         * ⚠️ **O SUBTIPO VEM DA LISTA ADMINISTRÁVEL, FILTRADA PELA CATEGORIA** (`H2`), e nenhuma sigla
         * de duas letras entra: a planilha usa `AD`, `TR`, `FR` com sentidos que mudam entre cursos.
         */
        <div className="flex flex-col gap-1">
          <EscolhaSimples
            id="dsa-subtipo"
            rotulo="Tipo de atividade"
            obrigatorio
            textoVazio="Escolha o tipo…"
            valor={subtipo}
            aoMudar={definirSubtipo}
            opcoes={subtiposDoTipo.map((s) => ({ valor: s.id, rotulo: s.valor }))}
          />
          {/* ⚠️ Spec 014, FR-011: a categoria que o tipo dá aparece ANTES de gravar. */}
          {tipoEscolhido ? (
            <p className="text-texto-suave text-xs" data-slot="categoria-do-tipo">
              Conta como: {ROTULO_DA_CATEGORIA[tipoEscolhido.categoria] ?? tipoEscolhido.categoria}
            </p>
          ) : null}
          {podeAtividadeGlobal && tipo !== "Estudo_Individual" ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={todasAsTurmas}
                onChange={(e) => definirTodasAsTurmas(e.target.checked)}
                data-slot="atividade-de-todas-as-turmas"
              />
              Todas as turmas (com DSA nesta data)
            </label>
          ) : null}
          {tipo === "Apoio_Individualizado" ? (
            <label className="flex flex-col gap-1 text-sm">
              <span>Quantos alunos (opcional)</span>
              <Input
                id="dsa-quantidade-alunos"
                type="number"
                min={1}
                max={999}
                value={quantidadeAlunos}
                onChange={(e) => definirQuantidadeAlunos(e.target.value)}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {/* b) A DISCIPLINA — obrigatória em aula, avaliação e vista; opcional na AEC. */}
      {!naoLetivo || tipo === "AEC" ? (
        <EscolhaSimples
          id="dsa-disciplina"
          rotulo={tipo === "AEC" ? "Disciplina (opcional)" : "Disciplina"}
          obrigatorio={tipo !== "AEC"}
          textoVazio={tipo === "AEC" ? "Sem disciplina" : "Escolha a disciplina…"}
          valor={disciplinaId}
          aoMudar={escolherDisciplina}
          opcoes={disciplinas.map((d) => ({ valor: d.id, rotulo: `${d.codigo} — ${d.nome}` }))}
        />
      ) : null}

      {/* c) A UNIDADE DE ENSINO da disciplina — OPCIONAL, com os três números. */}
      {tipo === "aula" && disciplinaId !== "" ? (
        <>
          <EscolhaSimples
            id="dsa-unidade"
            rotulo="Unidade de ensino (opcional)"
            textoVazio="Sem unidade de ensino"
            valor={unidadeId}
            aoMudar={escolherUnidade}
            ajuda={
              unidadesDaDisciplina.length === 0
                ? "Esta disciplina não tem unidades de ensino cadastradas."
                : "Cada opção traz a carga lançada, a prevista e o quanto resta."
            }
            opcoes={unidadesDaDisciplina.map((u) => ({
              valor: u.id,
              rotulo: `UE ${u.numero} — ${u.topico} (${u.lancada}/${u.prevista} TA, restam ${u.restante})`,
            }))}
          />
          {semUnidade ? (
            <p
              role="status"
              data-slot="alerta-sem-unidade"
              className="rounded-ciaara border-atrasado-borda bg-atrasado-fundo text-atrasado-tinta border px-2 py-1 text-sm"
            >
              {ALERTA_SEM_UNIDADE}
            </p>
          ) : null}
        </>
      ) : null}

      {tipo === "vista_prova" && disciplinaId !== "" ? (
        <EscolhaSimples
          id="dsa-avaliacao-da-vista"
          rotulo="De qual avaliação é a vista"
          obrigatorio
          textoVazio={
            avaliacoesDaDisciplina.length === 0
              ? "Nenhuma avaliação desta disciplina"
              : "Escolha a avaliação…"
          }
          valor={avaliacaoId}
          aoMudar={definirAvaliacao}
          ajuda="A vista é uma sessão da mesma avaliação: ela não cria prova nova, e pode ter várias sessões."
          opcoes={avaliacoesDaDisciplina.map((a) => ({
            valor: a.id,
            rotulo:
              `${a.rotulo}${a.aplicadaEm ? ` de ${dataParaLeitura(a.aplicadaEm)}` : ""}` +
              (a.titulo ? ` — ${a.titulo}` : "") +
              ` · sessão ${a.proximaSessao}`,
          }))}
        />
      ) : null}

      {/*
        `RN-AV-12` (16/10/2026): a prova de que esta é a 2ª, 3ª… sessão — só as aplicadas no dia ou antes. A sessão
        não é prova nova: o «X de Y» continua contando a prova uma vez.
      */}
      {tipo === "sessao_aplicacao" && disciplinaId !== "" ? (
        <EscolhaSimples
          id="dsa-prova-da-sessao"
          rotulo="De qual prova é a sessão"
          obrigatorio
          textoVazio={
            provasDaSessao.length === 0
              ? "Nenhuma prova desta disciplina aplicada até este dia"
              : "Escolha a prova…"
          }
          valor={avaliacaoId}
          aoMudar={definirAvaliacao}
          ajuda="A sessão de aplicação é a MESMA prova em outro dia: ela não cria avaliação nova, e quem aplica e fiscaliza são os da prova."
          opcoes={provasDaSessao.map((a) => ({
            valor: a.id,
            rotulo:
              `${a.rotulo}${a.aplicadaEm ? ` de ${dataParaLeitura(a.aplicadaEm)}` : ""}` +
              (a.titulo ? ` — ${a.titulo}` : "") +
              ` · sessão ${a.proximaSessao}`,
          }))}
        />
      ) : null}

      {/* Spec 014, FR-032 e FR-039: a avaliação do currículo que esta prova cumpre — obrigatória se a disciplina tem item. */}
      {tipo === "avaliacao" && disciplinaId !== "" && itensDaDisciplina.length > 0 ? (
        <EscolhaSimples
          id="dsa-item-do-curriculo"
          rotulo="Avaliação do currículo"
          obrigatorio
          textoVazio="Escolha a avaliação do currículo…"
          valor={itemId}
          aoMudar={escolherItem}
          ajuda="Lançar uma avaliação já aplicada é permitido, com aviso: passa do previsto do currículo."
          opcoes={itensDaDisciplina.map((i) => ({
            valor: i.itemId,
            rotulo:
              `${i.rotulo}${i.tempo ? ` — ${i.tempo} TA` : " — tempo não definido"}` +
              (i.aplicada ? " (já aplicada)" : ""),
          }))}
        />
      ) : null}

      {/*
        A2 (16/10/2026): o INSTRUMENTO, só na prova SEM item do currículo escolhido, e opcional. Com item, ele é o do
        item — e a Server Action grava nulo de qualquer jeito.
      */}
      {tipo === "avaliacao" && disciplinaId !== "" && itemId === "" && instrumentos.length > 0 ? (
        <EscolhaSimples
          id="dsa-instrumento"
          rotulo="Instrumento (opcional)"
          textoVazio="Sem instrumento"
          valor={instrumentoId}
          aoMudar={definirInstrumento}
          ajuda="Só na prova sem avaliação do currículo: com item, o instrumento é o dele."
          opcoes={instrumentos.map((i) => ({ valor: i.id, rotulo: i.rotulo }))}
        />
      ) : null}

      {tipo === "avaliacao" ? (
        <EscolhaSimples
          id="dsa-tipo-avaliacao"
          rotulo="Tipo da avaliação"
          obrigatorio
          textoVazio="Escolha o tipo…"
          valor={tipoAvaliacao}
          aoMudar={definirTipoAvaliacao}
          opcoes={tiposDeAvaliacao.map((t) => ({ valor: t, rotulo: t }))}
        />
      ) : null}

      {/* d) EM QUAL TEMPO COMEÇA — pré-selecionado pela célula clicada, e editável. */}
      <EscolhaSimples
        id="dsa-ta-inicial"
        rotulo="Em qual tempo começa"
        obrigatorio
        valor={ta}
        aoMudar={definirTa}
        opcoes={temposDoDia.map((t) => ({ valor: String(t.ta), rotulo: t.rotulo }))}
      />

      {/* e) QUANTOS TEMPOS. */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="dsa-tempos">Quantos tempos</Label>
        <Input
          id="dsa-tempos"
          type="number"
          min={1}
          max={12}
          required
          value={tempos}
          onChange={(e) => definirTempos(Number(e.target.value))}
          className="w-24 tabular-nums"
        />
      </div>

      {naoLetivo ? (
        <div className="flex flex-col gap-1">
          <Label htmlFor="dsa-descricao">O que é</Label>
          <Input
            id="dsa-descricao"
            required
            value={descricao}
            onChange={(e) => definirDescricao(e.target.value)}
          />
        </div>
      ) : null}

      {tipo === "aula" || tipo === "avaliacao" ? (
        <>
          <div className="flex flex-col gap-1">
            <Label htmlFor="dsa-conteudo">Tópico{semUnidade ? " (obrigatório)" : ""}</Label>
            <Input
              id="dsa-conteudo"
              required={semUnidade}
              value={conteudo}
              onChange={(e) => definirConteudo(e.target.value)}
            />
          </div>
          <EscolhaSimples
            id="dsa-tecnica"
            rotulo="Técnica de ensino"
            textoVazio="—"
            valor={tecnica}
            aoMudar={definirTecnica}
            opcoes={tecnicas.map((t) => ({ valor: t, rotulo: t }))}
          />
        </>
      ) : null}

      {/*
        ⚠️ O SELETOR É O CANÔNICO, e ele reordena por ANTIGUIDADE a lista que recebe (`RN-ANT-01`).
           A vista de prova não leva quem ministra: leva quem CONDUZ a sessão (FR-043) — do cadastro ou de nome livre.
        ⚠️ `RN-RESP-1`: o «outro responsável (nome livre)» aparece quando a regra do papel o aceita.
      */}
      {tipo === "vista_prova" ? (
        <ResponsavelOuNomeLivre
          regra={regraPrincipal}
          instrutores={instrutores}
          escala={escala}
          legenda="Quem conduz a vista (opcional — sem ele, o responsável da avaliação)"
          rotuloDoCadastro="Instrutor do cadastro"
          idDoNomeLivre="dsa-conduz-externo"
          exemplo="Posto e nome, como no documento"
          instrutorId={quemConduz}
          aoMudarInstrutor={definirQuemConduz}
          nomeLivre={conduzExterno}
          aoMudarNomeLivre={definirConduzExterno}
          slot="quem-conduz-a-vista"
        />
      ) : tipo === "sessao_aplicacao" ? (
        /* `RN-AV-12`: a sessão não tem responsável próprio — e dizer isso evita procurar o campo. */
        <p className="text-texto-suave text-sm" data-slot="responsavel-da-sessao">
          Quem aplica e quem fiscaliza esta sessão são os da prova (a 1ª sessão).
        </p>
      ) : tipo === "aula" && listaDaAula.length === 0 ? (
        /*
         * RD-1 (Bloco 11): a aula sem disciplina escolhida, ou com uma sem habilitado, não tem quem escolher — a frase
         * diz o porquê, no lugar do seletor (cujo vazio diria "o seu perfil não os alcança", que é outra coisa).
         */
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-texto">Quem ministra</span>
          <p className="text-xs text-atrasado-tinta" data-slot="aula-sem-habilitado">
            {fraseDaListaDaAula(disciplinaId === "" ? null : disciplinaId, listaDaAula)}
          </p>
        </div>
      ) : (
        <ResponsavelOuNomeLivre
          regra={regraPrincipal}
          /* RD-1 (Bloco 11): na aula, só os habilitados na disciplina dela; nos demais tipos, o cadastro (ativo). */
          instrutores={tipo === "aula" ? listaDaAula : instrutores}
          escala={escala}
          rotuloDoCadastro={
            tipo === "avaliacao"
              ? "Responsável pela avaliação"
              : regraPrincipal.instrutorDoCadastro === "opcional"
                ? "Instrutor do cadastro (opcional)"
                : "Quem ministra"
          }
          idDoNomeLivre="dsa-responsavel-externo"
          exemplo="DOEP, CIAARA-30, palestrante…"
          instrutorId={quemMinistra}
          aoMudarInstrutor={definirQuemMinistra}
          nomeLivre={responsavelExterno}
          aoMudarNomeLivre={definirResponsavelExterno}
          slot="responsavel-do-lancamento"
        />
      )}
      {tipo === "aula" &&
      listaDaAula.length > 0 &&
      quemMinistra === "" &&
      frasePara(motivoDoInstrutor) !== null ? (
        <p className="text-xs text-atrasado-tinta" data-slot="aviso-sem-atribuicao">
          {frasePara(motivoDoInstrutor)}
        </p>
      ) : null}

      {tipo === "avaliacao" ? (
        <div className="flex flex-col gap-1">
          {/* Spec 014, FR-033: a faixa de UEs abordadas, texto, sem consumir TA de UE. */}
          <Label htmlFor="dsa-ues-abordadas">U.E. abordadas (opcional)</Label>
          <Input
            id="dsa-ues-abordadas"
            value={uesAbordadas}
            onChange={(e) => definirUesAbordadas(e.target.value)}
            placeholder="U.E. 3 a 6"
          />
        </div>
      ) : null}

      {tipo !== "vista_prova" && tipo !== "sessao_aplicacao" ? (
        <div className="flex flex-col gap-1">
          {/* Spec 014, FR-046: o 2º nome, como no documento; nada vai para observações. */}
          <Label htmlFor="dsa-outros-instrutores">Demais instrutores (opcional)</Label>
          <Input
            id="dsa-outros-instrutores"
            value={outros}
            onChange={(e) => definirOutros(e.target.value)}
            placeholder="1ºTen B. / SO C."
          />
        </div>
      ) : null}

      {tipo === "avaliacao" ? (
        /*
         * `RF-AVAL-06` e `RN-RESP-1`: quem fiscaliza é do cadastro (pelo seletor canônico) OU de nome livre — o fiscal
         * não é atuação de instrutor (`RN-INST-01`), então não há habilitação a conferir.
         */
        <ResponsavelOuNomeLivre
          regra={regraDoResponsavel({ tipo: "avaliacao", papel: "fiscal" })}
          instrutores={instrutores}
          escala={escala}
          legenda="Fiscal (opcional)"
          rotuloDoCadastro="Fiscal do cadastro"
          idDoNomeLivre="dsa-fiscal-externo"
          exemplo="Posto e nome, como no documento"
          instrutorId={fiscalId}
          aoMudarInstrutor={definirFiscal}
          nomeLivre={nomeFiscalExterno}
          aoMudarNomeLivre={definirFiscalExterno}
          slot="fiscal-da-avaliacao"
        />
      ) : null}

      <div className="flex flex-col gap-1">
        <Label htmlFor="dsa-local">Local</Label>
        <Input
          id="dsa-local"
          value={local}
          onChange={(e) => {
            definirLocalEditado(true);
            definirLocal(e.target.value);
          }}
        />
      </div>

      {recusa ? (
        <p role="alert" className="text-conflito-tinta text-sm" data-slot="recusa-do-lancamento">
          {recusa}
        </p>
      ) : null}

      {/*
        ⚠️ **OS AVISOS NÃO BLOQUEIAM** (`RN-DEG-02`): o lançamento JÁ foi gravado quando eles aparecem.
           Os bloqueios — o teto de TFM, o dia bloqueado no calendário (`RN-EVT-04`) e o dia fora da
           etapa presencial (`D-DSA-2`) — chegam como recusa, ANTES de gravar, e não aqui.
      */}
      {avisos.length > 0 ? (
        <div role="status" data-slot="avisos-do-lancamento" className="flex flex-col gap-1">
          <p className="text-atrasado-tinta text-sm font-medium">
            Lançado, com {avisos.length} aviso(s):
          </p>
          <ul className="text-atrasado-tinta list-disc pl-5 text-sm">
            {avisos.map((a) => (
              <li key={a.codigo}>{a.texto}</li>
            ))}
          </ul>
          <Button type="button" size="sm" variant="outline" onClick={aoFechar}>
            Entendi
          </Button>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={gravando} data-slot="gravar-lancamento">
          {gravando ? "Gravando…" : "Lançar"}
        </Button>
        <Button type="button" variant="ghost" onClick={aoFechar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

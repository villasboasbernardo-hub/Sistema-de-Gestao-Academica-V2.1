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
 */
"use client";

import * as React from "react";

import { SeletorInstrutor } from "@/components/ciaara/seletor-instrutor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import { LOCAL_DO_ESTUDO_INDIVIDUAL } from "@/lib/dominio/dsa/rotulos";
import type { TempoParaEscolher } from "@/lib/dominio/dsa/tempos-do-dia";
import type { InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";
import { dataComDiaDaSemana, dataParaLeitura } from "@/lib/formato/data";

import { EscolhaSimples } from "./EscolhaSimples";

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
  /** Quem está atribuído a esta unidade nesta turma, quando há. */
  readonly atribuidoId: string | null;
};

/** Uma disciplina da turma (todas as ativas do curso — `D-DSA-1`). */
export type DisciplinaOferecida = {
  readonly id: string;
  readonly codigo: string;
  readonly nome: string;
};

/** Uma avaliação da turma que pode receber a vista (`RN-AVAL-02`: a vista é a mesma linha). */
export type AvaliacaoOferecida = {
  readonly id: string;
  readonly disciplinaId: string;
  readonly tipo: string;
  readonly aplicadaEm: string | null;
  readonly titulo: string | null;
  readonly vistaEm: string | null;
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
  readonly disciplinas: readonly DisciplinaOferecida[];
  readonly avaliacoesParaVista: readonly AvaliacaoOferecida[];
  readonly instrutores: readonly InstrutorParaExibir[];
  readonly escala: EscalaDeAntiguidade;
  readonly tecnicas: readonly string[];
  readonly tiposDeAvaliacao: readonly string[];
  readonly subtipos: readonly { readonly valor: string; readonly categoria: string | null }[];
  readonly lancar: (entrada: unknown) => Promise<ResultadoDaAcao>;
  readonly aoFechar: () => void;
};

type Tipo = "aula" | "avaliacao" | "vista_prova" | "AEC" | "TAD" | "TR" | "Estudo_Individual";

const TIPOS: readonly (readonly [Tipo, string])[] = [
  ["aula", "Aula"],
  ["avaliacao", "Avaliação"],
  ["vista_prova", "Vista de prova"],
  ["AEC", "AEC"],
  ["TAD", "TAD"],
  ["TR", "TR"],
  ["Estudo_Individual", "Estudo Individual"],
];

const NAO_LETIVOS: ReadonlySet<Tipo> = new Set<Tipo>(["AEC", "TAD", "TR", "Estudo_Individual"]);

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
  disciplinas,
  avaliacoesParaVista,
  instrutores,
  escala,
  tecnicas,
  tiposDeAvaliacao,
  subtipos,
  lancar,
  aoFechar,
}: FormularioDeLancamentoProps) {
  const [tipo, definirTipo] = React.useState<Tipo>("aula");
  const [disciplinaId, definirDisciplina] = React.useState("");
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
  const [nomeFiscalExterno, definirFiscalExterno] = React.useState("");
  const [subtipo, definirSubtipo] = React.useState("");
  const [descricao, definirDescricao] = React.useState("");
  const [responsavelExterno, definirResponsavelExterno] = React.useState("");
  const [recusa, definirRecusa] = React.useState<string | null>(null);
  const [avisos, definirAvisos] = React.useState<readonly { codigo: string; texto: string }[]>([]);
  const [gravando, definirGravando] = React.useState(false);

  const naoLetivo = NAO_LETIVOS.has(tipo);
  const unidadesDaDisciplina = unidades.filter((u) => u.disciplinaId === disciplinaId);
  const avaliacoesDaDisciplina = avaliacoesParaVista.filter((a) => a.disciplinaId === disciplinaId);
  /* ⚠️ O alerta do item 1c: aula, com disciplina, e SEM unidade. */
  const semUnidade = tipo === "aula" && disciplinaId !== "" && unidadeId === "";

  function escolherTipo(novo: Tipo): void {
    definirTipo(novo);
    definirSubtipo("");
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

  function escolherDisciplina(id: string): void {
    definirDisciplina(id);
    definirUnidade("");
    definirAvaliacao("");
  }

  /*
   * ⚠️ **O PRÉ-PREENCHIMENTO ACONTECE AO ESCOLHER A UNIDADE, e cada campo que ele toca continua
   * EDITÁVEL.** É a diferença entre pré-preencher e impor: a planilha impunha (`D-4`).
   */
  function escolherUnidade(id: string): void {
    definirUnidade(id);
    const u = unidades.find((x) => x.id === id);
    if (!u) return;
    if (u.atribuidoId) definirQuemMinistra(u.atribuidoId);
    if (u.tecnicaSugerida) definirTecnica(u.tecnicaSugerida);
    if (u.topico) definirConteudo(u.topico);
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
        fiscalId: null,
        nomeFiscalExterno: texto(nomeFiscalExterno),
      };
    }
    if (tipo === "vista_prova") {
      return { tipo: "vista_prova", ...comum, avaliacaoId };
    }
    return {
      tipo: "atividade",
      ...comum,
      categoria: tipo,
      subtipo,
      descricao,
      instrutorId: nulo(quemMinistra),
      responsavelExterno: texto(responsavelExterno),
      /* A disciplina da AEC é opcional, e só da AEC (item 1b). */
      disciplinaId: tipo === "AEC" ? nulo(disciplinaId) : null,
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
        <EscolhaSimples
          id="dsa-subtipo"
          rotulo="Subtipo"
          obrigatorio
          textoVazio="Escolha o subtipo…"
          valor={subtipo}
          aoMudar={definirSubtipo}
          opcoes={subtiposDoTipo.map((s) => ({ valor: s.valor, rotulo: s.valor }))}
        />
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
          ajuda="A vista é a segunda data da mesma avaliação: ela não cria prova nova."
          opcoes={avaliacoesDaDisciplina.map((a) => ({
            valor: a.id,
            rotulo:
              `${a.tipo}${a.aplicadaEm ? ` de ${dataParaLeitura(a.aplicadaEm)}` : ""}` +
              (a.titulo ? ` — ${a.titulo}` : "") +
              (a.vistaEm ? ` (vista já em ${dataParaLeitura(a.vistaEm)})` : ""),
          }))}
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
           A vista de prova não leva quem ministra: ela é conduzida pelo responsável da avaliação.
      */}
      {tipo !== "vista_prova" ? (
        <SeletorInstrutor
          instrutores={instrutores}
          escala={escala}
          valor={quemMinistra}
          aoMudar={definirQuemMinistra}
          rotulo={tipo === "avaliacao" ? "Responsável pela avaliação" : "Quem ministra"}
        />
      ) : null}

      {tipo === "avaliacao" ? (
        <div className="flex flex-col gap-1">
          {/* `RF-AVAL-06`: quem fiscaliza pode ser de fora do cadastro (`fiscal_id` × nome). */}
          <Label htmlFor="dsa-fiscal-externo">Fiscal de fora do cadastro (opcional)</Label>
          <Input
            id="dsa-fiscal-externo"
            value={nomeFiscalExterno}
            onChange={(e) => definirFiscalExterno(e.target.value)}
            placeholder="Posto e nome, como no documento"
          />
        </div>
      ) : null}

      {naoLetivo ? (
        <div className="flex flex-col gap-1">
          {/* ⚠️ `Q-8`: a coluna da planilha traz entidade (`DOEP`, `NAS`) e palestrante externo. */}
          <Label htmlFor="dsa-responsavel-externo">Responsável de fora (opcional)</Label>
          <Input
            id="dsa-responsavel-externo"
            value={responsavelExterno}
            onChange={(e) => definirResponsavelExterno(e.target.value)}
            placeholder="DOEP, CIAARA-30, palestrante…"
          />
        </div>
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

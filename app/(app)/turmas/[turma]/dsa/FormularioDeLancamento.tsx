/**
 * O formulário de lançamento — **no máximo quatro decisões** (`RF-DSA-04`, `RF-AVAL-04` a `06`,
 * `RF-EXTRA-01`, `Q-1`, `Q-8`, `SC-009` · spec 013, PR 2).
 *
 * ⚠️ **FOLHA DE CLIENTE, DECLARADA.** Abrir, escolher e gravar é interação; a grade e a leitura do
 * banco continuam no servidor.
 *
 * ⚠️ **O ESFORÇO A IGUALAR É O DA PLANILHA: DUAS CÉLULAS POR BLOCO** (`P-2`, medido em 15
 * planilhas). O dia e o TA inicial vêm da **célula clicada** — zero decisões. Sobram **duas**: o
 * que lançar (a unidade, que já traz a disciplina) e quantos tempos. Técnica, local e quem ministra
 * chegam **pré-preenchidos** e podem ser trocados **naquele** lançamento sem tocar o cadastro — é o
 * conserto do `D-4`, em que trocar um atributo do catálogo reescrevia todo DSA passado.
 *
 * ⚠️ **A AÇÃO CHEGA POR PROPRIEDADE, não por `import`.** `fronteira-componentes` e `fronteira-casca`
 * proíbem `@/lib/acoes/` dentro de componente — *"o componente recebe dado por propriedade e não
 * conhece origem"* (Princípio XI). Server Action atravessa a fronteira porque é serializável.
 *
 * ⚠️ **TODO CAMPO DE ESCOLHA VEM DE `EscolhaSimples`, E NENHUM `<select>` É ESCRITO AQUI.** A razão
 * é a guarda `SC-002`, que reprova arquivo com `<select` que também cite quem ministra: a
 * `RN-ANT-01` é de *Risco: Alto* e vale por **ponto único**. Ver o cabeçalho de `EscolhaSimples`.
 */
"use client";

import * as React from "react";

import { SeletorInstrutor } from "@/components/ciaara/seletor-instrutor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import type { InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";
import { CATEGORIAS_NAO_LETIVAS } from "@/lib/validacao/dsa";

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

/** Uma disciplina sem unidades, oferecida **só** onde a isenção da `Q-1` vale. */
export type DisciplinaIsenta = {
  readonly id: string;
  readonly codigo: string;
  readonly nome: string;
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
  /** O dia e o TA que a célula clicada fixou — **as duas decisões que já foram tomadas**. */
  readonly dia: string;
  readonly taInicial: number;
  readonly unidades: readonly UnidadeOferecida[];
  readonly disciplinasIsentas: readonly DisciplinaIsenta[];
  readonly instrutores: readonly InstrutorParaExibir[];
  readonly escala: EscalaDeAntiguidade;
  readonly tecnicas: readonly string[];
  readonly tiposDeAvaliacao: readonly string[];
  readonly subtipos: readonly { readonly valor: string; readonly categoria: string | null }[];
  readonly lancar: (entrada: unknown) => Promise<ResultadoDaAcao>;
  readonly aoFechar: () => void;
};

type Modo = "aula" | "aula_sem_ue" | "avaliacao" | "atividade";

const ROTULO_DA_CATEGORIA: Readonly<Record<string, string>> = {
  AEC: "AEC — atividade extraclasse",
  TAD: "TAD — tempo administrativo",
  TR: "TR — tempo reserva",
  Estudo_Individual: "Estudo Individual",
};

export function FormularioDeLancamento({
  turmaId,
  cursoId,
  salaDaTurma,
  dia,
  taInicial,
  unidades,
  disciplinasIsentas,
  instrutores,
  escala,
  tecnicas,
  tiposDeAvaliacao,
  subtipos,
  lancar,
  aoFechar,
}: FormularioDeLancamentoProps) {
  const [modo, definirModo] = React.useState<Modo>("aula");
  const [unidadeId, definirUnidade] = React.useState("");
  const [disciplinaIsentaId, definirDisciplinaIsenta] = React.useState("");
  const [tempos, definirTempos] = React.useState(1);
  const [quemMinistra, definirQuemMinistra] = React.useState("");
  const [tecnica, definirTecnica] = React.useState("");
  const [local, definirLocal] = React.useState(salaDaTurma ?? "");
  const [conteudo, definirConteudo] = React.useState("");
  const [tipoAvaliacao, definirTipoAvaliacao] = React.useState("");
  const [nomeFiscalExterno, definirFiscalExterno] = React.useState("");
  const [categoria, definirCategoria] =
    React.useState<(typeof CATEGORIAS_NAO_LETIVAS)[number]>("AEC");
  const [subtipo, definirSubtipo] = React.useState("");
  const [descricao, definirDescricao] = React.useState("");
  const [responsavelExterno, definirResponsavelExterno] = React.useState("");
  const [recusa, definirRecusa] = React.useState<string | null>(null);
  const [avisos, definirAvisos] = React.useState<readonly { codigo: string; texto: string }[]>([]);
  const [gravando, definirGravando] = React.useState(false);

  const unidadeEscolhida = unidades.find((u) => u.id === unidadeId);

  /*
   * ⚠️ **O PRÉ-PREENCHIMENTO ACONTECE AO ESCOLHER, e cada campo que ele toca continua EDITÁVEL.**
   * É a diferença entre pré-preencher e impor: a planilha impunha, e trocar um atributo do catálogo
   * reescrevia o passado (`D-4`). Aqui o valor sugerido entra no campo e pode ser trocado
   * **naquele** lançamento.
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

  function montarBloco(): unknown {
    if (modo === "aula" || modo === "aula_sem_ue") {
      return {
        tipo: "aula",
        turmaId,
        cursoId,
        data: dia,
        taInicial,
        tempos,
        local: texto(local),
        unidadeEnsinoId: modo === "aula" ? (unidadeId === "" ? null : unidadeId) : null,
        disciplinaId:
          modo === "aula_sem_ue" ? (disciplinaIsentaId === "" ? null : disciplinaIsentaId) : null,
        /* ⚠️ Só é `true` no modo que a tela ofereceu — e a tela só o oferece quando o banco permite. */
        disciplinaSemUe: modo === "aula_sem_ue",
        conteudo: texto(conteudo),
        tecnica: texto(tecnica),
        instrutorId: quemMinistra,
      };
    }
    if (modo === "avaliacao") {
      return {
        tipo: "avaliacao",
        turmaId,
        cursoId,
        data: dia,
        taInicial,
        tempos,
        local: texto(local),
        disciplinaId: unidadeEscolhida?.disciplinaId ?? disciplinaIsentaId,
        tipoAvaliacao,
        instrutorId: quemMinistra,
        conteudo: texto(conteudo),
        tecnica: texto(tecnica),
        fiscalId: null,
        nomeFiscalExterno: texto(nomeFiscalExterno),
      };
    }
    return {
      tipo: "atividade",
      turmaId,
      data: dia,
      taInicial,
      tempos,
      local: texto(local),
      categoria,
      subtipo,
      descricao,
      instrutorId: quemMinistra === "" ? null : quemMinistra,
      responsavelExterno: texto(responsavelExterno),
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
  const subtiposDaCategoria = subtipos.filter((s) => s.categoria === categoria);

  const modos: readonly (readonly [Modo, string])[] = [
    ["aula", "Aula"],
    ...(disciplinasIsentas.length > 0
      ? ([["aula_sem_ue", "Aula sem unidade"]] as readonly (readonly [Modo, string])[])
      : []),
    ["avaliacao", "Avaliação"],
    ["atividade", "Não letiva"],
  ];

  return (
    <form
      onSubmit={gravar}
      data-slot="formulario-de-lancamento"
      className="rounded-ciaara border-borda bg-superficie flex flex-col gap-3 border p-3"
      aria-label={`Lançar no dia ${dia}, tempo ${taInicial}`}
    >
      {/*
        ⚠️ O DIA E O TA SÃO MOSTRADOS, NÃO PEDIDOS: eles vêm da célula clicada, e são as duas
           decisões já tomadas. Pedi-los de novo seria o esforço da planilha mais um.
      */}
      <p className="text-texto-suave text-sm" data-slot="alvo-do-lancamento">
        Dia <strong className="text-texto">{dia}</strong> · a partir do tempo{" "}
        <strong className="text-texto tabular-nums">{taInicial}</strong>
      </p>

      <div className="flex flex-wrap gap-1" role="group" aria-label="O que lançar">
        {modos.map(([valor, rotulo]) => (
          <Button
            key={valor}
            type="button"
            size="sm"
            variant={modo === valor ? "default" : "outline"}
            aria-pressed={modo === valor}
            onClick={() => definirModo(valor)}
            data-modo={valor}
          >
            {rotulo}
          </Button>
        ))}
      </div>

      {modo === "aula" ? (
        <EscolhaSimples
          id="dsa-unidade"
          rotulo="Unidade de ensino"
          obrigatorio
          textoVazio="Escolha a unidade…"
          valor={unidadeId}
          aoMudar={escolherUnidade}
          ajuda="Cada opção traz a carga lançada, a prevista e o quanto resta."
          opcoes={unidades.map((u) => ({
            valor: u.id,
            rotulo: `${u.disciplinaCodigo} · UE ${u.numero} — ${u.topico} (${u.lancada}/${u.prevista} TA, restam ${u.restante})`,
          }))}
        />
      ) : null}

      {modo === "aula_sem_ue" ? (
        <EscolhaSimples
          id="dsa-disciplina-isenta"
          rotulo="Disciplina"
          obrigatorio
          textoVazio="Escolha a disciplina…"
          valor={disciplinaIsentaId}
          aoMudar={definirDisciplinaIsenta}
          ajuda="Esta disciplina não tem unidades de ensino, então o tópico é obrigatório: é ele que registra o que foi dado."
          opcoes={disciplinasIsentas.map((d) => ({
            valor: d.id,
            rotulo: `${d.codigo} — ${d.nome}`,
          }))}
        />
      ) : null}

      {modo === "avaliacao" ? (
        <>
          <EscolhaSimples
            id="dsa-tipo-avaliacao"
            rotulo="Tipo da avaliação"
            obrigatorio
            textoVazio="Escolha o tipo…"
            valor={tipoAvaliacao}
            aoMudar={definirTipoAvaliacao}
            opcoes={tiposDeAvaliacao.map((t) => ({ valor: t, rotulo: t }))}
          />
          <EscolhaSimples
            id="dsa-unidade-avaliacao"
            rotulo="Disciplina (pela unidade)"
            obrigatorio
            textoVazio="Escolha…"
            valor={unidadeId}
            aoMudar={definirUnidade}
            opcoes={unidades.map((u) => ({
              valor: u.id,
              rotulo: `${u.disciplinaCodigo} · UE ${u.numero}`,
            }))}
          />
          <div className="flex flex-col gap-1">
            {/*
              ⚠️ **QUEM FISCALIZA PODE SER DE FORA DO CADASTRO** (`RF-AVAL-06`), e é o desenho que
                 `avaliacoes` já tem: `fiscal_id` × `nome_fiscal_externo`, exclusivos.
            */}
            <Label htmlFor="dsa-fiscal-externo">Fiscal de fora do cadastro (opcional)</Label>
            <Input
              id="dsa-fiscal-externo"
              value={nomeFiscalExterno}
              onChange={(e) => definirFiscalExterno(e.target.value)}
              placeholder="Posto e nome, como no documento"
            />
          </div>
        </>
      ) : null}

      {modo === "atividade" ? (
        <>
          <EscolhaSimples
            id="dsa-categoria"
            rotulo="Categoria normativa"
            valor={categoria}
            aoMudar={(v) => {
              definirCategoria(v as typeof categoria);
              definirSubtipo("");
            }}
            opcoes={CATEGORIAS_NAO_LETIVAS.map((c) => ({
              valor: c,
              rotulo: ROTULO_DA_CATEGORIA[c] ?? c,
            }))}
          />
          {/*
            ⚠️ **O SUBTIPO VEM DA LISTA ADMINISTRÁVEL, FILTRADA PELA CATEGORIA** — é a `H2` do
               analyze em funcionamento. Oferecer a lista inteira misturaria tipo de aula com
               não-letivo, que é como `tipos_atividade` está no banco. E **nenhuma sigla de duas
               letras entra**: a planilha usa `AD`, `TR`, `FR` com sentidos que mudam entre cursos,
               e é isso que esta tela elimina.
          */}
          <EscolhaSimples
            id="dsa-subtipo"
            rotulo="Subtipo"
            obrigatorio
            textoVazio="Escolha o subtipo…"
            valor={subtipo}
            aoMudar={definirSubtipo}
            opcoes={subtiposDaCategoria.map((s) => ({ valor: s.valor, rotulo: s.valor }))}
          />
          <div className="flex flex-col gap-1">
            <Label htmlFor="dsa-descricao">O que é</Label>
            <Input
              id="dsa-descricao"
              required
              value={descricao}
              onChange={(e) => definirDescricao(e.target.value)}
            />
          </div>
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
        </>
      ) : null}

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

      {modo !== "atividade" ? (
        <>
          <div className="flex flex-col gap-1">
            <Label htmlFor="dsa-conteudo">
              Tópico{modo === "aula_sem_ue" ? " (obrigatório)" : ""}
            </Label>
            <Input
              id="dsa-conteudo"
              required={modo === "aula_sem_ue"}
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
           Quem está inativo não chega aqui: a página o filtra (`RN-INST-02`).
      */}
      <SeletorInstrutor
        instrutores={instrutores}
        escala={escala}
        valor={quemMinistra}
        aoMudar={definirQuemMinistra}
        rotulo={modo === "avaliacao" ? "Responsável pela avaliação" : "Quem ministra"}
      />

      <div className="flex flex-col gap-1">
        <Label htmlFor="dsa-local">Local</Label>
        <Input id="dsa-local" value={local} onChange={(e) => definirLocal(e.target.value)} />
      </div>

      {recusa ? (
        <p role="alert" className="text-conflito-tinta text-sm" data-slot="recusa-do-lancamento">
          {recusa}
        </p>
      ) : null}

      {/*
        ⚠️ **OS AVISOS NÃO BLOQUEIAM** (`RN-DEG-02`): o lançamento JÁ foi gravado quando eles
           aparecem. Transformá-los em impedimento mudaria a regra de negócio — os tetos AEC/TAD/TR
           e o 9º TA são alerta. Os dois bloqueios — o teto de TFM e o dia bloqueado no calendário
           (`RN-EVT-04`) — chegam como recusa, ANTES de gravar, e não aqui.
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

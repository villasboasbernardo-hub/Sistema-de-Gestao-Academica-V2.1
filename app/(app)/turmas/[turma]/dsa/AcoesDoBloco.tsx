/**
 * O CARTÃO ÚNICO de um lançamento já na grade — editar tudo de uma vez, e excluir (`RF-DSA-07`,
 * `FR-029` a `FR-032`, `RNF-USA-03`, `Q-1`, `Q-12` · spec 013; ajustes 1 e 2 do PR #40).
 *
 * > *"UM CARTÃO SÓ. Clicar no cartão de um lançamento abre UM diálogo onde se edita tudo de uma vez:
 * > dia, tempo inicial, quantos tempos, disciplina/UE, tópico, quem ministra, técnica, local. (…) Um
 * > só botão Gravar, uma só Server Action. Excluir continua no mesmo diálogo, com confirmação."*
 * > — Bernardo Villas Boas, 08/10/2026
 *
 * ⚠️ **TODO CAMPO NASCE COM O VALOR GRAVADO NAQUELE LANÇAMENTO, NUNCA COM O DO CADASTRO** (ajuste 2).
 * O pré-preenchimento é só do lançamento NOVO (`FormularioDeLancamento`). Os valores vêm de
 * `fato.gravado`, cru — e não dos campos de exibição, que na avaliação mostram o tipo no lugar do
 * tópico vazio e o fiscal antes do responsável: reabrir com eles e gravar reescrevia o lançamento.
 *
 * ⚠️ **O GRAVAR MANDA SÓ O QUE MUDOU.** Campo que a pessoa não tocou não viaja, e por isso não pode
 * ser reescrito por engano — é a mesma distinção `undefined`/`null` da Server Action.
 *
 * ⚠️ **FOLHA DE CLIENTE, DECLARADA.** As ações chegam por propriedade (Princípio XI); quem decide é a
 * Server Action (`atualizar`), e quem impõe é o banco.
 */
"use client";

import * as React from "react";

import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { SeletorInstrutor } from "@/components/ciaara/seletor-instrutor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import type { DiaDaGrade, ValoresGravados } from "@/lib/dominio/dsa/grade";
import type { OrigemDoFato } from "@/lib/dominio/dsa/posicao-herdada";
import { temposParaEscolher } from "@/lib/dominio/dsa/tempos-do-dia";
import type { InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";
import { dataComDiaDaSemana } from "@/lib/formato/data";

import { EscolhaSimples } from "./EscolhaSimples";
import {
  ALERTA_SEM_UNIDADE,
  type DisciplinaOferecida,
  type ResultadoDaAcao,
  type UnidadeOferecida,
} from "./FormularioDeLancamento";

/** O fato escolhido, como a grade o conhece. */
export type FatoEscolhido = {
  readonly fatoId: string;
  readonly origem: OrigemDoFato;
  readonly data: string;
  readonly taInicial: number | null;
  readonly tempos: number | null;
  readonly disciplina: string | null;
  readonly conteudo: string | null;
  readonly local: string | null;
  readonly tecnica: string | null;
  readonly instrutor: string | null;
  /** `origem_migracao_v1 != null && editado_em == null` — é o que a catraca da `Q-1` lê. */
  readonly herdado: boolean;
  /** `true` quando o fato está na faixa "Sem posição" (`Q-12`). */
  readonly semPosicao: boolean;
  /** O GRAVADO, cru — a fonte de todo campo deste cartão (ajuste 2). */
  readonly gravado: ValoresGravados | undefined;
};

export type AcoesDoBlocoProps = {
  readonly fato: FatoEscolhido;
  /** Os dias da semana aberta, com o relógio — o destino possível e os tempos de cada um. */
  readonly diasDaSemana: readonly DiaDaGrade[];
  /** Quantos Tempos de Aula a grade tem. */
  readonly linhas: number;
  readonly unidades: readonly UnidadeOferecida[];
  readonly disciplinas: readonly DisciplinaOferecida[];
  readonly instrutores: readonly InstrutorParaExibir[];
  readonly escala: EscalaDeAntiguidade;
  readonly tecnicas: readonly string[];
  readonly atualizar: (entrada: unknown) => Promise<ResultadoDaAcao>;
  readonly excluir: (entrada: unknown) => Promise<ResultadoDaAcao>;
  readonly aoFechar: () => void;
};

const texto = (v: string): string | null => (v.trim() === "" ? null : v.trim());

export function AcoesDoBloco({
  fato,
  diasDaSemana,
  linhas,
  unidades,
  disciplinas,
  instrutores,
  escala,
  tecnicas,
  atualizar,
  excluir,
  aoFechar,
}: AcoesDoBlocoProps) {
  const g: ValoresGravados = fato.gravado ?? {
    instrutorId: null,
    unidadeEnsinoId: null,
    disciplinaId: null,
    conteudo: fato.conteudo,
    tecnica: fato.tecnica,
    local: fato.local,
  };
  const ehAula = fato.origem === "aula";
  const temTopico = fato.origem === "aula" || fato.origem === "avaliacao";
  const temQuemMinistra = fato.origem !== "vista_prova";

  /* A disciplina gravada: a da UE, quando há UE; senão a da coluna. */
  const disciplinaGravada =
    (g.unidadeEnsinoId === null
      ? null
      : (unidades.find((u) => u.id === g.unidadeEnsinoId)?.disciplinaId ?? null)) ?? g.disciplinaId;

  const [dia, definirDia] = React.useState(fato.data);
  const [ta, definirTa] = React.useState(String(fato.taInicial ?? 1));
  const [tempos, definirTempos] = React.useState(String(fato.tempos ?? 1));
  const [disciplinaId, definirDisciplina] = React.useState(disciplinaGravada ?? "");
  const [unidadeId, definirUnidade] = React.useState(g.unidadeEnsinoId ?? "");
  const [conteudo, definirConteudo] = React.useState(g.conteudo ?? "");
  const [tecnica, definirTecnica] = React.useState(g.tecnica ?? "");
  const [instrutorId, definirInstrutor] = React.useState(g.instrutorId ?? "");
  const [local, definirLocal] = React.useState(g.local ?? "");
  const [recusa, definirRecusa] = React.useState<string | null>(null);
  const [avisos, definirAvisos] = React.useState<readonly { codigo: string; texto: string }[]>([]);
  const [agindo, definirAgindo] = React.useState(false);

  const unidadesDaDisciplina = unidades.filter((u) => u.disciplinaId === disciplinaId);
  const semUnidade = ehAula && disciplinaId !== "" && unidadeId === "";
  const diaEscolhido = diasDaSemana.find((d) => d.data === dia);

  async function executar(acao: () => Promise<ResultadoDaAcao>): Promise<void> {
    definirRecusa(null);
    definirAvisos([]);
    definirAgindo(true);
    const resposta = await acao();
    definirAgindo(false);
    if (!resposta.ok) {
      definirRecusa(resposta.mensagem);
      return;
    }
    definirAvisos(resposta.avisos);
    /* Sem aviso, o cartão fecha; com aviso, ele fica para a pessoa LER (`RN-DEG-02`). */
    if (resposta.avisos.length === 0) aoFechar();
  }

  /** Só o que mudou em relação ao GRAVADO. */
  function mudancas(): Record<string, unknown> {
    const m: Record<string, unknown> = {};
    if (dia !== fato.data) m["data"] = dia;
    if (Number(ta) !== fato.taInicial) m["taInicial"] = Number(ta);
    if (Number(tempos) !== fato.tempos) m["tempos"] = Number(tempos);
    if (texto(local) !== g.local) m["local"] = texto(local);
    if (ehAula) {
      const novaUe = unidadeId === "" ? null : unidadeId;
      if (novaUe !== g.unidadeEnsinoId) m["unidadeEnsinoId"] = novaUe;
      const novaDisciplina = novaUe === null && disciplinaId !== "" ? disciplinaId : null;
      if (novaUe === null && novaDisciplina !== g.disciplinaId) m["disciplinaId"] = novaDisciplina;
    }
    if (temTopico || fato.origem === "atividade_nao_letiva") {
      if (texto(conteudo) !== g.conteudo) m["conteudo"] = texto(conteudo);
    }
    if (temTopico && texto(tecnica) !== g.tecnica) m["tecnica"] = texto(tecnica);
    /* Quem ministra não se apaga por aqui: vazio é "não mexi". */
    if (temQuemMinistra && instrutorId !== "" && instrutorId !== g.instrutorId) {
      m["instrutorId"] = instrutorId;
    }
    return m;
  }

  const titulo = [fato.disciplina, fato.conteudo].filter(Boolean).join(" — ") || "Lançamento";

  return (
    <section
      data-slot="acoes-do-bloco"
      aria-label={`Lançamento: ${titulo}`}
      className="flex flex-col gap-3"
    >
      <p className="text-sm text-texto" data-slot="bloco-escolhido">
        <strong>{titulo}</strong>
        <span className="block text-xs text-texto-suave">
          {fato.semPosicao
            ? `${dataComDiaDaSemana(fato.data)} · sem posição`
            : `${dataComDiaDaSemana(fato.data)} · a partir do tempo ${fato.taInicial ?? "—"}`}
        </span>
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <EscolhaSimples
          id="dsa-mover-dia"
          rotulo="Dia"
          valor={dia}
          aoMudar={definirDia}
          opcoes={diasDaSemana.map((d) => ({ valor: d.data, rotulo: dataComDiaDaSemana(d.data) }))}
        />
        <EscolhaSimples
          id="dsa-mover-ta"
          rotulo="Em qual tempo começa"
          valor={ta}
          aoMudar={definirTa}
          opcoes={temposParaEscolher(diaEscolhido, Math.max(linhas, 1)).map((t) => ({
            valor: String(t.ta),
            rotulo: t.rotulo,
          }))}
        />
        <div className="flex flex-col gap-1">
          <Label htmlFor="dsa-editar-tempos">Quantos tempos</Label>
          <Input
            id="dsa-editar-tempos"
            type="number"
            min={1}
            max={12}
            value={tempos}
            onChange={(e) => definirTempos(e.target.value)}
            className="w-24 tabular-nums"
          />
        </div>
      </div>

      {ehAula ? (
        <>
          {/*
            ⚠️ **DISCIPLINA E UE, COMO NO LANÇAMENTO** (`D-DSA-1`): a UE é opcional; sem ela, o alerta e o
               tópico obrigatório. É também o que satisfaz a catraca da linha histórica sem UE (`Q-1`).
          */}
          <EscolhaSimples
            id="dsa-editar-disciplina"
            rotulo="Disciplina"
            textoVazio="Escolha a disciplina…"
            valor={disciplinaId}
            aoMudar={(v) => {
              definirDisciplina(v);
              definirUnidade("");
            }}
            opcoes={disciplinas.map((d) => ({ valor: d.id, rotulo: `${d.codigo} — ${d.nome}` }))}
          />
          {disciplinaId !== "" ? (
            <EscolhaSimples
              id="dsa-editar-unidade"
              rotulo="Unidade de ensino (opcional)"
              textoVazio="Sem unidade de ensino"
              valor={unidadeId}
              aoMudar={definirUnidade}
              opcoes={unidadesDaDisciplina.map((u) => ({
                valor: u.id,
                rotulo: `UE ${u.numero} — ${u.topico} (${u.lancada}/${u.prevista} TA, restam ${u.restante})`,
              }))}
            />
          ) : null}
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

      {temTopico ? (
        <>
          <div className="flex flex-col gap-1">
            <Label htmlFor="dsa-editar-conteudo">Tópico{semUnidade ? " (obrigatório)" : ""}</Label>
            <Input
              id="dsa-editar-conteudo"
              value={conteudo}
              onChange={(e) => definirConteudo(e.target.value)}
            />
          </div>
          <EscolhaSimples
            id="dsa-editar-tecnica"
            rotulo="Técnica de ensino"
            textoVazio="—"
            valor={tecnica}
            aoMudar={definirTecnica}
            opcoes={tecnicas.map((t) => ({ valor: t, rotulo: t }))}
          />
        </>
      ) : null}

      {fato.origem === "atividade_nao_letiva" ? (
        <div className="flex flex-col gap-1">
          <Label htmlFor="dsa-editar-conteudo">O que é</Label>
          <Input
            id="dsa-editar-conteudo"
            value={conteudo}
            onChange={(e) => definirConteudo(e.target.value)}
          />
        </div>
      ) : null}

      {temQuemMinistra ? (
        /* ⚠️ Trocar quem ministra passa pelo porteiro da habilitação (`RN-INST-01`, Risco: Alto). */
        <SeletorInstrutor
          instrutores={instrutores}
          escala={escala}
          valor={instrutorId}
          aoMudar={definirInstrutor}
          rotulo={fato.origem === "avaliacao" ? "Responsável pela avaliação" : "Quem ministra"}
        />
      ) : null}

      <div className="flex flex-col gap-1">
        <Label htmlFor="dsa-editar-local">Local</Label>
        <Input id="dsa-editar-local" value={local} onChange={(e) => definirLocal(e.target.value)} />
      </div>

      {recusa ? (
        <p role="alert" className="text-conflito-tinta text-sm" data-slot="recusa-da-acao">
          {recusa}
        </p>
      ) : null}

      {avisos.length > 0 ? (
        <div role="status" data-slot="avisos-da-acao" className="flex flex-col gap-1">
          <p className="text-sm font-medium text-atrasado-tinta">
            Gravado, com {avisos.length} aviso(s):
          </p>
          <ul className="list-disc pl-5 text-sm text-atrasado-tinta">
            {avisos.map((a) => (
              <li key={a.codigo}>{a.texto}</li>
            ))}
          </ul>
          <Button type="button" size="sm" variant="outline" onClick={aoFechar}>
            Entendi
          </Button>
        </div>
      ) : null}

      <div className="border-borda flex flex-wrap items-center gap-2 border-t pt-2">
        <Button
          type="button"
          size="sm"
          disabled={agindo}
          data-slot="gravar-edicao"
          onClick={() =>
            executar(() => atualizar({ fatoId: fato.fatoId, origem: fato.origem, ...mudancas() }))
          }
        >
          {agindo ? "Gravando…" : "Gravar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={aoFechar}>
          Cancelar
        </Button>
        <span className="flex-1" />
        <DialogoConfirmacao
          titulo="Excluir este lançamento?"
          /*
           * ⚠️ **A CONSEQUÊNCIA DIZ A VERDADE, e a verdade é que a exclusão é LÓGICA** (regra 4).
           */
          consequencia={
            fato.origem === "vista_prova"
              ? "A segunda data (a vista de prova) sai do DSA. A avaliação em si continua lançada — elas são o mesmo fato."
              : "O lançamento sai da grade e do DSA impresso, e deixa de contar na carga horária. Ele não é apagado do banco: fica inativo, e pode voltar."
          }
          rotuloConfirmar="Excluir"
          aoConfirmar={() =>
            void executar(() => excluir({ fatoId: fato.fatoId, origem: fato.origem }))
          }
        >
          <Button type="button" size="sm" variant="outline" data-slot="excluir-bloco">
            Excluir
          </Button>
        </DialogoConfirmacao>
      </div>
    </section>
  );
}

/**
 * *Nova APOINST* e *Editar* — **folha de cliente** (Bloco 18, spec 033, RA-6; FR-004.1), em diálogo (RT-3).
 *
 * > *"APOINST: planejada no módulo Atividades pelo trio, por turma: nome, disciplina, instrutor responsável (designado
 * > da disciplina), período previsto, TA previstos."* — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **A TURMA PELO SELETOR ÚNICO** (`SeletorTurma`, SC-004) e só no módulo: na ficha da turma ela é a da ficha, e na
 *    edição ela não muda (o banco recusa, `apoinst_de_outra_turma`).
 * ⚠️ **O INSTRUTOR PELO SELETOR ÚNICO** (`SeletorInstrutor`, `RN-ANT-01` de Risco Alto), com os DESIGNADOS na disciplina
 *    da turma — os que o gatilho aceita. A disciplina vai por `EscolhaSimples`, que mora em arquivo próprio: este arquivo
 *    cita instrutor e não pode ter `<select` (SC-002, gotcha 12).
 * ⚠️ **A LISTA VAZIA DIZ O MOTIVO** (gotcha 4): disciplina sem designado é «não há»; perfil sem `instrutores.ler` é
 *    «você não vê»; a leitura que falhou é dita como falha, nunca como lista vazia.
 * ⚠️ **O ANO INICIAL NÃO É CONFERIDO AQUI**: quem chama só oferece as turmas do ano inicial em diante, e o banco recusa
 *    o resto (`apoinst_antes_do_ano_inicial`) — a frase vem de `traduzirRecusa`.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { SeletorInstrutor } from "@/components/ciaara/seletor-instrutor";
import { SeletorTurma } from "@/components/ciaara/seletor-turma";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarApoinst, editarApoinst } from "@/lib/acoes/apoinst";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import type { InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";
import {
  MAXIMO_DA_OBSERVACAO_DA_APOINST,
  MAXIMO_DE_TA_DA_APOINST,
  MAXIMO_DO_NOME_DA_APOINST,
} from "@/lib/validacao/apoinst";
import { enderecoDaAbaDaTurmaGravada } from "@/lib/navegacao/endereco-de-turma";

import { EscolhaSimples } from "../turmas/[turma]/dsa/EscolhaSimples";

const CAMPO =
  "border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca w-full border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none";

/** Uma disciplina da turma, com os designados nela (chega pronta do servidor). */
export type DisciplinaDoFormulario = {
  readonly id: string;
  readonly rotulo: string;
  readonly designados: readonly InstrutorParaExibir[];
};

/** O que o formulário precisa saber das turmas — e das disciplinas delas, por id da turma. */
export type OpcoesDoFormularioDeApoinst = {
  readonly disciplinas: Readonly<Record<string, readonly DisciplinaDoFormulario[]>>;
  readonly escala: EscalaDeAntiguidade;
  /** O perfil tem `instrutores.ler`? Sem ele a lista chega vazia pela RLS — «você não vê», não «não há». */
  readonly podeLerInstrutores: boolean;
  /** A leitura das disciplinas e dos designados falhou. */
  readonly erro: string | null;
};

/** A APOINST que se edita: os valores gravados. */
export type ApoinstParaEditar = {
  readonly id: string;
  readonly turmaId: string;
  readonly turmaCodigo: string;
  readonly nome: string;
  readonly disciplinaId: string;
  readonly instrutorId: string | null;
  readonly inicioPrevisto: string;
  readonly fimPrevisto: string;
  readonly taPrevistos: number;
  readonly observacao: string | null;
};

export type GravacaoDaApoinst = "apoinst" | "apoinst-desativada" | "apoinst-reativada";

/** O botão *Nova APOINST* e o diálogo. `turmas` com mais de uma = módulo (escolhe-se a turma); com uma = ficha. */
export function NovaApoinst({
  turmas,
  opcoes,
  naFicha,
}: {
  readonly turmas: ReadonlyArray<{ readonly id: string; readonly codigo: string }>;
  readonly opcoes: OpcoesDoFormularioDeApoinst;
  /** Na ficha: volta à aba com a confirmação na URL (`?gravada=apoinst`). No módulo: a confirmação ao lado do botão. */
  readonly naFicha: boolean;
}) {
  const router = useRouter();
  const [resposta, definirResposta] = React.useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2" data-slot="nova-apoinst">
      {resposta ? (
        <span
          role="status"
          className="text-executado-tinta text-sm"
          data-slot="resposta-da-nova-apoinst"
        >
          {resposta}
        </span>
      ) : null}
      <DialogoDeFormulario
        titulo="Nova APOINST"
        descricao="A APOINST planejada da turma: a execução são os lançamentos do DSA vinculados a ela."
        largo
        slot="dialogo-da-apoinst"
        gatilho={<BotaoDeIcone acao="novo" rotulo="Nova APOINST" data-slot="abrir-nova-apoinst" />}
      >
        {(fechar) => (
          <FormularioDeApoinst
            turmas={turmas}
            opcoes={opcoes}
            editando={null}
            fechar={fechar}
            aoGravar={(codigo) => {
              if (naFicha)
                router.replace(enderecoDaAbaDaTurmaGravada(codigo, "apoinst", "apoinst"));
              else definirResposta(`APOINST cadastrada em ${codigo}.`);
            }}
          />
        )}
      </DialogoDeFormulario>
    </span>
  );
}

/** O ícone *Editar* da linha e o diálogo. */
export function EditarApoinst({
  apoinst,
  opcoes,
  aoGravar,
}: {
  readonly apoinst: ApoinstParaEditar;
  readonly opcoes: OpcoesDoFormularioDeApoinst;
  readonly aoGravar: (turmaCodigo: string, oQue: GravacaoDaApoinst) => void;
}) {
  return (
    <DialogoDeFormulario
      titulo={`Editar ${apoinst.nome}`}
      descricao={`APOINST de ${apoinst.turmaCodigo}. A turma não muda.`}
      largo
      slot="dialogo-da-apoinst"
      gatilho={
        <BotaoDeIcone
          acao="editar"
          rotulo={`Editar ${apoinst.nome}`}
          variante="fantasma"
          data-slot="editar-apoinst"
        />
      }
    >
      {(fechar) => (
        <FormularioDeApoinst
          turmas={[{ id: apoinst.turmaId, codigo: apoinst.turmaCodigo }]}
          opcoes={opcoes}
          editando={apoinst}
          fechar={fechar}
          aoGravar={(codigo) => aoGravar(codigo, "apoinst")}
        />
      )}
    </DialogoDeFormulario>
  );
}

function FormularioDeApoinst({
  turmas,
  opcoes,
  editando,
  fechar,
  aoGravar,
}: {
  readonly turmas: ReadonlyArray<{ readonly id: string; readonly codigo: string }>;
  readonly opcoes: OpcoesDoFormularioDeApoinst;
  readonly editando: ApoinstParaEditar | null;
  readonly fechar: () => void;
  readonly aoGravar: (turmaCodigo: string) => void;
}) {
  const id = React.useId();
  const unica = turmas.length === 1 ? (turmas[0] ?? null) : null;
  const [turmaId, definirTurmaId] = React.useState(editando?.turmaId ?? unica?.id ?? "");
  const [disciplinaId, definirDisciplinaId] = React.useState(editando?.disciplinaId ?? "");
  const [instrutorId, definirInstrutorId] = React.useState(editando?.instrutorId ?? "");
  const [nome, definirNome] = React.useState(editando?.nome ?? "");
  const [inicio, definirInicio] = React.useState(editando?.inicioPrevisto ?? "");
  const [fim, definirFim] = React.useState(editando?.fimPrevisto ?? "");
  const [ta, definirTa] = React.useState(editando ? String(editando.taPrevistos) : "");
  const [observacao, definirObservacao] = React.useState(editando?.observacao ?? "");
  const [recusa, definirRecusa] = React.useState<string | null>(null);
  const [gravando, iniciar] = React.useTransition();

  const disciplinas = opcoes.disciplinas[turmaId] ?? [];
  const designados = disciplinas.find((d) => d.id === disciplinaId)?.designados ?? [];
  const turmaCodigo = turmas.find((t) => t.id === turmaId)?.codigo ?? "";

  function trocarTurma(proxima: string): void {
    definirTurmaId(proxima);
    definirDisciplinaId("");
    definirInstrutorId("");
  }

  function trocarDisciplina(proxima: string): void {
    definirDisciplinaId(proxima);
    /* O responsável tem de ser designado NA disciplina: trocar a disciplina limpa a escolha que não vale mais. */
    const ainda = (opcoes.disciplinas[turmaId] ?? [])
      .find((d) => d.id === proxima)
      ?.designados.some((i) => i.id === instrutorId);
    if (!ainda) definirInstrutorId("");
  }

  function gravar(evento: React.FormEvent): void {
    evento.preventDefault();
    iniciar(async () => {
      definirRecusa(null);
      const campos = {
        nome,
        disciplinaId,
        instrutorId,
        inicioPrevisto: inicio,
        fimPrevisto: fim,
        taPrevistos: ta,
        observacao,
      };
      const resposta = editando
        ? await editarApoinst({ id: editando.id, ...campos })
        : await criarApoinst({ turmaId, ...campos });
      if (!resposta.ok) {
        definirRecusa(resposta.erro);
        return;
      }
      fechar();
      aoGravar(turmaCodigo);
    });
  }

  const vazioDosDesignados = !opcoes.podeLerInstrutores
    ? ({ motivo: "sem-permissao" } as const)
    : ({
        motivo: "sem-dado",
        detalhe:
          opcoes.erro ??
          (disciplinaId === ""
            ? "Escolha a disciplina: o responsável é um instrutor designado nela."
            : "Nenhum instrutor designado nesta disciplina da turma. Designe na ficha da turma, em Disciplinas."),
      } as const);

  return (
    <form onSubmit={gravar} className="flex flex-col gap-3" data-slot="formulario-da-apoinst">
      {opcoes.erro ? (
        <p
          role="alert"
          className="text-conflito-tinta text-sm"
          data-slot="opcoes-da-apoinst-nao-lidas"
        >
          {opcoes.erro}
        </p>
      ) : null}
      {editando === null && unica === null ? (
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-turma`}>Turma</Label>
          <SeletorTurma
            id={`${id}-turma`}
            turmas={turmas.map((t) => ({ id: t.id, rotulo: t.codigo }))}
            valor={turmaId}
            aoMudar={trocarTurma}
            rotulo="Turma"
            className="w-full"
          />
        </div>
      ) : (
        <p className="text-texto-suave text-sm" data-slot="turma-da-apoinst">
          Turma: <span className="text-texto font-medium">{turmaCodigo}</span>
        </p>
      )}
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-nome`}>Nome</Label>
        <Input
          id={`${id}-nome`}
          required
          maxLength={MAXIMO_DO_NOME_DA_APOINST}
          value={nome}
          onChange={(e) => definirNome(e.target.value)}
          data-slot="nome-da-apoinst"
        />
      </div>
      {turmaId === "" ? (
        <p className="text-texto-suave text-sm">Escolha a turma para ver as disciplinas dela.</p>
      ) : disciplinas.length === 0 && opcoes.erro === null ? (
        <p className="text-atrasado-tinta text-sm" data-slot="turma-sem-disciplina">
          A turma não tem disciplina ativa na grade.
        </p>
      ) : (
        <EscolhaSimples
          id={`${id}-disciplina`}
          rotulo="Disciplina da turma"
          obrigatorio
          valor={disciplinaId}
          aoMudar={trocarDisciplina}
          textoVazio="Escolha a disciplina"
          opcoes={disciplinas.map((d) => ({ valor: d.id, rotulo: d.rotulo }))}
        />
      )}
      <div className="flex flex-col gap-1">
        <span className="text-texto text-sm font-medium">
          Instrutor responsável (designado na disciplina)
        </span>
        <SeletorInstrutor
          instrutores={designados}
          escala={opcoes.escala}
          valor={instrutorId}
          aoMudar={definirInstrutorId}
          rotulo="Instrutor responsável pela APOINST"
          vazio={vazioDosDesignados}
          className="w-full"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-inicio`}>Início previsto</Label>
          <Input
            id={`${id}-inicio`}
            type="date"
            required
            value={inicio}
            onChange={(e) => definirInicio(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-fim`}>Fim previsto</Label>
          <Input
            id={`${id}-fim`}
            type="date"
            required
            min={inicio || undefined}
            value={fim}
            onChange={(e) => definirFim(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${id}-ta`}>TA previstos</Label>
          <Input
            id={`${id}-ta`}
            type="number"
            required
            min={1}
            max={MAXIMO_DE_TA_DA_APOINST}
            step={1}
            value={ta}
            onChange={(e) => definirTa(e.target.value)}
            className="w-28"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-observacao`}>Observação (opcional)</Label>
        <textarea
          id={`${id}-observacao`}
          rows={2}
          maxLength={MAXIMO_DA_OBSERVACAO_DA_APOINST}
          value={observacao}
          onChange={(e) => definirObservacao(e.target.value)}
          className={CAMPO}
        />
      </div>
      {recusa ? (
        <p role="alert" className="text-conflito-tinta text-sm" data-slot="recusa-da-apoinst">
          {recusa}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" size="sm" variant="ghost" disabled={gravando} onClick={fechar}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-apoinst">
          {gravando ? "Gravando…" : editando ? "Gravar alterações" : "Cadastrar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

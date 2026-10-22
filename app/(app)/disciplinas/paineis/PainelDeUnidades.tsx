/**
 * As Unidades de Ensino da disciplina (`FR-060` a `FR-063`, D-B3).
 *
 * ⚠️ **DISCIPLINA SEM UE NÃO RENDERIZA A SEÇÃO — NEM AVISA QUE FALTAM** (`FR-061`). Ter UE é **dado**,
 * não dedução: das 175 disciplinas reais, **138 têm** e 37 não. Avisar *"faltam unidades"* nas 37
 * inventaria uma pendência que ninguém tem. Quem decide é `lib/dominio/modelo-do-curriculo.ts`, e
 * quem chama este painel já perguntou.
 *
 * ⚠️ **A SOMA AVISA, NUNCA BLOQUEIA** (`FR-062`, `RN-DEG-02`). Uma UE sozinha nunca fecha a CH da
 * disciplina; recusar a primeira impediria de construir qualquer currículo.
 *
 * ⚠️ **UE INATIVA CONTINUA NA LISTA** (regra 4). Ela sai da soma e some da atribuição por unidade —
 * sumir da tela seria exclusão com outro nome, e ninguém conseguiria reativá-la.
 *
 * ⚠️ **TABELA SÓ DE LEITURA; EDITAR E ACRESCENTAR ABREM UM DIÁLOGO** (spec 022, Bloco 7, FR-002; pedido de Bernardo
 * Villas Boas, 22/10/2026: *"Edição e cadastro SEMPRE em diálogo (formulário curto: UE, avaliação, regime)"*). Até o
 * Bloco 7 a linha abria o formulário no lugar dela (spec 016, FR-007.1). Gravar fecha o diálogo e a resposta aparece
 * abaixo da tabela; a recusa fica no diálogo, com o que foi digitado.
 */
"use client";

import * as React from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { usePedidoDeJustificativa } from "@/components/ciaara/pedido-de-justificativa";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  criarUnidadeEnsino,
  desativarUnidadeEnsino,
  editarUnidadeEnsino,
  reativarUnidadeEnsino,
} from "@/lib/acoes/unidade-ensino";

import type { UnidadeDaLinha } from "../consulta";
import { DialogoDeExclusao } from "./DialogoDeExclusao";

type Resultado = { ok: boolean; erro?: string; pedeJustificativa?: true | undefined };

/** O formulário de uma UE, dentro do diálogo. A recusa fica aqui, com o que foi digitado. */
function FormularioDaUnidade({
  id,
  unidade,
  gravar,
  fechar,
}: {
  readonly id: string;
  readonly unidade?: UnidadeDaLinha;
  /** Devolve a recusa, ou `null` quando gravou. */
  readonly gravar: (dados: FormData) => Promise<string | null>;
  readonly fechar: () => void;
}) {
  const [erro, setErro] = React.useState<string | null>(null);
  const [gravando, setGravando] = React.useState(false);

  async function enviar(dados: FormData) {
    setErro(null);
    setGravando(true);
    const recusa = await gravar(dados);
    setGravando(false);
    if (recusa === null) fechar();
    else setErro(recusa);
  }

  return (
    <form
      action={enviar}
      className="flex flex-col gap-3"
      data-slot={unidade ? "formulario-da-unidade" : "formulario-de-unidade-nova"}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`numero-${id}`}>Número</Label>
          <Input
            id={`numero-${id}`}
            name="numero_ue"
            required
            defaultValue={unidade?.numeroUe ?? ""}
            className="w-20"
          />
        </div>
        <div className="flex min-w-60 flex-1 flex-col gap-1">
          <Label htmlFor={`topico-${id}`}>Tópico</Label>
          <Input id={`topico-${id}`} name="topico" required defaultValue={unidade?.topico ?? ""} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`ch-${id}`}>Tempos</Label>
          <Input
            id={`ch-${id}`}
            name="ch"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={unidade?.chPrevistaTempos ?? ""}
            className="w-24"
          />
        </div>
      </div>
      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm" data-slot="recusa-da-unidade">
          {erro}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={fechar} disabled={gravando}>
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={gravando}
          data-slot={unidade ? "gravar-unidade" : "gravar-unidade-nova"}
        >
          {gravando ? "Gravando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function PainelDeUnidades({
  disciplinaId,
  unidades,
  avisoDaSoma,
  podeEditar,
  podeDesativar,
}: {
  readonly disciplinaId: string;
  readonly unidades: readonly UnidadeDaLinha[];
  readonly avisoDaSoma: string | null;
  readonly podeEditar: boolean;
  readonly podeDesativar: boolean;
}) {
  const [erro, setErro] = React.useState<string | null>(null);
  const [mensagem, setMensagem] = React.useState<string | null>(null);
  const [ocupado, setOcupado] = React.useState(false);

  /* Spec 021 (RC-6): no currículo em uso, a correção pede justificativa — e só o banco sabe quando. */
  const pedido = usePedidoDeJustificativa();

  /** Executa a ação; devolve a recusa (ou `null`). A mensagem de sucesso vai para baixo da tabela. */
  async function executar(
    acao: (j: { justificativa?: string }) => Promise<Resultado>,
    feito: string,
  ): Promise<string | null> {
    setErro(null);
    setMensagem(null);
    setOcupado(true);
    const resultado = await pedido.executar((justificativa) =>
      acao(justificativa ? { justificativa } : {}),
    );
    setOcupado(false);
    if (resultado.ok) {
      setMensagem(feito);
      return null;
    }
    return resultado.erro ?? "Não foi possível concluir.";
  }

  const dadosDaUnidade = (dados: FormData) => ({
    numeroUe: String(dados.get("numero_ue") ?? ""),
    topico: String(dados.get("topico") ?? ""),
    chPrevistaTempos: Number(dados.get("ch") ?? 0),
  });

  const temAcoes = podeEditar || podeDesativar;
  /* ⚠️ **INATIVA USA `--texto-suave`, NÃO `--texto-tenue`, e a guarda do `FR-031` está certa ao
     cobrar.** O que está na linha é VALOR — número, tópico e carga da unidade —, e `--texto-tenue` é
     para rótulo, dica e traço de campo. Quem diz "inativa" é a palavra da coluna Situação. */
  const corDoValor = (ativa: boolean) => (ativa ? "text-texto" : "text-texto-suave");

  return (
    <section aria-labelledby="titulo-das-unidades" className="flex flex-col gap-2">
      {pedido.dialogo}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="titulo-das-unidades" className="text-texto text-sm font-semibold">
          Unidades de ensino
        </h3>
        {/* Spec 022 (FR-001.2): a ação da tabela no topo, à direita. */}
        {podeEditar ? (
          <DialogoDeFormulario
            titulo="Acrescentar unidade de ensino"
            slot="dialogo-da-unidade"
            gatilho={
              <BotaoDeIcone
                acao="acrescentar"
                rotulo="Acrescentar unidade"
                disabled={ocupado}
                data-slot="acrescentar-unidade"
              />
            }
          >
            {(fechar) => (
              <FormularioDaUnidade
                id={`nova-${disciplinaId}`}
                fechar={fechar}
                gravar={(dados) =>
                  executar(
                    (j) => criarUnidadeEnsino({ ...j, disciplinaId, ...dadosDaUnidade(dados) }),
                    "Unidade acrescentada.",
                  )
                }
              />
            )}
          </DialogoDeFormulario>
        ) : null}
      </div>

      {avisoDaSoma !== null ? (
        /* ⚠️ Aviso, não bloqueio — ver o cabeçalho. */
        <p className="text-atrasado-tinta text-xs" data-slot="aviso-da-soma">
          {avisoDaSoma}
        </p>
      ) : null}

      {unidades.length > 0 ? (
        <table
          className="w-full border-collapse text-sm"
          data-slot="tabela-de-unidades"
          aria-labelledby="titulo-das-unidades"
        >
          <thead>
            <tr className="border-borda text-texto-suave border-b text-left text-xs">
              <th scope="col" className="py-1 pr-3 font-medium">
                UE
              </th>
              <th scope="col" className="py-1 pr-3 font-medium">
                Tópico
              </th>
              <th scope="col" className="py-1 pr-3 text-right font-medium">
                Tempos
              </th>
              <th scope="col" className="py-1 pr-3 font-medium">
                Situação
              </th>
              {temAcoes ? (
                <th scope="col" className="py-1 text-right font-medium">
                  <span className="sr-only">Ações</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {unidades.map((u) => (
              <tr key={u.id} className="border-borda border-b" data-unidade={u.numeroUe}>
                <td className={`py-1 pr-3 ${corDoValor(u.ativa)}`}>{u.numeroUe}</td>
                <td className={`py-1 pr-3 ${corDoValor(u.ativa)}`}>{u.topico}</td>
                <td className={`py-1 pr-3 text-right tabular-nums ${corDoValor(u.ativa)}`}>
                  {u.chPrevistaTempos}
                </td>
                <td className="text-texto-suave py-1 pr-3">{u.ativa ? "Ativa" : "Inativa"}</td>
                {temAcoes ? (
                  <td className="py-1">
                    {/* Spec 022 (FR-001.2): as ações da linha na última coluna, à direita. */}
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {podeEditar ? (
                        <DialogoDeFormulario
                          titulo={`Editar a unidade ${u.numeroUe}`}
                          slot="dialogo-da-unidade"
                          gatilho={
                            <BotaoDeIcone
                              acao="editar"
                              rotulo={`Editar a unidade ${u.numeroUe}`}
                              disabled={ocupado}
                              data-slot="editar-unidade"
                            />
                          }
                        >
                          {(fechar) => (
                            <FormularioDaUnidade
                              id={u.id}
                              unidade={u}
                              fechar={fechar}
                              gravar={(dados) =>
                                executar(
                                  (j) =>
                                    editarUnidadeEnsino({
                                      ...j,
                                      unidadeId: u.id,
                                      ...dadosDaUnidade(dados),
                                    }),
                                  "Unidade atualizada.",
                                )
                              }
                            />
                          )}
                        </DialogoDeFormulario>
                      ) : null}
                      {podeDesativar ? (
                        <>
                          <BotaoDeIcone
                            acao={u.ativa ? "desativar" : "reativar"}
                            rotulo={`${u.ativa ? "Desativar" : "Reativar"} a unidade ${u.numeroUe}`}
                            variante="fantasma"
                            disabled={ocupado}
                            data-slot="alternar-situacao-da-unidade"
                            onClick={() =>
                              void executar(
                                (j) =>
                                  u.ativa
                                    ? desativarUnidadeEnsino({ ...j, unidadeId: u.id })
                                    : reativarUnidadeEnsino({ ...j, unidadeId: u.id }),
                                u.ativa ? "Unidade desativada." : "Unidade reativada.",
                              ).then((recusa) => setErro(recusa))
                            }
                          />
                          <DialogoDeExclusao
                            tipo="unidade_de_ensino"
                            nome={`${u.numeroUe} — ${u.topico}`}
                            codigo={u.codigo}
                            identificador={u.id}
                          />
                        </>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {mensagem ? (
        <p role="status" className="text-texto-suave text-sm" data-slot="resposta-das-unidades">
          {mensagem}
        </p>
      ) : null}
      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm">
          {erro}
        </p>
      ) : null}
    </section>
  );
}

/**
 * A aba Calendário — a lista do ano, as ações por linha e as do topo (spec 023, Bloco 8: FR-006 a FR-014).
 *
 * ⚠️ **AS AÇÕES CHEGAM POR PROPRIEDADE** (Princípio XI) e **AS PERMISSÕES TAMBÉM** (`podeCriar`, `podeEditar`): sem
 *    a permissão, o botão não é desenhado — e o banco recusaria de qualquer forma.
 * ⚠️ **A RESPOSTA DE TODA AÇÃO FICA ACIMA DA LISTA** (FR-014): a linha que muda de situação não leva a mensagem com
 *    ela (a lição do `AvisoDaLista`, spec 011).
 * ⚠️ **DESATIVAR, REATIVAR E DESFAZER PEDEM CONFIRMAÇÃO; NADA É APAGADO** (regra 4). O reativar de dia inteiro diz
 *    quantos lançamentos já há no dia (D-11).
 * ⚠️ **"INATIVAR" VIROU "DESATIVAR"** (RT-2 do Bloco 10, spec 025, D-17): o verbo é o do resto do sistema; a situação
 *    gravada continua `inativo`, e a coluna diz *Inativo*.
 * ⚠️ **O EXCLUIR DA LINHA** (RT-2 e D-COR-6; D-11 da spec 025): só habilitado quando nenhuma turma alcançada tem semana
 *    do DSA salva ou publicada que contenha a data; com registro, desabilitado com a dica *"tem registros: use
 *    Desativar"*. Quem decide é o banco, na leitura e de novo na exclusão. A parada de parte do dia não tem *Excluir*:
 *    ela se desfaz (D-14).
 */
"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { ExclusaoPermanente } from "@/components/ciaara/exclusao-permanente";
import { DICA_SEM_LEITURA, type EstadoDaExclusao } from "@/lib/dominio/exclusao-permanente";
import { dataParaLeitura } from "@/lib/formato/data";

import type { DadosDoCalendario, LinhaDoCalendario } from "./calendario";
import { DialogoDaLinha, ROTULO_DO_IMPACTO } from "./DialogoDaLinha";
import { PararDiaDoCalendario } from "./PararDiaDoCalendario";

type RespostaDoCalendario =
  { readonly ok: true; readonly mensagem: string } | { readonly ok: false; readonly erro: string };
type RespostaSimples =
  | { readonly ok: true }
  | { readonly ok: false; readonly erro: string; readonly lancamentosNoDia?: number };

function consequenciaDeReativar(l: LinhaDoCalendario): string {
  const base =
    l.impacto === "dia_inteiro"
      ? l.turmas.length > 0
        ? "O dia volta a recusar aula nova nas turmas escolhidas."
        : "O dia volta a recusar aula nova em todas as turmas."
      : "A linha volta a valer no calendário.";
  return l.impacto === "dia_inteiro" && l.lancamentosNoDia > 0
    ? `${base} Há ${l.lancamentosNoDia} lançamento${l.lancamentosNoDia === 1 ? "" : "s"} neste dia; ele${l.lancamentosNoDia === 1 ? " fica" : "s ficam"}.`
    : base;
}

function consequenciaDeDesativar(l: LinhaDoCalendario): string {
  return l.impacto === "dia_inteiro"
    ? l.turmas.length > 0
      ? "Isso libera o dia nas turmas escolhidas. A linha fica desativada — nada é apagado."
      : "Isso libera o dia em todas as turmas. A linha fica desativada — nada é apagado."
    : "A linha deixa de valer no calendário. Ela fica desativada — nada é apagado.";
}

const SEM_LEITURA: EstadoDaExclusao = { liberada: false, dica: DICA_SEM_LEITURA, detalhe: null };

export function PainelDoCalendario({
  ano,
  dados,
  podeCriar,
  podeEditar,
  gravar,
  mudarSituacao,
  pararDia,
  desfazerParada,
  podeExcluir = false,
  exclusao = {},
  excluir,
}: {
  readonly ano: number;
  readonly dados: DadosDoCalendario;
  readonly podeCriar: boolean;
  readonly podeEditar: boolean;
  readonly gravar: (entrada: unknown) => Promise<RespostaDoCalendario>;
  readonly mudarSituacao: (entrada: unknown) => Promise<RespostaDoCalendario>;
  readonly pararDia: (entrada: unknown) => Promise<RespostaSimples>;
  readonly desfazerParada: (entrada: unknown) => Promise<RespostaSimples>;
  /** `calendario.criar` — quem exclui (D-9). */
  readonly podeExcluir?: boolean;
  /** O estado do *Excluir* de cada linha, pelo `id`; ausente = não lido (desabilitado). */
  readonly exclusao?: Readonly<Record<string, EstadoDaExclusao>>;
  readonly excluir?: (entrada: unknown) => Promise<RespostaDoCalendario>;
}) {
  const router = useRouter();
  const [resposta, setResposta] = React.useState<{ texto: string; falha: boolean } | null>(null);
  const [gravando, iniciar] = React.useTransition();

  const ativasPorData = React.useMemo(() => {
    const conta: Record<string, number> = {};
    for (const l of dados.linhas) {
      if (l.origem === "feriado" && l.situacao === "ativo" && l.impacto === "dia_inteiro") {
        conta[l.data] = (conta[l.data] ?? 0) + 1;
      }
    }
    return conta;
  }, [dados.linhas]);

  const responder = (texto: string, falha = false) => setResposta({ texto, falha });

  const situacao = (l: LinhaDoCalendario, nova: "ativo" | "inativo") =>
    iniciar(async () => {
      const r = await mudarSituacao({ id: l.id, situacao: nova });
      responder(r.ok ? r.mensagem : r.erro, !r.ok);
      if (r.ok) router.refresh();
    });

  const desfazer = (l: LinhaDoCalendario) =>
    iniciar(async () => {
      const r = await desfazerParada({ turmaId: null, destino: "dia_parado", codigo: l.codigo });
      responder(r.ok ? "Parada desfeita: os tempos estão liberados." : r.erro, !r.ok);
      if (r.ok) router.refresh();
    });

  return (
    <section className="flex flex-col gap-3" data-slot="calendario">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {podeCriar ? (
          <>
            <DialogoDaLinha
              ano={ano}
              tipos={dados.tipos}
              turmas={dados.turmas}
              ativasPorData={ativasPorData}
              gravar={gravar}
              aoGravar={(m) => responder(m)}
            />
            <PararDiaDoCalendario
              ano={ano}
              tipos={dados.tipos}
              pararDia={pararDia}
              aoGravar={(m) => responder(m)}
            />
          </>
        ) : null}
      </div>

      {resposta ? (
        <p
          role={resposta.falha ? "alert" : "status"}
          className={resposta.falha ? "text-conflito-tinta text-sm" : "text-texto text-sm"}
          data-slot="resposta-do-calendario"
        >
          {resposta.texto}
        </p>
      ) : null}
      {dados.erro ? (
        <p role="alert" className="text-conflito-tinta text-sm">
          {dados.erro}
        </p>
      ) : null}

      {dados.linhas.length === 0 ? (
        <EstadoVazio
          motivo="sem-dado"
          titulo={`Nada no calendário de ${ano}`}
          detalhe="Cadastre os feriados e as licenças do ano pelo botão acima."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="text-texto w-full text-sm" data-slot="tabela-do-calendario">
            <thead className="text-texto-suave text-left text-xs">
              <tr className="border-borda border-b">
                <th className="py-1 pr-3 font-medium">Data</th>
                <th className="py-1 pr-3 font-medium">Nome</th>
                <th className="py-1 pr-3 font-medium">Tipo</th>
                <th className="py-1 pr-3 font-medium">Abrangência</th>
                <th className="py-1 pr-3 font-medium">Impacto</th>
                <th className="py-1 pr-3 font-medium">Situação</th>
                <th className="py-1 font-medium">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {dados.linhas.map((l) => (
                <tr
                  key={`${l.origem}-${l.codigo}`}
                  className={
                    l.situacao === "ativo"
                      ? "border-borda border-b"
                      : "border-borda text-texto-suave border-b"
                  }
                  data-linha={l.codigo}
                  data-situacao={l.situacao}
                >
                  <td className="py-1 pr-3 tabular-nums">{dataParaLeitura(l.data)}</td>
                  <td className="py-1 pr-3">{l.nome}</td>
                  <td className="py-1 pr-3">{l.tipoRotulo}</td>
                  <td className="py-1 pr-3">{l.abrangencia}</td>
                  <td className="py-1 pr-3">
                    {l.origem === "parada" && l.tempos
                      ? `Parada de parte do dia (tempos ${l.tempos.inicio} a ${l.tempos.fim})`
                      : ROTULO_DO_IMPACTO[l.impacto]}
                  </td>
                  <td className="py-1 pr-3">{l.situacao === "ativo" ? "Ativo" : "Inativo"}</td>
                  <td className="py-1">
                    {podeEditar || podeExcluir ? (
                      <span className="flex justify-end gap-1">
                        {l.origem === "feriado" && podeEditar ? (
                          <>
                            <DialogoDaLinha
                              linha={l}
                              ano={ano}
                              tipos={dados.tipos}
                              turmas={dados.turmas}
                              ativasPorData={ativasPorData}
                              gravar={gravar}
                              aoGravar={(m) => responder(m)}
                            />
                            {l.situacao === "ativo" ? (
                              <DialogoConfirmacao
                                titulo={`Desativar «${l.nome}» (${dataParaLeitura(l.data)})?`}
                                consequencia={consequenciaDeDesativar(l)}
                                rotuloConfirmar="Desativar"
                                aoConfirmar={() => situacao(l, "inativo")}
                              >
                                <BotaoDeIcone
                                  acao="desativar"
                                  rotulo={`Desativar ${l.nome}`}
                                  variante="fantasma"
                                  className="size-7"
                                  disabled={gravando}
                                  data-slot="desativar-linha"
                                />
                              </DialogoConfirmacao>
                            ) : (
                              <DialogoConfirmacao
                                titulo={`Reativar «${l.nome}» (${dataParaLeitura(l.data)})?`}
                                consequencia={consequenciaDeReativar(l)}
                                rotuloConfirmar="Reativar"
                                aoConfirmar={() => situacao(l, "ativo")}
                              >
                                <BotaoDeIcone
                                  acao="reativar"
                                  rotulo={`Reativar ${l.nome}`}
                                  variante="fantasma"
                                  className="size-7"
                                  disabled={gravando}
                                  data-slot="reativar-linha"
                                />
                              </DialogoConfirmacao>
                            )}
                          </>
                        ) : l.origem === "feriado" ? null : !podeEditar ? null : (
                          <DialogoConfirmacao
                            titulo={`Desfazer a parada de ${dataParaLeitura(l.data)}?`}
                            consequencia="Isso libera esses tempos em todas as turmas. A parada fica inativa — nada é apagado."
                            rotuloConfirmar="Desfazer"
                            aoConfirmar={() => desfazer(l)}
                          >
                            <BotaoDeIcone
                              acao="desfazer"
                              rotulo={`Desfazer a parada de ${dataParaLeitura(l.data)}`}
                              variante="fantasma"
                              className="size-7"
                              disabled={gravando}
                              data-slot="desfazer-parada-global"
                            />
                          </DialogoConfirmacao>
                        )}
                        {l.origem === "feriado" && podeExcluir && excluir ? (
                          <ExclusaoPermanente
                            id={l.id}
                            codigo={l.codigo}
                            nomeDoCodigo="o código da linha"
                            rotulo={`Excluir ${l.nome} (${dataParaLeitura(l.data)})`}
                            titulo={`Excluir «${l.nome}» (${dataParaLeitura(l.data)}) permanentemente?`}
                            consequencia="A linha sai do calendário, e o dia deixa de valer como feriado ou licença. Só é possível porque nenhuma semana do DSA salva ou publicada contém a data."
                            estado={exclusao[l.id] ?? SEM_LEITURA}
                            excluir={excluir}
                            naLinha
                            aoRecusar={(e) => responder(e, true)}
                            aoConcluir={() => responder("Linha excluída do calendário.")}
                            slot="excluir-linha"
                          />
                        ) : null}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

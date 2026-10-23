/**
 * A publicação da semana do DSA — folha de cliente (spec 024, Bloco 9: FR-006 a FR-016; RP-0 a RP-4).
 *
 * ⚠️ **AS AÇÕES E A SITUAÇÃO CHEGAM POR PROPRIEDADE** (Princípio XI): a situação é derivada no servidor
 *    (`situacaoDaSemana`); aqui só se escolhe o que mostrar e se chama a ação.
 * ⚠️ **A RESPOSTA FICA ACIMA DOS BOTÕES**, não dentro de um que vai sumir (a lição do `AvisoDaLista`, spec 011).
 * ⚠️ **DESCARTAR E PUBLICAR PEDEM CONFIRMAÇÃO**; a alteração pede JUSTIFICATIVA (RP-1), num diálogo.
 * ⚠️ **O PAPEL DO HISTÓRICO É O RETRATO**: «Reimprimir» leva à impressão com `?versao=N` (RP-3), idêntica.
 */
"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { BadgeStatus } from "@/components/ciaara/badge-status";
import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { instanteComHoraParaLeitura } from "@/lib/formato/data";
import { ROTULO_DA_SITUACAO, type SituacaoDaSemana } from "@/lib/dominio/dsa/publicacao";

type Resposta =
  { readonly ok: true; readonly mensagem: string } | { readonly ok: false; readonly erro: string };
type Acao = (entrada: unknown) => Promise<Resposta>;

const TOM_DA_SITUACAO = {
  em_preenchimento: "planejado",
  registrado: "executado",
  publicado: "conformidade",
  alteracao_em_andamento: "atrasado",
} as const;

export function PainelDaPublicacao({
  turmaId,
  ano,
  semana,
  situacao,
  enderecosDeReimpressao,
  podeOperar,
  salvar,
  descartar,
  fazerAlteracao,
  publicar,
}: {
  readonly turmaId: string;
  readonly ano: number;
  readonly semana: number;
  readonly situacao: SituacaoDaSemana;
  /** O endereço da impressão de cada versão publicada, pelo número. */
  readonly enderecosDeReimpressao: Readonly<Record<number, string>>;
  /** RP-5: quem lança o DSA da turma salva, publica e altera. */
  readonly podeOperar: boolean;
  readonly salvar: Acao;
  readonly descartar: Acao;
  readonly fazerAlteracao: Acao;
  readonly publicar: Acao;
}) {
  const router = useRouter();
  const [resposta, setResposta] = React.useState<{ texto: string; falha: boolean } | null>(null);
  const [justificativa, setJustificativa] = React.useState("");
  const [recusa, setRecusa] = React.useState<string | null>(null);
  const [aberto, setAberto] = React.useState(false);
  const [ocupado, iniciar] = React.useTransition();
  const semanaDoDsa = { turmaId, ano, semana };

  const executar = (acao: Acao, entrada: unknown = semanaDoDsa) =>
    iniciar(async () => {
      const r = await acao(entrada);
      setResposta({ texto: r.ok ? r.mensagem : r.erro, falha: !r.ok });
      if (r.ok) router.refresh();
    });

  const versao = situacao.versaoVigente;
  const rotulo =
    situacao.situacao === "publicado" && versao !== null
      ? `${ROTULO_DA_SITUACAO.publicado} — ${versao === 0 ? "original" : `ALT ${versao}`}`
      : ROTULO_DA_SITUACAO[situacao.situacao];

  return (
    <section
      className="rounded-ciaara border-borda bg-superficie flex flex-col gap-2 border p-3"
      data-slot="publicacao-do-dsa"
      data-situacao={situacao.situacao}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-texto-suave text-sm">Situação da semana:</span>
        <BadgeStatus tom={TOM_DA_SITUACAO[situacao.situacao]} rotulo={rotulo} />
        {situacao.rascunhos > 0 ? (
          <span className="text-atrasado-tinta text-sm font-medium" data-slot="nao-salvos">
            {situacao.rascunhos} lançamento{situacao.rascunhos === 1 ? "" : "s"} não salvo
            {situacao.rascunhos === 1 ? "" : "s"}
          </span>
        ) : null}
        {podeOperar ? (
          <span className="ml-auto flex flex-wrap items-center gap-1">
            {situacao.podeSalvar ? (
              <BotaoDeIcone
                acao="salvar"
                rotulo="Salvar a semana"
                variante="padrao"
                ocupado={ocupado}
                onClick={() => executar(salvar)}
                data-slot="salvar-semana"
              />
            ) : null}
            {situacao.podeDescartar ? (
              <DialogoConfirmacao
                titulo="Descartar o rascunho da semana?"
                consequencia={`As ${situacao.rascunhos} mudança(s) não salvas serão desfeitas — o que estava salvo continua como estava. Nada é apagado.`}
                rotuloConfirmar="Descartar"
                aoConfirmar={() => executar(descartar)}
              >
                <BotaoDeIcone
                  acao="descartar"
                  rotulo="Descartar rascunho"
                  disabled={ocupado}
                  data-slot="descartar-rascunho"
                />
              </DialogoConfirmacao>
            ) : null}
            {situacao.podePublicar ? (
              <DialogoConfirmacao
                titulo="Publicar a semana?"
                consequencia="A versão original fica registrada com o retrato do papel, e a semana fica travada. Depois, toda mudança é uma alteração numerada, com justificativa."
                rotuloConfirmar="Publicar"
                aoConfirmar={() => executar(publicar)}
              >
                <BotaoDeIcone
                  acao="registrar"
                  rotulo="Publicar"
                  variante="padrao"
                  disabled={ocupado}
                  data-slot="publicar-semana"
                />
              </DialogoConfirmacao>
            ) : null}
            {situacao.podeFazerAlteracao ? (
              <BotaoDeIcone
                acao="editar"
                rotulo="Fazer alteração"
                ocupado={ocupado}
                onClick={() => executar(fazerAlteracao)}
                data-slot="fazer-alteracao"
              />
            ) : null}
            {situacao.podePublicarAlteracao ? (
              <DialogoDeFormulario
                titulo="Publicar alteração"
                slot="formulario-da-alteracao"
                aberto={aberto}
                aoMudar={(v) => {
                  setAberto(v);
                  if (!v) setRecusa(null);
                }}
                gatilho={
                  <BotaoDeIcone
                    acao="registrar"
                    rotulo="Publicar alteração"
                    variante="padrao"
                    data-slot="publicar-alteracao"
                  />
                }
              >
                {() => (
                  <form
                    className="flex flex-col gap-2 text-sm"
                    onSubmit={(e) => {
                      e.preventDefault();
                      iniciar(async () => {
                        setRecusa(null);
                        const r = await publicar({ ...semanaDoDsa, justificativa });
                        if (!r.ok) {
                          setRecusa(r.erro);
                          return;
                        }
                        setAberto(false);
                        setJustificativa("");
                        setResposta({ texto: r.mensagem, falha: false });
                        router.refresh();
                      });
                    }}
                  >
                    <label className="flex flex-col gap-1">
                      <span className="text-texto-suave text-xs">
                        Justificativa (obrigatória, ao menos 10 caracteres)
                      </span>
                      <textarea
                        id="justificativa-da-alteracao"
                        value={justificativa}
                        onChange={(e) => setJustificativa(e.target.value)}
                        rows={3}
                        className="border-borda-forte bg-superficie rounded-ciaara border px-2 py-1"
                      />
                    </label>
                    <p className="text-texto-suave text-xs">
                      Salva o que mudou e publica a próxima alteração (ALT {(versao ?? 0) + 1}); a
                      semana volta a travar.
                    </p>
                    {recusa ? (
                      <p role="alert" className="text-conflito-tinta text-sm">
                        {recusa}
                      </p>
                    ) : null}
                    <DialogFooter>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setAberto(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={ocupado}
                        data-slot="gravar-alteracao"
                      >
                        {ocupado ? "Publicando…" : "Publicar alteração"}
                      </Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogoDeFormulario>
            ) : null}
          </span>
        ) : null}
      </div>

      {situacao.alteradoDesdeAPublicacao ? (
        <p
          role="alert"
          className="text-atrasado-tinta text-sm font-medium"
          data-slot="alterado-desde-a-publicacao"
        >
          Alterado desde a publicação: o papel de hoje não é mais o publicado (calendário, parada ou
          sincronização). Faça uma alteração para republicar.
        </p>
      ) : null}
      {situacao.travada ? (
        <p className="text-texto-suave text-xs">
          Semana publicada: para lançar, editar ou excluir, use «Fazer alteração».
        </p>
      ) : situacao.rascunhos > 0 ? (
        <p className="text-texto-suave text-xs">
          O que não foi salvo fica guardado, mas não conta em nada (CH, andamento, papel) até
          «Salvar».
        </p>
      ) : null}
      {resposta ? (
        <p
          role={resposta.falha ? "alert" : "status"}
          className={resposta.falha ? "text-conflito-tinta text-sm" : "text-texto text-sm"}
          data-slot="resposta-da-publicacao"
        >
          {resposta.texto}
        </p>
      ) : null}

      {situacao.historico.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="text-texto w-full text-sm" data-slot="historico-da-publicacao">
            <thead className="text-texto-suave text-left text-xs">
              <tr className="border-borda border-b">
                <th className="py-1 pr-3 font-medium">Versão</th>
                <th className="py-1 pr-3 font-medium">Publicada em</th>
                <th className="py-1 pr-3 font-medium">Por</th>
                <th className="py-1 pr-3 font-medium">Justificativa</th>
                <th className="py-1 font-medium">
                  <span className="sr-only">Reimprimir</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {situacao.historico.map((h) => (
                <tr key={h.numero} className="border-borda border-b" data-versao={h.numero}>
                  <td className="py-1 pr-3">{h.numero === 0 ? "Original" : `ALT ${h.numero}`}</td>
                  <td className="py-1 pr-3 tabular-nums">
                    {instanteComHoraParaLeitura(h.ocorridoEm)}
                  </td>
                  <td className="py-1 pr-3">{h.autor ?? "—"}</td>
                  <td className="py-1 pr-3">{h.justificativa ?? "—"}</td>
                  <td className="py-1">
                    {enderecosDeReimpressao[h.numero] !== undefined ? (
                      <BotaoDeIcone
                        acao="imprimir"
                        rotulo={`Reimprimir ${h.numero === 0 ? "a original" : `a ALT ${h.numero}`}`}
                        variante="fantasma"
                        className="size-7"
                        href={enderecosDeReimpressao[h.numero] ?? ""}
                        data-slot="reimprimir-versao"
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

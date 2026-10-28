/**
 * A barra de ações do DSA, no cabeçalho — folha de cliente (Bloco 11, spec 026: RD-3, RD-4, RD-6; e a publicação da
 * spec 024: RP-0 a RP-4).
 *
 * > *"barra de ações do DSA no topo direito, sem card separado e sem o texto 'A4 paisagem com assinaturas': Regime
 * > (relógio) · Limpar · Planilha de contingência · Gerar prévia (impressora) · Salvar minuta (renomear 'Salvar a
 * > semana') · Publicar (ícone Stamp) · Fazer alteração · Descartar rascunho; padrões RT-1 e RT-2."* — Bernardo Villas
 * > Boas, 26/10/2026 (`docs/correcoes/regras-do-dsa-lancamento.md`, RD-6)
 *
 * ⚠️ **AS AÇÕES E A SITUAÇÃO CHEGAM POR PROPRIEDADE** (Princípio XI): a situação é derivada no servidor
 *    (`situacaoDaSemana`); aqui só se escolhe o que mostrar e se chama a ação. A planilha e a prévia chegam desenhadas
 *    (a prévia lê as assinaturas editadas pelo contexto da página).
 * ⚠️ **A RESPOSTA FICA LOGO ABAIXO DA BARRA, EM LARGURA TOTAL** — a folha devolve dois itens para o cabeçalho, que é
 *    flexível com quebra; a resposta nunca mora dentro de um botão que vai sumir (a lição do `AvisoDaLista`).
 * ⚠️ **NA ORDEM DO PEDIDO, O DESTRUTIVO POR ÚLTIMO** (RT-1): *Descartar rascunho* fecha a barra.
 * ⚠️ **SALVAR ALTERAÇÃO** (RP-9, spec 029 `FR-003`): na semana em alteração, logo ANTES de *Publicar alteração* —
 *    sempre que a semana estiver em alteração, mesmo sem rascunho (D-23). O *Salvar minuta* continua fora da alteração.
 *    ⚠️ A dica é só o verbo, «Salvar» (RT-1); o nome acessível é o rótulo inteiro.
 * ⚠️ **O RELÓGIO NÃO MUDA SEMANA SALVA** (RD-3, D-11): o botão fica indisponível, com o motivo na dica — e o banco
 *    recusa do mesmo jeito (`semana_do_dsa_salva`).
 */
"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { BarraDeAcoes } from "@/components/ciaara/barra-de-acoes";
import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import type { SituacaoDaSemana } from "@/lib/dominio/dsa/publicacao";
import type { FonteDoRegime } from "@/lib/dominio/dsa/regime-da-semana";

type Resposta =
  { readonly ok: true; readonly mensagem: string } | { readonly ok: false; readonly erro: string };
type Acao = (entrada: unknown) => Promise<Resposta>;
type RespostaDoLimpar =
  | { readonly ok: true; readonly excluidos: number }
  | { readonly ok: false; readonly mensagem: string };

export type RegimeOferecido = {
  /** Nulo = o regime do curso. */
  readonly id: string | null;
  readonly nome: string;
  readonly tempos: number | null;
};

const ORIGEM_DO_REGIME: Readonly<Record<FonteDoRegime, string>> = {
  semana: "gravado com a semana",
  so_esta_semana: "escolhido só para esta semana",
  desde: "o padrão da turma desde uma semana anterior",
  turma: "o de «Editar turma»",
  curso: "o vigente do curso",
};

const comTempos = (r: { readonly nome: string; readonly tempos: number | null }) =>
  r.tempos === null ? r.nome : `${r.nome} (${r.tempos} tempos)`;

export function BarraDoDsa({
  turmaId,
  ano,
  semana,
  situacao,
  podeOperar,
  podeLancar,
  regime,
  regimesOferecidos,
  semanaSalva,
  planilha,
  previa,
  salvar,
  salvarAlteracao,
  descartar,
  fazerAlteracao,
  publicar,
  limpar,
  definirRegime,
}: {
  readonly turmaId: string;
  readonly ano: number;
  readonly semana: number;
  readonly situacao: SituacaoDaSemana;
  /** RP-5: quem lança o DSA da turma salva, publica e altera. */
  readonly podeOperar: boolean;
  /** Pode lançar nesta semana agora (não arquivada, não travada): o relógio e o Limpar. */
  readonly podeLancar: boolean;
  readonly regime: {
    readonly fonte: FonteDoRegime;
    readonly regimeId: string | null;
    readonly nome: string;
    readonly tempos: number | null;
  };
  readonly regimesOferecidos: readonly RegimeOferecido[];
  /** D-11: a semana tem evento que salva ou lançamento salvo — o regime dela não muda mais. */
  readonly semanaSalva: boolean;
  /** O botão da planilha de contingência, já desenhado (ou nada, sem permissão). */
  readonly planilha: React.ReactNode;
  /** O botão da prévia/impressão, já desenhado. */
  readonly previa: React.ReactNode;
  readonly salvar: Acao;
  /** RP-9 (spec 029): o *Salvar alteração* — a mesma RPC do Salvar, com a resposta da alteração. */
  readonly salvarAlteracao: Acao;
  readonly descartar: Acao;
  readonly fazerAlteracao: Acao;
  readonly publicar: Acao;
  readonly limpar: (entrada: unknown) => Promise<RespostaDoLimpar>;
  readonly definirRegime: Acao;
}) {
  const router = useRouter();
  const [resposta, setResposta] = React.useState<{ texto: string; falha: boolean } | null>(null);
  const [justificativa, setJustificativa] = React.useState("");
  const [recusa, setRecusa] = React.useState<string | null>(null);
  const [alteracaoAberta, setAlteracaoAberta] = React.useState(false);
  const [regimeAberto, setRegimeAberto] = React.useState(false);
  const [escolhido, setEscolhido] = React.useState<string>(regime.regimeId ?? "");
  const [ocupado, iniciar] = React.useTransition();
  const semanaDoDsa = { turmaId, ano, semana };
  const versao = situacao.versaoVigente;
  /*
   * RD-4 com a RP-9 (spec 029): o salvo que o *Limpar* exclui sai de vez no botão que salva AQUI — na alteração, o
   * *Salvar alteração* (ou o *Publicar alteração*, que salva antes de publicar); fora dela, o *Salvar minuta*.
   */
  const emAlteracao = situacao.podeSalvarAlteracao;
  const noSalvar = emAlteracao
    ? "no «Salvar alteração» (ou no «Publicar alteração»)"
    : "no «Salvar minuta»";
  const ateOSalvar = emAlteracao
    ? "até o «Salvar alteração» (ou o «Publicar alteração»)"
    : "até o «Salvar minuta»";

  const executar = (acao: Acao, entrada: unknown = semanaDoDsa) =>
    iniciar(async () => {
      const r = await acao(entrada);
      setResposta({ texto: r.ok ? r.mensagem : r.erro, falha: !r.ok });
      if (r.ok) router.refresh();
    });

  const trocarRegime = (alcance: "so_esta_semana" | "desde") =>
    iniciar(async () => {
      setRecusa(null);
      const r = await definirRegime({
        ...semanaDoDsa,
        regimeId: escolhido === "" ? null : escolhido,
        alcance,
      });
      if (!r.ok) {
        setRecusa(r.erro);
        return;
      }
      setRegimeAberto(false);
      setResposta({ texto: r.mensagem, falha: false });
      router.refresh();
    });

  return (
    <>
      <BarraDeAcoes rotulo="Ações do DSA" className="ml-auto">
        {/* 1. Regime de tempos (RD-3). */}
        {podeLancar ? (
          semanaSalva ? (
            <BotaoDeIcone
              acao="regime"
              rotulo={`Regime de tempos: ${comTempos(regime)}`}
              indisponivel="semana salva: o regime de tempos não muda"
              data-slot="regime-da-semana"
            />
          ) : (
            <DialogoDeFormulario
              titulo="Regime de tempos"
              descricao={`Esta semana: ${comTempos(regime)} — ${ORIGEM_DO_REGIME[regime.fonte]}.`}
              slot="dialogo-do-regime"
              aberto={regimeAberto}
              aoMudar={(v) => {
                setRegimeAberto(v);
                if (!v) setRecusa(null);
                if (v) setEscolhido(regime.regimeId ?? "");
              }}
              gatilho={
                <BotaoDeIcone
                  acao="regime"
                  rotulo={`Regime de tempos: ${comTempos(regime)}`}
                  data-slot="regime-da-semana"
                />
              }
            >
              {() => (
                <form className="flex flex-col gap-3 text-sm" onSubmit={(e) => e.preventDefault()}>
                  <fieldset className="flex flex-col gap-1">
                    <legend className="text-texto-suave mb-1 text-xs">Regime</legend>
                    {regimesOferecidos.map((r) => (
                      <label key={r.id ?? "curso"} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="regime-da-semana"
                          value={r.id ?? ""}
                          checked={escolhido === (r.id ?? "")}
                          onChange={() => setEscolhido(r.id ?? "")}
                          data-slot="opcao-de-regime"
                        />
                        {comTempos(r)}
                      </label>
                    ))}
                  </fieldset>
                  <p className="text-texto-suave text-xs">
                    «Desta semana em diante» vira o padrão da turma no DSA dali para a frente; as
                    semanas já salvas continuam com o regime que tinham.
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
                      onClick={() => setRegimeAberto(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={ocupado}
                      onClick={() => trocarRegime("so_esta_semana")}
                      data-slot="regime-so-esta-semana"
                    >
                      Só esta semana
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={ocupado}
                      onClick={() => trocarRegime("desde")}
                      data-slot="regime-desde"
                    >
                      Desta semana em diante
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogoDeFormulario>
          )
        ) : null}

        {/* 2. Limpar semana (RD-4). */}
        {podeLancar ? (
          <DialogoConfirmacao
            titulo="Limpar a semana?"
            consequencia={`Todos os lançamentos desta turma na semana saem da grade, pela mesma exclusão do cartão. O que estava salvo só sai de vez ${noSalvar}, e «Descartar rascunho» desfaz. A atividade de todas as turmas e as paradas do Calendário ficam.`}
            rotuloConfirmar="Limpar a semana"
            aoConfirmar={() =>
              iniciar(async () => {
                const r = await limpar(semanaDoDsa);
                setResposta(
                  r.ok
                    ? {
                        texto:
                          r.excluidos === 0
                            ? "Não havia lançamento da turma nesta semana."
                            : `Semana limpa: ${r.excluidos} lançamento${r.excluidos === 1 ? "" : "s"} fora da grade, ${ateOSalvar}.`,
                        falha: false,
                      }
                    : { texto: r.mensagem, falha: true },
                );
                if (r.ok) router.refresh();
              })
            }
          >
            <BotaoDeIcone
              acao="limpar"
              rotulo="Limpar semana"
              disabled={ocupado}
              data-slot="limpar-semana"
            />
          </DialogoConfirmacao>
        ) : null}

        {/* 3. Planilha de contingência; 4. Gerar prévia / Imprimir. */}
        {planilha}
        {previa}

        {podeOperar ? (
          <>
            {/* 5. Salvar minuta (RP-0). */}
            {situacao.podeSalvar ? (
              <BotaoDeIcone
                acao="salvar"
                rotulo="Salvar minuta"
                variante="padrao"
                ocupado={ocupado}
                onClick={() => executar(salvar)}
                data-slot="salvar-semana"
              />
            ) : null}
            {/* 6. Publicar. */}
            {situacao.podePublicar ? (
              <DialogoConfirmacao
                titulo="Publicar a semana?"
                consequencia="A versão original fica registrada com o retrato do papel, e a semana fica travada. Depois, toda mudança é uma alteração numerada, com justificativa."
                rotuloConfirmar="Publicar"
                aoConfirmar={() => executar(publicar)}
              >
                <BotaoDeIcone
                  acao="publicar"
                  rotulo="Publicar"
                  variante="padrao"
                  disabled={ocupado}
                  data-slot="publicar-semana"
                />
              </DialogoConfirmacao>
            ) : null}
            {/* 7. Fazer alteração, salvá-la (RP-9) e depois publicá-la. */}
            {situacao.podeFazerAlteracao ? (
              <BotaoDeIcone
                acao="editar"
                rotulo="Fazer alteração"
                ocupado={ocupado}
                onClick={() => executar(fazerAlteracao)}
                data-slot="fazer-alteracao"
              />
            ) : null}
            {situacao.podeSalvarAlteracao ? (
              <BotaoDeIcone
                acao="salvar"
                rotulo="Salvar alteração"
                variante="padrao"
                ocupado={ocupado}
                onClick={() => executar(salvarAlteracao)}
                data-slot="salvar-alteracao"
              />
            ) : null}
            {situacao.podePublicarAlteracao ? (
              <DialogoDeFormulario
                titulo="Publicar alteração"
                slot="formulario-da-alteracao"
                aberto={alteracaoAberta}
                aoMudar={(v) => {
                  setAlteracaoAberta(v);
                  if (!v) setRecusa(null);
                }}
                gatilho={
                  <BotaoDeIcone
                    acao="publicar"
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
                        setAlteracaoAberta(false);
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
                        onClick={() => setAlteracaoAberta(false)}
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
            {/* 8. Descartar rascunho — o destrutivo por último (RT-1). */}
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
          </>
        ) : null}
      </BarraDeAcoes>
      {resposta ? (
        <p
          role={resposta.falha ? "alert" : "status"}
          className={
            resposta.falha
              ? "text-conflito-tinta basis-full text-sm"
              : "text-texto basis-full text-sm"
          }
          data-slot="resposta-da-publicacao"
        >
          {resposta.texto}
        </p>
      ) : null}
    </>
  );
}

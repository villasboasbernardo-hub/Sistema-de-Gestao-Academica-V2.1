/**
 * A barra de ações do DSA, no cabeçalho — folha de cliente (Bloco 11, spec 026: RD-3, RD-4, RD-6; a publicação da
 * spec 024: RP-0 a RP-4; e, desde o Bloco 15, a barra ÚNICA da spec 030: `FR-010`).
 *
 * > *"barra de ações do DSA no topo direito, sem card separado e sem o texto 'A4 paisagem com assinaturas': Regime
 * > (relógio) · Limpar · Planilha de contingência · Gerar prévia (impressora) · Salvar minuta (renomear 'Salvar a
 * > semana') · Publicar (ícone Stamp) · Fazer alteração · Descartar rascunho; padrões RT-1 e RT-2."* — Bernardo Villas
 * > Boas, 26/10/2026 (`docs/correcoes/regras-do-dsa-lancamento.md`, RD-6)
 *
 * > *"mover para a barra de ícones do canto superior direito a navegação de semana (anterior · esta semana ·
 * > calendário/ir para o dia · próxima), o Parar dia e a função do sábado. Só ícones, dica só do verbo, agrupados
 * > (navegação | lançamento | publicação)."* — Bernardo Villas Boas, 29/10/2026 (RD-6 emendada)
 *
 * ⚠️ **TRÊS GRUPOS, SEPARADOS POR DIVISÓRIA** (`GrupoDaBarra`): **navegação** (a semana anterior, esta, o calendário e a
 *    seguinte — para todo perfil que lê o DSA, D-20), **lançamento** (regime · sábado · parar dia · lançar EI · remover
 *    EI · limpar) e **publicação** (planilha · prévia · salvar minuta · publicar · fazer alteração · salvar alteração ·
 *    publicar alteração · descartar). O destrutivo fecha cada grupo (RT-1).
 * ⚠️ **AS AÇÕES E A SITUAÇÃO CHEGAM POR PROPRIEDADE** (Princípio XI): a situação é derivada no servidor
 *    (`situacaoDaSemana`); aqui só se escolhe o que mostrar e se chama a ação. A planilha e a prévia chegam desenhadas
 *    (a prévia lê as assinaturas editadas pelo contexto da página).
 * ⚠️ **A RESPOSTA FICA LOGO ABAIXO DA BARRA, EM LARGURA TOTAL** — a folha devolve dois itens para o cabeçalho, que é
 *    flexível com quebra; a resposta nunca mora dentro de um botão que vai sumir (a lição do `AvisoDaLista`). Cada
 *    ação publica no `data-slot` de sempre: a da publicação, a do *Parar dia* e a do Estudo Individual.
 * ⚠️ **SALVAR ALTERAÇÃO** (RP-9, spec 029 `FR-003`): na semana em alteração, logo ANTES de *Publicar alteração* —
 *    sempre que a semana estiver em alteração, mesmo sem rascunho (D-23). O *Salvar minuta* continua fora da alteração.
 *    ⚠️ A dica é só o verbo, «Salvar» (RT-1); o nome acessível é o rótulo inteiro.
 * ⚠️ **O RELÓGIO NÃO MUDA SEMANA SALVA** (RD-3, D-11): o botão fica indisponível, com o motivo na dica — e o banco
 *    recusa do mesmo jeito (`semana_do_dsa_salva`).
 * ⚠️ **O ESTUDO INDIVIDUAL DA SEMANA MORA AQUI DESDE O BLOCO 15** (`FR-004`, D-11 e D-12): *Lançar EI* (era o botão
 *    escrito acima da grade) e *Remover EI* (o *Limpar*, só com os EI). Com a linha fixa fora do papel, o EI excluído só
 *    volta por *Lançar EI*.
 */
"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { BarraDeAcoes, GrupoDaBarra } from "@/components/ciaara/barra-de-acoes";
import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import type { SituacaoDaSemana } from "@/lib/dominio/dsa/publicacao";
import type { FonteDoRegime } from "@/lib/dominio/dsa/regime-da-semana";

import { PararDia, type TipoDeParada } from "./ControleDeParadas";
import { AlternarSabado, NavegacaoDaSemana } from "./NavegacaoDaSemana";
import type { ResultadoDoEstudoIndividual } from "./PainelDeLancamento";

type Resposta =
  { readonly ok: true; readonly mensagem: string } | { readonly ok: false; readonly erro: string };
type Acao = (entrada: unknown) => Promise<Resposta>;
type RespostaDoLote =
  | { readonly ok: true; readonly excluidos: number }
  | { readonly ok: false; readonly mensagem: string };
type RespostaDaParada =
  | { readonly ok: true }
  | { readonly ok: false; readonly erro: string; readonly lancamentosNoDia?: number };

/** Onde a resposta é publicada: um `data-slot` por família de ação, os de sempre. */
type SlotDaResposta =
  "resposta-da-publicacao" | "resposta-da-parada" | "resposta-do-estudo-individual";

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
  codigo,
  ano,
  semana,
  sabadoAberto,
  situacao,
  podeOperar,
  podeLancar,
  regime,
  regimesOferecidos,
  semanaSalva,
  paradas,
  planilha,
  previa,
  salvar,
  salvarAlteracao,
  descartar,
  fazerAlteracao,
  publicar,
  limpar,
  lancarEstudoIndividual,
  removerEstudoIndividual,
  definirRegime,
}: {
  readonly turmaId: string;
  /** O código da turma — os endereços da navegação. */
  readonly codigo: string;
  readonly ano: number;
  readonly semana: number;
  readonly sabadoAberto: boolean;
  readonly situacao: SituacaoDaSemana;
  /** RP-5: quem lança o DSA da turma salva, publica e altera. */
  readonly podeOperar: boolean;
  /** Pode lançar nesta semana agora (não arquivada, não travada): o relógio, o Parar dia, o EI e o Limpar. */
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
  /** O *Parar dia* (spec 014), ou nada — sem tipo de parada cadastrado, ou sem poder lançar. */
  readonly paradas: {
    readonly dias: readonly string[];
    readonly tipos: readonly TipoDeParada[];
    readonly podeGlobal: boolean;
    readonly pararDia: (entrada: unknown) => Promise<RespostaDaParada>;
  } | null;
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
  readonly limpar: (entrada: unknown) => Promise<RespostaDoLote>;
  /** `Q-7` e RD-2: o Estudo Individual da semana em um clique, no último tempo do regime. */
  readonly lancarEstudoIndividual: (entrada: unknown) => Promise<ResultadoDoEstudoIndividual>;
  /** Bloco 15 (D-11): o *Limpar*, só com os Estudos Individuais. */
  readonly removerEstudoIndividual: (entrada: unknown) => Promise<RespostaDoLote>;
  readonly definirRegime: Acao;
}) {
  const router = useRouter();
  const [resposta, setResposta] = React.useState<{
    texto: string;
    falha: boolean;
    slot: SlotDaResposta;
  } | null>(null);
  const [justificativa, setJustificativa] = React.useState("");
  const [recusa, setRecusa] = React.useState<string | null>(null);
  const [alteracaoAberta, setAlteracaoAberta] = React.useState(false);
  const [regimeAberto, setRegimeAberto] = React.useState(false);
  const [escolhido, setEscolhido] = React.useState<string>(regime.regimeId ?? "");
  const [ocupado, iniciar] = React.useTransition();
  const semanaDoDsa = { turmaId, ano, semana };
  const versao = situacao.versaoVigente;
  /*
   * RD-4 com a RP-9 (spec 029): o salvo que o *Limpar* (ou o *Remover EI*) exclui sai de vez no botão que salva AQUI —
   * na alteração, o *Salvar alteração* (ou o *Publicar alteração*, que salva antes de publicar); fora dela, o *Salvar
   * minuta*.
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
      setResposta({
        texto: r.ok ? r.mensagem : r.erro,
        falha: !r.ok,
        slot: "resposta-da-publicacao",
      });
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
      setResposta({ texto: r.mensagem, falha: false, slot: "resposta-da-publicacao" });
      router.refresh();
    });

  const lancarEi = () =>
    iniciar(async () => {
      const r = await lancarEstudoIndividual(semanaDoDsa);
      if (!r.ok) {
        setResposta({ texto: r.mensagem, falha: true, slot: "resposta-do-estudo-individual" });
        return;
      }
      /*
       * ⚠️ **OS PULADOS SÃO INFORMAÇÃO, NÃO SILÊNCIO.** Clicar de novo não cria nada — e sem dizer
       * isso a tela pareceria não ter feito nada. É a lição do `AvisoDaLista` da spec 011: a resposta
       * de toda ação é publicada, porque "não aconteceu nada" é o que uma falha invisível parece.
       */
      setResposta({
        texto:
          r.criados === 0
            ? `Nenhum dia novo: os ${r.pulados.length} dias úteis desta semana já têm Estudo Individual, ou são feriado de dia inteiro.`
            : `Estudo Individual lançado em ${r.criados} dia(s).` +
              (r.pulados.length > 0
                ? ` ${r.pulados.length} pulado(s) — já tinham, ou são feriado.`
                : ""),
        falha: false,
        slot: "resposta-do-estudo-individual",
      });
      router.refresh();
    });

  return (
    <>
      <BarraDeAcoes rotulo="Ações do DSA" className="ml-auto">
        {/* Navegação (RD-6 emendada, D-20): para todo perfil que lê o DSA. */}
        <NavegacaoDaSemana codigo={codigo} ano={ano} semana={semana} sabadoAberto={sabadoAberto} />

        <GrupoDaBarra rotulo="Lançamento" slot="lancamento-do-dsa">
          {/* Regime de tempos (RD-3). */}
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

          {/* O sábado (`Q-4`): a coluna se abre para quem lê também — é ver, não lançar. */}
          <AlternarSabado codigo={codigo} ano={ano} semana={semana} sabadoAberto={sabadoAberto} />

          {/* Parar dia (spec 014; Bloco 15, D-19): o ícone e o diálogo; as paradas da semana ficam abaixo. */}
          {podeLancar && paradas !== null ? (
            <PararDia
              turmaId={turmaId}
              dias={paradas.dias}
              tipos={paradas.tipos}
              podeGlobal={paradas.podeGlobal}
              pararDia={paradas.pararDia}
              aoResponder={(texto) =>
                setResposta({ texto, falha: false, slot: "resposta-da-parada" })
              }
            />
          ) : null}

          {/* O Estudo Individual da semana (Bloco 15, D-11 e D-12): lançar e remover. */}
          {podeLancar ? (
            <>
              <BotaoDeIcone
                acao="lancar-ei"
                rotulo="Lançar o Estudo Individual da semana"
                ocupado={ocupado}
                rotuloOcupado="Lançando…"
                onClick={lancarEi}
                data-slot="lancar-estudo-individual"
              />
              <DialogoConfirmacao
                titulo="Remover o Estudo Individual da semana?"
                consequencia={`Os Estudos Individuais desta turma na semana saem da grade, pela mesma exclusão do cartão. O que estava salvo só sai de vez ${noSalvar}, e «Descartar rascunho» desfaz. Eles não voltam sozinhos: para lançá-los de novo, use «Lançar EI».`}
                rotuloConfirmar="Remover"
                aoConfirmar={() =>
                  iniciar(async () => {
                    const r = await removerEstudoIndividual(semanaDoDsa);
                    setResposta(
                      r.ok
                        ? {
                            texto:
                              r.excluidos === 0
                                ? "Não havia Estudo Individual da turma nesta semana."
                                : `Estudo Individual removido de ${r.excluidos} dia${r.excluidos === 1 ? "" : "s"}, ${ateOSalvar}.`,
                            falha: false,
                            slot: "resposta-do-estudo-individual",
                          }
                        : { texto: r.mensagem, falha: true, slot: "resposta-do-estudo-individual" },
                    );
                    if (r.ok) router.refresh();
                  })
                }
              >
                <BotaoDeIcone
                  acao="remover-ei"
                  rotulo="Remover o Estudo Individual da semana"
                  disabled={ocupado}
                  data-slot="remover-estudo-individual"
                />
              </DialogoConfirmacao>
            </>
          ) : null}

          {/* Limpar semana (RD-4) — o destrutivo fecha o grupo. */}
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
                          slot: "resposta-da-publicacao",
                        }
                      : { texto: r.mensagem, falha: true, slot: "resposta-da-publicacao" },
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
        </GrupoDaBarra>

        <GrupoDaBarra rotulo="Publicação" slot="publicacao-da-barra">
          {/* Planilha de contingência; Gerar prévia / Imprimir. */}
          {planilha}
          {previa}

          {podeOperar ? (
            <>
              {/* Salvar minuta (RP-0). */}
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
              {/* Publicar. */}
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
              {/* Fazer alteração, salvá-la (RP-9) e depois publicá-la. */}
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
                          setResposta({
                            texto: r.mensagem,
                            falha: false,
                            slot: "resposta-da-publicacao",
                          });
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
              {/* Descartar rascunho — o destrutivo por último (RT-1). */}
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
        </GrupoDaBarra>
      </BarraDeAcoes>
      {resposta ? (
        <p
          role={resposta.falha ? "alert" : "status"}
          className={
            resposta.falha
              ? "text-conflito-tinta basis-full text-sm"
              : "text-texto basis-full text-sm"
          }
          data-slot={resposta.slot}
        >
          {resposta.texto}
        </p>
      ) : null}
    </>
  );
}

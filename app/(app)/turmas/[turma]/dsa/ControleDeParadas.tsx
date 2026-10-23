"use client";

/**
 * «Parar dia» e «Desfazer» no DSA — `FR-023` a `FR-028.1` da spec 014.
 *
 * ⚠️ **AS AÇÕES CHEGAM POR PROPRIEDADE** (Princípio XI). ⚠️ **A OPÇÃO «TODAS AS TURMAS» SÓ APARECE PARA
 *    QUEM TEM `calendario.criar`** — e a ação recusa mesmo assim (Q-8). ⚠️ **«Consome Tempo Reserva» só
 *    com a parada NÃO prevista**, e só no tipo que aceita TR. ⚠️ **Com lançamento no dia, pede
 *    confirmação**: os lançamentos ficam; a parada impede aula nova. ⚠️ **Desfazer inativa** (regra 4).
 * ⚠️ **O FERIADO DA SEMANA TAMBÉM ESTÁ NA FAIXA** (spec 023, FR-001 a FR-004): parar o dia de todas as turmas grava
 *    no calendário, e só daqui (ou da aba Calendário) ele se desfaz. O *Desfazer* do feriado e o das paradas GLOBAIS
 *    aparecem só para quem tem `calendario.editar` (`podeDesfazerGlobal`) — o banco recusaria os outros —, e o do
 *    feriado pede confirmação: ele libera o dia em todas as turmas que alcança.
 * ⚠️ **O FORMULÁRIO ABRE NUM DIÁLOGO** (spec 022, Bloco 7, FR-002): até o Bloco 7 ele abria abaixo do botão. A recusa e
 *    o pedido de confirmação ficam no diálogo; a resposta da gravação, abaixo do botão.
 */
import { useRouter } from "next/navigation";
import * as React from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { dataParaLeitura } from "@/lib/formato/data";

import { EscolhaSimples } from "./EscolhaSimples";

export type TipoDeParada = {
  readonly id: string;
  readonly valor: string;
  readonly rotulo: string;
  readonly podeGlobal: boolean;
  readonly aceitaTr: boolean;
};

export type ParadaNaSemana = {
  readonly data: string;
  readonly tipo: string;
  readonly motivo: string;
  readonly global: boolean;
  readonly taInicial: number | null;
  readonly tempos: number | null;
  readonly destino: "feriado" | "dia_parado" | "atividade";
  readonly codigo: string;
};

/** Spec 023: a linha do calendário de dia inteiro da semana (`FeriadoNaFaixa` da leitura). */
export type FeriadoDaFaixa = {
  readonly codigo: string;
  readonly data: string;
  readonly descricao: string;
  readonly tipo: string | null;
  readonly restrito: boolean;
  readonly turmasEscolhidas: number;
};

/** O nome sem o prefixo «<sigla> — » que o «Parar dia» escreve, para a sigla não sair duas vezes. */
function nomeSemPrefixo(f: FeriadoDaFaixa): string {
  return f.tipo !== null && f.descricao.startsWith(`${f.tipo} — `)
    ? f.descricao.slice(f.tipo.length + 3)
    : f.descricao;
}

/** A frase da confirmação (FR-003). */
export function consequenciaDeDesfazerFeriado(f: FeriadoDaFaixa): string {
  return f.restrito
    ? `Isso libera o dia nas ${f.turmasEscolhidas} turma${f.turmasEscolhidas === 1 ? "" : "s"} escolhida${f.turmasEscolhidas === 1 ? "" : "s"}. A linha fica inativa no calendário — nada é apagado.`
    : "Isso libera o dia em todas as turmas. A linha fica inativa no calendário — nada é apagado.";
}

type Resposta =
  | { readonly ok: true }
  | { readonly ok: false; readonly erro: string; readonly lancamentosNoDia?: number };

export function ControleDeParadas({
  turmaId,
  dias,
  tipos,
  podeGlobal,
  podeDesfazerGlobal = false,
  paradas,
  feriados = [],
  pararDia,
  desfazerParada,
}: {
  readonly turmaId: string;
  readonly dias: readonly string[];
  readonly tipos: readonly TipoDeParada[];
  readonly podeGlobal: boolean;
  /** Spec 023 (FR-002, FR-004): `calendario.editar` — o *Desfazer* do feriado e das paradas globais. */
  readonly podeDesfazerGlobal?: boolean;
  readonly paradas: readonly ParadaNaSemana[];
  /** Spec 023 (FR-001): os feriados de dia inteiro da semana que alcançam a turma. */
  readonly feriados?: readonly FeriadoDaFaixa[];
  readonly pararDia: (entrada: unknown) => Promise<Resposta>;
  readonly desfazerParada: (entrada: unknown) => Promise<Resposta>;
}) {
  const router = useRouter();
  const [aberto, setAberto] = React.useState(false);
  const [data, setData] = React.useState(dias[0] ?? "");
  const [tipoId, setTipoId] = React.useState(tipos[0]?.id ?? "");
  const [motivo, setMotivo] = React.useState("");
  const [alcance, setAlcance] = React.useState<"turma" | "todas">("turma");
  const [diaInteiro, setDiaInteiro] = React.useState(true);
  const [taInicial, setTaInicial] = React.useState("1");
  const [tempos, setTempos] = React.useState("1");
  const [prevista, setPrevista] = React.useState(true);
  const [consomeTr, setConsomeTr] = React.useState(false);
  const [resposta, setResposta] = React.useState<string | null>(null);
  /* A recusa da gravação fica no diálogo, com o que foi preenchido; a resposta, abaixo do botão. */
  const [recusa, setRecusa] = React.useState<string | null>(null);
  const [confirmar, setConfirmar] = React.useState<number | null>(null);
  const [gravando, iniciar] = React.useTransition();

  const tipo = tipos.find((t) => t.id === tipoId);
  const podeTodas = podeGlobal && (tipo?.podeGlobal ?? false);

  const enviar = (confirmado: boolean) =>
    iniciar(async () => {
      setResposta(null);
      setRecusa(null);
      const r = await pararDia({
        turmaId,
        alcance: podeTodas ? alcance : "turma",
        data,
        diaInteiro,
        taInicial: diaInteiro ? null : Number(taInicial),
        tempos: diaInteiro ? null : Number(tempos),
        tipoParadaId: tipoId,
        motivo,
        prevista,
        consomeTempoReserva: !prevista && consomeTr,
        confirmado,
      });
      if (!r.ok && r.erro === "confirmar") {
        setConfirmar(r.lancamentosNoDia ?? 0);
        return;
      }
      setConfirmar(null);
      if (!r.ok) {
        setRecusa(r.erro);
        return;
      }
      setResposta("Dia parado registrado.");
      setAberto(false);
      router.refresh();
    });

  const desfazer = (p: Pick<ParadaNaSemana, "destino" | "codigo">) =>
    iniciar(async () => {
      const r = await desfazerParada({ turmaId, destino: p.destino, codigo: p.codigo });
      setResposta(
        r.ok
          ? p.destino === "feriado"
            ? "Feriado desfeito: o dia está liberado."
            : "Parada desfeita."
          : r.erro,
      );
      if (r.ok) router.refresh();
    });

  return (
    <div className="flex flex-col gap-2" data-slot="controle-de-paradas">
      <div className="flex flex-wrap items-center gap-2">
        <DialogoDeFormulario
          titulo="Parar dia"
          largo
          slot="formulario-de-parada"
          aberto={aberto}
          aoMudar={(v) => {
            setAberto(v);
            if (!v) {
              setConfirmar(null);
              setRecusa(null);
            }
          }}
          gatilho={<BotaoDeIcone acao="parar-dia" rotulo="Parar dia" data-slot="parar-dia" />}
        >
          {() => (
            <form
              className="grid gap-2 text-sm md:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                enviar(false);
              }}
            >
              <EscolhaSimples
                id="parada-dia"
                rotulo="Dia"
                opcoes={dias.map((d) => ({ valor: d, rotulo: dataParaLeitura(d) }))}
                valor={data}
                aoMudar={setData}
              />
              <EscolhaSimples
                id="parada-tipo"
                rotulo="Tipo de parada"
                opcoes={tipos.map((t) => ({ valor: t.id, rotulo: t.rotulo }))}
                valor={tipoId}
                aoMudar={setTipoId}
              />
              <label className="flex flex-col gap-1">
                <span className="text-texto-suave text-xs">Motivo</span>
                <input
                  id="parada-motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="border-borda-forte bg-superficie rounded-ciaara border px-2 py-1"
                />
              </label>
              {podeTodas ? (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={alcance === "todas"}
                    onChange={(e) => setAlcance(e.target.checked ? "todas" : "turma")}
                    data-slot="parada-de-todas"
                  />
                  Todas as turmas
                </label>
              ) : null}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={diaInteiro}
                  onChange={(e) => setDiaInteiro(e.target.checked)}
                />
                Dia inteiro
              </label>
              {diaInteiro ? null : (
                <span className="flex items-center gap-2">
                  <label className="flex items-center gap-1">
                    Do tempo
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={taInicial}
                      onChange={(e) => setTaInicial(e.target.value)}
                      className="border-borda-forte bg-superficie rounded-ciaara w-14 border px-1"
                    />
                  </label>
                  <label className="flex items-center gap-1">
                    quantos
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={tempos}
                      onChange={(e) => setTempos(e.target.value)}
                      className="border-borda-forte bg-superficie rounded-ciaara w-14 border px-1"
                    />
                  </label>
                </span>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={prevista}
                  onChange={(e) => {
                    setPrevista(e.target.checked);
                    if (e.target.checked) setConsomeTr(false);
                  }}
                />
                Prevista no calendário
              </label>
              {!prevista && (tipo?.aceitaTr ?? false) ? (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={consomeTr}
                    onChange={(e) => setConsomeTr(e.target.checked)}
                    data-slot="consome-tempo-reserva"
                  />
                  Não prevista — consome Tempo Reserva
                </label>
              ) : null}
              {recusa ? (
                <p role="alert" className="text-conflito-tinta text-sm md:col-span-3">
                  {recusa}
                </p>
              ) : null}
              {confirmar !== null ? (
                <p
                  role="status"
                  className="text-atrasado-tinta text-xs md:col-span-3"
                  data-slot="confirmar-parada"
                >
                  Há {confirmar} lançamento(s) neste dia; eles ficam, e a parada impede aula nova.{" "}
                  <button type="button" className="underline" onClick={() => enviar(true)}>
                    Parar mesmo assim
                  </button>
                </p>
              ) : null}
              <DialogFooter className="md:col-span-3">
                <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-parada">
                  {gravando ? "Gravando…" : "Registrar parada"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogoDeFormulario>
        {paradas.map((p) => (
          <span
            key={p.codigo}
            className="border-borda bg-conformidade-fundo text-conformidade-tinta rounded-ciaara inline-flex items-center gap-2 border px-2 py-0.5 text-xs"
            data-parada={p.codigo}
          >
            {dataParaLeitura(p.data)} · {p.tipo}: {p.motivo}
            {p.taInicial === null
              ? " (dia inteiro)"
              : ` (tempos ${p.taInicial} a ${p.taInicial + (p.tempos ?? 1) - 1})`}
            {p.global ? " · todas as turmas" : ""}
            {p.global && !podeDesfazerGlobal ? null : (
              <BotaoDeIcone
                acao="desfazer"
                rotulo={`Desfazer a parada de ${dataParaLeitura(p.data)}`}
                variante="fantasma"
                className="size-6"
                onClick={() => desfazer(p)}
                disabled={gravando}
                data-slot="desfazer-parada"
              />
            )}
          </span>
        ))}
        {feriados.map((f) => (
          <span
            key={f.codigo}
            className="border-borda bg-conformidade-fundo text-conformidade-tinta rounded-ciaara inline-flex items-center gap-2 border px-2 py-0.5 text-xs"
            data-feriado={f.codigo}
          >
            {dataParaLeitura(f.data)} · {f.tipo ?? "Calendário"}: {nomeSemPrefixo(f)} (dia inteiro)
            {f.restrito ? " · turmas escolhidas" : " · todas as turmas"}
            {podeDesfazerGlobal ? (
              <DialogoConfirmacao
                titulo={`Desfazer o feriado de ${dataParaLeitura(f.data)}?`}
                consequencia={consequenciaDeDesfazerFeriado(f)}
                rotuloConfirmar="Desfazer"
                aoConfirmar={() => desfazer({ destino: "feriado", codigo: f.codigo })}
              >
                <BotaoDeIcone
                  acao="desfazer"
                  rotulo={`Desfazer o feriado de ${dataParaLeitura(f.data)}`}
                  variante="fantasma"
                  className="size-6"
                  disabled={gravando}
                  data-slot="desfazer-feriado"
                />
              </DialogoConfirmacao>
            ) : null}
          </span>
        ))}
      </div>

      {resposta ? (
        <p role="status" className="text-texto text-sm" data-slot="resposta-da-parada">
          {resposta}
        </p>
      ) : null}
    </div>
  );
}

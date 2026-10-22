"use client";

/**
 * «Parar dia» e «Desfazer» no DSA — `FR-023` a `FR-028.1` da spec 014.
 *
 * ⚠️ **AS AÇÕES CHEGAM POR PROPRIEDADE** (Princípio XI). ⚠️ **A OPÇÃO «TODAS AS TURMAS» SÓ APARECE PARA
 *    QUEM TEM `calendario.criar`** — e a ação recusa mesmo assim (Q-8). ⚠️ **«Consome Tempo Reserva» só
 *    com a parada NÃO prevista**, e só no tipo que aceita TR. ⚠️ **Com lançamento no dia, pede
 *    confirmação**: os lançamentos ficam; a parada impede aula nova. ⚠️ **Desfazer inativa** (regra 4).
 */
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
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

type Resposta =
  | { readonly ok: true }
  | { readonly ok: false; readonly erro: string; readonly lancamentosNoDia?: number };

export function ControleDeParadas({
  turmaId,
  dias,
  tipos,
  podeGlobal,
  paradas,
  pararDia,
  desfazerParada,
}: {
  readonly turmaId: string;
  readonly dias: readonly string[];
  readonly tipos: readonly TipoDeParada[];
  readonly podeGlobal: boolean;
  readonly paradas: readonly ParadaNaSemana[];
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
  const [confirmar, setConfirmar] = React.useState<number | null>(null);
  const [gravando, iniciar] = React.useTransition();

  const tipo = tipos.find((t) => t.id === tipoId);
  const podeTodas = podeGlobal && (tipo?.podeGlobal ?? false);

  const enviar = (confirmado: boolean) =>
    iniciar(async () => {
      setResposta(null);
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
        setResposta(r.erro);
        return;
      }
      setResposta("Dia parado registrado.");
      setAberto(false);
      router.refresh();
    });

  const desfazer = (p: ParadaNaSemana) =>
    iniciar(async () => {
      const r = await desfazerParada({ turmaId, destino: p.destino, codigo: p.codigo });
      setResposta(r.ok ? "Parada desfeita." : r.erro);
      if (r.ok) router.refresh();
    });

  return (
    <div className="flex flex-col gap-2" data-slot="controle-de-paradas">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setAberto((v) => !v)}
          data-slot="parar-dia"
        >
          Parar dia
        </Button>
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
            <button
              type="button"
              className="underline"
              onClick={() => desfazer(p)}
              disabled={gravando}
              data-slot="desfazer-parada"
            >
              Desfazer
            </button>
          </span>
        ))}
      </div>

      {aberto ? (
        <form
          className="border-borda bg-superficie rounded-ciaara grid gap-2 border p-3 text-sm md:grid-cols-3"
          data-slot="formulario-de-parada"
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
          <div className="flex items-center gap-2 md:col-span-3">
            <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-parada">
              {gravando ? "Gravando…" : "Registrar parada"}
            </Button>
            {confirmar !== null ? (
              <span
                role="status"
                className="text-atrasado-tinta text-xs"
                data-slot="confirmar-parada"
              >
                Há {confirmar} lançamento(s) neste dia; eles ficam, e a parada impede aula nova.{" "}
                <button type="button" className="underline" onClick={() => enviar(true)}>
                  Parar mesmo assim
                </button>
              </span>
            ) : null}
          </div>
        </form>
      ) : null}

      {resposta ? (
        <p role="status" className="text-texto text-sm" data-slot="resposta-da-parada">
          {resposta}
        </p>
      ) : null}
    </div>
  );
}

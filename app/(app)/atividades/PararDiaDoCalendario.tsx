/**
 * «Parar dia» na aba Calendário — de TODAS as turmas e PREVISTA no calendário (spec 023, FR-012, D-8).
 *
 * ⚠️ **A AÇÃO É A MESMA DO DSA** (`pararDia`), sem turma: dia inteiro vira linha do calendário; parte do dia, parada
 *    global. ⚠️ **SEM «CONSOME TEMPO RESERVA»**: o TR é decisão do DSA da turma, para a parada não prevista.
 * ⚠️ **COM LANÇAMENTO NO DIA, PEDE CONFIRMAÇÃO** — a mesma do DSA: os lançamentos ficam; a parada impede aula nova.
 */
"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

import type { TipoDoCalendario } from "./calendario";

type Resposta =
  | { readonly ok: true }
  | { readonly ok: false; readonly erro: string; readonly lancamentosNoDia?: number };

const CAMPO = "border-borda-forte bg-superficie rounded-ciaara border px-2 py-1";

export function PararDiaDoCalendario({
  ano,
  tipos,
  pararDia,
  aoGravar,
}: {
  readonly ano: number;
  readonly tipos: readonly TipoDoCalendario[];
  readonly pararDia: (entrada: unknown) => Promise<Resposta>;
  readonly aoGravar: (mensagem: string) => void;
}) {
  const router = useRouter();
  const [aberto, setAberto] = React.useState(false);
  const [data, setData] = React.useState(`${ano}-01-01`);
  const [tipoId, setTipoId] = React.useState(tipos[0]?.id ?? "");
  const [motivo, setMotivo] = React.useState("");
  const [diaInteiro, setDiaInteiro] = React.useState(true);
  const [taInicial, setTaInicial] = React.useState("1");
  const [tempos, setTempos] = React.useState("1");
  const [recusa, setRecusa] = React.useState<string | null>(null);
  const [confirmar, setConfirmar] = React.useState<number | null>(null);
  const [gravando, iniciar] = React.useTransition();

  const enviar = (confirmado: boolean) =>
    iniciar(async () => {
      setRecusa(null);
      const r = await pararDia({
        turmaId: null,
        alcance: "todas",
        data,
        diaInteiro,
        taInicial: diaInteiro ? null : Number(taInicial),
        tempos: diaInteiro ? null : Number(tempos),
        tipoParadaId: tipoId,
        motivo,
        prevista: true,
        consomeTempoReserva: false,
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
      setAberto(false);
      aoGravar("Dia parado em todas as turmas.");
      router.refresh();
    });

  return (
    <DialogoDeFormulario
      titulo="Parar dia — todas as turmas"
      largo
      slot="parar-dia-do-calendario"
      aberto={aberto}
      aoMudar={(v) => {
        setAberto(v);
        if (!v) {
          setConfirmar(null);
          setRecusa(null);
        }
      }}
      gatilho={
        <BotaoDeIcone
          acao="parar-dia"
          rotulo="Parar dia (todas as turmas)"
          data-slot="parar-dia-calendario"
        />
      }
    >
      {() => (
        <form
          className="grid gap-3 text-sm md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            enviar(false);
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-texto-suave text-xs">Dia</span>
            <input
              id="calendario-parada-dia"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className={CAMPO}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-texto-suave text-xs">Tipo de parada</span>
            <select
              id="calendario-parada-tipo"
              value={tipoId}
              onChange={(e) => setTipoId(e.target.value)}
              className={CAMPO}
            >
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-texto-suave text-xs">Motivo</span>
            <input
              id="calendario-parada-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className={CAMPO}
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={diaInteiro}
              onChange={(e) => setDiaInteiro(e.target.checked)}
            />
            Dia inteiro
          </label>
          {diaInteiro ? null : (
            <span className="flex items-center gap-2 md:col-span-2">
              <label className="flex items-center gap-1">
                Do tempo
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={taInicial}
                  onChange={(e) => setTaInicial(e.target.value)}
                  className={`${CAMPO} w-14`}
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
                  className={`${CAMPO} w-14`}
                />
              </label>
            </span>
          )}
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
            <Button
              type="submit"
              size="sm"
              disabled={gravando}
              data-slot="gravar-parada-calendario"
            >
              {gravando ? "Gravando…" : "Registrar parada"}
            </Button>
          </DialogFooter>
        </form>
      )}
    </DialogoDeFormulario>
  );
}

/**
 * Cadastrar e editar uma linha do calendário, num diálogo (spec 023, Bloco 8: FR-009, FR-010; padrão do Bloco 7).
 *
 * ⚠️ **A AÇÃO CHEGA POR PROPRIEDADE** (Princípio XI). ⚠️ **A RECUSA FICA NO DIÁLOGO**, com o que foi preenchido; a
 *    resposta da gravação vai para cima da lista (FR-014), por `aoGravar`.
 * ⚠️ **DATA REPETIDA AVISA E NÃO BLOQUEIA** (D-12): um feriado nacional e um local na mesma data são legítimos.
 */
"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

import type { LinhaDoCalendario, TipoDoCalendario, TurmaParaEscolher } from "./calendario";
import { EscolhaDeTurmas } from "./EscolhaDeTurmas";

type Resposta =
  { readonly ok: true; readonly mensagem: string } | { readonly ok: false; readonly erro: string };

export const ROTULO_DO_IMPACTO = {
  dia_inteiro: "Dia inteiro",
  parcial: "Parcial",
  informativo: "Informativo",
} as const;

const CAMPO = "border-borda-forte bg-superficie rounded-ciaara border px-2 py-1";

export function DialogoDaLinha({
  linha,
  ano,
  tipos,
  turmas,
  ativasPorData,
  gravar,
  aoGravar,
}: {
  /** Ausente: cadastrar. */
  readonly linha?: LinhaDoCalendario;
  readonly ano: number;
  readonly tipos: readonly TipoDoCalendario[];
  readonly turmas: readonly TurmaParaEscolher[];
  /** Quantas linhas ATIVAS de dia inteiro há em cada data (D-12). */
  readonly ativasPorData: Readonly<Record<string, number>>;
  readonly gravar: (entrada: unknown) => Promise<Resposta>;
  readonly aoGravar: (mensagem: string) => void;
}) {
  const router = useRouter();
  const [aberto, setAberto] = React.useState(false);
  const [data, setData] = React.useState(linha?.data ?? `${ano}-01-01`);
  const [nome, setNome] = React.useState(linha?.nome ?? "");
  const [tipoId, setTipoId] = React.useState(linha?.tipoId ?? tipos[0]?.id ?? "");
  const [impacto, setImpacto] = React.useState<string>(linha?.impacto ?? "dia_inteiro");
  const [abrangencia, setAbrangencia] = React.useState<"todas" | "turmas">(
    linha && linha.turmas.length > 0 ? "turmas" : "todas",
  );
  const [escolhidas, setEscolhidas] = React.useState<string[]>([...(linha?.turmas ?? [])]);
  const [recusa, setRecusa] = React.useState<string | null>(null);
  const [gravando, iniciar] = React.useTransition();

  const outrasNaData =
    (ativasPorData[data] ?? 0) - (linha?.situacao === "ativo" && linha.data === data ? 1 : 0);
  const prefixo = linha ? `linha-${linha.codigo}` : "linha-nova";

  const enviar = () =>
    iniciar(async () => {
      setRecusa(null);
      const r = await gravar({
        id: linha?.id ?? null,
        data,
        descricao: nome,
        tipoParadaId: tipoId,
        impacto,
        abrangencia,
        turmas: abrangencia === "turmas" ? escolhidas : [],
      });
      if (!r.ok) {
        setRecusa(r.erro);
        return;
      }
      setAberto(false);
      aoGravar(r.mensagem);
      router.refresh();
    });

  return (
    <DialogoDeFormulario
      titulo={linha ? "Editar linha do calendário" : "Cadastrar no calendário"}
      largo
      slot="formulario-do-calendario"
      aberto={aberto}
      aoMudar={(v) => {
        setAberto(v);
        if (!v) setRecusa(null);
      }}
      gatilho={
        linha ? (
          <BotaoDeIcone
            acao="editar"
            rotulo={`Editar ${linha.nome}`}
            variante="fantasma"
            className="size-7"
            data-slot="editar-linha"
          />
        ) : (
          <BotaoDeIcone acao="novo" rotulo="Cadastrar no calendário" data-slot="cadastrar-linha" />
        )
      }
    >
      {() => (
        <form
          className="grid gap-3 text-sm md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-texto-suave text-xs">Data</span>
            <input
              id={`${prefixo}-data`}
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className={CAMPO}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-texto-suave text-xs">Nome</span>
            <input
              id={`${prefixo}-nome`}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={CAMPO}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-texto-suave text-xs">Tipo</span>
            <select
              id={`${prefixo}-tipo`}
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
            <span className="text-texto-suave text-xs">Impacto</span>
            <select
              id={`${prefixo}-impacto`}
              value={impacto}
              onChange={(e) => setImpacto(e.target.value)}
              className={CAMPO}
            >
              {Object.entries(ROTULO_DO_IMPACTO).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="flex flex-col gap-1 md:col-span-2">
            <legend className="text-texto-suave text-xs">Abrangência</legend>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`${prefixo}-abrangencia`}
                checked={abrangencia === "todas"}
                onChange={() => setAbrangencia("todas")}
                data-slot="abrangencia-todas"
              />
              Todas as turmas
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`${prefixo}-abrangencia`}
                checked={abrangencia === "turmas"}
                onChange={() => setAbrangencia("turmas")}
                data-slot="abrangencia-turmas"
              />
              Turmas escolhidas
            </label>
          </fieldset>
          {abrangencia === "turmas" ? (
            <div className="md:col-span-2">
              <EscolhaDeTurmas turmas={turmas} escolhidas={escolhidas} aoMudar={setEscolhidas} />
            </div>
          ) : null}
          {impacto === "dia_inteiro" && outrasNaData > 0 ? (
            <p
              role="status"
              className="text-atrasado-tinta text-xs md:col-span-2"
              data-slot="data-repetida"
            >
              Já há {outrasNaData} linha{outrasNaData === 1 ? "" : "s"} ativa
              {outrasNaData === 1 ? "" : "s"} de dia inteiro nesta data.
            </p>
          ) : null}
          {recusa ? (
            <p role="alert" className="text-conflito-tinta text-sm md:col-span-2">
              {recusa}
            </p>
          ) : null}
          <DialogFooter className="md:col-span-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-linha">
              {gravando ? "Gravando…" : linha ? "Gravar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      )}
    </DialogoDeFormulario>
  );
}

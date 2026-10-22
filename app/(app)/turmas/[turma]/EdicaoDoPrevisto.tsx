"use client";

/**
 * Editar o previsto do PROENS de um card (`FR-008.1` a `FR-008.3` da spec 014).
 *
 * ⚠️ **SÓ É MONTADA PARA QUEM TEM `previsto_proens.editar`** — o botão segue a permissão da ação. Mas
 *    não é a proteção: a ação chamada por fora da tela é recusada pelo banco (`42501`).
 * ⚠️ **A AÇÃO CHEGA POR PROPRIEDADE** (Princípio XI), nunca por `import` de `@/lib/acoes/`.
 * ⚠️ **ACIMA DO MÁXIMO GRAVA E AVISA** (`FR-008.3`): o aviso é `role="status"`, nunca recusa.
 * ⚠️ **SEM PREVISTO, A RESERVA GENÉRICA É SÓ SUGESTÃO**, marcada como tal, e só vira previsto se a pessoa
 *    gravar (RN-2027-03).
 * ⚠️ **O CAMPO ABRE NUM DIÁLOGO** (spec 022, Bloco 7, FR-002): até o Bloco 7 ele abria dentro do card. A resposta da
 *    gravação fica no card; a recusa, no diálogo.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { instanteComHoraParaLeitura } from "@/lib/formato/data";

type Resultado =
  | {
      readonly ok: true;
      readonly aviso?: "acima_do_limite_maximo";
      readonly alteradoPor: string;
      readonly alteradoEm: string;
    }
  | { readonly ok: false; readonly erro: string };

export function EdicaoDoPrevisto({
  turmaId,
  categoria,
  atual,
  sugestao,
  gravar,
}: {
  readonly turmaId: string;
  readonly categoria: "AEC" | "TAD" | "TR";
  readonly atual: number | null;
  readonly sugestao: number | null;
  readonly gravar: (entrada: unknown) => Promise<Resultado>;
}) {
  const [gravado, setGravado] = useState<Extract<Resultado, { ok: true }> | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <DialogoDeFormulario
        titulo={`Previsto no PROENS de ${categoria}`}
        slot="formulario-do-previsto"
        gatilho={
          <BotaoDeIcone
            acao="editar"
            rotulo={`Editar previsto de ${categoria}`}
            className="self-start"
            data-slot="editar-previsto"
          />
        }
      >
        {(fechar) => (
          <FormularioDoPrevisto
            turmaId={turmaId}
            categoria={categoria}
            atual={atual}
            sugestao={sugestao}
            gravar={gravar}
            aoGravar={(r) => {
              setGravado(r);
              fechar();
            }}
            fechar={fechar}
          />
        )}
      </DialogoDeFormulario>
      {gravado ? (
        <p role="status" className="text-texto-suave text-xs" data-slot="previsto-gravado">
          Previsto gravado por {gravado.alteradoPor} em{" "}
          {instanteComHoraParaLeitura(gravado.alteradoEm)}.
          {gravado.aviso === "acima_do_limite_maximo" ? " Ele está acima do limite máximo." : ""}
        </p>
      ) : null}
    </div>
  );
}

function FormularioDoPrevisto({
  turmaId,
  categoria,
  atual,
  sugestao,
  gravar,
  aoGravar,
  fechar,
}: {
  readonly turmaId: string;
  readonly categoria: "AEC" | "TAD" | "TR";
  readonly atual: number | null;
  readonly sugestao: number | null;
  readonly gravar: (entrada: unknown) => Promise<Resultado>;
  readonly aoGravar: (r: Extract<Resultado, { ok: true }>) => void;
  readonly fechar: () => void;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(String(atual ?? sugestao ?? ""));
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, iniciar] = useTransition();
  const idDoCampo = `previsto-${categoria.toLowerCase()}`;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await gravar({ turmaId, categoria, tempos: valor });
          if (r.ok) {
            aoGravar(r);
            router.refresh();
          } else setErro(r.erro);
        });
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={idDoCampo} className="text-texto-suave text-sm">
          Previsto no PROENS (TA)
        </label>
        <input
          id={idDoCampo}
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="border-borda-forte bg-superficie rounded-ciaara w-28 border px-2 py-1 text-sm"
        />
      </div>
      {atual === null && sugestao !== null ? (
        <p className="text-texto-suave text-xs" data-slot="sugestao-do-previsto">
          Sugestão: {sugestao} TA, da reserva genérica do PROENS. Só vale se você gravar.
        </p>
      ) : null}
      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm" data-slot="recusa-do-previsto">
          {erro}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={fechar} disabled={gravando}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-previsto">
          {gravando ? "Gravando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

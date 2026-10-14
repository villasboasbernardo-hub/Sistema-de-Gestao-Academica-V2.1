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
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(String(atual ?? sugestao ?? ""));
  const [resposta, setResposta] = useState<Resultado | null>(null);
  const [gravando, iniciar] = useTransition();
  const idDoCampo = `previsto-${categoria.toLowerCase()}`;

  if (!aberto) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="border-borda rounded-ciaara hover:bg-marca-suave self-start border px-2 py-1 text-xs"
          data-slot="editar-previsto"
        >
          Editar previsto
        </button>
        {resposta?.ok ? (
          <p role="status" className="text-texto-suave text-xs" data-slot="previsto-gravado">
            Previsto gravado por {resposta.alteradoPor} em{" "}
            {instanteComHoraParaLeitura(resposta.alteradoEm)}.
            {resposta.aviso === "acima_do_limite_maximo" ? " Ele está acima do limite máximo." : ""}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-1"
      data-slot="formulario-do-previsto"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await gravar({ turmaId, categoria, tempos: valor });
          setResposta(r);
          if (r.ok) {
            setAberto(false);
            router.refresh();
          }
        });
      }}
    >
      <label htmlFor={idDoCampo} className="text-texto-suave text-xs">
        Previsto no PROENS (TA)
      </label>
      <div className="flex items-center gap-2">
        <input
          id={idDoCampo}
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="border-borda-forte bg-superficie rounded-ciaara w-24 border px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={gravando}
          className="bg-marca text-marca-contraste rounded-ciaara px-2 py-1 text-xs font-medium"
          data-slot="gravar-previsto"
        >
          {gravando ? "Gravando…" : "Gravar"}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="text-texto-suave text-xs">
          Cancelar
        </button>
      </div>
      {atual === null && sugestao !== null ? (
        <p className="text-texto-suave text-xs" data-slot="sugestao-do-previsto">
          Sugestão: {sugestao} TA, da reserva genérica do PROENS. Só vale se você gravar.
        </p>
      ) : null}
      {resposta && !resposta.ok ? (
        <p role="alert" className="text-conflito-tinta text-xs" data-slot="recusa-do-previsto">
          {resposta.erro}
        </p>
      ) : null}
    </form>
  );
}

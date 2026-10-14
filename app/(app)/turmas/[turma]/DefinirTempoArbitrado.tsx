"use client";

/**
 * As ações do arbitrado num item de avaliação do currículo (spec 014, FR-031.3, FR-031.4, FR-031.7, T180):
 * **Definir tempo** (no curso ou só nesta turma), **Confirmar sugestão** da planilha e **Nomear a UE**.
 *
 * ⚠️ **SÓ É MONTADA PARA QUEM TEM `avaliacoes_curriculo_arbitrado.editar`** (Admin e Encarregado) — o botão segue a
 *    permissão da ação. Não é a proteção: a ação chamada por fora é recusada pelo banco (`42501`).
 * ⚠️ **AS AÇÕES CHEGAM POR PROPRIEDADE** (Princípio XI).
 * ⚠️ **PASSAR DA CH É AVISO**, nunca recusa (`RN-DEG-02`): a resposta `soma_acima_da_ch` vira `role="status"`.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Resultado =
  | { readonly ok: true; readonly aviso?: "soma_acima_da_ch" }
  | { readonly ok: false; readonly erro: string };
type Acao = (entrada: unknown) => Promise<Resultado>;

export function DefinirTempoArbitrado({
  itemId,
  turmaId,
  tempoDeCurriculo,
  sugestaoAConfirmar,
  unidades,
  definir,
  confirmar,
  nomear,
}: {
  readonly itemId: string;
  readonly turmaId: string;
  /** O tempo do item é do currículo: no curso não se arbitra; só a turma. */
  readonly tempoDeCurriculo: boolean;
  readonly sugestaoAConfirmar: boolean;
  /** As UEs da disciplina, quando o currículo não diz de qual UE a avaliação sai. */
  readonly unidades: readonly { id: string; rotulo: string }[];
  readonly definir: Acao;
  readonly confirmar: Acao;
  readonly nomear: Acao;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [aplicacao, setAplicacao] = useState("");
  const [vista, setVista] = useState("");
  const [alcance, setAlcance] = useState<"curso" | "turma">(tempoDeCurriculo ? "turma" : "curso");
  const [ue, setUe] = useState("");
  const [resposta, setResposta] = useState<Resultado | null>(null);
  const [gravando, iniciar] = useTransition();

  const rodar = (acao: Acao, entrada: unknown) =>
    iniciar(async () => {
      const r = await acao(entrada);
      setResposta(r);
      if (r.ok) {
        setAberto(false);
        router.refresh();
      }
    });

  return (
    <span className="inline-flex flex-wrap items-center gap-2" data-slot="acoes-do-arbitrado">
      {!aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="border-borda rounded-ciaara hover:bg-marca-suave border px-2 py-0.5 text-xs"
          data-slot="definir-tempo"
        >
          Definir tempo
        </button>
      ) : (
        <form
          className="inline-flex flex-wrap items-center gap-2 text-xs"
          data-slot="formulario-do-arbitrado"
          onSubmit={(e) => {
            e.preventDefault();
            rodar(definir, {
              itemId,
              alcance,
              ...(alcance === "turma" ? { turmaId } : {}),
              taAplicacao: aplicacao,
              ...(vista === "" ? {} : { taVista: vista }),
            });
          }}
        >
          <label className="inline-flex items-center gap-1">
            aplicação
            <input
              type="number"
              min={0}
              required
              value={aplicacao}
              onChange={(e) => setAplicacao(e.target.value)}
              className="border-borda bg-superficie w-14 rounded border px-1"
              aria-label="TA de aplicação"
            />
          </label>
          <label className="inline-flex items-center gap-1">
            vista
            <input
              type="number"
              min={0}
              value={vista}
              onChange={(e) => setVista(e.target.value)}
              className="border-borda bg-superficie w-14 rounded border px-1"
              aria-label="TA de vista"
            />
          </label>
          <label className="inline-flex items-center gap-1">
            vale para
            <select
              value={alcance}
              onChange={(e) => setAlcance(e.target.value as "curso" | "turma")}
              className="border-borda bg-superficie rounded border px-1"
              aria-label="Alcance do arbitrado"
            >
              {tempoDeCurriculo ? null : <option value="curso">o curso</option>}
              <option value="turma">só esta turma</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={gravando}
            className="bg-marca text-marca-contraste rounded-ciaara px-2 py-0.5"
          >
            Gravar
          </button>
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="text-texto-suave underline"
          >
            Cancelar
          </button>
        </form>
      )}
      {sugestaoAConfirmar ? (
        <button
          type="button"
          disabled={gravando}
          onClick={() => rodar(confirmar, { itemId, turmaId })}
          className="border-borda rounded-ciaara hover:bg-marca-suave border px-2 py-0.5 text-xs"
          data-slot="confirmar-sugestao"
        >
          Confirmar sugestão
        </button>
      ) : null}
      {unidades.length > 0 ? (
        <span className="inline-flex items-center gap-1 text-xs">
          <select
            value={ue}
            onChange={(e) => setUe(e.target.value)}
            className="border-borda bg-superficie rounded border px-1"
            aria-label="Unidade de ensino da avaliação"
          >
            <option value="">nomear a UE…</option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.rotulo}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={gravando || ue === ""}
            onClick={() => rodar(nomear, { itemId, unidadeEnsinoId: ue })}
            className="border-borda rounded-ciaara hover:bg-marca-suave border px-2 py-0.5"
            data-slot="nomear-ue"
          >
            Nomear
          </button>
        </span>
      ) : null}
      {resposta && !resposta.ok ? (
        <span role="alert" className="text-conflito-tinta text-xs">
          {resposta.erro}
        </span>
      ) : null}
      {resposta?.ok && resposta.aviso === "soma_acima_da_ch" ? (
        <span role="status" className="text-atrasado-tinta text-xs">
          gravado — a avaliação prevista passa da CH da disciplina
        </span>
      ) : null}
    </span>
  );
}

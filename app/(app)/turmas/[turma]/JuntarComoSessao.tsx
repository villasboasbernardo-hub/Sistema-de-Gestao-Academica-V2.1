"use client";

/**
 * «Juntar como sessão da mesma prova» numa avaliação da aba Avaliações (spec 014, decisão de Bernardo Villas Boas,
 * 16/10/2026: *"na aba Avaliações da turma a ação "juntar como sessão da mesma prova" (Encarregado/Admin, com
 * trilha)"*).
 *
 * ⚠️ **SÓ É MONTADA PARA QUEM TEM `avaliacoes_juntar_sessao.editar`** (Admin e Encarregado) — o botão segue a
 *    permissão da ação. Não é a proteção: a função do banco recusa os demais com `42501`.
 * ⚠️ **AS CANDIDATAS CHEGAM PRONTAS** (`juntarEm`, de `quadroDeAvaliacoesDaTurma`): aqui não se decide qual prova
 *    serve. A ação chega por propriedade (Princípio XI).
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { dataParaLeitura } from "@/lib/formato/data";

type Resultado = { readonly ok: true } | { readonly ok: false; readonly erro: string };
type Acao = (entrada: unknown) => Promise<Resultado>;

export function JuntarComoSessao({
  avaliacaoId,
  opcoes,
  juntar,
}: {
  readonly avaliacaoId: string;
  /** As provas da disciplina em que esta avaliação pode virar sessão (rótulo pronto). */
  readonly opcoes: readonly {
    readonly id: string;
    readonly rotulo: string;
    readonly aplicacao: string;
  }[];
  readonly juntar: Acao;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [provaId, setProvaId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, iniciar] = useTransition();

  if (opcoes.length === 0) return null;
  if (!aberto)
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="border-borda rounded-ciaara hover:bg-marca-suave border px-2 py-0.5 text-xs"
        data-slot="juntar-como-sessao"
      >
        Juntar como sessão de outra prova
      </button>
    );
  return (
    <form
      className="inline-flex flex-wrap items-center gap-2 text-xs"
      data-slot="formulario-de-juntar"
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        iniciar(async () => {
          const r = await juntar({ provaId, avaliacaoId });
          if (r.ok) {
            setAberto(false);
            router.refresh();
          } else setErro(r.erro);
        });
      }}
    >
      <label className="inline-flex items-center gap-1">
        <span>Sessão da prova</span>
        <select
          value={provaId}
          onChange={(e) => setProvaId(e.target.value)}
          className="border-borda-forte bg-superficie rounded-ciaara border px-1 py-0.5"
          required
          data-slot="prova-para-juntar"
        >
          <option value="">— escolha —</option>
          {opcoes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.rotulo} · {dataParaLeitura(o.aplicacao)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={gravando || provaId === ""}
        className="bg-marca text-marca-contraste rounded-ciaara px-2 py-0.5 disabled:opacity-50"
      >
        {gravando ? "Juntando…" : "Juntar"}
      </button>
      <button type="button" onClick={() => setAberto(false)} className="text-texto-suave underline">
        Cancelar
      </button>
      {erro ? (
        <span role="alert" className="text-conflito-tinta">
          {erro}
        </span>
      ) : null}
    </form>
  );
}

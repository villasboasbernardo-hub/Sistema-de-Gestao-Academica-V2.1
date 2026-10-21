/**
 * Os limites de AEC, TAD e TR do currículo, em *Editar curso* — spec 021, Bloco 6, ajuste 3 da conferência do PR #82
 * (21/10/2026: *"atividades/limites"*) — **folha de cliente**.
 *
 * ⚠️ É O QUE O QUADRO FINAL DO CURRÍCULO DECLARA (spec 014, FR-001.1), em TA, com o arquivo e a página. Só informativo
 *    (regra 6): nunca vira bloqueio de lançamento. Sem limite declarado, vale o percentual da norma.
 * ⚠️ NO CURRÍCULO EM USO, mudar ou retirar o que tinha valor é correção (RC-6): o banco pede a justificativa, e o diálogo
 *    único a pergunta. Declarar o que não havia é completar — livre.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { usePedidoDeJustificativa } from "@/components/ciaara/pedido-de-justificativa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { retirarLimiteDoCurriculo, salvarLimiteDoCurriculo } from "@/lib/acoes/curriculo";

export type LimiteNaEdicao = {
  readonly categoria: "AEC" | "TAD" | "TR";
  /** O declarado no currículo — `null` quando não há (vale o percentual da norma). */
  readonly tempos: number | null;
  readonly fonteArquivo: string | null;
  readonly fontePagina: number | null;
  /** "10% da CH curricular" — o que vale sem limite declarado. */
  readonly referencia: string;
};

export function LimitesDoCurriculo({
  sigla,
  versao,
  limites,
  podeEditar,
}: {
  readonly sigla: string;
  readonly versao: number;
  readonly limites: readonly LimiteNaEdicao[];
  readonly podeEditar: boolean;
}) {
  const router = useRouter();
  const [aberto, definirAberto] = React.useState<string | null>(null);
  const [resposta, definirResposta] = React.useState<{ ok: boolean; texto: string } | null>(null);
  const [gravando, definirGravando] = React.useState(false);
  const { executar, dialogo } = usePedidoDeJustificativa();

  async function gravar(categoria: LimiteNaEdicao["categoria"], dados: FormData) {
    definirGravando(true);
    definirResposta(null);
    const r = await executar((justificativa) =>
      salvarLimiteDoCurriculo({
        sigla,
        versao,
        categoria,
        tempos: String(dados.get("tempos") ?? ""),
        fonteArquivo: String(dados.get("fonte_arquivo") ?? ""),
        fontePagina: String(dados.get("fonte_pagina") ?? ""),
        ...(justificativa ? { justificativa } : {}),
      }),
    );
    definirGravando(false);
    definirResposta(
      r.ok ? { ok: true, texto: `Limite de ${categoria} gravado.` } : { ok: false, texto: r.erro },
    );
    if (r.ok) {
      definirAberto(null);
      router.refresh();
    }
  }

  async function retirar(categoria: LimiteNaEdicao["categoria"]) {
    definirGravando(true);
    definirResposta(null);
    const r = await executar((justificativa) =>
      retirarLimiteDoCurriculo({
        sigla,
        versao,
        categoria,
        ...(justificativa ? { justificativa } : {}),
      }),
    );
    definirGravando(false);
    definirResposta(
      r.ok
        ? { ok: true, texto: `Limite de ${categoria} retirado: vale o percentual da norma.` }
        : { ok: false, texto: r.erro },
    );
    if (r.ok) router.refresh();
  }

  return (
    <section
      aria-labelledby="titulo-limites-do-curriculo"
      className="flex flex-col gap-3"
      data-slot="limites-do-curriculo"
    >
      {dialogo}
      <h3 id="titulo-limites-do-curriculo" className="text-texto text-sm font-semibold">
        Limites de AEC, TAD e TR declarados no currículo
      </h3>
      {resposta ? (
        <p
          role={resposta.ok ? "status" : "alert"}
          className={resposta.ok ? "text-texto text-sm" : "text-atrasado-tinta text-sm"}
          data-slot="resposta-dos-limites"
        >
          {resposta.texto}
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {limites.map((l) => (
          <li
            key={l.categoria}
            className="border-borda rounded-ciaara flex flex-col gap-2 border p-3"
            data-slot="limite-do-curriculo"
            data-categoria={l.categoria}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-texto text-sm">
                <strong>{l.categoria}</strong> ·{" "}
                {l.tempos === null ? (
                  <span data-slot="limite-nao-declarado">não declarado — vale {l.referencia}</span>
                ) : (
                  <span data-slot="limite-declarado">
                    {l.tempos} TA — {l.fonteArquivo}, p. {l.fontePagina}
                  </span>
                )}
              </p>
              {podeEditar ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => definirAberto(aberto === l.categoria ? null : l.categoria)}
                    data-slot="editar-limite"
                  >
                    {l.tempos === null ? "Declarar" : "Editar"}
                  </Button>
                  {l.tempos !== null ? (
                    <DialogoConfirmacao
                      titulo={`Retirar o limite de ${l.categoria}?`}
                      consequencia={`Sem o limite declarado, vale ${l.referencia}. O registro fica guardado como inativo.`}
                      rotuloConfirmar="Retirar"
                      aoConfirmar={() => void retirar(l.categoria)}
                    >
                      <Button type="button" size="sm" variant="ghost" disabled={gravando}>
                        Retirar
                      </Button>
                    </DialogoConfirmacao>
                  ) : null}
                </div>
              ) : null}
            </div>
            {aberto === l.categoria ? (
              <form
                action={(dados) => void gravar(l.categoria, dados)}
                className="flex flex-wrap items-end gap-3"
                data-slot="formulario-de-limite"
              >
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`limite-${l.categoria}-tempos`}>Limite (TA)</Label>
                  <Input
                    id={`limite-${l.categoria}-tempos`}
                    name="tempos"
                    inputMode="numeric"
                    required
                    defaultValue={l.tempos ?? ""}
                    className="w-28"
                  />
                </div>
                <div className="flex min-w-60 flex-1 flex-col gap-1">
                  <Label htmlFor={`limite-${l.categoria}-arquivo`}>Arquivo do currículo</Label>
                  <Input
                    id={`limite-${l.categoria}-arquivo`}
                    name="fonte_arquivo"
                    required
                    defaultValue={l.fonteArquivo ?? ""}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`limite-${l.categoria}-pagina`}>Página</Label>
                  <Input
                    id={`limite-${l.categoria}-pagina`}
                    name="fonte_pagina"
                    inputMode="numeric"
                    required
                    defaultValue={l.fontePagina ?? ""}
                    className="w-20"
                  />
                </div>
                <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-limite">
                  {gravando ? "Gravando…" : "Gravar"}
                </Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

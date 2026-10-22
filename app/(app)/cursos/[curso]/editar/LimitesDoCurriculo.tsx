/**
 * Os limites de AEC, TAD e TR do currículo, em *Editar curso* — spec 021, Bloco 6, ajuste 3 da conferência do PR #82
 * (21/10/2026: *"atividades/limites"*) — **folha de cliente**.
 *
 * ⚠️ É O QUE O QUADRO FINAL DO CURRÍCULO DECLARA (spec 014, FR-001.1), em TA, com o arquivo e a página. Só informativo
 *    (regra 6): nunca vira bloqueio de lançamento. Sem limite declarado, vale o percentual da norma.
 * ⚠️ NO CURRÍCULO EM USO, mudar ou retirar o que tinha valor é correção (RC-6): o banco pede a justificativa, e o diálogo
 *    único a pergunta. Declarar o que não havia é completar — livre.
 * ⚠️ DECLARAR E EDITAR ABREM UM DIÁLOGO (spec 022, Bloco 7, FR-002): até o Bloco 7 o formulário abria no lugar do limite.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { usePedidoDeJustificativa } from "@/components/ciaara/pedido-de-justificativa";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
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
  const [resposta, definirResposta] = React.useState<{ ok: boolean; texto: string } | null>(null);
  const [gravando, definirGravando] = React.useState(false);
  const { executar, dialogo } = usePedidoDeJustificativa();

  /** Grava; devolve a recusa (ou `null`) — o diálogo fica aberto na recusa, com o que foi digitado. */
  async function gravar(
    categoria: LimiteNaEdicao["categoria"],
    dados: FormData,
  ): Promise<string | null> {
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
    if (!r.ok) return r.erro;
    definirResposta({ ok: true, texto: `Limite de ${categoria} gravado.` });
    router.refresh();
    return null;
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
                <div className="flex gap-1">
                  <DialogoDeFormulario
                    titulo={`${l.tempos === null ? "Declarar" : "Editar"} o limite de ${l.categoria}`}
                    largo
                    slot="dialogo-do-limite"
                    gatilho={
                      <BotaoDeIcone
                        acao="editar"
                        rotulo={`${l.tempos === null ? "Declarar" : "Editar"} o limite de ${l.categoria}`}
                        data-slot="editar-limite"
                      />
                    }
                  >
                    {(fechar) => (
                      <FormularioDoLimite
                        limite={l}
                        gravando={gravando}
                        fechar={fechar}
                        gravar={(dados) => gravar(l.categoria, dados)}
                      />
                    )}
                  </DialogoDeFormulario>
                  {l.tempos !== null ? (
                    <DialogoConfirmacao
                      titulo={`Retirar o limite de ${l.categoria}?`}
                      consequencia={`Sem o limite declarado, vale ${l.referencia}. O registro fica guardado como inativo.`}
                      rotuloConfirmar="Retirar"
                      aoConfirmar={() => void retirar(l.categoria)}
                    >
                      <BotaoDeIcone
                        acao="retirar"
                        rotulo={`Retirar o limite de ${l.categoria}`}
                        variante="fantasma"
                        disabled={gravando}
                      />
                    </DialogoConfirmacao>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FormularioDoLimite({
  limite: l,
  gravando,
  fechar,
  gravar,
}: {
  readonly limite: LimiteNaEdicao;
  readonly gravando: boolean;
  readonly fechar: () => void;
  readonly gravar: (dados: FormData) => Promise<string | null>;
}) {
  const [erro, definirErro] = React.useState<string | null>(null);
  return (
    <form
      action={async (dados) => {
        definirErro(null);
        const recusa = await gravar(dados);
        if (recusa === null) fechar();
        else definirErro(recusa);
      }}
      className="flex flex-col gap-3"
      data-slot="formulario-de-limite"
    >
      <div className="flex flex-wrap items-end gap-3">
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
      </div>
      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm">
          {erro}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={fechar}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={gravando} data-slot="gravar-limite">
          {gravando ? "Gravando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

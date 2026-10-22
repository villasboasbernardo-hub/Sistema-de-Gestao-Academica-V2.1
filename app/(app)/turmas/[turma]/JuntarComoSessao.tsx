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
 * ⚠️ **A ESCOLHA ABRE NUM DIÁLOGO** (spec 022, Bloco 7, FR-002): até o Bloco 7 o seletor abria no lugar do botão.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { dataParaLeitura } from "@/lib/formato/data";

type Resultado = { readonly ok: true } | { readonly ok: false; readonly erro: string };
type Acao = (entrada: unknown) => Promise<Resultado>;

type Opcao = { readonly id: string; readonly rotulo: string; readonly aplicacao: string };

export function JuntarComoSessao({
  avaliacaoId,
  opcoes,
  juntar,
}: {
  readonly avaliacaoId: string;
  /** As provas da disciplina em que esta avaliação pode virar sessão (rótulo pronto). */
  readonly opcoes: readonly Opcao[];
  readonly juntar: Acao;
}) {
  if (opcoes.length === 0) return null;
  return (
    <DialogoDeFormulario
      titulo="Juntar como sessão de outra prova"
      slot="formulario-de-juntar"
      gatilho={
        <BotaoDeIcone
          acao="juntar"
          rotulo="Juntar como sessão de outra prova"
          data-slot="juntar-como-sessao"
        />
      }
    >
      {(fechar) => (
        <FormularioDeJuntar
          avaliacaoId={avaliacaoId}
          opcoes={opcoes}
          juntar={juntar}
          fechar={fechar}
        />
      )}
    </DialogoDeFormulario>
  );
}

function FormularioDeJuntar({
  avaliacaoId,
  opcoes,
  juntar,
  fechar,
}: {
  readonly avaliacaoId: string;
  readonly opcoes: readonly Opcao[];
  readonly juntar: Acao;
  readonly fechar: () => void;
}) {
  const router = useRouter();
  const [provaId, setProvaId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, iniciar] = useTransition();

  return (
    <form
      className="flex flex-col gap-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        iniciar(async () => {
          const r = await juntar({ provaId, avaliacaoId });
          if (r.ok) {
            fechar();
            router.refresh();
          } else setErro(r.erro);
        });
      }}
    >
      <label className="flex flex-col gap-1">
        <span>Sessão da prova</span>
        <select
          value={provaId}
          onChange={(e) => setProvaId(e.target.value)}
          className="border-borda-forte bg-superficie rounded-ciaara h-8 border px-2"
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
      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm">
          {erro}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={fechar} disabled={gravando}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={gravando || provaId === ""}>
          {gravando ? "Juntando…" : "Juntar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

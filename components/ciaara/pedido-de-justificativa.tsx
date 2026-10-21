"use client";

/**
 * O pedido de justificativa da correção de um currículo em uso — spec 021, Bloco 6, RC-6 (Bernardo Villas Boas,
 * 21/10/2026) — **folha de cliente**, UMA para todas as telas de edição do currículo.
 *
 * > *"RC-6 · Correção de erro. Corrigir um currículo que já tem turma com lançamento (mudar valor, acrescentar ou
 * > inativar item) é permitido só ao trio (…), com justificativa obrigatória e trilha (quem, quando, o quê, valor
 * > anterior). Completar o que estava vazio é livre."*
 *
 * ⚠️ QUEM DECIDE SE A JUSTIFICATIVA É PRECISA É O BANCO: a gravação vai primeiro sem ela; se o banco responder que a
 *    correção a exige (`pedeJustificativa`), este diálogo a pergunta e a gravação vai de novo, com ela. Completar o vazio
 *    e editar o currículo que ninguém usa passam direto, sem pergunta nenhuma — a tela não precisa saber qual é o caso.
 * ⚠️ O mínimo (5 letras) é o do banco e o da validação (`MINIMO_DA_JUSTIFICATIVA`), num lugar só.
 * ⚠️ O componente não conhece ação nenhuma (Princípio XI): recebe a chamada e a repete.
 */
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MAXIMO_DA_JUSTIFICATIVA, MINIMO_DA_JUSTIFICATIVA } from "@/lib/validacao/justificativa";

/** O mínimo que o resultado de uma ação precisa ter para o pedido funcionar. */
export type ResultadoQuePedeJustificativa = {
  readonly ok: boolean;
  readonly pedeJustificativa?: true | undefined;
};

const CAMPO =
  "border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca w-full border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none";

/**
 * `executar(chamar)` grava; se o banco pedir a justificativa, pergunta e grava de novo com ela. `dialogo` vai no JSX de
 * quem usa. Cancelar devolve a recusa original (e a tela mostra a frase dela).
 */
export function usePedidoDeJustificativa(): {
  readonly executar: <R extends ResultadoQuePedeJustificativa>(
    chamar: (justificativa?: string) => Promise<R>,
  ) => Promise<R>;
  readonly dialogo: React.ReactNode;
} {
  const [aberto, definirAberto] = React.useState(false);
  const [texto, definirTexto] = React.useState("");
  const resolver = React.useRef<((justificativa: string | null) => void) | null>(null);

  const responder = React.useCallback((justificativa: string | null) => {
    resolver.current?.(justificativa);
    resolver.current = null;
    definirAberto(false);
  }, []);

  const executar = React.useCallback(
    async <R extends ResultadoQuePedeJustificativa>(
      chamar: (justificativa?: string) => Promise<R>,
    ): Promise<R> => {
      const primeiro = await chamar(undefined);
      if (primeiro.ok || !primeiro.pedeJustificativa) return primeiro;
      definirTexto("");
      definirAberto(true);
      const justificativa = await new Promise<string | null>((r) => {
        resolver.current = r;
      });
      return justificativa === null ? primeiro : chamar(justificativa);
    },
    [],
  );

  const curto = texto.trim().length < MINIMO_DA_JUSTIFICATIVA;
  const dialogo = (
    <Dialog open={aberto} onOpenChange={(abrir) => (abrir ? undefined : responder(null))}>
      <DialogContent data-slot="pedido-de-justificativa">
        <DialogHeader>
          <DialogTitle>Justifique a correção</DialogTitle>
          <DialogDescription>
            Este currículo é seguido por turma que já tem lançamento. A correção fica registrada com
            o seu nome, a data, o valor anterior e esta justificativa.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1">
          <label htmlFor="justificativa-da-correcao" className="text-texto text-sm font-medium">
            Justificativa
          </label>
          <textarea
            id="justificativa-da-correcao"
            rows={3}
            maxLength={MAXIMO_DA_JUSTIFICATIVA}
            value={texto}
            onChange={(e) => definirTexto(e.target.value)}
            className={CAMPO}
            data-slot="justificativa-da-correcao"
          />
          <p className="text-texto-suave text-xs">Ao menos {MINIMO_DA_JUSTIFICATIVA} letras.</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => responder(null)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={curto}
            onClick={() => responder(texto.trim())}
            data-slot="confirmar-justificativa"
          >
            Corrigir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { executar, dialogo };
}

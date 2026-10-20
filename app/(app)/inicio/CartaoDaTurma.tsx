/**
 * O cartão da turma no carrossel do Início — spec 019 (Bloco 4), C-7 — componente de servidor.
 *
 * ⚠️ **NENHUMA CONTA AQUI**: o percentual, a executada e o *em atraso* chegam de `andamentoDaTurma`, pelo panorama
 *    (SC-005: o número do cartão é o mesmo de antes).
 * ⚠️ **O LINK DO DSA É IRMÃO DO CARTÃO, E NÃO FILHO** — o cartão já é um `<Link>`, e link dentro de link é HTML
 *    inválido (o navegador o "conserta" mudando o destino). É o desenho de antes do Bloco 4.
 */
import Link from "next/link";

import { BadgeStatus } from "@/components/ciaara/badge-status";
import { BarraDeProgresso } from "@/components/ciaara/barra-de-progresso";
import { AVISO_DE_TURMA_EAD } from "@/lib/dominio/dsa/ead-puro";
import { enderecoDaTurmaNoCurso, enderecoDoDsa } from "@/lib/navegacao/endereco-de-turma";

import type { TurmaNoPanorama } from "./panorama";

const TOM_DA_TURMA = {
  planejada: "planejado",
  ativa: "executado",
  concluida: "inativo",
  cancelada: "conflito",
} as const;

export function CartaoDaTurma({ turma: t }: { readonly turma: TurmaNoPanorama }) {
  return (
    <div className="flex h-full flex-col gap-1" data-slot="cartao-da-turma">
      {/* ⚠️ E PEDE A ABA GRADE (spec 016, FR-006.3): sem `aba=grade` o cartão abriria a aba que não mostra a turma. */}
      <Link
        href={enderecoDaTurmaNoCurso(t.cursoCodigo, t.turmaCodigo, "grade")}
        data-turma={t.turmaCodigo}
        className="border-borda bg-superficie rounded-ciaara hover:bg-marca-suave focus-visible:ring-marca flex flex-1 flex-col gap-2 border p-3 focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-texto truncate text-sm font-medium">
            {t.cursoCodigo} · {t.turmaCodigo}
          </span>
          <span className="text-texto-suave truncate text-xs">
            {t.nomeCurso} — {t.anoLetivo}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <BadgeStatus
            tom={TOM_DA_TURMA[t.status as keyof typeof TOM_DA_TURMA] ?? "planejado"}
            rotulo={t.status}
          />
          {t.emAtraso ? <BadgeStatus tom="atrasado" rotulo="em atraso" /> : null}
        </span>
        <BarraDeProgresso
          valor={t.percentual}
          rotuloAcessivel={`Carga executada de ${t.turmaCodigo}`}
          tom={t.emAtraso ? "atrasado" : "executado"}
        />
        <span className="text-texto text-sm tabular-nums" data-progresso={t.percentual}>
          {t.executada}/{t.prevista} TA · {t.percentual}%
        </span>
      </Link>
      {/* ⚠️ TURMA EAD PURO: O AVISO NO LUGAR DO LINK (item 9 da conferência do PR #40) — a frase de `ead-puro.ts`. */}
      {t.eadPuro ? (
        <p className="text-texto-suave pl-1 text-xs" data-slot="dsa-turma-ead">
          {AVISO_DE_TURMA_EAD}
        </p>
      ) : (
        <p className="pl-1 text-xs">
          <Link
            href={enderecoDoDsa(t.turmaCodigo)}
            className="text-texto-suave hover:text-texto underline-offset-2 hover:underline"
            data-slot="dsa-da-semana"
          >
            DSA da semana →
          </Link>
        </p>
      )}
    </div>
  );
}

/**
 * O cartão da turma no carrossel do Início — spec 019 (Bloco 4), C-7, com os ajustes A-2 a A-4 da conferência de
 * 20/10/2026 — componente de servidor.
 *
 * > *"CARTÕES DO INÍCIO MAIORES (…). TÍTULO DO CARTÃO: só o nome da turma (ex.: "C-Ap-HN 2026"), sem repetir o nome do
 * > curso — a sigla já está no nome da turma. CLIQUE NO CARTÃO leva à FICHA DA TURMA (endereço pelo módulo único de
 * > endereço de turma), não mais ao curso."* — Bernardo Villas Boas, 20/10/2026
 *
 * ⚠️ **NENHUMA CONTA AQUI**: o percentual, a executada e o *em atraso* chegam de `andamentoDaTurma`, pelo panorama
 *    (SC-005: o número do cartão é o mesmo de antes).
 * ⚠️ **O CARTÃO LEVA À FICHA, E NÃO À PÁGINA DO CURSO** (A-4) — a decisão nominal de Bernardo diante do `RF-INI-03`
 *    **[PRESERVADO]** (*"ponto de entrada para a Página do Curso"*); o curso continua a um clique, pela ficha.
 * ⚠️ **O LINK DO DSA É IRMÃO DO CARTÃO, E NÃO FILHO** — o cartão já é um `<Link>`, e link dentro de link é HTML
 *    inválido (o navegador o "conserta" mudando o destino). É o desenho de antes do Bloco 4.
 */
import Link from "next/link";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { BadgeStatus } from "@/components/ciaara/badge-status";
import { BarraDeProgresso } from "@/components/ciaara/barra-de-progresso";
import { AVISO_DE_TURMA_EAD } from "@/lib/dominio/dsa/ead-puro";
import { enderecoDaTurma, enderecoDoDsa } from "@/lib/navegacao/endereco-de-turma";

import type { TurmaNoPanorama } from "./panorama";

const TOM_DA_TURMA = {
  planejada: "planejado",
  ativa: "executado",
  concluida: "inativo",
  cancelada: "conflito",
} as const;

export function CartaoDaTurma({ turma: t }: { readonly turma: TurmaNoPanorama }) {
  return (
    <div className="flex h-full flex-col gap-1.5" data-slot="cartao-da-turma">
      <Link
        href={enderecoDaTurma(t.turmaCodigo)}
        data-turma={t.turmaCodigo}
        className="border-borda bg-superficie rounded-ciaara hover:bg-marca-suave focus-visible:ring-marca flex flex-1 flex-col gap-3 border p-4 focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="text-texto truncate text-base font-semibold" data-slot="titulo-do-cartao">
          {t.turmaCodigo}
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
          className="h-3"
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
        <p className="flex justify-end pl-1 text-xs">
          {/* Spec 022 (FR-001): abrir o DSA é um verbo padrão — o ícone, com o nome de antes na dica. */}
          <BotaoDeIcone
            acao="abrir-dsa"
            rotulo="DSA da semana"
            variante="fantasma"
            href={enderecoDoDsa(t.turmaCodigo)}
            data-slot="dsa-da-semana"
          />
        </p>
      )}
    </div>
  );
}

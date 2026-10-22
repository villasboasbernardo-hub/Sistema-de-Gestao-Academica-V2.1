/**
 * O painel de `/turmas` — seis indicadores de UM ano (Bloco 2, item 4; spec 017, FR-005; o card *Planejadas* e o ano
 * único são do ajuste da conferência de 19/10/2026).
 *
 * ⚠️ **O QUADRO "O QUE FALTA NAS TURMAS" SAIU DAQUI NO BLOCO 7** (spec 022, FR-004.4; A-2): a janela sem data, a
 *    disciplina sem instrutor e o conflito no DSA desta semana moram na página Avisos, pelo sininho. Os números ficam.
 * ⚠️ **SERVIDOR**: os números chegam prontos de `painelDeTurmas`; aqui só se desenha.
 * ⚠️ **O SELETOR DE ANO SAIU DAQUI** (spec 019, ajuste A-1 de 20/10/2026): ele mora no cabeçalho da página, no canto
 *    superior direito — o mesmo lugar do Início.
 * ⚠️ **"NÃO PUDE LER" É DITO, NUNCA ZERO** (FR-005.4, gotcha 4): o tipo de aviso cuja leitura falhou aparece como tal.
 */
import { CardKpi } from "@/components/ciaara/card-kpi";
import type { IndicadoresDeTurmas } from "@/lib/dominio/painel-de-turmas";

export function PainelDeTurmas({
  indicadores,
  diasDeAviso,
  ano,
}: {
  readonly indicadores: IndicadoresDeTurmas;
  readonly diasDeAviso: number | null;
  /** O ano que o painel mostra. */
  readonly ano: number;
}) {
  const cards: readonly (readonly [keyof IndicadoresDeTurmas, string])[] = [
    ["total", "Total"],
    ["planejadas", "Planejadas"],
    ["emAndamento", "Em andamento"],
    ["concluidas", "Concluídas"],
    ["canceladas", "Canceladas"],
    [
      "iniciando",
      diasDeAviso === null ? "Iniciando em breve" : `Iniciando em até ${diasDeAviso} dias`,
    ],
  ];

  return (
    <section
      aria-label="Painel de turmas"
      className="flex flex-col gap-3"
      data-slot="painel-de-turmas"
      data-ano={ano}
    >
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(([chave, rotulo]) => (
          <div key={chave} data-slot="indicador-de-turmas" data-chave={chave}>
            <CardKpi
              rotulo={rotulo}
              valor={indicadores[chave] === null ? "—" : String(indicadores[chave])}
              {...(indicadores[chave] === null ? { unidade: "parâmetro não lido" } : {})}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

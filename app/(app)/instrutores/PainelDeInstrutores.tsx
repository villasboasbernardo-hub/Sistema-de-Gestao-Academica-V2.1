/**
 * Os três indicadores e os nove gráficos da listagem (`FR-026`, `FR-026.1`, `FR-026.2` e `FR-026.5` da
 * spec 006, com as emendas de 15/09/2026, decisão de Bernardo Villas Boas).
 *
 * ⚠️ SEM MARCADOR DE CLIENTE. `CardKpi` é servidor; `GraficoBarras` e `GraficoPizza` são folhas de
 * cliente e recebem só séries prontas. O botão de exibir e ocultar é outra folha,
 * `EstatisticasRecolhiveis`, que recebe este conteúdo já desenhado no servidor. Nada aqui calcula: as
 * contagens chegam das funções de `lib/dominio/`.
 *
 * ⚠️ A TAXA DE SELEÇÃO MOSTRA OS DOIS ABSOLUTOS NO NÚMERO GRANDE, e o percentual embaixo, menor
 * (`FR-026.1`). Quando passa de 100% é justamente o absoluto que explica por quê.
 *
 * ⚠️ UMA COR POR CATEGORIA, DA PALETA `--serie-N`. Barras com `corPorCategoria`; pizza já pinta cada fatia
 * pela ordem fixa do ponto único. A elevação fica no **cartão**, pelo token `shadow-ciaara-1` — o
 * documento 23 §7 veda sombra, 3D e perspectiva **no gráfico**, e a pizza inclinada distorceria o
 * percentual.
 *
 * ⚠️ CADA GRÁFICO LEVA A FORMA E A ORDEM DAS BARRAS EM ATRIBUTO. É o que a ponta a ponta lê para contar
 * três de barras e seis de pizza e provar a antiguidade no gráfico de posto, sem depender de como a
 * biblioteca desenha.
 */
import { CardKpi } from "@/components/ciaara/card-kpi";
import { GraficoBarras } from "@/components/graficos/grafico-barras";
import { GraficoPizza } from "@/components/graficos/grafico-pizza";
import type { Serie } from "@/components/graficos/tipos";
import { rotuloDaCategoria, rotuloDoRegime } from "@/lib/constantes/instrutor";
import type { GraficoDeInstrutores } from "@/lib/dominio/graficos-instrutor";
import { NAO_INFORMADO } from "@/lib/dominio/graficos-instrutor";
import type { IndicadoresDeInstrutores } from "@/lib/dominio/indicadores-instrutor";

import { EstatisticasRecolhiveis } from "./EstatisticasRecolhiveis";

const numero = (n: number) => n.toLocaleString("pt-BR");

/** O nome exibido de uma barra ou fatia: regime e classificação ganham rótulo; o resto é o dado. */
function nomeExibido(grafico: GraficoDeInstrutores, nome: string): string {
  if (grafico.chave === "regime" && nome !== NAO_INFORMADO) return rotuloDoRegime(nome);
  if (grafico.chave === "classificacao") return rotuloDaCategoria(nome);
  return nome;
}

function serieDe(grafico: GraficoDeInstrutores): Serie {
  return {
    chave: grafico.chave,
    rotulo: "Instrutores",
    forma: "quadrado",
    pontos: grafico.barras.map((b) => ({ nome: nomeExibido(grafico, b.nome), valor: b.valor })),
  };
}

export function PainelDeInstrutores({
  indicadores,
  graficos,
}: {
  readonly indicadores: IndicadoresDeInstrutores;
  readonly graficos: readonly GraficoDeInstrutores[];
}) {
  const { taxaDeSelecao: taxa } = indicadores;

  return (
    <EstatisticasRecolhiveis>
      <section aria-label="Indicadores e gráficos" className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3" data-slot="indicadores-de-instrutores">
          <CardKpi rotulo="Total de instrutores" valor={numero(indicadores.total)} />
          <CardKpi
            rotulo="Com capacitação didática"
            valor={numero(indicadores.comCapacitacaoDidatica)}
          />
          <div className="flex flex-col gap-1" data-slot="taxa-de-selecao">
            <CardKpi
              rotulo="Habilitados × selecionados"
              valor={`${numero(taxa.habilitados)} × ${numero(taxa.selecionados)}`}
              className="flex-1"
            />
            <p className="text-texto-suave px-1 text-xs tabular-nums">
              {taxa.percentual === null
                ? "Sem habilitado no recorte: taxa de seleção indefinida."
                : `Selecionados sobre habilitados: ${Math.round(taxa.percentual).toLocaleString("pt-BR")}%`}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2" data-slot="graficos-de-instrutores">
          {graficos.map((g) => (
            <div
              key={g.chave}
              data-slot="grafico-de-instrutores"
              data-chave={g.chave}
              data-forma={g.forma}
              data-barras={JSON.stringify(g.barras.map((b) => b.nome))}
              className="border-borda bg-superficie rounded-ciaara shadow-ciaara-1 flex flex-col gap-1 border p-3"
            >
              {g.forma === "pizza" ? (
                <GraficoPizza serie={serieDe(g)} rotulo={g.titulo} altura={240} />
              ) : (
                <GraficoBarras
                  series={[serieDe(g)]}
                  rotulo={g.titulo}
                  altura={240}
                  corPorCategoria
                />
              )}
              {g.chave === "capacitacao" ? (
                /* veste: a dica que explica por que as fatias passam do total — texto fixo, nunca dado */
                <p className="text-texto-tenue text-xs">
                  Quem tem duas qualificações conta nas duas fatias; o percentual é sobre a soma das
                  fatias.
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </EstatisticasRecolhiveis>
  );
}

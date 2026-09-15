/**
 * Os quatro indicadores e os sete gráficos da listagem (`FR-026`, `FR-026.1` e `FR-026.2` da spec 006).
 *
 * ⚠️ SEM MARCADOR DE CLIENTE. `CardKpi` é servidor; `GraficoBarras` é folha de cliente e recebe só
 * séries prontas, que são serializáveis. Nada aqui calcula: as contagens chegam das funções de
 * `lib/dominio/`, e este arquivo só escolhe o componente e a forma do marcador.
 *
 * ⚠️ A TAXA DE SELEÇÃO MOSTRA OS DOIS ABSOLUTOS NO NÚMERO GRANDE, e o percentual embaixo, menor
 * (`FR-026.1`). Pôr o percentual no número grande esconderia o que ele resume — e quando passa de
 * 100% é justamente o absoluto que explica por quê.
 *
 * ⚠️ CADA GRÁFICO LEVA A ORDEM DAS BARRAS EM `data-barras`. É o que a ponta a ponta lê para provar a
 * antiguidade no gráfico de posto/graduação sem depender de como a biblioteca desenha o eixo.
 */
import { CardKpi } from "@/components/ciaara/card-kpi";
import { GraficoBarras } from "@/components/graficos/grafico-barras";
import type { Serie } from "@/components/graficos/tipos";
import { rotuloDoRegime } from "@/lib/constantes/instrutor";
import type { GraficoDeInstrutores } from "@/lib/dominio/graficos-instrutor";
import { NAO_INFORMADO } from "@/lib/dominio/graficos-instrutor";
import type { IndicadoresDeInstrutores } from "@/lib/dominio/indicadores-instrutor";

const numero = (n: number) => n.toLocaleString("pt-BR");

/** O nome exibido de uma barra: o regime ganha o rótulo do enum; o resto é o próprio dado. */
function nomeExibido(grafico: GraficoDeInstrutores, nome: string): string {
  if (grafico.chave === "regime" && nome !== NAO_INFORMADO) return rotuloDoRegime(nome);
  return nome;
}

function serieDe(grafico: GraficoDeInstrutores): Serie[] {
  return [
    {
      chave: grafico.chave,
      rotulo: "Instrutores",
      forma: "quadrado",
      pontos: grafico.barras.map((b) => ({ nome: nomeExibido(grafico, b.nome), valor: b.valor })),
    },
  ];
}

export function PainelDeInstrutores({
  indicadores,
  graficos,
  ano,
}: {
  readonly indicadores: IndicadoresDeInstrutores;
  readonly graficos: readonly GraficoDeInstrutores[];
  readonly ano: number;
}) {
  const { taxaDeSelecao: taxa } = indicadores;

  return (
    <section aria-label="Indicadores e gráficos" className="flex flex-col gap-4">
      <div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        data-slot="indicadores-de-instrutores"
      >
        <CardKpi rotulo="Total de instrutores" valor={numero(indicadores.total)} />
        <CardKpi
          rotulo="Com capacitação didática"
          valor={numero(indicadores.comCapacitacaoDidatica)}
        />
        <CardKpi
          rotulo={`CH ministrada em ${ano}`}
          valor={
            indicadores.cargaMinistradaNoAno === null
              ? "—"
              : numero(indicadores.cargaMinistradaNoAno)
          }
          unidade="TA"
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
            data-barras={JSON.stringify(g.barras.map((b) => b.nome))}
            className="border-borda rounded-ciaara border p-3"
          >
            <GraficoBarras series={serieDe(g)} rotulo={g.titulo} altura={220} />
          </div>
        ))}
      </div>
    </section>
  );
}

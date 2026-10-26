/**
 * As estatísticas do catálogo (`FR-002`, `FR-048`; spec 022, item 10; spec 025, Bloco 10, item 6).
 *
 * > *"Estatísticas de cursos — um card por classificação (Regulares, Expeditos, Especiais, Estágios de Qualificação,
 * > Aperfeiçoamento Avançado, demais), um card com o TOTAL de cursos e estágios do CIAARA-11, e um card com a
 * > quantidade em cada classificação."* — Bernardo Villas Boas, 24/10/2026
 *
 * ⚠️ **O PAINEL É O DA PÁGINA** (RT-4, D-18): o ícone *Estatísticas* na barra de ações abre o `ConteudoDePainel` que
 *    envolve este bloco. O `EstatisticasRecolhiveis` de antes, com o botão de texto *"Exibir estatísticas"*, saiu.
 * ⚠️ **SETE CARTÕES DO MESMO TAMANHO, JUNTOS** (RT-7): o total primeiro, depois as cinco classificações na ordem do
 *    sistema e os demais. Os seis somam o total (SC-006 da spec 025), e todos contam **as mesmas linhas** do catálogo
 *    — com filtro, o recorte; por isso o total diz *"neste recorte"* quando há um (`FR-012`).
 * ⚠️ **O CARTÃO "COM A QUANTIDADE EM CADA CLASSIFICAÇÃO"** é a pizza: a legenda dá o número e a porcentagem de cada uma,
 *    e clicar nela tira o grupo (RT-5). A duração em semanas de cada curso continua ao lado (item 10 da spec 022).
 * ⚠️ **CURSO SEM A DURAÇÃO EM SEMANAS NÃO VIRA BARRA ZERO** — ela se leria como "dura zero semanas". Ele é nomeado
 *    abaixo do gráfico.
 * ⚠️ **SEM MARCADOR DE CLIENTE.** `CardKpi` é servidor; os gráficos são folhas e recebem séries **prontas** — as contas
 *    são de `lib/dominio/indicadores-do-catalogo.ts`.
 */
import { CardKpi } from "@/components/ciaara/card-kpi";
import { GraficoBarras } from "@/components/graficos/grafico-barras";
import { GraficoPizza } from "@/components/graficos/grafico-pizza";
import type { Serie } from "@/components/graficos/tipos";
import type { IndicadoresDoCatalogo as Agregados } from "@/lib/dominio/indicadores-do-catalogo";

/** O cartão de cada gráfico — o mesmo de `PainelDeInstrutores`. */
const CARTAO =
  "border-borda bg-superficie rounded-ciaara shadow-ciaara-1 flex flex-col gap-1 border p-3";

export function IndicadoresDoCatalogo({
  agregados,
  recorte = false,
}: {
  readonly agregados: Agregados;
  /** Há filtro fora do padrão: os números são do recorte, e o total diz isso. */
  readonly recorte?: boolean;
}) {
  /* Pizza: a classificação sem curso não vira fatia de 0% — ela não tem área para mostrar. */
  const porClassificacao: Serie = {
    chave: "cursos-por-classificacao",
    rotulo: "Cursos",
    forma: "circulo",
    pontos: [
      ...agregados.cursosPorClassificacao
        .filter((c) => c.total > 0)
        .map((c) => ({ nome: c.rotulo, valor: c.total })),
      ...(agregados.demais > 0 ? [{ nome: "Demais", valor: agregados.demais }] : []),
    ],
  };

  const duracao: Serie = {
    chave: "duracao-em-semanas",
    rotulo: "Duração (semanas)",
    forma: "quadrado",
    pontos: agregados.duracaoEmSemanas.porCurso.map((d) => ({ nome: d.codigo, valor: d.semanas })),
  };
  const semDuracao = agregados.duracaoEmSemanas.semInformacao;

  return (
    <section aria-label="Indicadores do catálogo" className="flex flex-col gap-4">
      <div
        className="grid auto-rows-fr gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7"
        data-slot="indicadores-do-catalogo"
      >
        <div className="contents" data-classificacao="total">
          <CardKpi
            rotulo="Total de cursos e estágios do CIAARA-11"
            valor={agregados.total}
            {...(recorte ? { detalhe: "neste recorte" } : {})}
          />
        </div>
        {agregados.cursosPorClassificacao.map((c) => (
          <div key={c.classificacao} className="contents" data-classificacao={c.classificacao}>
            <CardKpi rotulo={c.rotuloDoCartao} valor={c.total} />
          </div>
        ))}
        <div className="contents" data-classificacao="demais">
          <CardKpi rotulo="Demais cursos" valor={agregados.demais} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2" data-slot="graficos-do-catalogo">
        <div className={CARTAO} data-slot="grafico-do-catalogo" data-chave="por-classificacao">
          <GraficoPizza
            serie={porClassificacao}
            rotulo="Quantidade de cursos em cada classificação"
            altura={240}
          />
        </div>
        <div
          className={CARTAO}
          data-slot="grafico-do-catalogo"
          data-chave="duracao-em-semanas"
          data-barras={JSON.stringify(duracao.pontos.map((p) => p.nome))}
        >
          <GraficoBarras
            series={[duracao]}
            rotulo="Duração em semanas de cada curso e estágio"
            rotuloDoEixoY="Semanas"
            altura={300}
            corPorCategoria
          />
          {semDuracao.length > 0 ? (
            <p className="text-texto-suave text-xs" data-slot="cursos-sem-duracao">
              Sem a duração em semanas no currículo vigente: {semDuracao.join(", ")}.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

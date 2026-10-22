/**
 * Os dois indicadores e os dois gráficos do catálogo (`FR-002`, `FR-048`; spec 022, item 10).
 *
 * > *"Cursos: estatísticas no mesmo componente/estilo das de Instrutores — cursos por classificação e duração em
 * > semanas de cada curso/estágio; remova o de duração média por classificação."* — Bernardo Villas Boas, 22/10/2026
 *
 * ⚠️ **O MESMO PAINEL DE INSTRUTORES**: `EstatisticasRecolhiveis` (nasce recolhido, abrir não mexe na URL), os
 *    números em `CardKpi` e cada gráfico num cartão com borda e elevação, como em `PainelDeInstrutores`.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** `CardKpi` é servidor; os gráficos e o painel são folhas de cliente e recebem séries
 * **prontas**. Nada aqui calcula: as contagens chegam de `lib/dominio/indicadores-do-catalogo.ts`.
 *
 * ⚠️ **SÃO QUATRO COISAS, E A LISTA É FECHADA** (A-6, 17/09/2026). A duração média em dias por classificação saiu e
 * a duração em semanas de cada curso entrou no lugar dela (item 10) — trocada, não acrescentada. Total de cursos,
 * turmas ativas e os indicadores de turma seguem na `PEND-5a-2`.
 *
 * ⚠️ **CURSO SEM A DURAÇÃO EM SEMANAS NÃO VIRA BARRA ZERO** — ela se leria como "dura zero semanas". Ele é nomeado
 * abaixo do gráfico.
 */
import { CardKpi } from "@/components/ciaara/card-kpi";
import { EstatisticasRecolhiveis } from "@/components/ciaara/estatisticas-recolhiveis";
import { GraficoBarras } from "@/components/graficos/grafico-barras";
import { GraficoPizza } from "@/components/graficos/grafico-pizza";
import type { Serie } from "@/components/graficos/tipos";
import type { IndicadoresDoCatalogo as Agregados } from "@/lib/dominio/indicadores-do-catalogo";

/** O cartão de cada gráfico — o mesmo de `PainelDeInstrutores`. */
const CARTAO =
  "border-borda bg-superficie rounded-ciaara shadow-ciaara-1 flex flex-col gap-1 border p-3";

export function IndicadoresDoCatalogo({ agregados }: { readonly agregados: Agregados }) {
  /* Pizza: a classificação sem curso não vira fatia de 0% — ela não tem área para mostrar. */
  const porClassificacao: Serie = {
    chave: "cursos-por-classificacao",
    rotulo: "Cursos",
    forma: "circulo",
    pontos: agregados.cursosPorClassificacao
      .filter((c) => c.total > 0)
      .map((c) => ({ nome: c.rotulo, valor: c.total })),
  };

  const duracao: Serie = {
    chave: "duracao-em-semanas",
    rotulo: "Duração (semanas)",
    forma: "quadrado",
    pontos: agregados.duracaoEmSemanas.porCurso.map((d) => ({ nome: d.codigo, valor: d.semanas })),
  };
  const semDuracao = agregados.duracaoEmSemanas.semInformacao;

  return (
    <EstatisticasRecolhiveis id="estatisticas-do-catalogo">
      <section aria-label="Indicadores do catálogo" className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2" data-slot="indicadores-do-catalogo">
          <CardKpi rotulo="Cursos regulares" valor={agregados.cursosRegulares} />
          <CardKpi rotulo="Estágios de qualificação" valor={agregados.estagiosDeQualificacao} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2" data-slot="graficos-do-catalogo">
          <div className={CARTAO} data-slot="grafico-do-catalogo" data-chave="por-classificacao">
            <GraficoPizza serie={porClassificacao} rotulo="Cursos por classificação" altura={240} />
          </div>
          <div className={CARTAO} data-slot="grafico-do-catalogo" data-chave="duracao-em-semanas">
            <GraficoBarras
              series={[duracao]}
              rotulo="Duração em semanas de cada curso e estágio"
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
    </EstatisticasRecolhiveis>
  );
}

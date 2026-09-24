/**
 * Os dois indicadores e os dois gráficos do catálogo (`FR-002`, `FR-048`).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** `CardKpi` é servidor; `GraficoBarras` é folha de cliente e recebe
 * séries **prontas**. Nada aqui calcula: as contagens chegam de `lib/dominio/indicadores-do-catalogo.ts`,
 * que não sabe que existe tela.
 *
 * ⚠️ **SÃO QUATRO COISAS, E A LISTA É FECHADA** (A-6, 17/09/2026). Total de cursos, turmas ativas e os
 * indicadores de turma foram para a `PEND-5a-2`. Acrescentar um quinto aqui é entregar o que foi
 * adiado — decisão do Bernardo, não manutenção.
 *
 * ⚠️ **A MÉDIA É EM DIAS, E O RÓTULO DIZ ISSO.** `duracao_dias` está preenchida em todos os cursos;
 * `duracao_semanas` tem 12 vazias. Um eixo que dissesse só "duração" deixaria o leitor supor semanas.
 *
 * ⚠️ **CLASSIFICAÇÃO SEM CURSO NÃO VIRA BARRA ZERO NA MÉDIA.** `dias` é `null` ali, e barra nenhuma é
 * desenhada: uma barra no chão se lê como "a média é zero dias", que é outro fato.
 */
import { CardKpi } from "@/components/ciaara/card-kpi";
import { GraficoBarras } from "@/components/graficos/grafico-barras";
import type { Serie } from "@/components/graficos/tipos";
import type { IndicadoresDoCatalogo as Agregados } from "@/lib/dominio/indicadores-do-catalogo";

export function IndicadoresDoCatalogo({ agregados }: { readonly agregados: Agregados }) {
  const duracaoMedia: Serie = {
    chave: "duracao-media",
    rotulo: "Duração média (dias)",
    forma: "quadrado",
    pontos: agregados.duracaoMediaPorClassificacao
      .filter((d) => d.dias !== null)
      .map((d) => ({ nome: d.rotulo, valor: d.dias as number })),
  };

  const porClassificacao: Serie = {
    chave: "cursos-por-classificacao",
    rotulo: "Cursos",
    forma: "circulo",
    pontos: agregados.cursosPorClassificacao.map((c) => ({ nome: c.rotulo, valor: c.total })),
  };

  return (
    <section aria-label="Indicadores do catálogo" className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2" data-slot="indicadores-do-catalogo">
        <CardKpi rotulo="Cursos regulares" valor={agregados.cursosRegulares} />
        <CardKpi rotulo="Estágios de qualificação" valor={agregados.estagiosDeQualificacao} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GraficoBarras
          series={[duracaoMedia]}
          rotulo="Duração média, em dias, por classificação"
          altura={240}
          corPorCategoria
        />
        <GraficoBarras
          series={[porClassificacao]}
          rotulo="Cursos por classificação"
          altura={240}
          corPorCategoria
        />
      </div>
    </section>
  );
}

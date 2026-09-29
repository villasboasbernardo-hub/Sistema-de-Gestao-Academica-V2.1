/**
 * A proporção da CH prevista entre as disciplinas da vista (`FR-054`).
 *
 * ⚠️ **ELE LÊ AS MESMAS LINHAS DA TABELA, e por isso muda junto com o filtro** (`SC-011`). Uma
 * consulta própria mostraria a proporção do curso inteiro ao lado de uma tabela filtrada, e a
 * divergência seria invisível: os dois pareceriam certos.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE PRÓPRIO.** Ele é importado por `GradeDeDisciplinas.tsx`, que é a
 * fronteira; um segundo marcador não mudaria o que vai para o navegador e encheria a lista fechada
 * de folhas com um arquivo que não é fronteira de nada.
 *
 * ⚠️ **MAIS DE SEIS DISCIPLINAS VIRAM "as maiores + o resto"**, e isso não é enfeite: o documento 23
 * §7 limita o gráfico a seis séries — *"acima disso vira tabela"* —, e a tabela está logo abaixo. Um
 * gráfico de 30 fatias não responde nenhuma pergunta que a tabela já não responda melhor.
 */
import { GraficoBarras } from "@/components/graficos/grafico-barras";

import type { LinhaDaGradeDeDisciplinas } from "../consulta";

/** Quantas disciplinas aparecem nomeadas antes de o resto virar uma barra só. */
const MAXIMO_DE_BARRAS = 6;

export function ProporcaoDaCarga({
  linhas,
}: {
  readonly linhas: readonly LinhaDaGradeDeDisciplinas[];
}) {
  // ⚠️ Nada a desenhar não é um gráfico vazio: é a ausência do gráfico. Um eixo sem barra parece
  //    defeito de carregamento.
  if (linhas.length === 0) return null;

  const ordenadas = [...linhas].sort((a, b) => b.cargaHorariaTempos - a.cargaHorariaTempos);
  const nomeadas = ordenadas.slice(0, MAXIMO_DE_BARRAS);
  const resto = ordenadas.slice(MAXIMO_DE_BARRAS);
  const somaDoResto = resto.reduce((total, l) => total + l.cargaHorariaTempos, 0);

  const pontos = [
    ...nomeadas.map((l) => ({ nome: l.codDisciplina, valor: l.cargaHorariaTempos })),
    ...(resto.length > 0 ? [{ nome: `+${resto.length} outras`, valor: somaDoResto }] : []),
  ];

  return (
    <GraficoBarras
      series={[
        {
          chave: "ch_prevista",
          rotulo: "Carga horária prevista (tempos)",
          forma: "quadrado",
          pontos,
        },
      ]}
      rotulo="Proporção da carga horária prevista entre as disciplinas desta vista"
      corPorCategoria
      altura={200}
    />
  );
}

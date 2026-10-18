/**
 * A proporção da CH prevista entre as disciplinas da vista (`FR-054`; spec 016, FR-007.2).
 *
 * ⚠️ **ELE LÊ AS MESMAS LINHAS DA TABELA, e por isso muda junto com o filtro** (`SC-011`). Uma
 * consulta própria mostraria a proporção do curso inteiro ao lado de uma tabela filtrada, e a
 * divergência seria invisível: os dois pareceriam certos.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE PRÓPRIO.** Ele é importado por `GradeDeDisciplinas.tsx`, que é a
 * fronteira; um segundo marcador não mudaria o que vai para o navegador e encheria a lista fechada
 * de folhas com um arquivo que não é fronteira de nada.
 *
 * ⚠️ **PIZZA COM AS 4 MAIORES E "OUTRAS (N)" desde 17/10/2026** (spec 016, FR-007.2; Q-11, Bernardo
 * Villas Boas). Até ali era um gráfico de barras com as 6 maiores e "+N outras". O teto de 5 fatias é
 * do componente (`MAXIMO_DE_CATEGORIAS_NA_PIZZA`), e quem agrupa é `agruparEmOutras`, que preserva a
 * soma. ⚠️ **A LISTA EM TEXTO TRAZ TODAS**: a legenda da pizza nomeia as quatro maiores e "Outras", e a
 * linha abaixo dela nomeia cada disciplina que entrou em "Outras", com o seu valor.
 */
import { GraficoPizza } from "@/components/graficos/grafico-pizza";
import { agruparEmOutras } from "@/components/graficos/tipos";

import type { LinhaDaGradeDeDisciplinas } from "../consulta";

export function ProporcaoDaCarga({
  linhas,
}: {
  readonly linhas: readonly LinhaDaGradeDeDisciplinas[];
}) {
  // ⚠️ Nada a desenhar não é um gráfico vazio: é a ausência do gráfico. Uma pizza sem fatia parece
  //    defeito de carregamento.
  if (linhas.length === 0) return null;

  const { pontos, agrupados } = agruparEmOutras(
    linhas.map((l) => ({ nome: l.codDisciplina, valor: l.cargaHorariaTempos })),
  );

  return (
    <div data-slot="proporcao-da-carga" className="flex flex-col gap-1">
      <GraficoPizza
        serie={{
          chave: "ch_prevista",
          rotulo: "Carga horária prevista (tempos)",
          forma: "circulo",
          pontos,
        }}
        rotulo="Proporção da carga horária prevista entre as disciplinas desta vista"
        altura={220}
      />
      {agrupados.length > 0 ? (
        <p className="text-texto-suave text-xs" data-slot="disciplinas-em-outras">
          Em Outras:{" "}
          {agrupados.map((p, i) => (
            <span key={p.nome}>
              {i > 0 ? " · " : ""}
              {p.nome}: <span className="tabular-nums">{p.valor}</span>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A CH prevista de cada disciplina da vista (`FR-054`; spec 016, FR-007.2; spec 022, itens 7 e 8; spec 025, item 4).
 *
 * > *"Curso, aba Disciplinas — trocar a pizza por barras verticais: uma barra por disciplina, altura = CH em TA, eixo X
 * > com o código da disciplina, eixo Y em tempos de aula. Interativo (RT-5)."* — Bernardo Villas Boas, 24/10/2026
 *
 * ⚠️ **ELE LÊ AS MESMAS LINHAS DA TABELA, e por isso muda junto com o filtro** (`SC-011`). Uma
 * consulta própria mostraria a carga do curso inteiro ao lado de uma tabela filtrada, e a
 * divergência seria invisível: os dois pareceriam certos.
 *
 * ⚠️ **O EIXO LEVA O CÓDIGO, A LEGENDA LEVA O NOME** (D-23): no eixo cabe `I`, `II`, `XIV`; o nome — o *Nome no DSA*,
 *    ou a abreviação automática do Bloco 2 (`nomeNoGrafico`, item 8 da spec 022) — vai na legenda, *"código — nome:
 *    N TA"*, que é também o botão de ocultar a barra. As barras saem na **ordem natural do código** (`I` antes de `II`,
 *    `II` antes de `X`), não na alfabética.
 * ⚠️ **TODAS AS DISCIPLINAS, SEM «OUTRAS»** (item 7 da spec 022) — continua valendo nas barras.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE PRÓPRIO.** Ele é importado por `GradeDeDisciplinas.tsx`, que é a
 * fronteira; um segundo marcador não mudaria o que vai para o navegador.
 */
import { GraficoBarras } from "@/components/graficos/grafico-barras";
import { nomeNoGrafico } from "@/lib/dominio/nome-no-dsa";
import { emOrdemNaturalDoCodigo } from "@/lib/dominio/ordem-natural";

import type { LinhaDaGradeDeDisciplinas } from "../consulta";

export function ProporcaoDaCarga({
  linhas,
}: {
  readonly linhas: readonly LinhaDaGradeDeDisciplinas[];
}) {
  // ⚠️ Nada a desenhar não é um gráfico vazio: é a ausência do gráfico.
  if (linhas.length === 0) return null;

  const emOrdem = emOrdemNaturalDoCodigo(linhas, (l) => l.codDisciplina);
  const nomePorCodigo = new Map(
    emOrdem.map(
      (l) =>
        [
          l.codDisciplina,
          nomeNoGrafico({ nome: l.nomeDisciplina, nomeNoDsa: l.nomeNoDsa }),
        ] as const,
    ),
  );

  return (
    <div
      data-slot="proporcao-da-carga"
      data-barras={JSON.stringify(emOrdem.map((l) => l.codDisciplina))}
      className="flex flex-col gap-1"
    >
      <GraficoBarras
        series={[
          {
            chave: "ch_prevista",
            rotulo: "CH prevista (TA)",
            forma: "quadrado",
            pontos: emOrdem.map((l) => ({ nome: l.codDisciplina, valor: l.cargaHorariaTempos })),
          },
        ]}
        rotulo="Carga horária prevista de cada disciplina desta vista"
        rotuloDoEixoY="Tempos de aula (TA)"
        unidadeNaLegenda="TA"
        legendaDaCategoria={(codigo) => `${codigo} — ${nomePorCodigo.get(codigo) ?? codigo}`}
        altura={280}
        corPorCategoria
      />
    </div>
  );
}

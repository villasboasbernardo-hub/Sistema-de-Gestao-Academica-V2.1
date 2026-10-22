/**
 * A proporção da CH prevista entre as disciplinas da vista (`FR-054`; spec 016, FR-007.2; spec 022, itens 7 e 8).
 *
 * ⚠️ **ELE LÊ AS MESMAS LINHAS DA TABELA, e por isso muda junto com o filtro** (`SC-011`). Uma
 * consulta própria mostraria a proporção do curso inteiro ao lado de uma tabela filtrada, e a
 * divergência seria invisível: os dois pareceriam certos.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE PRÓPRIO.** Ele é importado por `GradeDeDisciplinas.tsx`, que é a
 * fronteira; um segundo marcador não mudaria o que vai para o navegador e encheria a lista fechada
 * de folhas com um arquivo que não é fronteira de nada.
 *
 * ⚠️ **TODAS AS DISCIPLINAS, PELO NOME, desde 22/10/2026** (spec 022, Bloco 7 — Bernardo Villas Boas):
 *    *"TODAS as fatias, sem agrupar em «Outras»"* (item 7) e *"legenda com o NOME da disciplina, não o código; nome
 *    longo usa o Nome no DSA (ou a abreviação automática do Bloco 2)"* (item 8). De 17/10 a 22/10/2026 era uma pizza
 *    com as 4 maiores e "Outras (N)", com o código na legenda (`FR-007.2` da spec 016, Q-11 — emendado).
 */
import { GraficoPizza } from "@/components/graficos/grafico-pizza";
import { nomeNoGrafico } from "@/lib/dominio/nome-no-dsa";

import type { LinhaDaGradeDeDisciplinas } from "../consulta";

export function ProporcaoDaCarga({
  linhas,
}: {
  readonly linhas: readonly LinhaDaGradeDeDisciplinas[];
}) {
  // ⚠️ Nada a desenhar não é um gráfico vazio: é a ausência do gráfico. Uma pizza sem fatia parece
  //    defeito de carregamento.
  if (linhas.length === 0) return null;

  return (
    <div data-slot="proporcao-da-carga" className="flex flex-col gap-1">
      <GraficoPizza
        serie={{
          chave: "ch_prevista",
          rotulo: "Carga horária prevista (tempos)",
          forma: "circulo",
          pontos: linhas.map((l) => ({
            nome: nomeNoGrafico({ nome: l.nomeDisciplina, nomeNoDsa: l.nomeNoDsa }),
            valor: l.cargaHorariaTempos,
          })),
        }}
        rotulo="Proporção da carga horária prevista entre as disciplinas desta vista"
        altura={260}
      />
    </div>
  );
}

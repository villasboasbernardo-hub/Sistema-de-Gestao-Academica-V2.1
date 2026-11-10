/**
 * As ESTATÍSTICAS das abas Palestras e APOINST do módulo (Bloco 18, spec 033, RA-9; FR-006.3) — Server Component.
 *
 * > *"Estatísticas pensadas para a DEnsM e a auditoria interna: (…) palestras previstas cumpridas N de M, com data,
 * > palestrante e local; (…) APOINST por situação."* — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **NÃO CALCULA NADA**: os números chegam de `numerosDasPalestras` e `numerosDaApoinst` (lib/dominio), sobre as
 *    MESMAS linhas que a tabela mostra — o cartão e a lista nunca discordam.
 * ⚠️ **A TURMA ARQUIVADA CONTA** (RT-8): quem chama não a tira.
 * ⚠️ **CARTÕES JUNTOS E IGUAIS** (RT-7) e **A PIZZA COM TODAS AS FATIAS, A LEGENDA QUE ALTERNA** (RT-5): o componente
 *    de gráfico é o de sempre.
 */
import { CardKpi } from "@/components/ciaara/card-kpi";
import { GraficoPizza } from "@/components/graficos/grafico-pizza";
import type { Serie } from "@/components/graficos/tipos";
import {
  fraseDosTaDasAvulsas,
  type NumerosDaApoinst,
  type NumerosDasPalestras,
} from "@/lib/dominio/atividades/palestras-e-apoinst-na-tela";

const CARTAO =
  "border-borda bg-superficie rounded-ciaara shadow-ciaara-1 flex flex-col gap-1 border p-3";

const GRADE = "grid auto-rows-fr gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5";

export function EstatisticasDePalestras({
  numeros,
  recorte,
}: {
  readonly numeros: NumerosDasPalestras;
  readonly recorte: boolean;
}) {
  const porSituacao: Serie = {
    chave: "palestras-por-situacao",
    rotulo: "AEC previstas",
    forma: "circulo",
    pontos: numeros.porSituacao,
  };
  return (
    <section aria-label="Estatísticas das palestras" className="flex flex-col gap-4">
      <div className={GRADE} data-slot="indicadores-das-palestras">
        <CardKpi
          rotulo="Do currículo, cumpridas"
          valor={`${numeros.cumpridas} de ${numeros.previstas}`}
          {...(recorte ? { detalhe: "neste recorte" } : {})}
        />
        <CardKpi rotulo="Cumpridas à mão" valor={numeros.cumpridasAMao} />
        <CardKpi rotulo="Em andamento" valor={numeros.emAndamento} />
        <CardKpi rotulo="Obrigatórias a cumprir" valor={numeros.obrigatoriasPendentes} />
        <CardKpi
          rotulo="Fora do currículo"
          valor={numeros.avulsas}
          detalhe={fraseDosTaDasAvulsas(numeros)}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={CARTAO} data-slot="grafico-das-palestras" data-chave="por-situacao">
          <GraficoPizza
            serie={porSituacao}
            rotulo="AEC previstas do currículo por situação"
            altura={240}
          />
        </div>
      </div>
    </section>
  );
}

export function EstatisticasDeApoinst({
  numeros,
  recorte,
}: {
  readonly numeros: NumerosDaApoinst;
  readonly recorte: boolean;
}) {
  const porSituacao: Serie = {
    chave: "apoinst-por-situacao",
    rotulo: "APOINST",
    forma: "circulo",
    pontos: numeros.fatias,
  };
  return (
    <section aria-label="Estatísticas da APOINST" className="flex flex-col gap-4">
      <div className={GRADE} data-slot="indicadores-da-apoinst">
        <CardKpi
          rotulo="APOINST planejadas"
          valor={numeros.ativas}
          detalhe={`${numeros.taLancados} de ${numeros.taPrevistos} TA lançados${recorte ? " · neste recorte" : ""}`}
        />
        <CardKpi rotulo="Concluídas" valor={numeros.porSituacao.concluida} />
        <CardKpi rotulo="Em andamento" valor={numeros.porSituacao.em_andamento} />
        <CardKpi rotulo="Atrasadas" valor={numeros.porSituacao.atrasada} />
        <CardKpi rotulo="Planejadas, sem lançamento" valor={numeros.porSituacao.planejada} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={CARTAO} data-slot="grafico-da-apoinst" data-chave="por-situacao">
          <GraficoPizza serie={porSituacao} rotulo="APOINST por situação" altura={240} />
        </div>
      </div>
    </section>
  );
}

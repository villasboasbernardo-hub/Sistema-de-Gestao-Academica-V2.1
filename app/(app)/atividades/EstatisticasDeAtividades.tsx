/**
 * As ESTATÍSTICAS das atividades — do módulo e da aba Atividades da turma (Bloco 18, spec 033, `FR-006.3`, `FR-007.1`
 * e `FR-010`; RA-9).
 *
 * > *"Estatísticas pensadas para a DEnsM e a auditoria interna: por turma, TA de AEC/TAD/TR usados × limite do
 * > currículo; palestras previstas cumpridas N de M, com data, palestrante e local; visitas com local; APOINST por
 * > situação."* — Bernardo Villas Boas, 03/11/2026 (RA-9)
 *
 * ⚠️ **AQUI NÃO SE CALCULA NADA**: os números vêm de `estatisticasDeAtividades` (`lib/dominio/atividades/`), sobre AS
 *    MESMAS linhas que a lista mostra — todas, não só as 500 da tabela —, e o uso do limite vem do veredito de
 *    `tetosDaTurma` (SC-003 da spec 014). Esta folha só escolhe frases e monta as séries.
 * ⚠️ **TA, NÃO QUANTIDADE, NOS GRÁFICOS** (o limite é de tempo, RA-3); os cartões trazem as duas.
 * ⚠️ **PIZZA COM TODAS AS FATIAS** (documento 23 §7) e **BARRAS COM A TURMA NO EIXO** (no máximo 6 séries) — os dois
 *    gráficos já são interativos (RT-5): a legenda tira e devolve o grupo.
 * ⚠️ **A TURMA ARQUIVADA CONTA** (RT-8): quem chama não a tira antes.
 * ⚠️ **TURMA SEM LIMITE CALCULÁVEL NÃO VIRA BARRA ZERO** — ela se leria como «limite zero»; é nomeada abaixo do gráfico.
 * ⚠️ SEM MARCADOR DE CLIENTE: `CardKpi` é servidor; os gráficos são folhas e recebem séries prontas.
 */
import { CardKpi } from "@/components/ciaara/card-kpi";
import { GraficoBarras } from "@/components/graficos/grafico-barras";
import { GraficoPizza } from "@/components/graficos/grafico-pizza";
import type { Serie } from "@/components/graficos/tipos";
import {
  ROTULO_DA_SITUACAO_DA_APOINST,
  SITUACOES_DA_APOINST,
} from "@/lib/dominio/atividades/apoinst";
import type { EstatisticasDeAtividades as Estatisticas } from "@/lib/dominio/atividades/estatisticas";
import { acimaDoMaximo } from "@/lib/dominio/atividades/lista";
import { rotuloDeComoConta, type ComoConta } from "@/lib/dominio/categoria-pelo-tipo";
import type { CardDeTeto, Categoria, TetosDaTurma } from "@/lib/dominio/tetos-da-turma";
import { dataParaLeitura } from "@/lib/formato/data";

/** O cartão de cada gráfico — o mesmo de `PainelDeInstrutores` e `IndicadoresDoCatalogo`. */
const CARTAO =
  "border-borda bg-superficie rounded-ciaara shadow-ciaara-1 flex flex-col gap-1 border p-3";

/** As classificações da lista, na ordem dos cartões — como a linha CONTA (RA-4). */
const CLASSIFICACOES: readonly ComoConta[] = ["AEC", "TAD", "TR", "CHD", "Apoio_Individualizado"];

const SIGLA: Readonly<Record<Categoria, string>> = { aec: "AEC", tad: "TAD", tr: "TR" };

function emTa(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function serie(
  chave: string,
  rotulo: string,
  pontos: readonly { nome: string; valor: number }[],
): Serie {
  return { chave, rotulo, forma: "circulo", pontos: pontos.filter((p) => p.valor > 0) };
}

function SemDado({ texto }: { readonly texto: string }) {
  return <p className="text-texto-suave text-sm">{texto}</p>;
}

export type TetosLidos = {
  readonly tetos: readonly { readonly turmaCodigo: string; readonly tetos: TetosDaTurma }[];
  readonly erro: string | null;
};

/** O detalhe do cartão de limite de UMA categoria de UMA turma (a aba da turma). */
function detalheDoLimite(card: CardDeTeto): string {
  if (card.maximo === "sem_ch_curricular") return "sem CH curricular — máximo não calculável";
  if (card.maximo === "parametro_nao_cadastrado") return "parâmetro da norma não cadastrado no ano";
  const origem = card.maximo.origem === "curriculo" ? "currículo" : "norma";
  const percentual = card.percentualDoMaximo === null ? "" : `${card.percentualDoMaximo} % · `;
  return `${percentual}máximo pelo ${origem}${card.alertas.includes("acima_do_maximo") ? " · acima do máximo" : ""}`;
}

/** Os três cartões do uso do limite da TURMA (a aba Atividades dela, `FR-007.1`). */
function UsoDoLimiteDaTurma({ tetos }: { readonly tetos: TetosDaTurma }) {
  if (tetos.ead) {
    return <SemDado texto="Turma EAD: sem limites de AEC, TAD e TR." />;
  }
  return (
    <div className="grid auto-rows-fr gap-3 sm:grid-cols-3" data-slot="uso-do-limite-da-turma">
      {(["aec", "tad", "tr"] as const).map((c) => {
        const card = tetos.cards[c];
        const maximo = typeof card.maximo === "object" ? card.maximo.valor : null;
        return (
          <div key={c} className="contents" data-limite={c}>
            <CardKpi
              compacto
              rotulo={`${SIGLA[c]} — uso do limite`}
              valor={
                maximo === null
                  ? `${emTa(card.cumprido)} TA`
                  : `${emTa(card.cumprido)} de ${emTa(maximo)}`
              }
              {...(maximo === null ? {} : { unidade: "TA" })}
              detalhe={detalheDoLimite(card)}
              {...(card.alertas.includes("acima_do_maximo") ? { tom: "atrasado" as const } : {})}
            />
          </div>
        );
      })}
    </div>
  );
}

/** As barras do uso do limite POR TURMA (o módulo): uma por categoria, usado × limite, a turma no eixo. */
function UsoDoLimitePorTurma({
  estatisticas,
  lidos,
}: {
  readonly estatisticas: Estatisticas;
  readonly lidos: TetosLidos;
}) {
  if (lidos.erro) return <SemDado texto={lidos.erro} />;
  const acima = acimaDoMaximo(lidos.tetos);
  return (
    <>
      {(["aec", "tad", "tr"] as const).map((c) => {
        const daCategoria = estatisticas.usoDoLimite.filter((u) => u.categoria === c);
        const comLimite = daCategoria.filter((u) => u.limite !== null);
        const semLimite = daCategoria.filter((u) => u.limite === null).map((u) => u.turmaCodigo);
        const acimaDaCategoria = acima.filter((a) => a.categoria === c);
        const series: Serie[] = [
          {
            chave: `usado-${c}`,
            rotulo: "Usado (TA)",
            forma: "quadrado",
            pontos: comLimite.map((u) => ({ nome: u.turmaCodigo, valor: u.usado })),
          },
          {
            chave: `limite-${c}`,
            rotulo: "Limite (TA)",
            forma: "losango",
            pontos: comLimite.map((u) => ({ nome: u.turmaCodigo, valor: u.limite ?? 0 })),
          },
        ];
        return (
          <div
            key={c}
            className={CARTAO}
            data-slot="grafico-de-atividades"
            data-chave={`uso-do-limite-${c}`}
            data-barras={JSON.stringify(comLimite.map((u) => u.turmaCodigo))}
          >
            {comLimite.length === 0 ? (
              <>
                <p className="text-texto text-sm font-medium">
                  {SIGLA[c]}: usado × limite por turma
                </p>
                <SemDado texto="Nenhuma turma do recorte com limite calculável." />
              </>
            ) : (
              <GraficoBarras
                series={series}
                rotulo={`${SIGLA[c]}: TA usados × limite do currículo, por turma`}
                rotuloDoEixoY="Tempos de aula (TA)"
                unidadeNaLegenda="TA"
                altura={280}
              />
            )}
            {acimaDaCategoria.length > 0 ? (
              <p
                role="status"
                className="text-atrasado-tinta text-xs font-medium"
                data-slot="acima-do-maximo"
              >
                Acima do máximo:{" "}
                {acimaDaCategoria
                  .map((a) => `${a.turmaCodigo} (${emTa(a.cumprido)} de ${emTa(a.maximo)})`)
                  .join(" · ")}
              </p>
            ) : null}
            {semLimite.length > 0 ? (
              <p className="text-texto-suave text-xs" data-slot="sem-limite-calculavel">
                Sem limite calculável (sem CH curricular ou sem o parâmetro da norma):{" "}
                {semLimite.join(", ")}.
              </p>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export function EstatisticasDeAtividades({
  estatisticas,
  recorte,
  erroDasPalestras,
  erroDaApoinst,
  limites,
  daTurma = false,
}: {
  readonly estatisticas: Estatisticas;
  /** Há filtro: os números são do recorte, e o total diz isso. */
  readonly recorte: boolean;
  readonly erroDasPalestras: string | null;
  readonly erroDaApoinst: string | null;
  readonly limites: TetosLidos;
  /** A aba da turma: sem as barras por curso e por turma; o uso do limite em cartões. */
  readonly daTurma?: boolean;
}) {
  const porComo = new Map(estatisticas.taPorComoConta.map((f) => [f.nome, f.valor]));
  const { cumpridas, previstas } = estatisticas.palestras;
  const apoinstAtivas = SITUACOES_DA_APOINST.reduce(
    (s, k) => s + estatisticas.apoinstPorSituacao[k],
    0,
  );
  const visitasComLocal = estatisticas.visitasComLocal.filter(
    (v) => v.local !== null && v.local.trim() !== "",
  );

  const porTipo = serie("por-tipo", "TA por tipo", estatisticas.porTipo);
  const porClassificacao = serie(
    "por-classificacao",
    "TA por classificação",
    estatisticas.taPorComoConta,
  );
  const porCurso: Serie = {
    ...serie("por-curso", "TA por curso", estatisticas.porCurso),
    forma: "quadrado",
  };
  const porTurma: Serie = {
    ...serie("por-turma", "TA por turma", estatisticas.porTurma),
    forma: "quadrado",
  };
  const tetosDaTurma = daTurma ? (limites.tetos[0]?.tetos ?? null) : null;

  return (
    <section
      aria-label="Estatísticas das atividades"
      className="flex flex-col gap-4"
      data-slot="estatisticas-de-atividades"
    >
      <div
        className="grid auto-rows-fr gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-6"
        data-slot="indicadores-de-atividades"
      >
        <div className="contents" data-indicador="total-de-atividades">
          <CardKpi
            rotulo="Atividades"
            valor={estatisticas.totalAtividades}
            {...(recorte ? { detalhe: "neste recorte" } : {})}
          />
        </div>
        <div className="contents" data-indicador="total-de-ta">
          <CardKpi rotulo="Tempos de aula" valor={emTa(estatisticas.totalTa)} unidade="TA" />
        </div>
        {CLASSIFICACOES.map((c) => {
          const rotulo = rotuloDeComoConta(c);
          return (
            <div key={c} className="contents" data-indicador={`ta-${c}`}>
              <CardKpi
                rotulo={c === "CHD" ? rotulo : `TA de ${rotulo}`}
                valor={emTa(porComo.get(rotulo) ?? 0)}
                unidade="TA"
              />
            </div>
          );
        })}
        <div className="contents" data-indicador="palestras-cumpridas">
          <CardKpi
            rotulo="AEC previstas cumpridas"
            valor={erroDasPalestras ? "—" : `${cumpridas} de ${previstas}`}
            detalhe={
              erroDasPalestras
                ? "não foi possível ler as previstas"
                : previstas === 0
                  ? "nenhuma prevista nos currículos do recorte"
                  : `${Math.round((cumpridas / previstas) * 100)} % · do currículo de cada turma`
            }
          />
        </div>
        <div className="contents" data-indicador="apoinst-por-situacao">
          <CardKpi
            rotulo="APOINST planejadas"
            valor={erroDaApoinst ? "—" : apoinstAtivas}
            detalhe={
              erroDaApoinst
                ? "não foi possível ler as APOINST"
                : SITUACOES_DA_APOINST.map(
                    (s) =>
                      `${estatisticas.apoinstPorSituacao[s]} ${ROTULO_DA_SITUACAO_DA_APOINST[s].toLowerCase()}`,
                  ).join(" · ")
            }
          />
        </div>
        <div className="contents" data-indicador="visitas">
          <CardKpi
            rotulo="Visitas"
            valor={estatisticas.visitas}
            detalhe={`${visitasComLocal.length} com o local informado`}
          />
        </div>
      </div>

      {daTurma && tetosDaTurma ? (
        <section aria-label="Uso do limite do currículo" className="flex flex-col gap-2">
          <h3 className="text-texto text-sm font-semibold">
            Uso do limite de AEC, TAD e TR do currículo
          </h3>
          {limites.erro ? (
            <SemDado texto={limites.erro} />
          ) : (
            <UsoDoLimiteDaTurma tetos={tetosDaTurma} />
          )}
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2" data-slot="graficos-de-atividades">
        <div className={CARTAO} data-slot="grafico-de-atividades" data-chave="por-tipo">
          <GraficoPizza serie={porTipo} rotulo="TA por tipo de atividade" altura={260} />
        </div>
        <div className={CARTAO} data-slot="grafico-de-atividades" data-chave="por-classificacao">
          <GraficoPizza
            serie={porClassificacao}
            rotulo="TA por classificação (como conta)"
            altura={260}
          />
        </div>
        {daTurma ? null : (
          <>
            <div
              className={CARTAO}
              data-slot="grafico-de-atividades"
              data-chave="por-curso"
              data-barras={JSON.stringify(porCurso.pontos.map((p) => p.nome))}
            >
              {porCurso.pontos.length === 0 ? (
                <SemDado texto="Nenhuma atividade neste recorte." />
              ) : (
                <GraficoBarras
                  series={[porCurso]}
                  rotulo="TA por curso"
                  rotuloDoEixoY="Tempos de aula (TA)"
                  unidadeNaLegenda="TA"
                  altura={280}
                  corPorCategoria
                />
              )}
            </div>
            <div
              className={CARTAO}
              data-slot="grafico-de-atividades"
              data-chave="por-turma"
              data-barras={JSON.stringify(porTurma.pontos.map((p) => p.nome))}
            >
              {porTurma.pontos.length === 0 ? (
                <SemDado texto="Nenhuma atividade neste recorte." />
              ) : (
                <GraficoBarras
                  series={[porTurma]}
                  rotulo="TA por turma"
                  rotuloDoEixoY="Tempos de aula (TA)"
                  unidadeNaLegenda="TA"
                  altura={280}
                  corPorCategoria
                />
              )}
            </div>
            <UsoDoLimitePorTurma estatisticas={estatisticas} lidos={limites} />
          </>
        )}
      </div>

      {visitasComLocal.length > 0 ? (
        <section
          aria-label="Visitas com local"
          className="flex flex-col gap-1"
          data-slot="visitas-com-local"
        >
          <h3 className="text-texto text-sm font-semibold">Visitas com local</h3>
          <ul className="text-texto flex flex-col gap-0.5 text-sm">
            {visitasComLocal.map((v, i) => (
              <li key={`${v.data}-${i}`}>
                <span className="tabular-nums">{dataParaLeitura(v.data)}</span>
                {v.turmaCodigo ? ` · ${v.turmaCodigo}` : " · todas as turmas"} · {v.local}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

/**
 * Os cartões de indicadores da ficha da turma — **juntos, do mesmo tamanho e do mesmo desenho** (RT-7 do Bloco 10,
 * spec 025, D-5 a D-7; FR-001.3).
 *
 * > *"Cartões de andamento (CH prevista, CH executada, progresso, saldo/capacidade em TA), tempos reserva (AEC, TAD, TR)
 * > e avaliações todos juntos, mesmo padrão."* — Bernardo Villas Boas, 24/10/2026
 *
 * ⚠️ **AQUI NÃO SE CALCULA NADA.** O andamento chega de `andamentoDaTurma` (o único lugar que decide `emAtraso`,
 *    `SC-006` da spec 012), os tetos de `tetosDaTurma` (SC-003 da spec 014) e as avaliações de `contagemDeAvaliacoes`.
 *    Esta folha escolhe frases — as mesmas de `SecaoDeAndamento`, `CardsDeTetos` e `CardDeAvaliacoes`, que ela
 *    substitui.
 * ⚠️ **OITO CARTÕES, UMA GRADE SÓ**: os três grupos são `display: contents`, então os cartões participam da MESMA grade
 *    e a linha dá a mesma altura a todos — e cada grupo continua com o marcador que os testes leem
 *    (`andamento-da-turma`, `tetos-da-turma`, `card-de-avaliacoes`).
 * ⚠️ **O QUE NÃO É INDICADOR FICA FORA DOS CARTÕES** (D-6): dias parados, Estudo Individual e Apoio Individualizado numa
 *    linha logo abaixo.
 * ⚠️ **A TURMA EAD NÃO CONTA TA** (D-7; D-16 da spec 024): no lugar dos cartões, o aviso da Divisão de Ensino a
 *    Distância.
 * ⚠️ **SEM MARCADOR DE CLIENTE.** O ícone de editar o previsto chega montado (`EdicaoDoPrevisto`).
 */
import type { ReactNode } from "react";

import { BadgeStatus } from "@/components/ciaara/badge-status";
import { BarraDeProgresso } from "@/components/ciaara/barra-de-progresso";
import { CardKpi } from "@/components/ciaara/card-kpi";
import type { Andamento } from "@/lib/dominio/andamento-da-turma";
import type { ContagemDeAvaliacoes } from "@/lib/dominio/avaliacoes/contagem";
import { AVISO_DE_TURMA_EAD } from "@/lib/dominio/dsa/ead-puro";
import type { CardDeTeto, Categoria, TetosDaTurma } from "@/lib/dominio/tetos-da-turma";
import { dataParaLeitura, instanteComHoraParaLeitura } from "@/lib/formato/data";
import { enderecoDasAvaliacoesDaTurma } from "@/lib/navegacao/endereco-de-turma";

import { emTa, NOME_DA_CATEGORIA, type AutoriaDoPrevisto } from "./CardsDeTetos";

/** `+32` · `-12` — o sinal do saldo é informação, e o positivo também precisa aparecer. */
function comSinal(valor: number): string {
  return valor > 0 ? `+${valor}` : String(valor);
}

/** `1 dia` · `4 dias` · `-3 dias` — o plural olha o módulo, senão `-1` sairia "dias". */
function emDias(valor: number): string {
  return `${valor} ${Math.abs(valor) === 1 ? "dia" : "dias"}`;
}

/** A frase de degradação, no lugar do número que não existe (`RN-DEG-01`). */
function Frase({ children, slot }: { readonly children: ReactNode; readonly slot: string }) {
  return <span data-andamento={slot}>{children}</span>;
}

/** O cartão de AEC, TAD ou TR — os dois percentuais, nesta ordem: do previsto e do máximo (D-TETO-3). */
function CartaoDeTeto({
  categoria,
  card,
  ano,
  autoria,
  edicao,
}: {
  readonly categoria: Categoria;
  readonly card: CardDeTeto;
  readonly ano: number;
  readonly autoria: AutoriaDoPrevisto;
  readonly edicao: ReactNode;
}) {
  const previsto =
    card.previsto === "nao_definido" ? (
      <span data-teto="previsto-nao-definido">previsto não definido</span>
    ) : (
      <span data-teto="do-previsto">
        {emTa(card.cumprido)} de {emTa(card.previsto)} previstos
        {card.percentualDoPrevisto === null ? "" : ` (${card.percentualDoPrevisto} %)`}
      </span>
    );

  let maximo: ReactNode;
  if (card.maximo === "sem_ch_curricular") {
    maximo = <span data-teto="sem-ch">sem CH curricular — máximo não calculável</span>;
  } else if (card.maximo === "parametro_nao_cadastrado") {
    maximo = <span data-teto="sem-parametro">parâmetro não cadastrado para {ano}</span>;
  } else {
    maximo = (
      <span data-teto="do-maximo">
        {emTa(card.cumprido)} de {emTa(card.maximo.valor)} máximos
        {card.percentualDoMaximo === null ? "" : ` (${card.percentualDoMaximo} %)`}
        <span data-teto="origem">
          {" "}
          · {card.maximo.origem === "curriculo" ? "currículo" : "norma"}
        </span>
      </span>
    );
  }

  const barra = card.barra;
  const marcador =
    barra === null || barra.marcadorDoPrevisto === null || barra.maximo <= 0
      ? null
      : Math.max(0, Math.min(100, (barra.marcadorDoPrevisto / barra.maximo) * 100));

  return (
    <div data-teto-card={categoria} className="h-full">
      <CardKpi
        rotulo={NOME_DA_CATEGORIA[categoria]}
        valor={`${emTa(card.cumprido)} TA`}
        acao={edicao}
        detalhe={
          <>
            <p className="text-texto" data-teto="linha">
              {previsto} · {maximo}
            </p>
            {barra ? (
              <div
                className="relative"
                data-teto="barra"
                data-maximo={barra.maximo}
                data-previsto={barra.marcadorDoPrevisto ?? ""}
              >
                <BarraDeProgresso
                  valor={card.percentualDoMaximo}
                  rotuloAcessivel={`${NOME_DA_CATEGORIA[categoria]}: cumprido em relação ao máximo de ${emTa(barra.maximo)} TA`}
                  tom={card.alertas.includes("acima_do_maximo") ? "atrasado" : "executado"}
                />
                {marcador === null ? null : (
                  <span
                    aria-hidden="true"
                    data-teto="marcador-do-previsto"
                    title={`previsto: ${emTa(barra.marcadorDoPrevisto as number)} TA`}
                    className="bg-texto absolute -top-1 h-4 w-0.5"
                    style={{ left: `${marcador}%` }}
                  />
                )}
              </div>
            ) : null}
            {card.alertas.length > 0 ? (
              <p role="status" className="text-atrasado-tinta font-medium" data-teto="alertas">
                {card.alertas
                  .map((a) => (a === "acima_do_previsto" ? "acima do previsto" : "acima do máximo"))
                  .join(" · ")}
              </p>
            ) : null}
            {autoria ? (
              <p data-teto="autoria">
                previsto alterado por {autoria.nome} em {instanteComHoraParaLeitura(autoria.em)}
              </p>
            ) : null}
          </>
        }
      />
    </div>
  );
}

export function IndicadoresDaTurma({
  andamento,
  dataTermino,
  execucaoSeparada,
  avisoDaContagem,
  tetos,
  ano,
  autoria,
  edicao,
  avaliacoes,
  turmaCodigo,
}: {
  readonly andamento: Andamento;
  /** O término **gravado na turma** — é ele que a frase de `sem_termino` manda informar. */
  readonly dataTermino: string | null;
  /** *"45 TA executados · 40 no DSA · 5 fora do DSA"* (D-COR-3), quando há TA fora do DSA. */
  readonly execucaoSeparada: string | null;
  /** A semipresencial sem marca presencial (ou sem etapa) conta tudo — e diz o que falta (spec 024). */
  readonly avisoDaContagem: string | null;
  readonly tetos: TetosDaTurma;
  readonly ano: number;
  readonly autoria: Readonly<Record<Categoria, AutoriaDoPrevisto>>;
  /** O ícone de editar o previsto de cada categoria, para quem pode (montado na página). */
  readonly edicao?: Partial<Record<Categoria, ReactNode>>;
  /** A contagem do card de avaliações; `null` quando a turma não tem o quadro (EAD, ou sem leitura). */
  readonly avaliacoes: ContagemDeAvaliacoes | null;
  readonly turmaCodigo: string;
}) {
  if (andamento.situacaoDaCapacidade === "controle_da_dead") {
    return (
      <section
        aria-labelledby="titulo-dos-indicadores"
        className="flex flex-col gap-2"
        data-slot="andamento-da-turma"
      >
        <h2 id="titulo-dos-indicadores" className="text-texto text-base font-semibold">
          Andamento
        </h2>
        {/* O mesmo aviso diz por que não há DSA nem planilha na barra (Q-13 da spec 013): um texto só na página. */}
        <div data-slot="andamento-ead">
          <p className="text-texto-suave max-w-prose text-sm" data-slot="dsa-turma-ead">
            {AVISO_DE_TURMA_EAD}
          </p>
        </div>
      </section>
    );
  }

  const { prevista, executada, percentual, saldo, saldoEmDias, capacidadeDiaria, diasUteis } =
    andamento;
  const calculada = andamento.situacaoDaCapacidade === "calculada";
  const razaoCurta =
    andamento.situacaoDaCapacidade === "sem_termino" ? "sem término" : "sem regime vigente";
  const tipos = tetos.ead ? [] : Object.entries(tetos.diasParados.porTipo);

  return (
    <section
      aria-labelledby="titulo-dos-indicadores"
      className="flex flex-col gap-3"
      data-slot="indicadores-da-turma"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="titulo-dos-indicadores" className="text-texto text-base font-semibold">
          Andamento
        </h2>
        {/*
          ⚠️ A TARJA É O VEREDITO, E FICA AO LADO DO TÍTULO: só para turma ativa com saldo negativo (`RF-INI-01`),
             decidida pelo módulo puro. Alerta, nunca bloqueio (`RN-DEG-02`).
        */}
        {andamento.emAtraso ? (
          <span className="flex items-center gap-2 text-sm" data-slot="em-atraso">
            <BadgeStatus tom="atrasado" rotulo="Em atraso" />
            <span className="text-texto-suave">
              A capacidade restante até o término não cobre a carga que falta.
            </span>
          </span>
        ) : null}
      </div>

      {avisoDaContagem ? (
        <p role="status" className="text-atrasado-tinta text-sm" data-slot="aviso-da-contagem">
          {avisoDaContagem}
        </p>
      ) : null}

      <div
        className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-4"
        data-slot="grade-de-indicadores"
      >
        <div className="contents" data-slot="andamento-da-turma">
          <div data-andamento="prevista" className="h-full">
            <CardKpi rotulo="CH prevista" valor={`${prevista} TA`} />
          </div>
          <div data-andamento="executada" className="h-full">
            <CardKpi
              rotulo="CH executada"
              valor={`${executada} TA`}
              {...(execucaoSeparada
                ? { detalhe: <p data-slot="execucao-separada">{execucaoSeparada}</p> }
                : {})}
            />
          </div>
          <div data-andamento="percentual" className="h-full">
            <CardKpi
              rotulo="Progresso"
              valor={percentual === null ? "—" : `${percentual} %`}
              detalhe={
                percentual === null ? (
                  <Frase slot="sem-prevista">
                    O curso não tem carga curricular lançada em disciplinas.
                  </Frase>
                ) : andamento.semLancamentos ? (
                  <Frase slot="sem-lancamentos">Ainda sem lançamentos.</Frase>
                ) : (
                  <BarraDeProgresso
                    valor={percentual}
                    tom={andamento.emAtraso ? "atrasado" : "executado"}
                    rotuloAcessivel={`Progresso da turma: ${percentual}% da carga prevista`}
                  />
                )
              }
            />
          </div>
          <div data-andamento="saldo" className="h-full">
            <CardKpi
              rotulo="Saldo de capacidade (TA)"
              valor={saldo === null ? "—" : `${comSinal(saldo)} TA`}
              {...(calculada ? {} : { unidade: razaoCurta })}
              {...(calculada && saldoEmDias !== null
                ? {
                    variacao: {
                      texto: `${emDias(saldoEmDias)} de capacidade`,
                      favoravel: saldo !== null && saldo >= 0,
                    },
                  }
                : {})}
              detalhe={
                andamento.situacaoDaCapacidade === "sem_termino" ? (
                  <Frase slot="sem-termino">
                    Sem data de término — informe-a em Editar turma para calcular o saldo.
                  </Frase>
                ) : andamento.situacaoDaCapacidade === "sem_regime" ? (
                  <Frase slot="sem-regime">
                    Sem dado de capacidade — o curso não tem regime vigente para a modalidade desta
                    turma.
                  </Frase>
                ) : (
                  <>
                    <span>
                      Saldo em dias:{" "}
                      <span
                        className={
                          andamento.emAtraso ? "text-atrasado-tinta font-medium" : undefined
                        }
                        data-andamento="saldo-em-dias"
                      >
                        {emDias(saldoEmDias ?? 0)}
                      </span>
                    </span>
                    {capacidadeDiaria !== null && diasUteis !== null ? (
                      <span data-andamento="capacidade">
                        {capacidadeDiaria} TA/dia · {diasUteis} dias úteis
                        {dataTermino === null ? "" : ` até ${dataParaLeitura(dataTermino)}`}
                      </span>
                    ) : null}
                  </>
                )
              }
            />
          </div>
        </div>

        {tetos.ead ? null : (
          <div className="contents" data-slot="tetos-da-turma">
            {(["aec", "tad", "tr"] as const).map((c) => (
              <CartaoDeTeto
                key={c}
                categoria={c}
                card={tetos.cards[c]}
                ano={ano}
                autoria={autoria[c]}
                edicao={edicao?.[c] ?? null}
              />
            ))}
          </div>
        )}

        {avaliacoes ? (
          <div
            className="h-full"
            data-slot="card-de-avaliacoes"
            data-aplicadas={avaliacoes.aplicadas}
            data-previstas={avaliacoes.previstas}
          >
            <CardKpi
              rotulo="Avaliações"
              valor={`${avaliacoes.aplicadas} de ${avaliacoes.previstas}`}
              href={enderecoDasAvaliacoesDaTurma(turmaCodigo)}
              detalhe={
                <>
                  <p className="text-texto" data-avaliacoes="n-de-m">
                    {avaliacoes.aplicadas} aplicadas de {avaliacoes.previstas} previstas no
                    currículo
                    {avaliacoes.previstas > 0
                      ? ` (${Math.round((avaliacoes.aplicadas / avaliacoes.previstas) * 100)} %)`
                      : ""}
                  </p>
                  <BarraDeProgresso
                    valor={
                      avaliacoes.previstas > 0
                        ? Math.round((avaliacoes.aplicadas / avaliacoes.previstas) * 100)
                        : null
                    }
                    rotuloAcessivel={`Avaliações: ${avaliacoes.aplicadas} aplicadas de ${avaliacoes.previstas} previstas no currículo`}
                  />
                  {avaliacoes.od > 0 ? (
                    <p data-avaliacoes="od">
                      + {avaliacoes.od}{" "}
                      {avaliacoes.od === 1 ? "avaliação contínua" : "avaliações contínuas"} (OD)
                    </p>
                  ) : null}
                  <p data-avaliacoes="vistas">
                    vistas realizadas {avaliacoes.vistasRealizadas} de {avaliacoes.vistasPrevistas}
                  </p>
                  {avaliacoes.disciplinasArbitradas > 0 ? (
                    <p data-avaliacoes="arbitradas">
                      {avaliacoes.disciplinasArbitradas}{" "}
                      {avaliacoes.disciplinasArbitradas === 1 ? "disciplina" : "disciplinas"} com
                      quantidade arbitrada pela Divisão
                    </p>
                  ) : null}
                  {avaliacoes.disciplinasNaoDefinidas > 0 ? (
                    <p
                      role="status"
                      className="text-atrasado-tinta font-medium"
                      data-avaliacoes="nao-definido"
                    >
                      {avaliacoes.disciplinasNaoDefinidas}{" "}
                      {avaliacoes.disciplinasNaoDefinidas === 1 ? "disciplina" : "disciplinas"} sem
                      previsto definido
                    </p>
                  ) : null}
                </>
              }
            />
          </div>
        ) : null}
      </div>

      {tetos.ead ? null : (
        <dl className="text-texto flex flex-wrap gap-x-6 gap-y-1 text-sm" data-slot="fora-da-cht">
          <div className="flex gap-2" data-teto="dias-parados">
            <dt className="text-texto-suave">Dias parados</dt>
            <dd>
              {tipos.length === 0
                ? "nenhum"
                : tipos.map(([tipo, v]) => `${tipo} ${emTa(v.tempos)}`).join(" · ")}
            </dd>
          </div>
          <div className="flex gap-2" data-teto="estudo-individual">
            <dt className="text-texto-suave">Estudo Individual</dt>
            <dd>
              {emTa(tetos.estudoIndividual.cumprido)} TA · referências:{" "}
              {tetos.estudoIndividual.referencias
                .map((r) => `${r.percentual === null ? "—" : `${r.percentual} %`} ${r.rotulo}`)
                .join("; ")}
            </dd>
          </div>
          <div className="flex gap-2" data-teto="apoio-individualizado">
            <dt className="text-texto-suave">Apoio Individualizado</dt>
            <dd>{emTa(tetos.apoioIndividualizado.cumprido)} TA</dd>
          </div>
        </dl>
      )}
    </section>
  );
}

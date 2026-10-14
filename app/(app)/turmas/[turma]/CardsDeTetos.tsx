/**
 * Os cards de AEC, TAD e TR da ficha da turma (`FR-004`, `FR-007`, `FR-025.4` da spec 014; D-TETO-1 e
 * D-TETO-3).
 *
 * ⚠️ **AQUI NÃO SE CALCULA NADA.** Todo número e todo alerta chegam de `tetosDaTurma`, o único lugar
 *    que decide teto (SC-003). Esta folha escolhe frases.
 * ⚠️ **OS DOIS PERCENTUAIS, NESTA ORDEM**: do previsto e do máximo — nunca sobre a CH (D-TETO-3).
 * ⚠️ **ALERTA EM `role="status"`, NUNCA BLOQUEIO** (`RN-DEG-02`).
 * ⚠️ **A BARRA VAI DE 0 AO MÁXIMO, COM O MARCADOR DO PREVISTO**, e os dois números estão no texto e nos
 *    atributos — nunca só na cor.
 * ⚠️ SEM MARCADOR DE CLIENTE. A edição do previsto é a folha `EdicaoDoPrevisto`, que chega montada.
 */
import type { ReactNode } from "react";

import type { CardDeTeto, Categoria, TetosDaTurma } from "@/lib/dominio/tetos-da-turma";
import { instanteComHoraParaLeitura } from "@/lib/formato/data";
import { BarraDeProgresso } from "@/components/ciaara/barra-de-progresso";

/** Os nomes do Glossário (07). */
export const NOME_DA_CATEGORIA: Readonly<Record<Categoria, string>> = {
  aec: "Atividades Extraclasse (AEC)",
  tad: "Tempo para Administração (TAD)",
  tr: "Tempo Reserva (TR)",
};

/** `27,25` · `5` — número em TA, com vírgula decimal. */
export function emTa(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export type AutoriaDoPrevisto = { readonly nome: string; readonly em: string } | null;

function Linha({ card, ano }: { readonly card: CardDeTeto; readonly ano: number }) {
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
        <span className="text-texto-suave" data-teto="origem">
          {" "}
          · {card.maximo.origem === "curriculo" ? "currículo" : "norma"}
        </span>
      </span>
    );
  }

  return (
    <p className="text-texto text-sm" data-teto="linha">
      {previsto} · {maximo}
    </p>
  );
}

function Barra({ card, nome }: { readonly card: CardDeTeto; readonly nome: string }) {
  if (!card.barra) return null;
  const { maximo, marcadorDoPrevisto } = card.barra;
  const marcador =
    marcadorDoPrevisto === null || maximo <= 0
      ? null
      : Math.max(0, Math.min(100, (marcadorDoPrevisto / maximo) * 100));
  return (
    <div
      className="relative"
      data-teto="barra"
      data-maximo={maximo}
      data-previsto={marcadorDoPrevisto ?? ""}
    >
      <BarraDeProgresso
        valor={card.percentualDoMaximo}
        rotuloAcessivel={`${nome}: cumprido em relação ao máximo de ${emTa(maximo)} TA`}
        tom={card.alertas.includes("acima_do_maximo") ? "atrasado" : "executado"}
      />
      {marcador === null ? null : (
        <span
          aria-hidden="true"
          data-teto="marcador-do-previsto"
          title={`previsto: ${emTa(marcadorDoPrevisto as number)} TA`}
          className="bg-texto absolute -top-1 h-4 w-0.5"
          style={{ left: `${marcador}%` }}
        />
      )}
    </div>
  );
}

function Alertas({ card }: { readonly card: CardDeTeto }) {
  if (card.alertas.length === 0) return null;
  return (
    <p role="status" className="text-atrasado-tinta text-xs font-medium" data-teto="alertas">
      {card.alertas
        .map((a) => (a === "acima_do_previsto" ? "acima do previsto" : "acima do máximo"))
        .join(" · ")}
    </p>
  );
}

export function CardsDeTetos({
  tetos,
  ano,
  autoria,
  edicao,
}: {
  readonly tetos: TetosDaTurma;
  readonly ano: number;
  readonly autoria: Readonly<Record<Categoria, AutoriaDoPrevisto>>;
  /** A folha de edição de cada card, montada pela página só para quem pode editar. */
  readonly edicao?: Partial<Record<Categoria, ReactNode>>;
}) {
  if (tetos.ead) return null;

  const tipos = Object.entries(tetos.diasParados.porTipo);

  return (
    <section
      aria-labelledby="titulo-dos-tetos"
      className="flex flex-col gap-3"
      data-slot="tetos-da-turma"
    >
      <h2 id="titulo-dos-tetos" className="text-texto text-base font-semibold">
        AEC, TAD e TR
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        {(["aec", "tad", "tr"] as const).map((c) => {
          const card = tetos.cards[c];
          const quem = autoria[c];
          return (
            <article
              key={c}
              className="border-borda bg-superficie rounded-ciaara flex flex-col gap-2 border p-3"
              data-teto-card={c}
            >
              <h3 className="text-texto text-sm font-semibold">{NOME_DA_CATEGORIA[c]}</h3>
              <Linha card={card} ano={ano} />
              <Barra card={card} nome={NOME_DA_CATEGORIA[c]} />
              <Alertas card={card} />
              {quem ? (
                <p className="text-texto-suave text-xs" data-teto="autoria">
                  previsto alterado por {quem.nome} em {instanteComHoraParaLeitura(quem.em)}
                </p>
              ) : null}
              {edicao?.[c] ?? null}
            </article>
          );
        })}
      </div>
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
    </section>
  );
}

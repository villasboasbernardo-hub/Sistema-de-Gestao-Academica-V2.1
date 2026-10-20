/**
 * O painel de `/turmas` — seis indicadores e o quadro de avisos, de UM ano (Bloco 2, item 4; spec 017, FR-005; o card
 * *Planejadas* e o ano único são do ajuste da conferência de 19/10/2026).
 *
 * ⚠️ **SERVIDOR**: folha é só o botão de abrir os avisos (`AvisosRecolhiveis`, o componente único do molde de
 *    instrutores). Os números e os avisos chegam prontos de `painelDeTurmas`; aqui só se desenha.
 * ⚠️ **O SELETOR DE ANO SAIU DAQUI** (spec 019, ajuste A-1 de 20/10/2026): ele mora no cabeçalho da página, no canto
 *    superior direito — o mesmo lugar do Início.
 * ⚠️ **"NÃO PUDE LER" É DITO, NUNCA ZERO** (FR-005.4, gotcha 4): o tipo de aviso cuja leitura falhou aparece como tal.
 */
import Link from "next/link";

import { AvisosRecolhiveis } from "@/components/ciaara/avisos-recolhiveis";
import { CardKpi } from "@/components/ciaara/card-kpi";
import {
  TITULO_DO_AVISO,
  type AvisoDeTurma,
  type IndicadoresDeTurmas,
  type TipoDeAvisoDeTurma,
} from "@/lib/dominio/painel-de-turmas";
import { enderecoDaTurma } from "@/lib/navegacao/endereco-de-turma";

const TIPOS: readonly TipoDeAvisoDeTurma[] = ["sem_janela", "sem_instrutor", "conflito"];

export function PainelDeTurmas({
  indicadores,
  avisos,
  naoLidos,
  diasDeAviso,
  ano,
}: {
  readonly indicadores: IndicadoresDeTurmas;
  readonly avisos: readonly AvisoDeTurma[];
  readonly naoLidos: readonly TipoDeAvisoDeTurma[];
  readonly diasDeAviso: number | null;
  /** O ano que o painel mostra. */
  readonly ano: number;
}) {
  const cards: readonly (readonly [keyof IndicadoresDeTurmas, string])[] = [
    ["total", "Total"],
    ["planejadas", "Planejadas"],
    ["emAndamento", "Em andamento"],
    ["concluidas", "Concluídas"],
    ["canceladas", "Canceladas"],
    [
      "iniciando",
      diasDeAviso === null ? "Iniciando em breve" : `Iniciando em até ${diasDeAviso} dias`,
    ],
  ];
  const porTipo = TIPOS.map((tipo) => ({
    tipo,
    lista: avisos.filter((a) => a.tipo === tipo),
    naoLido: naoLidos.includes(tipo),
  }));
  const comAlgo = porTipo.filter((p) => p.lista.length > 0 || p.naoLido);

  return (
    <section
      aria-label="Painel de turmas"
      className="flex flex-col gap-3"
      data-slot="painel-de-turmas"
      data-ano={ano}
    >
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(([chave, rotulo]) => (
          <div key={chave} data-slot="indicador-de-turmas" data-chave={chave}>
            <CardKpi
              rotulo={rotulo}
              valor={indicadores[chave] === null ? "—" : String(indicadores[chave])}
              {...(indicadores[chave] === null ? { unidade: "parâmetro não lido" } : {})}
            />
          </div>
        ))}
      </div>

      <section
        aria-labelledby="avisos-de-turmas"
        data-slot="avisos-de-turmas"
        className="border-atrasado-borda bg-atrasado-fundo rounded-ciaara flex flex-col gap-2 border p-3 text-sm"
      >
        <h2 id="avisos-de-turmas" className="text-atrasado-tinta font-semibold">
          O que falta nas turmas
        </h2>
        {comAlgo.length === 0 ? (
          <p className="text-texto" role="status">
            Nenhum aviso neste recorte em {ano}.
          </p>
        ) : (
          <AvisosRecolhiveis
            contagens={
              <ul className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                {comAlgo.map((p) => (
                  <li
                    key={p.tipo}
                    className="text-texto"
                    data-contagem={p.tipo}
                    data-quantidade={p.naoLido ? "" : p.lista.length}
                  >
                    {TITULO_DO_AVISO[p.tipo]}:{" "}
                    {p.naoLido ? <em>não pude ler</em> : <strong>{p.lista.length}</strong>}
                  </li>
                ))}
              </ul>
            }
          >
            <ul className="flex flex-col gap-2">
              {comAlgo.map((p) => (
                <li key={p.tipo} className="flex flex-col gap-1">
                  <p className="text-texto font-medium">{TITULO_DO_AVISO[p.tipo]}</p>
                  {p.naoLido ? (
                    <p className="text-texto" data-slot="aviso-nao-lido" data-tipo={p.tipo}>
                      Não pude ler o que este aviso precisa agora — não quer dizer que não haja.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {p.lista.map((a) => (
                        <li
                          key={`${a.tipo}-${a.turmaCodigo}`}
                          data-slot="aviso-de-turma"
                          data-tipo={a.tipo}
                        >
                          <Link
                            href={enderecoDaTurma(a.turmaCodigo)}
                            className="text-texto font-medium underline-offset-2 hover:underline"
                          >
                            {a.turmaCodigo}
                          </Link>{" "}
                          <span className="text-texto-suave">— {a.detalhe}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </AvisosRecolhiveis>
        )}
      </section>
    </section>
  );
}

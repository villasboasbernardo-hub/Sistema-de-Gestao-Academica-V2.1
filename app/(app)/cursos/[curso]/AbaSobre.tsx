/**
 * A aba "Sobre o Curso" — **as informações gerais, só consulta** (`FR-007`, `RF-CURSO-04`).
 *
 * ⚠️ **SÓ AS INFORMAÇÕES GERAIS DESDE O BLOCO 7** (spec 022, FR-005.2; pedido de Bernardo Villas Boas, 22/10/2026:
 * *"Sobre o Curso só com informações gerais (disciplinas e avaliações saem, sem duplicar)"*). A grade curricular saiu
 * sem mudança — a aba *Disciplinas* já a mostra, com a CH e o total —, e as regras de avaliação do currículo foram
 * para o topo da aba *Avaliações* (`RegrasDeAvaliacao.tsx`, D-11).
 *
 * ⚠️ **NADA AQUI É EDITÁVEL, E NADA É CALCULADO A PARTIR DAQUI.** É a decisão Q-01, e
 * `tests/unidade/sobre-o-curso-so-consulta.test.ts` varre este arquivo para cobrá-la.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** É leitura.
 */
import type * as React from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import {
  ROTULO_DA_CLASSIFICACAO,
  ehClassificacaoDeCurso,
} from "@/lib/dominio/classificacoes-de-curso";
import { instanteParaLeitura } from "@/lib/formato/data";
import { reaisParaLeitura } from "@/lib/formato/moeda";
import { enderecoDoCurriculo } from "@/lib/navegacao/endereco-de-turma";

export type CatalogoDoCurso = {
  readonly codigo: string;
  readonly nome: string;
  readonly classificacao: string;
  readonly modalidade: string | null;
  readonly duracaoSemanas: number | null;
  readonly duracaoDias: number | null;
  readonly limiteTurmasAno: number | null;
  readonly proposito: string | null;
  /* Spec 020 (Bloco 5), C-1 a C-8 — só informativo. */
  readonly ofertavelEstrangeiros: boolean | null;
  readonly estrangeirosObservacao: string | null;
  readonly custoTotal: number | null;
  readonly custoComposicao: string | null;
  /** Quando o PDF foi registrado; `null` sem currículo. */
  readonly curriculoPdfEm: string | null;
  /**
   * Spec 021 (RC-11): o número do currículo mostrado, quando NÃO é o vigente — o link baixa o PDF dele. `null` = o
   * vigente, pelo endereço sem número (o mesmo link de antes).
   */
  readonly curriculoVersao?: number | null;
};

const ROTULO_DA_MODALIDADE: Readonly<Record<string, string>> = {
  presencial: "Presencial",
  ead: "EAD",
  semipresencial: "Semipresencial",
};

const traco = (v: string | number | null) =>
  v === null || String(v).trim() === "" ? "—" : String(v);

/**
 * O rótulo e o campo — **os únicos usos de `--texto-tenue` nesta aba**.
 *
 * ⚠️ O token veste **rótulo e cabeçalho**, nunca valor (`FR-031`). Funilar os três por aqui põe a
 * regra num lugar só, em vez de num comentário repetido em cada `<span>` e cada `<th>`.
 */
function Rotulo({ children }: { readonly children: React.ReactNode }) {
  return <span className="text-texto-tenue">{children}</span>;
}

function Campo({ rotulo, valor }: { readonly rotulo: string; readonly valor: string }) {
  return (
    <p className="text-sm">
      <Rotulo>{rotulo}:</Rotulo> <span className="text-texto">{valor}</span>
    </p>
  );
}

export function AbaSobre({ catalogo }: { readonly catalogo: CatalogoDoCurso }) {
  const classificacao = ehClassificacaoDeCurso(catalogo.classificacao)
    ? ROTULO_DA_CLASSIFICACAO[catalogo.classificacao]
    : catalogo.classificacao;

  return (
    <div className="flex flex-col gap-6" data-slot="aba-sobre">
      <section aria-labelledby="bloco-catalogo" className="flex flex-col gap-2">
        <h3 id="bloco-catalogo" className="text-texto font-semibold">
          Catálogo do curso
        </h3>
        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2" data-slot="catalogo-do-curso">
          <Campo rotulo="Sigla" valor={catalogo.codigo} />
          <Campo rotulo="Nome" valor={catalogo.nome} />
          <Campo rotulo="Classificação" valor={classificacao} />
          <Campo
            rotulo="Modalidade"
            valor={
              catalogo.modalidade
                ? (ROTULO_DA_MODALIDADE[catalogo.modalidade] ?? catalogo.modalidade)
                : "—"
            }
          />
          <Campo rotulo="Duração em semanas" valor={traco(catalogo.duracaoSemanas)} />
          <Campo rotulo="Duração em dias" valor={traco(catalogo.duracaoDias)} />
          <Campo rotulo="Limite de turmas por ano" valor={traco(catalogo.limiteTurmasAno)} />
        </div>
        <p className="text-sm">
          <Rotulo>Propósito:</Rotulo>{" "}
          <span className="text-texto">{traco(catalogo.proposito)}</span>
        </p>
        {/* Spec 020 (Bloco 5): estrangeiros, custo e o currículo — só leitura; edita-se em *Editar curso*. */}
        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2" data-slot="cadastro-do-bloco-5">
          <Campo
            rotulo="Ofertável a estrangeiros"
            valor={
              catalogo.ofertavelEstrangeiros === true
                ? "Sim"
                : catalogo.ofertavelEstrangeiros === false
                  ? "Não"
                  : "Não informado"
            }
          />
          <Campo
            rotulo="Observação sobre estrangeiros"
            valor={traco(catalogo.estrangeirosObservacao)}
          />
          <Campo rotulo="Custo total" valor={reaisParaLeitura(catalogo.custoTotal)} />
          <Campo rotulo="Composição do custo" valor={traco(catalogo.custoComposicao)} />
        </div>
        <p className="text-sm" data-slot="curriculo-do-curso">
          <Rotulo>Currículo (PDF):</Rotulo>{" "}
          {catalogo.curriculoPdfEm ? (
            <>
              <BotaoDeIcone
                acao="baixar"
                rotulo="Baixar o currículo (PDF)"
                nativo
                href={
                  catalogo.curriculoVersao
                    ? enderecoDoCurriculo(catalogo.codigo, catalogo.curriculoVersao)
                    : enderecoDoCurriculo(catalogo.codigo)
                }
                data-slot="baixar-curriculo"
              />{" "}
              {/* veste: a data do envio, ao lado do link — texto secundário, nunca dado novo */}
              <span className="text-texto-tenue">
                · carregado em {instanteParaLeitura(catalogo.curriculoPdfEm)}
              </span>
            </>
          ) : (
            <span className="text-texto-suave">Currículo ainda não carregado.</span>
          )}
        </p>
      </section>
    </div>
  );
}

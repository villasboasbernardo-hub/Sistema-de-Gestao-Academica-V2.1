/**
 * A aba "Sobre o Curso" — **três blocos, só consulta** (`FR-007` a `FR-007.2`, `RF-CURSO-04`).
 *
 * ⚠️ **NADA AQUI É EDITÁVEL, E NADA É CALCULADO A PARTIR DAQUI** além do total de TA da grade. É a
 * decisão Q-01, e `tests/unidade/sobre-o-curso-so-consulta.test.ts` varre este arquivo para cobrá-la.
 *
 * ⚠️ **`carater` E `formula_mf` SÃO EXIBIDOS COMO TEXTO, E NUNCA INTERPRETADOS** (`FR-007.1`). Nenhuma
 * média é calculada, nenhuma aprovação é derivada, nenhum filtro, ordenação ou alerta os lê. A
 * `RNF-NORM-06` proíbe **produzir, calcular ou armazenar** nota, média e aprovação; exibir o que o
 * currículo já diz não produz nenhuma das três.
 *
 * ⚠️ **AS UNIDADES DE ENSINO AINDA NÃO EXISTEM** (`FR-007.2`): `unidades_ensino` tem **0** linhas até
 * o Épico 2 carregar as 572. A grade é organizada **por disciplina** justamente para que elas entrem
 * embaixo de cada uma **sem refazer** esta aba — e enquanto a tabela estiver vazia, **nenhuma UE é
 * exibida nem inventada**.
 *
 * ⚠️ **AS AVALIAÇÕES SÃO LIDAS COM `avaliacoes.ler`, e não `cursos.ler`** — e por isso o bloco
 * distingue *"não há"* de *"você não vê"* (`FR-047`). É o gotcha nº 4: policy restritiva devolve
 * lista vazia sem erro, e a tela diria "este curso não tem avaliação prevista".
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** É leitura.
 */
import type * as React from "react";

import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import {
  ROTULO_DA_CLASSIFICACAO,
  ehClassificacaoDeCurso,
} from "@/lib/dominio/classificacoes-de-curso";

export type DisciplinaDaGrade = {
  readonly codigo: string;
  readonly nome: string;
  readonly cargaHorariaTempos: number | null;
};

export type AvaliacaoPrevista = {
  readonly disciplina: string;
  readonly instrumentos: string | null;
  readonly carater: string | null;
  readonly formulaMf: string | null;
};

export type CatalogoDoCurso = {
  readonly codigo: string;
  readonly nome: string;
  readonly classificacao: string;
  readonly modalidade: string | null;
  readonly duracaoSemanas: number | null;
  readonly duracaoDias: number | null;
  readonly limiteTurmasAno: number | null;
  readonly proposito: string | null;
};

const ROTULO_DA_MODALIDADE: Readonly<Record<string, string>> = {
  presencial: "Presencial",
  ead: "EAD",
  semipresencial: "Semipresencial",
};

const traco = (v: string | number | null) =>
  v === null || String(v).trim() === "" ? "—" : String(v);

/**
 * O rótulo, o campo e o cabeçalho de coluna — **os únicos usos de `--texto-tenue` nesta aba**.
 *
 * ⚠️ O token veste **rótulo e cabeçalho**, nunca valor (`FR-031`). Funilar os três por aqui põe a
 * regra num lugar só, em vez de num comentário repetido em cada `<span>` e cada `<th>`.
 */
function Rotulo({ children }: { readonly children: React.ReactNode }) {
  return <span className="text-texto-tenue">{children}</span>;
}

function Th({ children }: { readonly children: React.ReactNode }) {
  return (
    // veste: o cabeçalho da coluna; as células abaixo são dado
    <th scope="col" className="text-texto-tenue py-1 font-normal">
      {children}
    </th>
  );
}

function Campo({ rotulo, valor }: { readonly rotulo: string; readonly valor: string }) {
  return (
    <p className="text-sm">
      <Rotulo>{rotulo}:</Rotulo> <span className="text-texto">{valor}</span>
    </p>
  );
}

export function AbaSobre({
  catalogo,
  disciplinas,
  avaliacoes,
  avaliacoesLegiveis,
}: {
  readonly catalogo: CatalogoDoCurso;
  readonly disciplinas: readonly DisciplinaDaGrade[];
  readonly avaliacoes: readonly AvaliacaoPrevista[];
  /** `false` quando a policy de `avaliacoes_planejadas` recortou a leitura. */
  readonly avaliacoesLegiveis: boolean;
}) {
  const classificacao = ehClassificacaoDeCurso(catalogo.classificacao)
    ? ROTULO_DA_CLASSIFICACAO[catalogo.classificacao]
    : catalogo.classificacao;

  /*
   * ⚠️ O ÚNICO CÁLCULO DESTA ABA, e ele é uma soma de CH — não uma média, não uma nota. Disciplina
   * sem CH informada entra como zero na soma e mostra traço na linha: somar `null` como zero é a
   * leitura certa de "não informado" numa soma, e inventar um número na célula não seria.
   */
  const totalDeTempos = disciplinas.reduce((s, d) => s + (d.cargaHorariaTempos ?? 0), 0);

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
      </section>

      <section aria-labelledby="bloco-grade" className="flex flex-col gap-2">
        <h3 id="bloco-grade" className="text-texto font-semibold">
          Grade curricular
        </h3>
        {disciplinas.length === 0 ? (
          <EstadoVazio
            motivo="sem-dado"
            titulo="Este curso não tem disciplina ativa"
            detalhe="Nenhuma disciplina ativa está cadastrada para ele."
          />
        ) : (
          <table
            className="w-full border-collapse text-sm"
            data-slot="grade-curricular"
            aria-label="Disciplinas ativas do curso"
          >
            <thead>
              <tr className="border-borda border-b text-left">
                <Th>Código</Th>
                <Th>Disciplina</Th>
                <Th>CH (TA)</Th>
              </tr>
            </thead>
            <tbody>
              {disciplinas.map((d) => (
                <tr key={d.codigo} className="border-borda border-b">
                  <td className="text-texto py-1">{d.codigo}</td>
                  <td className="text-texto py-1">{d.nome}</td>
                  <td className="text-texto py-1">{traco(d.cargaHorariaTempos)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                {/* veste: o rótulo da linha de total; o número ao lado é dado */}
                <td className="text-texto-tenue py-1" colSpan={2}>
                  Total do curso
                </td>
                <td className="text-texto py-1 font-semibold" data-slot="total-de-tempos">
                  {totalDeTempos}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>

      <section aria-labelledby="bloco-avaliacoes" className="flex flex-col gap-2">
        <h3 id="bloco-avaliacoes" className="text-texto font-semibold">
          Avaliações previstas
        </h3>
        {avaliacoes.length === 0 ? (
          <EstadoVazio
            motivo={avaliacoesLegiveis ? "sem-dado" : "sem-permissao"}
            titulo={
              avaliacoesLegiveis
                ? "Nenhuma avaliação prevista no catálogo"
                : "Você não vê as avaliações previstas"
            }
            detalhe={
              avaliacoesLegiveis
                ? "O catálogo oficial não traz avaliação para este curso."
                : "Existe conteúdo aqui — o seu perfil não alcança."
            }
          />
        ) : (
          <table
            className="w-full border-collapse text-sm"
            data-slot="avaliacoes-previstas"
            aria-label="Avaliações previstas do curso"
          >
            <thead>
              <tr className="border-borda border-b text-left">
                <Th>Disciplina</Th>
                <Th>Instrumentos</Th>
                <Th>Caráter</Th>
                <Th>Fórmula da média final</Th>
              </tr>
            </thead>
            <tbody>
              {avaliacoes.map((a, n) => (
                <tr key={`${a.disciplina}-${n}`} className="border-borda border-b">
                  <td className="text-texto py-1">{a.disciplina}</td>
                  <td className="text-texto py-1">{traco(a.instrumentos)}</td>
                  {/* texto do currículo, exibido — nunca interpretado (`FR-007.1`) */}
                  <td className="text-texto py-1">{traco(a.carater)}</td>
                  <td className="text-texto py-1">{traco(a.formulaMf)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

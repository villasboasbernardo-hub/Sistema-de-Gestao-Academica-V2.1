/**
 * Os cartões do catálogo, agrupados por classificação (`FR-001`, `FR-003`, `RF-CURSOS-02`).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Não há interação aqui: cada cartão é um vínculo. Um `"use client"`
 * mandaria os 24 cartões e o vocabulário de classificação para o pacote do navegador, e a tela
 * ficaria idêntica — que é por que ninguém notaria.
 *
 * ⚠️ **A ORDEM DOS GRUPOS É A DO GLOSSÁRIO, e ela vem de `lib/dominio/`.** O banco devolveu uma lista
 * ordenada por sigla; o agrupamento é feito aqui, em memória, sobre as mesmas linhas. Pedir uma
 * consulta por grupo seria a consulta por item que o `FR-012` proíbe.
 *
 * ⚠️ **SÓ INFORMAÇÃO DESCRITIVA NO CARTÃO.** Nada de contagem de turmas nem de status derivado das
 * turmas — a A-7 recusou o filtro por isso, e o cartão segue a mesma decisão. O que o cartão promete
 * é identificar o curso; quem quer o resto clica.
 *
 * ⚠️ **GRUPO VAZIO NÃO APARECE.** Com um filtro de classificação aplicado, quatro dos cinco grupos
 * ficam sem curso — desenhá-los vazios encheria a tela de cabeçalhos sem conteúdo. O conjunto
 * inteiro continua visível no gráfico de cursos por classificação, que mostra os cinco.
 */
import Link from "next/link";

import { BadgeStatus } from "@/components/ciaara/badge-status";
import {
  CLASSIFICACOES_DE_CURSO,
  ROTULO_DA_CLASSIFICACAO,
  type ClassificacaoDeCurso,
} from "@/lib/dominio/classificacoes-de-curso";

export type CartaoDeCurso = {
  readonly codigo: string;
  readonly nome: string;
  readonly classificacao: string;
  readonly modalidade: string | null;
  readonly proposito: string | null;
  readonly duracaoDias: number | null;
  readonly duracaoSemanas: number | null;
  readonly ativo: boolean;
};

const ROTULO_DA_MODALIDADE: Readonly<Record<string, string>> = {
  presencial: "Presencial",
  ead: "EAD",
  semipresencial: "Semipresencial",
};

/** A duração em palavras. Semanas quando há; dias sempre — `duracao_dias` não tem nulo. */
function duracaoEmPalavras(curso: CartaoDeCurso): string {
  const dias = curso.duracaoDias === null ? null : `${curso.duracaoDias} dias`;
  const semanas = curso.duracaoSemanas === null ? null : `${curso.duracaoSemanas} semanas`;
  if (dias && semanas) return `${semanas} · ${dias}`;
  return semanas ?? dias ?? "duração não informada";
}

export function CatalogoDeCursos({ cursos }: { readonly cursos: readonly CartaoDeCurso[] }) {
  const doGrupo = (c: ClassificacaoDeCurso) => cursos.filter((x) => x.classificacao === c);

  return (
    <div className="flex flex-col gap-6" data-slot="catalogo-de-cursos">
      {CLASSIFICACOES_DE_CURSO.map((classificacao) => {
        const doCatalogo = doGrupo(classificacao);
        if (doCatalogo.length === 0) return null;

        return (
          <section
            key={classificacao}
            aria-labelledby={`grupo-${classificacao}`}
            data-grupo={classificacao}
            className="flex flex-col gap-3"
          >
            <h2
              id={`grupo-${classificacao}`}
              className="text-texto flex items-baseline gap-2 text-base font-semibold"
            >
              {ROTULO_DA_CLASSIFICACAO[classificacao]}
              <span className="text-texto-suave text-sm font-normal" data-slot="contagem-do-grupo">
                {doCatalogo.length}
              </span>
            </h2>

            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {doCatalogo.map((curso) => (
                <li key={curso.codigo}>
                  <Link
                    href={`/cursos/${encodeURIComponent(curso.codigo)}`}
                    data-slot="cartao-de-curso"
                    data-curso={curso.codigo}
                    className="border-borda bg-superficie-1 rounded-ciaara hover:border-borda-forte flex h-full flex-col gap-2 border p-3 transition-colors"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-texto font-semibold">{curso.codigo}</span>
                      {curso.ativo ? null : <BadgeStatus tom="inativo" rotulo="Fora de oferta" />}
                    </span>

                    <span className="text-texto text-sm">{curso.nome}</span>

                    {curso.proposito ? (
                      <span className="text-texto-suave line-clamp-3 text-sm">
                        {curso.proposito}
                      </span>
                    ) : null}

                    {/* modalidade e duração são VALOR vindo do curso, não rótulo:
                        `--texto-tenue` veste rótulo, dica, unidade e traço de campo */}
                    <span className="text-texto-suave mt-auto text-xs">
                      {curso.modalidade
                        ? `${ROTULO_DA_MODALIDADE[curso.modalidade] ?? curso.modalidade} · `
                        : ""}
                      {duracaoEmPalavras(curso)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

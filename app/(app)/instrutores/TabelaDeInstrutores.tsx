/**
 * A tabela da listagem de instrutores — **folha de cliente** (`RN-ANT-01`, `FR-013`, `FR-027.1` e
 * `FR-028` da spec 006).
 *
 * ⚠️ O MARCADOR DE CLIENTE PARA AQUI. A página é servidor e continua sendo: o que precisa de navegador
 * é clicar no cabeçalho e escrever `?ordem=` na barra de endereço. `page.tsx` não leva marcador.
 *
 * ⚠️ AS LINHAS CHEGAM EM ANTIGUIDADE, E ESTA FOLHA NÃO AS REORDENA POR CONTA PRÓPRIA. Sem `?ordem=`, a
 * tabela mostra a ordem do banco. Com ele, reordena **por cima**, na apresentação — e a coluna de
 * posto ordena por `ordem_antiguidade`, para que "ordenar por posto" nunca vire ordem alfabética.
 *
 * ⚠️ SEM EDIÇÃO EM LINHA (`FR-013`). A spec 038 da v2.0 a removeu; ativar uma linha abre a ficha.
 *
 * ⚠️ AS LINHAS NÃO TRAZEM DADO PESSOAL. O tipo abaixo é o mínimo que a tabela desenha: o que entra
 * numa folha de cliente vai para o navegador.
 */
"use client";

import { useRouter } from "next/navigation";

import { NomeInstrutor } from "@/components/ciaara/nome-instrutor";
import { TabelaDensa, type Coluna, type Ordem } from "@/components/ciaara/tabela-densa";
import { rotuloDoRegime } from "@/lib/constantes/instrutor";
import { useParametro } from "@/lib/navegacao/usar-parametro";

export type LinhaDeInstrutor = {
  readonly id: string;
  readonly codigo: string;
  readonly pg: string;
  readonly especialidade: string | null;
  readonly nomeCompleto: string;
  readonly nomeDeGuerra: string | null;
  readonly categoria: string;
  readonly om: string;
  readonly regime: string | null;
  readonly ordemAntiguidade: number;
};

/** `nome_desc` → `{ chave: "nome", crescente: false }`. Vazio é a ordem do banco. */
function paraOrdem(valor: string): Ordem | null {
  if (valor === "") return null;
  const decrescente = valor.endsWith("_desc");
  return { chave: decrescente ? valor.slice(0, -"_desc".length) : valor, crescente: !decrescente };
}

function paraParametro(ordem: Ordem | null): string | null {
  if (ordem === null) return null;
  return ordem.crescente ? ordem.chave : `${ordem.chave}_desc`;
}

const COLUNAS: readonly Coluna<LinhaDeInstrutor>[] = [
  {
    chave: "posto",
    titulo: "Posto/Graduação",
    ordenavel: true,
    // ⚠️ Ordena pela antiguidade, e não pelo texto do posto — "CC" viria antes de "CMG".
    valor: (l) => l.ordemAntiguidade,
    celula: (l) => l.pg,
  },
  {
    chave: "nome",
    titulo: "Nome",
    ordenavel: true,
    valor: (l) => l.nomeCompleto,
    celula: (l) => (
      <NomeInstrutor
        instrutor={{
          id: l.id,
          pg: l.pg,
          especialidade: l.especialidade,
          nomeCompleto: l.nomeCompleto,
          nomeDeGuerra: l.nomeDeGuerra,
        }}
      />
    ),
  },
  {
    chave: "categoria",
    titulo: "Categoria",
    ordenavel: true,
    valor: (l) => l.categoria,
    celula: (l) => l.categoria,
  },
  { chave: "om", titulo: "OM", ordenavel: true, valor: (l) => l.om, celula: (l) => l.om },
  {
    chave: "regime",
    titulo: "Regime",
    ordenavel: true,
    valor: (l) => l.regime ?? "",
    celula: (l) => rotuloDoRegime(l.regime),
  },
];

export function TabelaDeInstrutores({ linhas }: { readonly linhas: readonly LinhaDeInstrutor[] }) {
  const router = useRouter();
  const [ordem, definirOrdem] = useParametro("/instrutores", "ordem");

  return (
    <TabelaDensa
      rotulo="Instrutores"
      linhas={linhas}
      colunas={COLUNAS}
      chaveLinha={(l) => l.id}
      ordem={paraOrdem(ordem)}
      aoOrdenar={(proxima) => void definirOrdem(paraParametro(proxima))}
      aoAtivarLinha={(l) => router.push(`/instrutores/${l.codigo}`)}
    />
  );
}

/**
 * A tabela da listagem de instrutores — **folha de cliente** (`RN-ANT-01`, `FR-013`, `FR-027.1` e
 * `FR-028` da spec 006).
 *
 * ⚠️ O MARCADOR DE CLIENTE PARA AQUI. A página é servidor e continua sendo: o que precisa de navegador
 * é clicar no cabeçalho e escrever `?ordem=` na barra de endereço. `page.tsx` não leva marcador.
 *
 * ⚠️ AS LINHAS CHEGAM EM ANTIGUIDADE, E ESTA FOLHA NÃO AS REORDENA POR CONTA PRÓPRIA. Sem `?ordem=`, a
 * tabela mostra a ordem do banco. Com ele, reordena **por cima**, na apresentação — e a coluna
 * "Instrutor" ordena por `ordem_antiguidade`, para que "ordenar por posto" nunca vire ordem alfabética.
 *
 * ⚠️ UMA COLUNA "INSTRUTOR", E NÃO POSTO E NOME SEPARADOS (`FR-027.1` emendado em 15/09/2026, decisão
 * de Bernardo Villas Boas; spec 020 da v2.0). O nome já sai no formato do `FR-019` — posto,
 * especialidade e nome completo, com o nome de guerra em negrito —, e uma coluna de posto ao lado o
 * repetiria. Clicar no cabeçalho continua ordenando por posto, que é a antiguidade (`?ordem=posto`).
 *
 * ⚠️ SEM EDIÇÃO EM LINHA (`FR-013`). A spec 038 da v2.0 a removeu; ativar uma linha abre a ficha.
 *
 * ⚠️ DOIS CAMINHOS PARA A FICHA, UM POR DISPOSITIVO. A grade ativa linha só por teclado (`Enter`), e
 * sem mais nada quem usa mouse não chegaria à ficha pela listagem — defeito que a ponta a ponta do
 * passo 5 revelou. O nome é link, com `tabIndex={-1}`: o clique funciona, e a grade continua sendo
 * **uma** parada de tabulação, como o contrato de teclado da `TabelaDensa` exige.
 *
 * ⚠️ AS LINHAS NÃO TRAZEM DADO PESSOAL. O tipo abaixo é o mínimo que a tabela desenha: o que entra
 * numa folha de cliente vai para o navegador.
 */
"use client";

import Link from "next/link";
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
  /** TA ministrados no ano corrente; `null` quando a leitura da carga falhou — nunca zero inventado. */
  readonly cargaNoAno: number | null;
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

function colunas(ano: number): readonly Coluna<LinhaDeInstrutor>[] {
  return [
    {
      // ⚠️ A chave é `posto`: ordenar esta coluna é ordenar por antiguidade, e não pelo texto do nome
      // nem do posto — "CC" viria antes de "CMG".
      chave: "posto",
      titulo: "Instrutor",
      ordenavel: true,
      valor: (l) => l.ordemAntiguidade,
      celula: (l) => (
        <Link
          href={`/instrutores/${l.codigo}`}
          tabIndex={-1}
          className="text-texto underline-offset-2 hover:underline"
        >
          <NomeInstrutor
            instrutor={{
              id: l.id,
              pg: l.pg,
              especialidade: l.especialidade,
              nomeCompleto: l.nomeCompleto,
              nomeDeGuerra: l.nomeDeGuerra,
            }}
          />
        </Link>
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
    {
      // ⚠️ SÓ LEITURA (`FR-015`): a carga é derivada dos lançamentos, e esta célula não tem campo.
      chave: "ch_ano",
      titulo: `CH ${ano} (TA)`,
      numerica: true,
      ordenavel: true,
      valor: (l) => l.cargaNoAno ?? -1,
      celula: (l) => (l.cargaNoAno === null ? "—" : l.cargaNoAno),
    },
  ];
}

export function TabelaDeInstrutores({
  linhas,
  ano,
}: {
  readonly linhas: readonly LinhaDeInstrutor[];
  readonly ano: number;
}) {
  const router = useRouter();
  const [ordem, definirOrdem] = useParametro("/instrutores", "ordem");

  return (
    <TabelaDensa
      rotulo="Instrutores"
      linhas={linhas}
      colunas={colunas(ano)}
      chaveLinha={(l) => l.id}
      ordem={paraOrdem(ordem)}
      aoOrdenar={(proxima) => void definirOrdem(paraParametro(proxima))}
      aoAtivarLinha={(l) => router.push(`/instrutores/${l.codigo}`)}
    />
  );
}

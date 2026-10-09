/**
 * A tabela da lista de turmas — **folha de cliente** (`FR-012`, `FR-016` da spec 012).
 *
 * ⚠️ O MARCADOR DE CLIENTE PARA AQUI. A página é servidor e continua sendo: o que precisa de
 * navegador é ordenar por cabeçalho e ativar a linha.
 *
 * ⚠️ **O ENDEREÇO DA FICHA SAI DE `enderecoDaTurma`, SEMPRE.** O código da turma **contém espaços**
 * (`C-ApA-AuxNav-PR-SP T1 2026`), e um caminho montado à mão funciona na primeira tela e falha **em
 * silêncio** na que esquecer de codificar — o navegador aceita o espaço e o servidor recebe outra
 * coisa. Há guarda que reprova qualquer `"/turmas/…"` escrito fora daquele módulo.
 *
 * ⚠️ **DOIS CAMINHOS PARA A FICHA, UM POR DISPOSITIVO.** A grade ativa linha por teclado (`Enter`), e
 * sem mais nada quem usa mouse não chegaria à ficha pela lista — é o defeito que a ponta a ponta do
 * cadastro de instrutores revelou na fatia (c). O código é link, com `tabIndex={-1}`: o clique
 * funciona, e a grade continua sendo **uma** parada de tabulação.
 *
 * ⚠️ **O NOME ACESSÍVEL DO LINK É `rotuloDaTurma`, e não o texto da célula.** É o construtor único do
 * rótulo de turma, e o que ele garante importa aqui: ele **nunca sai vazio** — código em branco vira
 * *"(sem código)"*. Sem ele, uma turma sem código daria um link **sem nome nenhum**, que é defeito de
 * acessibilidade e some da varredura de controle sem nome. O texto na tela segue sendo o código,
 * porque a situação já tem coluna própria e repeti-la seria ruído.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { BadgeStatus } from "@/components/ciaara/badge-status";
import { TabelaDensa, type Coluna } from "@/components/ciaara/tabela-densa";
import {
  ROTULO_DO_STATUS_DE_TURMA,
  rotuloDaTurma,
  TOM_DO_STATUS_DE_TURMA,
} from "@/lib/dominio/seletor-de-turma";
import {
  AVISO_DE_TURMA_EAD,
  ehEadPuro,
  ROTULO_CURTO_DE_TURMA_EAD,
} from "@/lib/dominio/dsa/ead-puro";
import { dataIlegivel, dataParaLeitura } from "@/lib/formato/data";
import { enderecoDaTurma, enderecoDoDsa } from "@/lib/navegacao/endereco-de-turma";

import type { TurmaNaLista } from "./consulta";

const traco = (v: string | null) => (v === null || v.trim() === "" ? "—" : v);

/**
 * `C-Ap-FR T2 2026` → `01/02/2026 a 30/11/2026`, ou traço quando falta ponta.
 *
 * ⚠️ **ELA MONTAVA O FORMATO POR CONTA PRÓPRIA ATÉ 05/10/2026, E ACERTAVA — era o pior caso.** Um
 *    segundo dono do formato que produz o mesmo resultado não reprova em teste nenhum: ele só
 *    diverge no dia em que um dos dois muda. É o caminho que o botão de limpar filtros percorreu
 *    antes de virar componente, e a terceira cópia é a que se esquece.
 * ⚠️ **A CHAVE DE ORDENAÇÃO DA COLUNA CONTINUA EM ISO** (ver `valor:` na coluna `janela`): ISO ordena
 *    alfabeticamente igual a cronologicamente, e `DD/MM/AAAA` ordenaria por DIA.
 */
function janela(inicio: string | null, termino: string | null): string {
  const dia = (iso: string | null) => {
    const lido = dataParaLeitura(iso);
    return dataIlegivel(lido) ? null : lido;
  };
  const de = dia(inicio);
  const ate = dia(termino);
  if (de === null && ate === null) return "—";
  if (de === null) return `até ${ate}`;
  if (ate === null) return `de ${de}`;
  return `${de} a ${ate}`;
}

const COLUNAS: readonly Coluna<TurmaNaLista>[] = [
  {
    chave: "codigo",
    titulo: "Turma",
    ordenavel: true,
    valor: (l) => l.codigo,
    celula: (l) => (
      <Link
        href={enderecoDaTurma(l.codigo)}
        tabIndex={-1}
        aria-label={rotuloDaTurma({
          codigo: l.codigo,
          ano: l.ano,
          dataInicio: l.dataInicio,
          status: l.status,
        })}
        className="text-texto underline-offset-2 hover:underline"
      >
        {traco(l.codigo)}
      </Link>
    ),
  },
  /*
   * ⚠️ **O SEGUNDO DOS TRÊS CAMINHOS ATÉ O DSA** (`FR-011` da spec 013). Ele é ação de LINHA, e não
   *    um link no código da turma: o código já leva à ficha, e dois destinos na mesma célula fazem
   *    a pessoa descobrir qual é qual por tentativa.
   * ⚠️ **`tabIndex={-1}` como as outras células**: a parada de tabulação é da célula da grade, pelo
   *    *roving tabindex* — dar `0` ao link faria a tabela de 28 turmas ter 28 paradas a mais.
   */
  {
    chave: "dsa",
    titulo: "DSA",
    ordenavel: false,
    valor: (l) => l.codigo,
    /*
     * ⚠️ **TURMA EAD PURO: O AVISO NO LUGAR DO LINK** (item 9 da conferência do PR #40, 08/10/2026).
     *    A regra e a frase são de `lib/dominio/dsa/ead-puro.ts`, as mesmas da ficha, do `/inicio` e
     *    da rota do DSA. Semipresencial mantém o link (`D-DSA-2`).
     */
    celula: (l) =>
      ehEadPuro(l.modalidade) ? (
        /*
         * ⚠️ **CURTO NA CÉLULA, A FRASE INTEIRA AO APONTAR OU AO FOCAR** (dúvida 7 do PR #40). O foco
         *    é o da CÉLULA — a tabela navega por célula —, e por isso a frase abre com `in-focus`
         *    (algum ancestral focado) e não com um gatilho focável próprio, que daria à grade uma
         *    segunda parada de `Tab`. Leitor de tela recebe a frase inteira, sempre.
         */
        <span className="group relative inline-block" data-slot="dsa-turma-ead">
          <span aria-hidden="true" className="text-texto-suave text-xs">
            {ROTULO_CURTO_DE_TURMA_EAD}
          </span>
          <span className="sr-only">{AVISO_DE_TURMA_EAD}</span>
          <span
            aria-hidden="true"
            data-slot="dsa-turma-ead-completo"
            className="rounded-ciaara border-borda bg-superficie text-texto absolute top-full left-0 z-10 mt-1 hidden w-64 border p-2 text-xs whitespace-normal shadow-sm group-hover:block in-focus:block"
          >
            {AVISO_DE_TURMA_EAD}
          </span>
        </span>
      ) : (
        <Link
          href={enderecoDoDsa(l.codigo)}
          tabIndex={-1}
          aria-label={`Abrir o DSA da turma ${l.codigo}`}
          className="text-marca underline-offset-2 hover:underline"
          data-slot="dsa-da-linha"
        >
          DSA
        </Link>
      ),
  },
  {
    chave: "curso",
    titulo: "Curso",
    ordenavel: true,
    valor: (l) => l.cursoCodigo,
    celula: (l) => (
      <span className="whitespace-nowrap">
        {l.cursoCodigo}
        {/* veste: o nome do curso acompanha a sigla, em tom secundário */}
        <span className="text-texto-suave"> — {l.cursoNome}</span>
      </span>
    ),
  },
  {
    chave: "ano",
    titulo: "Ano",
    numerica: true,
    ordenavel: true,
    valor: (l) => l.ano,
    celula: (l) => l.ano,
  },
  {
    chave: "janela",
    titulo: "Janela",
    ordenavel: true,
    valor: (l) => l.dataInicio ?? "",
    celula: (l) => janela(l.dataInicio, l.dataTermino),
  },
  {
    chave: "situacao",
    titulo: "Situação",
    ordenavel: true,
    valor: (l) => l.status,
    celula: (l) => (
      <BadgeStatus
        tom={TOM_DO_STATUS_DE_TURMA[l.status] ?? "planejado"}
        rotulo={ROTULO_DO_STATUS_DE_TURMA[l.status] ?? l.status}
      />
    ),
  },
  {
    chave: "alunos",
    titulo: "Efetivo",
    numerica: true,
    ordenavel: true,
    // ⚠️ `-1` ordena o desconhecido num extremo só; na célula ele é traço, nunca zero inventado.
    valor: (l) => l.alunos ?? -1,
    celula: (l) => (l.alunos === null ? "—" : l.alunos),
  },
];

/**
 * ⚠️ **A ORDENAÇÃO FICA POR DENTRO DA TABELA, E ISSO É DECISÃO.** `/turmas` **não** declara parâmetro
 * `ordem` no contrato: a ordem útil — ano decrescente, código crescente — já vem da consulta, e
 * clicar num cabeçalho é refinar a vista **daquele instante**, não um recorte a compartilhar. Os
 * quatro parâmetros que viram link são os que mudam **qual conjunto** se vê.
 *
 * ⚠️ **E NÃO PASSAR `ordem`/`aoOrdenar` É O QUE MANTÉM A ORDENAÇÃO FUNCIONANDO:** as duas
 * propriedades são opcionais, e a tabela guarda a ordem por dentro quando ninguém a controla de fora.
 * Passar só `ordem` a deixaria presa num valor que nada atualiza — cabeçalho clicável que não ordena.
 */
export function TabelaDeTurmas({ linhas }: { readonly linhas: readonly TurmaNaLista[] }) {
  const router = useRouter();

  return (
    <TabelaDensa
      rotulo="Turmas"
      linhas={linhas}
      colunas={COLUNAS}
      chaveLinha={(l) => l.id}
      aoAtivarLinha={(l) => router.push(enderecoDaTurma(l.codigo))}
    />
  );
}

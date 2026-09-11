/**
 * O gancho que lê e escreve um parâmetro da URL **pelo contrato** (`FR-002`, `FR-004`, `FR-004.1`,
 * `FR-005`, `FR-045`).
 *
 * Contrato: `specs/008-shell-e-estado-na-url/contracts/parametros.md` · documento 25 §1.4 e §1.6
 *
 * ⚠️ O GANCHO SE CHAMA `useParametro`, E O PREFIXO EM INGLÊS É EXIGÊNCIA DO MOTOR, NÃO TRADUÇÃO.
 * A regra de idioma do projeto tem exatamente esta classe de exceção — identificador de banco é
 * `snake_case` sem acento pelo mesmo motivo. O React identifica gancho **pelo nome**, e a regra de
 * lint `rules-of-hooks` recusa qualquer outro: com `usarParametro`, a checagem que impede um gancho
 * de ser chamado dentro de condição **deixa de valer para este arquivo inteiro**. Perder essa
 * checagem para ganhar um verbo em português seria trocar segurança por aparência.
 *
 * ⚠️ E O PRECEDENTE JÁ EXISTIA: o documento 25 §1.4 e §1.5 escrevem `useParametrosDsa` e
 * `useParametrosInstrutores` desde a Fase 2. O nome do **arquivo** continua em português.
 *
 * ⚠️ QUEM CHAMA NÃO ESCOLHE POLÍTICA, E ESSE É O PONTO. Histórico, aviso ao servidor, limite de
 * frequência e remoção do padrão saem todos do descritor. O documento 25 §1.6 chama a política de
 * histórico de *"a única regra que se erra na prática"* — e ela se erra porque é uma opção solta na
 * chamada, que cada tela decide de novo. Aqui não há o que decidir.
 *
 * ⚠️ TRÊS DOS QUATRO ERROS DESTE ARQUIVO SÃO SILENCIOSOS, e é por isso que ele existe:
 *
 * | Opção esquecida | O que a tela mostra | O que está errado |
 * |---|---|---|
 * | `history` | tudo certo | o botão voltar não desfaz a troca |
 * | `shallow` | URL certa, número velho | o servidor não recalculou |
 * | `clearOnDefault` | tudo certo | a URL acumula `?x=` vazio no link compartilhado |
 * | `limitUrlUpdates` | tudo certo | oito teclas viram oito idas ao servidor |
 *
 * Nenhum deles quebra a tela. Todos sobrevivem a uma revisão de código atenta.
 *
 * ⚠️ `shallow` NÃO SIGNIFICA "SEM RECARREGAR A PÁGINA" (`FR-004.1`). Na biblioteca decidida ele
 * significa **não avisar o servidor**, e o valor padrão é `true` — ligado num filtro, ele mantém a
 * URL em dia e deixa a consulta velha na tela. Por isso ele é derivado de `avisaServidor`, invertido,
 * e não copiado.
 */
"use client";

import * as React from "react";
import { createParser, parseAsArrayOf, throttle, useQueryState, type Options } from "nuqs";

import {
  CONTRATO,
  descritor,
  type Parametro,
  type ParametroDe,
  type Rota,
} from "@/lib/navegacao/contrato";
import { conferirValor } from "@/lib/navegacao/esquema";

/**
 * As opções da biblioteca, derivadas do descritor — **nenhuma delas é escolha de quem chama**.
 *
 * ⚠️ `scroll: false` porque trocar recorte não é trocar de tela: pular para o topo a cada clique num
 * filtro faz a pessoa perder o lugar numa tabela longa, que é o normal deste sistema.
 */
export function opcoesDoParametro(
  p: Parametro,
  iniciarTransicao?: React.TransitionStartFunction,
): Options {
  const base: Options = {
    history: p.historico === "empilha" ? "push" : "replace",
    // ⚠️ Invertido de propósito: `shallow` é "não avisar o servidor".
    shallow: !p.avisaServidor,
    // `FR-002`: o parâmetro no valor padrão some da URL. É o padrão da biblioteca, e fica explícito
    // porque a regra é do contrato, e não da biblioteca — trocar de biblioteca não pode revogá-la.
    clearOnDefault: true,
    scroll: false,
  };

  const comLimite =
    p.limiteDeFrequenciaMs === undefined
      ? base
      : { ...base, limitUrlUpdates: throttle(p.limiteDeFrequenciaMs) };

  /*
   * `FR-045`: o sinal visível vem daqui. Sem a transição, uma troca que avisa o servidor deixa a
   * tela muda entre o comando e a resposta — e o que estraga a experiência não é a latência, é o
   * silêncio: sem sinal, a pessoa clica de novo.
   */
  return iniciarTransicao === undefined
    ? comLimite
    : { ...comLimite, startTransition: iniciarTransicao };
}

/**
 * O analisador de um item, **delegado ao mesmo conferidor que o servidor usa**.
 *
 * ⚠️ Escrever a validação aqui de novo seria o segundo lugar onde o domínio vive, e dois lugares
 * divergem. Devolver `null` faz a biblioteca cair no padrão — que é exatamente o `FR-006`.
 */
function analisadorDeItem(p: Parametro) {
  return createParser<string | number>({
    parse: (bruto) => conferirValor(p, bruto),
    serialize: (valor) => String(valor),
  });
}

/**
 * O analisador de um parâmetro inteiro, com o padrão já aplicado.
 *
 * ⚠️ A LISTA VIAJA SEPARADA POR VÍRGULA (`?secoes=a,b`), e a leitura do servidor aceita as duas
 * formas — vírgula e chave repetida. A barra de endereço é entrada de usuário, e quem cola um link
 * de outra ferramenta não sabe qual das duas este sistema escolheu.
 */
function analisadorDe(p: Parametro) {
  if (p.tipo === "lista") {
    return parseAsArrayOf(analisadorDeItem(p)).withDefault([...p.padrao] as (string | number)[]);
  }
  return analisadorDeItem(p).withDefault(p.padrao);
}

type Descritores<R extends Rota> = (typeof CONTRATO)[R]["parametros"];

/** O tipo do valor, tirado do contrato — não do que a tela achar que ele é. */
export type ValorDe<R extends Rota, N extends ParametroDe<R>> = Descritores<R>[N] extends {
  readonly tipo: "inteiro";
}
  ? number
  : Descritores<R>[N] extends { readonly tipo: "lista" }
    ? readonly string[]
    : string;

export type DefinirValor<T> = (proximo: T | null) => Promise<URLSearchParams>;

/**
 * Lê e escreve um parâmetro da rota. Devolve **três** coisas, e a terceira é a que costuma faltar.
 *
 * @returns `[valor, definir, pendente]` — `pendente` é verdadeiro enquanto o servidor recalcula
 * (`FR-045`). Para parâmetro puramente visual ele é sempre falso, porque não há espera.
 *
 * ⚠️ PASSAR `null` A `definir` VOLTA AO PADRÃO, e é assim que o parâmetro some da URL (`FR-002`).
 */
export function useParametro<R extends Rota, N extends ParametroDe<R>>(
  rota: R,
  nome: N,
): readonly [ValorDe<R, N>, DefinirValor<ValorDe<R, N>>, boolean] {
  const p = descritor(rota, nome);
  const [pendente, iniciarTransicao] = React.useTransition();

  /*
   * ⚠️ A TRANSIÇÃO SÓ É ENTREGUE A QUEM AVISA O SERVIDOR. Passá-la a um parâmetro visual criaria um
   * estado de espera que nunca termina de forma observável, e um indicador que pisca à toa treina
   * quem usa a ignorá-lo.
   */
  const opcoes = p.avisaServidor ? opcoesDoParametro(p, iniciarTransicao) : opcoesDoParametro(p);

  const [valor, definir] = useQueryState(nome, analisadorDe(p).withOptions(opcoes));

  /*
   * O elenco é local e declarado: o descritor é uma união resolvida em tempo de execução, e o tipo
   * estático vem do contrato literal. As duas descrições são a mesma — `analisadorDe` deriva do
   * mesmo descritor de que `ValorDe` deriva —, mas a linguagem não consegue costurá-las sozinha.
   */
  return [
    valor as ValorDe<R, N>,
    definir as unknown as DefinirValor<ValorDe<R, N>>,
    p.avisaServidor ? pendente : false,
  ] as const;
}

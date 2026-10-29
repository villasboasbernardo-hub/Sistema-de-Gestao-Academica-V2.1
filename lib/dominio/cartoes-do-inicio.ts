/**
 * Os cartões do Início — spec 019 (Bloco 4), ajuste A-2 da conferência de 20/10/2026.
 *
 * > *"CARTÕES DO INÍCIO MAIORES, e só das turmas com situação ATIVA do ano escolhido (planejada, concluída, cancelada e
 * > arquivada fora). Os números do painel continuam contando todas. Sem turma ativa no ano: estado vazio com uma frase,
 * > não carrossel vazio."* — Bernardo Villas Boas, 20/10/2026
 *
 * > **RT-8** *"Arquivar esconde a turma das listas do dia a dia — carrossel das turmas, submenu, listas de ativas e de
 * > escolha, avisos —, mas ela CONTINUA contando nas estatísticas e nos cartões do ano dela, com a situação que
 * > tinha."* — Bernardo Villas Boas, 28/10/2026 (spec 029, Bloco 14, `FR-007`)
 *
 * ⚠️ **AS DUAS FUNÇÕES RECEBEM A MESMA POPULAÇÃO, E SÓ UMA TIRA A ARQUIVADA** (RT-8; D-17 da spec 029): a página
 *    entrega o panorama do ano escolhido (RT-6) e do recorte **com** a arquivada, cada turma levando a marca
 *    `arquivada`. O carrossel (`cartoesDoInicio`) é lista do dia a dia e a tira; os números (`contagemPorSituacao`)
 *    não. Até o Bloco 14 a página tirava a arquivada ANTES do panorama (D-26 da spec 026), e os números deixavam de
 *    contá-la — contra a própria A-2 citada acima, *"os números do painel continuam contando todas"*.
 * ⚠️ **A ARQUIVADA NÃO TEM SITUAÇÃO PRÓPRIA** (D-COR-5): arquivar não muda `status`, então ela conta pela situação que
 *    tinha — a concluída arquivada em *Concluídas*, a ativa arquivada em *Turmas ativas* (sem cartão).
 * ⚠️ **A ORDEM DE CHEGADA SE MANTÉM** — é a do panorama, a única do sistema desde o Bloco 7 (spec 022, FR-003).
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.**
 */

/**
 * As turmas que ganham cartão no Início: as ATIVAS que NÃO estão arquivadas (A-2; RT-8, D-17 da spec 029).
 *
 * ⚠️ **A MARCA `arquivada` É OBRIGATÓRIA NO TIPO**, de propósito: quem esquecer de levá-la não compila, em vez de ver
 *    a ativa arquivada voltar ao carrossel em silêncio.
 */
export function cartoesDoInicio<T extends { readonly status: string; readonly arquivada: boolean }>(
  turmas: readonly T[],
): T[] {
  return turmas.filter((t) => t.status === "ativa" && !t.arquivada);
}

/**
 * Os números do topo do Início: as turmas do ano escolhido por situação (RD-8, Bloco 11).
 *
 * > *"INÍCIO, CARTÕES (RD-8): Turmas ativas (= em andamento) · Planejadas · Concluídas · Canceladas, do ano escolhido.
 * > Sair: Turmas no recorte, Carga executada, Progresso no recorte."* — Bernardo Villas Boas, 26/10/2026
 *
 * ⚠️ **A POPULAÇÃO É A DO PANORAMA DO ANO, COM A ARQUIVADA** (RT-8; emenda a D-26 e o FR-006.1 da spec 026): o ano da
 *    turma (RT-6) e o recorte de classificação e modalidade já vêm aplicados; a arquivada **fica** e conta pela
 *    situação que tinha. Aqui só se conta pela situação — nenhum filtro, nem de arquivada: um filtro aqui desfaria a
 *    RT-8 sem que a tela mostrasse diferença nenhuma além de um número menor.
 * ⚠️ Por isso *Turmas ativas* = os cartões **mais** as ativas arquivadas do ano — não é mais igual aos cartões.
 */
export function contagemPorSituacao(turmas: readonly { readonly status: string }[]): {
  readonly ativas: number;
  readonly planejadas: number;
  readonly concluidas: number;
  readonly canceladas: number;
} {
  const conta = (s: string) => turmas.filter((t) => t.status === s).length;
  return {
    ativas: conta("ativa"),
    planejadas: conta("planejada"),
    concluidas: conta("concluida"),
    canceladas: conta("cancelada"),
  };
}

/**
 * A frase do carrossel das turmas SEM cartão (A-2; RT-8 e D-19 da spec 029) — ou `null`, havendo cartão.
 *
 * > *"Sem turma ativa no ano: estado vazio com uma frase, não carrossel vazio."* — Bernardo Villas Boas, 20/10/2026 (A-2)
 *
 * ⚠️ **O VAZIO NÃO DESMENTE O NÚMERO AO LADO** (revisão do Bloco 14, achados 1 e 13): com a RT-8, *Turmas ativas* conta a
 *    ativa arquivada, e o carrossel não a mostra. Quando ela é a única ativa do ano (ou do recorte), a frase do A-2 —
 *    *"Nenhuma turma em andamento em ANO."* — saía logo abaixo do cartão *"Turmas ativas: 1"*. Agora a frase diz quantas
 *    ativas estão arquivadas, que elas contam no cartão e como vê-las, no espírito da D-19 de `/turmas`.
 * ⚠️ **SEM CARTÃO, AS ATIVAS DO PANORAMA SÃO TODAS ARQUIVADAS**: `ativas` é o `contagemPorSituacao(...).ativas` da mesma
 *    população (RT-8), e `cartoes` o tamanho de `cartoesDoInicio(...)`; a diferença é o número de ativas arquivadas.
 * ⚠️ **SEM ATIVA NENHUMA, A FRASE DO A-2 FICA COMO ERA** — os e2e `A-2` e `T8` de `inicio-bloco-4.spec.ts` conferem o
 *    texto exato.
 */
export function fraseDoCarrosselVazio(
  ativas: number,
  cartoes: number,
  ano: number,
  temRecorte: boolean,
): string | null {
  if (cartoes > 0) return null;
  const recorte = temRecorte ? " neste recorte" : "";
  const arquivadas = ativas - cartoes;
  if (arquivadas <= 0) return `Nenhuma turma em andamento em ${ano}${recorte}.`;
  const uma = arquivadas === 1;
  return (
    `Nenhuma turma em andamento no carrossel de ${ano}${recorte}: ` +
    (uma
      ? "1 turma ativa está arquivada — contada em «Turmas ativas», fora do carrossel. Para vê-la"
      : `${arquivadas} turmas ativas estão arquivadas — contadas em «Turmas ativas», fora do carrossel. Para vê-las`) +
    ", abra Turmas e, nos Filtros, em Arquivadas, escolha «Mostrar arquivadas»."
  );
}

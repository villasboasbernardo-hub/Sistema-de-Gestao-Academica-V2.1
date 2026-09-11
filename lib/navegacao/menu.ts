/**
 * As entradas do menu lateral (`RF-NAV-02`, `RF-CURSO-02`, `FR-017`, `FR-017.1`).
 *
 * ⚠️ **ESTA LISTA É RASCUNHO ATÉ BERNARDO VALIDÁ-LA CONTRA A v2.0**, e a marcação está no tipo, não
 * num comentário solto. Ela foi derivada da árvore de rotas do documento 24 §1 — que é o **alvo da
 * v2.1**, e não o menu que existe em produção. O `RF-NAV-02` é **[PRESERVADO]** e diz, com todas as
 * letras, que a troca de mecanismo de estado *"não autoriza reorganizar o menu nem renomear
 * entradas"*. Derivar da árvore-alvo é exatamente reorganizar sem perceber.
 *
 * ⚠️ **DUAS ROTAS EXISTEM E NÃO ENTRAM AQUI**, por força do `RF-CURSO-02`, também **[PRESERVADO]**:
 * Avaliações e Relatório são alcançadas **pela página do curso**, e o requisito escreve que elas
 * *"não devem ter entrada própria no menu lateral"*. Quem derivar a lista da árvore de rotas sem ler
 * o `RF-CURSO-02` acrescenta duas entradas que a v2.0 nunca teve — e a ausência delas é
 * comportamento pretendido, verificado por teste, não lacuna.
 *
 * ⚠️ **ESCONDER ENTRADA NÃO PROTEGE NADA** (Princípio XI). Quem nega acesso é o banco, ainda que a
 * pessoa digite a URL à mão. O menu é cortesia; a RLS é a fronteira.
 */

export type EntradaDeMenu = {
  /** O rótulo como aparece na tela. **Não renomear sem o `RF-NAV-02`.** */
  readonly rotulo: string;
  readonly rota: string;
  /**
   * A tela já existe?
   *
   * ⚠️ **A LISTA INTEIRA APARECE, INCLUSIVE O QUE AINDA NÃO EXISTE**, e isto é decisão, não
   * descuido. Um menu que cresce a cada épico ensina quem usa a reaprender a navegação sete vezes.
   * A entrada que ainda não tem tela é mostrada **e anunciada como indisponível** — quem chega nela
   * sabe que ela vem, em vez de concluir que o sistema perdeu a função.
   */
  readonly disponivel: boolean;
  /** O épico que entrega a tela. Serve para a mensagem, e para ninguém esquecer de ligar a entrada. */
  readonly entregaEm: string;
};

/**
 * ⚠️ **AS DUAS AUSÊNCIAS SÃO DECLARADAS AQUI, e não deduzidas da falta.** Um teste lê esta lista:
 * se alguém acrescentar uma entrada para elas, ele reprova com o requisito no texto do erro.
 */
export const FORA_DO_MENU = [
  { rota: "/avaliacoes", alcancadaPor: "a página do curso", requisito: "RF-CURSO-02" },
  { rota: "/relatorio", alcancadaPor: "a página do curso", requisito: "RF-CURSO-02" },
] as const;

export const MENU: readonly EntradaDeMenu[] = [
  /*
   * ⚠️ `disponivel: false` ATÉ A HISTÓRIA 4 DESTA MESMA FATIA construir a tela. Entrada que aponta
   * para rota inexistente é um menu que devolve "não encontrado" — pior que entrada anunciada como
   * futura. O teste do shell confere os dois sentidos: nenhuma entrada disponível pode faltar, e
   * nenhuma indisponível pode já existir. É ele que obriga a virada a acontecer junto com a página.
   */
  { rotulo: "Início", rota: "/inicio", disponivel: false, entregaEm: "Épico 4 (c), História 4" },
  { rotulo: "Cursos", rota: "/cursos", disponivel: false, entregaEm: "Épico 7" },
  { rotulo: "Cronograma", rota: "/cronograma", disponivel: false, entregaEm: "Épico 9" },
  { rotulo: "Atividades", rota: "/atividades", disponivel: false, entregaEm: "Épico 8" },
  { rotulo: "Instrutores", rota: "/instrutores", disponivel: false, entregaEm: "Épico 5" },
  { rotulo: "Disciplinas", rota: "/disciplinas", disponivel: false, entregaEm: "Épico 6" },
  { rotulo: "Administração", rota: "/admin/usuarios", disponivel: true, entregaEm: "Épico 3" },
];

/**
 * A entrada ativa, derivada do caminho.
 *
 * ⚠️ **A ENTRADA ATIVA É A URL, e essa é a frase inteira.** Ela muda por navegação, não por
 * interação — não há estado a guardar, não há o que sincronizar, e é por isso que o menu não precisa
 * de marcador de cliente para marcá-la.
 *
 * ⚠️ A comparação é por **prefixo de segmento**, e não por igualdade: `/cursos/C-Ap-HN` acende
 * "Cursos". Igualdade deixaria o menu apagado em toda tela de detalhe, e quem navega perderia a
 * referência de onde está justo quando ela é mais útil.
 */
export function entradaAtiva(caminho: string): EntradaDeMenu | undefined {
  const candidatas = MENU.filter((e) => caminho === e.rota || caminho.startsWith(`${e.rota}/`));
  // A mais específica ganha: `/admin/usuarios` vence `/admin`, se um dia as duas existirem.
  return candidatas.sort((a, b) => b.rota.length - a.rota.length)[0];
}

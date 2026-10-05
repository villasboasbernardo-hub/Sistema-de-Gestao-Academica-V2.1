/**
 * As entradas do menu lateral (`RF-NAV-02`, `RF-CURSO-02`, `FR-017`, `FR-017.1`).
 *
 * ✅ **VALIDADA POR BERNARDO CONTRA A v2.0 EM 11/09/2026** — ordem, rótulos e Administração como
 * entrada única, com o registro datado em `specs/008-shell-e-estado-na-url/contracts/casca.md`. Ela
 * tinha sido derivada da árvore de rotas do documento 24 §1 — que é o **alvo da v2.1**, e não o menu
 * que existe em produção. O `RF-NAV-02` é **[PRESERVADO]** e diz, com todas as letras, que a troca
 * de mecanismo de estado *"não autoriza reorganizar o menu nem renomear entradas"*. Derivar da
 * árvore-alvo é exatamente reorganizar sem perceber — e a conferência é o que separa *"não
 * reorganizou"* de *"ninguém olhou"*.
 *
 * ⚠️ **MUDAR QUALQUER LINHA DESTA LISTA EXIGE NOVA VALIDAÇÃO.** A paridade se mede contra o sistema
 * em produção, não contra este arquivo, e é por isso que o registro tem data.
 *
 * ✅ **A VALIDAÇÃO VIGENTE É A `D-NAV-1`, DE 04/10/2026 — ela SUBSTITUI a MENU-1 de 11/09/2026**
 * *(decisão de Bernardo Villas Boas, ratificada por ele no mesmo dia como "a nova validação do
 * menu")*. A ordem passa a ser **Início · Cursos · Turmas · Disciplinas · Instrutores · Cronograma ·
 * Atividades · Administração**: ela **insere** Turmas e **reagrupa** quatro entradas, aproximando o
 * que já tem tela e afastando o que ainda não tem. ⚠️ **Nada é renomeado e nada é removido** — é o
 * que mantém a ordem nova dentro do `RF-NAV-02`, que proíbe *renomear entradas*. O registro datado
 * vive em `specs/008-shell-e-estado-na-url/contracts/casca.md`, com a sessão de 04/10 **ao lado** da
 * de 11/09: decisão superada não se apaga.
 *
 * ⚠️ **O ÍCONE É IDENTIFICADOR, NUNCA COMPONENTE, e a razão é medida:** este módulo é importado por
 * teste de unidade e por `tests/e2e/shell.spec.ts` **fora do navegador**, sem DOM. Um componente
 * React aqui quebraria essas importações. Quem resolve `NomeDeIcone` para o desenho é
 * `components/casca/icones-do-menu.tsx` — **um** lugar.
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

/**
 * Os ícones do menu, por nome — **não são componentes** (ver o cabeçalho).
 *
 * ⚠️ A união é fechada de propósito: entrada nova sem ícone **não compila**, e é assim que a lateral
 * recolhida não nasce com um buraco no lugar de um item.
 */
export type NomeDeIcone =
  | "inicio"
  | "cursos"
  | "turmas"
  | "disciplinas"
  | "instrutores"
  | "cronograma"
  | "atividades"
  | "administracao";

export type EntradaDeMenu = {
  /** O rótulo como aparece na tela. **Não renomear sem o `RF-NAV-02`.** */
  readonly rotulo: string;
  readonly rota: string;
  /**
   * O ícone, por nome.
   *
   * ⚠️ **ELE É O ÚNICO CONTEÚDO VISÍVEL DA ENTRADA QUANDO A LATERAL ESTÁ RECOLHIDA** (`FR-001`), e
   * por isso o rótulo **continua no DOM, apagado por opacidade** — nunca removido: **ícone sozinho
   * não é rótulo**, e a fatia (b) do Épico 4 fixou que *"o ícone acompanha o rótulo, nunca o
   * substitui"*. Aqui a substituição é só **visual**, nunca acessível: o nome do link segue inteiro
   * para leitor de tela e para os percursos de ponta a ponta.
   */
  readonly icone: NomeDeIcone;
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
   * ⚠️ A BANDEIRA VIROU JUNTO COM A PÁGINA, e não depois. O teste do shell confere os **dois**
   * sentidos — nenhuma entrada disponível pode faltar, e nenhuma anunciada como futura pode já
   * existir —, e foi ele que obrigou a virada a acontecer no mesmo passo. Sem o segundo sentido, a
   * tela nasceria e o menu continuaria dizendo "em breve": ninguém a encontraria.
   *
   * ⚠️ **E FOI EXATAMENTE ISSO QUE ACONTECEU EM 23/09/2026** — a `/cursos` entrou na fatia (a) do
   * Épico 5 e este arquivo não; o caso do shell reprovou no CI com *"`/cursos` já existe, e o menu
   * ainda anuncia 'em breve'"*, que é a mensagem que ele foi escrito para dar. A `tasks.md` já
   * mandava virar a bandeira **no mesmo commit** da página (T130), e a guarda cobrou.
   *
   * ⚠️ **OS QUATRO `entregaEm` FORAM CORRIGIDOS JUNTO** (`FR-038`, US7): Cursos é do **Épico 5 (a)**,
   * Disciplinas do **5 (b)**, Cronograma do **7** e Atividades do **9**. Os três últimos estavam
   * trocados desde a fatia (c) do Épico 4 — não mudam comportamento, e por isso ninguém os notou:
   * são a promessa que o menu faz a quem pergunta "quando isto chega?".
   */
  /*
   * ⚠️ **A ORDEM ABAIXO É A DA `D-NAV-1` (04/10/2026), QUE SUBSTITUIU A MENU-1.** Ela aproxima o que
   *    tem tela — Início, Cursos, Turmas, Disciplinas, Instrutores — e afasta o que ainda não tem.
   *    ✅ **Turmas entrou em 04/10/2026, no MESMO commit em que `app/(app)/turmas/page.tsx` nasceu**,
   *    porque a guarda do `FR-017` reprova nos dois sentidos — e foi ela que pegou `/cursos` em
   *    23/09/2026, quando a página existia e o menu ainda dizia "em breve".
   */
  {
    rotulo: "Início",
    rota: "/inicio",
    icone: "inicio",
    disponivel: true,
    entregaEm: "Épico 4 (c), História 4",
  },
  {
    rotulo: "Cursos",
    rota: "/cursos",
    icone: "cursos",
    disponivel: true,
    entregaEm: "Épico 5 (a)",
  },
  /*
   * ⚠️ **"TURMAS" É A PRIMEIRA ENTRADA QUE NASCE JÁ DISPONÍVEL**, sem passar pelo estado "em breve",
   *    e a razão não é pressa: a ficha `/turmas/[turma]` **já existia** desde a fatia (a) do Épico 5,
   *    alcançável só por dentro do curso. O que faltava era a **lista** — e anunciar "em breve" uma
   *    navegação cuja tela de destino já estava de pé seria dizer o contrário do fato.
   */
  {
    rotulo: "Turmas",
    rota: "/turmas",
    icone: "turmas",
    disponivel: true,
    entregaEm: "Épico 5.5",
  },
  // ⚠️ Passou a `disponivel: true` em 29/09/2026, com o PR 3 da fatia (b). Até aqui a entrada
  //    existia marcada "em breve" (decisão MENU-2): o menu não cresce a cada épico, e ninguém
  //    reaprende a navegação sete vezes.
  {
    rotulo: "Disciplinas",
    rota: "/disciplinas",
    icone: "disciplinas",
    disponivel: true,
    entregaEm: "Épico 5 (b)",
  },
  {
    rotulo: "Instrutores",
    rota: "/instrutores",
    icone: "instrutores",
    disponivel: true,
    entregaEm: "Épico 5 (c)",
  },
  {
    rotulo: "Cronograma",
    rota: "/cronograma",
    icone: "cronograma",
    disponivel: false,
    entregaEm: "Épico 7",
  },
  {
    rotulo: "Atividades",
    rota: "/atividades",
    icone: "atividades",
    disponivel: false,
    entregaEm: "Épico 9",
  },
  {
    rotulo: "Administração",
    rota: "/admin/usuarios",
    icone: "administracao",
    disponivel: true,
    entregaEm: "Épico 3",
  },
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

/**
 * O contrato de parâmetros da URL — **fechado, tipado, e num lugar só** (`FR-001` a `FR-005`).
 *
 * Contrato humano: `specs/008-shell-e-estado-na-url/contracts/parametros.md` · documento 25 §1.3
 *
 * ⚠️ ELE EXISTE PORQUE A TABELA SOZINHA NÃO BASTAVA. O documento 25 §1.3 se autodenomina *"contrato
 * único do sistema"* desde a Fase 2, e **nenhum requisito o citava** — então uma tela nova podia
 * inventar parâmetro sem violar requisito nenhum. É o `CHK001`.
 *
 * ⚠️ AS DUAS METADES RESOLVEM COISAS DIFERENTES, e nenhuma sozinha serve: o documento dá a leitura
 * humana e a rastreabilidade até o `RF-` de origem; **este arquivo faz o parâmetro fora do contrato
 * não compilar**. Os dois, ou nenhum.
 *
 * ⚠️ NENHUM PARÂMETRO DE PAGINAÇÃO, e a ausência é recusa declarada (`FR-037.1`): o contrato não a
 * tem em nenhuma rota, e a fatia (b) decidiu por medição que a tabela renderiza todas as linhas.
 * Reabrir isso exige medição na mão, não um parâmetro reservado por via das dúvidas.
 */

import { CLASSIFICACOES_DE_CURSO } from "@/lib/dominio/classificacoes-de-curso";
import { Constants } from "@/lib/tipos/database";

/** Se a mudança empilha uma entrada de histórico ou substitui a atual (documento 25 §1.6). */
export type Historico = "empilha" | "substitui";

/** Os quatro tipos, e só eles. Não há tipo livre — é isso que permite validar num lugar só. */
export type TipoDeParametro = "texto" | "inteiro" | "escolha" | "lista";

/**
 * O limite de frequência da busca, em milissegundos (`FR-005`).
 *
 * ⚠️ ELE VIVIA NUM EXEMPLO DE CÓDIGO do documento 25 §1.5, não numa regra — e valor que mora em
 * exemplo é valor que a próxima tela escolhe de novo.
 */
export const LIMITE_DE_FREQUENCIA_MS = 300;

type Base = {
  /** Como aparece na URL: `snake_case` curto. */
  readonly nome: string;
  readonly historico: Historico;
  /**
   * Alimenta consulta no servidor?
   *
   * ⚠️ **É O CAMPO CUJO ERRO É SILENCIOSO** (`FR-004.1`). Desligado num filtro, a URL fica certa, o
   * histórico funciona, o link compartilhado abre — **e o número na tela fica velho**.
   */
  readonly avisaServidor: boolean;
  readonly limiteDeFrequenciaMs?: number;
};

export type Parametro =
  | (Base & { readonly tipo: "texto"; readonly padrao: string })
  | (Base & {
      readonly tipo: "inteiro";
      readonly padrao: number;
      readonly minimo: number;
      readonly maximo: number;
    })
  | (Base & {
      readonly tipo: "escolha";
      readonly padrao: string;
      readonly opcoes: readonly string[];
    })
  | (Base & {
      readonly tipo: "lista";
      readonly padrao: readonly string[];
      readonly opcoes: readonly string[];
    });

export type ContratoDeRota = {
  readonly rota: string;
  /**
   * O `RF-` que justifica a rota existir.
   *
   * ⚠️ NÃO É ENFEITE: é o Princípio VIII no tipo. Parâmetro que ninguém consegue rastrear até um
   * requisito é parâmetro que alguém acrescentou sem decidir.
   */
  readonly origem: string;
  readonly parametros: Readonly<Record<string, Parametro>>;
};

/**
 * As classificações de curso (`RF-INI-02`) — **lidas do contrato de dados, não escritas à mão**.
 *
 * ⚠️ **A PRIMEIRA VERSÃO TINHA TRÊS VALORES, E O BANCO TEM SETE.** Medido em 11/09/2026:
 * `cursos.classificacao` é do tipo `escopo_curso`, cujo domínio inclui `estagio_qualificacao`,
 * `ead_semipresencial`, `aperfeicoamento_avancado` e `geral` além dos três que eu havia listado.
 * **O efeito seria silencioso e do pior tipo:** um link filtrando por `estagio_qualificacao` seria
 * degradado para "todas" pelo `FR-006`, a tela abriria cheia, e ninguém veria erro nenhum — só um
 * recorte que não pegou.
 *
 * ⚠️ **E A TABELA DO DOCUMENTO 25 ESCONDIA ISSO**, porque anotava o tipo como *texto*: texto não tem
 * domínio do qual estar fora, então não havia como a divergência aparecer. Foi a emenda que passou o
 * tipo para **escolha** que criou a pergunta *"escolha entre o quê?"* — e a resposta estava errada.
 *
 * ⚠️ **`geral` FICA NA LISTA.** Ele é sentinela noutras tabelas (achado 4 do Épico 2), mas aqui o
 * critério é outro: o filtro não pode recusar um valor que a coluna aceita. Filtrar por uma
 * classificação que nenhum curso tem devolve vazio, e vazio é resposta honesta.
 */
export const CLASSIFICACOES = Constants.public.Enums.escopo_curso;

/** As modalidades (`RF-INI-02`) — mesma fonte, pelo mesmo motivo. */
export const MODALIDADES = Constants.public.Enums.modalidade_ensino;

/** Os regimes de trabalho docente (`FR-025` da spec 006) — domínio fechado do banco. */
export const REGIMES_DOCENTES = Constants.public.Enums.regime_trabalho_docente;

/**
 * Sim ou não, para os filtros de habilitado e de selecionado (`FR-025` emendado em 15/09/2026).
 *
 * ⚠️ SÃO DOIS FILTROS, E NÃO UM "STATUS" DE TRÊS OPÇÕES COMO NA SPEC 015 DA v2.0. Habilitado não é
 * selecionado — habilitado pode dar aula, selecionado foi escolhido para ministrar —, e os dois
 * conjuntos não são um subconjunto do outro. Decisão de Bernardo Villas Boas, 15/09/2026.
 */
export const SIM_OU_NAO = ["sim", "nao"] as const;

/** Os círculos hierárquicos da spec 015 da v2.0 — derivados do posto, não campo do banco. */
export const CIRCULOS_HIERARQUICOS = ["oficiais", "pracas"] as const;

/** A situação de cadastro (`FR-009` da spec 006) — `ativo` ou `inativo`, nunca inferida. */
export const SITUACOES_DE_CADASTRO = Constants.public.Enums.status_registro;

/**
 * As quatro situações de TURMA (`FR-012` da spec 012).
 *
 * ⚠️ **NÃO CONFUNDIR COM `SITUACOES_DE_CADASTRO`, e a confusão é fácil:** aquela é
 * `status_registro` (`ativo` | `inativo`), que vale para curso, disciplina e instrutor. Turma tem
 * ciclo de vida próprio — `planejada`, `ativa`, `concluida`, `cancelada` —, e filtrar a lista de
 * turmas por `ativo` resolveria para turma nenhuma, **sem erro**, porque nenhum desses valores
 * existe na coluna.
 *
 * Os rótulos de tela vivem num lugar só, `ROTULO_DO_STATUS_DE_TURMA` em
 * `lib/dominio/seletor-de-turma.ts`.
 */
export const SITUACOES_DE_TURMA = Constants.public.Enums.status_turma;

/**
 * As quatro situações de execução de uma disciplina numa turma (`FR-053`).
 *
 * ⚠️ **ELA NÃO VEM DE UM ENUM DO BANCO, porque NÃO HÁ enum: a situação é DERIVADA** da CH prevista,
 * da cumprida e da data (`lib/dominio/indicadores-da-grade.ts`). Uma coluna `situacao` seria a
 * segunda fonte de verdade que as convenções de banco proíbem — ela envelheceria em silêncio no dia
 * em que alguém lançasse uma aula e ninguém a recalculasse.
 *
 * ⚠️ E a lista é fechada **aqui** de propósito: filtro é escolha, e escolha precisa de domínio. O
 * teste de unidade do módulo de indicadores confere que as quatro são exatamente estas.
 */
export const SITUACOES_DE_EXECUCAO = [
  "nao_iniciada",
  "em_andamento",
  "concluida",
  "atrasada",
] as const;

/**
 * As ordenações de apresentação da listagem de instrutores.
 *
 * ⚠️ UM VALOR POR SENTIDO, E NÃO UMA GRAMÁTICA. `nome_desc` é uma opção inteira, validada contra a
 * lista como qualquer outra — não um texto que alguém precise partir no separador. A vitrine resolveu
 * o mesmo problema com dois parâmetros; aqui o contrato da spec 006 declara um só, e a lista fechada
 * é o que o mantém degradável.
 *
 * ⚠️ NENHUMA DELAS SUBSTITUI A ANTIGUIDADE. A consulta sempre pede `ordem_antiguidade` ao banco; estas
 * reordenam por cima, na apresentação (`RN-ANT-01`, contrato parametros-instrutores §Ordenação).
 */
export const ORDENS_DE_INSTRUTOR = [
  "posto",
  "posto_desc",
  "nome",
  "nome_desc",
  "categoria",
  "categoria_desc",
  "om",
  "om_desc",
  "regime",
  "regime_desc",
  "ch_ano",
  "ch_ano_desc",
] as const;

/**
 * O contrato.
 *
 * ⚠️ SÓ AS ROTAS QUE ESTA FATIA ENTREGA. As demais do documento 25 §1.3 entram com as suas telas,
 * nos Épicos 5 a 9 — declarar parâmetro de tela que não existe é declarar o que ninguém confere.
 *
 * ⚠️ A ROTA DE IMPRESSÃO HERDA OS PARÂMETROS DA TELA DE ORIGEM, sem tradução (`FR-035`). Fica
 * **reservado** aqui; as rotas são dos Épicos 10 e 11, e o contrato precisa já saber disso para elas
 * não inventarem parâmetro próprio.
 */
export const CONTRATO = {
  "/inicio": {
    rota: "/inicio",
    origem: "RF-INI-02",
    parametros: {
      classificacao: {
        nome: "classificacao",
        tipo: "escolha",
        padrao: "",
        opcoes: CLASSIFICACOES,
        historico: "empilha",
        avisaServidor: true,
      },
      /*
       * ⚠️ `modalidade` ENTROU POR EMENDA ao documento 25 §1.3, em 11/09/2026. A tabela de lá
       * listava só `classificacao`, e o `RF-INI-02` — que é **[PRESERVADO]** — escreve
       * `?classificacao=&modalidade=` na própria nota de mecanismo. Não era o requisito que estava
       * errado: era a tabela que estava incompleta.
       */
      modalidade: {
        nome: "modalidade",
        tipo: "escolha",
        padrao: "",
        opcoes: MODALIDADES,
        historico: "empilha",
        avisaServidor: true,
      },
    },
  },
  /*
   * A vitrine (`RF-DS-01`).
   *
   * ⚠️ ELA ENTROU NO CONTRATO PORQUE JÁ ESTAVA VIOLANDO-O. Medido em 11/09/2026: a amostra de estado
   * na URL da fatia (a) escrevia `?demo=` com um parâmetro que contrato nenhum declarava — ou seja,
   * **a primeira tela a infringir o `FR-001` foi a nossa**, escrita antes de o requisito existir. A
   * nota anterior deste bloco dizia que a vitrine "não recorta nada", e isso deixou de ser verdade
   * no instante em que a amostra foi escrita.
   *
   * ⚠️ E ELA É O ÚNICO LUGAR ONDE OS QUATRO TIPOS SE EXERCITAM JUNTOS antes dos Épicos 5 a 9: escolha
   * que empilha, escolha que substitui, lista e texto com limite de frequência. As telas de verdade
   * usam um ou dois tipos cada.
   */
  "/estilo": {
    rota: "/estilo",
    origem: "RF-DS-01",
    parametros: {
      // Troca de CONTEXTO: empilha, para o botão voltar ter o que desfazer.
      demo: {
        nome: "demo",
        tipo: "escolha",
        padrao: "",
        opcoes: ["alfa", "bravo", "charlie"],
        historico: "empilha",
        avisaServidor: false,
      },
      // REFINO da mesma tela: substitui. Três cliques de filtro não são três passos de navegação.
      categoria: {
        nome: "categoria",
        tipo: "escolha",
        padrao: "",
        opcoes: ["a", "b"],
        historico: "substitui",
        avisaServidor: false,
      },
      etiquetas: {
        nome: "etiquetas",
        tipo: "lista",
        padrao: [],
        opcoes: ["x", "y", "z"],
        historico: "substitui",
        avisaServidor: false,
      },
      /*
       * ⚠️ BUSCA SUBSTITUI **E** LIMITA FREQUÊNCIA (`FR-004`, `FR-005`). As duas, não uma: sem
       * substituir, cada tecla vira um passo de histórico; sem o limite, cada tecla vira uma escrita
       * na barra de endereço — e, numa tela que avisa o servidor, uma consulta.
       */
      busca: {
        nome: "busca",
        tipo: "texto",
        padrao: "",
        historico: "substitui",
        avisaServidor: false,
        limiteDeFrequenciaMs: LIMITE_DE_FREQUENCIA_MS,
      },
      /*
       * ⚠️ A ORDENAÇÃO VIAJA EM DOIS PARÂMETROS, E NÃO NUM SÓ. Um valor composto — `rotulo:asc` —
       * caberia num parâmetro de texto e obrigaria a inventar uma gramática que só este sistema
       * entende: quem edita a barra de endereço à mão erra o separador, e a degradação teria de
       * adivinhar qual das duas metades salvar. Dois parâmetros de escolha degradam cada um por si.
       *
       * ⚠️ `sentido` TEM PADRÃO ENTRE AS OPÇÕES, ao contrário dos filtros. Aqui o padrão não é "sem
       * recorte": ordenar sem sentido declarado é ordenar crescente, e é isso que o padrão diz.
       */
      ordenar_por: {
        nome: "ordenar_por",
        tipo: "escolha",
        padrao: "",
        opcoes: ["rotulo", "sigla", "horas"],
        historico: "substitui",
        avisaServidor: false,
      },
      sentido: {
        nome: "sentido",
        tipo: "escolha",
        padrao: "crescente",
        opcoes: ["crescente", "decrescente"],
        historico: "substitui",
        avisaServidor: false,
      },
      filtro: {
        nome: "filtro",
        tipo: "texto",
        padrao: "",
        historico: "substitui",
        avisaServidor: false,
        limiteDeFrequenciaMs: LIMITE_DE_FREQUENCIA_MS,
      },
    },
  },
  /*
   * A listagem de instrutores (`RF-INSTR-01`, `FR-025`, `FR-028` da spec 006).
   *
   * Contrato humano: `specs/006-cadastro-de-instrutores/contracts/parametros-instrutores.md`
   *
   * ⚠️ TODO FILTRO SUBSTITUI, E ISSO É ESCOLHA. Três cliques de refino não são três passos de
   * navegação; quem pusesse `empilha` num filtro faria o voltar desfazer letra por letra.
   *
   * ⚠️ OM, CATEGORIA, CAPACITAÇÃO E ESCOLARIDADE SÃO TEXTO, E NÃO ESCOLHA. O contrato humano os
   * anotava como escolha, mas o domínio deles é o DADO — as OMs cadastradas, as capacitações
   * escritas —, e não uma lista fechada. Uma escolha com opções escritas aqui degradaria para
   * "todas", em silêncio, o link que filtrasse por uma OM nova. Texto que não casa com nenhum
   * instrutor devolve vazio, e vazio é resposta honesta. Regime e situação têm domínio fechado no
   * banco, e esses sim são escolha.
   *
   * ⚠️ NENHUM PARÂMETRO ACEITA IDENTIFICAÇÃO CIVIL. CPF na barra de endereço vaza por histórico, por
   * log de servidor e por ombro — recusa declarada do contrato humano.
   */
  /*
   * O catálogo de cursos (`RF-CURSOS-01`, `RF-CURSOS-02`).
   *
   * ⚠️ **TRÊS ESCOLHAS, E NENHUMA BUSCA POR TEXTO.** São 24 cursos em cinco grupos; uma caixa de
   * busca aqui resolveria um problema que a tela não tem, e convidaria a consulta a crescer.
   *
   * ⚠️ **`classificacao` OFERECE AS CINCO DO GLOSSÁRIO, E NÃO O TIPO DO BANCO — ao contrário do
   * `/inicio`.** A divergência é deliberada e está registrada como D-19. Os critérios são
   * diferentes porque o papel do parâmetro é diferente: no Início ele **filtra**, e o critério de lá
   * é *"o filtro não pode recusar um valor que a coluna aceita"*; aqui ele **agrupa os cartões**, e
   * um grupo `geral` ou `ead_semipresencial` nunca teria cartão nenhum — o banco recusa os dois
   * (`cursos_classificacao_nao_geral` e `FR-003.1`). Oferecer um grupo impossível é oferecer um
   * vazio que a pessoa lê como "não há curso cadastrado".
   *
   * ⚠️ **`situacao` É O MESMO DESCRITOR DE `/instrutores`, e de propósito.** Mesma lista, mesmo
   * padrão `ativo`, mesmo comportamento: a tela abre com o que está ativo, o padrão some da URL, e
   * ver o que foi desativado exige `?situacao=inativo` — que é link compartilhável (`FR-017.2`).
   * Duas listas de situação divergiriam no dia em que uma delas mudasse.
   */
  /*
   * A grade de disciplinas (`RF-MATERIAS-01`, fatia (b) do Épico 5).
   *
   * ⚠️ **`curso` E `turma` SÃO NAVEGAÇÃO; OS OUTROS CINCO SÃO FILTRO.** A distinção decide duas
   * coisas de uma vez: os dois primeiros **empilham** histórico — trocar de curso é ir a outro lugar,
   * e quem aperta "voltar" espera desfazer um passo —, e são os únicos que o botão *Limpar filtros*
   * **preserva** (`FR-054`). Limpar filtro e perder a turma em que se estava seria fazer o botão
   * navegar.
   *
   * ⚠️ **`turma` É TEXTO, e carrega o `codigo`, nunca `uuid`** — o mesmo critério de
   * `/cursos/[curso]`. O código tem espaços (`C-Ap-FR T2 2026`) e é codificado pela função única de
   * `lib/navegacao/endereco-de-turma.ts`.
   *
   * ⚠️ **`instrutor` TAMBÉM É TEXTO, e pelo mesmo motivo de `om` em `/instrutores`:** o domínio é o
   * dado — 177 instrutores hoje —, e uma lista fechada escrita aqui degradaria em silêncio o link
   * que apontasse para quem foi cadastrado depois. ⚠️ E ele carrega o **código** do instrutor, não o
   * `uuid`: a fatia (c) mediu que mandar identificadores na URL estoura o limite do endereço com 175
   * deles.
   *
   * ⚠️ **`aberta` GUARDA A LINHA EXPANDIDA, e é por isso que ela SUBSTITUI.** Abrir o detalhe de uma
   * disciplina é refinar a mesma vista; empilhar faria "voltar" fechar a linha em vez de sair da
   * tela, que é o que a pessoa espera desfazer.
   */
  "/disciplinas": {
    rota: "/disciplinas",
    origem: "RF-MATERIAS-01",
    parametros: {
      curso: {
        nome: "curso",
        tipo: "texto",
        padrao: "",
        historico: "empilha",
        avisaServidor: true,
      },
      /*
       * ⚠️ **`turma` SOBREVIVE AQUI COM UM PAPEL SÓ: SER O ENDEREÇO ANTIGO** (`FR-019` da spec 012,
       *    decisão D5 de 04/10/2026). A partir do PR 2, `/disciplinas?curso=X&turma=Y` **redireciona**
       *    para a seção de disciplinas da ficha da turma — o recorte por turma passou a morar lá.
       * ⚠️ **TIRÁ-LO DO CONTRATO QUEBRARIA O REDIRECIONAMENTO**, e em silêncio: `lerParametros`
       *    **descarta** o que não está declarado, então a página nunca saberia que havia turma no
       *    endereço e serviria o catálogo do curso como se nada tivesse sido pedido.
       */
      turma: {
        nome: "turma",
        tipo: "texto",
        padrao: "",
        historico: "empilha",
        avisaServidor: true,
      },
      situacao: {
        nome: "situacao",
        tipo: "escolha",
        padrao: "ativo",
        opcoes: SITUACOES_DE_CADASTRO,
        historico: "substitui",
        avisaServidor: true,
      },
      busca: {
        nome: "busca",
        tipo: "texto",
        padrao: "",
        historico: "substitui",
        avisaServidor: true,
        limiteDeFrequenciaMs: LIMITE_DE_FREQUENCIA_MS,
      },
      aberta: {
        nome: "aberta",
        tipo: "texto",
        padrao: "",
        historico: "substitui",
        avisaServidor: false,
      },
    },
  },
  "/cursos": {
    rota: "/cursos",
    origem: "RF-CURSOS-01",
    parametros: {
      classificacao: {
        nome: "classificacao",
        tipo: "escolha",
        padrao: "",
        opcoes: CLASSIFICACOES_DE_CURSO,
        historico: "substitui",
        avisaServidor: true,
      },
      modalidade: {
        nome: "modalidade",
        tipo: "escolha",
        padrao: "",
        opcoes: MODALIDADES,
        historico: "substitui",
        avisaServidor: true,
      },
      situacao: {
        nome: "situacao",
        tipo: "escolha",
        padrao: "ativo",
        opcoes: SITUACOES_DE_CADASTRO,
        historico: "substitui",
        avisaServidor: true,
      },
    },
  },
  /*
   * A página do curso (`RF-CURSO-01`, `FR-006.2`).
   *
   * ⚠️ **OS DOIS EMPILHAM HISTÓRICO, e é a diferença para os filtros de `/cursos`.** Filtrar é
   * refinar a mesma vista — substitui. Trocar de aba ou de turma é **ir a outro lugar**, e quem
   * aperta "voltar" espera desfazer **um** passo (`FR-036`, documento 25 §1.6).
   *
   * ⚠️ **`turma` É TEXTO, E NÃO ESCOLHA.** O domínio dela é o dado — as turmas do curso, que mudam a
   * cada ano letivo —, e não uma lista fechada. Uma escolha com opções escritas aqui degradaria para
   * "nenhuma", em silêncio, o link que apontasse para uma turma criada depois. É o mesmo critério
   * que já vale para `om` e `capacitacao` em `/instrutores`.
   *
   * ⚠️ **O VALOR É O `codigo` DA TURMA, codificado pela função única do `FR-031.2`** — nunca `uuid`.
   * O código tem espaços (`C-Ap-FR T2 2026`), e quem o escrever à mão na URL produz um link que
   * parece funcionar e resolve para turma nenhuma.
   */
  /*
   * Cadastro e edição de curso (`FR-013.1`, `FR-037`).
   *
   * ⚠️ **SEM PARÂMETRO DE CONSULTA, e isso é decisão.** O que a pessoa está digitando não é estado
   * compartilhável: pô-lo na URL vaza por histórico e por ombro, e faz o "voltar" desfazer letra a
   * letra. Mesma regra de `/instrutores/novo`.
   *
   * ⚠️ **`/cursos/[curso]/editar` É TAMBÉM ONDE A VIGÊNCIA SE REGISTRA E SE CORRIGE** (`FR-013.1`,
   * decisão de 17/09/2026) — o cabeçalho da página do curso aponta para cá.
   */
  /*
   * Turmas e salas (`FR-031`, `FR-029.2`, `FR-037`).
   *
   * ⚠️ **NENHUMA DAS TRÊS TEM PARÂMETRO DE CONSULTA.** A ficha da turma se identifica pelo CAMINHO —
   * `/turmas/<codigo>` —, e o rascunho do formulário não é estado compartilhável.
   *
   * ✅ **`/turmas` PASSOU A EXISTIR EM 04/10/2026** (`FR-012` da spec 012, decisão `D-NAV-1` de
   * Bernardo Villas Boas). ⚠️ *Registro anterior, vencido: "NÃO EXISTE `/turmas` (lista global) (…) A
   * turma se alcança pela página do curso."* Ela se alcança pela lista, pelo curso e pelo endereço
   * antigo de disciplinas — e a guarda de `contrato-de-parametros.test.ts` foi **invertida**, de
   * ausência para presença, em vez de apagada: o registro de por que a rota existe é o que ela passa
   * a proteger.
   *
   * ✅ **`/turmas/[turma]/dsa` PASSOU A EXISTIR EM 05/10/2026** (`RF-DSA-01`, spec 013, PR 1 do
   * Épico 6). ⚠️ *Registro anterior, vencido: "CONTINUA NÃO EXISTINDO — o lançamento diário é do
   * Épico 6, e a guarda de ausência dele fica de pé."* A guarda foi **invertida**, de ausência para
   * presença — ver a nota da própria entrada, abaixo.
   */
  /*
   * A lista de turmas (`FR-012` a `FR-016` da spec 012).
   *
   * ⚠️ **`ano` É TEXTO, E NÃO `inteiro`, DE PROPÓSITO.** `inteiro` obrigaria a inventar mínimo e
   * máximo — e o domínio é o **dado**: os anos que existem saem das turmas que a pessoa alcança,
   * como `curso` já faz em `/instrutores`. Um teto escrito à mão envelheceria no primeiro ano novo.
   *
   * ⚠️ **`situacao` ABRE EM "TODAS", ao contrário de `/cursos` e `/instrutores`, que abrem em
   *    `ativo`** (decisão **D4**, 04/10/2026). Uma lista de turmas é catálogo de vários anos: abrir
   *    filtrada esconderia planejada e concluída **sem a pessoa ter escolhido**, e o recorte natural
   *    aqui é o `ano`, não a situação.
   *
   * ⚠️ **TODOS OS QUATRO SUBSTITUEM, e nenhum empilha.** Filtrar é refinar a mesma vista; empilhar
   * faria "voltar" desfazer filtro a filtro em vez de sair da tela.
   */
  "/turmas": {
    rota: "/turmas",
    origem: "RF-CURSO-01",
    parametros: {
      curso: {
        nome: "curso",
        tipo: "texto",
        padrao: "",
        historico: "substitui",
        avisaServidor: true,
      },
      ano: {
        nome: "ano",
        tipo: "texto",
        padrao: "",
        historico: "substitui",
        avisaServidor: true,
      },
      situacao: {
        nome: "situacao",
        tipo: "escolha",
        padrao: "",
        opcoes: SITUACOES_DE_TURMA,
        historico: "substitui",
        avisaServidor: true,
      },
      busca: {
        nome: "busca",
        tipo: "texto",
        padrao: "",
        historico: "substitui",
        avisaServidor: true,
        limiteDeFrequenciaMs: LIMITE_DE_FREQUENCIA_MS,
      },
    },
  },
  "/cursos/[curso]/turmas/nova": {
    rota: "/cursos/[curso]/turmas/nova",
    origem: "RF-CURSO-01",
    parametros: {},
  },
  /*
   * ⚠️ **A FICHA DEIXOU DE SER SEM PARÂMETRO EM 04/10/2026, e é a ÚNICA das três.** Ela recebeu a
   *    seção de disciplinas que vinha de `/disciplinas?turma=`, e com ela a linha expansível — cujo
   *    estado é `aberta`, o mesmo nome e o mesmo papel que tem lá.
   * ⚠️ **`avisaServidor: false` porque é parâmetro VISUAL**: abrir o detalhe não muda o que o
   *    servidor busca. Lido do servidor, o detalhe nunca abriria, com a URL certa — foi o achado do
   *    PR 3 da fatia (b).
   */
  "/turmas/[turma]": {
    rota: "/turmas/[turma]",
    origem: "RF-CURSO-01",
    parametros: {
      aberta: {
        nome: "aberta",
        tipo: "texto",
        padrao: "",
        historico: "substitui",
        avisaServidor: false,
      },
    },
  },
  /*
   * O Detalhe Semanal de Aula (`RF-DSA-01`, `RF-DSA-02`, `RF-NAV-04` · spec 013).
   *
   * ⚠️ **A GUARDA DE AUSÊNCIA DESTA ROTA FOI INVERTIDA, NÃO APAGADA.** Até 05/10/2026
   * `contrato-de-parametros.test.ts` exigia que `/turmas/[turma]/dsa` **não** existisse — *"o DSA é
   * do Épico 6, e não desta fatia"* —, e essa frase era verdadeira. Agora ela **é** desta fatia, e
   * a asserção passou a cobrar **presença**, como a própria `/turmas` fez em 04/10/2026. O registro
   * de por que a rota existe é o que ela passa a proteger.
   *
   * ⚠️ **`semana` E `ano` EMPILHAM, e é o `RF-NAV-04` literal**: *"navegar entre semanas usa o
   * histórico do navegador"*. Com `substitui`, o botão voltar sairia da tela em vez de voltar uma
   * semana — a URL ficaria certa e a navegação, errada.
   *
   * ⚠️ **O PADRÃO DOS DOIS É `0`, E ZERO NÃO É SEMANA NEM ANO — É SENTINELA DECLARADA.** O padrão
   * de verdade é *"a semana ISO de `hojeNaCiaara()`"*, que é **dinâmico** e não cabe num literal
   * estático. Usar `1` ou o ano corrente escrito à mão seria pior de dois modos: `1` faria a semana
   * 1 desaparecer da URL (ela é um valor legítimo), e um ano fixo envelheceria em 1º de janeiro.
   * Zero não é semana ISO válida (a faixa é 1..53) nem ano, então não se confunde com dado.
   *
   * ⚠️ **E A FAIXA 1..53 NÃO FOI INVENTADA**: é a norma ISO 8601 — o ano ISO tem 52 ou 53 semanas.
   * A de `ano`, 2020..2099, é a **mesma** do `CHECK config_param_ano_valido` do banco (medido), e
   * não um palpite.
   */
  "/turmas/[turma]/dsa": {
    rota: "/turmas/[turma]/dsa",
    origem: "RF-DSA-01",
    parametros: {
      semana: {
        nome: "semana",
        tipo: "inteiro",
        padrao: 0,
        minimo: 1,
        maximo: 53,
        historico: "empilha",
        avisaServidor: true,
      },
      ano: {
        nome: "ano",
        tipo: "inteiro",
        padrao: 0,
        minimo: 2020,
        maximo: 2099,
        historico: "empilha",
        avisaServidor: true,
      },
      /*
       * O sábado (`Q-4`, decisão de Bernardo Villas Boas de 05/10/2026: *"sábado entra no núcleo,
       * adicionado por ação do operador, 5 TA"*).
       *
       * ⚠️ **SUBSTITUI, não empilha**: abrir e fechar a coluna é refinar a MESMA semana, não trocar
       * de contexto. Com `empilha`, voltar desfaria a coluna em vez de voltar a semana.
       *
       * ⚠️ **E A COLUNA APARECE TAMBÉM SEM O PARÂMETRO** quando há lançamento no sábado: esconder
       * um lançamento gravado porque um parâmetro de tela está em `nao` seria esconder um fato.
       */
      sabado: {
        nome: "sabado",
        tipo: "escolha",
        padrao: "nao",
        opcoes: ["sim", "nao"],
        historico: "substitui",
        avisaServidor: true,
      },
    },
  },
  "/admin/salas": {
    rota: "/admin/salas",
    origem: "RF-CRUD-01",
    parametros: {},
  },
  /*
   * A gestão de contas (`FR-014` da spec 011). ⚠️ **ELA NÃO ESTAVA NO CONTRATO ATÉ 03/10/2026**, e
   * não precisava: a tela não tinha parâmetro nenhum. Entrou com a **busca**, que é o único filtro
   * que a lista passou a ter — e por isso ela também passou a ter o botão *Limpar filtros*.
   */
  "/admin/usuarios": {
    rota: "/admin/usuarios",
    origem: "RF-CRUD-01",
    parametros: {
      /*
       * ⚠️ **O AVISO DA EXCLUSÃO MORA NA URL, E A RAZÃO É UM DEFEITO MEDIDO em 03/10/2026.** A
       * mensagem vivia no estado da própria linha — e a linha **desaparece** com a exclusão, levando
       * a confirmação junto. Quem excluía não recebia resposta nenhuma: a conta sumia e pronto.
       * ⚠️ **E o aviso precisa dizer QUAL dos dois caminhos aconteceu** — conta sem histórico sai
       * inteira, conta com histórico fica como *"Conta excluída"* —, porque as duas são permanentes
       * de maneiras diferentes. Na URL ele sobrevive ao `revalidatePath` e à remontagem da tabela.
       */
      /*
       * ⚠️ **O TERCEIRO VALOR EXISTE PARA A TELA NÃO MENTIR** *(03/10/2026)*. As duas primeiras
       * frases afirmam que *"o e-mail está livre para um novo cadastro"*, e isso é verdade sempre
       * que a credencial sai junto. **Há um caso em que ela não sai**: conta sem `auth_user_id` cujo
       * e-mail pertence à credencial de **outra** conta — medido no remoto, é `USR-02`, cujo
       * endereço é o login de `USR-ADMIN-001`. Apagar aquela credencial derrubaria o acesso de quem
       * não pediu nada, então ela fica, e o aviso passa a dizer a verdade sobre o endereço.
       */
      excluida: {
        nome: "excluida",
        tipo: "escolha",
        padrao: "",
        opcoes: [
          "",
          "apagada",
          "anonimizada",
          "apagada_email_em_uso",
          // ⚠️ O QUINTO EXISTE PARA O AVISO NÃO AFIRMAR O QUE NINGUÉM OLHOU (03/10/2026): a
          //    varredura de credencial órfa precisa da chave administrativa, e quando ela não
          //    responde a exclusão conclui mesmo assim — o cadastro já saiu. Dizer "o e-mail está
          //    livre" sem ter conferido seria a mesma classe de mentira que esta fatia vem
          //    consertando.
          "apagada_sem_conferir_credencial",
        ],
        historico: "substitui",
        avisaServidor: true,
      },
      busca: {
        nome: "busca",
        tipo: "texto",
        padrao: "",
        historico: "substitui",
        avisaServidor: true,
        limiteDeFrequenciaMs: LIMITE_DE_FREQUENCIA_MS,
      },
    },
  },
  /*
   * ⚠️ **CADASTRAR E EDITAR SÃO PÁGINAS, NÃO DIÁLOGOS** *(decisão de Bernardo Villas Boas,
   * 03/10/2026, reprovando a conferência do PR 2)*: *"Nada de diálogo sobre diálogo na lista."* A
   * lista voltou a ser lista; formulário tem endereço próprio, e endereço próprio é link
   * compartilhável e botão de voltar que funciona.
   */
  "/admin/usuarios/novo": {
    rota: "/admin/usuarios/novo",
    origem: "RF-CRUD-01",
    parametros: {},
  },
  "/admin/usuarios/[id]": {
    rota: "/admin/usuarios/[id]",
    origem: "RF-CRUD-01",
    parametros: {},
  },
  "/cursos/novo": {
    rota: "/cursos/novo",
    origem: "RF-CURSOS-01",
    parametros: {},
  },
  "/cursos/[curso]/editar": {
    rota: "/cursos/[curso]/editar",
    origem: "RF-CURSO-01",
    parametros: {},
  },
  "/cursos/[curso]": {
    rota: "/cursos/[curso]",
    origem: "RF-CURSO-01",
    parametros: {
      aba: {
        nome: "aba",
        tipo: "escolha",
        padrao: "grade",
        opcoes: ["grade", "sobre"],
        historico: "empilha",
        avisaServidor: true,
      },
      turma: {
        nome: "turma",
        tipo: "texto",
        padrao: "",
        historico: "empilha",
        avisaServidor: true,
      },
    },
  },
  "/instrutores": {
    rota: "/instrutores",
    origem: "RF-INSTR-01",
    parametros: {
      busca: {
        nome: "busca",
        tipo: "texto",
        padrao: "",
        historico: "substitui",
        avisaServidor: true,
        limiteDeFrequenciaMs: LIMITE_DE_FREQUENCIA_MS,
      },
      om: {
        nome: "om",
        tipo: "texto",
        padrao: "",
        historico: "substitui",
        avisaServidor: true,
      },
      categoria: {
        nome: "categoria",
        tipo: "texto",
        padrao: "",
        historico: "substitui",
        avisaServidor: true,
      },
      capacitacao: {
        nome: "capacitacao",
        tipo: "texto",
        padrao: "",
        historico: "substitui",
        avisaServidor: true,
      },
      regime: {
        nome: "regime",
        tipo: "escolha",
        padrao: "",
        opcoes: REGIMES_DOCENTES,
        historico: "substitui",
        avisaServidor: true,
      },
      escolaridade: {
        nome: "escolaridade",
        tipo: "texto",
        padrao: "",
        historico: "substitui",
        avisaServidor: true,
      },
      /*
       * Os seis da emenda de 15/09/2026 ao `FR-025` (decisão de Bernardo Villas Boas). `posto` e
       * `curso` são texto pelo mesmo motivo de `om`: o domínio é o dado cadastrado. `classificacao`
       * é o enum de curso, como em `/inicio`; `circulo`, `habilitado` e `selecionado` têm lista fechada.
       */
      posto: {
        nome: "posto",
        tipo: "texto",
        padrao: "",
        historico: "substitui",
        avisaServidor: true,
      },
      circulo: {
        nome: "circulo",
        tipo: "escolha",
        padrao: "",
        opcoes: CIRCULOS_HIERARQUICOS,
        historico: "substitui",
        avisaServidor: true,
      },
      curso: {
        nome: "curso",
        tipo: "texto",
        padrao: "",
        historico: "substitui",
        avisaServidor: true,
      },
      classificacao: {
        nome: "classificacao",
        tipo: "escolha",
        padrao: "",
        opcoes: CLASSIFICACOES,
        historico: "substitui",
        avisaServidor: true,
      },
      habilitado: {
        nome: "habilitado",
        tipo: "escolha",
        padrao: "",
        opcoes: SIM_OU_NAO,
        historico: "substitui",
        avisaServidor: true,
      },
      selecionado: {
        nome: "selecionado",
        tipo: "escolha",
        padrao: "",
        opcoes: SIM_OU_NAO,
        historico: "substitui",
        avisaServidor: true,
      },
      /*
       * ⚠️ O ÚNICO PADRÃO NÃO VAZIO DESTA ROTA. A listagem abre com quem está ativo, como na v2.0, e o
       * padrão some da URL: `/instrutores` limpo já significa "ativos", e ver os inativos exige
       * `?situacao=inativo` — que é link compartilhável.
       */
      situacao: {
        nome: "situacao",
        tipo: "escolha",
        padrao: "ativo",
        opcoes: SITUACOES_DE_CADASTRO,
        historico: "substitui",
        avisaServidor: true,
      },
      /*
       * ⚠️ O ÚNICO QUE NÃO AVISA O SERVIDOR. A ordem canônica é a antiguidade, servida pelo banco;
       * `ordem` só reordena o que já chegou. Avisar o servidor aqui convidaria a consulta a trocar
       * `ordem_antiguidade` por outra coluna — que é como a `RN-ANT-01` se quebra sem ninguém ver.
       */
      ordem: {
        nome: "ordem",
        tipo: "escolha",
        padrao: "",
        opcoes: ORDENS_DE_INSTRUTOR,
        historico: "substitui",
        avisaServidor: false,
      },
    },
  },
  /*
   * A ficha (`RF-INSTR-10`). A identidade vive no CAMINHO, e é o `codigo` — o número que a pessoa
   * reconhece —, nunca o `id` uuid. Nenhum parâmetro de consulta: a aba aberta é estado efêmero.
   */
  "/instrutores/[codigo]": {
    rota: "/instrutores/[codigo]",
    origem: "RF-INSTR-10",
    parametros: {},
  },
  /*
   * O cadastro (`RF-INSTR-02`).
   *
   * ⚠️ ROTA QUE O CONTRATO HUMANO DA FASE 1 NÃO TINHA (achado D-6 do tasks.md da spec 006). Criar
   * instrutor não cabe em `/instrutores/[codigo]`, que pressupõe um código existente. Nenhum
   * parâmetro: rascunho de formulário não vai para a URL — é o `CHK036`, decisão pendente, e toca PII.
   */
  "/instrutores/novo": {
    rota: "/instrutores/novo",
    origem: "RF-INSTR-02",
    parametros: {},
  },
} as const satisfies Record<string, ContratoDeRota>;

/** As rotas que o contrato conhece. */
export type Rota = keyof typeof CONTRATO;

/**
 * Os parâmetros que uma rota aceita.
 *
 * ⚠️ É ISTO QUE FAZ O `FR-001` VALER: pedir um parâmetro fora do contrato da rota **não compila**.
 * A tabela do documento 25 nunca conseguiu isso, e é por isso que ela não bastava.
 */
export type ParametroDe<R extends Rota> = keyof (typeof CONTRATO)[R]["parametros"] & string;

/** O descritor de um parâmetro, para quem precisa da política e não só do valor. */
export function descritor<R extends Rota>(rota: R, nome: ParametroDe<R>): Parametro {
  return (CONTRATO[rota].parametros as Readonly<Record<string, Parametro>>)[nome] as Parametro;
}

/** Todos os descritores de uma rota, na ordem em que foram declarados. */
export function parametrosDaRota<R extends Rota>(rota: R): readonly Parametro[] {
  return Object.values(CONTRATO[rota].parametros as Readonly<Record<string, Parametro>>);
}

/** O prefixo das rotas de impressão (documento 25 §1.3, regra 2). */
export const PREFIXO_DE_IMPRESSAO = "/print";

/**
 * Os parâmetros de uma rota de impressão: **os mesmos da tela de origem, sem tradução** (`FR-035`).
 *
 * ⚠️ É RESERVA, NÃO IMPLEMENTAÇÃO. As rotas de impressão são dos Épicos 10 e 11, e nenhuma existe
 * neste contrato hoje — o teste confere isso. O que esta função reserva é a **ausência de tradução**:
 * ela delega, e a delegação é o requisito. Uma versão futura que traduzisse nomes ou recortasse
 * parâmetros faria `/print/dsa` imprimir algo diferente do que está na tela, que é o defeito que a
 * regra 2 do documento 25 §1.3 existe para impedir.
 *
 * ⚠️ E É POR ISSO QUE ELA É UMA LINHA SÓ. Se um dia precisar de mais de uma, a regra mudou.
 */
export function parametrosDaImpressaoDe<R extends Rota>(rota: R): readonly Parametro[] {
  return parametrosDaRota(rota);
}

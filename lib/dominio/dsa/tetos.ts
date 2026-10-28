/**
 * Os tetos semanais e os alertas do lançamento — `RN-DIST-03`, `RF-HOR-03.1`, `RN-DEG-02`.
 *
 * > *"Existem dois regimes de teto semanal por matéria, e os dois devem ser preservados: (a) [sem
 * > efeito desde 27/10/2026] o Treinamento Físico Militar (TFM) **não tem mais regime próprio** — é
 * > matéria do regime (c), como qualquer outra; (b) matérias de fim de curso (identificadas pelo nome
 * > — «LHFC» ou qualquer nome contendo «fim de curso») **não têm teto algum**, nem mesmo recomendado,
 * > e podem concentrar livremente; (c) todas as demais matérias — **inclusive o TFM** — têm um teto de
 * > 25 tempos de aula por semana que é apenas **recomendado**."*
 * > — `RN-DIST-03` **[REVISADA — v2.1, 27/10/2026]**, documento 04 da Fase 1, **Risco: Alto**
 *
 * ⚠️ **EMENDA DE 27/10/2026 — O TFM DEIXOU DE TER TETO RÍGIDO** *(decisão de Bernardo Villas Boas; `FR-001`
 * e D-2 a D-4 da spec 029; o documento 04 traz o ANTES inteiro, e o `.docx` não recebeu a emenda)*. O
 * texto que valia até ali, e que este módulo implementava com o TFM como o **único bloqueio** do DSA, era:
 *
 * > *"Existem três regimes de teto semanal por matéria, e os três devem ser preservados: (a)
 * > Treinamento Físico Militar (TFM) tem teto **rígido** de 6 tempos de aula por semana, que nunca
 * > pode ser ultrapassado; (b) matérias de fim de curso (identificadas pelo nome — «LHFC» ou qualquer
 * > nome contendo «fim de curso») **não têm teto algum**, nem mesmo recomendado, e podem concentrar
 * > livremente; (c) todas as demais matérias têm um teto de 25 tempos de aula por semana que é apenas
 * > **recomendado**."*
 * > — `RN-DIST-03` antes da emenda (a citação que este cabeçalho trazia até 27/10/2026)
 *
 * Saíram o ramo do TFM, o `ehTfm` e o `TetosDoDsa.tfmSemana`. ⚠️ **O TFM FICOU NO REGIME (c), e não no
 * (b)** (D-2): de 7 a 25 TA não sai nada, e acima de 25 sai **o mesmo alerta, na mesma frase**, que
 * qualquer disciplina recebe — não um aviso sobre TFM. Pô-lo no (b), sem teto algum como o LHFC, seria
 * criar uma isenção nova por nome, que a emenda não pediu.
 *
 * > *"O uso do tempo de aula excepcional (9º TA, ou equivalente em outro curso) deve ser tratado como
 * > **alerta informativo**, nunca como bloqueio — ele é, por definição curricular, um recurso
 * > «opcional... para situações excepcionais»."*
 * > — `RF-HOR-03.1`, documento 02 da Fase 1
 *
 * ## NENHUM teto deste sistema bloqueia — desde a emenda, nem o do TFM
 *
 * ⚠️ **TUDO AQUI É ALERTA, E ISSO NÃO É FROUXIDÃO: é a regra** (`RN-DEG-02`, regra 6 do contrato do
 * projeto). Até 27/10/2026 o `FR-024` e o contrato do lançamento da spec 013 diziam *"Bloqueio: só
 * `dsa_teto_tfm`"*; com a emenda, a lista de bloqueios **por teto** ficou vazia. ⚠️ **O DSA continua
 * recusando, mas não por teto:** o dia bloqueado no calendário (`RN-EVT-04`) e o dia fora da etapa
 * presencial (`D-DSA-2`) são conferidos pela Server Action, fora deste módulo. E o `RF-HOR-03.1`
 * adverte que *"a tentação de transformar isso numa CHECK constraint é real e deve ser resistida"* —
 * ⚠️ **nada deste módulo vira `CHECK`, gatilho, policy que nega ou botão desabilitado.** O teto
 * recomendado de 25 TA existe para ser visto por quem distribui, não para impedir a distribuição que a
 * planilha da v2.0 permite hoje.
 *
 * ⚠️ **`Veredito.bloqueios` FICA NO TIPO, sempre vazio**, porque a Server Action trata qualquer bloqueio
 * que um veredito traga (`lib/acoes/dsa.ts`) e porque os testes provam a ausência dele — `bloqueios: []`
 * é a forma de *dizer* que nenhum caminho recusa, e não um resto esquecido.
 *
 * ## A precedência é declarada, e a ordem importa
 *
 * **Sem teto (fim de curso) vence · depois o recomendado.** Uma disciplina de fim de curso **nunca**
 * alerta, mesmo que passe de 25 TA e mesmo que o nome também contenha "TFM" — porque a `RN-DIST-03` (b)
 * diz *"não têm teto algum, nem mesmo recomendado"*. ⚠️ **Escrita na ordem inversa, a regra (b) ficaria
 * inalcançável**, e o LHFC passaria a receber o alerta do recomendado na concentração que a (b) autoriza.
 *
 * ## O número vem de `config_parametros`; os NOMES vêm da própria regra
 *
 * `dsa.teto_recomendado_semana` (25) chega **por parâmetro** (Princípio VII, `RNF-NORM-08`) — ⚠️ **não é
 * literal neste arquivo**, e há um caso de teste que prova isso mudando-o e observando o veredito virar
 * (DoD 8). ⚠️ **`dsa.teto_tfm_semana` (6) continua no banco, como DADO INERTE** (D-3 da spec 029): o
 * código deixou de lê-lo, e por isso ele não é campo do tipo — um campo aqui convidaria a voltar a lê-lo.
 *
 * ⚠️ **JÁ OS MARCADORES DE NOME — "LHFC" e "fim de curso" — SÃO TEXTO DA NORMA, NÃO PARÂMETRO**, e por
 * isso ficam aqui. A `RN-DIST-03` identifica a família (b) *"pelo nome"*, com essas palavras; movê-los
 * para `config_listas` deixaria alguém estender ou desligar a isenção editando uma lista administrável.
 * Os marcadores "tfm" e "treinamento físico" saíram com a emenda: ⚠️ **não há mais tratamento por nome
 * do TFM neste módulo**, e "TFM" é nome de disciplina como qualquer outro — inclusive a *"Orientação de
 * TFM"*, subtipo AEC de `tipos_atividade`, que de todo modo nunca chega aqui (este módulo recebe **nome
 * de disciplina da semana**, nunca subtipo de atividade não letiva).
 *
 * ⚠️ **O `codigo` de cada aviso é atribuído pela Server Action** (`lib/acoes/dsa.ts`, PR 2), que
 * publica `avisos: { codigo, texto }[]` para o `AlertaConformidade`. Este módulo devolve **texto**, e
 * a correspondência, para quem for ligar os dois, é: `avaliarTetosDaSemana` → `teto_recomendado`
 * (o `dsa_teto_tfm`, de bloqueio, deixou de ser emitido em 27/10/2026); `avaliarODia` →
 * `acima_do_regime` e `ta_excepcional`; `avaliarAUnidade` → `ue_passou` (`contracts/lancamento.md`).
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`, e sem import nenhum** — a
 * normalização de nome está escrita aqui de propósito, para que uma regra de *Risco: Alto* não
 * dependa de outro arquivo poder mudar de comportamento debaixo dela.
 */

/** Os tetos vêm de `config_parametros` (Princípio VII) — NUNCA literais no código. */
export type TetosDoDsa = {
  /**
   * `dsa.teto_recomendado_semana` = 25. **Recomendado**: acima dele sai alerta — para toda disciplina
   * que não seja de fim de curso, **inclusive o TFM** desde a emenda de 27/10/2026 (D-2 da spec 029).
   */
  readonly recomendadoSemana: number;
};

/** Quanto uma disciplina já tem na semana ISO — somado por quem consulta o banco. */
export type DisciplinaNaSemana = {
  readonly nome: string;
  /** TA já lançados nesta semana, **incluindo** o que está sendo gravado. */
  readonly taNaSemana: number;
};

export type Veredito = {
  /**
   * Mensagens que IMPEDIRIAM a gravação. ⚠️ **Sempre vazia desde 27/10/2026**: o TFM era o único teto que
   * bloqueava, e a emenda da `RN-DIST-03` (a) o tirou (spec 029, `FR-001`).
   */
  readonly bloqueios: readonly string[];
  /** Mensagens que acompanham a gravação, que acontece. */
  readonly alertas: readonly string[];
};

const NENHUM: Veredito = { bloqueios: [], alertas: [] };

/**
 * Minúsculas e **sem acento**, para comparar nome de disciplina como gente compara.
 *
 * ⚠️ **O ACENTO NASCEU DO MARCADOR DO TFM** (*"treinamento físico"*, contra a disciplina real
 * *"Treinamento Físico Militar"*), que saiu com a emenda de 27/10/2026. Os marcadores que ficaram —
 * *"lhfc"* e *"fim de curso"* — não têm acento, mas a remoção fica: ela não muda veredito nenhum para
 * eles e mantém a comparação imune a quem digitar o cadastro com acento onde a norma não tem.
 *
 * `NFD` separa a letra do sinal diacrítico, e o intervalo `U+0300–U+036F` é o dos sinais combinantes
 * — removê-los deixa `í` → `i`. ⚠️ **A ordem importa:** `toLowerCase()` vem **depois** da remoção,
 * porque há letra maiúscula acentuada (`Í`) cujo sinal também precisa sair.
 *
 * ⚠️ **ESPAÇO REPETIDO TAMBÉM É COLAPSADO**, porque *"fim  de curso"* digitado com dois espaços
 * deixaria de casar com o marcador e devolveria teto a quem a norma isenta.
 */
function normalizar(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A disciplina é de **fim de curso** — `RN-DIST-03` (b), **sem teto algum**.
 *
 * ⚠️ **"LHFC" É TERMO INTRADUZÍVEL** (vocabulário do projeto) e a norma o nomeia junto de *"qualquer
 * nome contendo «fim de curso»"* — são dois marcadores, não um. A segunda forma é a que pega
 * *"Laboratório de Fim de Curso"*, que é como vários currículos a escrevem.
 */
export function semTetoAlgum(nome: string): boolean {
  const texto = normalizar(nome);
  return texto.includes("lhfc") || texto.includes("fim de curso");
}

/** Conta medida: zero é resultado legítimo (nada lançado), e número estranho não vira veredito. */
function contagem(valor: number): number {
  return Number.isFinite(valor) ? valor : 0;
}

/**
 * O veredito da semana, disciplina por disciplina.
 *
 * ⚠️ **LISTA VAZIA DEVOLVE NEUTRO, NÃO ALERTA** (`RN-DEG-01`): semana sem lançamento nenhum não tem
 * teto a cobrar, e inventar aviso ali encheria de ruído a primeira semana de toda turma.
 *
 * ⚠️ **AS DUAS FAMÍLIAS SÃO MUTUAMENTE EXCLUSIVAS** — o `continue` do fim de curso vem **antes** do
 * recomendado, e é isso que faz a precedência do cabeçalho existir em código em vez de só na prosa.
 *
 * ⚠️ **NÃO HÁ RAMO POR NOME DO TFM, e a ausência é a emenda** (`RN-DIST-03` (a), 27/10/2026): o TFM cai
 * no recomendado como toda disciplina, com **a mesma frase**. Um ramo próprio — ainda que só para mudar
 * o texto do alerta — seria um aviso sobre TFM, que o pedido da spec 029 manda não haver.
 */
export function avaliarTetosDaSemana(
  disciplinas: readonly DisciplinaNaSemana[],
  tetos: TetosDoDsa,
): Veredito {
  const alertas: string[] = [];

  for (const disciplina of disciplinas) {
    const ta = contagem(disciplina.taNaSemana);

    if (semTetoAlgum(disciplina.nome)) continue;

    if (ta > tetos.recomendadoSemana) {
      alertas.push(
        `«${disciplina.nome}» tem ${ta} TA nesta semana; o recomendado é ${tetos.recomendadoSemana}.`,
      );
    }
  }

  return { bloqueios: [], alertas };
}

export type DiaParaAvaliar = {
  /** TA já lançados no dia, **incluindo** o que está sendo gravado. */
  readonly taLancadosNoDia: number;
  /**
   * Quantos TA o regime vigente prevê no dia. `null` quando não há regime (`RN-DEG-01`).
   *
   * ⚠️ **`null` NÃO É ZERO, e a diferença é o alerta inteiro:** zero diria *"o regime prevê nenhum
   * TA"* e acusaria **todo** lançamento de passar do regime; `null` diz *"não se mediu"* e cala.
   */
  readonly temposDoRegime: number | null;
  /** O bloco usa o TA excepcional — o 9º da `RF-HOR-03.1`. */
  readonly usouExcepcional: boolean;
};

/**
 * O veredito do dia — **dois alertas, zero bloqueios**.
 *
 * ⚠️ **NENHUM DOS DOIS IMPEDE NADA, e o segundo é nominalmente proibido de impedir:** o
 * `RF-HOR-03.1` chama o TA excepcional de *"alerta informativo, nunca bloqueio"*. Passar do regime é
 * da mesma classe — o dia estendido é justamente o que o 9º TA existe para permitir.
 */
export function avaliarODia(entrada: DiaParaAvaliar): Veredito {
  const alertas: string[] = [];
  const lancados = contagem(entrada.taLancadosNoDia);

  if (entrada.temposDoRegime !== null && lancados > entrada.temposDoRegime) {
    alertas.push(`O dia tem ${lancados} TA lançados; o regime prevê ${entrada.temposDoRegime}.`);
  }

  if (entrada.usouExcepcional) {
    alertas.push(
      "O lançamento usa o tempo de aula excepcional, previsto só para situações excepcionais.",
    );
  }

  return { bloqueios: [], alertas };
}

export type UnidadeParaAvaliar = {
  /**
   * A carga prevista da unidade de ensino. `null` quando a UE não declara carga.
   *
   * ⚠️ **`null` EXISTE DE VERDADE NESTA BASE:** dois currículos são **por competências** e não têm
   * carga por unidade (`C-Espc-FR` e `C-Espc-HN`, medidos no catálogo em 26/09/2026). Zero ali faria
   * o primeiro TA lançado *"passar"* da previsão em toda disciplina desses dois cursos.
   */
  readonly chPrevista: number | null;
  /** A carga já lançada na unidade, **incluindo** o que está sendo gravado. */
  readonly chLancada: number;
};

/**
 * O **"PASSOU"** da planilha da v2.0 — alerta, nunca bloqueio.
 *
 * ⚠️ **PASSAR DA PREVISÃO É FATO CORRIQUEIRO E LEGÍTIMO**: a UE prevista em 10 que consumiu 11 é
 * exatamente o que a coluna "PASSOU" da planilha registra hoje, sem impedir ninguém. Recusar aqui
 * tiraria da operação um lançamento que ela faz desde sempre.
 *
 * ⚠️ **AS DUAS CARGAS CHEGAM NA MESMA UNIDADE, e este módulo não converte.** Quem consulta o banco
 * entrega as duas em TA ou as duas em horas (a equivalência herdada é *1 TA ≈ 1 h*, spec 006, T011);
 * comparar unidades diferentes é defeito de quem chama, e não há como este módulo perceber.
 */
export function avaliarAUnidade(entrada: UnidadeParaAvaliar): Veredito {
  if (entrada.chPrevista === null) return NENHUM;

  const lancada = contagem(entrada.chLancada);
  if (lancada <= entrada.chPrevista) return NENHUM;

  return {
    bloqueios: [],
    alertas: [
      `A unidade de ensino passou da carga prevista: ${lancada} lançada contra ${entrada.chPrevista} prevista.`,
    ],
  };
}

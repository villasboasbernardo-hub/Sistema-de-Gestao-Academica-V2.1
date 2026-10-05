/**
 * Os tetos semanais e os alertas do lançamento — `RN-DIST-03`, `RF-HOR-03.1`, `RN-DEG-02`.
 *
 * > *"Existem três regimes de teto semanal por matéria, e os três devem ser preservados: (a)
 * > Treinamento Físico Militar (TFM) tem teto **rígido** de 6 tempos de aula por semana, que nunca
 * > pode ser ultrapassado; (b) matérias de fim de curso (identificadas pelo nome — «LHFC» ou qualquer
 * > nome contendo «fim de curso») **não têm teto algum**, nem mesmo recomendado, e podem concentrar
 * > livremente; (c) todas as demais matérias têm um teto de 25 tempos de aula por semana que é apenas
 * > **recomendado**."*
 * > — `RN-DIST-03`, documento 04 da Fase 1, **Risco: Alto**
 *
 * > *"O uso do tempo de aula excepcional (9º TA, ou equivalente em outro curso) deve ser tratado como
 * > **alerta informativo**, nunca como bloqueio — ele é, por definição curricular, um recurso
 * > «opcional... para situações excepcionais»."*
 * > — `RF-HOR-03.1`, documento 02 da Fase 1
 *
 * ## O ÚNICO bloqueio deste sistema é o TFM
 *
 * ⚠️ **TODO O RESTO É ALERTA, E ISSO NÃO É FROUXIDÃO: é a regra** (`RN-DEG-02`, regra 6 do contrato
 * do projeto). O `FR-024` e o contrato do lançamento dizem, com essas palavras, que *"Bloqueio: só
 * `dsa_teto_tfm`"*. E o `RF-HOR-03.1` adverte que *"a tentação de transformar isso numa CHECK
 * constraint é real e deve ser resistida"* — ⚠️ **nada deste módulo vira `CHECK`, gatilho, policy que
 * nega ou botão desabilitado.** O teto recomendado de 25 TA existe para ser visto por quem distribui,
 * não para impedir a distribuição que a planilha da v2.0 permite hoje.
 *
 * ## A precedência é declarada, e a ordem importa
 *
 * **Sem teto vence · depois TFM · depois o recomendado.** Uma disciplina de fim de curso **nunca**
 * bloqueia e **nunca** alerta, mesmo que o nome também contenha "TFM" — porque a `RN-DIST-03` (b) diz
 * *"não têm teto algum, nem mesmo recomendado"*, e "algum" inclui o rígido. ⚠️ **Escrita na ordem
 * inversa, a regra (b) ficaria inalcançável para esse nome**, e o LHFC de um curso de educação física
 * passaria a ser recusado acima de 6 TA — exatamente a concentração que a (b) autoriza.
 *
 * ## Os números vêm de `config_parametros`; os NOMES vêm da própria regra
 *
 * `dsa.teto_tfm_semana` (6) e `dsa.teto_recomendado_semana` (25) chegam **por parâmetro** (Princípio
 * VII, `RNF-NORM-08`) — ⚠️ **nenhum deles é literal neste arquivo**, e há um caso de teste que prova
 * isso mudando os dois e observando o veredito virar (DoD 8).
 *
 * ⚠️ **JÁ OS MARCADORES DE NOME — "TFM", "treinamento físico", "LHFC", "fim de curso" — SÃO TEXTO DA
 * NORMA, NÃO PARÂMETRO**, e por isso ficam aqui. A `RN-DIST-03` identifica as duas famílias *"pelo
 * nome"*, com essas palavras; movê-los para `config_listas` deixaria alguém desligar o teto rígido de
 * TFM editando uma lista administrável, que é o oposto de *"nunca pode ser ultrapassado"*. O plano
 * desta spec lista **três** parâmetros de `config_parametros`, e nenhum é marcador de nome.
 *
 * ## O que este módulo NÃO sabe
 *
 * ⚠️ **"TFM" TEM DOIS SIGNIFICADOS NESTA BASE, e só um chega aqui.** No `RN-DIST-03` é **Treinamento
 * Físico Militar**, uma disciplina; em `tipos_atividade` existe o subtipo **"Orientação de TFM"**, da
 * categoria AEC (`H2`). ⚠️ Este módulo recebe **nome de disciplina da semana**, nunca subtipo de
 * atividade não letiva — então a orientação de TFM não entra na conta do teto de 6, e nada aqui a
 * confunde com a disciplina. Quem passar subtipo de atividade nesta lista estará medindo outra coisa.
 *
 * ⚠️ **O `codigo` de cada aviso é atribuído pela Server Action** (`lib/acoes/dsa.ts`, PR 2), que
 * publica `avisos: { codigo, texto }[]` para o `AlertaConformidade`. Este módulo devolve **texto**, e
 * a correspondência, para quem for ligar os dois, é: `avaliarTetosDaSemana` → `dsa_teto_tfm`
 * (bloqueio) e `teto_recomendado`; `avaliarODia` → `acima_do_regime` e `ta_excepcional`;
 * `avaliarAUnidade` → `ue_passou` (`contracts/lancamento.md`).
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`, e sem import nenhum** — a
 * normalização de nome está escrita aqui de propósito, para que uma regra de *Risco: Alto* não
 * dependa de outro arquivo poder mudar de comportamento debaixo dela.
 */

/** Os tetos vêm de `config_parametros` (Princípio VII) — NUNCA literais no código. */
export type TetosDoDsa = {
  /** `dsa.teto_tfm_semana` = 6. **Rígido**: acima dele a gravação é recusada. */
  readonly tfmSemana: number;
  /** `dsa.teto_recomendado_semana` = 25. **Recomendado**: acima dele sai alerta. */
  readonly recomendadoSemana: number;
};

/** Quanto uma disciplina já tem na semana ISO — somado por quem consulta o banco. */
export type DisciplinaNaSemana = {
  readonly nome: string;
  /** TA já lançados nesta semana, **incluindo** o que está sendo gravado. */
  readonly taNaSemana: number;
};

export type Veredito = {
  /** Mensagens que IMPEDEM a gravação. Hoje só o TFM. */
  readonly bloqueios: readonly string[];
  /** Mensagens que acompanham a gravação, que acontece. */
  readonly alertas: readonly string[];
};

const NENHUM: Veredito = { bloqueios: [], alertas: [] };

/**
 * Minúsculas e **sem acento**, para comparar nome de disciplina como gente compara.
 *
 * ⚠️ **SEM ACENTO É REQUISITO, NÃO ZELO:** a disciplina real se chama *"Treinamento Físico Militar"*,
 * com acento no í, e o marcador da norma é *"treinamento físico"*. Comparar o texto cru faria o teto
 * **rígido** de uma regra de *Risco: Alto* depender de quem digitou o cadastro ter posto o acento.
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
 * A disciplina é **TFM** — o teto rígido de `RN-DIST-03` (a).
 *
 * Casa por "tfm" **ou** "treinamento fisico", sem acento e sem diferenciar maiúscula, porque os
 * cursos escrevem o nome das duas formas.
 */
export function ehTfm(nome: string): boolean {
  const texto = normalizar(nome);
  return texto.includes("tfm") || texto.includes("treinamento fisico");
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
 * ⚠️ **AS TRÊS FAMÍLIAS SÃO MUTUAMENTE EXCLUSIVAS, por `else if`**, e é isso que faz a precedência do
 * cabeçalho existir em código em vez de só na prosa. TFM acima do teto sai **só** como bloqueio:
 * acrescentar o alerta do recomendado junto diria duas coisas sobre o mesmo fato, e a segunda
 * (*"o recomendado é 25"*) é falsa para TFM, cujo teto é 6.
 */
export function avaliarTetosDaSemana(
  disciplinas: readonly DisciplinaNaSemana[],
  tetos: TetosDoDsa,
): Veredito {
  const bloqueios: string[] = [];
  const alertas: string[] = [];

  for (const disciplina of disciplinas) {
    const ta = contagem(disciplina.taNaSemana);

    if (semTetoAlgum(disciplina.nome)) continue;

    if (ehTfm(disciplina.nome)) {
      if (ta > tetos.tfmSemana) {
        bloqueios.push(
          `«${disciplina.nome}» já tem ${ta} TA nesta semana; o teto de TFM é ${tetos.tfmSemana}.`,
        );
      }
    } else if (ta > tetos.recomendadoSemana) {
      alertas.push(
        `«${disciplina.nome}» tem ${ta} TA nesta semana; o recomendado é ${tetos.recomendadoSemana}.`,
      );
    }
  }

  return { bloqueios, alertas };
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

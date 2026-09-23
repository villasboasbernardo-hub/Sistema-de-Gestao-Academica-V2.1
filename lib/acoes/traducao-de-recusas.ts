/**
 * Tradução das recusas do banco para quem está na tela (`FR-042`, `FR-021.4`, `RN-DEG-01`).
 *
 * ⚠️ **QUEM NEGA É O BANCO; ESTE MÓDULO SÓ DIZ COMO A NEGATIVA CHEGA À PESSOA.** Nenhuma decisão de
 * negócio mora aqui — se uma regra pudesse ser respondida por esta camada, ela estaria implementada
 * na interface, que o BRIEF §2 proíbe. O que existe aqui é vocabulário.
 *
 * ⚠️ **O DISCRIMINADOR É `SQLSTATE` + `HINT`, NUNCA O TEXTO DO `message`.** A chave do `HINT` é nossa,
 * declarada nas migrations; o `message` é da plataforma. Onde não há chave — `UNIQUE`, `CHECK`,
 * `NOT NULL` —, o discriminador é o **nome da restrição**, que também é nosso. O `message` cru
 * **nunca** é repassado: ele vai para o log do servidor.
 *
 * ⚠️ **AS CHAVES FORAM MEDIDAS NO BANCO, não copiadas do contrato** — `pg_proc.prosrc` sem comentário
 * (regra 9.1.1 do `CLAUDE.md`) e `pg_constraint`, banco local, 23/09/2026. **Duas divergências
 * achadas, e a primeira seria muda:** o contrato §2 nomeia `vigencia_parametro_imutavel` e o banco
 * emite **`vigencia_imutavel`** — escrever a do contrato faria a tradução nunca disparar, e a pessoa
 * receberia a frase genérica sem que nada acusasse; e o banco emite **`vigencia_cancelada_imutavel`**,
 * que o contrato não lista. Aqui vale o que o banco emite; a emenda do contrato é decisão à parte.
 *
 * Origem: `specs/009-cursos-e-turmas/contracts/escritas-recusas-e-avisos.md` §2.
 */

/** O formato do erro do PostgREST — e de qualquer coisa que o imite. */
export type ErroDoBanco = {
  readonly code?: string | null;
  readonly message: string;
  /** A chave estável da recusa de negócio — nossa, não da plataforma. */
  readonly hint?: string | null;
  /** O `DETAIL` do `raise`, que as recusas desta fatia mandam como JSON. */
  readonly details?: string | null;
};

/**
 * O que a **ação** sabe e o banco não tem como dizer.
 *
 * ⚠️ **`cursoInativo` É LIDO ANTES DE TRADUZIR, e não adivinhado aqui.** A RLS recusa igual nos dois
 * casos — curso inativo e curso fora do escopo —, e quem distingue é a ação, lendo a situação do
 * curso, que é legível no escopo (`FR-017.1`). Ausente, vale a frase que não afirma nada sobre o
 * curso: não saber não pode virar afirmação.
 */
export type ContextoDaRecusa = {
  /** A sigla que a pessoa digitou, para as mensagens que a nomeiam. */
  readonly sigla?: string;
  /** O que a escrita ia acrescentar: `"turma nova"`, `"vigência nova"`. */
  readonly oQueNaoRecebe?: string;
  /** A situação do curso, lida pela ação antes de traduzir. */
  readonly cursoInativo?: boolean;
  /** A turma que já ocupa o rótulo no ano, lida pela ação depois do `23505`. */
  readonly turmaOcupante?: {
    readonly codigo: string;
    readonly rotulo: string | null;
    readonly sigla: string;
    readonly ano: number;
  };
  /** A gravação é o cancelamento da última vigência `padrao` do curso. */
  readonly cancelandoVigencia?: boolean;
  /** Rótulo de tela de cada coluna, para o `23502`. Completa o padrão, não o substitui. */
  readonly rotuloDaColuna?: Readonly<Record<string, string>>;
};

/**
 * O `DETAIL` lido como objeto, ou vazio.
 *
 * ⚠️ **LER O `DETAIL` É OPCIONAL, E A MENSAGEM PRECISA FUNCIONAR SEM ELE.** Ele chega como texto e
 * pode não ser JSON — foi o que quebrou o auxiliar de recusa do pgTAP em 17/09/2026, com uma violação
 * de `EXCLUDE` cujo `DETAIL` é frase corrida. Aqui a falha de leitura degrada, nunca estoura.
 */
function detalhe(erro: ErroDoBanco): Record<string, unknown> {
  if (!erro.details) return {};
  try {
    const lido: unknown = JSON.parse(erro.details);
    return typeof lido === "object" && lido !== null ? (lido as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const texto = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() !== "" ? v : undefined;

const numero = (v: unknown): number | undefined =>
  typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : undefined;

const lista = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** `[{codigo, status}]` — o formato que `guardar_situacao_do_curso` monta para as turmas pendentes. */
function codigosDeTurma(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((t) =>
      typeof t === "object" && t !== null ? texto((t as { codigo?: unknown }).codigo) : undefined,
    )
    .filter((c): c is string => c !== undefined);
}

/** `a, b e c` — a enumeração que se lê em voz alta. */
function enumerar(itens: readonly string[]): string {
  if (itens.length <= 1) return itens[0] ?? "";
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/**
 * O rótulo de tela de cada coluna obrigatória desta fatia.
 *
 * ⚠️ NÃO É TRADUÇÃO DE SCHEMA, É VOCABULÁRIO DE TELA. Coluna fora desta lista vira frase legível a
 * partir do próprio nome — o que degrada, mas nunca deixa a pessoa sem saber o que faltou.
 */
const ROTULO_PADRAO: Readonly<Record<string, string>> = {
  codigo: "Sigla",
  nome_curso: "Nome do curso",
  classificacao: "Classificação",
  modalidade: "Modalidade",
  duracao_dias: "Duração em dias",
  curso_id: "Curso",
  ano_letivo: "Ano letivo",
  status: "Situação",
  sala_alocada: "Sala",
  valor: "Nome da sala",
  vigente_de: "Data a partir da qual vale",
  regime_tempos: "Tempos de aula por dia",
  ta_duracao_min: "Duração do TA",
  tipo: "Tipo de regime",
};

function rotuloDe(coluna: string, contexto: ContextoDaRecusa): string {
  const declarado = contexto.rotuloDaColuna?.[coluna] ?? ROTULO_PADRAO[coluna];
  if (declarado) return declarado;
  const legivel = coluna.replaceAll("_", " ");
  return legivel.charAt(0).toUpperCase() + legivel.slice(1);
}

/**
 * A mensagem de cada restrição sem chave estável, pelo **nome da restrição**.
 *
 * ⚠️ O NOME É NOSSO E ESTÁVEL — declarado nas migrations, conferido em `pg_constraint` no banco local
 * em 23/09/2026. Não é o texto do erro da plataforma, que pode mudar de redação.
 */
const MENSAGEM_DA_RESTRICAO: Readonly<Record<string, string>> = {
  turmas_rotulo_forma: "O rótulo da turma é T seguido do número — T1, T2.",
  config_listas_sala_com_natureza: "Informe se a sala é física ou ambiente virtual.",
  cursos_classificacao_nao_geral: "Esta classificação não é aceita para curso.",
  turmas_periodo_coerente: "A data de término não pode ser anterior à data de início.",
  turmas_ano_valido: "O ano letivo informado não é aceito.",
  cursos_duracao_dias_positiva: "A duração em dias tem de ser maior que zero.",
  cursos_duracao_semanas_positiva: "A duração em semanas tem de ser maior que zero.",
  cursos_limite_turmas_positivo: "O limite de turmas por ano tem de ser maior que zero.",
};

/**
 * A recusa por alcance — as **duas** frases em que a RLS chega, e a que vale para `UPDATE` que não
 * achou linha.
 *
 * ⚠️ **`UPDATE` BARRADO PELO `USING` DA POLICY NÃO DÁ ERRO NENHUM**: o motor atualiza zero linhas e
 * responde sucesso. Só o `WITH CHECK` gera `42501`. Sem tratar zero linhas como recusa, a tela diria
 * "salvo" sem ter salvado nada — é o gotcha nº 4 do `CLAUDE.md` do lado da escrita.
 */
export function recusaPorAlcance(contexto: ContextoDaRecusa = {}): string {
  if (contexto.cursoInativo && contexto.sigla) {
    const oQue = contexto.oQueNaoRecebe ?? "alterações";
    return `O curso ${contexto.sigla} está inativo e não recebe ${oQue}.`;
  }
  return "O seu perfil não pode fazer esta alteração neste curso.";
}

/** As recusas que chegam com chave estável no `HINT`. */
function porChave(
  chave: string,
  erro: ErroDoBanco,
  contexto: ContextoDaRecusa,
): string | undefined {
  const d = detalhe(erro);

  switch (chave) {
    case "curso_com_turma_pendente": {
      const codigos = codigosDeTurma(d.turmas);
      if (codigos.length === 0) {
        return (
          "Não é possível desativar: o curso tem turma planejada ou ativa. " +
          "Conclua ou cancele cada uma primeiro."
        );
      }
      return (
        `Não é possível desativar: ${codigos.length} turma(s) planejada(s) ou ativa(s) — ` +
        `${codigos.join(", ")}. Conclua ou cancele cada uma primeiro.`
      );
    }

    case "curso_inativo_so_reativa":
      return "O curso está inativo. Reative-o antes de editar.";

    case "situacao_sem_permissao":
      return "O seu perfil não desativa nem reativa curso.";

    case "sigla_de_outro_curso": {
      const sigla = texto(d.sigla) ?? contexto.sigla;
      const dono = texto(d.curso_sigla_atual);
      const nome = texto(d.curso_nome);
      const deixada = texto(d.deixada_em);
      if (!sigla || !dono || !deixada) {
        return (
          "A sigla já identificou outro curso e continua nos códigos das turmas dele. " +
          "Escolha outra sigla."
        );
      }
      const comNome = nome ? ` — ${nome} —` : "";
      return (
        `A sigla ${sigla} identificou o curso ${dono}${comNome} até ${deixada}, e continua nos ` +
        `códigos das turmas dele. Escolha outra sigla.`
      );
    }

    case "curso_sem_regime":
      return contexto.cancelandoVigencia
        ? "Esta é a única vigência padrão do curso; registre a que a substitui."
        : "Todo curso tem regime de horário. Informe o regime padrão junto com o curso.";

    case "codigo_de_turma_divergente":
    case "codigo_de_turma_imutavel":
      return "O código da turma é gerado pelo sistema e não muda.";

    case "sala_fora_da_lista": {
      const valor = texto(d.valor);
      const qual = valor ? `A sala ${valor} não está` : "A sala escolhida não está";
      return `${qual} na lista de salas. Salas novas são acrescentadas em Administração › Salas.`;
    }

    case "vigencia_imutavel":
      return (
        "Vigência registrada não muda. Para mudar o regime a partir de uma data, " +
        "registre nova vigência."
      );

    // ⚠️ Chave que o contrato §2 não lista — ver o cabeçalho. As três recusas de
    // `guardar_vigencia_de_regime` que a emitem dizem a mesma coisa por caminhos diferentes:
    // vigência cancelada não recebe alteração nenhuma, nem volta atrás.
    case "vigencia_cancelada_imutavel":
      return (
        "Esta vigência está cancelada e não recebe alteração nem volta a valer. " +
        "Registre uma vigência nova a partir da data que passa a valer."
      );

    case "vigencia_sem_sucessora":
      return "Uma vigência só é encerrada quando a seguinte é registrada.";

    case "vigencia_com_lancamento": {
      const total = numero(d.total);
      const tipo = texto(d.tipo);
      const data = texto(d.data);
      const turma = texto(d.turma);
      const atividade = texto(d.atividade);
      const fim = "Para mudar o regime, registre nova vigência a partir de uma data.";

      if (total === undefined || !data) {
        return `Esta vigência já tem lançamento que depende dela. ${fim}`;
      }
      const primeiro = atividade
        ? `a atividade ${atividade} de ${data}${turma ? `, alcançada pela turma ${turma}` : ""}`
        : `${tipo ?? "lançamento"} de ${data}${turma ? ` em ${turma}` : ""}`;
      const ponta = pontaAusente(texto(d.ponta_ausente), turma);
      return `Esta vigência já tem ${total} lançamento(s) — o primeiro: ${primeiro}. ${ponta}${fim}`;
    }

    case "vigencia_reinterpretaria_lancamento": {
      const desde = texto(d.vigente_de);
      const total = numero(d.total);
      const ultimo = texto(d.ultimo_lancamento);
      if (!desde || total === undefined || !ultimo) {
        return (
          "Uma vigência a partir desta data mudaria o horário de lançamentos já gravados. " +
          "Escolha uma data posterior."
        );
      }
      return (
        `Uma vigência a partir de ${desde} mudaria o horário de ${total} lançamento(s) já ` +
        `gravado(s) — o último em ${ultimo}. Escolha uma data posterior.`
      );
    }

    case "habilitacao_em_curso_inativo": {
      const nomes = lista(d.disciplinas);
      if (nomes.length === 0) {
        return "A disciplina é de curso inativo e não recebe habilitação nova.";
      }
      return nomes.length === 1
        ? `${nomes[0]} é de curso inativo e não recebe habilitação nova.`
        : `${enumerar(nomes)} são de curso inativo e não recebem habilitação nova.`;
    }

    default:
      return undefined;
  }
}

/** A frase que explica por que uma turma alcança um lançamento que parece fora da janela dela. */
function pontaAusente(ponta: string | undefined, turma: string | undefined): string {
  if (!ponta) return "";
  const qual = ponta === "termino" ? "sem data de término" : "sem data de início";
  const dela = turma ? `A turma ${turma} está` : "A turma está";
  return `${dela} ${qual}, e por isso alcança esse lançamento. `;
}

/** A recusa pelo nome da restrição, quando não há chave estável. */
function porRestricao(erro: ErroDoBanco, contexto: ContextoDaRecusa): string | undefined {
  if (erro.message.includes("cursos_codigo_key")) {
    return contexto.sigla
      ? `Já existe curso com a sigla ${contexto.sigla}.`
      : "Já existe curso com esta sigla.";
  }

  if (erro.message.includes("turmas_unica_por_ano")) {
    const t = contexto.turmaOcupante;
    if (!t) return "Já existe turma com este rótulo neste curso e ano. Escolha outro rótulo.";
    const comOuSem = t.rotulo ? `com o rótulo ${t.rotulo}` : "sem rótulo";
    return `Já existe a turma ${t.codigo} ${comOuSem} em ${t.sigla} ${t.ano}. Escolha outro rótulo.`;
  }

  for (const [restricao, mensagem] of Object.entries(MENSAGEM_DA_RESTRICAO)) {
    if (erro.message.includes(restricao)) return mensagem;
  }
  return undefined;
}

/** A coluna nomeada por um `23502`, se o motor a nomeou. */
function colunaObrigatoria(mensagem: string): string | undefined {
  return /column "([a-z_]+)"/.exec(mensagem)?.[1];
}

/**
 * Traduz a recusa do banco para a mensagem de negócio.
 *
 * ⚠️ **A ORDEM É DELIBERADA: chave estável primeiro.** `situacao_sem_permissao` chega como `42501`,
 * o mesmo código da RLS — se o genérico viesse antes, a pessoa leria "o seu perfil não pode fazer
 * esta alteração neste curso" quando o problema é outro, e iria procurar permissão de curso em vez
 * de permissão de situação.
 */
export function traduzirRecusa(erro: ErroDoBanco, contexto: ContextoDaRecusa = {}): string {
  const chave = erro.hint?.trim();
  if (chave) {
    const pelaChave = porChave(chave, erro, contexto);
    if (pelaChave) return pelaChave;
  }

  const pelaRestricao = porRestricao(erro, contexto);
  if (pelaRestricao) return pelaRestricao;

  switch (erro.code) {
    case "23502": {
      const coluna = colunaObrigatoria(erro.message);
      return coluna
        ? `${rotuloDe(coluna, contexto)} é obrigatório.`
        : "Um campo obrigatório não foi informado.";
    }
    case "42501":
      return recusaPorAlcance(contexto);
    case "40P01":
      return "Outra gravação no mesmo curso aconteceu ao mesmo tempo. Tente de novo.";
    case "23514":
      return "O banco recusou a gravação: um campo não atende à regra.";
    case "23505":
      return "Já existe um registro com este valor. Escolha outro.";
    case "23503":
      return "Esta gravação aponta para um registro que não existe mais. Recarregue a página.";
    default:
      break;
  }

  // ⚠️ O TEXTO CRU VAI PARA O LOG, NUNCA PARA A TELA. Repassá-lo foi o vazamento que o PR #13
  //    corrigiu no reenvio de convite.
  console.error("[CIAARA-11] recusa do banco sem tradução:", erro);
  return "Não foi possível gravar. Nada foi alterado.";
}

/**
 * `FR-042` · a recusa do banco chega como mensagem de negócio — nunca como texto do motor.
 *
 * ⚠️ **O DISCRIMINADOR É CÓDIGO + CHAVE, NÃO O TEXTO DA MENSAGEM.** O `HINT` é nosso e declarado nas
 * migrations; o `message` é da plataforma e pode mudar de redação numa atualização do PostgreSQL.
 * Casar pelo texto produziria uma tradução que funciona hoje e some sem avisar.
 *
 * ⚠️ **AS CHAVES E OS `DETAIL` DESTE ARQUIVO FORAM MEDIDOS NO BANCO LOCAL em 23/09/2026**, lendo
 * `pg_proc.prosrc` **sem comentário** (`CLAUDE.md`, regra 9.1.1) das dez funções que recusam nesta
 * fatia, e `pg_constraint` para os nomes de restrição. Não foram copiados do contrato — e ainda bem:
 * o contrato §2 nomeava `vigencia_parametro_imutavel`, e o banco emite `vigencia_imutavel`. A emenda
 * de 23/09/2026 corrigiu o contrato; estes casos continuam medindo o **banco**, que é a fonte.
 *
 * Origem: contrato `specs/009-cursos-e-turmas/contracts/escritas-recusas-e-avisos.md` §2, `FR-042`,
 * `FR-021.4`, `RN-DEG-01`.
 */
import { describe, expect, it } from "vitest";

import {
  recusaPorAlcance,
  traduzirRecusa,
  type ContextoDaRecusa,
  type ErroDoBanco,
} from "@/lib/acoes/traducao-de-recusas";

/**
 * O texto que o motor manda e que **nunca** pode chegar à tela. Toda construção de erro deste
 * arquivo o usa, e o último bloco varre todas as traduções atrás dele.
 */
const CRU = "null value in column violates constraint pg_internal_blah";

const erro = (code: string, extra: Partial<ErroDoBanco> = {}): ErroDoBanco => ({
  code,
  message: CRU,
  ...extra,
});

/** Um erro com chave estável e `DETAIL` em JSON, como o banco desta fatia emite. */
const comChave = (code: string, hint: string, detalhe?: unknown): ErroDoBanco =>
  erro(code, {
    hint,
    ...(detalhe === undefined ? {} : { details: JSON.stringify(detalhe) }),
  });

describe("`FR-042` · cada linha do contrato §2 vira a mensagem de negócio dela", () => {
  it("`curso_com_turma_pendente` conta as turmas e as nomeia", () => {
    const m = traduzirRecusa(
      comChave("23514", "curso_com_turma_pendente", {
        curso: "C-Ap-FR",
        turmas: [
          { codigo: "C-Ap-FR 2026", status: "ativa" },
          { codigo: "C-Ap-FR T2 2026", status: "planejada" },
        ],
      }),
    );
    expect(m).toContain("2 turma(s) planejada(s) ou ativa(s)");
    expect(m).toContain("C-Ap-FR 2026");
    expect(m).toContain("C-Ap-FR T2 2026");
    expect(m).toContain("Conclua ou cancele cada uma primeiro.");
  });

  it("`curso_inativo_so_reativa` manda reativar antes de editar", () => {
    const m = traduzirRecusa(
      comChave("23514", "curso_inativo_so_reativa", { curso: "C-Ap-FR", colunas: ["nome_curso"] }),
    );
    expect(m).toBe("O curso está inativo. Reative-o antes de editar.");
  });

  it("`situacao_sem_permissao` fala de desativar e reativar, e não de editar", () => {
    const m = traduzirRecusa(comChave("42501", "situacao_sem_permissao", { curso: "C-Ap-FR" }));
    expect(m).toBe("O seu perfil não desativa nem reativa curso.");
  });

  it("`sigla_de_outro_curso` nomeia o dono atual, o nome dele e a data em que a deixou", () => {
    const m = traduzirRecusa(
      comChave("23505", "sigla_de_outro_curso", {
        sigla: "C-Esp-ALH",
        curso_sigla_atual: "C-Esp-ALH-N",
        curso_nome: "Curso Especial de Alho",
        deixada_em: "2024-02-01",
      }),
    );
    expect(m).toContain("C-Esp-ALH");
    expect(m).toContain("C-Esp-ALH-N");
    expect(m).toContain("Curso Especial de Alho");
    expect(m).toContain("2024-02-01");
    expect(m).toContain("Escolha outra sigla.");
  });

  it("a `UNIQUE` da sigla é outra recusa, e diz outra coisa", () => {
    const m = traduzirRecusa(
      erro("23505", {
        message: 'duplicate key value violates unique constraint "cursos_codigo_key"',
      }),
      { sigla: "C-Ap-HN" },
    );
    expect(m).toBe("Já existe curso com a sigla C-Ap-HN.");
  });

  it("⚠️ sem a sigla no contexto, a `UNIQUE` degrada — não inventa nem vaza o nome da restrição", () => {
    const m = traduzirRecusa(
      erro("23505", {
        message: 'duplicate key value violates unique constraint "cursos_codigo_key"',
      }),
    );
    expect(m).toBe("Já existe curso com esta sigla.");
    expect(m).not.toContain("cursos_codigo_key");
  });

  it("`curso_sem_regime` diz uma coisa na criação e outra no cancelamento", () => {
    const e = comChave("23514", "curso_sem_regime", { curso: "C-Ap-FR" });
    expect(traduzirRecusa(e)).toBe(
      "Todo curso tem regime de horário. Informe o regime padrão junto com o curso.",
    );
    expect(traduzirRecusa(e, { cancelandoVigencia: true })).toBe(
      "Esta é a única vigência padrão do curso; registre a que a substitui.",
    );
  });

  it("as duas chaves do código de turma dão a mesma mensagem", () => {
    const esperada = "O código da turma é gerado pelo sistema e não muda.";
    expect(
      traduzirRecusa(comChave("23514", "codigo_de_turma_imutavel", { esperado: "C-Ap-FR 2026" })),
    ).toBe(esperada);
    expect(
      traduzirRecusa(
        comChave("23514", "codigo_de_turma_divergente", {
          esperado: "C-Ap-FR 2026",
          recebido: "qualquer coisa",
        }),
      ),
    ).toBe(esperada);
  });

  it("`turmas_unica_por_ano` nomeia a turma ocupante — com rótulo e sem rótulo", () => {
    const duplicada = erro("23505", {
      message: 'duplicate key value violates unique constraint "turmas_unica_por_ano"',
    });

    const comRotulo = traduzirRecusa(duplicada, {
      turmaOcupante: { codigo: "C-Ap-FR T2 2026", rotulo: "T2", sigla: "C-Ap-FR", ano: 2026 },
    });
    expect(comRotulo).toContain("C-Ap-FR T2 2026");
    expect(comRotulo).toContain("com o rótulo T2");
    expect(comRotulo).toContain("C-Ap-FR 2026");
    expect(comRotulo).toContain("Escolha outro rótulo.");

    const semRotulo = traduzirRecusa(duplicada, {
      turmaOcupante: { codigo: "C-Ap-FR 2026", rotulo: null, sigla: "C-Ap-FR", ano: 2026 },
    });
    expect(semRotulo).toContain("sem rótulo");
    expect(semRotulo).not.toContain("com o rótulo");
  });

  it("`turmas_rotulo_forma` ensina a forma do rótulo", () => {
    const m = traduzirRecusa(
      erro("23514", { message: 'new row violates check constraint "turmas_rotulo_forma"' }),
    );
    expect(m).toBe("O rótulo da turma é T seguido do número — T1, T2.");
  });

  it("`sala_fora_da_lista` diz onde se acrescenta sala", () => {
    const m = traduzirRecusa(
      comChave("23514", "sala_fora_da_lista", { valor: "Sala 99", lista: "salas" }),
    );
    expect(m).toContain("Sala 99");
    expect(m).toContain("Administração › Salas");
  });

  it("`config_listas_sala_com_natureza` pede a natureza da sala", () => {
    const m = traduzirRecusa(
      erro("23514", {
        message: 'new row violates check constraint "config_listas_sala_com_natureza"',
      }),
    );
    expect(m).toBe("Informe se a sala é física ou ambiente virtual.");
  });

  it("`cursos_classificacao_nao_geral` recusa a classificação", () => {
    const m = traduzirRecusa(
      erro("23514", {
        message: 'new row violates check constraint "cursos_classificacao_nao_geral"',
      }),
    );
    expect(m).toBe("Esta classificação não é aceita para curso.");
  });

  it("`NOT NULL` nomeia o campo pelo rótulo da tela, não pela coluna", () => {
    const m = traduzirRecusa(
      erro("23502", {
        message:
          'null value in column "nome_curso" of relation "cursos" violates not-null constraint',
      }),
    );
    expect(m).toBe("Nome do curso é obrigatório.");
    expect(m).not.toContain("nome_curso");
  });

  it("⚠️ coluna desconhecida ainda vira frase, e o contexto pode dar o rótulo", () => {
    const e = erro("23502", {
      message:
        'null value in column "campo_novo" of relation "cursos" violates not-null constraint',
    });
    expect(traduzirRecusa(e)).toBe("Campo novo é obrigatório.");
    expect(traduzirRecusa(e, { rotuloDaColuna: { campo_novo: "Propósito" } })).toBe(
      "Propósito é obrigatório.",
    );
  });

  it("`vigencia_imutavel` manda registrar vigência nova", () => {
    const m = traduzirRecusa(
      comChave("23514", "vigencia_imutavel", {
        vigencia: "REG-000012",
        colunas: ["ta_duracao_min"],
      }),
    );
    expect(m).toBe(
      "Vigência registrada não muda. Para mudar o regime a partir de uma data, registre nova vigência.",
    );
  });

  it("⚠️ `vigencia_cancelada_imutavel` existe no banco e NÃO está no contrato — tem mensagem própria", () => {
    const m = traduzirRecusa(
      comChave("23514", "vigencia_cancelada_imutavel", { vigencia: "REG-000012" }),
    );
    expect(m).toContain("cancelada");
    expect(m).not.toBe(
      "Vigência registrada não muda. Para mudar o regime a partir de uma data, registre nova vigência.",
    );
  });

  it("`vigencia_sem_sucessora` explica por que a anterior não fecha sozinha", () => {
    const m = traduzirRecusa(
      comChave("23514", "vigencia_sem_sucessora", {
        vigencia: "REG-000012",
        sem_regime_a_partir_de: "2027-01-01",
      }),
    );
    expect(m).toBe("Uma vigência só é encerrada quando a seguinte é registrada.");
  });

  it("`vigencia_com_lancamento` nomeia o primeiro lançamento e manda registrar vigência nova", () => {
    const m = traduzirRecusa(
      comChave("23514", "vigencia_com_lancamento", {
        vigencia: "REG-000012",
        tipo: "Aula Teórica",
        data: "2026-03-02",
        turma: "C-Ap-FR 2026",
        atividade: null,
        total: 14,
        ponta_ausente: null,
      }),
    );
    expect(m).toContain("14 lançamento(s)");
    expect(m).toContain("Aula Teórica");
    expect(m).toContain("2026-03-02");
    expect(m).toContain("C-Ap-FR 2026");
    expect(m).toContain("registre nova vigência");
  });

  it("⚠️ com atividade global, ela nomeia A ATIVIDADE e a turma pela qual alcança", () => {
    const m = traduzirRecusa(
      comChave("23514", "vigencia_com_lancamento", {
        vigencia: "REG-000012",
        tipo: "AEC",
        data: "2026-05-10",
        turma: "C-Ap-FR 2026",
        atividade: "AEC do Comando",
        total: 1,
        ponta_ausente: null,
      }),
    );
    expect(m).toContain("AEC do Comando");
    expect(m).toContain("C-Ap-FR 2026");
  });

  it("⚠️ com janela incompleta, ela diz QUAL PONTA falta — as duas", () => {
    const base = {
      vigencia: "REG-000012",
      tipo: "AEC",
      data: "2026-05-10",
      turma: "C-Ap-FR 2026",
      atividade: "AEC do Comando",
      total: 1,
    };
    expect(
      traduzirRecusa(
        comChave("23514", "vigencia_com_lancamento", { ...base, ponta_ausente: "termino" }),
      ),
    ).toContain("sem data de término");
    expect(
      traduzirRecusa(
        comChave("23514", "vigencia_com_lancamento", { ...base, ponta_ausente: "inicio" }),
      ),
    ).toContain("sem data de início");
  });

  it("`vigencia_reinterpretaria_lancamento` manda escolher data posterior", () => {
    const m = traduzirRecusa(
      comChave("23514", "vigencia_reinterpretaria_lancamento", {
        vigente_de: "2026-01-01",
        tipo: "Aula Teórica",
        ultimo_lancamento: "2026-06-30",
        turma: "C-Ap-FR 2026",
        atividade: null,
        total: 31,
        ponta_ausente: null,
      }),
    );
    expect(m).toContain("2026-01-01");
    expect(m).toContain("31 lançamento(s)");
    expect(m).toContain("2026-06-30");
    expect(m).toContain("Escolha uma data posterior.");
  });

  it("`40P01` — impasse — pede para tentar de novo, e não culpa a pessoa", () => {
    const m = traduzirRecusa(erro("40P01"));
    expect(m).toBe("Outra gravação no mesmo curso aconteceu ao mesmo tempo. Tente de novo.");
  });

  it("`habilitacao_em_curso_inativo` nomeia as disciplinas", () => {
    const m = traduzirRecusa(
      comChave("23514", "habilitacao_em_curso_inativo", {
        disciplinas: ["Navegação Costeira", "Cartografia"],
      }),
    );
    expect(m).toContain("Navegação Costeira");
    expect(m).toContain("Cartografia");
    expect(m).toContain("curso inativo");
  });
});

describe("`FR-044` · a mesma negativa da RLS tem duas causas, e a ação já sabe qual", () => {
  const rls = erro("42501", { message: "new row violates row-level security policy" });

  it("curso inativo: nomeia o curso e o que ele não recebe", () => {
    const m = traduzirRecusa(rls, {
      cursoInativo: true,
      sigla: "C-Ap-FR",
      oQueNaoRecebe: "turma nova",
    });
    expect(m).toBe("O curso C-Ap-FR está inativo e não recebe turma nova.");
  });

  it("fora do escopo: fala do perfil, e NÃO revela nada do curso", () => {
    const m = traduzirRecusa(rls, { cursoInativo: false, sigla: "C-Ap-FR" });
    expect(m).toBe("O seu perfil não pode fazer esta alteração neste curso.");
  });

  it("⚠️ curso ilegível cai na segunda — ausência de informação não vira afirmação", () => {
    expect(traduzirRecusa(rls)).toBe("O seu perfil não pode fazer esta alteração neste curso.");
  });

  it("⚠️ `UPDATE` que não achou linha é RECUSA, e chega pelas mesmas duas frases", () => {
    // O motor responde SUCESSO com zero linhas quando o `USING` da policy exclui a linha: só o
    // `WITH CHECK` gera 42501. Sem isto, a tela diria "salvo" sem ter salvado nada.
    expect(
      recusaPorAlcance({ cursoInativo: true, sigla: "CAHO", oQueNaoRecebe: "vigência nova" }),
    ).toBe("O curso CAHO está inativo e não recebe vigência nova.");
    expect(recusaPorAlcance()).toBe("O seu perfil não pode fazer esta alteração neste curso.");
  });

  it("a chave `situacao_sem_permissao` continua ganhando do 42501 genérico", () => {
    const m = traduzirRecusa(comChave("42501", "situacao_sem_permissao", { curso: "C-Ap-FR" }), {
      cursoInativo: true,
      sigla: "C-Ap-FR",
    });
    expect(m).toBe("O seu perfil não desativa nem reativa curso.");
  });
});

describe("`RN-DEG-01` · o desconhecido degrada, e o texto do motor nunca sai", () => {
  const TODAS: readonly { nome: string; erro: ErroDoBanco; contexto?: ContextoDaRecusa }[] = [
    { nome: "turma pendente", erro: comChave("23514", "curso_com_turma_pendente", { turmas: [] }) },
    { nome: "sigla de outro", erro: comChave("23505", "sigla_de_outro_curso", {}) },
    { nome: "sem regime", erro: comChave("23514", "curso_sem_regime", {}) },
    { nome: "sala fora", erro: comChave("23514", "sala_fora_da_lista", {}) },
    { nome: "vigência com lançamento", erro: comChave("23514", "vigencia_com_lancamento", {}) },
    { nome: "not null", erro: erro("23502") },
    { nome: "impasse", erro: erro("40P01") },
    { nome: "código desconhecido", erro: erro("XX000") },
    { nome: "sem código nenhum", erro: { message: CRU } },
    { nome: "check sem nome conhecido", erro: erro("23514") },
    { nome: "unique sem nome conhecido", erro: erro("23505") },
    { nome: "rls", erro: erro("42501") },
  ];

  it("⚠️ nenhuma tradução repassa o `message` do motor — nem em pedaço", () => {
    for (const { nome, erro: e, contexto } of TODAS) {
      const m = traduzirRecusa(e, contexto);
      expect(m, `${nome} vazou o texto do motor`).not.toContain(CRU);
      expect(m, `${nome} vazou "pg_internal"`).not.toContain("pg_internal");
    }
  });

  it("⚠️ nenhuma devolve string vazia — e todas terminam em ponto", () => {
    for (const { nome, erro: e, contexto } of TODAS) {
      const m = traduzirRecusa(e, contexto);
      expect(m.length, `${nome} devolveu mensagem vazia`).toBeGreaterThan(10);
      expect(m.endsWith("."), `${nome} não terminou a frase: ${m}`).toBe(true);
    }
  });

  it("⚠️ `DETAIL` que não é JSON degrada para a frase genérica, e não estoura", () => {
    // Medido em 17/09/2026 numa violação de `EXCLUDE`: o `DETAIL` chega como frase corrida.
    const m = traduzirRecusa(
      erro("23514", { hint: "vigencia_com_lancamento", details: "Key (curso_id)=(x) conflicts." }),
    );
    expect(m).toContain("lançamento");
    expect(m).not.toContain("conflicts");
  });

  it("⚠️ chave estável DESCONHECIDA não é repassada como se fosse mensagem", () => {
    // O `HINT` é identificador, não frase. Uma chave nova deve cair no genérico do código — não
    // aparecer na tela como "vigencia_qualquer_coisa".
    const m = traduzirRecusa(erro("23514", { hint: "chave_que_ainda_nao_existe" }));
    expect(m).not.toContain("chave_que_ainda_nao_existe");
    expect(m).not.toContain("_");
  });
});

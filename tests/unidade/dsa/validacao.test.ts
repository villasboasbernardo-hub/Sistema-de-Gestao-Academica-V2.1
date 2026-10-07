/**
 * `lib/validacao/dsa.ts` — o esquema do bloco, os quatro tipos e as regras cruzadas
 * (`RF-DSA-04`, `RF-AVAL-04` a `06`, `RF-EXTRA-01`, `Q-1`, `Q-8` · spec 013, PR 2).
 *
 * ⚠️ **O QUE ESTE ARQUIVO PROVA É QUE O ESQUEMA DIZ O MESMO QUE OS `CHECK` DO BANCO.** Cada caso
 * negativo aqui tem um irmão em `supabase/tests/116_dsa.sql`: se os dois discordarem, a pessoa vê
 * `23514` — *"violação de restrição"* — em vez da frase em português, e o requisito de mensagem
 * (`RNF-USA-03`) deixa de valer sem que nada acuse.
 *
 * ⚠️ **E A MENSAGEM É ASSERIDA, não só o veredito.** Um esquema que recusasse tudo com *"dados
 * inválidos"* passaria em qualquer teste que só perguntasse `success === false`.
 */
import { describe, expect, it } from "vitest";

import {
  esquemaDaEdicao,
  esquemaDaExclusao,
  esquemaDoBloco,
  esquemaDoEstudoIndividualDaSemana,
  esquemaDoMovimento,
} from "@/lib/validacao/dsa";

const ID = "11111111-1111-4111-8111-111111111111";
const OUTRO = "22222222-2222-4222-8222-222222222222";

const aulaBase = {
  tipo: "aula" as const,
  turmaId: ID,
  cursoId: ID,
  data: "2026-04-06",
  taInicial: 1,
  tempos: 2,
  local: "Sala 03",
  unidadeEnsinoId: ID,
  disciplinaId: null,
  disciplinaSemUe: false,
  conteudo: "Navegação costeira",
  tecnica: "EO",
  instrutorId: ID,
};

/** A primeira mensagem, que é a que a tela mostra. */
function recusa(entrada: unknown): string | null {
  const r = esquemaDoBloco.safeParse(entrada);
  return r.success ? null : (r.error.issues[0]?.message ?? "");
}

/** A primeira mensagem do esquema do movimento. */
function recusaDoMovimento(entrada: unknown): string | null {
  const r = esquemaDoMovimento.safeParse(entrada);
  return r.success ? null : (r.error.issues[0]?.message ?? "");
}

describe("`RF-DSA-04` · a aula", () => {
  it("com UE é aceita", () => {
    expect(esquemaDoBloco.safeParse(aulaBase).success).toBe(true);
  });

  it("UE **e** disciplina juntas é recusado — uma fonte só", () => {
    expect(recusa({ ...aulaBase, disciplinaId: OUTRO })).toContain("não as duas");
  });

  it("sem UE e sem disciplina é recusado", () => {
    expect(recusa({ ...aulaBase, unidadeEnsinoId: null })).toContain("Escolha a unidade de ensino");
  });

  /*
   * ⚠️ **O CASO QUE DISCRIMINA A DELIMITAÇÃO DA `Q-1`**, e o irmão dele no `116` também discrimina:
   * sem a conferência de `disciplinaSemUe`, a tela aceitaria lançar sem UE em QUALQUER disciplina e
   * a recusa viria do banco, como `23514`.
   */
  it("sem UE em disciplina que TEM unidades é recusado, mesmo com tópico", () => {
    expect(
      recusa({
        ...aulaBase,
        unidadeEnsinoId: null,
        disciplinaId: OUTRO,
        disciplinaSemUe: false,
        conteudo: "Tem tópico",
      }),
    ).toContain("tem unidades de ensino");
  });

  it("`Q-1` · sem UE em disciplina ISENTA, com tópico, é aceita", () => {
    expect(
      esquemaDoBloco.safeParse({
        ...aulaBase,
        unidadeEnsinoId: null,
        disciplinaId: OUTRO,
        disciplinaSemUe: true,
        conteudo: "Competência X",
      }).success,
    ).toBe(true);
  });

  it("`Q-1` · sem UE e SEM tópico é recusado — o tópico substitui a UE", () => {
    expect(
      recusa({
        ...aulaBase,
        unidadeEnsinoId: null,
        disciplinaId: OUTRO,
        disciplinaSemUe: true,
        conteudo: "",
      }),
    ).toContain("tópico");
  });

  it("o TA vai de 1 a 12, e a faixa é a do `CHECK` do banco", () => {
    expect(recusa({ ...aulaBase, taInicial: 0 })).toContain("começa em 1");
    expect(recusa({ ...aulaBase, taInicial: 13 })).toContain("até 12");
    expect(recusa({ ...aulaBase, tempos: 0 })).toContain("ao menos um tempo");
  });

  it("a data só entra em `AAAA-MM-DD` — o formato do banco e da URL não muda", () => {
    expect(recusa({ ...aulaBase, data: "06/04/2026" })).toContain("AAAA-MM-DD");
  });

  it("texto vazio vira AUSÊNCIA, não string vazia — a convenção do banco", () => {
    const r = esquemaDoBloco.safeParse({ ...aulaBase, local: "   " });
    expect(r.success && r.data.tipo === "aula" && r.data.local).toBeNull();
  });
});

describe("`RF-AVAL-04` e `RF-AVAL-06` · a avaliação e o fiscal", () => {
  const avaliacaoBase = {
    tipo: "avaliacao" as const,
    turmaId: ID,
    cursoId: ID,
    data: "2026-04-07",
    taInicial: 1,
    tempos: 2,
    local: null,
    disciplinaId: ID,
    tipoAvaliacao: "Prova Escrita",
    instrutorId: ID,
    conteudo: null,
    tecnica: null,
    fiscalId: null,
    nomeFiscalExterno: null,
  };

  it("com fiscal interno é aceita", () => {
    expect(esquemaDoBloco.safeParse({ ...avaliacaoBase, fiscalId: OUTRO }).success).toBe(true);
  });

  it("com fiscal EXTERNO é aceita — ele pode ser de fora do cadastro", () => {
    expect(
      esquemaDoBloco.safeParse({ ...avaliacaoBase, nomeFiscalExterno: "CC SOUZA (HNMD)" }).success,
    ).toBe(true);
  });

  it("os dois fiscais juntos é recusado", () => {
    expect(recusa({ ...avaliacaoBase, fiscalId: OUTRO, nomeFiscalExterno: "CC SOUZA" })).toContain(
      "não os dois",
    );
  });

  it("sem tipo de avaliação é recusado", () => {
    expect(recusa({ ...avaliacaoBase, tipoAvaliacao: "  " })).toContain("tipo da avaliação");
  });
});

describe("`RN-AVAL-02` · a vista é a segunda data do MESMO fato", () => {
  it("ela chega com o `avaliacaoId`, e não com disciplina nem instrutor", () => {
    const r = esquemaDoBloco.safeParse({
      tipo: "vista_prova",
      avaliacaoId: ID,
      turmaId: ID,
      data: "2026-04-09",
      taInicial: 3,
      tempos: 1,
      local: null,
    });
    expect(r.success).toBe(true);
  });

  it("sem o `avaliacaoId` é recusada — não há fato novo a criar", () => {
    expect(
      recusa({
        tipo: "vista_prova",
        turmaId: ID,
        data: "2026-04-09",
        taInicial: 3,
        tempos: 1,
        local: null,
      }),
    ).not.toBeNull();
  });
});

describe("`RF-EXTRA-01` e `Q-8` · a atividade não letiva", () => {
  const atividadeBase = {
    tipo: "atividade" as const,
    turmaId: ID,
    data: "2026-04-06",
    taInicial: 1,
    tempos: 2,
    local: null,
    categoria: "AEC" as const,
    subtipo: "Palestra",
    descricao: "Palestra de segurança",
    instrutorId: null,
    responsavelExterno: null,
  };

  it("com responsável EXTERNO é aceita — a planilha traz entidade e palestrante de fora", () => {
    expect(esquemaDoBloco.safeParse({ ...atividadeBase, responsavelExterno: "DOEP" }).success).toBe(
      true,
    );
  });

  it("instrutor do cadastro E responsável externo juntos é recusado", () => {
    expect(recusa({ ...atividadeBase, instrutorId: OUTRO, responsavelExterno: "DOEP" })).toContain(
      "não os dois",
    );
  });

  it("de escopo GLOBAL é aceita — `turmaId` nulo é escopo, não falta de dado", () => {
    expect(esquemaDoBloco.safeParse({ ...atividadeBase, turmaId: null }).success).toBe(true);
  });

  /* ⚠️ `V-5`: é o mesmo `CHECK` que o PR B pôs no banco, repetido para a recusa chegar como frase. */
  it("`V-5` · Estudo Individual GLOBAL é recusado — ele é sempre de turma", () => {
    expect(recusa({ ...atividadeBase, categoria: "Estudo_Individual", turmaId: null })).toContain(
      "sempre de uma turma",
    );
  });

  it("Estudo Individual de TURMA é aceito", () => {
    expect(
      esquemaDoBloco.safeParse({ ...atividadeBase, categoria: "Estudo_Individual" }).success,
    ).toBe(true);
  });

  it("categoria fora do ENUM é recusada — nenhuma sigla de duas letras entra", () => {
    expect(recusa({ ...atividadeBase, categoria: "AD" })).not.toBeNull();
    expect(recusa({ ...atividadeBase, subtipo: "" })).toContain("subtipo");
  });
});

describe("`Q-7` · o Estudo Individual da semana", () => {
  it("pede turma, ano e semana, nas faixas normativas", () => {
    expect(
      esquemaDoEstudoIndividualDaSemana.safeParse({ turmaId: ID, ano: 2026, semana: 15 }).success,
    ).toBe(true);
    expect(
      esquemaDoEstudoIndividualDaSemana.safeParse({ turmaId: ID, ano: 2026, semana: 54 }).success,
    ).toBe(false);
    expect(
      esquemaDoEstudoIndividualDaSemana.safeParse({ turmaId: ID, ano: 2019, semana: 1 }).success,
    ).toBe(false);
  });
});

describe("⚠️ a união é DISCRIMINADA, e é isso que impede combinação impossível", () => {
  it("tipo desconhecido é recusado", () => {
    expect(recusa({ tipo: "reposicao", turmaId: ID })).not.toBeNull();
  });

  /*
   * ⚠️ **ESTE É O CASO QUE JUSTIFICA A UNIÃO.** Com um objeto de campos opcionais, uma aula com
   * fiscal e uma avaliação sem disciplina seriam **válidas** — e o banco recusaria depois, com
   * `23514`. Aqui o campo que não pertence ao tipo é simplesmente ignorado pelo esquema, e o que
   * **falta** é cobrado.
   */
  it("avaliação sem disciplina é recusada, mesmo mandando os campos de aula", () => {
    expect(
      recusa({
        tipo: "avaliacao",
        turmaId: ID,
        cursoId: ID,
        data: "2026-04-07",
        taInicial: 1,
        tempos: 1,
        local: null,
        unidadeEnsinoId: ID,
        tipoAvaliacao: "Prova Escrita",
        instrutorId: ID,
        conteudo: null,
        tecnica: null,
        fiscalId: null,
        nomeFiscalExterno: null,
      }),
    ).not.toBeNull();
  });
});

describe("`RF-DSA-07` · mover, editar e excluir — os esquemas do PR 4", () => {
  const MOVIMENTO = {
    fatoId: ID,
    origem: "aula" as const,
    data: "2026-04-09",
    taInicial: 5,
  };

  it("o movimento pede o fato, a ORIGEM, o dia e o tempo", () => {
    const r = esquemaDoMovimento.safeParse(MOVIMENTO);
    expect(r.success).toBe(true);
    /* ⚠️ `tempos` AUSENTE significa «não mexa no tamanho» — mover é trocar de lugar. */
    expect(r.success && r.data.tempos).toBeUndefined();
    expect(r.success && r.data.unidadeEnsinoId).toBeNull();
  });

  /*
   * ⚠️ **A ORIGEM É OBRIGATÓRIA PORQUE O IDENTIFICADOR NÃO DIZ DE QUE TABELA VEIO.** São três
   * tabelas, e a vista de prova é a MESMA linha da avaliação em outras quatro colunas
   * (`RN-AVAL-02`) — sem a origem, a ação teria de procurar nas três por tentativa.
   */
  it("origem desconhecida é recusada, com a frase e não com um `42703` depois", () => {
    expect(recusaDoMovimento({ ...MOVIMENTO, origem: "reposicao" })).toContain("Origem");
  });

  it("as quatro origens reais são aceitas", () => {
    for (const origem of ["aula", "avaliacao", "vista_prova", "atividade_nao_letiva"]) {
      expect(esquemaDoMovimento.safeParse({ ...MOVIMENTO, origem }).success, origem).toBe(true);
    }
  });

  it("o destino respeita a faixa de TA do banco, e a data o formato ISO", () => {
    expect(recusaDoMovimento({ ...MOVIMENTO, taInicial: 13 })).toContain("até 12");
    expect(recusaDoMovimento({ ...MOVIMENTO, data: "09/04/2026" })).toContain("AAAA-MM-DD");
  });

  it("`Q-1` · a unidade de ensino pode vir no mesmo ato — é a catraca da linha histórica", () => {
    const r = esquemaDoMovimento.safeParse({ ...MOVIMENTO, unidadeEnsinoId: OUTRO });
    expect(r.success && r.data.unidadeEnsinoId).toBe(OUTRO);
  });

  /*
   * ⚠️ **ESTE É O CASO QUE A SPEC 011 PAGOU CARO:** `undefined` é *"não mandou"* e `null` é
   * *"apague"*. Um esquema que os confundisse apagaria o que a tela não enviou — lá, um campo fora
   * da tela mandando `null` apagava o vínculo de instrutor **a cada gravação de perfil**, e nenhuma
   * tela mostrava isso na hora.
   */
  it("na edição, campo AUSENTE é diferente de campo NULO", () => {
    const soLocal = esquemaDaEdicao.safeParse({
      fatoId: ID,
      origem: "aula",
      local: "Sala 03",
    });
    expect(soLocal.success).toBe(true);
    expect(soLocal.success && "instrutorId" in soLocal.data).toBe(false);

    const apagaLocal = esquemaDaEdicao.safeParse({ fatoId: ID, origem: "aula", local: "   " });
    /* Texto em branco vira AUSÊNCIA de valor — a convenção do banco, e aqui ela é `null`. */
    expect(apagaLocal.success && apagaLocal.data.local).toBeNull();
  });

  it("a edição aceita só o fato e a origem — e a ação é quem recusa «nada mudou»", () => {
    expect(esquemaDaEdicao.safeParse({ fatoId: ID, origem: "aula" }).success).toBe(true);
  });

  it("a exclusão pede o fato e a origem, e NADA mais", () => {
    expect(esquemaDaExclusao.safeParse({ fatoId: ID, origem: "avaliacao" }).success).toBe(true);
    expect(esquemaDaExclusao.safeParse({ origem: "avaliacao" }).success).toBe(false);
  });
});

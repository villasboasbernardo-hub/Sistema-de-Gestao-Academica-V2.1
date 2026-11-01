/**
 * RD-1 (Bloco 11, spec 026) — na aula, a lista de quem ministra traz só os habilitados na disciplina.
 */
import { describe, expect, it } from "vitest";

import {
  fraseDaListaDaAula,
  fraseDaListaDeInstrutoresVazia,
  habilitadosNaDisciplina,
  idsDaListaDaAula,
  instrutoresDaAula,
  parPendenteDaAula,
  vazioDaListaDeInstrutores,
  type MotivoDaListaVazia,
} from "@/lib/dominio/dsa/instrutores-da-aula";

const INSTRUTORES = [{ id: "ct" }, { id: "sem-vinculo" }, { id: "so-de-outra" }];
const HABILITACOES = [
  { instrutorId: "ct", disciplinaId: "nav" },
  { instrutorId: "so-de-outra", disciplinaId: "met" },
];

describe("instrutoresDaAula — só os habilitados na disciplina da aula", () => {
  it("o sem vínculo não aparece; o de outra disciplina também não", () => {
    expect(instrutoresDaAula(INSTRUTORES, HABILITACOES, "nav").map((i) => i.id)).toEqual(["ct"]);
  });

  it("a ordem é a recebida — a antiguidade é do seletor", () => {
    const dois = [{ id: "b" }, { id: "a" }];
    const hab = [
      { instrutorId: "a", disciplinaId: "nav" },
      { instrutorId: "b", disciplinaId: "nav" },
    ];
    expect(instrutoresDaAula(dois, hab, "nav").map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("sem disciplina escolhida, lista vazia com a frase de escolher", () => {
    expect(instrutoresDaAula(INSTRUTORES, HABILITACOES, null)).toEqual([]);
    expect(fraseDaListaDaAula(null, [])).toBe("Escolha a disciplina.");
  });

  it("disciplina sem habilitado: lista vazia com a frase de habilitar", () => {
    const lista = instrutoresDaAula(INSTRUTORES, HABILITACOES, "sem-ninguem");
    expect(lista).toEqual([]);
    expect(fraseDaListaDaAula("sem-ninguem", lista)).toMatch(/Nenhum instrutor habilitado/);
  });

  it("com habilitado, sem frase", () => {
    expect(fraseDaListaDaAula("nav", [{ id: "ct" }])).toBeNull();
  });

  it("habilitadosNaDisciplina devolve o conjunto", () => {
    expect([...habilitadosNaDisciplina(HABILITACOES, "met")]).toEqual(["so-de-outra"]);
  });

  it("D-5: o habilitado INATIVO não entra no que a sugestão pode pôr (o vínculo dele segue ativo)", () => {
    /* `INSTRUTORES` são os ativos; o inativo tem habilitação em "nav" e não está na lista. */
    const comInativo = [...HABILITACOES, { instrutorId: "inativo", disciplinaId: "nav" }];
    expect([...idsDaListaDaAula(INSTRUTORES, comInativo, "nav")]).toEqual(["ct"]);
  });
});

describe("parPendenteDaAula — o par que a RD-1 confere numa edição pelo id do SALVO", () => {
  const salvo = { instrutorId: "A", disciplinaId: null, unidadeEnsinoId: "ue-x" };

  it("⚠️ o caso que discrimina: com rascunho de edição, vale o par da SOMBRA (o instrutor trocado antes)", () => {
    const sombra = {
      instrutorId: "B",
      disciplinaId: null,
      unidadeEnsinoId: "ue-x",
      rascunhoExclui: false,
    };
    expect(parPendenteDaAula(salvo, sombra)).toEqual({
      instrutorId: "B",
      disciplinaId: null,
      unidadeEnsinoId: "ue-x",
    });
  });

  it("sem sombra, ou com a sombra de exclusão, vale o próprio salvo", () => {
    expect(parPendenteDaAula(salvo, null)).toEqual(salvo);
    const exclusao = {
      instrutorId: "B",
      disciplinaId: null,
      unidadeEnsinoId: "ue-y",
      rascunhoExclui: true,
    };
    expect(parPendenteDaAula(salvo, exclusao)).toEqual(salvo);
  });
});

/*
 * FR-006 (spec 029, Bloco 14, item 6 — PEND-026-2): o «não há» da lista de instrutores tem UM dono de frases, por
 * motivo. A frase da D-32 (a aula) passa a ser um dos motivos; o TA fora do DSA e o rateio por UE ganham a sua — até
 * aqui eles mostravam «Nada cadastrado ainda», que é o motivo errado: o vazio vem de um FILTRO, não da falta de cadastro.
 * O «você não vê» (perfil sem `instrutores.ler`) não mora aqui: a frase é do `SeletorInstrutor`.
 */
const SEM_HABILITADO_DE_HOJE =
  "Nenhum instrutor habilitado nesta disciplina. A habilitação é feita na ficha do instrutor.";

describe("fraseDaListaDeInstrutoresVazia — uma frase por motivo do «não há» (FR-006.1)", () => {
  it("sem disciplina escolhida: «Escolha a disciplina.»", () => {
    expect(fraseDaListaDeInstrutoresVazia("sem-disciplina")).toBe("Escolha a disciplina.");
  });

  it("disciplina sem habilitado: o texto de hoje da D-32, letra por letra", () => {
    expect(fraseDaListaDeInstrutoresVazia("sem-habilitado")).toBe(SEM_HABILITADO_DE_HOJE);
  });

  it("ninguém atribuído na linha da turma: acrescentar instrutor antes de dividir pelas UEs", () => {
    const frase = fraseDaListaDeInstrutoresVazia("sem-atribuido");
    expect(frase, "a frase não diz o que fazer: acrescentar instrutor à linha da turma").toMatch(
      /acrescent/i,
    );
    expect(frase, "a frase não diz que é para dividir pelas unidades de ensino").toMatch(
      /dividir/i,
    );
    expect(frase, "o vazio vem da ATRIBUIÇÃO, não da habilitação").not.toContain(
      "Nenhum instrutor habilitado",
    );
  });

  it("três motivos, três frases — e nenhuma diz que não há cadastro", () => {
    const frases = (["sem-disciplina", "sem-habilitado", "sem-atribuido"] as const).map((m) =>
      fraseDaListaDeInstrutoresVazia(m),
    );
    expect(new Set(frases).size).toBe(3);
    for (const f of frases) {
      expect(f).not.toMatch(/Nada cadastrado/i);
      expect(f.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("fraseDaListaDaAula — continua devolvendo EXATAMENTE o texto de hoje (não regressão da D-32)", () => {
  it("o texto, letra por letra, nos três estados", () => {
    expect(fraseDaListaDaAula(null, [])).toBe("Escolha a disciplina.");
    expect(fraseDaListaDaAula("", [])).toBe("Escolha a disciplina.");
    expect(fraseDaListaDaAula("sem-ninguem", [])).toBe(SEM_HABILITADO_DE_HOJE);
    expect(fraseDaListaDaAula("nav", [{ id: "ct" }])).toBeNull();
  });

  it("e delega ao dono único: a frase da aula É a do motivo", () => {
    expect(fraseDaListaDaAula(null, [])).toBe(fraseDaListaDeInstrutoresVazia("sem-disciplina"));
    expect(fraseDaListaDaAula("sem-ninguem", [])).toBe(
      fraseDaListaDeInstrutoresVazia("sem-habilitado"),
    );
  });
});

/*
 * FR-006.3 (spec 029): a PRECEDÊNCIA do «você não vê» sobre o «não há» mora em `vazioDaListaDeInstrutores`. Sem
 * `instrutores.ler` a RLS devolve a lista vazia — tudo ou nada por perfil —, e nenhuma frase de filtro serve: escolher
 * a disciplina, habilitar ou atribuir não encheria a lista. ⚠️ Até a revisão adversarial do Bloco 14 nenhum teste a
 * chamava: devolvendo sempre o «não há», a suíte ficava verde (a de `seletor-instrutor-vazio.test.ts` passa o `vazio`
 * montado à mão, e não exercita a precedência).
 */
const TODOS_OS_MOTIVOS = [
  "sem-disciplina",
  "sem-habilitado",
  "sem-atribuido",
  "sem-cadastro",
  "sem-leitura",
  "sem-outro-habilitado",
] as const satisfies readonly MotivoDaListaVazia[];

describe("vazioDaListaDeInstrutores — sem `instrutores.ler`, «você não vê», seja qual for o motivo (FR-006.3)", () => {
  it.each(TODOS_OS_MOTIVOS)("sem permissão + %s: só o motivo, sem frase de filtro", (motivo) => {
    const vazio = vazioDaListaDeInstrutores(false, motivo);
    expect(vazio, "sem permissão, a frase do filtro venceu o «você não vê»").toEqual({
      motivo: "sem-permissao",
    });
    expect("detalhe" in vazio, "o «você não vê» carrega frase de quem chama").toBe(false);
  });

  it.each(TODOS_OS_MOTIVOS)(
    "com permissão + %s: o «não há», com a frase do dono único",
    (motivo) => {
      expect(vazioDaListaDeInstrutores(true, motivo)).toEqual({
        motivo: "sem-dado",
        detalhe: fraseDaListaDeInstrutoresVazia(motivo),
      });
    },
  );

  it.each(TODOS_OS_MOTIVOS)(
    "DoD 8 · o caso que discrimina: %s com e sem permissão dá vazios DIFERENTES",
    (motivo) => {
      expect(
        vazioDaListaDeInstrutores(true, motivo),
        "a permissão não muda o vazio: o «você não vê» não chega à tela",
      ).not.toEqual(vazioDaListaDeInstrutores(false, motivo));
    },
  );
});

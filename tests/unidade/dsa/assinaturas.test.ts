/**
 * `FR-036` · `FR-036.1` · `Q-14` — quem assina o DSA, pela vigência **na data da semana**.
 *
 * ⚠️ **O CASO QUE DISCRIMINA É O DE MARÇO, e ele SÓ EXISTE PORQUE O TESTE SEMEIA A SEGUNDA
 * VIGÊNCIA** (DoD 8). Medido no banco **remoto** em **05/10/2026** (`estado-atual.md` §10.3):
 * `responsaveis_curso` tem **duas** linhas, **as duas GERAL** (`curso_id` nulo), e **uma só vigência
 * por papel** — então **qualquer semana resolve para as mesmas duas pessoas**, e o critério **3** do
 * Épico 6 (*"reimprimir hoje um DSA de março traz quem assinava em março"*) **não é demonstrável com
 * o dado de hoje**. Com uma vigência só, uma implementação que ignorasse a data **passaria em todos
 * os outros casos deste arquivo**.
 *
 * ⚠️ **OS VALORES DE `AS_DUAS_DE_HOJE` SÃO OS MEDIDOS, não inventados:** `elaborador` em
 * **`dinamico_usuario_logado`**, `encarregado_divisao` em **`fixo`**, as duas com `curso_id`
 * **nulo**. O nominal da linha fixa **não** foi medido (é PII e é pendência operacional declarada no
 * `comment on column responsaveis_curso.funcao_descricao`, tarefa T017 da spec 001), então ele é
 * **sintético e marcado como tal** — o que o caso medido prova é a **topologia**: duas linhas, dois
 * papéis, dois modos, GERAL, resolvendo para **qualquer** curso e **qualquer** data.
 */

import { describe, expect, it } from "vitest";

import {
  assinaturasDoDsa,
  PAPEL_DA_DIREITA,
  PAPEL_DA_ESQUERDA,
  resolverAssinatura,
  type ResponsavelDoCurso,
} from "@/lib/dominio/dsa/assinaturas";

/** Os dois cursos usados nos casos — `id` é `uuid` no banco; aqui basta ser texto distinto. */
const CURSO_CAHO = "11111111-1111-1111-1111-111111111111";
const CURSO_OUTRO = "22222222-2222-2222-2222-222222222222";

/** Uma semana de **março** e uma de **setembro** — o par que separa as duas vigências. */
const SEMANA_DE_MARCO = "2026-03-09";
const SEMANA_DE_SETEMBRO = "2026-09-14";

function linha(partes: Partial<ResponsavelDoCurso>): ResponsavelDoCurso {
  return {
    papel: partes.papel ?? "elaborador",
    preenchimento: partes.preenchimento ?? "fixo",
    cursoId: partes.cursoId ?? null,
    vigenteDe: partes.vigenteDe ?? "2026-01-01",
    vigenteAte: partes.vigenteAte ?? null,
    exibirNoDsa: partes.exibirNoDsa ?? true,
    ordem: partes.ordem ?? 1,
    nomeCompleto: partes.nomeCompleto ?? null,
    postoGraduacao: partes.postoGraduacao ?? null,
    funcaoDescricao: partes.funcaoDescricao ?? "Função não informada",
  };
}

/**
 * ⚠️ **AS DUAS LINHAS QUE EXISTEM NO REMOTO HOJE** — topologia medida em 05/10/2026, nominal
 * sintético (ver o cabeçalho). É o retrato contra o qual o critério **2** se lê.
 */
const AS_DUAS_DE_HOJE: readonly ResponsavelDoCurso[] = [
  linha({
    papel: "elaborador",
    preenchimento: "dinamico_usuario_logado",
    cursoId: null,
    vigenteDe: "2026-09-08",
    ordem: 1,
    funcaoDescricao: "Encarregado da Elaboração do DSA",
  }),
  linha({
    papel: "encarregado_divisao",
    preenchimento: "fixo",
    cursoId: null,
    vigenteDe: "2026-09-08",
    ordem: 2,
    postoGraduacao: "CF",
    nomeCompleto: "NOMINAL SINTÉTICO — não medido",
    funcaoDescricao: "Encarregado da Divisão de Administração Acadêmica",
  }),
];

describe("critério 3 do Épico 6 · a vigência é resolvida NA DATA DA SEMANA", () => {
  /*
   * ⚠️ **ESTE É O CASO QUE DISCRIMINA.** Com a data ignorada — *"pega a linha mais recente"* ou
   *    *"pega a primeira"* —, um dos dois sentidos reprova, e **nenhum outro caso deste arquivo
   *    muda de veredito**. Ele é o único que separa *"resolve por papel"* de *"resolve por papel NA
   *    DATA"*.
   */
  const DUAS_VIGENCIAS: readonly ResponsavelDoCurso[] = [
    linha({
      papel: "encarregado_divisao",
      vigenteDe: "2026-01-01",
      vigenteAte: "2026-06-30",
      postoGraduacao: "CC",
      nomeCompleto: "QUEM ASSINAVA EM MARÇO",
      funcaoDescricao: "Encarregado da Divisão de Administração Acadêmica",
    }),
    linha({
      papel: "encarregado_divisao",
      vigenteDe: "2026-07-01",
      vigenteAte: null,
      postoGraduacao: "CF",
      nomeCompleto: "QUEM ASSINA AGORA",
      funcaoDescricao: "Encarregado da Divisão de Administração Acadêmica",
    }),
  ];

  it("um DSA de MARÇO traz quem assinava em março", () => {
    const assinatura = resolverAssinatura(DUAS_VIGENCIAS, {
      papel: "encarregado_divisao",
      cursoId: CURSO_CAHO,
      data: SEMANA_DE_MARCO,
    });

    expect(assinatura?.nomeCompleto).toBe("QUEM ASSINAVA EM MARÇO");
    expect(assinatura?.postoGraduacao).toBe("CC");
  });

  it("o mesmo DSA, na semana de SETEMBRO, traz quem assina agora — o outro sentido", () => {
    const assinatura = resolverAssinatura(DUAS_VIGENCIAS, {
      papel: "encarregado_divisao",
      cursoId: CURSO_CAHO,
      data: SEMANA_DE_SETEMBRO,
    });

    expect(assinatura?.nomeCompleto).toBe("QUEM ASSINA AGORA");
    expect(assinatura?.postoGraduacao).toBe("CF");
  });

  /*
   * ⚠️ **A FRONTEIRA VALE UM DIA, E É O DIA DA RENDIÇÃO.** `vigente_ate` é **inclusivo** aqui
   *    (seguimos o SQL de referência, `vigente_ate + 1`; a divergência com o documento 05 §7.5 está
   *    reportada no `CLAUDE.md`). 30/06 ainda é de quem saiu; 01/07 já é de quem entrou.
   */
  it("o ÚLTIMO dia de `vigenteAte` ainda é de quem sai, e o seguinte já é de quem entra", () => {
    const ultimoDia = resolverAssinatura(DUAS_VIGENCIAS, {
      papel: "encarregado_divisao",
      cursoId: CURSO_CAHO,
      data: "2026-06-30",
    });
    const diaSeguinte = resolverAssinatura(DUAS_VIGENCIAS, {
      papel: "encarregado_divisao",
      cursoId: CURSO_CAHO,
      data: "2026-07-01",
    });

    expect(ultimoDia?.nomeCompleto).toBe("QUEM ASSINAVA EM MARÇO");
    expect(diaSeguinte?.nomeCompleto).toBe("QUEM ASSINA AGORA");
  });

  it("`vigenteAte` nulo vale para sempre — uma data muito à frente ainda resolve", () => {
    const assinatura = resolverAssinatura(DUAS_VIGENCIAS, {
      papel: "encarregado_divisao",
      cursoId: CURSO_CAHO,
      data: "2031-12-31",
    });

    expect(assinatura?.nomeCompleto).toBe("QUEM ASSINA AGORA");
  });

  it("entre duas vigências abertas na mesma data, vence a de maior `vigenteDe`", () => {
    const sobrepostas: readonly ResponsavelDoCurso[] = [
      linha({ papel: "elaborador", vigenteDe: "2026-01-01", nomeCompleto: "A ANTIGA" }),
      linha({ papel: "elaborador", vigenteDe: "2026-08-01", nomeCompleto: "A RECENTE" }),
    ];

    const assinatura = resolverAssinatura(sobrepostas, {
      papel: "elaborador",
      cursoId: CURSO_CAHO,
      data: SEMANA_DE_SETEMBRO,
    });

    expect(assinatura?.nomeCompleto).toBe("A RECENTE");
  });

  /*
   * ⚠️ **O DESEMPATE POR `ordem` É NECESSÁRIO PORQUE A `EXCLUDE` NÃO PROTEGE AS LINHAS GERAL** —
   *    está escrito na nota de `ex_assinatura_sem_sobreposicao`: *"em constraint de exclusão uma
   *    linha com expressão nula não conflita com ninguém"*. E **as duas linhas reais são GERAL**.
   *    Sem desempate, o rodapé trocaria de nome conforme a ordem de chegada do PostgREST.
   */
  it("empatando `vigenteDe` entre duas GERAL, vence a de menor `ordem`", () => {
    const empatadas: readonly ResponsavelDoCurso[] = [
      linha({ papel: "elaborador", vigenteDe: "2026-08-01", ordem: 4, nomeCompleto: "ORDEM 4" }),
      linha({ papel: "elaborador", vigenteDe: "2026-08-01", ordem: 2, nomeCompleto: "ORDEM 2" }),
    ];

    const emUmaOrdem = resolverAssinatura(empatadas, {
      papel: "elaborador",
      cursoId: CURSO_CAHO,
      data: SEMANA_DE_SETEMBRO,
    });
    const naOutra = resolverAssinatura([...empatadas].reverse(), {
      papel: "elaborador",
      cursoId: CURSO_CAHO,
      data: SEMANA_DE_SETEMBRO,
    });

    expect(emUmaOrdem?.nomeCompleto).toBe("ORDEM 2");
    // A resposta não pode depender da ordem em que as linhas chegaram.
    expect(naOutra?.nomeCompleto).toBe("ORDEM 2");
  });
});

describe("`FR-036.1` · a linha DO CURSO prevalece sobre a GERAL", () => {
  const CURSO_E_GERAL: readonly ResponsavelDoCurso[] = [
    linha({
      papel: "elaborador",
      cursoId: null,
      vigenteDe: "2026-01-01",
      nomeCompleto: "A INSTITUCIONAL",
      funcaoDescricao: "Encarregado da Elaboração do DSA",
    }),
    linha({
      papel: "elaborador",
      cursoId: CURSO_CAHO,
      vigenteDe: "2026-01-01",
      nomeCompleto: "O AUXILIAR DO CAHO",
      funcaoDescricao: "Auxiliar do CAHO",
    }),
  ];

  it("no curso que tem linha própria, ela vence a GERAL na mesma data", () => {
    const assinatura = resolverAssinatura(CURSO_E_GERAL, {
      papel: "elaborador",
      cursoId: CURSO_CAHO,
      data: SEMANA_DE_MARCO,
    });

    expect(assinatura?.nomeCompleto).toBe("O AUXILIAR DO CAHO");
    expect(assinatura?.funcaoDescricao).toBe("Auxiliar do CAHO");
  });

  /* ⚠️ **CONTROLE NEGATIVO: a linha do CAHO NÃO pode vazar para outro curso.** */
  it("em OUTRO curso, a linha do CAHO não aparece — vale a GERAL", () => {
    const assinatura = resolverAssinatura(CURSO_E_GERAL, {
      papel: "elaborador",
      cursoId: CURSO_OUTRO,
      data: SEMANA_DE_MARCO,
    });

    expect(assinatura?.nomeCompleto).toBe("A INSTITUCIONAL");
  });

  /*
   * ⚠️ **O PASSO DO CURSO VEM ANTES DO PASSO DA DATA MAIS RECENTE, E ESTE CASO PROVA A ORDEM.** A
   *    GERAL aqui é **mais nova** que a do curso. Invertidos os passos, a institucional venceria, e o
   *    Auxiliar do CAHO desapareceria do rodapé no dia em que alguém atualizasse a assinatura
   *    institucional — sem erro nenhum na tela.
   */
  it("a linha do curso vence mesmo sendo MAIS ANTIGA que a GERAL", () => {
    const geralMaisNova: readonly ResponsavelDoCurso[] = [
      linha({
        papel: "elaborador",
        cursoId: null,
        vigenteDe: "2026-08-01",
        nomeCompleto: "A INSTITUCIONAL NOVA",
      }),
      linha({
        papel: "elaborador",
        cursoId: CURSO_CAHO,
        vigenteDe: "2026-01-01",
        nomeCompleto: "O AUXILIAR DO CAHO",
      }),
    ];

    const assinatura = resolverAssinatura(geralMaisNova, {
      papel: "elaborador",
      cursoId: CURSO_CAHO,
      data: SEMANA_DE_SETEMBRO,
    });

    expect(assinatura?.nomeCompleto).toBe("O AUXILIAR DO CAHO");
  });

  it("só havendo GERAL, é ela que é usada — o caso de hoje no remoto", () => {
    const assinatura = resolverAssinatura(AS_DUAS_DE_HOJE, {
      papel: "encarregado_divisao",
      cursoId: CURSO_OUTRO,
      data: SEMANA_DE_SETEMBRO,
    });

    expect(assinatura?.funcaoDescricao).toBe("Encarregado da Divisão de Administração Acadêmica");
  });

  /*
   * ⚠️ **A LINHA DO CURSO SÓ PREVALECE SE ESTIVER VIGENTE — vencida, cai de volta na GERAL.** Sem
   *    isto, o filtro de vigência valeria para a GERAL e não para o curso, e o rodapé imprimiria um
   *    Auxiliar que já rendeu.
   */
  it("linha do curso FORA de vigência não prevalece — cai na GERAL", () => {
    const cursoVencido: readonly ResponsavelDoCurso[] = [
      linha({
        papel: "elaborador",
        cursoId: null,
        vigenteDe: "2026-01-01",
        nomeCompleto: "A INSTITUCIONAL",
      }),
      linha({
        papel: "elaborador",
        cursoId: CURSO_CAHO,
        vigenteDe: "2026-01-01",
        vigenteAte: "2026-04-30",
        nomeCompleto: "O AUXILIAR QUE RENDEU",
      }),
    ];

    expect(
      resolverAssinatura(cursoVencido, {
        papel: "elaborador",
        cursoId: CURSO_CAHO,
        data: SEMANA_DE_MARCO,
      })?.nomeCompleto,
    ).toBe("O AUXILIAR QUE RENDEU");

    expect(
      resolverAssinatura(cursoVencido, {
        papel: "elaborador",
        cursoId: CURSO_CAHO,
        data: SEMANA_DE_SETEMBRO,
      })?.nomeCompleto,
    ).toBe("A INSTITUCIONAL");
  });
});

describe("`FR-036` · sem responsável vigente a linha sai EM BRANCO, nunca um erro", () => {
  /* ⚠️ **DEGRADAÇÃO (`RN-DEG-01`): `null`, nunca exceção e nunca objeto de campos vazios.** */
  it("nenhuma linha vigente na data devolve `null`", () => {
    const sofevereiro: readonly ResponsavelDoCurso[] = [
      linha({ papel: "elaborador", vigenteDe: "2026-02-01", vigenteAte: "2026-02-28" }),
    ];

    expect(
      resolverAssinatura(sofevereiro, {
        papel: "elaborador",
        cursoId: CURSO_CAHO,
        data: SEMANA_DE_SETEMBRO,
      }),
    ).toBeNull();
  });

  it("lista vazia devolve `null` nos dois lados, sem levantar exceção", () => {
    const par = assinaturasDoDsa([], { cursoId: CURSO_CAHO, data: SEMANA_DE_MARCO });

    expect(par.esquerda).toBeNull();
    expect(par.direita).toBeNull();
  });

  /*
   * ⚠️ **VIGÊNCIA QUE AINDA NÃO COMEÇOU TAMBÉM SAI EM BRANCO, e é o comportamento HONESTO que o
   *    `comment on column responsaveis_curso.vigente_de` pede:** as linhas semente receberam a data
   *    da migração de propósito, para que um DSA de semana anterior saia sem assinatura — *"naquela
   *    data não havia responsável cadastrado"*.
   */
  it("DSA ANTERIOR à vigência das duas linhas de hoje sai em branco nos dois lados", () => {
    const par = assinaturasDoDsa(AS_DUAS_DE_HOJE, {
      cursoId: CURSO_CAHO,
      data: SEMANA_DE_MARCO,
    });

    expect(par.esquerda).toBeNull();
    expect(par.direita).toBeNull();
  });

  it("`exibirNoDsa: false` tira a linha da resolução, mesmo vigente", () => {
    const escondida: readonly ResponsavelDoCurso[] = [
      linha({
        papel: "elaborador",
        vigenteDe: "2026-01-01",
        exibirNoDsa: false,
        nomeCompleto: "NÃO DEVE APARECER",
      }),
    ];

    expect(
      resolverAssinatura(escondida, {
        papel: "elaborador",
        cursoId: CURSO_CAHO,
        data: SEMANA_DE_SETEMBRO,
      }),
    ).toBeNull();
  });

  /* ⚠️ **CONTROLE POSITIVO do caso acima: a mesma linha visível RESOLVE.** */
  it("a MESMA linha com `exibirNoDsa: true` resolve — controle positivo", () => {
    const visivel: readonly ResponsavelDoCurso[] = [
      linha({
        papel: "elaborador",
        vigenteDe: "2026-01-01",
        exibirNoDsa: true,
        nomeCompleto: "DEVE APARECER",
      }),
    ];

    expect(
      resolverAssinatura(visivel, {
        papel: "elaborador",
        cursoId: CURSO_CAHO,
        data: SEMANA_DE_SETEMBRO,
      })?.nomeCompleto,
    ).toBe("DEVE APARECER");
  });

  /*
   * ⚠️ **`exibirNoDsa: false` NA LINHA DO CURSO NÃO DEIXA O PAPEL EM BRANCO — ele cai na GERAL.**
   *    Escondida, ela não é candidata, logo não há *"linha do curso"* a prevalecer. Se o filtro de
   *    visibilidade rodasse DEPOIS da precedência, o rodapé sairia em branco com uma GERAL válida no
   *    banco, e ninguém saberia por quê.
   */
  it("linha do curso escondida não suprime a GERAL", () => {
    const cursoEscondido: readonly ResponsavelDoCurso[] = [
      linha({ papel: "elaborador", cursoId: null, nomeCompleto: "A INSTITUCIONAL" }),
      linha({
        papel: "elaborador",
        cursoId: CURSO_CAHO,
        exibirNoDsa: false,
        nomeCompleto: "ESCONDIDA",
      }),
    ];

    expect(
      resolverAssinatura(cursoEscondido, {
        papel: "elaborador",
        cursoId: CURSO_CAHO,
        data: SEMANA_DE_SETEMBRO,
      })?.nomeCompleto,
    ).toBe("A INSTITUCIONAL");
  });

  /* ⚠️ **CONTROLE NEGATIVO: papel pedido que não existe na lista não empresta outro papel.** */
  it("papel sem linha nenhuma devolve `null` — não cai em outro papel", () => {
    expect(
      resolverAssinatura(AS_DUAS_DE_HOJE, {
        papel: "chefe_departamento",
        cursoId: CURSO_CAHO,
        data: SEMANA_DE_SETEMBRO,
      }),
    ).toBeNull();
  });
});

describe("`Q-14` · o modo dinâmico devolve o marcador, e a rota põe quem imprime", () => {
  it("modo `dinamico_usuario_logado` sai sem nominal e com `resolvePeloUsuarioLogado`", () => {
    const assinatura = resolverAssinatura(AS_DUAS_DE_HOJE, {
      papel: "elaborador",
      cursoId: CURSO_CAHO,
      data: SEMANA_DE_SETEMBRO,
    });

    expect(assinatura?.resolvePeloUsuarioLogado).toBe(true);
    expect(assinatura?.nomeCompleto).toBeNull();
    expect(assinatura?.postoGraduacao).toBeNull();
  });

  /*
   * ⚠️ **A FUNÇÃO SAI DA LINHA TAMBÉM NO DINÂMICO.** O que a sessão resolve é a **pessoa**, nunca o
   *    **cargo** — se a função viesse de quem imprime, o rodapé diria que o Ajudante é o
   *    Encarregado da Divisão.
   */
  it("no dinâmico a `funcaoDescricao` continua vindo da LINHA", () => {
    const assinatura = resolverAssinatura(AS_DUAS_DE_HOJE, {
      papel: "elaborador",
      cursoId: CURSO_CAHO,
      data: SEMANA_DE_SETEMBRO,
    });

    expect(assinatura?.funcaoDescricao).toBe("Encarregado da Elaboração do DSA");
  });

  /*
   * ⚠️ **CONTROLE NEGATIVO, e ele pega o defeito que mais seduz:** uma linha dinâmica com nominal
   *    **antigo esquecido** na própria linha. Passar aquilo adiante imprimiria **quem não está
   *    imprimindo**, com cara de dado correto.
   */
  it("nominal esquecido numa linha dinâmica NÃO é impresso", () => {
    const dinamicaComSobra: readonly ResponsavelDoCurso[] = [
      linha({
        papel: "elaborador",
        preenchimento: "dinamico_usuario_logado",
        vigenteDe: "2026-01-01",
        postoGraduacao: "CT",
        nomeCompleto: "NOMINAL ANTIGO ESQUECIDO NA LINHA",
      }),
    ];

    const assinatura = resolverAssinatura(dinamicaComSobra, {
      papel: "elaborador",
      cursoId: CURSO_CAHO,
      data: SEMANA_DE_SETEMBRO,
    });

    expect(assinatura?.nomeCompleto).toBeNull();
    expect(assinatura?.postoGraduacao).toBeNull();
    expect(assinatura?.resolvePeloUsuarioLogado).toBe(true);
  });

  /* ⚠️ **CONTROLE POSITIVO: o modo `fixo` imprime o nominal da linha e NÃO pede a sessão.** */
  it("modo `fixo` imprime o nominal da linha e `resolvePeloUsuarioLogado` é `false`", () => {
    const assinatura = resolverAssinatura(AS_DUAS_DE_HOJE, {
      papel: "encarregado_divisao",
      cursoId: CURSO_CAHO,
      data: SEMANA_DE_SETEMBRO,
    });

    expect(assinatura?.resolvePeloUsuarioLogado).toBe(false);
    expect(assinatura?.postoGraduacao).toBe("CF");
    expect(assinatura?.nomeCompleto).toBe("NOMINAL SINTÉTICO — não medido");
  });
});

describe("critério 2 do Épico 6 · o par do rodapé sai preenchido para QUALQUER curso", () => {
  it("`assinaturasDoDsa` devolve `elaborador` à esquerda e `encarregado_divisao` à direita", () => {
    const par = assinaturasDoDsa(AS_DUAS_DE_HOJE, {
      cursoId: CURSO_CAHO,
      data: SEMANA_DE_SETEMBRO,
    });

    expect(par.esquerda?.papel).toBe(PAPEL_DA_ESQUERDA);
    expect(par.direita?.papel).toBe(PAPEL_DA_DIREITA);
    expect(par.esquerda?.papel).toBe("elaborador");
    expect(par.direita?.papel).toBe("encarregado_divisao");
  });

  /*
   * ⚠️ **O CASO MEDIDO: as duas linhas GERAL de hoje cobrem TODOS os cursos.** É o que faz o
   *    critério **2** — *"o rodapé sai com as assinaturas preenchidas"* — ser alcançável **sem
   *    cadastro novo**, e é o que fecha o achado (b) da v1.0, em que a aba tinha 0 linhas e todo DSA
   *    saía em branco.
   */
  it("as duas linhas de hoje resolvem os dois lados em DOIS cursos diferentes", () => {
    for (const cursoId of [CURSO_CAHO, CURSO_OUTRO]) {
      const par = assinaturasDoDsa(AS_DUAS_DE_HOJE, { cursoId, data: SEMANA_DE_SETEMBRO });

      expect(par.esquerda, `esquerda do curso ${cursoId}`).not.toBeNull();
      expect(par.direita, `direita do curso ${cursoId}`).not.toBeNull();
      expect(par.esquerda?.resolvePeloUsuarioLogado).toBe(true);
      expect(par.direita?.resolvePeloUsuarioLogado).toBe(false);
    }
  });

  it("as duas linhas de hoje resolvem em QUALQUER data a partir da vigência delas", () => {
    for (const data of ["2026-09-08", "2026-12-31", "2027-06-15"]) {
      const par = assinaturasDoDsa(AS_DUAS_DE_HOJE, { cursoId: CURSO_CAHO, data });

      expect(par.esquerda, `esquerda em ${data}`).not.toBeNull();
      expect(par.direita, `direita em ${data}`).not.toBeNull();
    }
  });

  /*
   * ⚠️ **UM LADO EM BRANCO NÃO DERRUBA O OUTRO** (`RN-DEG-01`): é o estado em que o DSA fica se a
   *    divisão desativar `exibir_no_dsa` de um dos papéis, e o rodapé tem de sair com a outra
   *    rubrica em vez de recusar a impressão.
   */
  it("só o `encarregado_divisao` vigente: a direita sai e a esquerda fica em branco", () => {
    const soADireita: readonly ResponsavelDoCurso[] = [
      linha({
        papel: "encarregado_divisao",
        vigenteDe: "2026-01-01",
        postoGraduacao: "CF",
        nomeCompleto: "SÓ ESTE ASSINA",
      }),
    ];

    const par = assinaturasDoDsa(soADireita, { cursoId: CURSO_CAHO, data: SEMANA_DE_SETEMBRO });

    expect(par.esquerda).toBeNull();
    expect(par.direita?.nomeCompleto).toBe("SÓ ESTE ASSINA");
  });

  /*
   * ⚠️ **OS OUTROS DOIS PAPÉIS DO ENUM NÃO ENTRAM NO PAR, e o catálogo diz por quê:** o
   *    `comment on type public.papel_assinatura` escreve *"`elaborador` + `encarregado_divisao` são
   *    o par mínimo exigido por `RF-DSA-06`"*. Enfiar um terceiro no rodapé mudaria o layout
   *    aprovado da v2.0, que é requisito de paridade (`RNF-COMP-01`).
   */
  it("`encarregado_curso` e `chefe_departamento` vigentes NÃO entram no par do rodapé", () => {
    const comOsQuatro: readonly ResponsavelDoCurso[] = [
      ...AS_DUAS_DE_HOJE,
      linha({
        papel: "encarregado_curso",
        vigenteDe: "2026-01-01",
        nomeCompleto: "NÃO É DO RODAPÉ DO DSA",
      }),
      linha({
        papel: "chefe_departamento",
        vigenteDe: "2026-01-01",
        nomeCompleto: "TAMBÉM NÃO É",
      }),
    ];

    const par = assinaturasDoDsa(comOsQuatro, { cursoId: CURSO_CAHO, data: SEMANA_DE_SETEMBRO });

    expect(par.esquerda?.papel).toBe("elaborador");
    expect(par.direita?.papel).toBe("encarregado_divisao");

    // Mas eles continuam resolvíveis por papel — existem, só não são o par do DSA.
    expect(
      resolverAssinatura(comOsQuatro, {
        papel: "encarregado_curso",
        cursoId: CURSO_CAHO,
        data: SEMANA_DE_SETEMBRO,
      })?.nomeCompleto,
    ).toBe("NÃO É DO RODAPÉ DO DSA");
  });
});

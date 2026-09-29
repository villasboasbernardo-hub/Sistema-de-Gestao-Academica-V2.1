/**
 * `FR-015`, `FR-020` a `FR-024`, `FR-060` a `FR-063` — exclusão com rastro, modelo de currículo e as
 * sete confirmações novas (D-B1 e D-B3, 24/09/2026).
 *
 * ⚠️ **O CASO QUE DISCRIMINA DO MODELO DE CURRÍCULO é a disciplina SEM UE.** É tentador deduzir quem
 * tem currículo — *"curso expedito não tem"*, *"disciplina curta não tem"* — e acertar em quase
 * todas: das 175 disciplinas reais, **138 têm UE**. É justamente por acertar na maioria que a regra
 * inventada passaria despercebida, e por isso o `FR-061` manda **não renderizar nem avisar** quando
 * não há linha, em vez de inferir.
 *
 * ⚠️ **E O DAS CONFIRMAÇÕES é "desativar SEM histórico não confirma".** Uma implementação que
 * confirmasse toda desativação passaria em qualquer asserção que só perguntasse *"abre diálogo?"* — e
 * violaria o A-9, que decidiu confirmar **só o que é difícil de desfazer**, porque confirmação em
 * toda gravação treina a pessoa a clicar sem ler.
 */
import { describe, expect, it } from "vitest";

import { confirmacaoDaGravacao } from "@/lib/dominio/confirmacao-de-gravacao";
import {
  chavesDaRecusa,
  codigoConfere,
  motivoDoImpedimento,
  ROTULO_DO_IMPEDIMENTO,
} from "@/lib/dominio/exclusao-de-disciplina";
import {
  cursoTemCurriculo,
  disciplinasSemUnidade,
  disciplinaTemCurriculo,
} from "@/lib/dominio/modelo-do-curriculo";

describe("`FR-022` · o motivo do impedimento nomeia o que prende, e oferece a saída", () => {
  it("sem impedimento, não há motivo", () => {
    expect(motivoDoImpedimento([])).toBeNull();
  });

  it("um impedimento sai traduzido, e a frase manda DESATIVAR", () => {
    const motivo = motivoDoImpedimento(["linha_de_turma"])!;
    expect(motivo).toContain("linha de turma");
    // ⚠️ *"Não pode ser excluído"* sozinho deixa a pessoa sem próximo passo.
    expect(motivo).toContain("Desative");
  });

  it("vários impedimentos saem com vírgula e `e` — não com vírgula no fim", () => {
    const motivo = motivoDoImpedimento(["linha_de_turma", "avaliacao", "unidade_de_ensino"])!;
    expect(motivo).toContain("linha de turma, avaliação e unidade de ensino");
  });

  it("⚠️ chave DESCONHECIDA aparece como está — nunca some em silêncio (`RN-DEG-01`)", () => {
    // ⚠️ Se o banco ganhar um impedimento novo e este módulo não souber traduzi-lo, a pessoa lê a
    //    chave crua: feia, e correta. Sumir faria a recusa dizer "tem histórico" sem dizer QUAL.
    const motivo = motivoDoImpedimento(["impedimento_que_ainda_nao_existe"])!;
    expect(motivo).toContain("impedimento_que_ainda_nao_existe");
  });

  it("o texto distingue disciplina de unidade de ensino", () => {
    expect(motivoDoImpedimento(["aula_lancada"], "disciplina")).toContain("Disciplina");
    expect(motivoDoImpedimento(["aula_lancada"], "unidade_de_ensino")).toContain(
      "Unidade de ensino",
    );
  });

  it("os seis impedimentos do banco estão traduzidos, e nenhum rótulo vaza identificador", () => {
    /*
     * ⚠️ **O SINAL DE VAZAMENTO É O SUBLINHADO, não a igualdade com a chave.** A primeira escrita
     * deste caso exigia `rotulo !== chave` e reprovou em `planejamento` — que é **palavra
     * portuguesa** e traduz para si mesma. A asserção estava errada, não o módulo: o que não pode
     * chegar à tela é `linha_de_turma`, e o que o distingue é o `_`.
     */
    for (const chave of [
      "linha_de_turma",
      "vinculo_de_habilitacao",
      "avaliacao",
      "planejamento",
      "unidade_de_ensino",
      "aula_lancada",
    ]) {
      const rotulo = ROTULO_DO_IMPEDIMENTO[chave];
      expect(rotulo, `\`${chave}\` sem rótulo`).toBeDefined();
      expect(rotulo, `\`${chave}\` chegou à tela com sublinhado`).not.toContain("_");
    }
  });
});

describe("`FR-023` · as chaves vêm da recusa do banco — e são DOIS prefixos", () => {
  it("lê a recusa da disciplina", () => {
    expect(chavesDaRecusa("disciplina_com_historico: linha_de_turma, avaliacao")).toEqual([
      "linha_de_turma",
      "avaliacao",
    ]);
  });

  it("⚠️ e a da UNIDADE DE ENSINO, que usa outro prefixo", () => {
    // ⚠️ Ler só o prefixo da disciplina faria a UE recusar **sem dizer por quê** — a lista viria
    //    vazia e a tela mostraria a recusa genérica. As duas RPCs levantam prefixos diferentes.
    expect(chavesDaRecusa("unidade_com_historico: aula_lancada")).toEqual(["aula_lancada"]);
  });

  it("mensagem de outro erro devolve lista vazia, sem estourar", () => {
    expect(chavesDaRecusa("qualquer outra coisa")).toEqual([]);
  });
});

describe("`FR-021` · o código digitado confere", () => {
  it("exato libera; vazio e diferente não", () => {
    expect(codigoConfere("DIS-000123", "DIS-000123")).toBe(true);
    expect(codigoConfere("", "DIS-000123")).toBe(false);
    expect(codigoConfere("DIS-000124", "DIS-000123")).toBe(false);
  });

  it("espaço à volta é aparado — colar do banco costuma trazê-lo", () => {
    expect(codigoConfere("  DIS-000123  ", "DIS-000123")).toBe(true);
  });

  it("⚠️ CAIXA DIFERENTE NÃO libera, e isso é decisão", () => {
    // ⚠️ Aceitar `dis-000123` treinaria a digitar de memória — que é exatamente o que a confirmação
    //    por código existe para impedir.
    expect(codigoConfere("dis-000123", "DIS-000123")).toBe(false);
  });
});

describe("`FR-060` e `FR-061` · ter UE é DADO, nunca dedução (D-B3)", () => {
  it("disciplina com UE ativa tem currículo; sem, não tem", () => {
    expect(disciplinaTemCurriculo({ disciplinaId: "a", unidadesAtivas: 3 })).toBe(true);
    expect(disciplinaTemCurriculo({ disciplinaId: "b", unidadesAtivas: 0 })).toBe(false);
  });

  it("⚠️ BASTA UMA disciplina com UE para o curso ter currículo", () => {
    // ⚠️ Exigir "todas" esconderia a seção de um curso parcialmente extraído — e é justamente ali
    //    que a pessoa completaria o currículo.
    expect(
      cursoTemCurriculo([
        { disciplinaId: "a", unidadesAtivas: 0 },
        { disciplinaId: "b", unidadesAtivas: 4 },
      ]),
    ).toBe(true);
  });

  it("⚠️ O CASO QUE DISCRIMINA · curso SEM nenhuma UE não tem currículo, e não lista pendência", () => {
    const semNenhuma = [
      { disciplinaId: "a", unidadesAtivas: 0 },
      { disciplinaId: "b", unidadesAtivas: 0 },
    ];
    expect(cursoTemCurriculo(semNenhuma)).toBe(false);
    // ⚠️ E a lista de "faltando" vem VAZIA, não com as duas: apresentá-las seria inventar a
    //    pendência que o `FR-061` proíbe.
    expect(disciplinasSemUnidade(semNenhuma)).toEqual([]);
  });

  it("num curso COM currículo, as que faltam são listadas — ali a pendência é real", () => {
    const faltando = disciplinasSemUnidade([
      { disciplinaId: "a", unidadesAtivas: 4 },
      { disciplinaId: "b", unidadesAtivas: 0 },
    ]);
    expect(faltando.map((d) => d.disciplinaId)).toEqual(["b"]);
  });

  it("curso sem disciplina nenhuma não tem currículo, e não estoura", () => {
    expect(cursoTemCurriculo([])).toBe(false);
    expect(disciplinasSemUnidade([])).toEqual([]);
  });
});

describe("`FR-015` e `FR-063` · as SETE confirmações novas", () => {
  it("excluir disciplina confirma SEMPRE, e a palavra `PERMANENTE` está lá", () => {
    const c = confirmacaoDaGravacao("excluir_disciplina", { nome: "Navegação I" });
    expect(c.confirma).toBe(true);
    if (!c.confirma) return;
    expect(c.mensagens.join(" ")).toContain("PERMANENTE");
    expect(c.rotuloConfirmar).toBe("Excluir");
  });

  it("⚠️ e pede o CÓDIGO quando ele é conhecido — é a única gravação com dois passos", () => {
    const c = confirmacaoDaGravacao("excluir_unidade_ensino", {
      nome: "UE 3",
      codigo: "UE-000045",
    });
    if (!c.confirma) return;
    expect(c.mensagens.join(" ")).toContain("UE-000045");
  });

  it("⚠️ O CASO QUE DISCRIMINA · desativar SEM histórico NÃO confirma", () => {
    // ⚠️ É o A-9: confirmação em toda gravação treina a pessoa a clicar sem ler, e aí ela falha
    //    exatamente quando importa. Desativar um cadastro criado hoje é desfazível e barato.
    expect(confirmacaoDaGravacao("desativar_disciplina_com_historico", {}).confirma).toBe(false);
    expect(
      confirmacaoDaGravacao("desativar_disciplina_com_historico", { turmasQueUsam: 0 }).confirma,
    ).toBe(false);
    expect(
      confirmacaoDaGravacao("desativar_unidade_com_historico", { aulasLancadas: 0 }).confirma,
    ).toBe(false);
  });

  it("com histórico, confirma e DIZ QUANTO — o número é a informação", () => {
    const c = confirmacaoDaGravacao("desativar_disciplina_com_historico", {
      nome: "Navegação I",
      turmasQueUsam: 3,
    });
    expect(c.confirma).toBe(true);
    if (!c.confirma) return;
    expect(c.mensagens.join(" ")).toContain("3 turma(s)");
    expect(c.mensagens.join(" ")).toContain("nada é apagado");
  });

  it("⚠️ as três que recalculam CH só confirmam quando HÁ instrutor afetado", () => {
    expect(
      confirmacaoDaGravacao("alterar_ch_com_rateio", { instrutoresAfetados: 0 }).confirma,
    ).toBe(false);
    expect(
      confirmacaoDaGravacao("alterar_modo_com_instrutores", { instrutoresAfetados: 0 }).confirma,
    ).toBe(false);
    expect(confirmacaoDaGravacao("remover_instrutor_com_aula", { aulasLancadas: 0 }).confirma).toBe(
      false,
    );
  });

  it("⚠️ e quando confirmam, a frase diz que a CH sai impressa — é o que a pessoa não sabe", () => {
    const ch = confirmacaoDaGravacao("alterar_ch_com_rateio", {
      instrutoresAfetados: 3,
      chAntiga: 20,
      chNova: 30,
    });
    if (!ch.confirma) return;
    expect(ch.mensagens.join(" ")).toContain("3 instrutor(es)");
    expect(ch.mensagens.join(" ")).toContain("20");
    expect(ch.mensagens.join(" ")).toContain("30");
    expect(ch.mensagens.join(" ")).toContain("LIQ");
  });

  it("alterar modo explica a diferença entre simultâneo e dividido", () => {
    const c = confirmacaoDaGravacao("alterar_modo_com_instrutores", {
      instrutoresAfetados: 2,
      modoAntigo: "dividido",
      modoNovo: "simultaneo",
    });
    if (!c.confirma) return;
    expect(c.mensagens.join(" ")).toContain("INTEGRAL");
  });

  it("remover instrutor com aula diz que as aulas FICAM, e só a prevista muda", () => {
    const c = confirmacaoDaGravacao("remover_instrutor_com_aula", {
      nome: "CC Silva",
      aulasLancadas: 7,
    });
    if (!c.confirma) return;
    expect(c.mensagens.join(" ")).toContain("7 aula(s)");
    expect(c.mensagens.join(" ")).toContain("nada é apagado");
    expect(c.mensagens.join(" ")).toContain("PREVISTA");
  });
});

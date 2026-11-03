/**
 * RA-2 (Bloco 18, spec 033) — a FORMA da entrada das ações das AEC previstas do currículo
 * (`lib/validacao/aec-prevista.ts`).
 *
 * O caso que discrimina (DoD 8): o TA VAZIO chega NULO («não definido»), nunca zero — o zero digitado é recusado com a
 * frase que manda deixar vazio. Um esquema que coagisse o vazio a `0` passaria em todos os outros casos e gravaria um
 * número que o currículo não diz (`RN-DEG-01`; item 6 da conferência do passo 0).
 *
 * Quem decide o resto (o tipo de classificação AEC, a disciplina do mesmo currículo, a RC-6) é o banco — aqui só a forma.
 */
import { describe, expect, it } from "vitest";

import {
  esquemaDaAecPrevista,
  esquemaDaSituacaoDaAecPrevista,
  MAXIMO_DE_TA_PREVISTOS,
} from "@/lib/validacao/aec-prevista";

const TIPO = "0b6f2c1e-7d4a-4a52-9b1e-3c2d1a0f9e8d";
const DISCIPLINA = "5a1c9d3e-2b4f-4e6a-8c7d-1f0e9b8a7c6d";
const AEC = "9e8d7c6b-5a4f-4e3d-9c2b-1a0f9e8d7c6b";

/** A entrada como a tela a manda: todo campo é texto do formulário. */
const ENTRADA = {
  sigla: "C-Ap-FR",
  versao: "1",
  nome: "  Palestra de segurança orgânica  ",
  tipoAtividadeId: TIPO,
  taPrevistos: "2",
  disciplinaId: DISCIPLINA,
  obrigatoria: true,
  fonteArquivo: "Curriculo.pdf",
  fontePagina: "A-74 (Anexo B)",
  observacao: "",
};

function primeiraMensagem(entrada: unknown): string | undefined {
  const r = esquemaDaAecPrevista.safeParse(entrada);
  return r.success ? undefined : r.error.issues[0]?.message;
}

describe("RA-2 — a AEC prevista: o que entra", () => {
  it("a entrada da tela vira a forma da ação (nome aparado, versão número, texto vazio nulo)", () => {
    const r = esquemaDaAecPrevista.safeParse(ENTRADA);
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({
      sigla: "C-Ap-FR",
      versao: 1,
      nome: "Palestra de segurança orgânica",
      tipoAtividadeId: TIPO,
      taPrevistos: 2,
      disciplinaId: DISCIPLINA,
      obrigatoria: true,
      fonteArquivo: "Curriculo.pdf",
      fontePagina: "A-74 (Anexo B)",
      observacao: null,
    });
    expect(r.data?.id).toBeUndefined();
  });

  it("⚠️ o caso que discrimina: o TA vazio é NULO («não definido»), e o zero é recusado", () => {
    for (const vazio of ["", "   ", null, undefined]) {
      const r = esquemaDaAecPrevista.safeParse({ ...ENTRADA, taPrevistos: vazio });
      expect(r.success, `TA ${JSON.stringify(vazio)}`).toBe(true);
      expect(r.data?.taPrevistos, `TA ${JSON.stringify(vazio)}`).toBeNull();
    }
    expect(primeiraMensagem({ ...ENTRADA, taPrevistos: "0" })).toMatch(/deixe vazio/);
  });

  it("o TA é inteiro, de 1 ao máximo", () => {
    expect(primeiraMensagem({ ...ENTRADA, taPrevistos: "2,5" })).toMatch(/inteiro/);
    expect(primeiraMensagem({ ...ENTRADA, taPrevistos: "1.5" })).toMatch(/inteiro/);
    expect(primeiraMensagem({ ...ENTRADA, taPrevistos: "abc" })).toMatch(/inteiro/);
    expect(
      primeiraMensagem({ ...ENTRADA, taPrevistos: String(MAXIMO_DE_TA_PREVISTOS + 1) }),
    ).toMatch(/passaram de/);
    expect(
      esquemaDaAecPrevista.safeParse({ ...ENTRADA, taPrevistos: String(MAXIMO_DE_TA_PREVISTOS) })
        .data?.taPrevistos,
    ).toBe(MAXIMO_DE_TA_PREVISTOS);
  });

  it("a disciplina é opcional: vazio vira nulo, e o que não é uuid é recusado", () => {
    expect(
      esquemaDaAecPrevista.safeParse({ ...ENTRADA, disciplinaId: "" }).data?.disciplinaId,
    ).toBeNull();
    expect(primeiraMensagem({ ...ENTRADA, disciplinaId: "VIII" })).toBe("Disciplina inválida.");
  });

  it("o nome e o tipo são obrigatórios", () => {
    expect(primeiraMensagem({ ...ENTRADA, nome: "   " })).toBe("Informe o nome da AEC prevista.");
    expect(primeiraMensagem({ ...ENTRADA, nome: "x".repeat(201) })).toMatch(/200 caracteres/);
    expect(primeiraMensagem({ ...ENTRADA, tipoAtividadeId: "" })).toBe(
      "Escolha o tipo da atividade.",
    );
  });

  it("a página é TEXTO, como o PDF a escreve, e a observação tem teto", () => {
    expect(
      esquemaDaAecPrevista.safeParse({ ...ENTRADA, fontePagina: "A-74" }).data?.fontePagina,
    ).toBe("A-74");
    expect(primeiraMensagem({ ...ENTRADA, observacao: "x".repeat(1001) })).toMatch(
      /1000 caracteres/,
    );
  });

  it("com `id`, edita; o `id` tem de ser uuid", () => {
    expect(esquemaDaAecPrevista.safeParse({ ...ENTRADA, id: AEC }).data?.id).toBe(AEC);
    expect(primeiraMensagem({ ...ENTRADA, id: "AEP-000001" })).toBe("AEC prevista inválida.");
  });

  it("a justificativa da RC-6 é opcional aqui (o banco decide), mas, quando vem, tem o mínimo do banco", () => {
    expect(esquemaDaAecPrevista.safeParse(ENTRADA).data?.justificativa).toBeUndefined();
    expect(primeiraMensagem({ ...ENTRADA, justificativa: "ok" })).toMatch(/ao menos 5 letras/);
    expect(
      esquemaDaAecPrevista.safeParse({ ...ENTRADA, justificativa: "  O anexo B prevê.  " }).data
        ?.justificativa,
    ).toBe("O anexo B prevê.");
  });
});

describe("RA-2 — desativar e reativar: só a AEC prevista e a justificativa", () => {
  it("aceita a AEC prevista do currículo e recusa o que não é uuid", () => {
    expect(
      esquemaDaSituacaoDaAecPrevista.safeParse({ sigla: "C-Ap-FR", versao: 2, id: AEC }).success,
    ).toBe(true);
    const r = esquemaDaSituacaoDaAecPrevista.safeParse({ sigla: "C-Ap-FR", versao: 2, id: "" });
    expect(r.success ? undefined : r.error.issues[0]?.message).toBe("AEC prevista inválida.");
  });

  it("a sigla e o currículo são os de toda ação do currículo", () => {
    const r = esquemaDaSituacaoDaAecPrevista.safeParse({ sigla: " ", versao: 0, id: AEC });
    expect(r.success).toBe(false);
  });
});

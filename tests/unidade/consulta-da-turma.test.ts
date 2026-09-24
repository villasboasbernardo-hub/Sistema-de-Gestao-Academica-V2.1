/**
 * `FR-031` / `FR-031.4` · a leitura da ficha da turma.
 *
 * ⚠️ **O CÓDIGO DA TURMA TEM ESPAÇOS**, e o segmento chega codificado no caminho. Decodificar duas
 * vezes é inofensivo nos 28 códigos de hoje e **destrutivo** em qualquer um que contenha `%`.
 *
 * Origem: `FR-031.1`, `FR-031.4`, `FR-021.8`, `FR-030` da spec 009.
 */
import { describe, expect, it } from "vitest";

import {
  codigoDaFicha,
  COLUNAS_DA_FICHA_DA_TURMA,
  deveLerProtecao,
  mensagemDeTurmaNaoEncontrada,
} from "@/app/(app)/turmas/[turma]/consulta";

describe("`FR-031.2` · o segmento é decodificado uma vez só, pela função única", () => {
  it("o código codificado volta ao original", () => {
    expect(codigoDaFicha("C-Ap-FR%20T2%202026")).toBe("C-Ap-FR T2 2026");
  });

  it("⚠️ código já decodificado passa intacto — o Next entrega `params` decodificado", () => {
    expect(codigoDaFicha("C-Ap-FR T2 2026")).toBe("C-Ap-FR T2 2026");
  });

  it("⚠️ sequência malformada não estoura: devolve o que recebeu (`RN-DEG-01`)", () => {
    expect(codigoDaFicha("C-Ap-FR%2026%")).toBe("C-Ap-FR%2026%");
  });
});

describe("`FR-031.4` · a mensagem depende do perfil", () => {
  it("alcance total: a turma não existe", () => {
    const m = mensagemDeTurmaNaoEncontrada("C-Ap-FR 2030", "todos");
    expect(m).toContain("C-Ap-FR 2030");
    expect(m).toContain("não encontrada");
    expect(m).not.toContain("alcance");
  });

  it("⚠️ recorte: a frase acrescenta 'ou fora do seu alcance'", () => {
    expect(mensagemDeTurmaNaoEncontrada("CAHO 2026", "recortado")).toContain("fora do seu alcance");
  });

  it("⚠️ as duas são diferentes para o MESMO código", () => {
    expect(mensagemDeTurmaNaoEncontrada("X 2026", "todos")).not.toBe(
      mensagemDeTurmaNaoEncontrada("X 2026", "recortado"),
    );
  });
});

describe("`FR-021.8` · a RPC de proteção só é lida para quem pode editar", () => {
  it("quem edita, lê", () => {
    expect(deveLerProtecao(true)).toBe(true);
  });

  it("⚠️ quem só consulta NÃO lê — o aviso só existe no momento de salvar", () => {
    expect(deveLerProtecao(false)).toBe(false);
  });
});

describe("as colunas pedidas", () => {
  it("trazem o que a ficha e os avisos precisam", () => {
    for (const coluna of [
      "codigo",
      "turma",
      "ano_letivo",
      "status",
      "modalidade",
      "data_inicio",
      "data_termino",
      "sala_alocada",
      "alunos",
      "curso_id",
    ]) {
      expect(COLUNAS_DA_FICHA_DA_TURMA, `${coluna} não é pedida`).toContain(coluna);
    }
  });

  it("⚠️ e NÃO pedem `select *`", () => {
    expect(COLUNAS_DA_FICHA_DA_TURMA).not.toContain("*");
  });
});

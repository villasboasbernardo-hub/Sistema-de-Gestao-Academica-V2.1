/**
 * O currículo em PDF — spec 020 (Bloco 5), C-5 a C-8: um arquivo por curso, só PDF, até 20 MB.
 */
import { describe, expect, it } from "vitest";

import {
  BALDE_DE_CURRICULOS,
  LIMITE_DO_CURRICULO_EM_BYTES,
  caminhoDoCurriculo,
  recusaDoCurriculo,
} from "@/lib/dominio/curriculo-em-pdf";

describe("o caminho", () => {
  it("é um por curso, pelo id — a sigla pode mudar", () => {
    expect(caminhoDoCurriculo("3f0c")).toBe("3f0c/curriculo.pdf");
    expect(BALDE_DE_CURRICULOS).toBe("curriculos");
  });
});

describe("C-6 · a conferência antes de enviar", () => {
  it("20 MB é o limite, o mesmo do balde", () => {
    expect(LIMITE_DO_CURRICULO_EM_BYTES).toBe(20 * 1024 * 1024);
  });

  it("aceita PDF dentro do limite", () => {
    expect(recusaDoCurriculo({ tipo: "application/pdf", tamanho: 1024 })).toBeNull();
    expect(
      recusaDoCurriculo({ tipo: "application/pdf", tamanho: LIMITE_DO_CURRICULO_EM_BYTES }),
    ).toBeNull();
  });

  it("recusa outro tipo, arquivo vazio e acima do limite, com a frase em português", () => {
    expect(recusaDoCurriculo({ tipo: "image/png", tamanho: 10 })).toMatch(/só PDF/);
    expect(recusaDoCurriculo({ tipo: "application/pdf", tamanho: 0 })).toMatch(/vazio/);
    expect(
      recusaDoCurriculo({ tipo: "application/pdf", tamanho: LIMITE_DO_CURRICULO_EM_BYTES + 1 }),
    ).toMatch(/20 MB/);
  });
});

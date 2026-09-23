/**
 * O endereço de turma, contra os códigos REAIS da base (`FR-031.1` a `FR-031.3`, `SC-002.1`).
 *
 * ⚠️ **A IDA E VOLTA É MEDIDA SOBRE OS 28 CÓDIGOS E AS 24 SIGLAS QUE EXISTEM**, lidos de um
 * retrato versionado (`dados/codigos-da-base.json`) gerado por consulta ao banco carregado.
 * Teste de unidade não abre banco; e uma prova de ida e volta sobre exemplos inventados
 * passaria com qualquer implementação, porque os exemplos que alguém inventa são os que
 * ele já sabe que funcionam. Os códigos de verdade trazem espaço, hífen e maiúsculas
 * misturadas — `C-ApA-AuxNav-PR-SP T1 2026` — e é onde a codificação erra.
 */
import { describe, expect, it } from "vitest";

import {
  codigoDaTurmaNoSegmento,
  enderecoDaNovaTurma,
  enderecoDaTurma,
  enderecoDaTurmaNoCurso,
} from "@/lib/navegacao/endereco-de-turma";

import retrato from "./dados/codigos-da-base.json";

const TURMAS: readonly string[] = retrato.turmas;
const SIGLAS: readonly string[] = retrato.siglas_de_curso;

describe("`FR-031.3` · ida e volta sobre os códigos reais da base", () => {
  it("o retrato tem as 28 turmas e as 24 siglas medidas em 18/09/2026", () => {
    /*
     * ⚠️ Esta asserção guarda o RETRATO, não o código. Se alguém regenerar o arquivo a
     * partir de uma base pela metade, as provas abaixo continuariam passando — sobre
     * menos casos. Contar aqui é o que impede a cobertura encolher em silêncio.
     */
    expect(TURMAS).toHaveLength(28);
    expect(SIGLAS).toHaveLength(24);
  });

  it("cada um dos 28 códigos de turma volta IDÊNTICO da ficha", () => {
    for (const codigo of TURMAS) {
      const caminho = enderecoDaTurma(codigo);
      const segmento = caminho.slice("/turmas/".length);
      expect(codigoDaTurmaNoSegmento(segmento), `${codigo} não sobreviveu à ida e volta`).toBe(
        codigo,
      );
    }
  });

  it("cada uma das 24 siglas volta IDÊNTICA do endereço de nova turma", () => {
    for (const sigla of SIGLAS) {
      const caminho = enderecoDaNovaTurma(sigla);
      const meio = caminho.slice("/cursos/".length, -"/turmas/nova".length);
      expect(decodeURIComponent(meio), `${sigla} não sobreviveu à ida e volta`).toBe(sigla);
    }
  });

  it("⚠️ nenhum endereço de turma sai com espaço cru, e nenhum sai com `+`", () => {
    /*
     * As duas metades importam. Espaço cru quebra o link; `+` funciona mas é uma SEGUNDA
     * representação do mesmo endereço, e o `FR-031.1` pede uma só — duas grafias quebram
     * comparação de link, cache e histórico, sem erro nenhum.
     */
    for (const codigo of TURMAS) {
      const caminho = enderecoDaTurma(codigo);
      expect(caminho, `espaço cru em ${caminho}`).not.toContain(" ");
      expect(caminho, `espaço como + em ${caminho}`).not.toContain("+");
    }
  });
});

describe("os exemplos do contrato de rotas §4, literalmente", () => {
  it("`enderecoDaTurma` produz o exemplo do contrato", () => {
    expect(enderecoDaTurma("C-ApA-PCN-PR-EAD T2 2026")).toBe(
      "/turmas/C-ApA-PCN-PR-EAD%20T2%202026",
    );
  });

  it("`enderecoDaTurmaNoCurso` produz o exemplo do contrato, com a aba", () => {
    expect(enderecoDaTurmaNoCurso("C-ApA-PCN-PR-EAD", "C-ApA-PCN-PR-EAD T2 2026", "grade")).toBe(
      "/cursos/C-ApA-PCN-PR-EAD?aba=grade&turma=C-ApA-PCN-PR-EAD+T2+2026",
    );
  });

  it("sem aba, o endereço traz só a turma", () => {
    expect(enderecoDaTurmaNoCurso("C-Ap-FR", "C-Ap-FR 2026")).toBe(
      "/cursos/C-Ap-FR?turma=C-Ap-FR+2026",
    );
  });

  it("`enderecoDaNovaTurma` produz o exemplo do contrato", () => {
    expect(enderecoDaNovaTurma("C-Ap-FR")).toBe("/cursos/C-Ap-FR/turmas/nova");
  });
});

describe("`codigoDaTurmaNoSegmento` decodifica UMA VEZ SÓ", () => {
  it("um segmento já decodificado passa intacto", () => {
    expect(codigoDaTurmaNoSegmento("C-Ap-FR 2026")).toBe("C-Ap-FR 2026");
  });

  it("⚠️ um código com `%` sobrevive — é o caso que a decodificação dupla destruiria", () => {
    /*
     * Nenhum dos 28 códigos de hoje tem `%`, e é justamente por isso que o caso existe:
     * decodificar duas vezes passaria despercebido na base inteira e quebraria no dia em
     * que uma sigla trouxesse o símbolo. `decodeURIComponent("50%")` lança `URIError`.
     */
    const comPorcento = "C-Esp-50% 2026";
    const caminho = enderecoDaTurma(comPorcento);
    expect(caminho).toBe("/turmas/C-Esp-50%25%202026");
    expect(codigoDaTurmaNoSegmento(caminho.slice("/turmas/".length))).toBe(comPorcento);
  });

  it("sequência de escape malformada degrada para o texto recebido, sem estourar", () => {
    expect(codigoDaTurmaNoSegmento("C-Ap-FR%2026%")).toBe("C-Ap-FR%2026%");
  });
});

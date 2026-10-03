/**
 * `FR-040.1` · o que cada perfil exige para a conta nascer funcionando.
 *
 * ⚠️ **O CASO QUE DISCRIMINA É O PAR `encarregado_curso` × `operador`**, e não um perfil contra
 * "nenhum". Os dois são restritos; o que os separa é **de onde** vem a restrição — vínculo num, escopo
 * no outro — e é exatamente aí que a regra erra se for escrita por intuição. Um teste que só olhasse
 * um perfil restrito e um irrestrito passaria com a regra trocada entre os dois.
 */
import { describe, expect, it } from "vitest";

import {
  conferirExigenciasDoPerfil,
  dicaDoPerfil,
  escopoRestringe,
  exigeVinculoDeCurso,
} from "@/lib/dominio/exigencias-do-perfil";
import { perfisDeclarados, type Perfil } from "@/lib/dominio/perfis";

const IRRESTRITOS: readonly Perfil[] = [
  "admin",
  "chefe_departamento_ensino",
  "visualizacao",
  "encarregado_administracao_academica",
  "ajudante_administracao_academica",
  "encarregado_orientacao_pedagogica",
  "ajudante_orientacao_pedagogica",
];

describe("de onde vem o alcance de cada perfil", () => {
  it("⚠️ O CASO QUE DISCRIMINA · `encarregado_curso` exige VÍNCULO e `operador` NÃO", () => {
    expect(exigeVinculoDeCurso("encarregado_curso")).toBe(true);
    expect(exigeVinculoDeCurso("operador")).toBe(false);
  });

  it("⚠️ O CASO QUE DISCRIMINA · o escopo restringe `operador` e NÃO `encarregado_curso`", () => {
    expect(escopoRestringe("operador")).toBe(true);
    expect(escopoRestringe("encarregado_curso")).toBe(false);
  });

  it("os outros SETE não exigem nem são restringidos — medido em `app.cursos_do_usuario()`", () => {
    for (const perfil of IRRESTRITOS) {
      expect(exigeVinculoDeCurso(perfil), `${perfil} exigiu vínculo`).toBe(false);
      expect(escopoRestringe(perfil), `${perfil} teria escopo efetivo`).toBe(false);
    }
  });

  it("⚠️ os NOVE do enum estão cobertos — nenhum perfil fica sem veredito", () => {
    // Sem esta asserção, um perfil novo no enum passaria por aqui sem ninguém decidir o que ele
    // exige, e a tela ofereceria a ele a dica genérica de "alcança todos os cursos" — que pode ser
    // exatamente o contrário da verdade.
    const cobertos = new Set([...IRRESTRITOS, "encarregado_curso", "operador"]);
    const declarados = perfisDeclarados();
    expect(declarados).toHaveLength(9);
    for (const p of declarados) expect(cobertos.has(p), `perfil sem veredito: ${p}`).toBe(true);
  });
});

describe("a conferência que impede a conta inútil", () => {
  it("⚠️ `encarregado_curso` com ZERO vínculos é recusado, e a frase diz por quê", () => {
    const veredito = conferirExigenciasDoPerfil("encarregado_curso", 0);
    expect(veredito.atendida).toBe(false);
    if (!veredito.atendida) {
      expect(veredito.motivo).toContain("pelo menos um curso");
      // A frase explica o SINTOMA, que é o que torna o erro reconhecível: entra e não vê nada.
      expect(veredito.motivo).toContain("não vê curso algum");
    }
  });

  it("`encarregado_curso` com UM vínculo passa — a regra é haver algum, não quais", () => {
    expect(conferirExigenciasDoPerfil("encarregado_curso", 1).atendida).toBe(true);
  });

  it("⚠️ `operador` com ZERO vínculos passa, e é o contrário do que parece", () => {
    // Ele não fica vazio: `geral` devolve TODOS os cursos. Tratar os dois perfis igual recusaria
    // uma conta perfeitamente válida.
    expect(conferirExigenciasDoPerfil("operador", 0).atendida).toBe(true);
  });

  it("os irrestritos passam com zero vínculos", () => {
    for (const perfil of IRRESTRITOS) {
      expect(conferirExigenciasDoPerfil(perfil, 0).atendida, perfil).toBe(true);
    }
  });
});

describe("a dica que a tela mostra antes de alguém errar", () => {
  it("são TRÊS frases distintas, uma por grupo", () => {
    const frases = new Set([
      dicaDoPerfil("encarregado_curso"),
      dicaDoPerfil("operador"),
      dicaDoPerfil("admin"),
    ]);
    expect(frases.size).toBe(3);
  });

  it("a do `encarregado_curso` manda escolher curso; a do `operador` fala de restrição", () => {
    expect(dicaDoPerfil("encarregado_curso")).toContain("escolha ao menos um");
    expect(dicaDoPerfil("operador")).toContain("restringe");
    expect(dicaDoPerfil("admin")).toContain("todos os cursos");
  });
});

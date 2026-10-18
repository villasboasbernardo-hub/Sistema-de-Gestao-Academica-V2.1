/**
 * A entrada ativa do menu — a regra única, `entradaAtiva()` (`FR-021` da spec 008; conferência do PR #67).
 *
 * ⚠️ **ATÉ 17/10/2026 ELA NÃO TINHA TESTE DE UNIDADE.** O defeito do PR #67 era de quem a CHAMAVA (o
 * caminho preso ao layout) — e, com o caminho solto, apareceu um segundo, **da própria regra**: a
 * Administração se apagava em Permissões e Salas, consertado com `ativaSob`. Este arquivo existe para
 * que a folha de cliente que passou a chamá-la (`components/casca/entrada-do-menu.tsx`) dependa de uma
 * regra provada.
 *
 * ⚠️ **ADMINISTRAÇÃO É O CASO QUE DISCRIMINA**: a entrada aponta para `/admin/usuarios`, e a regra por
 * prefixo da própria rota a apagava em `/admin/permissoes` e `/admin/salas`. Com o caminho preso, o
 * defeito ficava escondido — o menu continuava marcando a tela de entrada.
 */
import { describe, expect, it } from "vitest";

import { entradaAtiva } from "@/lib/navegacao/menu";

const ativa = (caminho: string) => entradaAtiva(caminho)?.rotulo;

describe("`entradaAtiva` · a entrada do menu que o caminho acende", () => {
  it("a própria rota acende a entrada", () => {
    expect(ativa("/inicio")).toBe("Início");
    expect(ativa("/turmas")).toBe("Turmas");
    expect(ativa("/cursos")).toBe("Cursos");
    expect(ativa("/disciplinas")).toBe("Disciplinas");
    expect(ativa("/instrutores")).toBe("Instrutores");
  });

  it("a tela de detalhe acende a entrada da lista, por prefixo de segmento", () => {
    expect(ativa("/turmas/C-Ap-FR%202026")).toBe("Turmas");
    expect(ativa("/turmas/C-Ap-FR%202026/dsa")).toBe("Turmas");
    expect(ativa("/cursos/C-Ap-FR/editar")).toBe("Cursos");
    expect(ativa("/instrutores/15")).toBe("Instrutores");
  });

  it("⚠️ prefixo de TEXTO não é prefixo de segmento", () => {
    expect(ativa("/turmasx")).toBeUndefined();
    expect(ativa("/cursos-antigos")).toBeUndefined();
  });

  it("⚠️ toda tela da Administração acende a entrada Administração", () => {
    expect(ativa("/admin/usuarios")).toBe("Administração");
    expect(ativa("/admin/usuarios/novo")).toBe("Administração");
    expect(ativa("/admin/permissoes")).toBe("Administração");
    expect(ativa("/admin/salas")).toBe("Administração");
  });

  it("fora do menu, nada acende", () => {
    expect(ativa("/")).toBeUndefined();
    expect(ativa("/perfil")).toBeUndefined();
    expect(ativa("/estilo")).toBeUndefined();
  });
});

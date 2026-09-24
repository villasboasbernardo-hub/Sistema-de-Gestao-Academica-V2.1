/**
 * `FR-004` · a montagem da consulta do catálogo, e o motivo do vazio.
 *
 * ⚠️ **ELA RECEBE O CONSTRUTOR E DEVOLVE O CONSTRUTOR** — o mesmo desenho de
 * `app/(app)/instrutores/consulta.ts`. Quem executa é a página; separar a montagem é o que permite
 * provar **o que a consulta pede ao banco** sem banco nenhum. Pelo navegador isso não se observa:
 * ele nunca vê a consulta.
 *
 * ⚠️ **O MOTIVO DO VAZIO É O QUE O `FR-047` COBRA, E ELE TEM TRÊS VALORES.** *"Não há"*, *"você não
 * vê"* e *"ainda não existe no sistema"* são três fatos diferentes, e a tela que mostra o mesmo
 * texto para os três ensina a pessoa a concluir "não tem curso cadastrado" quando o que houve foi
 * recorte de perfil. A Production hoje é o terceiro caso.
 *
 * Origem: `FR-004`, `FR-012`, `FR-047` da spec 009.
 */
import { describe, expect, it } from "vitest";

import {
  alcanceDoPerfil,
  COLUNAS_DO_CATALOGO,
  montarConsultaDeCursos,
  motivoDoVazio,
  PARAMETROS_SEM_RECORTE,
  type ParametrosDoCatalogo,
} from "@/app/(app)/cursos/consulta";

/** Um construtor de mentira que anota o que foi pedido, na ordem. */
function espiao() {
  const chamadas: string[] = [];
  const c = {
    eq(coluna: string, valor: unknown) {
      chamadas.push(`eq(${coluna}=${String(valor)})`);
      return c;
    },
    order(coluna: string, opcoes: { ascending: boolean }) {
      chamadas.push(`order(${coluna},${opcoes.ascending ? "asc" : "desc"})`);
      return c;
    },
  };
  return { c, chamadas };
}

const com = (p: Partial<ParametrosDoCatalogo>): ParametrosDoCatalogo => ({
  ...PARAMETROS_SEM_RECORTE,
  ...p,
});

describe("`FR-004` · os três filtros chegam ao banco", () => {
  it("sem recorte, pede só quem está ativo — e ordena", () => {
    const { c, chamadas } = espiao();
    montarConsultaDeCursos(c, PARAMETROS_SEM_RECORTE);
    expect(chamadas).toEqual(["eq(status=ativo)", "order(codigo,asc)"]);
  });

  it("⚠️ o padrão da situação é `ativo`, e ele vai ao banco mesmo sem aparecer na URL", () => {
    // `/cursos` limpo já significa "ativos", como em `/instrutores`. Se o padrão não fosse aplicado,
    // a tela abriria com os desativados misturados e ninguém notaria até alguém reparar num curso
    // que saiu de oferta em 2019.
    expect(PARAMETROS_SEM_RECORTE.situacao).toBe("ativo");
  });

  it("`?situacao=inativo` troca o recorte, não o acrescenta", () => {
    const { c, chamadas } = espiao();
    montarConsultaDeCursos(c, com({ situacao: "inativo" }));
    expect(chamadas.filter((x) => x.startsWith("eq(status"))).toEqual(["eq(status=inativo)"]);
  });

  it("classificação e modalidade entram quando vêm, e só então", () => {
    const { c, chamadas } = espiao();
    montarConsultaDeCursos(c, com({ classificacao: "regular", modalidade: "ead" }));
    expect(chamadas).toEqual([
      "eq(status=ativo)",
      "eq(classificacao=regular)",
      "eq(modalidade=ead)",
      "order(codigo,asc)",
    ]);
  });

  it("⚠️ vazio não vira filtro — é ausência de recorte, não recorte por vazio", () => {
    const { c, chamadas } = espiao();
    montarConsultaDeCursos(c, com({ classificacao: "", modalidade: "" }));
    expect(chamadas.some((x) => x.includes("classificacao"))).toBe(false);
    expect(chamadas.some((x) => x.includes("modalidade"))).toBe(false);
  });

  it("⚠️ é UMA consulta: nenhum pedido por grupo, nenhum por curso (`FR-012`)", () => {
    const { c, chamadas } = espiao();
    montarConsultaDeCursos(c, com({ classificacao: "regular" }));
    expect(chamadas.filter((x) => x.startsWith("order"))).toHaveLength(1);
    expect(chamadas.length, "mais pedidos do que filtros: a consulta cresceu").toBeLessThanOrEqual(
      4,
    );
  });

  it("devolve o mesmo construtor que recebeu — quem executa é a página", () => {
    const { c } = espiao();
    expect(montarConsultaDeCursos(c, PARAMETROS_SEM_RECORTE)).toBe(c);
  });
});

describe("as colunas pedidas bastam para os cartões e para os indicadores", () => {
  it("traz o que o cartão mostra e o que o agregado conta", () => {
    for (const coluna of [
      "codigo",
      "nome_curso",
      "classificacao",
      "modalidade",
      "proposito",
      "duracao_dias",
      "duracao_semanas",
      "status",
    ]) {
      expect(COLUNAS_DO_CATALOGO, `${coluna} não é pedida`).toContain(coluna);
    }
  });

  it("⚠️ e NÃO pede `select *` — coluna nova apareceria na tela sem ninguém decidir", () => {
    expect(COLUNAS_DO_CATALOGO).not.toContain("*");
  });
});

describe("`FR-047` · o vazio diz qual dos três vazios é", () => {
  const cheio = { cursosMostrados: 3, haRecorte: false, alcanceDoPerfil: "todos" } as const;

  it("com curso na tela, não há motivo nenhum", () => {
    expect(motivoDoVazio(cheio)).toBeNull();
    expect(motivoDoVazio({ ...cheio, haRecorte: true })).toBeNull();
  });

  it("vazio COM recorte é *não há* — para estes filtros", () => {
    expect(motivoDoVazio({ cursosMostrados: 0, haRecorte: true, alcanceDoPerfil: "todos" })).toBe(
      "nao-ha",
    );
    expect(
      motivoDoVazio({ cursosMostrados: 0, haRecorte: true, alcanceDoPerfil: "recortado" }),
    ).toBe("nao-ha");
  });

  it("⚠️ vazio SEM recorte, com perfil recortado, é *você não vê* — nunca *não há*", () => {
    // O Operador de escopo `expedito` não tem como saber se há curso que ele não alcança. Dizer-lhe
    // "não há curso cadastrado" seria afirmar sobre o que a consulta dele não pode ver.
    expect(
      motivoDoVazio({ cursosMostrados: 0, haRecorte: false, alcanceDoPerfil: "recortado" }),
    ).toBe("nao-ve");
  });

  it("⚠️ vazio SEM recorte, com alcance total, é *ainda não existe* — a Production de hoje", () => {
    expect(motivoDoVazio({ cursosMostrados: 0, haRecorte: false, alcanceDoPerfil: "todos" })).toBe(
      "ainda-nao-existe",
    );
  });

  it("⚠️ o caso que discrimina: o MESMO vazio, e o motivo muda só pelo alcance", () => {
    const vazio = { cursosMostrados: 0, haRecorte: false } as const;
    expect(motivoDoVazio({ ...vazio, alcanceDoPerfil: "todos" })).not.toBe(
      motivoDoVazio({ ...vazio, alcanceDoPerfil: "recortado" }),
    );
  });

  it("os três motivos são exatamente estes — nenhum quarto entrou", () => {
    const vistos = new Set(
      [true, false].flatMap((haRecorte) =>
        (["todos", "recortado"] as const).map((alcanceDoPerfil) =>
          motivoDoVazio({ cursosMostrados: 0, haRecorte, alcanceDoPerfil }),
        ),
      ),
    );
    expect([...vistos].sort()).toEqual(["ainda-nao-existe", "nao-ha", "nao-ve"]);
  });
});

describe("`FR-047` · quem enxerga o catálogo inteiro, e quem não", () => {
  it("os sete perfis sem recorte alcançam tudo — o mesmo de `app.cursos_do_usuario()`", () => {
    for (const perfil of [
      "admin",
      "chefe_departamento_ensino",
      "visualizacao",
      "encarregado_administracao_academica",
      "ajudante_administracao_academica",
      "encarregado_orientacao_pedagogica",
      "ajudante_orientacao_pedagogica",
    ]) {
      expect(alcanceDoPerfil(perfil, null), perfil).toBe("todos");
    }
  });

  it("`encarregado_curso` é recortado — ele responde por cursos, não pelo catálogo", () => {
    expect(alcanceDoPerfil("encarregado_curso", "geral")).toBe("recortado");
  });

  it("⚠️ `operador` depende do escopo, e é o caso que discrimina", () => {
    expect(alcanceDoPerfil("operador", "geral")).toBe("todos");
    expect(alcanceDoPerfil("operador", "expedito")).toBe("recortado");
  });

  it("⚠️ perfil desconhecido e sessão ausente caem em `recortado` — o erro seguro", () => {
    // Errar para "recortado" diz "você não vê" onde caberia "ainda não existe": impreciso e honesto.
    // Errar para "todos" afirmaria "não há curso cadastrado" a quem só não alcança nenhum.
    expect(alcanceDoPerfil("perfil_que_ainda_nao_existe", "geral")).toBe("recortado");
    expect(alcanceDoPerfil(null, null)).toBe("recortado");
    expect(alcanceDoPerfil(undefined, undefined)).toBe("recortado");
  });
});

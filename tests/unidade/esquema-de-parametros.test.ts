/**
 * A degradação dos parâmetros da URL (`FR-006`, `FR-007`, `FR-041`, `SC-008`, `SC-017`).
 *
 * ⚠️ O QUE SE PROVA AQUI É QUE A TELA ABRE MESMO ASSIM. Com o `RF-NAV-01`, a barra de endereço vira
 * entrada de usuário — e link velho, truncado ou editado à mão é **acidente**. Recusá-lo
 * transformaria um favorito antigo numa tela de erro.
 *
 * ⚠️ O ÚNICO QUE RECUSA É O DESTINO DE RETORNO, e ele vive noutro arquivo. A distinção entre
 * degradar e recusar é a distinção entre acidente e intenção.
 */
import { describe, expect, it } from "vitest";

import { lerParametro, lerParametros } from "@/lib/navegacao/esquema";

const url = (consulta: string) => new URLSearchParams(consulta);

describe("`FR-006` · valor fora do domínio usa o padrão, E PRESERVA OS DEMAIS", () => {
  it("o inválido cai para o padrão", () => {
    const { valores } = lerParametros("/inicio", url("classificacao=inexistente"));
    expect(valores.classificacao).toBe("");
  });

  it("⚠️ o parâmetro VÁLIDO ao lado do inválido sobrevive", () => {
    // É a metade do requisito que se esquece: degradar um não pode apagar o outro. Um link com um
    // valor podre continua sendo um link com um recorte bom.
    const { valores } = lerParametros("/inicio", url("classificacao=inexistente&modalidade=ead"));
    expect(valores.classificacao).toBe("");
    expect(valores.modalidade).toBe("ead");
  });

  it("o descarte é REGISTRADO, não engolido", () => {
    // ⚠️ Degradar não é engolir. A tela funciona, e o que foi descartado fica disponível para quem
    // quiser registrar — o requisito de observabilidade disso ainda não existe, e está declarado.
    const { descartes } = lerParametros("/inicio", url("classificacao=inexistente"));
    expect(descartes).toEqual([
      { parametro: "classificacao", motivo: "fora-do-dominio", recebido: "inexistente" },
    ]);
  });

  it("valor válido passa inteiro — controle positivo", () => {
    const { valores, descartes } = lerParametros("/inicio", url("classificacao=especial"));
    expect(valores.classificacao).toBe("especial");
    expect(descartes).toEqual([]);
  });

  it("ausente e vazio valem o padrão, e nenhum dos dois é descarte", () => {
    for (const consulta of ["", "classificacao="]) {
      const { valores, descartes } = lerParametros("/inicio", url(consulta));
      expect(valores.classificacao).toBe("");
      expect(descartes.filter((d) => d.parametro === "classificacao")).toEqual([]);
    }
  });
});

describe("`FR-007` · parâmetro fora do contrato é ignorado, e a tela não quebra", () => {
  it("ele não aparece nos valores", () => {
    const { valores } = lerParametros("/inicio", url("parametro_inventado=1&modalidade=ead"));
    expect(Object.keys(valores).sort()).toEqual(["classificacao", "modalidade"]);
    expect(valores.modalidade).toBe("ead");
  });

  it("mas é registrado — ignorar em silêncio absoluto esconderia a tela que o mandou", () => {
    const { descartes } = lerParametros("/inicio", url("parametro_inventado=1"));
    expect(descartes).toContainEqual({
      parametro: "parametro_inventado",
      motivo: "fora-do-contrato",
      recebido: "1",
    });
  });

  it("uma rota SEM parâmetros ignora tudo e não estoura", () => {
    // A vitrine não recorta nada, e isso é declaração, não omissão.
    expect(() => lerParametros("/estilo", url("qualquer=coisa"))).not.toThrow();
    expect(lerParametros("/estilo", url("qualquer=coisa")).valores).toEqual({});
  });
});

describe("`SC-008` · tudo inválido de uma vez, e a tela ainda abre", () => {
  it("nenhuma exceção, e todo parâmetro no padrão", () => {
    const { valores, descartes } = lerParametros(
      "/inicio",
      url("classificacao=<script>&modalidade=%00&lixo=1&outro=2"),
    );
    expect(valores.classificacao).toBe("");
    expect(valores.modalidade).toBe("");
    expect(descartes.length).toBeGreaterThanOrEqual(4);
  });

  it("carga hostil não vira nada além de texto descartado", () => {
    // ⚠️ O risco principal NÃO é marcação refletida — a camada de renderização já escapa texto. O
    // que este caso garante é que a carga **nem chega** a um valor aceito.
    const hostis = [
      "<img src=x onerror=alert(1)>",
      "javascript:alert(1)",
      "'; drop table cursos; --",
      "../../etc/passwd",
    ];
    for (const carga of hostis) {
      const { valores } = lerParametros(
        "/inicio",
        url(`classificacao=${encodeURIComponent(carga)}`),
      );
      expect(valores.classificacao, `aceitou carga hostil: ${carga}`).toBe("");
    }
  });
});

describe("a entrada pode vir do navegador ou do servidor", () => {
  it("aceita o objeto que o servidor entrega", () => {
    const { valores } = lerParametros("/inicio", { modalidade: "presencial" });
    expect(valores.modalidade).toBe("presencial");
  });

  it("valor repetido em parâmetro de valor único fica com o primeiro", () => {
    const { valores } = lerParametros("/inicio", url("modalidade=ead&modalidade=presencial"));
    expect(valores.modalidade).toBe("ead");
  });

  it("`lerParametro` é atalho do mesmo resultado", () => {
    expect(lerParametro("/inicio", "modalidade", url("modalidade=ead"))).toBe("ead");
  });
});

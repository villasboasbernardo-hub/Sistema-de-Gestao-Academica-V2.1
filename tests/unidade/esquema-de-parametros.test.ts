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

  it("uma rota sem NENHUM parâmetro reconhecido devolve todos os padrões e não estoura", () => {
    /*
     * ⚠️ ESTE CASO JÁ FOI "a rota sem parâmetros", E A VITRINE DEIXOU DE SER UMA. Medido em
     * 11/09/2026: a amostra de estado na URL da fatia (a) escrevia `?demo=` sem que contrato nenhum
     * o declarasse — a primeira tela a infringir o `FR-001` foi a nossa. Declarar os parâmetros da
     * vitrine fechou o furo, e o que este caso passa a guardar é o mesmo comportamento pelo outro
     * lado: entrada inteiramente estranha não produz valor estranho.
     */
    const { valores, descartes } = lerParametros("/estilo", url("qualquer=coisa"));
    expect(valores).toEqual({ demo: "", categoria: "", etiquetas: [], busca: "" });
    expect(descartes).toEqual([
      { parametro: "qualquer", motivo: "fora-do-contrato", recebido: "coisa" },
    ]);
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

describe("a lista degrada por ITEM, e chega nas duas codificações", () => {
  it("separada por vírgula — é o que este sistema escreve", () => {
    expect(lerParametros("/estilo", url("etiquetas=x,y")).valores.etiquetas).toEqual(["x", "y"]);
  });

  it("chave repetida — é o que outra ferramenta pode montar", () => {
    /*
     * ⚠️ ACEITAR AS DUAS É DELIBERADO. Com o `RF-NAV-01` a barra de endereço é entrada de usuário, e
     * quem cola um link montado fora daqui não sabe qual forma este sistema escolheu. Recusar a
     * forma alheia devolveria uma lista vazia **em silêncio**, que é pior que devolver erro.
     */
    expect(lerParametros("/estilo", url("etiquetas=x&etiquetas=y")).valores.etiquetas).toEqual([
      "x",
      "y",
    ]);
  });

  it("⚠️ um item podre no meio NÃO apaga os bons", () => {
    // Transformar um erro de digitação em perda do recorte inteiro é o defeito que este caso impede.
    const { valores, descartes } = lerParametros("/estilo", url("etiquetas=x,inventada,z"));
    expect(valores.etiquetas).toEqual(["x", "z"]);
    expect(descartes).toEqual([
      { parametro: "etiquetas", motivo: "item-invalido", recebido: "inventada" },
    ]);
  });

  it("lista inteiramente podre cai para o padrão, e a tela abre", () => {
    expect(lerParametros("/estilo", url("etiquetas=nada,disso")).valores.etiquetas).toEqual([]);
  });
});

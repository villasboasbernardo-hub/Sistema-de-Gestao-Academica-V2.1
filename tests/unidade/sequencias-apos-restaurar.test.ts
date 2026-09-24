/**
 * **Quem põe dado no banco em massa avança as sequências de código** — senão a primeira criação na
 * tela falha com `23505`.
 *
 * ⚠️ **ISTO NASCEU DE UM DEFEITO REAL, achado na conferência de Bernardo em 24/09/2026.** Criar
 * curso no local falhava com *"Já existe um registro com este valor"* e **dados inéditos**:
 * `dado_do_remoto.py` copia só o schema `public`, e as sequências de código vivem em **`app`** —
 * voltavam ao início, e o código gerado colidia com um que o retrato acabara de trazer. A carga do
 * ETL nunca sofreu porque avança as sequências ao fim da promoção.
 *
 * ⚠️ **O MODO DE FALHA É O PIOR POSSÍVEL: ele não aparece em nenhuma suíte.** As suítes semeiam a
 * própria amostra num banco recém-resetado, onde as sequências estão no lugar; o defeito só aparece
 * na **primeira escrita de quem usa o sistema**, depois de uma restauração — e a mensagem manda
 * procurar um valor repetido que não existe.
 *
 * ⚠️ **A LISTA DE SEQUÊNCIAS É UMA SÓ, em `carregar.SEQUENCIAS_DE_CODIGO`.** Uma segunda cópia dela
 * divergiria no dia em que uma sequência nova nascesse — e o sintoma seria este mesmo erro, meses
 * depois, em quem restaurou.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();

/**
 * Indícios de que o arquivo **restaura ou carrega** dado em massa — ele mesmo, não por delegação.
 *
 * ⚠️ **LER A `staging` NÃO É ESCREVER A PARTIR DELA, e a segunda versão confundiu os dois:**
 *    `reconciliar.py` faz `select … from staging.…` para comparar, e foi acusado. Por isso o
 *    critério é a **conjunção** — escrever em `public` **e** citar a `staging` —, ou restaurar um
 *    dump (`--data-only`, `pg_restore`).
 *
 * ⚠️ **CHAMAR QUEM RESTAURA NÃO É RESTAURAR, e a primeira versão desta varredura confundiu os
 *    dois.** `executar.py` chama `promover.promover()` e foi acusado; quem escreve em `public` a
 *    partir da `staging` é o `promover.py`, e ele **já** avança. Uma varredura que acusa o
 *    orquestrador manda acrescentar a chamada em dois lugares — e duas chamadas da mesma função é
 *    como nasce a divergência que ela existe para impedir.
 */
const RESTAURA = (codigo: string) =>
  /--data-only|pg_restore/.test(codigo) ||
  (/insert into public/.test(codigo) && /staging/.test(codigo));

/** Quem chama a função única. */
const AVANCA = /avancar_sequencias/;

function pythonDe(pasta: string): string[] {
  const caminho = resolve(RAIZ, pasta);
  return readdirSync(caminho).flatMap((nome) => {
    const completo = join(caminho, nome);
    if (statSync(completo).isDirectory()) return pythonDe(relative(RAIZ, completo));
    return nome.endsWith(".py") ? [relative(RAIZ, completo).replaceAll("\\", "/")] : [];
  });
}

/** Sem comentário e sem docstring: o cabeçalho que **explica** a regra não é uso dela. */
function semComentario(fonte: string): string {
  return fonte.replace(/"""[\s\S]*?"""/g, " ").replace(/(^|\s)#[^\n]*/g, "$1 ");
}

describe("toda restauração em massa avança as sequências de código", () => {
  const arquivos = () =>
    pythonDe("scripts").map((caminho) => ({
      caminho,
      codigo: semComentario(readFileSync(resolve(RAIZ, caminho), "utf8")),
    }));

  it("há script para varrer — controle positivo", () => {
    expect(arquivos().length, "a varredura não achou os scripts").toBeGreaterThan(10);
  });

  it("⚠️ nenhum caminho de restauração esquece as sequências", () => {
    /*
     * ⚠️ AS PROVAS FICAM DE FORA, e com motivo: `provar_sequencias_apos_copia.py` põe as sequências
     *    **no início** de propósito, para reproduzir o defeito. Exigir dela o avanço seria exigir
     *    que ela deixasse de medir o que mede.
     */
    const faltando = arquivos()
      .filter((a) => !a.caminho.includes("/provar_"))
      .filter((a) => RESTAURA(a.codigo) && !AVANCA.test(a.codigo))
      .map((a) => a.caminho);

    expect(
      faltando,
      `restaura dado e NÃO avança as sequências: ${faltando.join(", ")}. Chame ` +
        `\`carregar.avancar_sequencias\` depois de restaurar — sem isso, a primeira criação na ` +
        `tela falha com 23505 e a mensagem manda procurar um valor repetido que não existe.`,
    ).toEqual([]);
  });

  it("os dois caminhos que existem hoje estão cobertos", () => {
    const cobertos = arquivos()
      .filter((a) => AVANCA.test(a.codigo))
      .map((a) => a.caminho)
      .sort();
    expect(cobertos).toContain("scripts/etl/promover.py");
    expect(cobertos).toContain("scripts/manutencao/dado_do_remoto.py");
  });

  it("⚠️ e a varredura PEGA o defeito — controle positivo com fonte sintética", () => {
    const comDefeito = 'subprocess.run(["supabase","db","dump","--data-only"])\\nrestaurar()';
    expect(RESTAURA(comDefeito) && !AVANCA.test(comDefeito)).toBe(true);

    const consertado = `${comDefeito}\\ncarregar.avancar_sequencias(con)`;
    expect(RESTAURA(consertado) && !AVANCA.test(consertado)).toBe(false);
  });

  it("⚠️ a lista de sequências é ÚNICA — ninguém escreve `setval` por fora", () => {
    /*
     * ⚠️ `setval` fora de `carregar.py` é uma segunda implementação nascendo. As provas podem usá-lo
     *    — é assim que elas reproduzem o defeito —, e por isso só elas são exceção.
     */
    const porFora = arquivos()
      .filter((a) => !a.caminho.includes("/provar_"))
      .filter((a) => a.caminho !== "scripts/etl/carregar.py")
      .filter((a) => /setval\s*\(/.test(a.codigo))
      .map((a) => a.caminho);

    expect(
      porFora,
      `\`setval\` fora de \`carregar.py\`: ${porFora.join(", ")}. A lista de sequências mora num ` +
        `lugar só — uma segunda cópia diverge no dia em que uma sequência nova nascer.`,
    ).toEqual([]);
  });
});

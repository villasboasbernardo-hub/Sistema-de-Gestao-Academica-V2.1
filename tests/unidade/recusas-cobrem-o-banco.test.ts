/**
 * `FR-011` · **toda chave de recusa que o banco emite tem tradução** — e o portão lê o SQL.
 *
 * ⚠️ **ESTE ARQUIVO EXISTE PORQUE A DIVERGÊNCIA É MUDA.** Em 23/09/2026 o contrato §2 nomeava
 * `vigencia_parametro_imutavel` e o banco emitia **`vigencia_imutavel`**: a tradução simplesmente
 * **nunca disparava**, e a pessoa recebia a frase genérica sem que nada acusasse. Não há erro, não
 * há vermelho, não há log — só uma mensagem pior do que deveria. Um `switch` com chave errada é
 * indistinguível de um `switch` correto sobre um erro que não aconteceu.
 *
 * ⚠️ **A VARREDURA LÊ AS MIGRATIONS, NÃO O BANCO**, e é decisão. As migrations são a fonte: o que
 * está nelas é o que será aplicado nos dois bancos. Ler o banco local acusaria o que **está** lá,
 * que pode estar adiantado ou atrasado em relação ao repositório — e o teste roda em `test:unidade`,
 * sem Docker, em segundos.
 *
 * ⚠️ **E ELA REMOVE COMENTÁRIO ANTES DE CONTAR** (regra 9.1.1). O cabeçalho de várias migrations
 * **cita** chaves para explicar a recusa, inclusive nas linhas de reversão; contar a menção como
 * emissão faria a lista crescer com chaves que ninguém levanta, e lista que cresce sem motivo manda
 * traduzir o que não existe.
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { traduzirRecusa } from "@/lib/acoes/traducao-de-recusas";

const PASTA = resolve(process.cwd(), "supabase/migrations");

/** ⚠️ Sem comentário de linha (`--`) nem de bloco. Uso mencionado não é uso. */
function semComentario(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

/**
 * As chaves que **não** precisam de frase de interface, e o arquivo onde cada uma vive.
 *
 * ⚠️ **A ISENÇÃO É POR ONDE A RECUSA CHEGA, não por conveniência.** `destino_inexistente` é levantada
 * pela migration da **carga das UEs**: ela aborta um `db push` num terminal, e quem a lê é quem está
 * aplicando a migration — não há tela envolvida. Escrever uma frase de interface para ela seria
 * inventar uma mensagem que ninguém vai ver, e o custo real disso é diluir a lista: quanto mais
 * frases inúteis, menos a próxima lacuna de verdade chama atenção.
 *
 * ⚠️ **E A ISENÇÃO É GUARDADA** — o caso abaixo exige que a chave apareça **só** no arquivo
 * declarado. No dia em que uma RPC de tela passar a levantá-la, a isenção deixa de valer e o
 * vermelho volta.
 */
const SEM_FRASE_DE_TELA: Readonly<Record<string, string>> = {
  destino_inexistente: "20260926024246_carga_unidades_ensino.sql",
};

/** Toda chave que alguma migration levanta em `hint = '…'`, com os arquivos onde aparece. */
function emissoesPorChave(): ReadonlyMap<string, readonly string[]> {
  const achadas = new Map<string, string[]>();
  for (const nome of readdirSync(PASTA).filter((n) => n.endsWith(".sql"))) {
    const sql = semComentario(readFileSync(resolve(PASTA, nome), "utf8"));
    for (const casamento of sql.matchAll(/hint\s*=\s*'([a-z0-9_]+)'/gi)) {
      const chave = casamento[1];
      if (!chave) continue;
      const arquivos = achadas.get(chave) ?? [];
      if (!arquivos.includes(nome)) arquivos.push(nome);
      achadas.set(chave, arquivos);
    }
  }
  return achadas;
}

function chavesQueOBancoEmite(): readonly string[] {
  return [...emissoesPorChave().keys()].sort();
}

/**
 * A frase genérica do `42501`. Quando a tradução **não** reconhece a chave, é nela que a recusa cai —
 * e é exatamente isso que este arquivo existe para pegar.
 */
function caiNoGenerico(chave: string): boolean {
  const mensagem = traduzirRecusa({
    code: "42501",
    message: `recusa de teste (${chave})`,
    hint: chave,
  });
  return mensagem === traduzirRecusa({ code: "42501", message: "recusa sem chave" });
}

describe("`FR-011` · o contrato de recusas cobre o que o banco emite", () => {
  it("a varredura acha chaves — controle positivo, sem o qual ela aprovaria o vazio", () => {
    const chaves = chavesQueOBancoEmite();
    expect(
      chaves.length,
      "nenhuma chave de recusa achada nas migrations — a expressão parou de casar",
    ).toBeGreaterThan(15);
  });

  it("⚠️ TODA chave que chega a uma TELA tem tradução própria", () => {
    const semTraducao = chavesQueOBancoEmite()
      .filter((chave) => !(chave in SEM_FRASE_DE_TELA))
      .filter(caiNoGenerico);
    expect(
      semTraducao,
      `chave emitida pelo banco e sem tradução: ${semTraducao.join(", ")}. ` +
        `Ela cai na frase genérica, e a pessoa não descobre o motivo real. ` +
        `Acrescente o caso em \`lib/acoes/traducao-de-recusas.ts\` — ou, se ela nunca chega a uma ` +
        `tela, declare-a em SEM_FRASE_DE_TELA com o arquivo onde vive.`,
    ).toEqual([]);
  });

  it("⚠️ e toda isenção continua valendo — ela vale por ONDE a recusa chega", () => {
    const emissoes = emissoesPorChave();
    for (const [chave, arquivoEsperado] of Object.entries(SEM_FRASE_DE_TELA)) {
      const arquivos = emissoes.get(chave);
      expect(
        arquivos,
        `isenção órfã: \`${chave}\` não é levantada por migration nenhuma`,
      ).toBeDefined();
      expect(
        arquivos,
        `\`${chave}\` passou a ser levantada fora de ${arquivoEsperado}. Se a origem nova é ` +
          `chamável de uma tela, a isenção não vale mais e ela precisa de frase.`,
      ).toEqual([arquivoEsperado]);
    }
  });

  it("⚠️ e a varredura PEGA uma chave sem tradução — controle com chave sintética", () => {
    // ⚠️ Sem isto, um `caiNoGenerico` que sempre devolvesse `false` faria o caso acima passar por
    //    guarda perfeita. A chave abaixo não existe em migration nenhuma, e tem de cair no genérico.
    expect(caiNoGenerico("chave_que_nunca_existiu_em_migration")).toBe(true);
  });

  it("as nove chaves da fatia (b) estão entre as emitidas — a varredura olha o lugar certo", () => {
    const chaves = chavesQueOBancoEmite();
    for (const esperada of [
      "registro_com_historico",
      "codigo_nao_confere",
      "rastro_imutavel",
      "periodo_fora_da_janela",
      "rateio_nao_fecha",
      "rateio_incompleto",
      "ue_sem_instrutor",
      "ue_sem_instrutor_ativo",
      "rateio_por_ue_com_ta",
    ]) {
      expect(chaves, `\`${esperada}\` não foi achada nas migrations`).toContain(esperada);
    }
  });
});

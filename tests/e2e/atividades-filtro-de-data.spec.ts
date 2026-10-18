/**
 * O filtro de período de `/atividades` — a data se **escolhe**, e a URL continua em ISO (FR-005.2 e
 * FR-005.3 da spec 016).
 *
 * > *"O filtro de período de `/atividades` MUST deixar de pedir texto em ISO; a pessoa escolhe a data, e a
 * > URL continua em ISO."* — FR-005.2
 *
 * ⚠️ **O CASO QUE DISCRIMINA É O TIPO DO CAMPO** (DoD 8): até 18/10/2026 os campos *"De (aaaa-mm-dd)"* e
 * *"Até (aaaa-mm-dd)"* eram texto livre — o `type="date"` abaixo não existia.
 *
 * ⚠️ **POR CLIQUE A PARTIR DO MENU**: *Atividades* → *Filtros* → a data.
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { limparDsa, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { abrirPainelDeFiltros } from "./filtros";

const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

let EMAIL = "";
let SEMEADO: DsaSemeado;
let PREFIXO = "";

/** Duas atividades da turma da semente, em meses diferentes — o filtro separa uma da outra. */
const ANTES = { data: "2026-03-10", descricao: "Atividade de março do filtro de data" };
const DEPOIS = { data: "2026-05-12", descricao: "Atividade de maio do filtro de data" };

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("atvdata", info.workerIndex);
  PREFIXO = `ATV-FD-${info.workerIndex}`;
  await criarConta(EMAIL, `USR-ATVD-${info.workerIndex}`);
  SEMEADO = await semearDsa(info.workerIndex, EMAIL);
  const { data: turma } = await admin
    .from("turmas")
    .select("id")
    .eq("codigo", SEMEADO.turmaComRelogio)
    .single();
  for (const [n, a] of [ANTES, DEPOIS].entries()) {
    const { error } = await admin.from("atividades_nao_letivas").upsert(
      {
        codigo: `${PREFIXO}-${n + 1}`,
        categoria_normativa: "AEC",
        escopo: "turma",
        turma_id: (turma as { id: string }).id,
        data: a.data,
        subtipo: "Palestra",
        descricao: a.descricao,
        ta_inicial: 1,
        tempos_consumidos: 1,
        local: SEMEADO.sala,
      },
      { onConflict: "codigo" },
    );
    if (error) throw new Error(`falha ao semear a atividade ${a.data}: ${error.message}`);
  }
});

test.afterAll(async () => {
  if (PREFIXO !== "") {
    await admin.from("atividades_nao_letivas").delete().like("codigo", `${PREFIXO}-%`);
  }
  await limparDsa(SEMEADO);
  await apagarConta(EMAIL);
});

test("menu Atividades → Filtros → a data no calendário: URL em ISO e a lista recortada", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await entrar(page, EMAIL, "/inicio");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Atividades", exact: true })
    .click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/atividades");
  const lista = page.locator('[data-slot="lista-de-atividades"]');
  await expect(lista).toContainText(ANTES.descricao);
  await expect(lista).toContainText(DEPOIS.descricao);

  await abrirPainelDeFiltros(page);
  const de = page.getByLabel("De", { exact: true });
  await expect(de).toHaveAttribute("type", "date");
  await expect(page.getByLabel("Até", { exact: true })).toHaveAttribute("type", "date");

  /* O valor do campo é ISO; o navegador o mostra em DD/MM/AAAA. */
  await de.fill("2026-04-01");
  await expect.poll(() => new URL(page.url()).searchParams.get("de")).toBe("2026-04-01");
  await expect(lista).toContainText(DEPOIS.descricao);
  await expect(lista).not.toContainText(ANTES.descricao);
  /* A data da linha continua em DD/MM/AAAA. */
  await expect(page.locator('[data-slot="tabela-de-atividades"]')).toContainText("12/05/2026");
});

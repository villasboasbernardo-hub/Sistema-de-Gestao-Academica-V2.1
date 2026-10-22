/**
 * O RETRATO DAS PÁGINAS — spec 021 (Bloco 6), a prova de que o PR 1 não muda texto nem número de tela: para cada
 * curso, a página nas seis abas (Sobre o Curso, Grade, Disciplinas, Avaliações, Atividades, Horários) e a de edição
 * (com o valor de cada campo); para cada turma, a ficha e a aba Avaliações; e o Início, o catálogo e a lista de turmas.
 * Tira-se ANTES (o código da `main`, o banco sem as migrations do Bloco 6) e DEPOIS (o código do ramo, o banco com
 * elas), na mesma cópia do remoto, e o `diff` dos dois arquivos tem de ser vazio.
 *
 * ⚠️ SÓ RODA COM `RETRATO_PAGINAS` (o caminho do JSON): é instrumento de medição, não caso da suíte. No CI fica pulado.
 * ⚠️ SÓ LEITURA, menos a conta Admin da sessão, que nasce e sai aqui.
 * ⚠️ O texto vem de `main` (a casca e a lateral ficam de fora: o submenu muda com o ano, não com o currículo), e os
 *    campos de formulário entram pelo VALOR — o `innerText` não mostra o que está digitado num campo.
 */
import { writeFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";

const SAIDA = process.env.RETRATO_PAGINAS ?? "";
const ABAS_DO_CURSO = [
  "sobre",
  // Spec 022 (Bloco 7): a aba *Grade* passou a *Turmas*.
  "turmas",
  "disciplinas",
  "avaliacoes",
  "atividades",
  "horarios",
  // Spec 021 (ajuste 2 da conferência do PR #82): a aba *Currículo*.
  "curriculo",
] as const;
const ABAS_DA_TURMA = ["ficha", "avaliacoes"] as const;

test.describe.configure({ mode: "serial" });

test.skip(SAIDA === "", "instrumento de medição: só com RETRATO_PAGINAS");

test("o retrato das páginas do curso e da turma", async ({ page }) => {
  test.setTimeout(3_600_000);
  const banco = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = emailDeTeste("retrato-paginas", 96);
  await criarConta(email, "USR-RETRATO-96", "admin");
  try {
    const [{ data: cursos }, { data: turmas }] = await Promise.all([
      banco.from("cursos").select("codigo").order("codigo"),
      banco.from("turmas").select("codigo").order("codigo"),
    ]);
    const enderecos: string[] = ["/inicio", "/cursos", "/turmas"];
    for (const c of (cursos ?? []) as { codigo: string }[]) {
      const base = `/cursos/${encodeURIComponent(c.codigo)}`;
      for (const aba of ABAS_DO_CURSO) enderecos.push(`${base}?aba=${aba}`);
      enderecos.push(`${base}/editar`);
      // Spec 021 (ajuste 3): as partes do currículo em *Editar curso* — os mesmos números, agora onde se editam.
      for (const parte of ["disciplinas", "horarios", "atividades"])
        enderecos.push(`${base}/editar?parte=${parte}`);
    }
    for (const t of (turmas ?? []) as { codigo: string }[]) {
      for (const aba of ABAS_DA_TURMA)
        enderecos.push(`/turmas/${encodeURIComponent(t.codigo)}?aba=${aba}`);
    }

    await entrar(page, email, "/inicio");
    const retrato: Record<string, { texto: string; campos: string[] }> = {};
    for (const endereco of enderecos) {
      await page.goto(endereco);
      await page.waitForLoadState("networkidle");
      const principal = page.locator("main").last();
      await expect(principal).toBeVisible({ timeout: 30_000 });
      await expect(principal.getByText("Carregando", { exact: false })).toHaveCount(0, {
        timeout: 30_000,
      });
      const texto = await principal.innerText();
      const campos = await principal.evaluate((m) =>
        Array.from(m.querySelectorAll("input, select, textarea")).map((e) => {
          const campo = e as HTMLInputElement;
          const nome = campo.name || campo.id || campo.getAttribute("aria-label") || campo.type;
          const valor =
            campo.type === "checkbox" || campo.type === "radio"
              ? String(campo.checked)
              : campo.value;
          return `${nome}=${valor}`;
        }),
      );
      retrato[endereco] = { texto, campos };
    }
    writeFileSync(SAIDA, `${JSON.stringify(retrato, null, 2)}\n`, "utf8");
  } finally {
    await apagarConta(email);
  }
});

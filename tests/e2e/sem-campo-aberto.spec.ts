/**
 * Spec 022 (Bloco 7), FR-002.1 e SC-001 — **nenhuma página de leitura tem campo de formulário aberto**.
 *
 * > *"Edição e cadastro SEMPRE em diálogo (formulário curto: UE, avaliação, regime) ou página própria (formulário
 * > longo: disciplina, curso) — nunca campos abertos na página. Modelo: a ficha do instrutor."*
 * > — Bernardo Villas Boas, 22/10/2026
 *
 * ⚠️ **O QUE CONTA COMO CAMPO ABERTO**: `input` (menos `hidden` e o de arquivo escondido), `textarea` e `select`
 *    VISÍVEIS no conteúdo da página, fora de diálogo. **Filtro e navegação não são formulário**: o filtro avançado, o
 *    ano do painel, a navegação da semana do DSA e a busca da lista ficam na lista do que é permitido — e a lista é
 *    curta e nomeada, para que um campo novo de edição não passe por ela.
 * ⚠️ **PÁGINA DE EDIÇÃO NÃO ENTRA**: *Editar curso*, a página própria da disciplina, o cadastro de turma, de curso, de
 *    instrutor e de usuário são formulários longos em página própria (D-1); a ficha do instrutor e a da turma abrem o
 *    formulário só depois de *Editar*.
 * ⚠️ **AS PÁGINAS SÃO VISITADAS PELO ENDEREÇO** — é uma guarda de propriedade das telas, como a de acessibilidade; o
 *    caminho por clique de cada uma é provado nos casos dela.
 * ⚠️ **COM CONTROLE POSITIVO**: o detector acha o campo de uma página de edição (*Editar curso*); varredura que não acha
 *    nada passaria igual se estivesse cega.
 * ⚠️ **AMOSTRA PRÓPRIA, E NÃO A COMPARTILHADA** (`semearCursos`): aquela cria turmas *expeditas EAD* no ano corrente, e
 *    `inicio.spec.ts` conta exatamente esse recorte — medido no CI do PR #84: com esta guarda semeando a amostra
 *    compartilhada, o caso do `FR-017.6` reprovou nas duas execuções. Aqui o curso é *regular presencial* e a turma é de
 *    **2044**, fora de qualquer recorte do ano de hoje. Idempotente (regra 9.1: curso não se apaga).
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";

let EMAIL = "";
let SIGLA = "";
let TURMA = "";

/** Um curso regular presencial e uma turma planejada de 2044, só desta guarda — reaproveitados se já existirem. */
async function semearAmostra(p: number): Promise<{ sigla: string; turma: string }> {
  const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const sigla = `CUR-SCA-${p}`;
  const { data: existente } = await admin
    .from("cursos")
    .select("id")
    .eq("codigo", sigla)
    .maybeSingle();
  let cursoId = existente?.id as string | undefined;
  if (!cursoId) {
    const { data: criado, error } = await admin.rpc("criar_curso_com_regime", {
      p_curso: {
        codigo: sigla,
        nome_curso: `Curso da guarda de campo aberto ${p}`,
        classificacao: "regular",
        modalidade: "presencial",
        duracao_dias: 30,
      },
      p_regime: {
        regime_tempos: 8,
        ta_duracao_min: 45,
        intervalo_manha_min: 10,
        intervalo_tarde_min: 10,
        hora_inicio_manha: "07:30",
        hora_inicio_tarde: "13:30",
        vigente_de: "2020-01-01",
      },
    });
    if (error) throw new Error(`falha ao semear ${sigla}: ${error.message}`);
    cursoId = (criado as { id: string }).id;
  }
  await admin.from("cursos").update({ status: "ativo" }).eq("id", cursoId);

  const { data: turmaExistente } = await admin
    .from("turmas")
    .select("codigo")
    .eq("curso_id", cursoId)
    .eq("ano_letivo", 2044)
    .maybeSingle();
  let turma = turmaExistente?.codigo as string | undefined;
  if (!turma) {
    const { data: nova, error } = await admin
      .from("turmas")
      .insert({
        curso_id: cursoId,
        ano_letivo: 2044,
        status: "planejada",
        modalidade: "presencial",
      })
      .select("codigo")
      .single();
    if (error) throw new Error(`falha ao semear a turma de ${sigla}: ${error.message}`);
    turma = nova.codigo as string;
  }
  return { sigla, turma };
}

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL = emailDeTeste("sem-campo-aberto", p);
  await criarConta(EMAIL, `USR-SCA-${p}`);
  ({ sigla: SIGLA, turma: TURMA } = await semearAmostra(p));
});

test.afterAll(async () => {
  await apagarConta(EMAIL);
});

/** Os contêineres de filtro e de navegação — os únicos com campo permitido numa página de leitura. */
const PERMITIDOS = [
  '[data-slot="filtro-avancado"]',
  '[data-slot="filtro-do-panorama"]',
  '[data-slot="ano-do-painel"]',
  '[data-slot="navegacao-da-semana"]',
  '[data-slot="busca-de-usuarios"]',
];

/** Os campos abertos da página, com um retrato curto de cada um para a mensagem. */
async function camposAbertos(page: Page): Promise<string[]> {
  return page.evaluate((permitidos) => {
    // ⚠️ `#conteudo`, e não `main`: durante o carregamento há DOIS `main` (o do `loading.tsx` e o da casca).
    const principal = document.querySelector("#conteudo") ?? document.body;
    const campos = principal.querySelectorAll<HTMLElement>("input, textarea, select");
    return [...campos]
      .filter((c) => {
        if (c instanceof HTMLInputElement && (c.type === "hidden" || c.type === "file"))
          return false;
        if (c.closest('[role="dialog"], [role="alertdialog"]')) return false;
        if (permitidos.some((p) => c.closest(p))) return false;
        const caixa = c.getBoundingClientRect();
        const estilo = getComputedStyle(c);
        return caixa.width > 0 && caixa.height > 0 && estilo.visibility !== "hidden";
      })
      .map((c) => {
        const dono = c.closest("[data-slot]")?.getAttribute("data-slot") ?? "?";
        const nome =
          c.getAttribute("name") ?? c.getAttribute("id") ?? c.getAttribute("aria-label") ?? "";
        return `${c.tagName.toLowerCase()}[${nome}] em [data-slot=${dono}]`;
      });
  }, PERMITIDOS);
}

async function conferir(page: Page, caminho: string): Promise<void> {
  await page.goto(caminho);
  // ⚠️ Espera o `loading.tsx` sair: enquanto ele está montado, a página ainda não desenhou os campos dela.
  await expect(page.locator('main[aria-busy="true"]')).toHaveCount(0, { timeout: 20_000 });
  await expect(page.locator("#conteudo")).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(await camposAbertos(page), `campo aberto na página de leitura ${caminho}`).toEqual([]);
}

test("controle positivo: o detector acha os campos de uma página de edição", async ({ page }) => {
  await entrar(page, EMAIL, `/cursos/${encodeURIComponent(SIGLA)}/editar`);
  await expect(page.locator('[data-slot="formulario-de-curso"]')).toBeVisible();
  expect((await camposAbertos(page)).length).toBeGreaterThan(0);
});

test("as páginas de leitura não têm campo aberto", async ({ page }) => {
  test.setTimeout(180_000);
  const sigla = encodeURIComponent(SIGLA);
  const turma = encodeURIComponent(TURMA);
  await entrar(page, EMAIL, "/inicio");
  for (const caminho of [
    "/inicio",
    "/avisos",
    "/cursos",
    ...["sobre", "turmas", "disciplinas", "avaliacoes", "atividades", "horarios", "curriculo"].map(
      (aba) => `/cursos/${sigla}?aba=${aba}`,
    ),
    "/turmas",
    `/turmas/${turma}`,
    `/turmas/${turma}?aba=avaliacoes`,
    `/turmas/${turma}/dsa`,
    "/instrutores",
    "/perfil",
    "/admin/salas",
    "/admin/usuarios",
  ]) {
    await conferir(page, caminho);
  }
});

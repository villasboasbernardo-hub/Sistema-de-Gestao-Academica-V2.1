/**
 * Bloco 16 (spec 031) — o formulário de lançamento do DSA, mais de um instrutor por aula, o pé do cartão e as abas de
 * acompanhamento. Tudo por clique, a partir da ficha da turma; `entrar` só para o ponto de partida.
 *
 * ⚠️ **A SEMANA É ESCOLHIDA NA HORA** (como em `bloco-15.spec.ts`): a primeira candidata sem evento da publicação na
 *    turma do processo, para a suíte rodar duas vezes seguidas (regra 9.1).
 * ⚠️ **O SEGUNDO INSTRUTOR DA SEMENTE NÃO É HABILITADO** — é o negativo da RD-1. O caso dos adicionais primeiro prova
 *    que ele NÃO é oferecido; depois o habilita (linha própria `B16-…`, apagada no fim) e o acrescenta.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { limparDsa, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import {
  escolherDisciplina,
  escolherDisciplinaEUnidade,
  irParaASemanaDoDia,
} from "./percurso-do-dsa";
import { dataComDiaDaSemana, dataParaLeitura } from "@/lib/formato/data";

const ANO = 2026;
const segundaDe = (n: number) =>
  new Date(Date.UTC(2025, 11, 29) + (n - 1) * 7 * 86_400_000).toISOString().slice(0, 10);
/* Fora das candidatas do Bloco 11 e do Bloco 15. */
const CANDIDATAS = [40, 41, 42, 49, 50] as const;

let ADMIN = "";
let S: DsaSemeado;
let MARCA = "";
let SEMANA = 40;
/** A semana do cartão adaptável (ajuste C): uma segunda candidata livre, semeada no próprio caso. */
let SEMANA_DOS_CARTOES = 41;
let SEGUNDO = "";
let DISCIPLINA = "";

let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

async function idDaTurma(): Promise<string> {
  const { data } = await banco()
    .from("turmas")
    .select("id")
    .eq("codigo", S.turmaComRelogio)
    .single();
  return (data as { id: string }).id;
}

test.beforeAll(async ({}, info) => {
  const processo = info.workerIndex;
  MARCA = `p${processo}`;
  ADMIN = emailDeTeste("bloco16", processo);
  await criarConta(ADMIN, `USR-B16-${processo}`);
  S = await semearDsa(processo, ADMIN);
  const { data: comEvento } = await banco()
    .from("dsa_eventos_da_semana")
    .select("semana")
    .eq("turma_id", await idDaTurma())
    .eq("ano", ANO);
  const usadas = new Set(((comEvento ?? []) as { semana: number }[]).map((e) => e.semana));
  const livre = CANDIDATAS.find((n) => !usadas.has(n));
  if (livre === undefined) throw new Error("sem semana candidata livre — rode o db:reset:limpo");
  SEMANA = livre;
  const outra = CANDIDATAS.find((n) => !usadas.has(n) && n !== livre);
  if (outra === undefined) throw new Error("sem semana candidata livre — rode o db:reset:limpo");
  SEMANA_DOS_CARTOES = outra;
  const { data: segundo } = await banco()
    .from("instrutores")
    .select("id")
    .eq("codigo", `DSA-E2D${processo}-SEMV`)
    .single();
  SEGUNDO = (segundo as { id: string }).id;
  const { data: turma } = await banco()
    .from("turmas")
    .select("curso_id")
    .eq("codigo", S.turmaComRelogio)
    .single();
  const { data: disciplina } = await banco()
    .from("disciplinas")
    .select("id")
    .eq("curso_id", (turma as { curso_id: string }).curso_id)
    .eq("cod_disciplina", S.codDisciplina)
    .single();
  DISCIPLINA = (disciplina as { id: string }).id;
});

test.afterAll(async () => {
  /* Os ajustes antes da avaliação (FK `restrict`), e antes de `limparDsa`. */
  await banco()
    .from("ajustes_de_avaliacao")
    .delete()
    .eq("turma_id", await idDaTurma());
  await banco().from("avaliacoes").delete().like("codigo", `B16-${MARCA}-AV%`);
  await banco().from("registros_aula").delete().like("codigo", `B16-${MARCA}-CART-%`);
  await banco().from("instrutor_disciplina").delete().like("codigo", `B16-${MARCA}-X%`);
  await banco().from("instrutores").delete().like("codigo", `B16-${MARCA}-X%`);
  await banco().from("registros_aula").delete().like("conteudo_resumo", `Aula B16 % ${MARCA}`);
  await banco().from("instrutor_disciplina").delete().like("codigo", `B16-${MARCA}-%`);
  await limparDsa(S);
  await apagarConta(ADMIN);
});

const celula = (page: Page, ta: number, dia: string) =>
  page.locator(
    `[data-slot="grade-alocacao"] td[aria-label$="· ${ta} · ${dataComDiaDaSemana(dia)}"]`,
  );

async function abrirODsa(page: Page): Promise<void> {
  await irAFichaDaTurma(page, ADMIN, S.turmaComRelogio);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, segundaDe(SEMANA), SEMANA, ANO);
  await expect(page.locator('[data-slot="publicacao-do-dsa"]')).toBeVisible();
}

const FORM = '[data-slot="formulario-de-lancamento"]';

test("FR-001 a FR-005 · o formulário: ícones, «Início», avaliação sem técnica, EI sem instrutor, Apoio sem o sufixo", async ({
  page,
}) => {
  await abrirODsa(page);
  await celula(page, 1, segundaDe(SEMANA)).click();
  const form = page.locator(FORM);
  await expect(form).toBeVisible();

  /* FR-001: Lançar e Cancelar são ÍCONES, no grupo do canto inferior esquerdo — nenhum botão escrito. */
  const acoes = form.locator('[data-slot="acoes-do-formulario"]');
  await expect(acoes.locator('[data-acao="lancar"]')).toBeVisible();
  await expect(acoes.locator('[data-acao="cancelar"]')).toBeVisible();
  await expect(acoes.getByText("Lançar", { exact: true })).toHaveCount(0);
  await expect(acoes.getByText("Cancelar", { exact: true })).toHaveCount(0);

  /* FR-002: «Início», e não «Em qual tempo começa». */
  await expect(form.getByLabel("Início")).toBeVisible();
  await expect(form.getByText("Em qual tempo começa")).toHaveCount(0);

  /* FR-003: na avaliação, sem «Técnica de ensino»; na aula, com. */
  await expect(form.locator("#dsa-tecnica")).toBeVisible();
  await form.locator('[data-tipo="avaliacao"]').click();
  await escolherDisciplina(page, S.codDisciplina);
  await expect(form.locator("#dsa-tecnica")).toHaveCount(0);
  /* ⛔ Item 3a, parado: os dois continuam — o tipo da avaliação segue no formulário. */
  await expect(form.locator("#dsa-tipo-avaliacao")).toBeVisible();

  /* FR-004: no Estudo Individual, nenhum campo de quem ministra nem de nome livre. */
  await form.locator('[data-tipo="Estudo_Individual"]').click();
  /* Ajuste A (31/10/2026): uma opção só de «Tipo de atividade» — o campo não aparece, e ela já vem escolhida. */
  const tiposDeEi = await banco()
    .from("config_listas")
    .select("id", { count: "exact", head: true })
    .eq("lista", "tipos_atividade")
    .eq("ativo", true)
    .eq("metadados->>categoria", "Estudo_Individual");
  expect(tiposDeEi.count, "a lista semeada tem um tipo só de Estudo Individual").toBe(1);
  await expect(form.locator("#dsa-subtipo")).toHaveCount(0);
  await expect(form.locator('[data-slot="categoria-do-tipo"]')).toContainText("Estudo Individual");

  await expect(form.locator('[data-slot="responsavel-do-lancamento"]')).toHaveCount(0);
  await expect(form.locator('[data-slot="seletor-instrutor"]')).toHaveCount(0);
  await expect(form.locator("#dsa-outros-instrutores")).toHaveCount(0);

  /* FR-005: o Apoio sem «alunos específicos». */
  await form.locator('[data-tipo="Apoio_Individualizado"]').click();
  await form.locator("#dsa-subtipo").selectOption({ index: 1 });
  await expect(form.locator('[data-slot="categoria-do-tipo"]')).toHaveText(
    "Conta como: Apoio Individualizado (fora da CHT)",
  );

  /* Cancelar, pelo ícone, fecha sem gravar. */
  await acoes.locator('[data-acao="cancelar"]').click();
  await expect(form).toHaveCount(0);
});

test("FR-006 e FR-008 · mais de um instrutor: só o habilitado é oferecido; grava os dois; o cartão mostra «A / B · local»", async ({
  page,
}) => {
  const dia = segundaDe(SEMANA);
  const topico = `Aula B16 adicionais ${MARCA}`;
  await abrirODsa(page);

  /* RD-1: o segundo instrutor NÃO é habilitado — a lista dos adicionais não o oferece. */
  await celula(page, 2, dia).click();
  const form = page.locator(FORM);
  await escolherDisciplinaEUnidade(page, S.codDisciplina);
  await expect(form.locator('[data-slot="instrutores-adicionais"]')).toBeVisible();
  await form
    .locator(
      '[data-slot="instrutores-adicionais"] [data-slot="seletor-instrutor"], [data-slot="instrutores-adicionais"] [data-slot="seletor-instrutor-vazio"]',
    )
    .first()
    .waitFor();
  const naoOferecido = form.locator(
    '[data-slot="instrutores-adicionais"] [data-slot="seletor-instrutor-vazio"]',
  );
  /* Com o habilitado como quem ministra, não sobra ninguém: o vazio diz por quê. */
  await form
    .locator('[data-slot="responsavel-do-lancamento"] [data-slot="seletor-instrutor"]')
    .click();
  await page
    .locator('[data-slot="popover-content"]')
    .getByRole("option", { name: new RegExp(S.nomeHabilitado, "i") })
    .first()
    .click();
  await expect(naoOferecido).toContainText("Nenhum outro instrutor habilitado nesta disciplina");
  await form.locator('[data-acao="cancelar"]').click();

  /* Habilitar o segundo (o que a ficha do instrutor faria) e lançar com ele como adicional. */
  const { error } = await banco()
    .from("instrutor_disciplina")
    .insert({
      codigo: `B16-${MARCA}-VIN`,
      instrutor_id: SEGUNDO,
      disciplina_id: DISCIPLINA,
      modo_atribuicao: "dividido",
    });
  expect(error, error?.message).toBeNull();
  await page.reload();
  await celula(page, 2, dia).click();
  await escolherDisciplinaEUnidade(page, S.codDisciplina);
  await form
    .locator('[data-slot="responsavel-do-lancamento"] [data-slot="seletor-instrutor"]')
    .click();
  await page
    .locator('[data-slot="popover-content"]')
    .getByRole("option", { name: new RegExp(S.nomeHabilitado, "i") })
    .first()
    .click();
  await form
    .locator('[data-slot="instrutores-adicionais"] [data-slot="seletor-instrutor"]')
    .click();
  await page
    .locator('[data-slot="popover-content"]')
    .getByRole("option", { name: new RegExp(S.nomeSemHabilitacao, "i") })
    .first()
    .click();
  await expect(form.locator('[data-slot="instrutor-adicional"]')).toHaveCount(1);
  await form.locator("#dsa-conteudo").fill(topico);
  await form.locator("#dsa-tempos").fill("1");
  await form.locator('[data-acao="lancar"]').click();
  await expect(form).toHaveCount(0);

  /* No banco: quem ministra e o adicional, cada um no seu lugar — nunca o valor digitado. */
  const { data: gravada } = await banco()
    .from("registros_aula")
    .select("instrutor_id, instrutores_adicionais, tempos_consumidos")
    .eq("conteudo_resumo", topico)
    .eq("status", "ativo")
    .single();
  const linha = gravada as {
    instrutor_id: string;
    instrutores_adicionais: string[];
    tempos_consumidos: number;
  };
  expect(linha.instrutores_adicionais).toEqual([SEGUNDO]);
  expect(linha.instrutor_id).not.toBe(SEGUNDO);
  expect(linha.tempos_consumidos).toBe(1);

  /* FR-006.5 e FR-008: o cartão de 1 TA mostra os dois nomes com « / » e o local NA MESMA LINHA. */
  const pe = celula(page, 2, dia).locator('[data-slot="cartao-pe"]');
  await expect(pe).toContainText(" / ");
  await expect(pe.locator('[data-slot="cartao-local"]')).toBeVisible();
  await expect(pe.locator('[data-slot="cartao-instrutor"]')).toBeVisible();
});

test("FR-009 · as abas de acompanhamento: Disciplinas (igual), Avaliações, APOINST e Palestras «Em breve», na URL", async ({
  page,
}) => {
  await abrirODsa(page);
  const abas = page.locator('[data-slot="abas-de-acompanhamento"]');
  await expect(abas.getByRole("tab")).toHaveText([
    "Disciplinas",
    "Avaliações",
    "APOINST",
    "Palestras",
  ]);
  await expect(page.locator('[data-slot="painel-de-situacao"]')).toBeVisible();

  await abas.locator('[data-acompanhamento="avaliacoes"]').click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("acompanhamento"))
    .toBe("avaliacoes");
  await expect(page.locator('[data-slot="acompanhamento-de-avaliacoes"]')).toBeVisible();
  await expect(page.locator('[data-slot="painel-de-situacao"]')).toHaveCount(0);
  await expect(
    page.locator('[data-slot="acompanhamento-de-avaliacoes"]').getByText("Semana prevista"),
  ).toHaveCount(0);
  /* Ajuste D (31/10/2026): Avaliação · Situação · Data de aplicação · Data da vista — as semanas saíram. */
  for (const titulo of ["Avaliação", "Situação", "Data de aplicação", "Data da vista"]) {
    await expect(
      page.locator('[data-slot="acompanhamento-de-avaliacoes"]').getByText(titulo, { exact: true }),
    ).toBeVisible();
  }

  await abas.locator('[data-acompanhamento="apoinst"]').click();
  await expect(page.locator('[data-slot="acompanhamento-em-breve"]')).toHaveText("Em breve");
  await abas.locator('[data-acompanhamento="palestras"]').click();
  await expect.poll(() => new URL(page.url()).searchParams.get("acompanhamento")).toBe("palestras");
  await expect(page.locator('[data-slot="acompanhamento-em-breve"]')).toHaveText("Em breve");

  await abas.locator('[data-acompanhamento="disciplinas"]').click();
  await expect.poll(() => new URL(page.url()).searchParams.get("acompanhamento")).toBeNull();
  await expect(page.locator('[data-slot="painel-de-situacao"]')).toBeVisible();
});

test("ajuste C · o cartão adaptável — 1, 3 e 5 tempos × 1 e 4 instrutores, na tela e na impressão, todos os nomes dentro", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const turma = await idDaTurma();
  const { data: t } = await banco().from("turmas").select("curso_id").eq("id", turma).single();
  const cursoId = (t as { curso_id: string }).curso_id;
  const processo = MARCA.slice(1);
  const { data: titular } = await banco()
    .from("instrutores")
    .select("id")
    .eq("codigo", `DSA-E2D${processo}-INS`)
    .single();
  const { data: ue } = await banco()
    .from("unidades_ensino")
    .select("id")
    .eq("codigo", `DSA-E2D${processo}-UE1`)
    .single();
  /* Três adicionais habilitados na disciplina (linhas próprias, apagadas no fim). */
  const extras: string[] = [];
  for (const n of [1, 2, 3]) {
    const { data: existe } = await banco()
      .from("instrutores")
      .select("id")
      .eq("codigo", `B16-${MARCA}-X${n}`)
      .maybeSingle();
    let id = (existe as { id: string } | null)?.id ?? "";
    if (id === "") {
      const { data, error } = await banco()
        .from("instrutores")
        .insert({
          codigo: `B16-${MARCA}-X${n}`,
          posto_graduacao: "CT",
          esp_hab_obs: "-EF",
          nome_completo: `Adicional Do Cartao Numero ${n} ${MARCA}`,
          categoria: "Militar",
          om: "CIAARA",
        })
        .select("id")
        .single();
      expect(error, error?.message).toBeNull();
      id = (data as { id: string }).id;
    }
    extras.push(id);
    await banco()
      .from("instrutor_disciplina")
      .upsert(
        {
          codigo: `B16-${MARCA}-X${n}-VIN`,
          instrutor_id: id,
          disciplina_id: DISCIPLINA,
          modo_atribuicao: "dividido",
        },
        { onConflict: "codigo" },
      );
  }
  const segunda = segundaDe(SEMANA_DOS_CARTOES);
  const dia = (n: number) =>
    new Date(Date.parse(`${segunda}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  /* Os seis cartões: (tempos, adicionais, dia, TA inicial). */
  const CASOS = [
    { tempos: 1, adicionais: 0, dia: 0, ta: 1 },
    { tempos: 1, adicionais: 3, dia: 0, ta: 3 },
    { tempos: 3, adicionais: 0, dia: 1, ta: 1 },
    { tempos: 3, adicionais: 3, dia: 2, ta: 1 },
    { tempos: 5, adicionais: 0, dia: 3, ta: 1 },
    { tempos: 5, adicionais: 3, dia: 4, ta: 1 },
  ];
  await banco().from("registros_aula").delete().like("codigo", `B16-${MARCA}-CART-%`);
  const { error } = await banco()
    .from("registros_aula")
    .insert(
      CASOS.map((c, k) => ({
        codigo: `B16-${MARCA}-CART-${k}`,
        data: dia(c.dia),
        turma_id: turma,
        curso_id: cursoId,
        unidade_ensino_id: (ue as { id: string }).id,
        instrutor_id: (titular as { id: string }).id,
        instrutores_adicionais: extras.slice(0, c.adicionais),
        tempos_consumidos: c.tempos,
        ta_inicial: c.ta,
        conteudo_resumo: `Aula B16 cartao ${k} ${MARCA}`,
        local: "Sala 03",
        salvo: true,
      })),
    );
  expect(error, error?.message).toBeNull();

  /** Todo nome visível e DENTRO do cartão (nada cortado nem vazando), em cada um dos seis. */
  async function conferirCartoes(
    cartoes: ReturnType<Page["locator"]>,
    onde: string,
  ): Promise<void> {
    const falhas = await cartoes.evaluateAll((els) =>
      els.flatMap((el, i) => {
        const caixa = el.getBoundingClientRect();
        const nomes = [...el.querySelectorAll('[data-slot="cartao-instrutor"] > *')];
        const local = el.querySelector('[data-slot="cartao-local"]');
        return [...nomes, ...(local ? [local] : [])].flatMap((n) => {
          const r = n.getBoundingClientRect();
          const fora =
            r.width === 0 ||
            r.height === 0 ||
            r.top < caixa.top - 0.5 ||
            r.bottom > caixa.bottom + 0.5;
          return fora ? [`cartão ${i}: «${(n.textContent ?? "").trim()}» fora do cartão`] : [];
        });
      }),
    );
    expect(falhas, onde).toEqual([]);
  }

  await irAFichaDaTurma(page, ADMIN, S.turmaComRelogio);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, segunda, SEMANA_DOS_CARTOES, ANO);
  const naTela = page.locator('[data-slot="grade-alocacao"] [data-slot="dsa-cartao"]', {
    hasText: `Aula B16 cartao`,
  });
  await expect(naTela).toHaveCount(CASOS.length);
  /* 1 tempo: lado a lado, o local na linha dos nomes; 5 tempos com 4 nomes: empilhados. */
  const cartaoDoCaso = (k: number) =>
    page.locator('[data-slot="grade-alocacao"] [data-slot="dsa-cartao"]', {
      hasText: `Aula B16 cartao ${k} ${MARCA}`,
    });
  await expect(cartaoDoCaso(1).locator('[data-slot="cartao-pe"]')).toHaveAttribute(
    "data-arranjo",
    "linha",
  );
  await expect(
    cartaoDoCaso(1).locator('[data-slot="cartao-pe"] [data-slot="cartao-local"]'),
  ).toBeVisible();
  await expect(cartaoDoCaso(5).locator('[data-slot="cartao-pe"]')).toHaveAttribute(
    "data-arranjo",
    "pilha",
  );
  await expect(cartaoDoCaso(5).locator('[data-slot="cartao-instrutor"] > *')).toHaveCount(4);
  await conferirCartoes(naTela, "na tela");

  /* Na impressão (a prévia: semana não publicada). */
  await page.locator('[data-slot="imprimir-dsa"]').click();
  await page.waitForURL(/\/print\/dsa/);
  const noPapel = page.locator('[data-slot="dsa-impresso"] [data-slot="dsa-cartao"]', {
    hasText: `Aula B16 cartao`,
  });
  await expect(noPapel).toHaveCount(CASOS.length);
  await expect(
    noPapel
      .filter({ hasText: `Aula B16 cartao 5 ${MARCA}` })
      .locator('[data-slot="cartao-instrutor"] > *'),
  ).toHaveCount(4);
  await conferirCartoes(noPapel, "no papel");
});

test("ajuste D · Editar na aba Avaliações: situação e datas com justificativa — grava no banco, o histórico aparece na linha e a ficha mostra a mesma situação", async ({
  page,
}) => {
  const turma = await idDaTurma();
  const { data: t } = await banco().from("turmas").select("curso_id").eq("id", turma).single();
  const aplicacao = segundaDe(SEMANA);
  await banco().from("ajustes_de_avaliacao").delete().eq("turma_id", turma);
  await banco().from("avaliacoes").delete().like("codigo", `B16-${MARCA}-AV%`);
  const { data: av, error } = await banco()
    .from("avaliacoes")
    .insert({
      codigo: `B16-${MARCA}-AV1`,
      turma_id: turma,
      curso_id: (t as { curso_id: string }).curso_id,
      disciplina_id: DISCIPLINA,
      tipo_avaliacao: "Prova Escrita",
      data_avaliacao: aplicacao,
      status: "pendente",
      salvo: true,
    })
    .select("id")
    .single();
  expect(error, error?.message).toBeNull();
  const avaliacaoId = (av as { id: string }).id;

  await abrirODsa(page);
  await page.locator('[data-acompanhamento="avaliacoes"]').click();
  const quadro = page.locator('[data-slot="acompanhamento-de-avaliacoes"]');
  /* A semente tem outras provas escritas: a desta é a da data semeada (dia sem outra prova da semente). */
  const linha = quadro
    .locator("tr", { hasText: "Prova Escrita (sem item do currículo)" })
    .filter({ hasText: dataParaLeitura(aplicacao) });
  await expect(linha).toBeVisible();
  await linha.locator('[data-slot="editar-avaliacao"]').click();
  const dialogo = page.locator('[data-slot="dialogo-do-ajuste"]');
  await expect(dialogo).toBeVisible();
  await dialogo.locator("#ajuste-situacao").selectOption("cancelada");
  await dialogo.locator("#ajuste-aplicacao").fill(aplicacao);
  await dialogo.locator("#ajuste-vista").fill("");
  const justificativa = `Prova suprimida pelo curso ${MARCA}.`;
  await dialogo.locator("#ajuste-justificativa").fill(justificativa);
  await dialogo.locator('[data-slot="gravar-ajuste"]').click();
  await expect(dialogo).toHaveCount(0);

  /* No banco: a linha de ajuste, com o autor carimbado pelo banco — nunca o valor digitado. */
  await expect
    .poll(async () => {
      const { data } = await banco()
        .from("ajustes_de_avaliacao")
        .select("situacao, data_aplicacao, data_vista, justificativa, autor_nome")
        .eq("avaliacao_id", avaliacaoId);
      return data ?? [];
    })
    .toEqual([
      {
        situacao: "cancelada",
        data_aplicacao: aplicacao,
        data_vista: null,
        justificativa,
        autor_nome: expect.any(String),
      },
    ]);

  /* Na linha: a situação ajustada e o histórico. */
  await expect(linha.locator('[data-slot="situacao-da-avaliacao"]')).toHaveAttribute(
    "data-situacao",
    "cancelada",
  );
  await expect(linha.locator('[data-slot="historico-do-ajuste"]')).toContainText(justificativa);

  /* A ficha da turma (aba Avaliações) mostra a MESMA situação ajustada, marcada. */
  await irAFichaDaTurma(page, ADMIN, S.turmaComRelogio);
  await page.locator('[data-aba="avaliacoes"]').click();
  const daDisciplina = page.locator(`[data-avaliacoes-disciplina="${S.codDisciplina}"]`);
  await daDisciplina.locator("summary").click();
  await expect(daDisciplina.locator('[data-slot="situacao-ajustada"]').first()).toBeVisible();
  await expect(daDisciplina.locator('[data-situacao="cancelada"]').first()).toBeVisible();
});

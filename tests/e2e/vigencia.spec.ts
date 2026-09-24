/**
 * Registrar e corrigir vigência de regime (`FR-019`, `FR-021.1`, `FR-021.4`, `SC-011.1`, US6).
 *
 * ⚠️ **VIGÊNCIA NÃO SE APAGA** (regra 9.1, `curso_regime_historico` é append-only com `DELETE` e
 * `TRUNCATE` recusados **inclusive para a `service_role`**). Cada execução **acrescenta** linhas ao
 * curso da amostra, e é por isso que nenhum caso deste arquivo conta vigências: eles afirmam sobre a
 * linha que o próprio percurso criou, achada pelo **código que o banco carimbou**, e a data da
 * vigência nova é **derivada do relógio** — data fixa colidiria com a execução anterior no `EXCLUDE`
 * de sobreposição, e a recusa se leria como defeito da tela.
 *
 * ⚠️ **O CURSO TRAVADO E O CORRIGÍVEL SÃO CURSOS DIFERENTES, DE PROPÓSITO.** O regular da amostra tem
 * um lançamento semeado; o expedito não tem nenhum. É o par que discrimina: uma implementação que
 * oferecesse "Corrigir" a toda vigência ativa passaria no primeiro caso e reprovaria no segundo.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { sessaoDe } from "./curso-de-teste";
import { limparCursos, semearCursos, type CursosSemeados } from "./cursos-de-teste";

let cliente: SupabaseClient | undefined;
const admin = (): SupabaseClient =>
  (cliente ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

let EMAIL_ADMIN = "";
let EMAIL_ENCARREGADO = "";
let EMAIL_OPERADOR = "";
let EMAIL_VISUALIZACAO = "";
let SEMEADO: CursosSemeados;

/**
 * O dia seguinte à ÚLTIMA vigência do curso — lido do banco, não sorteado.
 *
 * ⚠️ **A PRIMEIRA VERSÃO DERIVAVA A DATA DO RELÓGIO (`Date.now() % 10_000` dias), E ISSO ESTAVA
 * ERRADO DE UM JEITO QUE SÓ APARECE NA SEGUNDA EXECUÇÃO.** O resto dá voltas a cada dez segundos, de
 * modo que a data **não é crescente**: uma execução gravava 2115 com ponta aberta e a seguinte tentava
 * 2103 — **dentro** daquela janela —, e o `EXCLUDE` de sobreposição recusava. A recusa era correta, e
 * a leitura fácil era *"a tela não registrou"*. Vigência não se apaga (regra 9.1): a única data segura
 * é a que vem **depois de todas as que já existem**.
 */
async function diaSeguinteAUltimaVigencia(sigla: string): Promise<string> {
  const { data: curso } = await admin().from("cursos").select("id").eq("codigo", sigla).single();
  const { data, error } = await admin()
    .from("curso_regime_historico")
    .select("vigente_de")
    .eq("curso_id", curso!.id)
    .order("vigente_de", { ascending: false })
    .limit(1)
    .single();
  if (error) throw new Error(`nao li as vigencias de ${sigla}: ${error.message}`);

  const ultima = new Date(`${data.vigente_de as string}T00:00:00Z`).getTime();
  const piso = Date.UTC(2100, 0, 1);
  return new Date(Math.max(ultima + 86_400_000, piso)).toISOString().slice(0, 10);
}

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL_ADMIN = emailDeTeste("vigencia-admin", p);
  EMAIL_ENCARREGADO = emailDeTeste("vigencia-encarregado", p);
  EMAIL_OPERADOR = emailDeTeste("vigencia-operador", p);
  EMAIL_VISUALIZACAO = emailDeTeste("vigencia-visu", p);

  await criarConta(EMAIL_ADMIN, `USR-VIG-ADM-${p}`);
  SEMEADO = await semearCursos(p, EMAIL_ADMIN);
  await criarConta(EMAIL_ENCARREGADO, `USR-VIG-ENC-${p}`, "encarregado_administracao_academica");
  /* ⚠️ Escopo `geral`: o recorte do Operador não é o que este arquivo mede. */
  await criarConta(EMAIL_OPERADOR, `USR-VIG-OPE-${p}`, "operador", "geral");
  await criarConta(EMAIL_VISUALIZACAO, `USR-VIG-VIS-${p}`, "visualizacao");
});

test.afterAll(async () => {
  await limparCursos(SEMEADO);
  await apagarConta(EMAIL_ADMIN);
  await apagarConta(EMAIL_ENCARREGADO);
  await apagarConta(EMAIL_OPERADOR);
  await apagarConta(EMAIL_VISUALIZACAO);
});

const secao = (page: Page) => page.locator('[data-slot="secao-de-regime"]');
const dialogo = (page: Page) => page.locator('[data-slot="dialogo-confirmacao"]');
const enderecoDaEdicao = (sigla: string) => `/cursos/${encodeURIComponent(sigla)}/editar`;

/** O `id` da vigência `padrao` ativa de um curso — buscado, nunca guardado entre execuções. */
async function vigenciaPadraoAtivaDe(
  sigla: string,
): Promise<{ id: string; codigo: string; tempos: number; duracao: number }> {
  const { data: curso } = await admin().from("cursos").select("id").eq("codigo", sigla).single();
  const { data, error } = await admin()
    .from("curso_regime_historico")
    .select("id, codigo, regime_tempos, ta_duracao_min")
    .eq("curso_id", curso!.id)
    .eq("tipo_regime", "padrao")
    .eq("status", "ativo")
    .order("vigente_de", { ascending: false })
    .limit(1)
    .single();
  if (error) throw new Error(`nao achei vigencia padrao ativa de ${sigla}: ${error.message}`);
  return {
    id: data.id as string,
    codigo: data.codigo as string,
    tempos: Number(data.regime_tempos),
    duracao: Number(data.ta_duracao_min),
  };
}

test.describe("`FR-021.1` · corrigir a vigência que ainda não alcançou lançamento", () => {
  test("a corrigida fica CANCELADA no histórico e a sucessora entra ativa", async ({ page }) => {
    const sigla = SEMEADO.porClassificacao.expedito;
    const antes = await vigenciaPadraoAtivaDe(sigla);

    await entrar(page, EMAIL_ENCARREGADO, enderecoDaEdicao(sigla));
    const linha = secao(page).locator(`[data-vigencia="${antes.codigo}"]`);
    await expect(linha).toHaveAttribute("data-corrigivel", "true");

    await linha.locator('[data-slot="corrigir-vigencia"] summary').click();

    /*
     * ⚠️ O FORMULÁRIO ABRE COM OS VALORES ATUAIS (`FR-021.1`) — é o que faz a correção parecer edição
     *    para quem usa, sem deixar de ser append-only para o banco.
     */
    await expect(page.locator("#corrigir-tempos")).toHaveValue(String(antes.tempos));
    await expect(page.locator("#corrigir-duracao")).toHaveValue(String(antes.duracao));
    // ⚠️ E o MOTIVO nasce vazio: ele explica ESTA correção, não a mudança anterior.
    await expect(page.locator("#corrigir-motivo")).toHaveValue("");

    /*
     * ⚠️ **O VALOR NOVO É O OUTRO DOS DOIS QUE A NORMA ADMITE, e é lido do atual.** Fixar "50" fazia o
     *    caso passar na primeira execução e reprovar na segunda — a vigência corrigida FICA no banco,
     *    e a execução seguinte encontra 50 onde esperava 45.
     */
    const duracaoNova = antes.duracao === 45 ? 50 : 45;
    await page.locator("#corrigir-duracao").fill(String(duracaoNova));
    await page.locator("#corrigir-motivo").fill(`TA de ${duracaoNova} minutos, pelo currículo`);

    // ⚠️ CORRIGIR CONFIRMA SEMPRE (`FR-018.1`) — não é reversível por outro clique.
    await page.locator('[data-slot="gravar-correcao"]').click();
    await expect(dialogo(page)).toBeVisible();
    await expect(dialogo(page)).toContainText("cancelada");
    await dialogo(page).getByRole("button", { name: "Corrigir" }).click();

    const corrigida = secao(page).locator(`[data-vigencia="${antes.codigo}"]`);
    await expect(corrigida).toHaveAttribute("data-status", "cancelado", { timeout: 15_000 });

    // ⚠️ A CANCELADA NÃO SOME, E APARECE MARCADA — ela é o registro de que houve correção (A-5).
    await expect(corrigida).toBeVisible();
    await expect(corrigida.locator('[data-slot="marca-da-cancelada"]')).toContainText("cancelada");

    /*
     * ⚠️ **O MOTIVO FICA NA SUCESSORA, E NÃO NA CANCELADA** — é a linha nova que ele explica, e é lá
     *    que a RPC o grava. Procurá-lo na cancelada seria esperar que o banco escrevesse duas vezes a
     *    mesma justificativa em linhas diferentes.
     */
    const depois = await vigenciaPadraoAtivaDe(sigla);
    expect(depois.codigo, "a sucessora não entrou").not.toBe(antes.codigo);
    const sucessora = secao(page).locator(`[data-vigencia="${depois.codigo}"]`);
    await expect(sucessora, "a sucessora não apareceu no histórico").toHaveAttribute(
      "data-status",
      "ativo",
    );
    await expect(sucessora).toContainText(`${duracaoNova} min`);
  });
});

test.describe("`FR-021.2` · a vigência com lançamento não se corrige", () => {
  test("⚠️ a ação NÃO é oferecida, e a tela diz por quê e qual é o caminho (`FR-021.4`)", async ({
    page,
  }) => {
    const sigla = SEMEADO.porClassificacao.regular;
    const travada = await vigenciaPadraoAtivaDe(sigla);

    await entrar(page, EMAIL_ENCARREGADO, enderecoDaEdicao(sigla));
    const linha = secao(page).locator(`[data-vigencia="${travada.codigo}"]`);

    await expect(linha).toHaveAttribute("data-corrigivel", "false");
    await expect(linha.locator('[data-slot="corrigir-vigencia"]')).toHaveCount(0);

    const motivo = linha.locator('[data-slot="motivo-da-trava"]');
    await expect(motivo).toContainText("aula");
    await expect(motivo).toContainText("2026-03-02");
    await expect(motivo).toContainText(SEMEADO.turmaJanelaCedo);
    await expect(motivo).toContainText("registrar vigência nova");

    /* ⚠️ E NUNCA O ERRO CRU DO BANCO (`RN-DEG-01`). */
    const texto = await motivo.innerText();
    for (const cru of ["23514", "42501", "violates", "constraint", "PGRST"]) {
      expect(texto, `vazou "${cru}" para a tela`).not.toContain(cru);
    }
  });

  test("⚠️ e o BANCO recusa por qualquer caminho, com a chave nomeada — não erro cru", async () => {
    /*
     * ⚠️ A SEGUNDA DEFESA. A tela não oferece a ação, mas a RPC é endpoint de fato: entre abrir o
     *    formulário e salvar, um lançamento pode entrar. Este caso chama a RPC direto, com sessão
     *    autenticada de quem PODE registrar horário, e confere que a recusa vem **nomeada**.
     */
    const sigla = SEMEADO.porClassificacao.regular;
    const travada = await vigenciaPadraoAtivaDe(sigla);
    const sessao = await sessaoDe(EMAIL_ENCARREGADO);

    const { error } = await sessao.rpc("corrigir_vigencia_regime", {
      p_vigencia_id: travada.id,
      p_sucessora: {
        tipo_regime: "padrao",
        vigente_de: "2020-01-01",
        regime_tempos: 8,
        ta_duracao_min: 50,
        intervalo_manha_min: 10,
        intervalo_tarde_min: 10,
        hora_inicio_manha: "07:30",
        hora_inicio_tarde: "13:30",
      },
    });

    expect(error, "a correção de uma vigência com lançamento foi ACEITA").not.toBeNull();

    /*
     * ⚠️ **A CHAVE VIAJA NO `hint`, e é de lá que `traduzirRecusa` a lê.** Procurá-la em `message` ou
     *    `details` daria um teste que reprova com a recusa CERTA no lugar — foi o que aconteceu na
     *    primeira escrita deste caso, em 23/09/2026.
     */
    expect(error?.hint, "a recusa não nomeia a chave que a tradução lê").toContain(
      "vigencia_com_lancamento",
    );
    // ⚠️ E o `details` carrega o que a mensagem do `FR-021.4` precisa dizer.
    expect(error?.details ?? "").toContain("2026-03-02");
  });
});

test.describe("`FR-019` · registrar vigência nova a partir de uma data", () => {
  test("a vigência futura entra, e o histórico passa a mostrá-la", async ({ page }) => {
    const sigla = SEMEADO.porClassificacao.estagio_qualificacao;
    const quando = await diaSeguinteAUltimaVigencia(sigla);

    await entrar(page, EMAIL_ENCARREGADO, enderecoDaEdicao(sigla));
    await secao(page).locator('[data-slot="registrar-nova-vigencia"] summary').click();

    // ⚠️ `FR-015.1`: o formulário de registro abre VAZIO — nada de tipo por padrão.
    await expect(page.locator("#registrar-tipo")).toHaveValue("");

    await page.locator("#registrar-tipo").selectOption("padrao");
    await page.locator("#registrar-de").fill(quando);
    await page.locator("#registrar-tempos").fill("6");
    await page.locator("#registrar-duracao").fill("50");
    await page.locator("#registrar-int-manha").fill("15");
    await page.locator("#registrar-int-tarde").fill("15");
    await page.locator("#registrar-manha").fill("08:00");
    await page.locator("#registrar-tarde").fill("14:00");
    await page.locator("#registrar-motivo").fill("Regime novo a partir desta data");

    // ⚠️ REGISTRAR CONFIRMA SEMPRE, e o diálogo nomeia a data (`FR-018.1`).
    await page.locator('[data-slot="registrar-vigencia"]').click();
    await expect(dialogo(page)).toBeVisible();
    await expect(dialogo(page)).toContainText(quando);
    await dialogo(page).getByRole("button", { name: "Registrar" }).click();

    const nova = secao(page).locator(`li[data-status="ativo"]`).filter({ hasText: quando });
    await expect(nova, "a vigência nova não apareceu no histórico").toHaveCount(1, {
      timeout: 15_000,
    });
    await expect(nova).toContainText("6");
    await expect(nova).toContainText("50 min");
  });

  test("⚠️ a data que reinterpretaria lançamento é recusada COM o caminho (`FR-019.4`)", async ({
    page,
  }) => {
    /*
     * ⚠️ O OUTRO LADO DA MESMA REGRA: registrar é livre **para a frente**. Uma vigência a partir de
     *    uma data já coberta por lançamento reescreveria o horário de DSA já distribuído, e o banco
     *    recusa — com a data e o caminho, nunca com o erro cru.
     */
    const sigla = SEMEADO.porClassificacao.regular;
    await entrar(page, EMAIL_ENCARREGADO, enderecoDaEdicao(sigla));
    await secao(page).locator('[data-slot="registrar-nova-vigencia"] summary').click();

    await page.locator("#registrar-tipo").selectOption("padrao");
    await page.locator("#registrar-de").fill("2026-01-05");
    await page.locator("#registrar-tempos").fill("7");
    await page.locator("#registrar-duracao").fill("45");
    await page.locator("#registrar-int-manha").fill("10");
    await page.locator("#registrar-int-tarde").fill("10");
    await page.locator("#registrar-manha").fill("07:30");
    await page.locator("#registrar-tarde").fill("13:30");

    await page.locator('[data-slot="registrar-vigencia"]').click();
    await dialogo(page).getByRole("button", { name: "Registrar" }).click();

    const erro = page.locator('[data-slot="erro-da-vigencia"]');
    await expect(erro).toBeVisible({ timeout: 15_000 });
    await expect(erro).toContainText("Escolha uma data posterior");
    await expect(erro).not.toContainText("constraint");
  });
});

test.describe("`SC-011.1` · a rota atende DUAS permissões, e elas não andam juntas", () => {
  test("⚠️ o Operador registra regime sem editar curso — o caso que discrimina o `N-1b`", async ({
    page,
  }) => {
    /*
     * ⚠️ A ESCRITA DE VIGÊNCIA É `horarios.criar`, E NÃO `cursos.editar` — e o **Operador** é o único
     *    perfil que tem a segunda sem a primeira (medido na matriz do banco em 23/09/2026). Uma tela
     *    que barrasse por `cursos.editar` deixaria esse perfil sem caminho nenhum para o que a policy
     *    lhe permite: o negativo e o controle positivo passariam, e só este caso pega a troca.
     */
    const sigla = SEMEADO.porClassificacao.expedito;
    await entrar(page, EMAIL_OPERADOR, enderecoDaEdicao(sigla));

    await expect(secao(page)).toBeVisible();
    await expect(secao(page).locator("li[data-vigencia]").first()).toBeVisible();
    await expect(secao(page).locator('[data-slot="registrar-nova-vigencia"]')).toHaveCount(1);

    // ⚠️ E ele NÃO recebe o formulário do curso, que é da outra permissão.
    await expect(page.locator('[data-slot="formulario-de-curso"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="so-o-regime"]')).toBeVisible();
  });

  test("quem não tem nenhuma das duas não entra", async ({ page }) => {
    await entrar(page, EMAIL_VISUALIZACAO, enderecoDaEdicao(SEMEADO.porClassificacao.expedito));
    await expect(secao(page)).toHaveCount(0);
    await expect(page.locator('[data-slot="formulario-de-curso"]')).toHaveCount(0);
  });
});

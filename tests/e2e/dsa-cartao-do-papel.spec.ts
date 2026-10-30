/**
 * O cartão do DSA nunca corta o instrutor, e o nome da disciplina cabe numa linha — spec 017, FR-007 (Bloco 2,
 * item 6), por clique a partir do menu.
 *
 * > *"Nome longo de disciplina estoura o cartão do DSA (…): o tópico corta e o instrutor some. (…) Critério: nenhum
 * > cartão corta o instrutor, inclusive o de 1 TA. Meça no catálogo real quantas disciplinas passam do limite."*
 * > — pedido de Bernardo Villas Boas, 19/10/2026
 *
 * ⚠️ **O PIOR CASO DO PAPEL**: aulas de **1 TA**, nos **seis dias** (com o sábado, o papel entra no modo compacto),
 *    com os cinco nomes mais longos do catálogo real (81, 74, 73, 72 e 71 caracteres) e códigos largos (XIII…).
 *    Os nomes são do currículo da DEnsM, público (`UE-PUB`).
 * ⚠️ **A MEDIDA DO L É FEITA AQUI, NO PAPEL DE VERDADE** (R-8): no título do cartão do código mais largo, para cada
 *    um dos 172 nomes ativos (`tests/unidade/dados/disciplinas-ativas-2026-10-19.txt`), o maior prefixo que cabe numa
 *    linha; L é o menor deles. E a prova do SC-008: o nome do cartão (`nomeNoCartao`) dos 172 cabe — 172 de 172.
 * ⚠️ **TUDO POR CLIQUE**: *Turmas* → a turma → *Abrir o DSA* → a semana pela data → *Imprimir*.
 */
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { abreviarNomeNoDsa, LIMITE_DO_NOME_NO_DSA } from "@/lib/dominio/nome-no-dsa";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { apagarLinhasDaTurma } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { irParaASemanaDoDia } from "./percurso-do-dsa";

const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** A semana 43 de 2026, de segunda a sábado — o sábado lançado põe a sexta coluna e o modo compacto. */
const DIAS = [
  "2026-10-19",
  "2026-10-20",
  "2026-10-21",
  "2026-10-22",
  "2026-10-23",
  "2026-10-24",
] as const;

/** Os mais longos do catálogo real (19/10/2026), com códigos largos; dois têm *Nome no DSA* cadastrado. */
const DISCIPLINAS = [
  [
    "XIII",
    "AQUISIÇÃO, PROCESSAMENTO E ANÁLISE DE DADOS DE BATIMETRIA MONOFEIXE E MULTIFEIXE.",
    null,
  ],
  ["XVIII", "SISTEMAS DE INFORMAÇÃO APLICADOS À ANÁLISE DE LEVANTAMENTOS HIDROGRÁFICOS.", null],
  ["XXIII", "PROCEDIMENTOS OPERACIONAIS PARA A ANÁLISE DE LEVANTAMENTOS HIDROGRÁFICOS.", null],
  /*
   * ⚠️ **UM NOME NO DSA LEGADO DE 60 CARACTERES** (o teto do banco, acima do L do cadastro): é o caso que só o CSS
   *    resolve — sem o título de uma linha, ele quebra em três e empurra o instrutor para fora do cartão.
   */
  [
    "XXVIII",
    "EFEITOS ATMOSFÉRICOS SOBRE A PROPAGAÇÃO ELETROMAGNÉTICA / C-Exp-METOC-OF",
    "EFEITOS ATMOSFÉRICOS NA PROPAGAÇÃO DE ONDAS ELETROMAGNÉTICAS",
  ],
  ["XXXIII", "FUNDAMENTOS BÁSICOS PARA A ANÁLISE DE PROJETOS DE AUXÍLIOS À NAVEGAÇÃO.", null],
  [
    "XXXVIII",
    "PRINCIPAIS SOFTWARES EMPREGADOS NA AQUISIÇÃO E PROCESSAMENTO DE DADOS.",
    "SOFTWARES AQUISIÇÃO",
  ],
] as const;

const NOMES_ATIVOS = readFileSync("tests/unidade/dados/disciplinas-ativas-2026-10-19.txt", "utf8")
  .split("\n")
  .filter((l) => l !== "");

/**
 * Os tempos do regime do curso da amostra — a semana inteira ocupada. **9 é o maior regime real**: medido na cópia
 * `remoto-20261019-024230.sql`, `curso_regime_historico.regime_tempos` vale 7 (16 vigências), 8 (17), 9 (7) e 0 (4).
 * ⚠️ Com 10, que não existe, o título cede 9 px na altura — o instrutor continua inteiro.
 */
const TEMPOS_POR_DIA = 9;

let EMAIL = "";
let TURMA = "";
let PREFIXO = "";

async function idPorCodigo(tabela: string, codigo: string, novo: Record<string, unknown>) {
  const { data: existe } = await admin.from(tabela).select("id").eq("codigo", codigo).maybeSingle();
  if (existe) return (existe as { id: string }).id;
  const { data, error } = await admin
    .from(tabela)
    .insert({ codigo, ...novo })
    .select("id")
    .single();
  if (error) throw new Error(`falha ao semear ${tabela} ${codigo}: ${error.message}`);
  return (data as { id: string }).id;
}

async function semear(processo: number): Promise<string> {
  PREFIXO = `DSACAR9-${processo}`;
  const sigla = `CUR-CARTAO9-${processo}`;
  const { data: existe } = await admin
    .from("cursos")
    .select("id")
    .eq("codigo", sigla)
    .maybeSingle();
  let cursoId = existe?.id as string | undefined;
  if (!cursoId) {
    const { data, error } = await admin.rpc("criar_curso_com_regime", {
      p_curso: {
        codigo: sigla,
        nome_curso: `Curso do cartão do papel ${processo}`,
        classificacao: "regular",
        modalidade: "presencial",
        duracao_dias: 200,
      },
      p_regime: {
        /* Dez tempos por dia: linhas mais baixas, o cartão de 1 TA no aperto de verdade. */
        regime_tempos: TEMPOS_POR_DIA,
        ta_duracao_min: 45,
        intervalo_manha_min: 10,
        intervalo_tarde_min: 10,
        hora_inicio_manha: "07:30",
        hora_inicio_tarde: "13:00",
        vigente_de: "2020-01-01",
      },
    });
    if (error) throw new Error(`falha ao semear ${sigla}: ${error.message}`);
    cursoId = (data as { id: string }).id;
  }
  await admin.from("cursos").update({ status: "ativo" }).eq("id", cursoId);

  const { error: erroTurma } = await admin.from("turmas").insert({
    curso_id: cursoId,
    ano_letivo: 2026,
    status: "ativa",
    modalidade: "presencial",
    data_inicio: "2026-03-30",
    data_termino: "2026-12-11",
    alunos: 12,
  });
  if (erroTurma) throw new Error(`falha ao criar a turma: ${erroTurma.message}`);
  const { data: turma } = await admin
    .from("turmas")
    .select("id, codigo")
    .eq("curso_id", cursoId)
    .eq("ano_letivo", 2026)
    .single();
  const turmaId = (turma as { id: string }).id;

  /* Um instrutor de nome comprido: é o pé do cartão que não pode sumir. */
  const instrutorId = await idPorCodigo("instrutores", `${PREFIXO}-INS`, {
    posto_graduacao: "CC",
    esp_hab_obs: "-T",
    nome_completo: "INSTRUTOR COM O NOME BEM COMPRIDO DO CARTÃO",
    nome_guerra: "COMPRIDO",
    categoria: "Militar",
    om: "CIAARA",
  });

  /* O nome de guerra também comprido: é ele que a tela corta com reticências quando o cartão é estreito. */
  await admin
    .from("instrutores")
    .update({ nome_guerra: "INSTRUTOR COMPRIDO DO CARTÃO DE UM TEMPO" })
    .eq("id", instrutorId);

  const ues: string[] = [];
  for (const [cod, nome, nomeNoDsa] of DISCIPLINAS) {
    const disciplinaId = await idPorCodigo("disciplinas", `${PREFIXO}-DIS-${cod}`, {
      curso_id: cursoId,
      cod_disciplina: cod,
      nome_disciplina: nome,
      carga_horaria_tempos: 30,
    });
    await admin
      .from("disciplinas")
      .update({ nome_disciplina: nome, nome_no_dsa: nomeNoDsa })
      .eq("id", disciplinaId);
    ues.push(
      await idPorCodigo("unidades_ensino", `${PREFIXO}-UE-${cod}`, {
        disciplina_id: disciplinaId,
        curso_id: cursoId,
        numero_ue: 1,
        topico: `Tópico de ${cod}`,
        ch_prevista_tempos: 30,
      }),
    );
  }

  /*
   * ⚠️ **A SEMANA CHEIA**: os dez tempos dos seis dias, todos de 1 TA. As linhas do papel são `minmax(auto, 1fr)` — com
   *    a grade vazia elas crescem com o conteúdo, e o cartão nunca aperta. Cheia, quem não cabe transborda: é o caso
   *    que o defeito de 13/10/2026 mostrou.
   */
  const aulas = DIAS.flatMap((data, d) =>
    Array.from({ length: TEMPOS_POR_DIA }, (_, t) => {
      const k = (d * TEMPOS_POR_DIA + t) % DISCIPLINAS.length;
      return {
        codigo: `${PREFIXO}-A-${d}-${t + 1}`,
        data,
        ta_inicial: t + 1,
        tempos_consumidos: 1,
        conteudo_resumo:
          "Conteúdo longo de propósito, que no cartão de um tempo só tem de ceder o espaço para o instrutor",
        local: "Laboratório de Informática",
        turma_id: turmaId,
        curso_id: cursoId,
        unidade_ensino_id: ues[k] as string,
        instrutor_id: instrutorId,
        metodologia: null,
      };
    }),
  );
  const { error } = await admin.from("registros_aula").upsert(aulas, { onConflict: "codigo" });
  if (error) throw new Error(`falha ao lançar as aulas: ${error.message}`);
  return (turma as { codigo: string }).codigo;
}

async function limpar(): Promise<void> {
  if (PREFIXO === "") return;
  const avisar = (o: string, error: { message: string } | null) => {
    if (error) throw new Error(`falha ao limpar ${o}: ${error.message}`);
  };
  avisar(
    "as aulas",
    (await admin.from("registros_aula").delete().like("codigo", `${PREFIXO}-%`)).error,
  );
  if (TURMA !== "") {
    const { data } = await admin.from("turmas").select("id").eq("codigo", TURMA).maybeSingle();
    if (data) await apagarLinhasDaTurma((data as { id: string }).id);
    avisar("a turma", (await admin.from("turmas").delete().eq("codigo", TURMA)).error);
  }
}

/** Quantas páginas tem um PDF do Chromium (`/Type /Page` sem o `/Pages` da árvore). */
function paginasDoPdf(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

/** O instrutor (`dentro`) inteiro dentro do cartão (`fora`), com meio pixel de folga de arredondamento. */
async function dentroDoCartao(cartao: Locator, instrutor: Locator): Promise<string | null> {
  const c = await cartao.boundingBox();
  const i = await instrutor.boundingBox();
  if (!c || !i) return "sem caixa";
  const ok =
    i.x >= c.x - 0.5 &&
    i.y >= c.y - 0.5 &&
    i.x + i.width <= c.x + c.width + 0.5 &&
    i.y + i.height <= c.y + c.height + 0.5;
  return ok ? null : `instrutor ${JSON.stringify(i)} fora do cartão ${JSON.stringify(c)}`;
}

/**
 * O texto cabe numa linha do título (nada escondido pelas reticências)?
 *
 * ⚠️ **O TÍTULO É ESTICADO ATÉ A LARGURA DISPONÍVEL ANTES DE MEDIR** (`flex: 1 1 0`): sem isso ele encolhe até o
 *    tamanho do texto, e o arredondamento de `scrollWidth` (para cima) contra `clientWidth` (para baixo) dizia *"não
 *    cabe"* a texto que cabia — a primeira medida deu L = 4. Comparar com a largura real, com 1 px de folga.
 */
async function cabeNumaLinha(elemento: Locator, texto: string): Promise<boolean> {
  return elemento.evaluate((el, t) => {
    const e = el as HTMLElement;
    e.style.flex = "1 1 0";
    e.textContent = t;
    return e.scrollWidth <= e.getBoundingClientRect().width + 1;
  }, texto);
}

async function irAoDsaDaSemana(page: Page): Promise<void> {
  await irAFichaDaTurma(page, EMAIL, TURMA);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await expect(page.getByRole("heading", { name: "Detalhe Semanal de Aula" })).toBeVisible();
  await irParaASemanaDoDia(page, DIAS[0], 43, 2026);
}

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("cartaodopapel", info.workerIndex);
  await apagarConta(EMAIL);
  await criarConta(EMAIL, `USR-CAR-${info.workerIndex}`);
  PREFIXO = `DSACAR9-${info.workerIndex}`;
  const { data: velho } = await admin
    .from("cursos")
    .select("id")
    .eq("codigo", `CUR-CARTAO9-${info.workerIndex}`)
    .maybeSingle();
  if (velho) {
    await admin.from("registros_aula").delete().like("codigo", `${PREFIXO}-%`);
    const { data: turmas } = await admin
      .from("turmas")
      .select("id")
      .eq("curso_id", (velho as { id: string }).id);
    for (const t of (turmas ?? []) as { id: string }[]) {
      await apagarLinhasDaTurma(t.id);
      await admin.from("turmas").delete().eq("id", t.id);
    }
  }
  TURMA = await semear(info.workerIndex);
});

test.afterAll(async () => {
  try {
    await limpar();
  } finally {
    await apagarConta(EMAIL);
  }
});

test.describe("FR-007 · o cartão do DSA com o nome que cabe e o instrutor inteiro", () => {
  test("na TELA: o instrutor inteiro em todo cartão de 1 TA, e o nome do cartão com o cadastrado", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    /* Uma janela estreita: o cartão da tela fica com a largura de um notebook pequeno. */
    await page.setViewportSize({ width: 1024, height: 900 });
    await irAoDsaDaSemana(page);
    /* As aulas; os cartões de Estudo Individual (um por dia) não entram na conta. */
    const cartoes = page.locator('[data-slot="dsa-cartao"][data-tipo="aula"]');
    await expect(cartoes).toHaveCount(DIAS.length * TEMPOS_POR_DIA);
    const falhas: string[] = [];
    for (let i = 0; i < DIAS.length * TEMPOS_POR_DIA; i += 1) {
      const instrutor = cartoes.nth(i).locator('[data-slot="cartao-instrutor"]');
      await expect(instrutor).toBeVisible();
      const cortado = await instrutor.evaluate((el) => el.scrollWidth > el.clientWidth + 0.5);
      if (cortado) falhas.push(`cartão ${i}: o instrutor saiu cortado`);
    }
    expect(falhas).toEqual([]);
    /* O cadastrado vale no cartão; o rótulo acessível continua com o nome inteiro (FR-007.3). */
    await expect(
      page.locator('[data-slot="cartao-nome"]', { hasText: "SOFTWARES AQUISIÇÃO" }),
    ).toHaveCount(TEMPOS_POR_DIA);
    await expect(
      page.locator('[aria-label*="PRINCIPAIS SOFTWARES EMPREGADOS NA AQUISIÇÃO"]'),
    ).not.toHaveCount(0);
  });

  test("no PAPEL: compacto de seis dias, o instrutor dentro de todo cartão, uma página — e o L medido", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await irAoDsaDaSemana(page);
    await page.locator('[data-slot="imprimir-dsa"]').click();
    await page.waitForURL(/\/print\/dsa/);
    const documento = page.locator('[data-slot="dsa-impresso"]');
    await expect(documento).toBeVisible();
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".dsa4.dsa4-compacto")).toHaveCount(1);

    const cartoes = page.locator('.dsa4 [data-slot="dsa-cartao"][data-tipo="aula"]');
    await expect(cartoes).toHaveCount(DIAS.length * TEMPOS_POR_DIA);
    const falhas: string[] = [];
    for (let i = 0; i < DIAS.length * TEMPOS_POR_DIA; i += 1) {
      const c = cartoes.nth(i);
      const erro = await dentroDoCartao(
        c,
        c.locator('.dsa4-cartao-pe > [data-slot="cartao-instrutor"]'),
      );
      if (erro) falhas.push(`cartão ${i}: ${erro}`);
    }
    expect(falhas, "algum cartão de 1 TA cortou o instrutor").toEqual([]);
    /* E o título (o código e o nome) inteiro na altura: na semana cheia ele não precisou ceder. */
    const titulosRecortados = await page
      .locator('.dsa4 [data-slot="dsa-cartao"][data-tipo="aula"] .dsa4-cartao-titulo')
      .evaluateAll((els) => els.map((e) => e.scrollHeight - e.clientHeight));
    expect(
      titulosRecortados.filter((px) => px > 1),
      "o título de algum cartão foi recortado",
    ).toEqual([]);

    /* O cadastrado no cartão; o nome inteiro no quadro de CH (FR-007.3). */
    await expect(
      page.locator(".dsa4-cartao-disciplina", { hasText: "SOFTWARES AQUISIÇÃO" }),
    ).toHaveCount(TEMPOS_POR_DIA);
    await expect(page.locator('[data-slot="dsa-quadro-de-ch"]')).toContainText(
      "PRINCIPAIS SOFTWARES EMPREGADOS NA AQUISIÇÃO E PROCESSAMENTO DE DADOS.",
    );

    const pdf = await page.pdf({ format: "A4", landscape: true });
    expect(paginasDoPdf(pdf), "o DSA dos cartões de 1 TA passou de uma página").toBe(1);

    /*
     * ⚠️ **A MEDIDA DO L** (R-8): no título do cartão do código mais largo (XXXVIII), o maior prefixo de cada nome
     *    ativo que cabe numa linha; L é o menor. E o SC-008: o nome do cartão dos 172 cabe — 172 de 172.
     */
    const titulo = page
      .locator('.dsa4 [data-slot="dsa-cartao"]', { hasText: "XXXVIII" })
      .first()
      .locator(".dsa4-cartao-disciplina");
    let minimo = Number.POSITIVE_INFINITY;
    for (const nome of NOMES_ATIVOS) {
      const letras = [...nome];
      let baixo = 0;
      let alto = letras.length;
      while (baixo < alto) {
        const meio = Math.ceil((baixo + alto) / 2);
        if (await cabeNumaLinha(titulo, letras.slice(0, meio).join(""))) baixo = meio;
        else alto = meio - 1;
      }
      /* Só restringe o L o nome que NÃO cabe inteiro (o "TFM." de 4 letras cabe e não diz nada sobre o limite). */
      if (baixo < letras.length) minimo = Math.min(minimo, baixo);
    }
    test.info().annotations.push({ type: "L medido", description: String(minimo) });
    console.log(
      `[dsa-cartao-do-papel] L medido = ${minimo}; L no domínio = ${LIMITE_DO_NOME_NO_DSA}`,
    );

    const naoCabem: string[] = [];
    for (const nome of NOMES_ATIVOS) {
      if (!(await cabeNumaLinha(titulo, abreviarNomeNoDsa(nome)))) naoCabem.push(nome);
    }
    expect(
      naoCabem,
      `SC-008: ${NOMES_ATIVOS.length - naoCabem.length} de ${NOMES_ATIVOS.length}`,
    ).toEqual([]);
    expect(NOMES_ATIVOS).toHaveLength(172);
    expect(LIMITE_DO_NOME_NO_DSA, "o L do domínio passa do que o papel mede").toBeLessThanOrEqual(
      minimo,
    );
  });
});

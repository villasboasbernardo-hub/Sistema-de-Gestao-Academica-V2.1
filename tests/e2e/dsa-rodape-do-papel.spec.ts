/**
 * O rodapé do DSA impresso com o quadro de CH em DUAS colunas — o quadro e as assinaturas **nunca se
 * cruzam**, e a folha continua em **uma** página A4 (ajuste B da conferência do PR #68, Bernardo Villas
 * Boas, 18/10/2026: *"o quadro de CH por disciplina (…), quando vai em DUAS colunas (turma com muitas
 * disciplinas, ex.: C-Ap-FR 2026), se sobrepõe à assinatura do Auxiliar/Sargento na impressão"*).
 *
 * ⚠️ **A SEMANA É A DE MAIS DISCIPLINAS QUE A SEMENTE TEM, E COM OS NOMES DO CURRÍCULO REAL.** As treze
 * disciplinas da C-Ap-FR, em maiúsculas e com ponto, como estão no cadastro — é a largura das palavras
 * que decide se a tabela cabe na coluna dela. Os nomes são do currículo da DEnsM, público (`UE-PUB`). E uma
 * décima quarta, com uma palavra longa, que é o que faz a tabela passar da coluna (ver `DISCIPLINAS`).
 *
 * ⚠️ **SE MEDEM AS TABELAS, NÃO O CONTÊINER DO QUADRO**: o contêiner fica na coluna da grade dele, e a
 * tabela que não cabe TRANSBORDA para fora dele — a caixa do contêiner não mostraria o cruzamento.
 *
 * ⚠️ **TUDO POR CLIQUE A PARTIR DO MENU**: *Turmas* → a turma → *Abrir o DSA* → a semana pela data →
 * *Imprimir*. A medida é feita com a mídia de impressão, que é onde o defeito foi visto.
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { apagarLinhasDaTurma } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { irParaASemanaDoDia } from "./percurso-do-dsa";

const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** As treze disciplinas da C-Ap-FR, como estão no cadastro (medido na cópia `remoto-20261017-005738.sql`). */
const DISCIPLINAS = [
  ["I", "INSTALAÇÕES ELÉTRICAS."],
  ["II", "AUXÍLIOS À NAVEGAÇÃO."],
  ["III", "EQUIPAMENTOS DE AUXÍLIOS À NAVEGAÇÃO."],
  ["IV", "PROJETOS DE AUXÍLIOS À NAVEGAÇÃO."],
  ["V", "OPERAÇÕES E ADM DE AUXÍLIOS À NAVEGAÇÃO."],
  ["VI", "NAVEGAÇÃO."],
  ["VII", "INGLÊS TÉCNICO."],
  ["VIII", "TOPOGRAFIA."],
  ["IX", "MANUTENÇÃO EM AUXÍLIOS À NAVEGAÇÃO FEITOS EM ALVENARIA."],
  ["X", "TFM."],
  ["XI", "PREVENÇÃO DE ACIDENTES."],
  ["XII", "EQUIPAMENTOS E SISTEMAS ELETRÔNICOS DE AUXÍLIOS À NAVEGAÇÃO."],
  ["XIII", "PRÁTICA DE  DE CURSO EM MANUTENÇÃO DE AUXÍLIOS À NAVEGAÇÃO."],
  /*
   * ⚠️ **E UMA COM PALAVRA LONGA, que o cadastro aceita** — a barra não é ponto de quebra de linha. É o que
   *    alarga a tabela além da coluna dela sem depender da fonte de quem imprime: a medida na cópia de 17/10
   *    deu, no Chromium, folga de 22 px (os 6 mm do `gap`) em todas as 131 semanas reais de duas colunas, e
   *    a mais apertada (C-Espc-FR) usava 290 dos 312 px da coluna. Texto mais largo — fonte, motor de
   *    impressão ou nome — passava por cima da assinatura.
   */
  [
    "XIV",
    "MANUTENÇÃO ELÉTRICA/ELETRÔNICA/HIDRÁULICA/MECÂNICA/PNEUMÁTICA/ÓPTICA DE AUXÍLIOS À NAVEGAÇÃO.",
  ],
] as const;

/** A semana de 12/10/2026 (semana 42), de segunda a sexta. */
const DIAS = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"] as const;

let EMAIL = "";
let TURMA = "";
let PREFIXO = "";

/** Um registro por chave, reaproveitado se já existir (regra 9.1: curso não se apaga). */
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
  PREFIXO = `DSAROD-${processo}`;
  const sigla = `CUR-RODAPE-${processo}`;
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
        nome_curso: `Curso do rodapé do papel ${processo}`,
        classificacao: "regular",
        modalidade: "presencial",
        duracao_dias: 200,
      },
      p_regime: {
        regime_tempos: 8,
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
    sala_alocada: null,
    alunos: 18,
  });
  if (erroTurma) throw new Error(`falha ao criar a turma: ${erroTurma.message}`);
  const { data: turma } = await admin
    .from("turmas")
    .select("id, codigo")
    .eq("curso_id", cursoId)
    .eq("ano_letivo", 2026)
    .single();
  const turmaId = (turma as { id: string }).id;

  const instrutorId = await idPorCodigo("instrutores", `${PREFIXO}-INS`, {
    posto_graduacao: "1ºTEN",
    esp_hab_obs: "-EF",
    nome_completo: "Instrutor do Rodapé",
    categoria: "Militar",
    om: "CIAARA",
  });

  /* As duas assinaturas com nome, posto e função — a caixa de cada uma tem a altura real. */
  for (const a of [
    {
      sufixo: "ELAB",
      papel_assinatura: "elaborador",
      posto_graduacao: "1ºSG",
      especialidade: "(RM2-T)",
      nome_guerra: "SARGENTO",
      nome_completo: `SAMUEL SARGENTO DO RODAPE ${processo}`,
      funcao_descricao: "Auxiliar da Div. de Adm. Academica",
    },
    {
      sufixo: "ENC",
      papel_assinatura: "encarregado_divisao",
      posto_graduacao: "CC",
      especialidade: null,
      nome_guerra: "ENCARREGADO",
      nome_completo: `ELIAS ENCARREGADO DO RODAPE ${processo}`,
      funcao_descricao: "Encarregado da Div. de Adm. Academica",
    },
  ] as const) {
    const { error } = await admin.from("responsaveis_curso").upsert(
      {
        codigo: `${PREFIXO}-${a.sufixo}`,
        curso_id: cursoId,
        papel_assinatura: a.papel_assinatura,
        preenchimento: "fixo",
        vigente_de: "2026-01-01",
        vigente_ate: null,
        exibir_no_dsa: true,
        ordem: 1,
        posto_graduacao: a.posto_graduacao,
        especialidade: a.especialidade,
        nome_guerra: a.nome_guerra,
        nome_completo: a.nome_completo,
        funcao_descricao: a.funcao_descricao,
      },
      { onConflict: "codigo" },
    );
    if (error) throw new Error(`falha ao criar o responsável ${a.sufixo}: ${error.message}`);
  }

  /* Cada disciplina com uma UE e uma aula de 2 TA na semana: as catorze entram no quadro de CH. */
  for (const [i, [cod, nome]] of DISCIPLINAS.entries()) {
    const disciplinaId = await idPorCodigo("disciplinas", `${PREFIXO}-DIS-${cod}`, {
      curso_id: cursoId,
      cod_disciplina: cod,
      nome_disciplina: nome,
      carga_horaria_tempos: 60,
    });
    /* O nome vale o desta execução, mesmo quando a disciplina vem de uma execução anterior. */
    await admin.from("disciplinas").update({ nome_disciplina: nome }).eq("id", disciplinaId);
    const ueId = await idPorCodigo("unidades_ensino", `${PREFIXO}-UE-${cod}`, {
      disciplina_id: disciplinaId,
      curso_id: cursoId,
      numero_ue: 1,
      topico: `Tópico de ${cod}`,
      ch_prevista_tempos: 30,
    });
    const { error } = await admin.from("registros_aula").upsert(
      {
        codigo: `${PREFIXO}-A-${cod}`,
        data: DIAS[i % DIAS.length],
        ta_inicial: 1 + 2 * Math.floor(i / DIAS.length),
        tempos_consumidos: 2,
        conteudo_resumo: `Conteúdo de ${cod}`,
        local: "Laboratório de Informática",
        turma_id: turmaId,
        curso_id: cursoId,
        unidade_ensino_id: ueId,
        instrutor_id: instrutorId,
        metodologia: null,
      },
      { onConflict: "codigo" },
    );
    if (error) throw new Error(`falha ao lançar a aula de ${cod}: ${error.message}`);
  }
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
  avisar(
    "os responsáveis",
    (await admin.from("responsaveis_curso").delete().like("codigo", `${PREFIXO}-%`)).error,
  );
}

/** Quantas páginas tem um PDF do Chromium (`/Type /Page` sem o `/Pages` da árvore). */
function paginasDoPdf(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

type Caixa = { x: number; y: number; width: number; height: number };

/** Duas caixas se cruzam quando se sobrepõem nos DOIS eixos — encostar não é cruzar. */
function cruzam(a: Caixa, b: Caixa): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** A menor caixa que contém todas. */
function uniao(lista: readonly Caixa[]): Caixa {
  const x = Math.min(...lista.map((c) => c.x));
  const y = Math.min(...lista.map((c) => c.y));
  const direita = Math.max(...lista.map((c) => c.x + c.width));
  const baixo = Math.max(...lista.map((c) => c.y + c.height));
  return { x, y, width: direita - x, height: baixo - y };
}

async function caixas(page: Page, seletor: string): Promise<Caixa[]> {
  const itens = page.locator(seletor);
  const n = await itens.count();
  const saida: Caixa[] = [];
  for (let i = 0; i < n; i += 1) {
    const caixa = await itens.nth(i).boundingBox();
    if (caixa) saida.push(caixa);
  }
  return saida;
}

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("rodapedopapel", info.workerIndex);
  /* Resto de uma execução interrompida: a conta sai antes de nascer de novo. */
  await apagarConta(EMAIL);
  await criarConta(EMAIL, `USR-ROD-${info.workerIndex}`);
  /* Resto de uma execução interrompida: a turma do curso sai antes de nascer de novo. */
  PREFIXO = `DSAROD-${info.workerIndex}`;
  const { data: velho } = await admin
    .from("cursos")
    .select("id")
    .eq("codigo", `CUR-RODAPE-${info.workerIndex}`)
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

test.describe("ajuste B do PR #68 · o quadro de CH em duas colunas não cruza as assinaturas", () => {
  test("menu Turmas → turma → DSA → Imprimir: quadro e assinaturas separados, numa página A4", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await irAFichaDaTurma(page, EMAIL, TURMA);
    await page.locator('[data-slot="abrir-o-dsa"]').click();
    await expect(page.getByRole("heading", { name: "Detalhe Semanal de Aula" })).toBeVisible();
    await irParaASemanaDoDia(page, DIAS[0], 42, 2026);
    await page.locator('[data-slot="imprimir-dsa"]').click();
    await page.waitForURL(/\/print\/dsa/);
    const documento = page.locator('[data-slot="dsa-impresso"]');
    await expect(documento).toBeVisible();
    await page.emulateMedia({ media: "print" });

    /* As catorze no quadro, e em DUAS colunas — é o caso do defeito. */
    const quadro = page.locator('[data-slot="dsa-quadro-de-ch"]');
    await expect(quadro.locator("tbody tr")).toHaveCount(DISCIPLINAS.length);
    await expect(quadro.locator("table")).toHaveCount(2);

    /*
     * ⚠️ **A CAIXA DO QUADRO É A UNIÃO DAS TABELAS**, não a do contêiner: a tabela que não cabe transborda a
     *    coluna dela, e o contêiner fica onde a grade o pôs — a caixa dele não mostraria o cruzamento.
     */
    const tabelas = await caixas(page, '[data-slot="dsa-quadro-de-ch"] table');
    const assinaturas = await caixas(page, '[data-slot="dsa-assinaturas"] .dsa4-assinatura');
    expect(tabelas).toHaveLength(2);
    expect(assinaturas).toHaveLength(2);
    const quadroDeCh = uniao(tabelas);
    for (const [j, a] of assinaturas.entries()) {
      expect(
        cruzam(quadroDeCh, a),
        `o quadro de CH cruza a ${j === 0 ? "assinatura da esquerda (o Auxiliar)" : "assinatura da direita"}: ` +
          `quadro ${JSON.stringify(quadroDeCh)} × assinatura ${JSON.stringify(a)}`,
      ).toBe(false);
    }

    const pdf = await page.pdf({ format: "A4", landscape: true });
    expect(paginasDoPdf(pdf), "o DSA de catorze disciplinas passou de uma página A4 paisagem").toBe(
      1,
    );
  });
});

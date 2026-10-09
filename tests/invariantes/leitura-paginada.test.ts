/**
 * Mais de 1.000 lançamentos numa turma — `DP-5` da spec 015.
 *
 * > *"a leitura busca em páginas de 1.000 até acabar, para o DSA e para a planilha. NÃO recusar
 * > acima de 1.000. Teste com mais de 1.000 linhas provando que nº do DSA e CH acumulada batem."*
 * > — Bernardo Villas Boas, 09/10/2026
 *
 * ⚠️ **ESTE TESTE FOI ESCRITO E RODADO ANTES DA PAGINAÇÃO, E REPROVOU** — é o caso que discrimina
 * (DoD 8). O teto do PostgREST (`max_rows = 1000`) corta a resposta sem erro, e o nº do DSA e a CH
 * acumulada saíam calculados sobre as primeiras mil linhas. O registro da reprovação está em
 * `specs/015-planilha-de-contingencia-do-dsa/medicoes.md`.
 *
 * ⚠️ **A VERDADE É LIDA À PARTE, por um laço de páginas próprio deste teste** — nunca pelo leitor sob
 * teste. O nº do DSA sai de `numeroDoDsa` sobre TODAS as datas; a CH, da soma de `tempos_consumidos`
 * de TODA a ocupação até o fim da semana. Só o que muda entre os dois lados é ter lido tudo.
 *
 * ⚠️ **A SEMANA SOLITÁRIA É INSERIDA POR ÚLTIMO.** As datas do nº do DSA vêm sem ordem do banco, na
 * ordem física, e numa base recém-semeada ela segue a de inserção: a última linha é a primeira a cair
 * fora das mil. Sem ela, cortar cem aulas de semanas cheias não mudaria o número.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { quadrosDaSemana } from "@/app/(app)/turmas/[turma]/dsa/consulta";
import { lerExtrasDaImpressao, lerSemanaDoDsa } from "@/app/(app)/turmas/[turma]/dsa/leitura";
import { montarDocumentoDoDsa } from "@/app/print/dsa/documento";
import { datasDaSemanaIso, semanaIsoDe } from "@/lib/dominio/carga-semanal";
import { numeroDoDsa } from "@/lib/dominio/dsa/numero-do-dsa";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "../e2e/conta-de-teste";
import { sessaoDe } from "../e2e/curso-de-teste";
import { limparDsa, semearDsa, type DsaSemeado } from "../e2e/dsa-de-teste";
import { createClient } from "@supabase/supabase-js";

const PROCESSO = 93;
const ANO = 2026;
/** As semanas da carga em massa: fora das que a semente do DSA usa (15, 20, 28) e antes da «à frente». */
const SEMANAS_EM_MASSA = Array.from({ length: 38 }, (_, i) => i + 2).filter(
  (s) => ![15, 20, 28].includes(s),
);
const SEMANA_SOLITARIA = 40;
const AULAS_EM_MASSA = 1100;

type Cliente = Parameters<typeof lerSemanaDoDsa>[0];

const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

let EMAIL = "";
let semeado: DsaSemeado | undefined;
let sessao: SupabaseClient;
let turma: { id: string; curso_id: string; data_inicio: string; alunos: number | null };

/** Lê uma lista inteira página a página — o laço próprio do teste, independente do leitor. */
async function tudo<T>(
  pedir: (de: number, ate: number) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<T[]> {
  const linhas: T[] = [];
  for (let de = 0; ; de += 500) {
    const { data, error } = await pedir(de, de + 499);
    if (error) throw new Error(`leitura da verdade falhou: ${JSON.stringify(error)}`);
    const pagina = (data ?? []) as T[];
    linhas.push(...pagina);
    if (pagina.length < 500) return linhas;
  }
}

beforeAll(async () => {
  EMAIL = emailDeTeste("paginada", PROCESSO);
  await criarConta(EMAIL, `USR-PAG-${PROCESSO}`);
  semeado = await semearDsa(PROCESSO, EMAIL);
  sessao = await sessaoDe(EMAIL);

  const { data: t, error: erroTurma } = await admin
    .from("turmas")
    .select("id, curso_id, data_inicio, alunos")
    .eq("codigo", semeado.turmaComRelogio)
    .single();
  if (erroTurma || !t) throw new Error(`turma da semente: ${erroTurma?.message}`);
  turma = t as typeof turma;

  /* O molde é uma aula da própria semente: mesma UE, mesmo instrutor, mesma sala. */
  const { data: molde, error: erroMolde } = await admin
    .from("registros_aula")
    .select("curso_id, unidade_ensino_id, instrutor_id, local")
    .eq("turma_id", turma.id)
    .like("codigo", `DSA-E2D${PROCESSO}-A2`)
    .single();
  if (erroMolde || !molde) throw new Error(`molde de aula: ${erroMolde?.message}`);

  const lugares: { data: string; ta: number }[] = [];
  for (const s of SEMANAS_EM_MASSA) {
    for (const data of datasDaSemanaIso(ANO, s).slice(0, 5)) {
      for (let ta = 1; ta <= 8; ta++) lugares.push({ data, ta });
    }
  }
  const linha = (codigo: string, l: { data: string; ta: number }) => ({
    ...molde,
    codigo,
    turma_id: turma.id,
    data: l.data,
    ta_inicial: l.ta,
    tempos_consumidos: 1,
    conteudo_resumo: "Aula da prova de paginação",
    metodologia: null,
  });
  const emMassa = lugares
    .slice(0, AULAS_EM_MASSA)
    .map((l, i) => linha(`PAG-${PROCESSO}-${String(i).padStart(4, "0")}`, l));
  for (let i = 0; i < emMassa.length; i += 500) {
    const { error } = await admin
      .from("registros_aula")
      .upsert(emMassa.slice(i, i + 500), { onConflict: "codigo" });
    if (error) throw new Error(`carga em massa: ${error.message}`);
  }
  /* ⚠️ Por último, e sozinha na semana. */
  const segundaSolitaria = datasDaSemanaIso(ANO, SEMANA_SOLITARIA)[0] as string;
  const { error: erroSolitaria } = await admin
    .from("registros_aula")
    .upsert(linha(`PAG-${PROCESSO}-SOLITARIA`, { data: segundaSolitaria, ta: 1 }), {
      onConflict: "codigo",
    });
  if (erroSolitaria) throw new Error(`aula solitária: ${erroSolitaria.message}`);
}, 180_000);

afterAll(async () => {
  await limparDsa(semeado);
  await apagarConta(EMAIL);
});

describe("`DP-5` · mais de 1.000 lançamentos: nº do DSA e CH acumulada batem", () => {
  it("controle positivo: a turma passa do teto de 1.000 na ocupação acumulada", async () => {
    const { count } = await sessao
      .from("vw_ocupacao_ta")
      .select("fato_id", { count: "exact", head: true })
      .eq("turma_id", turma.id);
    expect(count ?? 0).toBeGreaterThan(1000);
  });

  it("o nº do DSA, a CH do rodapé e o acumulado do painel batem com a contagem direta", async () => {
    const dias = datasDaSemanaIso(ANO, SEMANA_SOLITARIA);
    const fim = dias[5] as string;
    const hoje = fim;
    const cliente = sessao as unknown as Cliente;

    const [lida, extras] = await Promise.all([
      lerSemanaDoDsa(cliente, {
        turmaId: turma.id,
        cursoId: turma.curso_id,
        ano: ANO,
        numero: SEMANA_SOLITARIA,
        sabadoPedido: false,
        hoje,
      }),
      lerExtrasDaImpressao(cliente, { turmaId: turma.id, cursoId: turma.curso_id }),
    ]);
    const documento = montarDocumentoDoDsa({
      codigoDaTurma: semeado?.turmaComRelogio ?? "",
      turma,
      cursoId: turma.curso_id,
      escolha: { ano: ANO, numero: SEMANA_SOLITARIA },
      lida,
      extras,
      hoje,
    });

    /* ---- a verdade, lida à parte ---- */
    const aulas = await tudo<{ data: string }>((de, ate) =>
      admin
        .from("registros_aula")
        .select("data")
        .eq("turma_id", turma.id)
        .eq("status", "ativo")
        .not("ta_inicial", "is", null)
        .order("codigo")
        .range(de, ate),
    );
    const avaliacoes = await tudo<{ data_avaliacao: string }>((de, ate) =>
      admin
        .from("avaliacoes")
        .select("data_avaliacao")
        .eq("turma_id", turma.id)
        .neq("status", "cancelada")
        .not("ta_inicial", "is", null)
        .order("codigo")
        .range(de, ate),
    );
    const esperadoNumero = numeroDoDsa({
      datasComLancamento: [...aulas.map((a) => a.data), ...avaliacoes.map((a) => a.data_avaliacao)],
      dataInicio: turma.data_inicio,
      semana: { ano: ANO, numero: SEMANA_SOLITARIA },
    });

    const ocupacao = await tudo<{
      disciplina_id: string | null;
      tempos_consumidos: number | null;
    }>((de, ate) =>
      sessao
        .from("vw_ocupacao_ta")
        .select("disciplina_id, tempos_consumidos")
        .eq("turma_id", turma.id)
        .lte("data", fim)
        .order("data")
        .order("fato_id")
        .order("origem")
        .range(de, ate),
    );
    const somaPorDisciplina = new Map<string, number>();
    for (const o of ocupacao) {
      if (o.disciplina_id === null) continue;
      somaPorDisciplina.set(
        o.disciplina_id,
        (somaPorDisciplina.get(o.disciplina_id) ?? 0) + (o.tempos_consumidos ?? 0),
      );
    }
    const codigoPorId = new Map(lida.disciplinas.map((d) => [d.id, d.codigo]));
    const esperadoPorCodigo = new Map(
      [...somaPorDisciplina].map(([id, soma]) => [codigoPorId.get(id) ?? id, soma]),
    );
    expect([...esperadoPorCodigo.values()].reduce((a, b) => a + b, 0)).toBeGreaterThan(1000);

    /* ---- (1) o nº do DSA ---- */
    expect(semanaIsoDe(dias[0] as string)?.numero).toBe(SEMANA_SOLITARIA);
    expect.soft(documento.numero, "nº do DSA").toBe(esperadoNumero);

    /* ---- (2) a CH cumprida do rodapé ---- */
    const rodape = new Map(documento.quadroDeCh.map((q) => [q.codigo, q.cumprida]));
    for (const [codigo, soma] of esperadoPorCodigo) {
      if (rodape.has(codigo)) expect.soft(rodape.get(codigo), `rodapé de ${codigo}`).toBe(soma);
    }

    /* ---- (3) o acumulado do painel ---- */
    const painel = quadrosDaSemana({
      execucao: extras.execucao,
      ocupacao: lida.ocupacaoAcumulada,
      emConflito: new Set<string>(),
      ateODia: fim,
      hoje,
    });
    for (const q of painel) {
      expect
        .soft(q.chAcumulada, `painel de ${q.codigo}`)
        .toBe(esperadoPorCodigo.get(q.codigo) ?? 0);
    }
  }, 120_000);
});

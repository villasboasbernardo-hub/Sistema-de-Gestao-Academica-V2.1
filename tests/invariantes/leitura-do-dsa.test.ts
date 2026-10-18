/**
 * A leitura do DSA traz as **duas** atribuições da turma — por UE e por disciplina —, que são os dois
 * primeiros degraus da sugestão de instrutor (FR-012.1 e FR-012.2 da spec 016; `PEND-DSA-SUGESTAO`).
 *
 * > *"A leitura das atribuições por UE MUST ligar pela linha da turma e só considerar atribuição ativa;
 * > um erro dessa leitura MUST aparecer, e não virar lista vazia em silêncio."* — FR-012.1
 *
 * ⚠️ **O CASO QUE DISCRIMINA É A CONSULTA ANTIGA** (DoD 8): ela filtrava `turma_disciplina_unidade` por
 * `turma_id`, coluna que a tabela não tem — falhava sempre, e a lista chegava vazia, sem erro na tela.
 * Com ela de volta, este teste reprova duas vezes: a atribuição por UE some, e o erro aparece.
 *
 * ⚠️ **COM SESSÃO DE VERDADE**, como `leitura-paginada.test.ts`: a leitura é a da tela, com a RLS ligada.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { lerSemanaDoDsa } from "@/app/(app)/turmas/[turma]/dsa/leitura";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "../e2e/conta-de-teste";
import { sessaoDe } from "../e2e/curso-de-teste";
import { ANO, SEMANA, limparDsa, semearDsa, type DsaSemeado } from "../e2e/dsa-de-teste";

const PROCESSO = 97;

type Cliente = Parameters<typeof lerSemanaDoDsa>[0];

const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

let EMAIL = "";
let semeado: DsaSemeado | undefined;
let sessao: SupabaseClient;
let turma = { id: "", curso_id: "" };
let disciplinaId = "";
let unidadeId = "";
let instrutorId = "";
let turmaDisciplinaId = "";

async function idDe(tabela: string, filtros: Record<string, string>): Promise<string> {
  let consulta = admin.from(tabela).select("id");
  for (const [coluna, valor] of Object.entries(filtros)) consulta = consulta.eq(coluna, valor);
  const { data, error } = await consulta.single();
  if (error || !data) throw new Error(`${tabela} da semente: ${error?.message}`);
  return (data as { id: string }).id;
}

async function limparAtribuicoes(): Promise<void> {
  if (turmaDisciplinaId === "") return;
  await admin
    .from("turma_disciplina_unidade")
    .delete()
    .eq("turma_disciplina_id", turmaDisciplinaId);
  await admin
    .from("turma_disciplina_instrutor")
    .delete()
    .eq("turma_disciplina_id", turmaDisciplinaId);
  await admin.from("turma_disciplina").delete().eq("id", turmaDisciplinaId);
}

beforeAll(async () => {
  EMAIL = emailDeTeste("leituradsa", PROCESSO);
  await criarConta(EMAIL, `USR-LEIT-${PROCESSO}`);
  semeado = await semearDsa(PROCESSO, EMAIL);
  sessao = await sessaoDe(EMAIL);

  const { data: t, error } = await admin
    .from("turmas")
    .select("id, curso_id")
    .eq("codigo", semeado.turmaComRelogio)
    .single();
  if (error || !t) throw new Error(`turma da semente: ${error?.message}`);
  turma = t as typeof turma;
  disciplinaId = await idDe("disciplinas", {
    curso_id: turma.curso_id,
    cod_disciplina: semeado.codDisciplina,
  });
  unidadeId = await idDe("unidades_ensino", { disciplina_id: disciplinaId, numero_ue: "1" });
  instrutorId = await idDe("instrutores", { nome_completo: semeado.nomeHabilitado });

  /*
   * A linha da turma, a parcela do instrutor na disciplina e a atribuição dele na única UE.
   * ⚠️ `codigo` explícito nas três: os `DEFAULT` chamam funções de `app`, onde a `service_role` não tem
   *    `usage` (gotcha 5.1). E a parcela vem ANTES da UE, como em `rateio-da-view.test.ts`.
   */
  const { data: td, error: erroTd } = await admin
    .from("turma_disciplina")
    .insert({
      codigo: `TDI-LEIT-${PROCESSO}`,
      turma_id: turma.id,
      disciplina_id: disciplinaId,
      status: "ativo",
    })
    .select("id")
    .single();
  if (erroTd || !td) throw new Error(`falha ao criar a linha da turma: ${erroTd?.message}`);
  turmaDisciplinaId = (td as { id: string }).id;
  const { error: erroParcela } = await admin.from("turma_disciplina_instrutor").insert({
    codigo: `TDI-LEIT-${PROCESSO}#1`,
    turma_disciplina_id: turmaDisciplinaId,
    instrutor_id: instrutorId,
    status: "ativo",
  });
  if (erroParcela) throw new Error(`falha ao atribuir na disciplina: ${erroParcela.message}`);
  const { error: erroUe } = await admin.from("turma_disciplina_unidade").insert({
    codigo: `TDU-LEIT-${PROCESSO}`,
    turma_disciplina_id: turmaDisciplinaId,
    disciplina_id: disciplinaId,
    unidade_ensino_id: unidadeId,
    instrutor_id: instrutorId,
    status: "ativo",
  });
  if (erroUe) throw new Error(`falha ao atribuir na UE: ${erroUe.message}`);
}, 120_000);

afterAll(async () => {
  await limparAtribuicoes();
  await limparDsa(semeado);
  await apagarConta(EMAIL);
});

describe("FR-012.1 · a leitura do DSA traz as atribuições da turma", () => {
  it("por UE e por disciplina, sem erro de leitura", async () => {
    const lida = await lerSemanaDoDsa(sessao as unknown as Cliente, {
      turmaId: turma.id,
      cursoId: turma.curso_id,
      ano: ANO,
      numero: SEMANA,
      sabadoPedido: false,
      hoje: "2026-04-08",
    });
    expect(lida.errosDeLeitura, "a leitura falhou em alguma lista").toEqual([]);
    expect(lida.atribuicoesPorUe).toContainEqual({ unidadeEnsinoId: unidadeId, instrutorId });
    expect(lida.atribuicoesPorDisciplina).toContainEqual({ disciplinaId, instrutorId });
  }, 60_000);
});

/**
 * Spec 018 (Bloco 3), C-9 — **o DSA e as ações do DSA usam o regime nomeado da turma**, com sessão real e a MESMA
 * leitura da tela (`lerSemanaDoDsa`) e das ações (`temposDoDiaDaTurmaNoServidor`).
 *
 * O caso que discrimina (DoD 8): duas turmas do MESMO curso (regime vigente de 8 TA, manhã às 07:30); a T1 escolhe o
 * *Regime B* (9 TA, manhã às 07:15) e a T2 não escolhe. O relógio da T1 tem 9 tempos e começa às 07:15; o da T2 fica
 * como antes, 8 tempos às 07:30. Sem a mudança no DSA, a T1 sairia igual à T2.
 *
 * ⚠️ Regra 9.1: o curso não se apaga — a amostra o reaproveita; turmas e regimes saem no fim.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { lerSemanaDoDsa } from "@/app/(app)/turmas/[turma]/dsa/leitura";
import { temposDoDiaDaTurmaNoServidor } from "@/lib/acoes/regime-do-dia";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "../e2e/conta-de-teste";
import { sessaoDe } from "../e2e/curso-de-teste";

const PROCESSO = 92;
const SIGLA = `CUR-RGD-${PROCESSO}`;
/** Terça, 04/04/2045 — semana 14 (longe de 2026, onde há amostra com atividade global). */
const SEMANA = { ano: 2045, numero: 14, hoje: "2045-04-04" };

type Cliente = Parameters<typeof lerSemanaDoDsa>[0];

const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

let EMAIL = "";
let sessao: SupabaseClient;
let cursoId = "";
const turmas = { comRegime: "", semRegime: "" };

function conferir(o: string, error: { message: string } | null): void {
  if (error) throw new Error(`${o}: ${error.message}`);
}

async function limpar(): Promise<void> {
  if (cursoId === "") return;
  const { data } = await admin.from("turmas").select("id").eq("curso_id", cursoId);
  for (const t of (data ?? []) as { id: string }[]) {
    conferir("linhas", (await admin.from("turma_disciplina").delete().eq("turma_id", t.id)).error);
    conferir("turma", (await admin.from("turmas").delete().eq("id", t.id)).error);
  }
  conferir(
    "regimes",
    (await admin.from("regimes_de_horario").delete().eq("curso_id", cursoId)).error,
  );
}

beforeAll(async () => {
  EMAIL = emailDeTeste("regime-dsa", PROCESSO);
  await criarConta(EMAIL, `USR-RGD-${PROCESSO}`);
  sessao = await sessaoDe(EMAIL);

  const { data: existe } = await admin
    .from("cursos")
    .select("id")
    .eq("codigo", SIGLA)
    .maybeSingle();
  if (existe) cursoId = (existe as { id: string }).id;
  else {
    const { data, error } = await admin.rpc("criar_curso_com_regime", {
      p_curso: {
        codigo: SIGLA,
        nome_curso: `Curso do regime no DSA ${PROCESSO}`,
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
        hora_inicio_tarde: "13:30",
        vigente_de: "2020-01-01",
      },
    });
    conferir("curso", error);
    cursoId = (data as { id: string }).id;
  }
  await limpar();

  const regimeId = crypto.randomUUID();
  conferir(
    "regime",
    (
      await admin.from("regimes_de_horario").insert({
        id: regimeId,
        curso_id: cursoId,
        nome: "Regime B",
        regime_tempos: 9,
        ta_duracao_min: 45,
        intervalo_manha_min: 5,
        intervalo_tarde_min: 5,
        hora_inicio_manha: "07:15",
        hora_inicio_tarde: "13:15",
      })
    ).error,
  );
  for (const [rotulo, regime] of [
    ["T1", regimeId],
    ["T2", null],
  ] as const) {
    conferir(
      `turma ${rotulo}`,
      (
        await admin.from("turmas").insert({
          curso_id: cursoId,
          turma: rotulo,
          ano_letivo: 2045,
          status: "ativa",
          modalidade: "presencial",
          data_inicio: "2045-01-09",
          data_termino: "2045-12-15",
          regime_de_horario_id: regime,
        })
      ).error,
    );
  }
  const { data: criadas } = await admin.from("turmas").select("id, turma").eq("curso_id", cursoId);
  for (const t of (criadas ?? []) as { id: string; turma: string }[]) {
    if (t.turma === "T1") turmas.comRegime = t.id;
    else turmas.semRegime = t.id;
  }
}, 120_000);

afterAll(async () => {
  await limpar();
  await apagarConta(EMAIL);
});

const semanaDa = (turmaId: string) =>
  lerSemanaDoDsa(sessao as unknown as Cliente, {
    turmaId,
    cursoId,
    ano: SEMANA.ano,
    numero: SEMANA.numero,
    sabadoPedido: false,
    hoje: SEMANA.hoje,
  });

describe("Spec 018 · C-9 · o relógio do DSA é o do regime da turma", () => {
  it("a turma com o Regime B: 9 tempos do regime, a manhã às 07:15", async () => {
    const semana = await semanaDa(turmas.comRegime);
    expect(semana.relogio?.temposDoRegime).toBe(9);
    expect(semana.relogio?.tempos[0]?.inicio).toBe("07:15");
  });

  it("a turma sem escolha: como antes — 8 tempos, a manhã às 07:30", async () => {
    const semana = await semanaDa(turmas.semRegime);
    expect(semana.relogio?.temposDoRegime).toBe(8);
    expect(semana.relogio?.tempos[0]?.inicio).toBe("07:30");
  });
});

describe("Spec 018 · C-9 · os TA do dia nas ações do DSA (excepcional, cascata, dia parado)", () => {
  it("o regime da turma vence o do curso; sem escolha, é o do curso", async () => {
    const cliente = sessao as unknown as Parameters<typeof temposDoDiaDaTurmaNoServidor>[0];
    expect(
      await temposDoDiaDaTurmaNoServidor(cliente, { turmaId: turmas.comRegime, cursoId }),
    ).toBe(9);
    expect(
      await temposDoDiaDaTurmaNoServidor(cliente, { turmaId: turmas.semRegime, cursoId }),
    ).toBe(8);
  });
});

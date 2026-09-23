/**
 * A amostra de cursos e turmas é o que ela promete — e **semear duas vezes seguidas não a quebra**.
 *
 * ⚠️ **ESTE ARQUIVO EXISTE POR CAUSA DA REGRA 9.1 DO `CLAUDE.md`**: *"a idempotência MUST ser provada
 * rodando a suíte DUAS VEZES SEGUIDAS — é o único jeito de saber que a limpeza não era o que fazia a
 * suíte passar"*. Por isso o caso semeia **duas vezes sem limpar entre as duas** e mede a segunda: se
 * a semeadura dependesse da base limpa, as contagens dobrariam ou o `23505` apareceria aqui, e não
 * três fatias adiante num percurso que nada tem a ver.
 *
 * ⚠️ **A AMOSTRA É FIXTURE, E FIXTURE SEM GUARDA ENVELHECE CALADA.** As telas das US1 a US6 vão ler
 * dela "o curso sem propósito", "a turma sem sala", "a vigência que só a atividade global trava". No
 * dia em que uma dessas propriedades sumir, o percurso que a usa reprova por um motivo que parece
 * ser da tela — e é da amostra.
 *
 * ⚠️ **A RPC DE PROTEÇÃO É LIDA POR SESSÃO, NUNCA PELA `service_role`.** Ela tem porteiro na própria
 * consulta — `app.pode('turmas','editar')` e `app.alcanca_curso()` —, e a `service_role` não tem
 * linha em `usuarios`: ela recebe **lista vazia**, que se lê como "a atividade global não alcança
 * nada". Medido em 23/09/2026, e foi o primeiro diagnóstico errado desta amostra.
 *
 * Origem: T110 da spec 009 · `SC-001`, `SC-001.3`, `SC-003.1`, `SC-011.1`, `SC-014`.
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { sessaoDe } from "./curso-de-teste";
import {
  CLASSIFICACOES_SEMEADAS,
  limparCursos,
  semearCursos,
  vigenciaPadraoAtiva,
  type CursosSemeados,
} from "./cursos-de-teste";

const admin = () =>
  createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

let EMAIL = "";
let SEMEADO: CursosSemeados;

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("amostra-cursos", info.workerIndex);
  await criarConta(EMAIL, `USR-AMOSTRA-CUR-${info.workerIndex}`);
});

test.afterAll(async () => {
  await limparCursos(SEMEADO);
  await apagarConta(EMAIL);
});

test("semeia, semeia de novo sem limpar, e a amostra é a que promete", async ({}, info) => {
  const p = info.workerIndex;

  SEMEADO = await semearCursos(p, EMAIL);
  // ⚠️ A SEGUNDA SEM LIMPAR: é ela que prova que a idempotência não é a limpeza.
  const segunda = await semearCursos(p, EMAIL);
  SEMEADO = segunda;

  const siglas = Object.values(segunda.porClassificacao);
  const { data: cursos } = await admin()
    .from("cursos")
    .select("codigo, classificacao, status, duracao_semanas, proposito")
    .in("codigo", siglas);
  expect(cursos).toHaveLength(5);
  expect(new Set(cursos?.map((c) => c.classificacao))).toEqual(new Set(CLASSIFICACOES_SEMEADAS));

  const especial = cursos?.find((c) => c.classificacao === "especial");
  expect(especial?.status, "o curso especial tinha de estar inativo").toBe("inativo");

  const estagio = cursos?.find((c) => c.classificacao === "estagio_qualificacao");
  expect(estagio?.duracao_semanas).toBeNull();
  expect(estagio?.proposito).toBeNull();

  const { data: turmas } = await admin()
    .from("turmas")
    .select("codigo, status, data_inicio, data_termino, sala_alocada, curso_id, cursos(codigo)")
    .in("codigo", [
      segunda.turmaJanelaCedo,
      segunda.turmaJanelaTarde,
      ...segunda.turmasCanceladas,
      segunda.turmaAtivaComTerminoPassado,
      segunda.turmaSemJanela,
      segunda.turmaSemSala,
    ]);
  expect(turmas, "7 turmas na segunda semeadura, nem 14 nem 7 de execuções somadas").toHaveLength(
    7,
  );

  const por = (c: string) => turmas?.find((t) => t.codigo === c);
  expect(por(segunda.turmaJanelaCedo)?.data_inicio).not.toBe(
    por(segunda.turmaJanelaTarde)?.data_inicio,
  );
  expect(segunda.turmasCanceladas).toHaveLength(2);
  for (const c of segunda.turmasCanceladas) expect(por(c)?.status).toBe("cancelada");
  expect(por(segunda.turmaAtivaComTerminoPassado)?.status).toBe("ativa");
  expect(por(segunda.turmaAtivaComTerminoPassado)!.data_termino! < "2026-09-23").toBe(true);
  expect(por(segunda.turmaSemJanela)?.data_inicio).toBeNull();
  expect(por(segunda.turmaSemJanela)?.data_termino).toBeNull();
  expect(por(segunda.turmaSemSala)?.sala_alocada).toBeNull();

  // O código da turma foi GERADO pelo gatilho — a amostra nunca o escreveu.
  expect(segunda.turmaJanelaCedo).toBe(`${segunda.porClassificacao.regular} T1 2026`);

  const { data: atividade } = await admin()
    .from("atividades_nao_letivas")
    .select("escopo, turma_id, data")
    .eq("codigo", segunda.atividadeGlobal)
    .single();
  expect(atividade?.escopo).toBe("global");
  expect(atividade?.turma_id).toBeNull();

  const { data: sala } = await admin()
    .from("config_listas")
    .select("valor, ativo, metadados")
    .eq("lista", "salas")
    .eq("valor", segunda.salaDeTeste)
    .single();
  expect(sala?.ativo).toBe(true);

  // ── As duas vigências: uma travada por lançamento próprio, outra corrigível ──────────────────
  const travada = await vigenciaPadraoAtiva(segunda.porClassificacao.regular);
  const corrigivel = await vigenciaPadraoAtiva(segunda.porClassificacao.estagio_qualificacao);
  expect(travada).not.toBe(corrigivel);

  const { data: regularId } = await admin()
    .from("cursos")
    .select("id")
    .eq("codigo", segunda.porClassificacao.regular)
    .single();
  const { count } = await admin()
    .from("registros_aula")
    .select("*", { count: "exact", head: true })
    .eq("curso_id", regularId!.id);
  expect(count, "o curso regular tinha de ter exatamente 1 lancamento").toBe(1);

  const { data: estagioId } = await admin()
    .from("cursos")
    .select("id")
    .eq("codigo", segunda.porClassificacao.estagio_qualificacao)
    .single();
  const { count: semLancamento } = await admin()
    .from("registros_aula")
    .select("*", { count: "exact", head: true })
    .eq("curso_id", estagioId!.id);
  expect(semLancamento, "o estagio tinha de ficar SEM lancamento, para ser corrigivel").toBe(0);

  // A RPC de leitura enxerga a atividade global alcançando o aperfeiçoamento.
  const { data: apaId } = await admin()
    .from("cursos")
    .select("id")
    .eq("codigo", segunda.porClassificacao.aperfeicoamento_avancado)
    .single();
  // ⚠️ PELA SESSÃO, NUNCA PELA `service_role`: a RPC tem porteiro — `app.pode('turmas','editar')` e
  //    `app.alcanca_curso()` —, e a service_role não tem linha em `usuarios`, logo recebe VAZIO.
  const sessao = await sessaoDe(EMAIL);
  const { data: protecao, error: erroProtecao } = await sessao.rpc(
    "protecao_das_vigencias_por_atividade_global",
    { p_curso_id: apaId!.id },
  );
  expect(erroProtecao).toBeNull();
  expect(
    protecao,
    "a atividade global tinha de alcancar a vigencia do aperfeicoamento",
  ).toHaveLength(1);
  expect(protecao![0].travada_por_lancamento_proprio).toBe(false);
  expect(protecao![0].turmas).toContain(segunda.turmaAtivaComTerminoPassado);
});

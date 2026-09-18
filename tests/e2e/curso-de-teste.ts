/**
 * Mudar a situação de um curso **pelo caminho real** — sessão autenticada, RLS ligada.
 *
 * ⚠️ **NÃO USE A `service_role` PARA DESATIVAR CURSO.** Ela não tem linha em `usuarios`, portanto não
 * tem perfil, e a guarda `app.guardar_situacao_do_curso()` a recusa com `situacao_sem_permissao`
 * (`FR-017.2`). O achado mordeu a própria amostra em 18/09/2026: a desativação "administrativa"
 * falhava e o caso reprovava por um motivo que nada tinha a ver com o que ele media.
 *
 * ⚠️ **E NÃO USE A SERVER ACTION**: `desativarCurso` só nasce no PR 2 (A-4). Aqui a escrita vai pela
 * API com a sessão de quem tem `cursos.desativar`, que é o mesmo porteiro que a tela vai usar.
 *
 * ⚠️ **REATIVAR REENVIA A LINHA INTEIRA**, e não só `status` — é o que o formulário faz, e é o único
 * caminho que prova que a guarda decide POR VALOR (`FR-017.4`). Mandar só `status` passaria também
 * numa implementação que exigisse "só a coluna status no UPDATE", que é a implementação errada.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SENHA_DE_TESTE, chaveLocal } from "./conta-de-teste";

/** Abre uma sessão de verdade e devolve o cliente já autenticado. */
export async function sessaoDe(email: string): Promise<SupabaseClient> {
  const cliente = createClient(chaveLocal("API_URL"), chaveLocal("PUBLISHABLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await cliente.auth.signInWithPassword({ email, password: SENHA_DE_TESTE });
  if (error) throw new Error(`nao consegui abrir sessao para ${email}: ${error.message}`);
  return cliente;
}

/**
 * Põe o curso em `inativo` ou `ativo`, pela sessão informada. Devolve o `id` do curso, que é o que
 * as asserções usam para conferir pelo banco o que ficou gravado.
 */
export async function mudarSituacaoDoCurso(
  email: string,
  codigoDoCurso: string,
  situacao: "ativo" | "inativo",
): Promise<string> {
  const sessao = await sessaoDe(email);

  const { data: curso, error: erroLeitura } = await sessao
    .from("cursos")
    .select("*")
    .eq("codigo", codigoDoCurso)
    .maybeSingle();
  if (erroLeitura) throw new Error(`nao li o curso ${codigoDoCurso}: ${erroLeitura.message}`);
  if (!curso) throw new Error(`curso ${codigoDoCurso} nao alcancado pela sessao de ${email}`);
  if (curso.status === situacao) return curso.id as string;

  /*
   * A linha INTEIRA de volta, menos o que o banco calcula sozinho: o quarteto de auditoria é do
   * gatilho, e `nome_normalizado` é coluna GERADA — mandá-la é erro do PostgREST, não da regra.
   */
  const linha = { ...curso, status: situacao } as Record<string, unknown>;
  for (const calculada of [
    "criado_por",
    "criado_em",
    "editado_por",
    "editado_em",
    "nome_normalizado",
  ]) {
    delete linha[calculada];
  }

  const { error } = await sessao.from("cursos").update(linha).eq("id", curso.id);
  if (error) {
    throw new Error(`nao consegui pôr ${codigoDoCurso} em ${situacao}: ${error.message}`);
  }
  return curso.id as string;
}

/**
 * Põe a turma num status e devolve o que ela tinha antes.
 *
 * ⚠️ **É PRÉ-REQUISITO PARA DESATIVAR O CURSO, e não conveniência do teste.** A guarda
 * `curso_com_turma_pendente` (`FR-017.2`) recusa desativar curso com turma `planejada` ou `ativa` —
 * e essa recusa é a regra funcionando. Uma amostra que a contornasse pela `service_role` estaria
 * provando outra coisa.
 *
 * ⚠️ **E A ORDEM IMPORTA NA VOLTA**: reative o CURSO antes de devolver o status da turma. Com o curso
 * inativo, a escrita em `turmas` é recusada pela condição de oferta — que é exatamente o ponto.
 */
export async function mudarStatusDaTurma(
  email: string,
  codigoDaTurma: string,
  status: "planejada" | "ativa" | "concluida" | "cancelada",
): Promise<string> {
  const sessao = await sessaoDe(email);
  const { data: turma, error: erroLeitura } = await sessao
    .from("turmas")
    .select("id, status")
    .eq("codigo", codigoDaTurma)
    .maybeSingle();
  if (erroLeitura) throw new Error(`nao li a turma ${codigoDaTurma}: ${erroLeitura.message}`);
  if (!turma) throw new Error(`turma ${codigoDaTurma} nao alcancada pela sessao de ${email}`);
  const anterior = turma.status as string;
  if (anterior === status) return anterior;

  const { error } = await sessao.from("turmas").update({ status }).eq("id", turma.id);
  if (error) {
    throw new Error(`nao consegui pôr a turma ${codigoDaTurma} em ${status}: ${error.message}`);
  }
  return anterior;
}

/**
 * Um curso SÓ DESTA PROVA, com uma disciplina — idempotente e por processo de trabalho.
 *
 * ⚠️ **CURSO PRÓPRIO, E NÃO O DA AMOSTRA COMPARTILHADA.** `fullyParallel` está ligado: desativar o
 * curso que os outros casos usam os derrubaria, e a reprovação apareceria longe da causa — que é o
 * achado 5 da fatia (c) do Épico 4 repetido de propósito.
 *
 * ⚠️ **E ELE NASCE SEM TURMA**, o que também é escolha: a guarda `curso_com_turma_pendente`
 * (`FR-017.2`) recusa desativar curso com turma `planejada` ou `ativa`, e aqui o que se quer medir é
 * o vazamento, não a guarda — que tem prova própria no `105`.
 */
export async function semearCursoInativavel(processo: number): Promise<{
  readonly codigo: string;
  readonly cursoId: string;
  readonly disciplinaId: string;
  readonly nomeDaDisciplina: string;
}> {
  const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const codigo = `CUR-INAT-${processo}`;
  const nomeDaDisciplina = `Disciplina de curso inativavel ${processo}`;

  // ⚠️ IDEMPOTENTE: curso não é apagável (regra 9.1 do CLAUDE.md), então reaproveita-se o que existe.
  const { data: existente } = await admin
    .from("cursos")
    .select("id")
    .eq("codigo", codigo)
    .maybeSingle();

  let cursoId = existente?.id as string | undefined;
  if (!cursoId) {
    const { data: criado, error } = await admin.rpc("criar_curso_com_regime", {
      p_curso: {
        codigo,
        nome_curso: `Curso inativavel da prova ${processo}`,
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
    if (error) throw new Error(`falha ao semear ${codigo}: ${error.message}`);
    cursoId = (criado as { id: string }).id;
  }

  // O curso pode ter ficado inativo numa execução anterior; a amostra começa sempre ativa.
  await admin.from("cursos").update({ status: "ativo" }).eq("id", cursoId);

  const { data: jaTem } = await admin
    .from("disciplinas")
    .select("id")
    .eq("curso_id", cursoId)
    .eq("cod_disciplina", `INAT${processo}`)
    .maybeSingle();

  let disciplinaId = jaTem?.id as string | undefined;
  if (!disciplinaId) {
    const { data: nova, error } = await admin
      .from("disciplinas")
      .insert({
        codigo: `DISC-INAT-${processo}`,
        curso_id: cursoId,
        cod_disciplina: `INAT${processo}`,
        nome_disciplina: nomeDaDisciplina,
        carga_horaria_tempos: 10,
      })
      .select("id")
      .single();
    if (error) throw new Error(`falha ao semear a disciplina de ${codigo}: ${error.message}`);
    disciplinaId = nova.id as string;
  }
  await admin.from("disciplinas").update({ status: "ativo" }).eq("id", disciplinaId);

  return { codigo, cursoId: cursoId as string, disciplinaId, nomeDaDisciplina };
}

/**
 * O dado mínimo para o panorama ter o que mostrar — **semeado por processo de trabalho**.
 *
 * ⚠️ **A BASE LOCAL ESTÁ VAZIA, E ISSO É ESTADO SUPORTADO.** As migrações do Épico 1 criam o schema;
 * a carga do Épico 2 é passo à parte, e as asserções de banco já rodam verdes com a base povoada
 * **e** vazia. Semear aqui é o que permite provar recorte e progresso sem depender de a carga ter
 * sido feita nesta máquina.
 *
 * ⚠️ **CÓDIGOS ÚNICOS POR PROCESSO, pelo mesmo motivo de sempre:** o preparo roda uma vez por
 * processo de trabalho, e dois processos semeando o mesmo `codigo` colidem na restrição de unicidade
 * — falha que parece defeito do schema e é corrida do teste.
 *
 * ⚠️ **A LEITURA DO AMBIENTE É A MESMA DE `conta-de-teste.ts`, e não uma cópia.** A cópia existiu por
 * meia hora e reintroduziu a falha que aquele arquivo tinha acabado de corrigir: dois leitores
 * chamando `supabase status` ao mesmo tempo derrubam a CLI, e o caso que reprova é sempre outro.
 *
 * ⚠️ **OS NÚMEROS SÃO ESCOLHIDOS PARA PRODUZIR OS DOIS LADOS DO `RF-INI-01`:** uma turma com saldo
 * **negativo** de capacidade, que é a definição de atraso, e uma com saldo positivo. Uma amostra em
 * que tudo vai bem não distingue a implementação certa da que nunca alerta.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { chaveLocal } from "./conta-de-teste";

let cliente: SupabaseClient | undefined;
const admin = (): SupabaseClient =>
  (cliente ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

export type PanoramaSemeado = {
  readonly cursoRegular: string;
  readonly cursoExpedito: string;
  readonly turmaAtrasada: string;
  readonly turmaEmDia: string;
};

/** Dois cursos de classificações e modalidades diferentes, com uma turma cada. */
export async function semearPanorama(processo: number): Promise<PanoramaSemeado> {
  const s = `E2E${processo}`;
  const semeado: PanoramaSemeado = {
    cursoRegular: `CUR-${s}-REG`,
    cursoExpedito: `CUR-${s}-EXP`,
    turmaAtrasada: `TUR-${s}-REG1`,
    turmaEmDia: `TUR-${s}-EXP1`,
  };

  await limparPanorama(semeado);

  const { data: cursos, error: erroCursos } = await admin()
    .from("cursos")
    .insert([
      {
        codigo: semeado.cursoRegular,
        nome_curso: `Curso regular de percurso ${processo}`,
        classificacao: "regular",
        modalidade: "presencial",
      },
      {
        codigo: semeado.cursoExpedito,
        nome_curso: `Curso expedito de percurso ${processo}`,
        classificacao: "expedito",
        modalidade: "ead",
      },
    ])
    .select("id, codigo");
  if (erroCursos) throw new Error(`falha ao semear cursos: ${erroCursos.message}`);

  const id = (codigo: string) => cursos?.find((c) => c.codigo === codigo)?.id as string;

  const { error: erroDisciplinas } = await admin()
    .from("disciplinas")
    .insert([
      {
        codigo: `DIS-${s}-REG`,
        curso_id: id(semeado.cursoRegular),
        cod_disciplina: "PERC-01",
        nome_disciplina: "Disciplina de percurso (regular)",
        carga_horaria_tempos: 10,
      },
      {
        codigo: `DIS-${s}-EXP`,
        curso_id: id(semeado.cursoExpedito),
        cod_disciplina: "PERC-02",
        nome_disciplina: "Disciplina de percurso (expedito)",
        carga_horaria_tempos: 50,
      },
    ])
    .select("id, codigo");
  if (erroDisciplinas) throw new Error(`falha ao semear disciplinas: ${erroDisciplinas.message}`);

  const { data: disciplinas } = await admin()
    .from("disciplinas")
    .select("id, codigo, curso_id")
    .in("codigo", [`DIS-${s}-REG`, `DIS-${s}-EXP`]);

  /*
   * ⚠️ TRÊS CATRACAS DO ÉPICO 2 MORDEM AQUI, e nenhuma delas é lacuna:
   *
   * | Catraca | O que exige de linha NOVA |
   * |---|---|
   * | `reg_aula_instrutor_obrigatorio` | aula precisa de instrutor |
   * | `reg_aula_ue_so_nula_no_historico` | aula precisa de Unidade de Ensino |
   * | `reg_aula_tempos_positivos` | **1 a 12 tempos por lançamento** |
   *
   * As duas primeiras aceitam nulo apenas em linha migrada e nunca editada — para dado novo elas são
   * **mais fortes** que o `NOT NULL` original. A terceira é a que muda o desenho desta amostra: não
   * existe lançamento de 120 tempos, e sim vários lançamentos de um dia de aula.
   */
  const { data: instrutor, error: erroInstrutor } = await admin()
    .from("instrutores")
    .insert({
      codigo: `INS-${s}`,
      posto_graduacao: "CT",
      nome_completo: `Instrutor De Percurso ${processo}`,
      categoria: "organica",
      om: "CIAARA",
    })
    .select("id")
    .single();
  if (erroInstrutor) throw new Error(`falha ao semear instrutor: ${erroInstrutor.message}`);

  const disciplina = (codigo: string) => disciplinas?.find((d) => d.codigo === codigo);

  const { data: unidades, error: erroUnidades } = await admin()
    .from("unidades_ensino")
    .insert([
      {
        codigo: `UE-${s}-REG`,
        disciplina_id: disciplina(`DIS-${s}-REG`)?.id,
        curso_id: id(semeado.cursoRegular),
        numero_ue: 1,
        topico: "Unidade de percurso (regular)",
        ch_prevista_tempos: 10,
      },
      {
        codigo: `UE-${s}-EXP`,
        disciplina_id: disciplina(`DIS-${s}-EXP`)?.id,
        curso_id: id(semeado.cursoExpedito),
        numero_ue: 1,
        topico: "Unidade de percurso (expedito)",
        ch_prevista_tempos: 50,
      },
    ])
    .select("id, codigo");
  if (erroUnidades) throw new Error(`falha ao semear unidades: ${erroUnidades.message}`);

  const unidade = (codigo: string) => unidades?.find((u) => u.codigo === codigo)?.id;

  const { data: turmas, error: erroTurmas } = await admin()
    .from("turmas")
    .insert([
      {
        codigo: semeado.turmaAtrasada,
        curso_id: id(semeado.cursoRegular),
        ano_letivo: 2026,
        status: "ativa",
      },
      {
        codigo: semeado.turmaEmDia,
        curso_id: id(semeado.cursoExpedito),
        ano_letivo: 2026,
        status: "ativa",
      },
    ])
    .select("id, codigo, curso_id");
  if (erroTurmas) throw new Error(`falha ao semear turmas: ${erroTurmas.message}`);

  const turma = (codigo: string) => turmas?.find((t) => t.codigo === codigo);

  /*
   * 12 tempos executados contra 10 previstos na turma regular: saldo NEGATIVO e turma ativa, que é
   * a definição de atraso do `RF-INI-01`. E 10 contra 50 na expedita: saldo positivo.
   */
  const { error: erroRegistros } = await admin()
    .from("registros_aula")
    .insert([
      {
        codigo: `REG-${s}-01`,
        data: "2026-03-02",
        turma_id: turma(semeado.turmaAtrasada)?.id,
        curso_id: turma(semeado.turmaAtrasada)?.curso_id,
        instrutor_id: instrutor.id,
        unidade_ensino_id: unidade(`UE-${s}-REG`),
        tempos_consumidos: 6,
      },
      {
        codigo: `REG-${s}-02`,
        data: "2026-03-03",
        turma_id: turma(semeado.turmaAtrasada)?.id,
        curso_id: turma(semeado.turmaAtrasada)?.curso_id,
        instrutor_id: instrutor.id,
        unidade_ensino_id: unidade(`UE-${s}-REG`),
        tempos_consumidos: 6,
      },
      {
        codigo: `REG-${s}-03`,
        data: "2026-03-03",
        turma_id: turma(semeado.turmaEmDia)?.id,
        curso_id: turma(semeado.turmaEmDia)?.curso_id,
        instrutor_id: instrutor.id,
        unidade_ensino_id: unidade(`UE-${s}-EXP`),
        tempos_consumidos: 10,
      },
    ]);
  if (erroRegistros) throw new Error(`falha ao semear registros: ${erroRegistros.message}`);

  return semeado;
}

/**
 * Remove o que foi semeado.
 *
 * ⚠️ **ELE APAGA DE VERDADE, E ISSO NÃO CONTRARIA A REGRA 4 DO BRIEF.** "Nada é apagado" é regra de
 * **negócio**, sobre dado do sistema; isto é dado de teste, criado e destruído pela `service_role`
 * no stack local. Deixá-lo para trás contaminaria a próxima execução.
 */
export async function limparPanorama(semeado: PanoramaSemeado | undefined): Promise<void> {
  if (!semeado) return;
  const codigos = [semeado.cursoRegular, semeado.cursoExpedito];
  const { data: cursos } = await admin().from("cursos").select("id").in("codigo", codigos);
  const ids = (cursos ?? []).map((c) => c.id);

  if (ids.length > 0) {
    await admin().from("registros_aula").delete().in("curso_id", ids);
    await admin().from("turmas").delete().in("curso_id", ids);
    await admin().from("unidades_ensino").delete().in("curso_id", ids);
    await admin().from("disciplinas").delete().in("curso_id", ids);
    await admin().from("cursos").delete().in("id", ids);
  }

  const sufixo = semeado.cursoRegular.replace("CUR-", "").replace("-REG", "");
  await admin().from("instrutores").delete().eq("codigo", `INS-${sufixo}`);
}

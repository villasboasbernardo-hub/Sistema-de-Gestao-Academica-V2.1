/**
 * A amostra de instrutores dos percursos da spec 006 — **semeada por processo de trabalho**.
 *
 * ⚠️ **NUNCA O ETL.** A carga do Épico 2 traz CPF, RG, telefone e endereço reais dos 177 instrutores;
 * semear a ponta a ponta com ela levaria dado pessoal para captura de tela e relatório de falha.
 * Esta amostra é sintética, e nenhum campo de identificação civil é preenchido.
 *
 * ⚠️ **UMA OM POR PROCESSO.** Todo instrutor semeado aqui é da OM `OM-AMOSTRA-<processo>`: é o que
 * permite a um caso filtrar a listagem e contar **só** a amostra, com a base local vazia ou povoada,
 * e com outro processo semeando ao mesmo tempo.
 *
 * ⚠️ **CADA CARACTERÍSTICA TEM UM DONO, E O NOME DIZ QUAL.** A T004 da spec pede postos diferentes,
 * dois do mesmo posto com antiguidade declarada distinta, um `SC` e um `SCNS`, um posto fora da
 * escala, duas capacitações, capacitação vazia com docência antiga, selecionado sem habilitação,
 * aula lançada, inativo e vínculo com conta. Acumular várias num só instrutor faria um caso reprovar
 * pelo motivo de outro.
 *
 * ⚠️ **A CARGA PREVISTA NÃO ESTÁ AQUI, E A AUSÊNCIA É DELIBERADA.** O 20h com 14h previstas e o 40h
 * com 20h previstas existem com o **regime**, mas sem a atribuição que produziria esses números: qual
 * data põe uma atribuição num ano, e como o total do ano vira semanal, é a T011, que Bernardo ainda
 * não respondeu. Semear "14 horas" agora seria escolher a fórmula no teste. A US4 acrescenta.
 *
 * ⚠️ **AS CAPACITAÇÕES SÃO SEPARADAS POR VÍRGULA**, como a base da v2.0 as escreve
 * (`"C-Exp-TE, C-Esp-DID"`; spec 014 da v2.0, `data-model.md`: *"split por vírgula"*).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { anoCorrente } from "../../lib/formato/ano-corrente";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";

let cliente: SupabaseClient | undefined;
const admin = (): SupabaseClient =>
  (cliente ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

type Semente = {
  readonly posto_graduacao: string;
  readonly categoria: string;
  readonly antiguidade_declarada?: string;
  readonly regime_trabalho?: "20h" | "40h" | "dedicacao_exclusiva";
  readonly capacitacao_didatica?: string;
  readonly data_inicio_docencia_mb?: string;
  readonly data_inicio_docencia_ciaara?: string;
  readonly status?: "ativo" | "inativo";
};

const SEMENTES = {
  /** CMG, militar, 40h, **duas** capacitações. */
  cmg: {
    posto_graduacao: "CMG",
    categoria: "Militar",
    antiguidade_declarada: "1",
    regime_trabalho: "40h",
    capacitacao_didatica: "C-Exp-TE, C-Esp-DID",
  },
  /** CT com antiguidade declarada 1, 20h. Selecionado **e** habilitado. */
  ctMaisAntigo: {
    posto_graduacao: "CT",
    categoria: "Militar",
    antiguidade_declarada: "1",
    regime_trabalho: "20h",
    capacitacao_didatica: "C-Exp-TE",
  },
  /** CT com antiguidade declarada 2, 40h. */
  ctMaisModerno: {
    posto_graduacao: "CT",
    categoria: "Militar",
    antiguidade_declarada: "2",
    regime_trabalho: "40h",
    capacitacao_didatica: "Licenciatura",
  },
  /** Servidor civil `SC`. */
  sc: {
    posto_graduacao: "SC",
    categoria: "Civil",
    antiguidade_declarada: "2",
    regime_trabalho: "dedicacao_exclusiva",
  },
  /** Servidor civil `SCNS` — mesmo peso do `SC`, e mais antigo que ele pela declarada. */
  scns: {
    posto_graduacao: "SCNS",
    categoria: "Civil",
    antiguidade_declarada: "1",
    regime_trabalho: "40h",
  },
  /** Posto que a escala não conhece. */
  foraDaEscala: { posto_graduacao: "XYZ", categoria: "Militar", antiguidade_declarada: "1" },
  /** Capacitação vazia, docência no CIAARA iniciada há mais de um ano. */
  semCapacitacao: {
    posto_graduacao: "CC",
    categoria: "Militar",
    regime_trabalho: "20h",
    data_inicio_docencia_mb: "2020-02-01",
    data_inicio_docencia_ciaara: "2021-03-01",
  },
  /** Atribuída a uma turma sem vínculo de habilitação ativo (`FR-026.1`). */
  selecionadoSemHabilitacao: {
    posto_graduacao: "1ºTen",
    categoria: "Militar",
    regime_trabalho: "20h",
  },
  /**
   * Com aula lançada no ano corrente **e** habilitado na disciplina dela — o histórico que a
   * desativação precisa preservar tem nome **e** vínculo (`RN-INST-02`, item ii).
   */
  comAula: {
    posto_graduacao: "CF",
    categoria: "Militar",
    regime_trabalho: "40h",
    capacitacao_didatica: "C-Esp-DID",
  },
  /** `status = inativo`. */
  inativo: {
    posto_graduacao: "2ºTen",
    categoria: "Militar",
    regime_trabalho: "20h",
    status: "inativo",
  },
  /** Vinculado a uma conta de acesso. */
  vinculado: { posto_graduacao: "SO", categoria: "Militar", regime_trabalho: "40h" },
} as const satisfies Record<string, Semente>;

export type ChaveDaAmostra = keyof typeof SEMENTES;

/** Os nomes, escolhidos para que a ordem alfabética NÃO coincida com a de antiguidade. */
const NOMES: Readonly<Record<ChaveDaAmostra, string>> = {
  cmg: "Zacarias Almirante Da Amostra",
  ctMaisAntigo: "Xavier Tenente Primeiro",
  ctMaisModerno: "Bruno Tenente Segundo",
  sc: "Aurora Civil Servidora",
  scns: "Zuleica Civil Sem Nivel",
  foraDaEscala: "Abel Posto Desconhecido",
  semCapacitacao: "Heitor Sem Capacitacao",
  selecionadoSemHabilitacao: "Iara Selecionada Sem Habilitacao",
  comAula: "Otavio Com Aula Lancada",
  inativo: "Ulisses Inativo",
  vinculado: "Vera Com Conta",
};

export type AmostraDeInstrutores = {
  readonly processo: number;
  /** A OM exclusiva deste processo — filtre por ela para contar só a amostra. */
  readonly om: string;
  readonly codigos: Readonly<Record<ChaveDaAmostra, string>>;
  readonly nomes: Readonly<Record<ChaveDaAmostra, string>>;
  /** A conta vinculada ao instrutor `vinculado`. */
  readonly emailDaContaVinculada: string;
};

const prefixo = (processo: number) => `AM${processo}`;
const omDaAmostra = (processo: number) => `OM-AMOSTRA-${processo}`;
const emailVinculado = (processo: number) => emailDeTeste("amostra-vinculado", processo);

/** Semeia a amostra inteira, apagando antes qualquer resto de execução anterior deste processo. */
export async function semearInstrutores(processo: number): Promise<AmostraDeInstrutores> {
  await limparInstrutores(processo);

  const p = prefixo(processo);
  const om = omDaAmostra(processo);
  const chaves = Object.keys(SEMENTES) as ChaveDaAmostra[];
  const codigos = Object.fromEntries(chaves.map((c) => [c, `${p}-${c}`])) as Record<
    ChaveDaAmostra,
    string
  >;
  const nomes = Object.fromEntries(chaves.map((c) => [c, `${NOMES[c]} ${processo}`])) as Record<
    ChaveDaAmostra,
    string
  >;

  const { data: instrutores, error } = await admin()
    .from("instrutores")
    .insert(
      chaves.map((c) => ({
        codigo: codigos[c],
        esp_hab_obs: "-",
        nome_completo: nomes[c],
        om,
        // ⚠️ Inserção em lote manda `null` em toda chave que falte a uma das linhas — inclusive
        // `status`, que é `not null` e explícito por regra (`RN-INST-05`). Por isso ele vem antes.
        status: "ativo",
        ...SEMENTES[c],
      })),
    )
    .select("id, codigo");
  if (error) throw new Error(`falha ao semear instrutores: ${error.message}`);
  const idDe = (c: ChaveDaAmostra) =>
    instrutores?.find((i) => i.codigo === codigos[c])?.id as string;

  // Curso, disciplina, unidade e turma: o mínimo para atribuir e lançar.
  const ano = anoCorrente();
  const { data: curso, error: erroCurso } = await admin()
    .from("cursos")
    .insert({
      codigo: `CUR-${p}`,
      nome_curso: `Curso da amostra ${processo}`,
      classificacao: "regular",
    })
    .select("id")
    .single();
  if (erroCurso) throw new Error(`falha ao semear curso: ${erroCurso.message}`);

  const { data: disciplina, error: erroDisciplina } = await admin()
    .from("disciplinas")
    .insert({
      codigo: `DIS-${p}`,
      curso_id: curso.id,
      cod_disciplina: `AM-${processo}`,
      nome_disciplina: `Disciplina da amostra ${processo}`,
      carga_horaria_tempos: 30,
    })
    .select("id")
    .single();
  if (erroDisciplina) throw new Error(`falha ao semear disciplina: ${erroDisciplina.message}`);

  const { data: unidade, error: erroUnidade } = await admin()
    .from("unidades_ensino")
    .insert({
      codigo: `UE-${p}`,
      disciplina_id: disciplina.id,
      curso_id: curso.id,
      numero_ue: 1,
      topico: `Unidade da amostra ${processo}`,
      ch_prevista_tempos: 30,
    })
    .select("id")
    .single();
  if (erroUnidade) throw new Error(`falha ao semear unidade: ${erroUnidade.message}`);

  const { data: turma, error: erroTurma } = await admin()
    .from("turmas")
    .insert({
      codigo: `TUR-${p}`,
      curso_id: curso.id,
      turma: "T1",
      ano_letivo: ano,
      status: "ativa",
    })
    .select("id")
    .single();
  if (erroTurma) throw new Error(`falha ao semear turma: ${erroTurma.message}`);

  const { data: turmaDisciplina, error: erroTd } = await admin()
    .from("turma_disciplina")
    .insert({ codigo: `TD-${p}`, turma_id: turma.id, disciplina_id: disciplina.id })
    .select("id")
    .single();
  if (erroTd) throw new Error(`falha ao semear turma_disciplina: ${erroTd.message}`);

  /*
   * ⚠️ OS DOIS LADOS DO `FR-026.1`: o CT mais antigo é selecionado E habilitado; a 1ºTen é
   * selecionada SEM habilitação. Com só o primeiro, "selecionados ⊆ habilitados" pareceria verdade.
   * Habilitados: o CT mais antigo e o da aula. Selecionados: o CT mais antigo e a 1ºTen.
   */
  const { error: erroHabilitacao } = await admin()
    .from("instrutor_disciplina")
    .insert([
      { codigo: `VIN-${p}-1`, instrutor_id: idDe("ctMaisAntigo"), disciplina_id: disciplina.id },
      { codigo: `VIN-${p}-2`, instrutor_id: idDe("comAula"), disciplina_id: disciplina.id },
    ]);
  if (erroHabilitacao) throw new Error(`falha ao semear habilitação: ${erroHabilitacao.message}`);

  const { error: erroSelecao } = await admin()
    .from("turma_disciplina_instrutor")
    .insert([
      {
        codigo: `TDI-${p}-1`,
        turma_disciplina_id: turmaDisciplina.id,
        instrutor_id: idDe("ctMaisAntigo"),
      },
      {
        codigo: `TDI-${p}-2`,
        turma_disciplina_id: turmaDisciplina.id,
        instrutor_id: idDe("selecionadoSemHabilitacao"),
      },
    ]);
  if (erroSelecao) throw new Error(`falha ao semear seleção: ${erroSelecao.message}`);

  const { error: erroAula } = await admin()
    .from("registros_aula")
    .insert({
      codigo: `REG-${p}`,
      data: `${ano}-03-02`,
      turma_id: turma.id,
      curso_id: curso.id,
      unidade_ensino_id: unidade.id,
      instrutor_id: idDe("comAula"),
      tempos_consumidos: 4,
    });
  if (erroAula) throw new Error(`falha ao semear aula: ${erroAula.message}`);

  const emailDaContaVinculada = emailVinculado(processo);
  await criarConta(emailDaContaVinculada, `USR-${p}-VIN`, "operador");
  const { error: erroVinculo } = await admin()
    .from("usuarios")
    .update({ instrutor_id: idDe("vinculado") })
    .eq("email", emailDaContaVinculada);
  if (erroVinculo) throw new Error(`falha ao vincular a conta: ${erroVinculo.message}`);

  return { processo, om, codigos, nomes, emailDaContaVinculada };
}

/**
 * Remove a amostra deste processo.
 *
 * ⚠️ **ELE APAGA DE VERDADE, E ISSO NÃO CONTRARIA A REGRA 4 DO BRIEF** — é dado de teste, criado e
 * destruído pela `service_role` no stack local, como em `panorama-de-teste.ts`. A ordem segue as
 * chaves estrangeiras, que são `restrict`: o fato antes do cadastro.
 */
export async function limparInstrutores(processo: number): Promise<void> {
  const p = prefixo(processo);
  await apagarConta(emailVinculado(processo));

  const { data: cursos } = await admin().from("cursos").select("id").eq("codigo", `CUR-${p}`);
  const cursoIds = (cursos ?? []).map((c) => c.id as string);
  if (cursoIds.length > 0) {
    await admin().from("registros_aula").delete().in("curso_id", cursoIds);

    const { data: turmas } = await admin().from("turmas").select("id").in("curso_id", cursoIds);
    const turmaIds = (turmas ?? []).map((t) => t.id as string);
    if (turmaIds.length > 0) {
      const { data: tds } = await admin()
        .from("turma_disciplina")
        .select("id")
        .in("turma_id", turmaIds);
      const tdIds = (tds ?? []).map((t) => t.id as string);
      if (tdIds.length > 0) {
        await admin().from("turma_disciplina_instrutor").delete().in("turma_disciplina_id", tdIds);
        await admin().from("turma_disciplina").delete().in("id", tdIds);
      }
    }

    const { data: disciplinas } = await admin()
      .from("disciplinas")
      .select("id")
      .in("curso_id", cursoIds);
    const disciplinaIds = (disciplinas ?? []).map((d) => d.id as string);
    if (disciplinaIds.length > 0) {
      await admin().from("instrutor_disciplina").delete().in("disciplina_id", disciplinaIds);
    }

    await admin().from("turmas").delete().in("curso_id", cursoIds);
    await admin().from("unidades_ensino").delete().in("curso_id", cursoIds);
    await admin().from("disciplinas").delete().in("curso_id", cursoIds);
    await admin().from("cursos").delete().in("id", cursoIds);
  }

  await admin().from("instrutores").delete().eq("om", omDaAmostra(processo));
}

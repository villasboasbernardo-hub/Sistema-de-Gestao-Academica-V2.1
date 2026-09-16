/**
 * A amostra de instrutores dos percursos da spec 006 — **semeada por processo de trabalho**.
 *
 * ⚠️ **NUNCA O ETL.** A carga do Épico 2 traz CPF, RG, telefone e endereço reais dos 177 instrutores;
 * semear a ponta a ponta com ela levaria dado pessoal para captura de tela e relatório de falha.
 * Esta amostra é sintética, e nenhum campo de identificação civil é preenchido.
 *
 * ⚠️ **UMA OM POR PROCESSO E POR SUÍTE.** Todo instrutor semeado aqui é da OM
 * `OM-AMOSTRA-<processo>-<suíte>`, e todo nome termina com o marcador `AM<processo><suíte>`: é o que
 * permite a um caso filtrar a listagem — por OM ou pela busca — e contar **só** a amostra, com a base
 * local vazia ou povoada e com outro processo semeando ao mesmo tempo. ⚠️ A suíte entra na chave
 * porque a configuração roda em paralelo total: duas suítes do mesmo arquivo podem cair no mesmo
 * processo, e o `afterAll` de uma apagaria a amostra que a outra ainda usa.
 *
 * ⚠️ **CADA CARACTERÍSTICA TEM UM DONO, E O NOME DIZ QUAL.** A T004 da spec pede postos diferentes,
 * dois do mesmo posto com antiguidade declarada distinta, um `SC` e um `SCNS`, um posto fora da
 * escala, duas capacitações, capacitação vazia com docência antiga, selecionado sem habilitação,
 * aula lançada, inativo e vínculo com conta. Acumular várias num só instrutor faria um caso reprovar
 * pelo motivo de outro.
 *
 * ⚠️ **A CARGA PREVISTA ENTRA SÓ COM `comCargaPrevista`**, desde que a T011 e a composição semanal
 * foram decididas (decisão de Bernardo Villas Boas, 15/09/2026). Com a opção, o CT mais antigo (20h)
 * recebe uma disciplina de 56 tempos e o CT mais moderno (40h) uma de 80, as duas numa janela de quatro
 * semanas ISO exatas — 14 e 20 horas por semana, os dois lados do `SC-006`. E o sem capacitação (20h)
 * recebe uma de 225 tempos de 01/12 do ano anterior a 31/01 do corrente — 9 semanas, 25 horas por semana —,
 * a janela que atravessa o ano do CHK005 (decisão de Bernardo Villas Boas, 15/09/2026). Sem a opção, a
 * amostra fica como era, para não mudar as contagens das outras suítes.
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
  /** O marcador que todo nome da amostra carrega — buscar por ele devolve só a amostra. */
  readonly marcador: string;
  /** A OM exclusiva deste processo — filtre por ela para contar só a amostra. */
  readonly om: string;
  readonly codigos: Readonly<Record<ChaveDaAmostra, string>>;
  readonly nomes: Readonly<Record<ChaveDaAmostra, string>>;
  /** A conta vinculada ao instrutor `vinculado`. */
  readonly emailDaContaVinculada: string;
};

const prefixo = (processo: number, suite: string) => `AM${processo}${suite}`;
const omDaAmostra = (processo: number, suite: string) => `OM-AMOSTRA-${processo}-${suite}`;
const emailVinculado = (processo: number, suite: string) =>
  emailDeTeste(`amostra-vinculado-${suite.toLowerCase()}`, processo);

/** Semeia a amostra inteira, apagando antes qualquer resto de execução anterior deste processo. */
export async function semearInstrutores(
  processo: number,
  suite: string,
  opcoes: { readonly comCargaPrevista?: boolean } = {},
): Promise<AmostraDeInstrutores> {
  await limparInstrutores(processo, suite);

  const p = prefixo(processo, suite);
  const om = omDaAmostra(processo, suite);
  const chaves = Object.keys(SEMENTES) as ChaveDaAmostra[];
  const codigos = Object.fromEntries(chaves.map((c) => [c, `${p}-${c}`])) as Record<
    ChaveDaAmostra,
    string
  >;
  const nomes = Object.fromEntries(chaves.map((c) => [c, `${NOMES[c]} ${p}`])) as Record<
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
      nome_curso: `Curso da amostra ${p}`,
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
      cod_disciplina: p,
      nome_disciplina: `Disciplina da amostra ${p}`,
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
      topico: `Unidade da amostra ${p}`,
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

  if (opcoes.comCargaPrevista) {
    // A primeira segunda-feira de março do ano corrente, e o domingo quatro semanas depois.
    const primeiroDeMarco = new Date(Date.UTC(ano, 2, 1));
    const ateSegunda = (8 - primeiroDeMarco.getUTCDay()) % 7;
    const inicio = new Date(Date.UTC(ano, 2, 1 + ateSegunda));
    const termino = new Date(inicio.getTime() + 27 * 86_400_000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    const { data: previstas, error: erroPrevistas } = await admin()
      .from("disciplinas")
      .insert([
        {
          codigo: `DIS-${p}-P14`,
          curso_id: curso.id,
          cod_disciplina: `${p}-14`,
          nome_disciplina: `Prevista de 14 horas ${p}`,
          carga_horaria_tempos: 56,
          previsao_inicio: iso(inicio),
          previsao_termino: iso(termino),
        },
        {
          codigo: `DIS-${p}-P20`,
          curso_id: curso.id,
          cod_disciplina: `${p}-20`,
          nome_disciplina: `Prevista de 20 horas ${p}`,
          carga_horaria_tempos: 80,
          previsao_inicio: iso(inicio),
          previsao_termino: iso(termino),
        },
        {
          codigo: `DIS-${p}-PV`,
          curso_id: curso.id,
          cod_disciplina: `${p}-V`,
          nome_disciplina: `Virada de ano ${p}`,
          carga_horaria_tempos: 225,
          previsao_inicio: `${ano - 1}-12-01`,
          previsao_termino: `${ano}-01-31`,
        },
      ])
      .select("id, codigo");
    if (erroPrevistas)
      throw new Error(`falha ao semear disciplinas previstas: ${erroPrevistas.message}`);
    const idDaPrevista = (codigo: string) =>
      previstas?.find((d) => d.codigo === codigo)?.id as string;

    const { data: tds, error: erroTds } = await admin()
      .from("turma_disciplina")
      .insert([
        { codigo: `TD-${p}-P14`, turma_id: turma.id, disciplina_id: idDaPrevista(`DIS-${p}-P14`) },
        { codigo: `TD-${p}-P20`, turma_id: turma.id, disciplina_id: idDaPrevista(`DIS-${p}-P20`) },
        { codigo: `TD-${p}-PV`, turma_id: turma.id, disciplina_id: idDaPrevista(`DIS-${p}-PV`) },
      ])
      .select("id, codigo");
    if (erroTds) throw new Error(`falha ao semear turmas das previstas: ${erroTds.message}`);
    const idDoTd = (codigo: string) => tds?.find((t) => t.codigo === codigo)?.id as string;

    const { error: erroDesignacao } = await admin()
      .from("turma_disciplina_instrutor")
      .insert([
        {
          codigo: `TDI-${p}-P14`,
          turma_disciplina_id: idDoTd(`TD-${p}-P14`),
          instrutor_id: idDe("ctMaisAntigo"),
        },
        {
          codigo: `TDI-${p}-P20`,
          turma_disciplina_id: idDoTd(`TD-${p}-P20`),
          instrutor_id: idDe("ctMaisModerno"),
        },
        {
          codigo: `TDI-${p}-PV`,
          turma_disciplina_id: idDoTd(`TD-${p}-PV`),
          instrutor_id: idDe("semCapacitacao"),
        },
      ]);
    if (erroDesignacao)
      throw new Error(`falha ao designar as previstas: ${erroDesignacao.message}`);
  }

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

  const emailDaContaVinculada = emailVinculado(processo, suite);
  await criarConta(emailDaContaVinculada, `USR-${p}-VIN`, "operador");
  const { error: erroVinculo } = await admin()
    .from("usuarios")
    .update({ instrutor_id: idDe("vinculado") })
    .eq("email", emailDaContaVinculada);
  if (erroVinculo) throw new Error(`falha ao vincular a conta: ${erroVinculo.message}`);

  return { processo, marcador: p, om, codigos, nomes, emailDaContaVinculada };
}

/**
 * Remove a amostra deste processo.
 *
 * ⚠️ **ELE APAGA DE VERDADE, E ISSO NÃO CONTRARIA A REGRA 4 DO BRIEF** — é dado de teste, criado e
 * destruído pela `service_role` no stack local, como em `panorama-de-teste.ts`. A ordem segue as
 * chaves estrangeiras, que são `restrict`: o fato antes do cadastro.
 */
export async function limparInstrutores(processo: number, suite: string): Promise<void> {
  const p = prefixo(processo, suite);
  await apagarConta(emailVinculado(processo, suite));

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

  await admin().from("instrutores").delete().eq("om", omDaAmostra(processo, suite));
}

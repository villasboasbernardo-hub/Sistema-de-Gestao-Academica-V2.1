/**
 * `RN-CONF-01` · `Q-1` · `Q-8` · `Q-17` · `V-7` — quem lança no DSA, quem só olha, e como o
 * conflito entre turmas chega a quem **não alcança** a outra turma.
 *
 * ⚠️ **ISTO NÃO PODE MORAR EM pgTAP, e o DoD 4 diz por quê:** o pgTAP roda como **dono do
 * schema**, e sob privilégio de dono a RLS **não se aplica**. Uma asserção de *"o Chefe do
 * Departamento de Ensino não lança aula"* escrita no `116` passaria com a RLS **desligada** — que
 * é exatamente o defeito que a suíte existe para impedir. O `116` prova estrutura e regra de
 * banco; este arquivo prova **permissão**, com sessão autenticada de verdade.
 *
 * ⚠️ **E HÁ UMA COISA AQUI QUE SÓ A SESSÃO REAL PROVA, não é redundância com o `116`:** o
 * `grant execute` de `app.disciplina_sem_ue` (gotcha 5.1). A expressão do `CHECK` é avaliada com
 * os direitos de **quem grava**, mesmo sendo a função `SECURITY DEFINER` — sem o grant, **todo
 * lançamento de usuário autenticado falha** com `permission denied for function`, e o erro aponta
 * para a função, não para a coluna. Como o pgTAP grava como dono, ele **nunca** exercita isso.
 *
 * ⚠️ **O CASO QUE DISCRIMINA (DoD 8) É O OPERADOR DE ESCOPO RECORTADO, e ele é o motivo de a
 * `Q-17` existir.** `vw_ocupacao_ta` é `security_invoker` e as policies filtram
 * `app.alcanca_turma(turma_id)`: para quem tem escopo `regular`, a turma do curso `expedito`
 * **não aparece** na view, e o conflito do instrutor ficaria invisível — sem erro, sem aviso, a
 * grade abrindo limpa. É o gotcha 4 sobre um requisito de Risco ALTO. Quem desfaz é
 * `public.conflitos_da_semana`, `SECURITY DEFINER`, que devolve **o fato e não o dado alheio**.
 * As três asserções do bloco de conflito medem as três metades disso: ele **não** lê a turma
 * alheia, ele **vê** o conflito, e o que ele vê **não traz** `turma_id` nem `fato_id`.
 *
 * ⚠️ **A RECUSA É CONFERIDA PELO CÓDIGO, NUNCA POR "deu erro"** — `42501` vindo da RLS. Aceitar
 * `error not null`, ou um `23502` de coluna obrigatória ausente, é o modo de falha já medido
 * nesta base: seis negativos do `SC-004` passavam pelo motivo errado, e só o controle positivo os
 * pegou. Toda asserção negativa aqui manda a linha inteira no `expect` e confere o código — e
 * **mede o valor no banco antes e depois**, porque a RLS nega em silêncio (gotcha 4).
 *
 * ⚠️ **O `encarregado_curso` RECEBE VÍNCULO DE CURSO DE PROPÓSITO, e isso é o que torna o
 * negativo dele honesto.** O alcance dele vem de `usuario_curso`, não de `escopo_curso`
 * (`rls.test.ts`); sem vínculo ele não alcança curso nenhum, e a recusa do `INSERT` viria do
 * **alcance** em vez da **permissão** — passaria pelo motivo errado. Com o vínculo, a única coisa
 * que falha é `app.pode('registros_aula', 'criar')`, que é o que se quer medir.
 *
 * ⚠️ **NENHUMA CONTA AQUI É `admin`, e é deliberado (gotcha 8).** Um Admin a mais na base faz
 * `app.impedir_remocao_do_ultimo_admin()` deixar de recusar e derruba 12 asserções de
 * `rls.test.ts` em cascata. Quem escreve nos positivos é o
 * `encarregado_administracao_academica` com escopo `geral`, que tem `criar`/`editar` nas três
 * tabelas **e** `atividades_globais.criar` — medido na matriz.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

/** Domínio próprio: `rls.test.ts` varre `@ciaara.teste`, e não queremos interferência mútua. */
const DOMINIO = "ciaara.testedsa";
const SENHA = "senha-de-teste-com-12+";

/*
 * ⚠️ IDENTIFICADORES GERADOS, NUNCA FIXOS (regra 9.1): curso não é apagável — `cursos` tem FK
 * `restrict` e `curso_regime_historico` recusa `DELETE` por gatilho, inclusive para a
 * `service_role`. Código fixo faria a segunda execução falhar por `23505`, que **parece recusa de
 * permissão e não é**.
 */
const SELO = Date.now().toString(36).toUpperCase().slice(-5);

/** Cliente de privilégio elevado — só para MONTAR e LIMPAR. Nunca para asserção. */
const servico = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * ⚠️ Os cinco perfis de SÓ LEITURA nas três tabelas do DSA — medidos na matriz
 * `perfil_permissao` em 05/10/2026: cada um tem `ler` e **não** tem `criar` nem `editar` em
 * `registros_aula`, `avaliacoes` e `atividades_nao_letivas`.
 */
const SO_LEITURA = [
  "ajudante_orientacao_pedagogica",
  "chefe_departamento_ensino",
  "encarregado_curso",
  "encarregado_orientacao_pedagogica",
  "visualizacao",
] as const;

/** Quem escreve nos controles positivos, e o operador recortado, que é o discriminante. */
const ESCRITORES = ["encarregado_administracao_academica", "operador"] as const;

/**
 * O escopo de cada um deles, e o do Operador é **o caso inteiro da `Q-17`**: com `regular` ele
 * alcança o curso regular e o de competências (que também é `regular`) e **não** alcança o
 * expedito — que é onde vive a aula com a qual o instrutor dele conflita.
 */
const ESCOPO_DO_ESCRITOR: Readonly<Record<(typeof ESCRITORES)[number], string>> = {
  encarregado_administracao_academica: "geral",
  operador: "regular",
};

type Papel = (typeof SO_LEITURA)[number] | (typeof ESCRITORES)[number];

const sessoes = new Map<Papel, SupabaseClient>();
const sessao = (papel: Papel) => sessoes.get(papel)!;
const email = (papel: Papel) => `dsa-${papel}@${DOMINIO}`;

let cursoRegularId = "";
let cursoExpeditoId = "";
let cursoCompetenciasId = "";
let turmaRegularId = "";
let turmaExpeditaId = "";
let turmaCompetenciasId = "";
let instrutorId = "";
let disciplinaComumId = "";
let disciplinaIsentaId = "";
let unidadeEnsinoId = "";
let unidadeEnsinoAlheiaId = "";
let aulaDaTurmaAlheiaId = "";

const DIA = "2026-04-07";

/**
 * ⚠️ **O VOCABULÁRIO DE AVALIAÇÃO É SEMEADO PELA SUÍTE, E ISSO FOI DESCOBERTO POR UM NEGATIVO
 * QUE PASSAVA PELO MOTIVO ERRADO.** `avaliacoes` tem o gatilho
 * `app.validar_dominio_config_lista('tipo_avaliacao', 'tipos_avaliacao')`, que é **BEFORE
 * INSERT** e portanto roda **antes** da RLS. Numa base recriada, `config_listas.tipos_avaliacao`
 * nasce **vazia** (quem a povoa é o ETL), então qualquer valor era recusado com `23514` — o
 * negativo ficava verde sem que a RLS fosse consultada uma única vez.
 *
 * ⚠️ É a mesma classe dos seis negativos do `SC-004` que passavam pelo motivo errado, e quem a
 * pegou foi conferir o **código** da recusa em vez de aceitar *"deu erro"*. Com o valor na lista,
 * o gatilho aprova e quem recusa é a policy, com `42501` — que é o que se quer medir.
 */
const TIPO_AVALIACAO = "Prova Escrita";
const MARCA_DA_SEMENTE = "semeado pela suite do DSA";

async function criarConta(papel: Papel, escopo: string, cursos: readonly string[]): Promise<void> {
  const { data, error } = await servico.auth.admin.createUser({
    email: email(papel),
    password: SENHA,
    email_confirm: true,
  });
  if (error) throw new Error(`falha ao criar conta ${email(papel)}: ${error.message}`);

  const { data: linha, error: erroCadastro } = await servico
    .from("usuarios")
    .insert({
      codigo: `USR-DSA-${papel}`,
      auth_user_id: data.user.id,
      email: email(papel),
      nome: `Prova DSA ${papel}`,
      perfil: papel,
      escopo_curso: escopo,
    })
    .select("id")
    .single();
  if (erroCadastro) throw new Error(`falha ao cadastrar ${papel}: ${erroCadastro.message}`);

  for (const cursoId of cursos) {
    const { error: erroVinculo } = await servico.from("usuario_curso").insert({
      codigo: `UCDSA-${papel}-${cursoId.slice(-4)}`,
      usuario_id: (linha as { id: string }).id,
      curso_id: cursoId,
    });
    if (erroVinculo) throw new Error(`falha ao vincular curso de ${papel}: ${erroVinculo.message}`);
  }

  const cliente = createClient(URL_SUPABASE, CHAVE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: erroLogin } = await cliente.auth.signInWithPassword({
    email: email(papel),
    password: SENHA,
  });
  if (erroLogin) throw new Error(`falha ao autenticar ${papel}: ${erroLogin.message}`);
  sessoes.set(papel, cliente);
}

async function criarCurso(sigla: string, classificacao: string): Promise<string> {
  const { data, error } = await servico
    .rpc(
      "criar_curso_com_regime" as never,
      {
        p_curso: {
          codigo: sigla,
          nome_curso: `Curso ${sigla} da suite do DSA`,
          classificacao,
          modalidade: "presencial",
          duracao_dias: 20,
        },
        p_regime: {
          regime_tempos: 8,
          ta_duracao_min: 45,
          intervalo_manha_min: 5,
          intervalo_tarde_min: 5,
          hora_inicio_manha: "07:50",
          hora_inicio_tarde: "13:05",
          vigente_de: "2020-01-01",
        },
      } as never,
    )
    .single();
  if (error) throw new Error(`falha ao criar o curso ${sigla}: ${error.message}`);
  return (data as { id: string }).id;
}

async function criarTurma(cursoId: string): Promise<string> {
  const { data, error } = await servico
    .from("turmas")
    .insert({
      curso_id: cursoId,
      turma: "T1",
      ano_letivo: 2026,
      status: "ativa",
      modalidade: "presencial",
      data_inicio: "2026-03-02",
      data_termino: "2026-06-30",
    })
    .select("id")
    .single();
  if (error) throw new Error(`falha ao criar turma: ${error.message}`);
  return (data as { id: string }).id;
}

/** Deixa a base no estado inicial. Roda ANTES e DEPOIS — execução interrompida não inviabiliza a seguinte. */
async function limpar(): Promise<void> {
  /*
   * ⚠️ AS CONTAS DO AUTH SÃO VARRIDAS PELO DOMÍNIO, não pelas linhas de `usuarios`: quando o
   * `beforeAll` morre entre `createUser` e o `insert`, a conta do Auth fica ÓRFÃ, a limpeza não a
   * alcança e a execução seguinte morre com *"already been registered"* — em `beforeAll`, o que
   * reporta "pulados" e nenhum reprovado (medido em 25/09/2026, na spec 010).
   */
  for (let pagina = 1; pagina <= 20; pagina += 1) {
    const { data, error } = await servico.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error || !data.users.length) break;
    for (const u of data.users) {
      if ((u.email ?? "").endsWith(`@${DOMINIO}`)) {
        await servico.auth.admin.deleteUser(u.id).catch(() => undefined);
      }
    }
    if (data.users.length < 200) break;
  }
  await servico.from("usuario_curso").delete().like("codigo", "UCDSA-%");
  await servico.from("usuarios").delete().like("codigo", "USR-DSA-%");

  /*
   * ⚠️ A TURMA É APAGADA, e não é zelo: `099_salas.sql` decide entre asserir e pular pela
   * pergunta `count(turmas) > 0`, e uma turma deixada atrás faz aquele arquivo ACHAR que a base
   * está carregada e reprovar com os números da base real. Turma É apagável — só curso não é.
   * ⚠️ E os FATOS saem ANTES da turma: as FKs são `restrict`.
   */
  const { data: turmas } = await servico.from("turmas").select("id").like("codigo", "%-DSA%");
  for (const t of turmas ?? []) {
    const id = (t as { id: string }).id;
    await servico.from("registros_aula").delete().eq("turma_id", id);
    await servico.from("atividades_nao_letivas").delete().eq("turma_id", id);
    await servico.from("avaliacoes").delete().eq("turma_id", id);
    await servico.from("turma_disciplina_unidade").delete().eq("turma_id", id);
    await servico.from("turma_disciplina").delete().eq("turma_id", id);
    await servico.from("turmas").delete().eq("id", id);
  }
  // A atividade GLOBAL não tem turma, então a varredura por turma não a alcança.
  await servico.from("atividades_nao_letivas").delete().like("codigo", "DSA-ATV-%");
  /*
   * ⚠️ A semente do vocabulário sai pela MARCA, nunca pelo valor: `Prova Escrita` é um valor
   * REAL da planilha (67 usos medidos na origem), e apagá-lo por valor removeria a linha do ETL
   * numa base carregada. A `observacao` distingue a linha da suíte da linha de verdade.
   */
  await servico
    .from("config_listas")
    .delete()
    .eq("lista", "tipos_avaliacao")
    .eq("observacao", MARCA_DA_SEMENTE);
  // O curso fica: o selo no código impede a colisão da próxima execução.
}

beforeAll(async () => {
  await limpar();

  // Ver a nota de `TIPO_AVALIACAO`: sem esta linha o gatilho de domínio mascara a RLS.
  const { error: erroLista } = await servico.from("config_listas").upsert(
    {
      lista: "tipos_avaliacao",
      valor: TIPO_AVALIACAO,
      rotulo_exibicao: TIPO_AVALIACAO,
      ordem: 900,
      ativo: true,
      observacao: MARCA_DA_SEMENTE,
    },
    { onConflict: "lista,valor", ignoreDuplicates: true },
  );
  if (erroLista) throw new Error(`falha ao semear tipos_avaliacao: ${erroLista.message}`);

  // ⚠️ O recorte do Operador é por CLASSIFICAÇÃO: com escopo `regular` ele alcança o curso
  //    regular e o de competências (também regular) e NÃO alcança o expedito.
  cursoRegularId = await criarCurso(`C-Reg-DSA${SELO}`, "regular");
  cursoExpeditoId = await criarCurso(`C-Exp-DSA${SELO}`, "expedito");
  cursoCompetenciasId = await criarCurso(`C-Cmp-DSA${SELO}`, "regular");

  // O eixo da isenção da Q-1: currículo por competências.
  const { error: erroModelo } = await servico
    .from("cursos")
    .update({ curriculo_modelo: "competencias" })
    .eq("id", cursoCompetenciasId);
  if (erroModelo) throw new Error(`falha ao marcar competencias: ${erroModelo.message}`);

  turmaRegularId = await criarTurma(cursoRegularId);
  turmaExpeditaId = await criarTurma(cursoExpeditoId);
  turmaCompetenciasId = await criarTurma(cursoCompetenciasId);

  const { data: instrutor, error: erroInstrutor } = await servico
    .from("instrutores")
    .insert({
      codigo: `DSA-INS-${SELO}`,
      posto_graduacao: "CT",
      esp_hab_obs: "-EF",
      nome_completo: "Instrutor Da Suite Do DSA",
      categoria: "Militar",
      om: "CIAARA",
    })
    .select("id")
    .single();
  if (erroInstrutor) throw new Error(`falha ao criar instrutor: ${erroInstrutor.message}`);
  instrutorId = (instrutor as { id: string }).id;

  // Disciplina COMUM, no curso regular: é ela que prova que a isenção é delimitada.
  const { data: comum, error: erroComum } = await servico
    .from("disciplinas")
    .insert({
      codigo: `DSA-COMUM-${SELO}`,
      curso_id: cursoRegularId,
      cod_disciplina: `C${SELO}`,
      nome_disciplina: "Disciplina comum do DSA",
      carga_horaria_tempos: 20,
    })
    .select("id")
    .single();
  if (erroComum) throw new Error(`falha ao criar disciplina comum: ${erroComum.message}`);
  disciplinaComumId = (comum as { id: string }).id;

  const { data: ue, error: erroUe } = await servico
    .from("unidades_ensino")
    .insert({
      // ⚠️ O `codigo` VAI EXPLÍCITO, e não é estilo: o `DEFAULT` da coluna chama
      //    `app.proximo_codigo_ue()`, e a `service_role` **não tem `usage` no schema `app`**
      //    (medido) — o `DEFAULT` é avaliado com os direitos de quem insere, mesmo sendo a função
      //    `SECURITY DEFINER` (gotcha 5.1). Sem isto, a montagem morre com
      //    `permission denied for schema app`, erro que aponta para o schema e não para a coluna.
      codigo: `DSA-UE-${SELO}`,
      disciplina_id: disciplinaComumId,
      curso_id: cursoRegularId,
      numero_ue: 1,
      topico: "Unidade da suite do DSA",
      ch_prevista_tempos: 8,
    })
    .select("id")
    .single();
  if (erroUe) throw new Error(`falha ao criar unidade de ensino: ${erroUe.message}`);
  unidadeEnsinoId = (ue as { id: string }).id;

  // Disciplina ISENTA, no curso por competências.
  const { data: isenta, error: erroIsenta } = await servico
    .from("disciplinas")
    .insert({
      codigo: `DSA-ISENTA-${SELO}`,
      curso_id: cursoCompetenciasId,
      cod_disciplina: `I${SELO}`,
      nome_disciplina: "Disciplina de curso por competencias",
      carga_horaria_tempos: 20,
    })
    .select("id")
    .single();
  if (erroIsenta) throw new Error(`falha ao criar disciplina isenta: ${erroIsenta.message}`);
  disciplinaIsentaId = (isenta as { id: string }).id;

  // A turma alheia precisa de UE própria: a aula dela é uma aula NORMAL, e o que a torna
  // interessante é a fronteira de alcance, não a forma do lançamento.
  const { data: disciplinaAlheia, error: erroDisciplinaAlheia } = await servico
    .from("disciplinas")
    .insert({
      codigo: `DSA-ALHEIA-${SELO}`,
      curso_id: cursoExpeditoId,
      cod_disciplina: `A${SELO}`,
      nome_disciplina: "Disciplina da turma alheia",
      carga_horaria_tempos: 20,
    })
    .select("id")
    .single();
  if (erroDisciplinaAlheia) {
    throw new Error(`falha ao criar disciplina alheia: ${erroDisciplinaAlheia.message}`);
  }

  const { data: ueAlheia, error: erroUeAlheia } = await servico
    .from("unidades_ensino")
    .insert({
      codigo: `DSA-UE-ALHEIA-${SELO}`,
      disciplina_id: (disciplinaAlheia as { id: string }).id,
      curso_id: cursoExpeditoId,
      numero_ue: 1,
      topico: "Unidade da turma alheia",
      ch_prevista_tempos: 8,
    })
    .select("id")
    .single();
  if (erroUeAlheia) throw new Error(`falha ao criar UE alheia: ${erroUeAlheia.message}`);
  unidadeEnsinoAlheiaId = (ueAlheia as { id: string }).id;

  /*
   * ⚠️ A AULA DA TURMA ALHEIA — no curso EXPEDITO, que o Operador não alcança, com o MESMO
   * instrutor, no MESMO dia e nos MESMOS TA da aula que ele vai ter. É o conflito da
   * `RN-CONF-01` atravessando a fronteira de alcance, que é o caso inteiro da `Q-17`.
   */
  const { data: alheia, error: erroAlheia } = await servico
    .from("registros_aula")
    .insert({
      codigo: `DSA-REG-ALHEIA-${SELO}`,
      data: DIA,
      turma_id: turmaExpeditaId,
      curso_id: cursoExpeditoId,
      unidade_ensino_id: unidadeEnsinoAlheiaId,
      instrutor_id: instrutorId,
      tempos_consumidos: 2,
      ta_inicial: 1,
      local: "SALA 3",
    })
    .select("id")
    .single();
  if (erroAlheia) throw new Error(`falha ao criar a aula alheia: ${erroAlheia.message}`);
  aulaDaTurmaAlheiaId = (alheia as { id: string }).id;

  // A aula da turma DO Operador, no mesmo dia e TA, com o mesmo instrutor.
  const { error: erroPropria } = await servico.from("registros_aula").insert({
    codigo: `DSA-REG-PROPRIA-${SELO}`,
    data: DIA,
    turma_id: turmaRegularId,
    curso_id: cursoRegularId,
    unidade_ensino_id: unidadeEnsinoId,
    instrutor_id: instrutorId,
    tempos_consumidos: 2,
    ta_inicial: 1,
    local: "SALA 3",
  });
  if (erroPropria) throw new Error(`falha ao criar a aula propria: ${erroPropria.message}`);

  // ⚠️ O `encarregado_curso` leva vínculo com o curso regular: sem ele, o negativo dele passaria
  //    pelo ALCANCE e não pela PERMISSÃO, que é o que se quer medir.
  for (const papel of SO_LEITURA) {
    await criarConta(papel, "geral", papel === "encarregado_curso" ? [cursoRegularId] : []);
  }
  for (const papel of ESCRITORES) {
    await criarConta(papel, ESCOPO_DO_ESCRITOR[papel], []);
  }
}, 300_000);

afterAll(limpar);

describe("`DoD 4` · o teste negativo por perfil: os cinco que SÓ LEEM", () => {
  for (const papel of SO_LEITURA) {
    it(`${papel} não LANÇA aula — \`42501\`, e a contagem no banco não muda`, async () => {
      const antes = await servico
        .from("registros_aula")
        .select("id", { count: "exact", head: true })
        .eq("turma_id", turmaRegularId);

      const { error } = await sessao(papel)
        .from("registros_aula")
        .insert({
          codigo: `DSA-REG-NEG-${papel}-${SELO}`,
          data: DIA,
          turma_id: turmaRegularId,
          curso_id: cursoRegularId,
          unidade_ensino_id: unidadeEnsinoId,
          instrutor_id: instrutorId,
          tempos_consumidos: 1,
          ta_inicial: 5,
        });

      expect(error, `${papel} conseguiu lançar aula`).not.toBeNull();
      // ⚠️ O CÓDIGO, não a presença do erro: um `23502` passaria por "recusou".
      expect(error?.code, JSON.stringify(error)).toBe("42501");

      const depois = await servico
        .from("registros_aula")
        .select("id", { count: "exact", head: true })
        .eq("turma_id", turmaRegularId);
      // ⚠️ A RLS nega em silêncio (gotcha 4): só o valor NO BANCO prova que nada entrou.
      expect(depois.count).toBe(antes.count);
    });

    it(`${papel} não MOVE lançamento — \`42501\`, e o TA no banco continua o mesmo`, async () => {
      const { error } = await sessao(papel)
        .from("registros_aula")
        .update({ ta_inicial: 7 })
        .eq("codigo", `DSA-REG-PROPRIA-${SELO}`);

      // ⚠️ `UPDATE` recusado pela RLS chega SEM erro e SEM linha afetada (gotcha 4) — a policy
      //    simplesmente não casa nenhuma linha. Então o que prova é o VALOR no banco.
      expect(error?.code ?? "42501").toBe("42501");

      const { data } = await servico
        .from("registros_aula")
        .select("ta_inicial")
        .eq("codigo", `DSA-REG-PROPRIA-${SELO}`)
        .single();
      expect((data as { ta_inicial: number } | null)?.ta_inicial).toBe(1);
    });

    it(`${papel} não EXCLUI logicamente — o status no banco continua \`ativo\``, async () => {
      await sessao(papel)
        .from("registros_aula")
        .update({ status: "inativo" })
        .eq("codigo", `DSA-REG-PROPRIA-${SELO}`);

      const { data } = await servico
        .from("registros_aula")
        .select("status")
        .eq("codigo", `DSA-REG-PROPRIA-${SELO}`)
        .single();
      // Exclusão é LÓGICA (regra 4): o que se tenta é virar o status, e ele não vira.
      expect((data as { status: string } | null)?.status).toBe("ativo");
    });

    it(`${papel} não lança atividade não letiva nem avaliação — \`42501\` nas duas`, async () => {
      const atividade = await sessao(papel)
        .from("atividades_nao_letivas")
        .insert({
          codigo: `DSA-ATV-NEG-${papel}-${SELO}`,
          categoria_normativa: "AEC",
          escopo: "turma",
          turma_id: turmaRegularId,
          data: DIA,
          descricao: "Palestra que não deve entrar",
          tempos_consumidos: 1,
          ta_inicial: 6,
        });
      expect(atividade.error?.code, JSON.stringify(atividade.error)).toBe("42501");

      const avaliacao = await sessao(papel)
        .from("avaliacoes")
        .insert({
          codigo: `DSA-AVA-NEG-${papel}-${SELO}`,
          turma_id: turmaRegularId,
          curso_id: cursoRegularId,
          disciplina_id: disciplinaComumId,
          tipo_avaliacao: TIPO_AVALIACAO,
          data_avaliacao: DIA,
          instrutor_responsavel_id: instrutorId,
          tempos_consumidos: 1,
          ta_inicial: 7,
        });
      expect(avaliacao.error?.code, JSON.stringify(avaliacao.error)).toBe("42501");
    });
  }

  it("controle positivo · o Encarregado da Administração Acadêmica LANÇA, e a linha aparece", async () => {
    const { error } = await sessao("encarregado_administracao_academica")
      .from("registros_aula")
      .insert({
        codigo: `DSA-REG-POS-${SELO}`,
        data: DIA,
        turma_id: turmaRegularId,
        curso_id: cursoRegularId,
        unidade_ensino_id: unidadeEnsinoId,
        instrutor_id: instrutorId,
        tempos_consumidos: 1,
        ta_inicial: 8,
      });
    expect(error, JSON.stringify(error)).toBeNull();

    const { data } = await servico
      .from("registros_aula")
      .select("ta_inicial")
      .eq("codigo", `DSA-REG-POS-${SELO}`)
      .single();
    expect((data as { ta_inicial: number } | null)?.ta_inicial).toBe(8);
  });
});

describe("`Q-1` · o lançamento sem UE, pela sessão de quem lança", () => {
  /*
   * ⚠️ **ESTA É A ASSERÇÃO QUE O pgTAP NÃO PODE DAR.** Ela exercita o `grant execute` de
   * `app.disciplina_sem_ue` (gotcha 5.1): a expressão do `CHECK` é avaliada com os direitos de
   * QUEM GRAVA. Sem o grant, isto falha com `42501`/`permission denied for function` — e o pgTAP,
   * que grava como dono, passaria verde.
   */
  it("o Operador lança aula SEM UE em curso por competências, com tópico", async () => {
    const { error } = await sessao("operador")
      .from("registros_aula")
      .insert({
        codigo: `DSA-REG-SEMUE-${SELO}`,
        data: DIA,
        turma_id: turmaCompetenciasId,
        curso_id: cursoCompetenciasId,
        disciplina_id: disciplinaIsentaId,
        instrutor_id: instrutorId,
        tempos_consumidos: 2,
        ta_inicial: 3,
        conteudo_resumo: "Competência X, trecho A",
      });
    expect(error, `o lançamento sem UE foi recusado: ${JSON.stringify(error)}`).toBeNull();

    const { data } = await servico
      .from("registros_aula")
      .select("disciplina_id, unidade_ensino_id")
      .eq("codigo", `DSA-REG-SEMUE-${SELO}`)
      .single();
    const linha = data as { disciplina_id: string; unidade_ensino_id: string | null } | null;
    expect(linha?.disciplina_id).toBe(disciplinaIsentaId);
    expect(linha?.unidade_ensino_id).toBeNull();
  });

  it("⚠️ e a MESMA ação em disciplina NÃO isenta é recusada — `23514`, não `42501`", async () => {
    const { error } = await sessao("operador")
      .from("registros_aula")
      .insert({
        codigo: `DSA-REG-NAOISENTA-${SELO}`,
        data: DIA,
        turma_id: turmaRegularId,
        curso_id: cursoRegularId,
        disciplina_id: disciplinaComumId,
        instrutor_id: instrutorId,
        tempos_consumidos: 2,
        ta_inicial: 3,
        conteudo_resumo: "Tem tópico, mas a disciplina não é isenta",
      });

    expect(error, "a isenção vazou para disciplina comum").not.toBeNull();
    /*
     * ⚠️ O CÓDIGO DISTINGUE AS DUAS COISAS, e é por isso que ele é conferido: `23514` é a REGRA
     * recusando (o `CHECK` da catraca), e `42501` seria PERMISSÃO. Se este caso passasse a dar
     * `42501`, a isenção estaria certa e o lançamento legítimo do caso anterior estaria quebrado.
     */
    expect(error?.code, JSON.stringify(error)).toBe("23514");

    const { count } = await servico
      .from("registros_aula")
      .select("id", { count: "exact", head: true })
      .eq("codigo", `DSA-REG-NAOISENTA-${SELO}`);
    expect(count).toBe(0);
  });
});

describe("`Q-17` · o conflito entre turmas chega SEM o dado alheio", () => {
  it("⚠️ O PROBLEMA MEDIDO · o Operador recortado NÃO lê a turma alheia — e recebe VAZIO, não erro", async () => {
    const { data, error } = await sessao("operador")
      .from("registros_aula")
      .select("id")
      .eq("turma_id", turmaExpeditaId);

    // ⚠️ Gotcha 4: a RLS nega em silêncio. Medir `error` aqui daria verde com a policy escancarada.
    expect(error, JSON.stringify(error)).toBeNull();
    expect((data ?? []) as readonly unknown[]).toHaveLength(0);

    const naGrade = await sessao("operador")
      .from("vw_ocupacao_ta")
      .select("fato_id")
      .eq("fato_id", aulaDaTurmaAlheiaId);
    expect((naGrade.data ?? []) as readonly unknown[]).toHaveLength(0);
  });

  it('controle positivo · a linha EXISTE — o vazio acima é "você não vê", não "não há"', async () => {
    const { data } = await sessao("encarregado_administracao_academica")
      .from("vw_ocupacao_ta")
      .select("fato_id, instrutor_id")
      .eq("fato_id", aulaDaTurmaAlheiaId);
    expect((data ?? []) as readonly unknown[]).toHaveLength(1);
  });

  it("⚠️ O CASO QUE DISCRIMINA · e ainda assim o Operador VÊ o conflito, pela função com porteiro", async () => {
    const { data, error } = await sessao("operador").rpc(
      "conflitos_da_semana" as never,
      { p_turma_id: turmaRegularId, p_de: "2026-04-06", p_ate: "2026-04-10" } as never,
    );
    expect(error, JSON.stringify(error)).toBeNull();

    const linhas = (data ?? []) as readonly Record<string, unknown>[];
    expect(linhas.length, "o conflito da turma alheia não chegou").toBeGreaterThanOrEqual(1);

    const conflito = linhas[0]!;
    expect(conflito["instrutor_id"]).toBe(instrutorId);
    expect(conflito["data"]).toBe(DIA);
    expect(conflito["ta_inicial"]).toBe(1);

    /*
     * ⚠️ **E O QUE ELA NÃO DEVOLVE É METADE DO REQUISITO.** A `RN-CONF-01` manda ver o CONFLITO,
     * não o DSA do outro curso: `turma_id`, `fato_id`, disciplina e conteúdo não podem vir. Sem
     * esta asserção, "resolver" a Q-17 afrouxando a policy de leitura passaria no teste acima.
     */
    expect(Object.keys(conflito).sort()).toEqual(
      ["data", "fiscal_id", "instrutor_id", "local", "ta_final", "ta_inicial"].sort(),
    );
  });

  it("o Operador NÃO usa a função para espiar a turma que não alcança — `42501`", async () => {
    const { error } = await sessao("operador").rpc(
      "conflitos_da_semana" as never,
      { p_turma_id: turmaExpeditaId, p_de: "2026-04-06", p_ate: "2026-04-10" } as never,
    );
    // ⚠️ A função é SECURITY DEFINER: sem o porteiro, ela seria uma porta aberta para o DSA alheio.
    expect(error, "a função devolveu dado de turma fora do alcance").not.toBeNull();
    expect(error?.code, JSON.stringify(error)).toBe("42501");
  });
});

describe("`V-7` · a atividade de escopo global na grade de quem lê", () => {
  it("o Encarregado cria a atividade global; o Operador, que não pode criá-la, a VÊ na grade", async () => {
    // Medido na matriz: `atividades_globais.criar` é de admin, encarregado e ajudante — não do Operador.
    const { error: erroOperador } = await sessao("operador")
      .from("atividades_nao_letivas")
      .insert({
        codigo: `DSA-ATV-GLOBAL-NEG-${SELO}`,
        categoria_normativa: "TAD",
        escopo: "global",
        turma_id: null,
        data: DIA,
        descricao: "Cerimônia global que o Operador não cria",
        tempos_consumidos: 1,
        ta_inicial: 4,
      });
    expect(erroOperador?.code, JSON.stringify(erroOperador)).toBe("42501");

    const { error } = await sessao("encarregado_administracao_academica")
      .from("atividades_nao_letivas")
      .insert({
        codigo: `DSA-ATV-GLOBAL-${SELO}`,
        categoria_normativa: "TAD",
        escopo: "global",
        turma_id: null,
        data: DIA,
        descricao: "Cerimônia global",
        tempos_consumidos: 1,
        ta_inicial: 4,
      });
    expect(error, JSON.stringify(error)).toBeNull();

    /*
     * ⚠️ E ELA CHEGA AO OPERADOR porque `app.alcanca_turma(NULL)` devolve **true** por desenho
     * (*"evento de escopo global: alcança todos"*, medido no corpo da função em 05/10/2026). Sem
     * isso, a correção do V-7 na view emitiria uma linha que **ninguém** conseguiria ler, e o
     * `116` passaria verde enquanto a tela continuaria vazia.
     */
    const { data } = await sessao("operador")
      .from("vw_ocupacao_ta")
      .select("origem, turma_id")
      .is("turma_id", null)
      .eq("data", DIA);
    expect((data ?? []) as readonly unknown[]).toHaveLength(1);
    expect(((data ?? [])[0] as { origem: string } | undefined)?.origem).toBe(
      "atividade_nao_letiva",
    );
  });

  it("`Q-8` · o responsável externo é gravado em texto livre, e junto com instrutor é recusado", async () => {
    const { error } = await sessao("encarregado_administracao_academica")
      .from("atividades_nao_letivas")
      .insert({
        codigo: `DSA-ATV-EXTERNO-${SELO}`,
        categoria_normativa: "AEC",
        escopo: "turma",
        turma_id: turmaRegularId,
        data: DIA,
        descricao: "Palestra da DOEP",
        tempos_consumidos: 1,
        ta_inicial: 5,
        responsavel_externo: "DOEP",
      });
    expect(error, JSON.stringify(error)).toBeNull();

    const juntos = await sessao("encarregado_administracao_academica")
      .from("atividades_nao_letivas")
      .insert({
        codigo: `DSA-ATV-DOIS-${SELO}`,
        categoria_normativa: "AEC",
        escopo: "turma",
        turma_id: turmaRegularId,
        data: DIA,
        descricao: "Palestra com dois responsáveis",
        tempos_consumidos: 1,
        ta_inicial: 6,
        responsavel_externo: "DOEP",
        instrutor_id: instrutorId,
      });
    // `23514`, da regra — não `42501`, de permissão: quem recusa é o CHECK da exclusividade.
    expect(juntos.error?.code, JSON.stringify(juntos.error)).toBe("23514");
  });
});

/**
 * `FR-041.7` — **a view é testada contra a função pura, com a MESMA tabela de casos**.
 *
 * > *"Onde houver as duas implementações, **a função pura é a referência e a `VIEW` é testada contra
 * > ela** — nunca o contrário."* — documento 04, nota de implementação da CH do instrutor
 *
 * ⚠️ **ESTE ARQUIVO FALTAVA, e a falta tinha consequência.** A T029 exportava `CASOS_CANONICOS` para
 * que alguém os consumisse, e **ninguém consumia**: a função pura era provada contra si mesma e a
 * view contra nada. O `FR-041.7` ficava sendo afirmação. Achado na análise de 26/09/2026.
 *
 * ⚠️ **POR QUE NÃO É pgTAP:** pgTAP não chama TypeScript, e a referência é a **função pura**. Um
 * arquivo SQL só poderia repetir a conta — criando a terceira implementação, que é exatamente o que
 * a regra acima proíbe.
 *
 * ⚠️ **E POR QUE NÃO FICA EM `tests/invariantes/rls/`:** ali moram as provas de **permissão**. Aqui
 * não se prova quem pode o quê: prova-se que duas implementações da mesma conta dão o mesmo número.
 * ⚠️ **Isso obrigou a alargar o alvo do `pnpm test:rls`** de `tests/invariantes/rls` para
 * `tests/invariantes` — com o alvo antigo, **nenhum script rodaria este arquivo**, e teste que
 * ninguém roda é pior que teste ausente, porque parece cobertura.
 *
 * ⚠️ **A LEITURA DA VIEW É POR SESSÃO AUTENTICADA, não pela chave de serviço, e isso é exigência da
 * própria view.** Ela é `security_invoker = true` desde a M7, e o corpo dela chama
 * `app.fn_antiguidade_ordem`: lida com a `service_role`, que **não tem `usage` em `app`** (medido em
 * 29/09/2026), ela responde `permission denied for schema app`. Ler pela sessão é o caminho de
 * verdade — e, de quebra, prova que `authenticated` alcança a view, que era a outra metade do
 * conserto da M7. A semeadura segue pela chave de serviço, porque montar cenário não é asserção.
 *
 * ⚠️ **O CASO QUE DISCRIMINA É O 10 ENTRE 3.** Com a view anterior à M5 — `round(ch / n, 2)` — ela
 * devolvia `3.33` três vezes; a função pura devolve `4/3/3`. Este arquivo **reprovaria** antes da M5
 * e passa depois. Sem ele, o conserto da M5 não teria prova de comportamento nenhuma: a invariante
 * I-13 confere `security_invoker` no catálogo, não o número.
 *
 * ⚠️ **A AMOSTRA É IDEMPOTENTE e os identificadores são GERADOS** (regra 9.1): curso não é apagável
 * — `curso_regime_historico` é append-only e a FK é `restrict` —, então a limpeza reaproveita o curso
 * e apaga só o que é desta suíte. Código fixo faria a segunda execução falhar com `23505`, que
 * **parece recusa de permissão e não é**.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CASOS_CANONICOS, ratear, type CasoCanonico } from "@/lib/dominio/rateio-de-carga";

import { chaveLocal } from "./rls/chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

/** ⚠️ Cliente SEM tipo: a amostra insere direto em tabela com gatilho, e o tipo gerado exigiria
 *  valor para coluna que o banco preenche (gotcha 5). */
const admin: SupabaseClient = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** O marcador desta suíte. Tudo que ela cria carrega isto e é apagado por isto. */
const MARCA = "RATEIO-VIEW";
const SIGLA_DO_CURSO = `Z-RATEIO-${MARCA}`;

/** A sessão que LÊ a view — autenticada de verdade, porque a view é `security_invoker`. */
let sessao: SupabaseClient;
const EMAIL_DA_LEITORA = "rateio-da-view@rateio.teste";
const SENHA = "senha-de-teste-com-12+";

let cursoId = "";
let turmaId = "";
/** Os instrutores da amostra, **em ordem de antiguidade** — o mais antigo primeiro. */
const instrutores: string[] = [];
/** Caso canônico → a `turma_disciplina` que o representa no banco. */
const turmaDisciplinaDoCaso = new Map<string, string>();

async function gravar(tabela: string, linha: Record<string, unknown>): Promise<string> {
  const { data, error } = await admin.from(tabela).insert(linha).select("id").single();
  if (error) throw new Error(`falha ao semear ${tabela}: ${error.message}`);
  return (data as { id: string }).id;
}

/**
 * Cria disciplina **com o `codigo` explícito**, e é isso que a torna semeável aqui.
 *
 * ⚠️ **SEM O `codigo`, o `insert` falha com `permission denied for schema app`** — e o erro aponta
 * para o **schema**, não para a coluna. `disciplinas.codigo` tem `DEFAULT app.proximo_codigo_*`, e o
 * `DEFAULT` é avaliado **com os direitos de quem insere** (gotcha 5.1). Medido em 29/09/2026:
 * `authenticated` **tem** `usage` em `app` — então a tela funciona —, e a **`service_role` não tem**,
 * que é o papel desta semeadura. Passar o código pula o `DEFAULT` inteiro.
 *
 * ⚠️ E por isso NÃO se usa `criar_disciplina` aqui: a RPC esbarra no mesmo privilégio. Ela é o
 * caminho da tela (decisão A-2), não o da amostra — e a consequência é que a `turma_disciplina`
 * **não nasce sozinha**, e é criada logo abaixo.
 */
async function criarDisciplina(
  sequencia: number,
  campos: Record<string, unknown>,
): Promise<string> {
  return gravar("disciplinas", {
    codigo: `DIS-${MARCA}-${sequencia}`,
    curso_id: cursoId,
    ...campos,
  });
}

async function limpar(): Promise<void> {
  // ⚠️ A ORDEM É A DAS DEPENDÊNCIAS, de dentro para fora. As FKs são `restrict` de propósito: nada
  //    neste sistema apaga em cascata, e depender de cascata aqui esconderia um vínculo esquecido.
  const { data: curso } = await admin
    .from("cursos")
    .select("id")
    .eq("codigo", SIGLA_DO_CURSO)
    .maybeSingle();
  if (!curso) return;
  const id = (curso as { id: string }).id;

  const { data: disciplinas } = await admin.from("disciplinas").select("id").eq("curso_id", id);
  const ids = (disciplinas ?? []).map((d) => (d as { id: string }).id);

  if (ids.length > 0) {
    await admin.from("turma_disciplina_unidade").delete().in("disciplina_id", ids);
    const { data: tds } = await admin
      .from("turma_disciplina")
      .select("id")
      .in("disciplina_id", ids);
    const tdIds = (tds ?? []).map((t) => (t as { id: string }).id);
    if (tdIds.length > 0) {
      await admin.from("turma_disciplina_instrutor").delete().in("turma_disciplina_id", tdIds);
      await admin.from("turma_disciplina").delete().in("id", tdIds);
    }
    await admin.from("unidades_ensino").delete().in("disciplina_id", ids);
    await admin.from("disciplinas").delete().in("id", ids);
  }
  await admin.from("turmas").delete().eq("curso_id", id);
  // ⚠️ O CURSO NÃO É APAGADO — `curso_regime_historico` é append-only e a FK é `restrict` (regra
  //    9.1). Ele fica e é reaproveitado, que é o que torna esta suíte idempotente.
  await admin.from("instrutores").delete().like("nome_completo", `${MARCA}%`);

  const { data: contas } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const conta of contas?.users ?? []) {
    if (conta.email === EMAIL_DA_LEITORA) {
      await admin.from("usuarios").delete().eq("auth_user_id", conta.id);
      await admin.auth.admin.deleteUser(conta.id);
    }
  }
}

beforeAll(async () => {
  await limpar();

  // ── a leitora ─────────────────────────────────────────────────────────────────────────────────
  // ⚠️ **PERFIL `admin`, e com ele vem um risco conhecido:** um Admin ativo a mais faz
  //    `app.impedir_remocao_do_ultimo_admin()` parar de recusar em `rls.test.ts`, derrubando 12
  //    asserções de lá (gotcha 8). Aqui ele é aceitável porque os arquivos de `tests/invariantes`
  //    rodam **em série** (`--no-file-parallelism`) e o `afterAll` apaga a conta. Escolhi `admin` de
  //    propósito: qualquer perfil de alcance restrito leria a view **filtrada**, e o número que se
  //    compara com a função pura tem de ser o da linha inteira.
  const { data: conta, error: erroConta } = await admin.auth.admin.createUser({
    email: EMAIL_DA_LEITORA,
    password: SENHA,
    email_confirm: true,
  });
  if (erroConta) throw new Error(`falha ao criar a conta leitora: ${erroConta.message}`);

  const { error: erroCadastro } = await admin.from("usuarios").insert({
    codigo: `USR-${MARCA}`,
    auth_user_id: conta.user.id,
    email: EMAIL_DA_LEITORA,
    nome: `Leitora da view (${MARCA})`,
    perfil: "admin",
    escopo_curso: "geral",
  });
  if (erroCadastro) throw new Error(`falha ao cadastrar a leitora: ${erroCadastro.message}`);

  sessao = createClient(URL_SUPABASE, CHAVE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: erroLogin } = await sessao.auth.signInWithPassword({
    email: EMAIL_DA_LEITORA,
    password: SENHA,
  });
  if (erroLogin) throw new Error(`falha ao autenticar a leitora: ${erroLogin.message}`);

  // ── o curso, reaproveitado ────────────────────────────────────────────────────────────────────
  // ⚠️ **PELA RPC, NUNCA POR `insert` DIRETO.** O gatilho da fatia (a) recusa com *"Todo curso tem
  //    regime de horario."*: curso e regime nascem juntos, na mesma transação. E `limite_turmas_ano`
  //    é preenchido pela classificação — mandá-lo aqui seria gravar por fora da regra (gotcha 5).
  const { data: existente } = await admin
    .from("cursos")
    .select("id")
    .eq("codigo", SIGLA_DO_CURSO)
    .maybeSingle();

  if (existente) {
    cursoId = (existente as { id: string }).id;
  } else {
    const { data: curso, error } = await admin
      .rpc("criar_curso_com_regime", {
        p_curso: {
          codigo: SIGLA_DO_CURSO,
          nome_curso: `Amostra do rateio (${MARCA})`,
          classificacao: "expedito",
          // ⚠️ `modalidade` é ANULÁVEL e ainda assim obrigatória: a catraca
          //    `cursos_modalidade_so_nula_no_historico` permite nulo só nas linhas migradas.
          modalidade: "presencial",
          duracao_dias: 20,
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
      })
      .single();
    if (error) throw new Error(`falha ao criar curso: ${error.message}`);
    cursoId = (curso as { id: string }).id;
  }

  // ⚠️ **A TURMA VEM ANTES DAS DISCIPLINAS.** Criar turma faz nascer uma `turma_disciplina` por
  //    disciplina ATIVA do curso (`FR-032.2` da spec 009); na ordem inversa, a linha nasceria
  //    sozinha e o `insert` explícito abaixo colidiria — é o achado A-2 da fatia (a).
  // ⚠️ `codigo` NÃO é passado: ele é montado por gatilho a partir de sigla, rótulo e ano, e por isso
  //    aparece como obrigatório no tipo gerado (gotcha 5.2).
  turmaId = await gravar("turmas", {
    curso_id: cursoId,
    turma: "T1",
    ano_letivo: 2026,
    modalidade: "presencial",
    status: "planejada",
    data_inicio: "2026-03-02",
    data_termino: "2026-06-30",
  });

  // ── três instrutores, com antiguidade DETERMINÍSTICA ──────────────────────────────────────────
  // ⚠️ Mesmo posto e `antiguidade_declarada_num` 1, 2, 3: `app.fn_antiguidade_ordem` é
  //    `peso_posto * 100000 + antiguidade_declarada_num`, então a ordem é exatamente esta. Sem fixar
  //    a antiguidade, o resto do `FR-042` iria para quem o banco ordenasse, e o teste mediria a
  //    sorte do `id`.
  for (let posicao = 1; posicao <= 3; posicao++) {
    instrutores.push(
      await gravar("instrutores", {
        posto_graduacao: "CC",
        // ⚠️ Militar SEM especialidade é recusado em cadastro NOVO
        //    (`instrutores_esp_hab_obs_de_militar_novo`) — decisão de 15/09/2026, depois de 15
        //    militares reais não conseguirem salvar a própria ficha: o campo ficou opcional para
        //    quem já existia e obrigatório para quem nasce.
        esp_hab_obs: "-EF",
        nome_completo: `${MARCA} Instrutor ${posicao}`,
        categoria: "Militar",
        om: "CIAARA",
        antiguidade_declarada: String(posicao),
        // ⚠️ `antiguidade_declarada_num` é DERIVADA (`GENERATED ALWAYS`) — o banco recusa valor
        //    explícito. Basta a declarada; a numérica sai dela, e é ela que ordena.
        status: "ativo",
      }),
    );
  }

  // ── uma disciplina e uma turma-disciplina POR CASO ────────────────────────────────────────────
  let sequencia = 0;
  for (const caso of CASOS_CANONICOS) {
    sequencia += 1;
    const quantos = caso.entrada.instrutores.length;
    const disciplinaId = await criarDisciplina(sequencia, {
      cod_disciplina: `RTV${String(sequencia).padStart(3, "0")}`,
      nome_disciplina: `${MARCA} — ${caso.nome}`,
      carga_horaria_tempos: caso.entrada.cargaHorariaTempos,
      modo_atribuicao_padrao: caso.entrada.modo,
    });

    const turmaDisciplinaId = await gravar("turma_disciplina", {
      turma_id: turmaId,
      disciplina_id: disciplinaId,
      status: "ativo",
    });
    turmaDisciplinaDoCaso.set(caso.nome, turmaDisciplinaId);

    // ⚠️ No caso 5 as UEs entram ANTES das atribuições: o gatilho adiado do `FR-043` confere a
    //    cobertura no fim da transação, e semear na ordem inversa recusaria com a mensagem certa
    //    pela razão errada.
    const unidadePorInstrutor: string[] = [];
    if (caso.entrada.temAtribuicaoPorUnidade) {
      for (let i = 0; i < quantos; i++) {
        unidadePorInstrutor.push(
          // ⚠️ `codigo` explícito, pela mesma razão da disciplina: o `DEFAULT` chama
          //    `app.proximo_codigo_ue` e a `service_role` não tem `usage` em `app` (gotcha 5.1).
          await gravar("unidades_ensino", {
            codigo: `UE-${MARCA}-${sequencia}-${i + 1}`,
            disciplina_id: disciplinaId,
            curso_id: cursoId,
            numero_ue: String(i + 1),
            topico: `${MARCA} UE ${i + 1}`,
            ch_prevista_tempos: caso.entrada.instrutores[i]?.temposDasUnidades ?? 0,
            status: "ativo",
          }),
        );
      }
    }

    // ⚠️ **AS PARCELAS ENTRAM TODAS DE UMA VEZ, e isso não é economia de chamada.** A `FR-043` põe a
    //    soma exata como invariante do banco, por gatilho **adiado**: ele confere no fim da
    //    transação. Cada chamada à interface de dados é uma transação própria, então inserir uma
    //    parcela por vez faz o gatilho disparar com a soma **parcial** — medido: *"as parcelas somam
    //    7.00 tempos; a disciplina tem 10"* depois do primeiro dos dois instrutores do caso 4. Um
    //    `insert` com a lista inteira é um comando só, e a conferência acontece onde deve.
    const parcelas = Array.from({ length: quantos }, (_, i) => {
      const digitado = caso.entrada.instrutores[i]?.temposDigitados;
      return {
        codigo: `TDI-${MARCA}-${sequencia}-${i + 1}`,
        turma_disciplina_id: turmaDisciplinaId,
        instrutor_id: instrutores[i]!,
        ...(digitado === null || digitado === undefined ? {} : { ch_prevista_tempos: digitado }),
        status: "ativo",
      };
    });
    const { error: erroParcelas } = await admin.from("turma_disciplina_instrutor").insert(parcelas);
    if (erroParcelas) {
      throw new Error(`falha ao semear as parcelas de "${caso.nome}": ${erroParcelas.message}`);
    }

    if (caso.entrada.temAtribuicaoPorUnidade) {
      // ⚠️ Mesma razão: a `FR-043` exige que **toda** UE esteja atribuída, e o gatilho adiado
      //    conferiria cobertura parcial se as linhas entrassem uma a uma.
      const { error: erroUnidades } = await admin.from("turma_disciplina_unidade").insert(
        Array.from({ length: quantos }, (_, i) => ({
          // ⚠️ `codigo` explícito — o `DEFAULT` chama `app.proximo_codigo_tdu` (gotcha 5.1).
          codigo: `TDU-${MARCA}-${sequencia}-${i + 1}`,
          turma_disciplina_id: turmaDisciplinaId,
          disciplina_id: disciplinaId,
          unidade_ensino_id: unidadePorInstrutor[i]!,
          instrutor_id: instrutores[i]!,
          status: "ativo",
        })),
      );
      if (erroUnidades) {
        throw new Error(`falha ao semear as unidades de "${caso.nome}": ${erroUnidades.message}`);
      }
    }
  }
}, 180_000);

afterAll(limpar);

/** O que a VIEW devolve, na ordem de antiguidade que ela mesma calcula. */
async function daView(caso: CasoCanonico): Promise<number[]> {
  const turmaDisciplinaId = turmaDisciplinaDoCaso.get(caso.nome);
  const { data, error } = await sessao
    .from("vw_instrutor_carga_prevista")
    .select("instrutor_id, tempos_previstos")
    .eq("turma_disciplina_id", turmaDisciplinaId);
  if (error) throw new Error(`falha ao ler a view: ${error.message}`);

  const porInstrutor = new Map(
    (data ?? []).map((l) => {
      const linha = l as { instrutor_id: string; tempos_previstos: number | string };
      return [linha.instrutor_id, Number(linha.tempos_previstos)];
    }),
  );
  // A ordem é a da lista semeada, que é a de antiguidade — a mesma que a função pura recebe.
  return caso.entrada.instrutores.map((_, i) => porInstrutor.get(instrutores[i]!) ?? Number.NaN);
}

describe("`FR-041.7` · a view e a função pura respondem a MESMA pergunta", () => {
  it("a amostra foi semeada — controle positivo, sem o qual o `each` mediria o vazio", () => {
    expect(turmaDisciplinaDoCaso.size, "nenhum caso foi semeado no banco").toBe(
      CASOS_CANONICOS.length,
    );
    expect(instrutores.length).toBe(3);
  });

  it.each(CASOS_CANONICOS.map((c) => [c.nome, c] as const))(
    "a view devolve o mesmo que a função pura — %s",
    async (_nome, caso) => {
      const daFuncao = ratear(caso.entrada).parcelas.map((p) => p.tempos);
      expect(daFuncao, "a função pura divergiu da tabela de casos").toEqual([...caso.esperado]);

      const doBanco = await daView(caso);
      expect(
        doBanco,
        `a VIEW discorda da função pura em "${caso.nome}". A função pura é a referência ` +
          `(documento 04): quem está errada é a view.`,
      ).toEqual(daFuncao);
    },
    60_000,
  );
});

describe("⚠️ O CASO QUE DISCRIMINA · a view não produz mais fração", () => {
  it("10 TA entre 3 dá 4/3/3 NO BANCO — antes da M5 dava 3,33 três vezes", async () => {
    const caso = CASOS_CANONICOS.find((c) => c.nome.startsWith("3 — 10 entre 3"))!;
    const doBanco = await daView(caso);

    expect(doBanco).toEqual([4, 3, 3]);
    // ⚠️ As duas asserções abaixo são o que a formulação antiga reprovaria, e a atual não:
    //    a soma FECHA, e nenhuma parcela é fracionária.
    expect(doBanco.reduce((a, b) => a + b, 0)).toBe(10);
    for (const tempos of doBanco) expect(Number.isInteger(tempos)).toBe(true);
  }, 30_000);

  it("⚠️ e o resto foi para o MAIS ANTIGO, não para o último — é a regra que a A-1 mudou", async () => {
    const caso = CASOS_CANONICOS.find((c) => c.nome.startsWith("3 — 10 entre 3"))!;
    const doBanco = await daView(caso);
    expect(doBanco[0], "o mais antigo não recebeu o resto").toBe(4);
    expect(doBanco[2], "o mais moderno recebeu o resto — é a regra da v2.0").toBe(3);
  }, 30_000);
});

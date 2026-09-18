/**
 * Suíte de RLS da fatia (a) do Épico 5 — cursos e turmas (spec `009-cursos-e-turmas`).
 *
 * POR QUE UM ARQUIVO PRÓPRIO, e não mais um bloco em `rls.test.ts`: aquele arquivo porta os doze
 * testes T-01 a T-12 do Épico 1 e já passa de 1.500 linhas. Esta fatia acrescenta um conjunto novo
 * de negativas — salas, escopo do Operador sobre turma, vigência de regime —, e misturá-las lá
 * tornaria impossível dizer o que quebrou quando algo quebrar.
 *
 * A REGRA É A MESMA: prova-se o que cada perfil **NÃO** pode, com **JWT de verdade**. O pgTAP roda
 * como dono do schema, e sob privilégio de dono **a RLS não se aplica**.
 *
 * ⚠️ DOMÍNIO DE E-MAIL PRÓPRIO, `@ciaara.teste5a`. A suíte de RLS do Épico 1 apaga **todos** os
 * usuários de `@ciaara.teste` na limpeza dela: com o mesmo domínio, uma suíte derrubaria a sessão da
 * outra. O mesmo vale para os códigos: `USR-5A-`, fora do `UC-%` que aquela limpa.
 *
 * ⚠️ E A SUÍTE DE RLS PASSOU A RODAR **UM ARQUIVO POR VEZ** (`--no-file-parallelism` no `test:rls`),
 * por causa deste arquivo — por **precaução medida, não por defeito observado**, e a diferença está
 * escrita aqui de propósito. Este arquivo cria uma conta **Admin**, e o gatilho
 * `app.impedir_remocao_do_ultimo_admin()` conta os **outros** Admins ativos no banco **inteiro**:
 * enquanto esta suíte tem a conta dela de pé, o caso *"desativar o último Admin é recusado"* do
 * `rls.test.ts` deixa de ter um último Admin para proteger. A janela é real e é de tempo — em
 * 17/09/2026 ela **não** se materializou em três execuções paralelas seguidas, todas verdes. Uma
 * suíte que compartilha um banco e depende de CONTAGEM GLOBAL não deve depender de escalonamento:
 * é o quinto achado da fatia (c) do Épico 4 (corrida entre processos), aqui fechado antes de
 * custar uma investigação.
 *
 * ⚠️ E O QUE DE FATO REPROVOU 12 CASOS EM 17/09/2026 **não foi paralelismo, foi a base carregada**:
 * o ETL traz `USR-01` e `USR-02`, dois Admins **reais e ativos**, e com eles o caso do último Admin
 * passa a ser aceito, a conta Admin do `rls.test.ts` fica `inativo` e tudo que depende dela cai com
 * `42501`. `pnpm verificar:tudo` não vê isso porque faz `db:reset` antes; quem roda `pnpm test:rls`
 * depois do ETL vê. Está registrado como achado da fatia — **não corrigido aqui**, porque é do
 * `rls.test.ts` do Épico 1 e conserto de teste alheio é decisão, não subproduto.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

const SENHA = "senha-de-teste-com-12+";

/** Cliente de privilégio elevado — só para MONTAR o cenário. Nunca para asserção. */
const admin = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Perfil =
  | "admin"
  | "encarregado_administracao_academica"
  | "ajudante_administracao_academica"
  | "operador"
  // ⚠️ O Encarregado da Divisão de Orientação Educacional e Pedagógica entrou por um motivo
  // preciso: ele é o perfil que o documento 01 §2.5 deixa com `L` em `horarios` e em `turmas` —
  // ou seja, o perfil pelo qual se prova o NEGATIVO de cada permissão nova desta fatia.
  | "encarregado_orientacao_pedagogica";

const sessoes = new Map<Perfil, SupabaseClient>();
const email = (p: Perfil) => `5a-${p}@ciaara.teste5a`;

/** As salas que esta suíte cria. Nomeadas para a limpeza alcançar todas, e só elas. */
const SALAS_DO_TESTE = ["Sala 5A Ajudante", "Sala 5A Admin", "Sala 5A Encarregado"];

/** O curso e a disciplina da prova do gatilho de nascimento (`FR-032.2`, R-6). */
// ⚠️ A RPC gera o `id` dela — estas variáveis são preenchidas depois da criação.
let CURSO_NASCIMENTO = "";
const DISCIPLINA_NASCIMENTO = "5a000000-0000-0000-0000-00000000d001";

/*
 * O par de cursos do recorte do Operador: um EXPEDITO, que é o escopo dele, e um REGULAR, que não é.
 * ⚠️ São fixtures, e não `C-Exp-BATI` e `CAHO` como a spec mediu: esta suíte roda sobre a base do
 * `db:reset`, VAZIA, e depender de curso da carga faria o caso passar ou falhar pelo estado do banco
 * em vez de pelo requisito.
 */
let CURSO_DO_ESCOPO = "";
let CURSO_FORA_DO_ESCOPO = "";
/** Uma turma que o Admin cria no curso FORA do escopo, para o Operador tentar mexer nela. */
const TURMA_FORA_DO_ESCOPO = "5a000000-0000-0000-0000-00000000a003";

const cliente = (p: Perfil): SupabaseClient => {
  const c = sessoes.get(p);
  if (!c) throw new Error(`sessao ausente para ${p}`);
  return c;
};

async function criarUsuario(perfil: Perfil, escopo: string): Promise<void> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(perfil),
    password: SENHA,
    email_confirm: true,
  });
  if (error) throw new Error(`falha ao criar conta ${email(perfil)}: ${error.message}`);

  const { error: erroUsuario } = await admin.from("usuarios").insert({
    codigo: `USR-5A-${perfil}`,
    auth_user_id: data.user.id,
    email: email(perfil),
    nome: `Teste 5A ${perfil}`,
    perfil,
    escopo_curso: escopo,
  });
  if (erroUsuario) throw new Error(`falha ao cadastrar usuario ${perfil}: ${erroUsuario.message}`);

  const sessao = createClient(URL_SUPABASE, CHAVE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: erroLogin } = await sessao.auth.signInWithPassword({
    email: email(perfil),
    password: SENHA,
  });
  if (erroLogin) throw new Error(`falha ao autenticar ${perfil}: ${erroLogin.message}`);
  sessoes.set(perfil, sessao);
}

/**
 * Deixa a base no estado inicial. Roda ANTES e DEPOIS: uma execução interrompida no meio do
 * `beforeAll` não pode inviabilizar a seguinte.
 */
async function limpar(): Promise<void> {
  // ⚠️ A MATRIZ VOLTA AO LUGAR ANTES E DEPOIS. A prova do gatilho tira `disciplinas.editar` do
  // Encarregado da Divisão, e deixar isso para trás mudaria o resultado de toda a suíte seguinte —
  // inclusive de arquivos que não sabem que esta prova existe.
  await admin
    .from("perfil_permissao")
    .update({ permitido: true })
    .eq("perfil", "encarregado_administracao_academica")
    .eq("recurso", "disciplinas")
    .eq("acao", "editar");

  const { data: cursosDoTeste } = await admin
    .from("cursos")
    .select("id")
    .in("codigo", ["5A-NASC", "5A-EXP", "5A-REG"]);
  const idsDeCurso = (cursosDoTeste ?? []).map((c) => c.id);

  const { data: turmasDoTeste } = idsDeCurso.length
    ? await admin.from("turmas").select("id").in("curso_id", idsDeCurso)
    : { data: [] };
  const idsDeTurma = (turmasDoTeste ?? []).map((t) => t.id);
  if (idsDeTurma.length > 0) {
    await admin.from("turma_disciplina").delete().in("turma_id", idsDeTurma);
    await admin.from("turmas").delete().in("id", idsDeTurma);
  }
  await admin.from("disciplinas").delete().eq("id", DISCIPLINA_NASCIMENTO);
  // ⚠️ OS CURSOS E AS VIGÊNCIAS FICAM: a vigência é append-only (`DELETE` recusado inclusive para a
  //    `service_role`), e a FK do curso é `restrict`. A fixture é idempotente por isso.
  await admin
    .from("curso_regime_historico")
    .delete()
    .in("codigo", ["REG-5A-NEG", "REG-5A-OK", "REG-5A-OPE", "REG-5A-OPE-FORA"]);

  await admin.from("config_listas").delete().eq("lista", "salas").in("valor", SALAS_DO_TESTE);
  await admin.from("usuarios").delete().like("email", "%@ciaara.teste5a");
  const { data } = await admin.auth.admin.listUsers();
  for (const u of data?.users ?? []) {
    if (u.email?.endsWith("@ciaara.teste5a")) await admin.auth.admin.deleteUser(u.id);
  }
}

beforeAll(async () => {
  await limpar();
  await criarUsuario("admin", "geral");
  await criarUsuario("encarregado_administracao_academica", "geral");
  await criarUsuario("ajudante_administracao_academica", "geral");
  await criarUsuario("operador", "expedito");
  await criarUsuario("encarregado_orientacao_pedagogica", "geral");

  // ⚠️ PELA RPC: curso sem vigência `padrao` é recusado no COMMIT (`curso_sem_regime`, FR-019.5),
  // e cada requisição do PostgREST é uma transação. E o curso não é apagável depois — a vigência é
  // append-only —, então a fixture reaproveita o que já existe.
  const regime = {
    regime_tempos: 8,
    ta_duracao_min: 45,
    intervalo_manha_min: 10,
    intervalo_tarde_min: 10,
    hora_inicio_manha: "07:30",
    hora_inicio_tarde: "13:30",
    vigente_de: "2020-01-01",
  };
  for (const linha of [
    {
      codigo: "5A-EXP",
      nome_curso: "Curso expedito do escopo do Operador",
      classificacao: "expedito",
      modalidade: "presencial",
      duracao_dias: 10,
    },
    {
      codigo: "5A-REG",
      nome_curso: "Curso regular fora do escopo do Operador",
      classificacao: "regular",
      modalidade: "presencial",
      duracao_dias: 30,
    },
  ]) {
    const { data: existe } = await admin
      .from("cursos")
      .select("id")
      .eq("codigo", linha.codigo)
      .maybeSingle();
    if (existe) continue;
    const { error } = await admin.rpc("criar_curso_com_regime", {
      p_curso: linha,
      p_regime: regime,
    });
    if (error) throw new Error(`fixture do par de cursos falhou: ${error.message}`);
  }

  const { data: cursosCriados } = await admin
    .from("cursos")
    .select("id, codigo")
    .in("codigo", ["5A-EXP", "5A-REG"]);
  CURSO_DO_ESCOPO = (cursosCriados ?? []).find((c) => c.codigo === "5A-EXP")?.id as string;
  CURSO_FORA_DO_ESCOPO = (cursosCriados ?? []).find((c) => c.codigo === "5A-REG")?.id as string;

  const { error: erroTurmaFora } = await admin.from("turmas").insert({
    id: TURMA_FORA_DO_ESCOPO,
    curso_id: CURSO_FORA_DO_ESCOPO,
    turma: "T1",
    ano_letivo: 2046,
    status: "planejada",
    modalidade: "presencial",
  });
  if (erroTurmaFora) throw new Error(`fixture da turma alheia falhou: ${erroTurmaFora.message}`);

  const { data: nascExiste } = await admin
    .from("cursos")
    .select("id")
    .eq("codigo", "5A-NASC")
    .maybeSingle();
  if (!nascExiste) {
    const { error: erroCurso } = await admin.rpc("criar_curso_com_regime", {
      p_curso: {
        codigo: "5A-NASC",
        nome_curso: "Curso do nascimento das disciplinas",
        classificacao: "regular",
        modalidade: "presencial",
        duracao_dias: 30,
      },
      p_regime: regime,
    });
    if (erroCurso) throw new Error(`fixture de curso falhou: ${erroCurso.message}`);
  }
  const { data: cursoNasc } = await admin
    .from("cursos")
    .select("id")
    .eq("codigo", "5A-NASC")
    .single();
  CURSO_NASCIMENTO = cursoNasc?.id as string;

  const { error: erroDisciplina } = await admin.from("disciplinas").insert({
    id: DISCIPLINA_NASCIMENTO,
    codigo: "5A-NASC-D1",
    curso_id: CURSO_NASCIMENTO,
    cod_disciplina: "5A-1",
    nome_disciplina: "Disciplina do nascimento",
    carga_horaria_tempos: 10,
  });
  if (erroDisciplina) throw new Error(`fixture de disciplina falhou: ${erroDisciplina.message}`);
}, 60_000);

afterAll(limpar);

describe("N-4 e N-5 · quem escreve na lista de salas é decisão do banco (`FR-029.2`)", () => {
  /*
   * ⚠️ A LINHA VAI SEMPRE COMPLETA, com `ambiente_virtual`. Mandá-la incompleta faria a recusa vir
   * do `CHECK` de natureza (`23514`) ANTES de a policy ser consultada, e o teste ficaria verde com
   * a RLS desligada — o mesmo modo de falha que o caso N-7 do Épico 1 acabou de corrigir.
   */
  const sala = (valor: string) => ({
    lista: "salas",
    valor,
    rotulo_exibicao: valor,
    metadados: { ambiente_virtual: false },
  });

  it("N-4 · o Ajudante da Divisão NÃO acrescenta sala — o banco devolve 42501", async () => {
    const { error } = await cliente("ajudante_administracao_academica")
      .from("config_listas")
      .insert(sala("Sala 5A Ajudante"));
    expect(error?.code, "o Ajudante da Divisão acrescentou sala").toBe("42501");
  });

  it("N-5 · o Admin acrescenta sala", async () => {
    const { error } = await cliente("admin").from("config_listas").insert(sala("Sala 5A Admin"));
    expect(error, `o Admin não conseguiu acrescentar sala: ${error?.message}`).toBeNull();
  });

  it("N-5 · o Encarregado da Divisão acrescenta sala", async () => {
    const { error } = await cliente("encarregado_administracao_academica")
      .from("config_listas")
      .insert(sala("Sala 5A Encarregado"));
    expect(
      error,
      `o Encarregado da Divisão não conseguiu acrescentar sala: ${error?.message}`,
    ).toBeNull();
  });

  it("o Operador LÊ a lista de salas — negar leitura esvaziaria o seletor de turma", async () => {
    const { data, error } = await cliente("operador")
      .from("config_listas")
      .select("valor, metadados")
      .eq("lista", "salas");
    expect(error, `o Operador não leu a lista de salas: ${error?.message}`).toBeNull();
    const valores = (data ?? []).map((l) => l.valor);
    expect(valores).toContain("Moodle");
    expect(valores).toContain("Sala CAHO");
  });
});

describe("`FR-032.2` / R-6 · o gatilho de nascimento roda com os direitos do dono", () => {
  /*
   * ⚠️ AS DUAS METADES, E A SEGUNDA É A QUE PROVA O `SECURITY DEFINER` (exigência de Bernardo Villas
   * Boas, 17/09/2026). Só a primeira — "quem não tem `disciplinas.editar` cria turma e as linhas
   * nascem" — provaria apenas que a permissão é IRRELEVANTE, que é conclusão diferente e errada. A
   * segunda mostra que a permissão continua valendo para escrita direta, na MESMA sessão: o que muda
   * é quem escreve, não o que o perfil pode.
   *
   * ⚠️ E É SESSÃO AUTENTICADA DE VERDADE, não simulada por `request.jwt.claim.sub`. Sob privilégio
   * de dono a RLS não se aplica, e uma prova de permissão ali passaria com a RLS desligada — por
   * isso ela não mora no pgTAP `102`.
   *
   * ⚠️ POR QUE O ENCARREGADO, e não o Operador: hoje os quatro perfis que criam turma TÊM
   * `disciplinas.editar` (é só por isso que o gatilho funcionaria com os direitos de quem cria), e o
   * Operador só ganha `turmas.criar` na migration 5. A prova tira a permissão de quem já cria turma
   * — que é exatamente a decisão de negócio legítima que o R-6 diz que não pode quebrar o cadastro.
   */
  beforeAll(async () => {
    const { error } = await admin
      .from("perfil_permissao")
      .update({ permitido: false })
      .eq("perfil", "encarregado_administracao_academica")
      .eq("recurso", "disciplinas")
      .eq("acao", "editar");
    if (error) throw new Error(`não consegui retirar disciplinas.editar: ${error.message}`);
  });

  afterAll(async () => {
    await admin
      .from("perfil_permissao")
      .update({ permitido: true })
      .eq("perfil", "encarregado_administracao_academica")
      .eq("recurso", "disciplinas")
      .eq("acao", "editar");
  });

  it("metade 1 · SEM `disciplinas.editar`, o Encarregado cria turma e as linhas NASCEM", async () => {
    const { data: turma, error } = await cliente("encarregado_administracao_academica")
      .from("turmas")
      .insert({
        curso_id: CURSO_NASCIMENTO,
        turma: "T1",
        ano_letivo: 2045,
        status: "planejada",
        modalidade: "presencial",
      })
      .select("id, codigo")
      .single();
    expect(error, `criar turma falhou sem disciplinas.editar: ${error?.message}`).toBeNull();
    expect(turma?.codigo).toBe("5A-NASC T1 2045");

    const { data: linhas } = await admin
      .from("turma_disciplina")
      .select("id, codigo")
      .eq("turma_id", turma?.id as string);
    expect(
      (linhas ?? []).length,
      "a turma nasceu sem a linha de disciplina: o gatilho não rodou com os direitos do dono",
    ).toBe(1);
  });

  it("metade 2 · e o MESMO perfil, na MESMA sessão, é recusado ao escrever direto na tabela", async () => {
    const { data: turma } = await admin
      .from("turmas")
      .select("id")
      .eq("curso_id", CURSO_NASCIMENTO)
      .limit(1)
      .single();

    const { error } = await cliente("encarregado_administracao_academica")
      .from("turma_disciplina")
      .insert({
        codigo: "TDI-999999",
        turma_id: turma?.id as string,
        disciplina_id: DISCIPLINA_NASCIMENTO,
      });
    expect(
      error?.code,
      "o perfil sem `disciplinas.editar` escreveu direto em turma_disciplina — o SECURITY DEFINER " +
        "não está fazendo o trabalho, a permissão é que ficou irrelevante",
    ).toBe("42501");
  });
});

describe("`FR-025` / `FR-024` · as permissões novas, cada uma com o seu negativo", () => {
  /*
   * ⚠️ TODA PERMISSÃO CONCEDIDA VEM COM O NEGATIVO DE UM PERFIL QUE NÃO A TEM, e a recusa é conferida
   * pelo CÓDIGO — `42501`, que é o que a RLS devolve (exigência de Bernardo Villas Boas, 17/09/2026).
   * Aceitar `error not null`, ou um `23502` de coluna obrigatória ausente, foi exatamente como seis
   * negativos do `SC-004` passaram pelo motivo errado nesta mesma fatia — e lá só o controle positivo
   * salvou. Por isso, aqui: **linha completa em toda tentativa** e **código conferido**.
   *
   * ⚠️ E CADA NEGATIVO TEM O SEU CONTROLE POSITIVO, com o MESMO payload. Sem ele, um negativo verde
   * pode estar provando apenas que a linha era inválida.
   */
  /*
   * ⚠️ PELA RPC, e não por `insert` solto: registrar vigência nova SOBRE uma ativa exige fechar a
   * anterior na mesma transação (R-19), e é isso que `registrar_vigencia_regime` faz. Um `insert`
   * direto bate na `EXCLUDE` `regime_sem_sobreposicao` com `23P01` — e o teste passaria a medir
   * sobreposição em vez de permissão, que é o que ele diz medir.
   */
  /*
   * ⚠️ E A DATA DE INÍCIO É CALCULADA A CADA EXECUÇÃO, porque a vigência registrada FICA: ela é
   * append-only, e `DELETE` é recusado inclusive para a `service_role`. Com data fixa, a segunda
   * execução sobrepõe a primeira e reprova com `23P01` — e `23P01` pareceria recusa de permissão
   * sem ser. Cada execução começa um ano depois da última que encontrou.
   */
  let vigenteDe = "2046-01-01";

  beforeAll(async () => {
    const { data } = await admin
      .from("curso_regime_historico")
      .select("vigente_de")
      .in("curso_id", [CURSO_DO_ESCOPO, CURSO_FORA_DO_ESCOPO])
      .order("vigente_de", { ascending: false })
      .limit(1);
    const maior = data?.[0]?.vigente_de ?? "2045-01-01";
    vigenteDe = `${Number(maior.slice(0, 4)) + 1}-01-01`;
  });

  const registrar = (sessao: Perfil, cursoId: string) =>
    cliente(sessao).rpc("registrar_vigencia_regime", {
      p_curso_id: cursoId,
      p_vigencia: {
        tipo_regime: "padrao",
        regime_tempos: 8,
        ta_duracao_min: 45,
        intervalo_manha_min: 10,
        intervalo_tarde_min: 10,
        hora_inicio_manha: "07:30",
        hora_inicio_tarde: "13:30",
        vigente_de: vigenteDe,
      },
    });

  // ------------------------------------------------------------------ `horarios.criar`
  it("NEGATIVO · quem tem só `horarios.ler` NÃO cria vigência de regime — 42501", async () => {
    const { error } = await registrar("encarregado_orientacao_pedagogica", CURSO_DO_ESCOPO);
    expect(error?.code, "o perfil sem `horarios.criar` registrou vigência").toBe("42501");
  });

  /*
   * ⚠️ O CONTROLE POSITIVO VAI NO OUTRO CURSO, e não é detalhe: duas vigências `padrao` ATIVAS do
   * mesmo curso se sobrepõem, e o `EXCLUDE` do Épico 1 as recusa — a segunda falharia por
   * sobreposição, e a mensagem falaria de exclusão, não de permissão. O controle usa o curso
   * REGULAR (o Encarregado tem alcance geral) e deixa o EXPEDITO livre para o Operador, no N-1b.
   */
  it("controle positivo · o Encarregado da Divisão cria a MESMA vigência, em outro curso", async () => {
    const { error } = await registrar("encarregado_administracao_academica", CURSO_FORA_DO_ESCOPO);
    expect(
      error,
      `o Encarregado da Divisão não registrou a vigência: ${error?.message}`,
    ).toBeNull();
  });

  /*
   * ⚠️ E ESTE É O CASO QUE DISCRIMINA A MUDANÇA DE POLICY, e sem ele os dois de cima passariam
   * ANTES e DEPOIS da migration 5 — provando que alguém é recusado, e não que a policy mudou de
   * recurso. O documento 01 §2.5 dá ao Operador `LCE` em `horarios` e apenas `L` em `cursos`: ele é
   * o único perfil que tem `horarios.criar` SEM ter `cursos.editar`. Logo, registrar vigência pelo
   * Operador é **recusado** enquanto a policy lê `cursos.editar` e **aceito** quando ela passa a ler
   * `horarios.criar` — é a única asserção desta suíte que muda de veredito com a migration, e é por
   * isso que ela existe.
   */
  it("N-1b · o Operador REGISTRA vigência no curso do escopo — ele tem `horarios`, não `cursos.editar`", async () => {
    const { error } = await registrar("operador", CURSO_DO_ESCOPO);
    expect(
      error,
      "o Operador não registrou vigência: a policy ainda lê `cursos.editar`, não `horarios.criar`",
    ).toBeNull();
  });

  it("N-2b · e NÃO registra vigência em curso fora do escopo — 42501", async () => {
    const { error } = await registrar("operador", CURSO_FORA_DO_ESCOPO);
    expect(
      error?.code,
      "o Operador registrou vigência fora do escopo — recurso novo, alcance perdido",
    ).toBe("42501");
  });

  /*
   * ⚠️ N-8 · O CURSO NÃO EXISTE SEM REGIME, E A RECUSA VEM NO `COMMIT`. Cada requisição do PostgREST
   * é uma transação, então o gatilho de restrição adiado dispara dentro dela e a recusa chega na
   * hora — com a chave `curso_sem_regime`, e não com um erro de transação pela metade.
   */
  it("N-8 · o Admin NÃO cria curso pela API sem vigência — `curso_sem_regime` no COMMIT", async () => {
    const { error } = await cliente("admin")
      .from("cursos")
      .insert({
        codigo: `5A-SEM-REGIME-${Date.now()}`,
        nome_curso: "Curso sem regime",
        classificacao: "regular",
        modalidade: "presencial",
        duracao_dias: 30,
      });
    expect(error?.hint ?? error?.message, "o curso entrou sem vigência padrão").toContain(
      "curso_sem_regime",
    );
  });

  it("N-8 · e pela RPC, com a vigência junto, é aceito", async () => {
    const { error } = await cliente("admin").rpc("criar_curso_com_regime", {
      p_curso: {
        codigo: `5A-COM-REGIME-${Date.now()}`,
        nome_curso: "Curso com regime",
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
    expect(error, `o Admin não criou curso pela RPC: ${error?.message}`).toBeNull();
  });

  // ------------------------------------------------------------------ `turmas.criar`
  it("NEGATIVO · quem tem só `turmas.ler` NÃO cria turma — 42501", async () => {
    const { error } = await cliente("encarregado_orientacao_pedagogica").from("turmas").insert({
      curso_id: CURSO_FORA_DO_ESCOPO,
      turma: "T8",
      ano_letivo: 2046,
      status: "planejada",
      modalidade: "presencial",
    });
    expect(error?.code, "o perfil sem `turmas.criar` criou turma").toBe("42501");
  });

  // ------------------------------------------------------------------ N-1: o Operador, dentro do escopo
  it("N-1 · o Operador CRIA turma no curso do seu escopo", async () => {
    const { data, error } = await cliente("operador")
      .from("turmas")
      .insert({
        curso_id: CURSO_DO_ESCOPO,
        turma: "T1",
        ano_letivo: 2046,
        status: "planejada",
        modalidade: "presencial",
      })
      .select("id, codigo")
      .single();
    expect(error, `o Operador não criou turma no escopo dele: ${error?.message}`).toBeNull();
    expect(data?.codigo).toBe("5A-EXP T1 2046");
  });

  it("N-1 · e MUDA o status dela — inclusive o status, diz a emenda do documento 01", async () => {
    const { data: turma } = await admin
      .from("turmas")
      .select("id")
      .eq("curso_id", CURSO_DO_ESCOPO)
      .limit(1)
      .single();
    const { error } = await cliente("operador")
      .from("turmas")
      .update({ status: "ativa" })
      .eq("id", turma?.id as string);
    expect(error, `o Operador não mudou o status da turma dele: ${error?.message}`).toBeNull();
  });

  // ------------------------------------------------------------------ N-2: fora do escopo
  it("N-2 · o MESMO Operador NÃO cria turma em curso fora do escopo — 42501", async () => {
    const { error } = await cliente("operador").from("turmas").insert({
      curso_id: CURSO_FORA_DO_ESCOPO,
      turma: "T7",
      ano_letivo: 2046,
      status: "planejada",
      modalidade: "presencial",
    });
    expect(error?.code, "o Operador criou turma fora do escopo").toBe("42501");
  });

  it("N-2 · e NÃO muda o status da turma alheia — a `UPDATE` negada some, e isso é medido", async () => {
    /*
     * ⚠️ `UPDATE` barrado pela RLS NÃO devolve erro: ele afeta ZERO linhas, porque a linha não é
     * visível. Exigir `42501` aqui seria exigir o que o Postgres não faz — e aceitar `error null`
     * como sucesso seria pior. Mede-se a CONTAGEM de linhas afetadas, e confere-se que o status
     * não mudou no banco.
     */
    const { data: afetadas } = await cliente("operador")
      .from("turmas")
      .update({ status: "cancelada" })
      .eq("id", TURMA_FORA_DO_ESCOPO)
      .select("id");
    expect(afetadas ?? [], "o Operador alcançou a turma alheia num UPDATE").toHaveLength(0);

    const { data: depois } = await admin
      .from("turmas")
      .select("status")
      .eq("id", TURMA_FORA_DO_ESCOPO)
      .single();
    expect(depois?.status, "o status da turma alheia mudou").toBe("planejada");
  });

  // ------------------------------------------------------------------ N-3: curso, nos dois lados
  it("N-3 · o Operador NÃO edita curso — nem dentro, nem fora do escopo", async () => {
    for (const [onde, cursoId] of [
      ["dentro do escopo", CURSO_DO_ESCOPO],
      ["fora do escopo", CURSO_FORA_DO_ESCOPO],
    ] as const) {
      const { data: afetadas } = await cliente("operador")
        .from("cursos")
        .update({ proposito: "editado pelo operador" })
        .eq("id", cursoId)
        .select("id");
      expect(afetadas ?? [], `o Operador editou o curso ${onde}`).toHaveLength(0);
    }

    const { data: depois } = await admin
      .from("cursos")
      .select("proposito")
      .eq("id", CURSO_DO_ESCOPO)
      .single();
    expect(depois?.proposito, "o curso do escopo foi editado pelo Operador").toBeNull();
  });
});

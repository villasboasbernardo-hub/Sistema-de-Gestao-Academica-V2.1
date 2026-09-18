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
  "admin" | "encarregado_administracao_academica" | "ajudante_administracao_academica" | "operador";

const sessoes = new Map<Perfil, SupabaseClient>();
const email = (p: Perfil) => `5a-${p}@ciaara.teste5a`;

/** As salas que esta suíte cria. Nomeadas para a limpeza alcançar todas, e só elas. */
const SALAS_DO_TESTE = ["Sala 5A Ajudante", "Sala 5A Admin", "Sala 5A Encarregado"];

/** O curso e a disciplina da prova do gatilho de nascimento (`FR-032.2`, R-6). */
const CURSO_NASCIMENTO = "5a000000-0000-0000-0000-00000000c001";
const DISCIPLINA_NASCIMENTO = "5a000000-0000-0000-0000-00000000d001";

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

  const { data: turmasDoTeste } = await admin
    .from("turmas")
    .select("id")
    .eq("curso_id", CURSO_NASCIMENTO);
  const idsDeTurma = (turmasDoTeste ?? []).map((t) => t.id);
  if (idsDeTurma.length > 0) {
    await admin.from("turma_disciplina").delete().in("turma_id", idsDeTurma);
    await admin.from("turmas").delete().in("id", idsDeTurma);
  }
  await admin.from("disciplinas").delete().eq("id", DISCIPLINA_NASCIMENTO);
  await admin.from("cursos").delete().eq("id", CURSO_NASCIMENTO);

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

  const { error: erroCurso } = await admin.from("cursos").insert({
    id: CURSO_NASCIMENTO,
    codigo: "5A-NASC",
    nome_curso: "Curso do nascimento das disciplinas",
    classificacao: "regular",
    modalidade: "presencial",
    duracao_dias: 30,
  });
  if (erroCurso) throw new Error(`fixture de curso falhou: ${erroCurso.message}`);

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

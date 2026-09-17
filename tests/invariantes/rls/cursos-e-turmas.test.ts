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

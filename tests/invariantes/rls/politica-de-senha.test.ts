/**
 * Invariante de plataforma — o mínimo de 12 caracteres é imposto pelo SUPABASE, não pelo
 * formulário (`FR-006` · documento 22 §4.5 · BRIEF §2).
 *
 * POR QUE ESTE ARQUIVO EXISTE. Até 09/09/2026 o 12 vivia só no navegador: os dois campos de
 * `app/(auth)/convite/FormularioDeSenha.tsx` traziam `minLength={12}` e `supabase/config.toml`
 * ficava no padrão do CLI, **6**. Era regra de negócio implementada apenas na UI — o que o
 * BRIEF §2 proíbe sem discussão — e o efeito era alcançável, não teórico: uma chamada direta a
 * `PUT /auth/v1/user`, sem passar pelo formulário, aceitava senha de seis caracteres.
 *
 * POR QUE ELE NÃO É pgTAP. A política de senha não mora no PostgreSQL: mora no GoTrue. Só a API
 * de autenticação sabe respondê-la, e por isso a prova tem de ser uma chamada de verdade.
 *
 * ⚠️ E ELE GUARDA UMA ARMADILHA MEDIDA. `supabase db reset` **não** recarrega a seção `[auth]`
 * do `config.toml` — o ambiente do contêiner de auth é montado no `supabase start`. Quem editar
 * `[auth]` e rodar só `pnpm db:reset` fica com o valor antigo em pé, enquanto o CI, que sobe o
 * stack do zero, fica com o novo. Este teste transforma essa divergência silenciosa em vermelho:
 * quando ele falhar, a resposta quase sempre é `pnpm db:stop && pnpm db:start`.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

/**
 * Domínio próprio, e não `@ciaara.teste`. A suíte de RLS apaga **todos** os usuários daquele
 * domínio no `limpar()` dela; se os dois arquivos rodassem juntos, um derrubaria a conta do
 * outro no meio da execução.
 */
const EMAIL = "prova-politica-senha@politica-senha.teste";

/** Senha longa o bastante para qualquer mínimo plausível — é só o ponto de partida. */
const SENHA_INICIAL = "senha-de-partida-bem-longa";
const SENHA_CURTA = "onze-caract"; // 11
const SENHA_MINIMA = "doze-caracte"; // 12

/** Cliente de privilégio elevado — só para MONTAR o cenário. Nunca para asserção. */
const admin = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let sessao: SupabaseClient;

async function apagarConta(): Promise<void> {
  const { data } = await admin.auth.admin.listUsers();
  for (const u of data?.users ?? []) {
    if (u.email === EMAIL) await admin.auth.admin.deleteUser(u.id);
  }
}

beforeAll(async () => {
  await apagarConta();

  // ⚠️ A conta nasce SEM linha em `public.usuarios`, e é de propósito: este arquivo mede o
  // GoTrue, não a RLS. Sem linha, `app.usuario_atual()` devolve NULL e a conta não alcança dado
  // nenhum — exatamente o que o teste T-09 da suíte de RLS prova.
  const { error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: SENHA_INICIAL,
    email_confirm: true,
  });
  if (error) throw new Error(`falha ao criar a conta de prova: ${error.message}`);

  sessao = createClient(URL_SUPABASE, CHAVE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: erroLogin } = await sessao.auth.signInWithPassword({
    email: EMAIL,
    password: SENHA_INICIAL,
  });
  if (erroLogin) throw new Error(`falha ao autenticar a conta de prova: ${erroLogin.message}`);
}, 60_000);

afterAll(apagarConta);

describe("FR-006 · o mínimo de 12 caracteres é da plataforma, não do formulário", () => {
  it("recusa senha de 11 caracteres pelo caminho que a tela de convite usa", async () => {
    // `updateUser` é literalmente o que `FormularioDeSenha.tsx` chama ao definir a senha do
    // convite. Provar aqui é provar no caminho de produção, não num atalho.
    const { error } = await sessao.auth.updateUser({ password: SENHA_CURTA });

    expect(error, "senha de 11 caracteres foi ACEITA — o mínimo não está valendo").not.toBeNull();
    expect(error?.code).toBe("weak_password");
    // ⚠️ E o NÚMERO, não só a fraqueza. Com o `config.toml` no padrão do CLI a mensagem diria
    // "at least 6" e a asserção acima passaria assim mesmo — provando a política errada.
    expect(error?.message).toContain("12");
  });

  it("aceita senha de exatamente 12 caracteres", async () => {
    // O controle positivo importa: sem ele, uma API fora do ar faria o teste acima passar pelo
    // motivo errado — tudo é recusado quando nada responde.
    const { error } = await sessao.auth.updateUser({ password: SENHA_MINIMA });

    expect(error).toBeNull();
  });
});

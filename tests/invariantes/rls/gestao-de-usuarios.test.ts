/**
 * `FR-038`, `FR-047` e `FR-050` · o que o Admin faz sobre outra conta, e o que o Operador **não**
 * faz — provado pelo **banco**, com sessão autenticada de verdade.
 *
 * ⚠️ **ISTO NÃO PODE MORAR EM pgTAP**, e a razão é o DoD 4: o pgTAP roda como **dono do schema**, e
 * sob privilégio de dono a RLS **não se aplica** — uma asserção de *"o Operador não lê a trilha"*
 * escrita ali passaria com a RLS **desligada**, que é o defeito que a suíte existe para impedir.
 *
 * ⚠️ **O OPERADOR É O CASO QUE DISCRIMINA, e a escolha dele é medida na matriz.** Ele tem
 * `usuarios.ler` — enxerga a própria linha — e **não** tem `eh_admin` nem `auditoria.ler`. Um perfil
 * sem nada (`visualizacao`) daria o mesmo veredito **antes e depois** desta fatia: ele já não podia
 * nada. Só um perfil que tem *parte* das condições observa a fronteira que o PR 2 desenha.
 *
 * ⚠️ **A RECUSA É CONFERIDA PELO CÓDIGO, NUNCA POR "deu erro"** — `42501` vindo da RLS. Aceitar
 * `error not null` é o modo de falha já medido nesta base: seis negativos do `SC-004` passavam pelo
 * motivo errado, e só o **controle positivo** os pegou. Toda asserção negativa aqui manda a linha
 * inteira e confere o código.
 *
 * ⚠️ **NENHUMA CONTA AQUI É `admin` SEM SER NECESSÁRIO — mas UMA É, e isso tem custo.** A fatia
 * inteira trata do que o Admin faz; sem um Admin não há o que provar. ⚠️ **O risco é o gotcha 8**:
 * um Admin a mais na base faz `app.impedir_remocao_do_ultimo_admin()` deixar de recusar em
 * `rls.test.ts`, e 12 asserções de lá caem em cascata. Os arquivos de RLS rodam **em série**
 * (`--no-file-parallelism`), então não há corrida; o perigo real é a execução **interrompida** antes
 * do `afterAll`. Por isso a limpeza roda **antes e depois**, e por domínio próprio.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

/** Domínio próprio — `rls.test.ts` apaga **todas** as contas de `@ciaara.teste` na limpeza dela. */
const DOMINIO = "gestao-de-usuarios.teste";
const SENHA = "senha-de-teste-com-12+";

/** Cliente de privilégio elevado — só para MONTAR e LIMPAR. Nunca para asserção. */
const servico = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Papel = "chefe" | "operador" | "alvo";

/**
 * ⚠️ O perfil de cada papel é **escolha medida na matriz**, não conveniência:
 * · `chefe` → `admin`, o único que pode as três ações desta fatia;
 * · `operador` → tem `usuarios.ler` e **não** tem `eh_admin` nem `auditoria.ler` — o discriminante;
 * · `alvo` → `visualizacao`, a conta sobre a qual se age.
 */
const PERFIL_DO_PAPEL: Record<Papel, string> = {
  chefe: "admin",
  operador: "operador",
  alvo: "visualizacao",
};

const idDeAuth = new Map<Papel, string>();
const idDeUsuario = new Map<Papel, string>();
const sessoes = new Map<Papel, SupabaseClient>();

const email = (papel: Papel) => `gestao-${papel}@${DOMINIO}`;
const sessao = (papel: Papel) => sessoes.get(papel)!;

function novoCliente(): SupabaseClient {
  return createClient(URL_SUPABASE, CHAVE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function autenticar(papel: Papel): Promise<SupabaseClient> {
  const cliente = novoCliente();
  const { error } = await cliente.auth.signInWithPassword({
    email: email(papel),
    password: SENHA,
  });
  if (error) throw new Error(`falha ao autenticar ${papel}: ${error.message}`);
  return cliente;
}

async function limpar(): Promise<void> {
  const { data } = await servico.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) {
    if (!u.email?.endsWith(`@${DOMINIO}`)) continue;
    const { data: linha } = await servico
      .from("usuarios")
      .select("id")
      .eq("auth_user_id", u.id)
      .maybeSingle();
    if (linha) {
      // ⚠️ A trilha NÃO sai: ela é imutável, inclusive para a `service_role` — é o que o pgTAP 114
      //    prova. Deixar linha de trilha para trás é o comportamento pretendido; o que a limpeza
      //    tira é a CONTA, e o rastro sobrevive a ela de propósito (`conta_alvo_id` não é FK).
      await servico.from("usuarios").delete().eq("id", linha.id);
    }
    await servico.auth.admin.deleteUser(u.id);
  }
}

beforeAll(async () => {
  await limpar();

  for (const papel of Object.keys(PERFIL_DO_PAPEL) as Papel[]) {
    const { data, error } = await servico.auth.admin.createUser({
      email: email(papel),
      password: SENHA,
      email_confirm: true,
    });
    if (error) throw new Error(`falha ao criar a conta ${papel}: ${error.message}`);
    idDeAuth.set(papel, data.user.id);

    const { data: criada, error: erroCadastro } = await servico
      .from("usuarios")
      .insert({
        codigo: `USR-GST-${papel.toUpperCase()}`,
        auth_user_id: data.user.id,
        email: email(papel),
        nome: `Prova Gestao ${papel}`,
        perfil: PERFIL_DO_PAPEL[papel],
        escopo_curso: "geral",
      })
      .select("id")
      .single();
    if (erroCadastro) throw new Error(`falha ao cadastrar ${papel}: ${erroCadastro.message}`);
    idDeUsuario.set(papel, criada.id);

    sessoes.set(papel, await autenticar(papel));
  }
}, 180_000);

afterAll(limpar);

describe("`FR-050` · a trilha de auditoria: quem grava e quem lê", () => {
  it("⚠️ O CASO QUE DISCRIMINA · o Operador NÃO grava na trilha, e a recusa é `42501`", async () => {
    const { error } = await sessao("operador").rpc(
      "registrar_acao_em_conta" as never,
      {
        p_conta_alvo_id: idDeUsuario.get("alvo"),
        p_acao: "desativar",
        p_conta_alvo_codigo: null,
      } as never,
    );

    expect(error, "o Operador conseguiu gravar na trilha").not.toBeNull();
    // ⚠️ O CÓDIGO, não a presença do erro: um `23502` de coluna faltando passaria por "recusou".
    expect(error?.code, JSON.stringify(error)).toBe("42501");
    expect(error?.hint ?? "").toContain("auditoria_sem_permissao");
  });

  it("controle positivo · o Admin grava, e a linha aparece", async () => {
    const { error } = await sessao("chefe").rpc(
      "registrar_acao_em_conta" as never,
      {
        p_conta_alvo_id: idDeUsuario.get("alvo"),
        p_acao: "editar_nome",
        p_conta_alvo_codigo: null,
      } as never,
    );
    expect(error, JSON.stringify(error)).toBeNull();

    const { data } = await sessao("chefe").rpc(
      "rastro_da_conta" as never,
      {
        p_conta_alvo_id: idDeUsuario.get("alvo"),
      } as never,
    );
    const linhas = (data ?? []) as readonly { acao: string; autor_nome: string }[];
    expect(linhas.map((l) => l.acao)).toContain("editar_nome");
    // O rastro traz o NOME de quem fez, não o uuid — é o que o torna legível.
    expect(linhas[0]?.autor_nome).toBe("Prova Gestao chefe");
  });

  it("⚠️ O CASO QUE DISCRIMINA da leitura · o Operador não LÊ a trilha — e recebe VAZIO, não erro", async () => {
    // ⚠️ Gotcha 4: a RLS nega em silêncio. A função é `security invoker` de propósito, então quem
    //    não tem `auditoria.ler` recebe lista vazia — e é por isso que a asserção mede o TAMANHO,
    //    não a ausência de erro. Medir só `error` daria verde com a policy aberta.
    const { data, error } = await sessao("operador").rpc(
      "rastro_da_conta" as never,
      {
        p_conta_alvo_id: idDeUsuario.get("alvo"),
      } as never,
    );
    expect(error, JSON.stringify(error)).toBeNull();
    expect((data ?? []) as readonly unknown[]).toHaveLength(0);
  });

  it("nem o Admin reescreve a trilha — `42501`, e a tabela não tem policy de escrita", async () => {
    const { error } = await sessao("chefe")
      .from("auditoria_de_conta")
      .insert({
        autor_id: idDeAuth.get("chefe")!,
        acao: "excluir",
        conta_alvo_id: idDeUsuario.get("alvo")!,
        conta_alvo_codigo: "USR-FALSO",
      } as never);
    expect(error, "o Admin escreveu direto na trilha, por fora da função").not.toBeNull();
    expect(error?.code, JSON.stringify(error)).toBe("42501");
  });
});

describe("`FR-050` · o Operador não edita outra conta", () => {
  it("⚠️ O CASO QUE DISCRIMINA · ele tem `usuarios.ler` e NÃO escreve na linha de outro", async () => {
    const { data, error } = await sessao("operador")
      .from("usuarios")
      .update({ nome_exibicao: "invadido" })
      .eq("id", idDeUsuario.get("alvo")!)
      .select("id");

    // ⚠️ A RLS de UPDATE nega **em silêncio**: nenhuma linha casa a policy, então o retorno é
    //    sucesso com lista VAZIA — não erro. É o gotcha 4, e medir só `error` daria verde com a
    //    policy escancarada. O que prova é a contagem, confirmada pelo valor no banco.
    expect(error, JSON.stringify(error)).toBeNull();
    expect((data ?? []).length, "o Operador alterou a linha de outra conta").toBe(0);

    const { data: depois } = await servico
      .from("usuarios")
      .select("nome_exibicao")
      .eq("id", idDeUsuario.get("alvo")!)
      .single();
    expect(depois?.nome_exibicao ?? null).not.toBe("invadido");
  });

  it("controle positivo · o Admin edita, e o valor muda de verdade", async () => {
    const { data, error } = await sessao("chefe")
      .from("usuarios")
      .update({ nome_exibicao: "Nome Pelo Admin" })
      .eq("id", idDeUsuario.get("alvo")!)
      .select("id");
    expect(error, JSON.stringify(error)).toBeNull();
    expect(
      (data ?? []).length,
      "o Admin não conseguiu editar — a policy está apertada demais",
    ).toBe(1);
  });
});

describe("`FR-038` · redefinir a senha derruba TODAS as sessões abertas (decisão D-4)", () => {
  it("⚠️ DUAS sessões abertas antes, e as DUAS renovações recusadas depois", async () => {
    // Duas sessões independentes da MESMA conta — dois dispositivos, no mundo real.
    const primeira = await autenticar("alvo");
    const segunda = await autenticar("alvo");

    const antes = await Promise.all([primeira.auth.getSession(), segunda.auth.getSession()]);
    for (const s of antes) expect(s.data.session?.refresh_token).toBeTruthy();

    const { error } = await servico.auth.admin.updateUserById(idDeAuth.get("alvo")!, {
      password: "outra-senha-de-teste-12+",
    });
    expect(error, JSON.stringify(error)).toBeNull();

    /*
     * ⚠️ **MEDE A RENOVAÇÃO, NUNCA A LEITURA.** O token de acesso é JWT e vale até expirar **sem
     *    consultar nada** — uma consulta logo depois da redefinição passaria com a revogação
     *    funcionando perfeitamente, e o teste diria que as sessões continuam de pé. O que a
     *    revogação derruba é o **refresh token**, e é por ele que se pergunta.
     */
    const renovacoes = await Promise.all([
      primeira.auth.refreshSession(),
      segunda.auth.refreshSession(),
    ]);

    for (const [indice, r] of renovacoes.entries()) {
      expect(r.error, `a sessão ${indice + 1} renovou depois da redefinição`).not.toBeNull();
      expect(r.data.session).toBeNull();
    }
  }, 60_000);

  it("⚠️ NADA A IMPLEMENTAR AQUI — a plataforma já revoga, e este é o controle de que continua", async () => {
    // ⚠️ Medido em 29/09/2026 (achado R-1): `admin.updateUserById(id, { password })` leva os
    //    refresh tokens da conta de 2 a 0. A etapa de revogação que o plano previa NÃO EXISTE, e
    //    revogar por SQL não funciona nem com a `service_role`, que não tem o privilégio. O que
    //    existe é esta prova — se a plataforma mudar de comportamento, ela reprova aqui, e não no
    //    dia em que alguém perceber que uma sessão antiga continuou aberta.
    const cliente = await autenticar("chefe");
    const { data: antes } = await cliente.auth.getSession();
    expect(antes.session?.refresh_token).toBeTruthy();

    await servico.auth.admin.updateUserById(idDeAuth.get("chefe")!, {
      password: "mais-uma-senha-de-teste-12+",
    });

    const { error } = await cliente.auth.refreshSession();
    expect(
      error,
      "a sessão do próprio Admin sobreviveu à redefinição da senha dele",
    ).not.toBeNull();
  }, 60_000);
});

/**
 * `FR-046` · a **exclusão permanente** de conta é só do Admin — provada com **sessão real**.
 *
 * ⚠️ **ESTE ARQUIVO É O ÚNICO LUGAR ONDE ISSO SE PROVA, e o pgTAP 115 não substitui.** Ele roda como
 * **dono do schema** e, sobretudo, **sem sessão**: ali `app.eh_admin()` devolve `NULL`, e o que o 115
 * prova é que o porteiro recusa **quem não tem sessão** — foi assim que o gotcha 15 apareceu. O que
 * falta e mora aqui é a outra metade: **quem TEM sessão e não é Admin também é recusado.**
 *
 * ⚠️ **O OPERADOR É O DISCRIMINANTE pelo mesmo motivo do resto do arquivo:** ele tem `usuarios.ler` e
 * `execute` na função — `authenticated` recebe o `grant` —, então chega **até dentro** do porteiro. Um
 * perfil sem nada seria barrado antes, pelo privilégio, e a asserção passaria **sem exercitar a regra**.
 */
describe("`FR-046` · excluir conta é só do Admin", () => {
  it("⚠️ O CASO QUE DISCRIMINA · o Operador chega à função e é recusado com `42501`", async () => {
    const alvo = idDeUsuario.get("alvo")!;

    const { error } = await sessao("operador").rpc("excluir_conta", { p_conta_id: alvo });

    expect(error, "o Operador excluiu uma conta").not.toBeNull();
    // ⚠️ **O CÓDIGO E O `hint`, nunca "deu erro":** sem conferir o `hint`, um `42501` de *privilégio
    //    ausente na função* passaria por prova de autorização — e seria o oposto, porque significaria
    //    que a sessão nem alcançou o porteiro que se quer medir.
    expect(error!.code, JSON.stringify(error)).toBe("42501");
    expect(error!.hint).toBe("conta_sem_permissao");

    // E a conta continua **viva**: a recusa não deixou meio caminho feito.
    const { data: ainda } = await servico
      .from("usuarios")
      .select("id, excluida_em")
      .eq("id", alvo)
      .maybeSingle();
    expect(ainda?.excluida_em ?? null, "a conta foi marcada como excluída pela recusa").toBeNull();
  }, 60_000);

  it("controle positivo · o Admin exclui, e a conta sai da lista de vivas", async () => {
    const alvo = idDeUsuario.get("alvo")!;

    const { data: caminho, error } = await sessao("chefe").rpc("excluir_conta", {
      p_conta_id: alvo,
    });

    expect(error, JSON.stringify(error)).toBeNull();
    // ⚠️ **São dois caminhos legítimos, e qual deles vale depende do HISTÓRICO da conta** — por isso a
    //    asserção é sobre o resultado comum aos dois: ela **deixa de estar viva**. Fixar `apagada`
    //    aqui amarraria o teste a um detalhe do histórico que outra asserção pode mudar.
    expect(["apagada", "anonimizada"]).toContain(caminho);

    const { data: viva } = await servico
      .from("usuarios")
      .select("id")
      .eq("id", alvo)
      .is("excluida_em", null)
      .maybeSingle();
    expect(viva, "a conta continuou viva depois da exclusão pelo Admin").toBeNull();
  }, 60_000);
});

/**
 * `FR-050` · **o porteiro da trilha e a CONTA DESATIVADA** — o gotcha 15 no único lugar onde ele
 * ainda estava vivo, achado em 03/10/2026 ao plantar o defeito deliberado do caso acima.
 *
 * ⚠️ **O ATOR NÃO É HIPOTÉTICO: é a conta que o próprio Admin acabou de desativar.** Desativar não
 * toca a credencial — é de propósito, o cadastro fica —, então ela continua **autenticando**. E
 * `app.perfil_atual()` filtra `status = 'ativo'`: para ela devolve **NULL**, logo
 * `app.eh_admin()` devolve **NULL**, e um porteiro escrito `if not app.eh_admin() then raise` **não
 * entra no `if`** (gotcha 15). O mesmo vale para credencial órfã — a que a exclusão deixa se o passo 2
 * falhar.
 *
 * ⚠️ **O QUE ISSO CUSTARIA: linha FORJADA numa tabela que ninguém apaga.** A trilha é só de acréscimo
 * e imutável **inclusive para a `service_role`** — então um registro falso ali é permanente, e a
 * primeira coisa que alguém faz ao investigar uma conta é ler a trilha dela.
 *
 * ⚠️ **E `anon` NÃO alcança a função** (`revoke all … from public, anon`, medido no catálogo:
 * `{postgres=X,authenticated=X,service_role=X}`): quem chega é **sessão autenticada**, e por isso este
 * caso só existe aqui, com sessão de verdade.
 */
describe("`FR-050` · a conta DESATIVADA não grava na trilha", () => {
  const emailDesativada = `gestao-desativada@${DOMINIO}`;

  it("⚠️ O CASO QUE DISCRIMINA · credencial válida sem cadastro ATIVO é recusada com `42501`", async () => {
    const { data: criada, error: erroAuth } = await servico.auth.admin.createUser({
      email: emailDesativada,
      password: SENHA,
      email_confirm: true,
    });
    if (erroAuth) throw new Error(`falha ao criar a credencial: ${erroAuth.message}`);

    const { data: linha, error: erroLinha } = await servico
      .from("usuarios")
      .insert({
        codigo: "USR-GST-DESATIVADA",
        auth_user_id: criada.user.id,
        email: emailDesativada,
        nome: "Prova Gestao desativada",
        perfil: "admin",
        escopo_curso: "geral",
        status: "inativo",
      })
      .select("id")
      .single();
    if (erroLinha) throw new Error(`falha ao cadastrar: ${erroLinha.message}`);

    /*
     * ⚠️ **O PERFIL DELA É `admin` DE PROPÓSITO, e é isso que faz o caso discriminar.** Se ela fosse
     *    `operador`, a recusa poderia vir de *"não é Admin"* e nada se saberia sobre o NULL. Sendo
     *    `admin` **desativada**, o único motivo possível para passar é o porteiro ter falhado ABERTO.
     */
    const cliente = novoCliente();
    const { error: erroEntrada } = await cliente.auth.signInWithPassword({
      email: emailDesativada,
      password: SENHA,
    });
    expect(
      erroEntrada,
      "a conta desativada não conseguiu nem autenticar — o caso perde o sentido",
    ).toBeNull();

    const { error } = await cliente.rpc("registrar_acao_em_conta", {
      p_conta_alvo_id: idDeUsuario.get("chefe")!,
      p_acao: "excluir",
      p_conta_alvo_codigo: "USR-FORJADA",
    });

    expect(error, "a conta DESATIVADA gravou na trilha imutável").not.toBeNull();
    expect(error!.code, JSON.stringify(error)).toBe("42501");
    expect(error!.hint).toBe("auditoria_sem_permissao");

    // E nada entrou: a recusa é antes da escrita, não um `rollback` depois dela.
    const { data: forjadas } = await servico
      .from("auditoria_de_conta")
      .select("id")
      .eq("conta_alvo_codigo", "USR-FORJADA");
    expect(forjadas ?? [], "ficou linha forjada na trilha").toHaveLength(0);

    await servico.from("usuarios").delete().eq("id", linha.id);
    await servico.auth.admin.deleteUser(criada.user.id);
  }, 60_000);
});

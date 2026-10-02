/**
 * Invariante de permissão do avatar — quem escreve, quem lê e **o que o motor recusa**
 * (`FR-013`, `FR-015`, `SC-009` da spec 011).
 *
 * POR QUE ESTE ARQUIVO NÃO É pgTAP. O pgTAP roda como **dono do schema**, e sob privilégio de
 * dono a RLS não se aplica: uma asserção de *"o dono escreve e o outro não"* escrita lá passaria
 * com a RLS **desligada**, que é o defeito que a suíte existe para impedir (DoD 4). Aqui cada
 * conta recebe um **JWT de verdade** e fala com o Storage pela interface real.
 *
 * ⚠️ **E A RECUSA DO STORAGE NÃO É `42501`.** O Storage não é PostgREST: ele responde por HTTP, e
 * o que chega é um `StorageApiError` com `statusCode` em **texto**. Medido em 29/09/2026 contra o
 * stack local, e é por isso que cada negativa abaixo confere o **código** e a **mensagem**, nunca
 * `error != null`:
 *
 * | Tentativa                    | `statusCode` | mensagem                                       |
 * |------------------------------|--------------|------------------------------------------------|
 * | escrever no caminho de outra | `403`        | `new row violates row-level security policy`   |
 * | enviar `image/gif`           | `415`        | `mime type image/gif is not supported`         |
 * | enviar 3 MB                  | `413`        | `The object exceeded the maximum allowed size` |
 *
 * ⚠️ **O CASO QUE DISCRIMINA são as duas últimas, e o que ele discrimina é ONDE a regra mora.** A
 * conferência de tipo e de tamanho existe também no TypeScript da tela, e um teste que passasse
 * pela tela daria o mesmo verde com a regra vivendo **só lá** — que foi exatamente o defeito do
 * Épico 3, em que o mínimo de senha existia só no formulário e caía por chamada direta. Estas duas
 * asserções chamam o Storage **sem passar por tela nenhuma**: se alguém apagar a conferência do
 * código, elas continuam verdes; se alguém afrouxar o **bucket**, elas ficam vermelhas. É a única
 * formulação em que o veredito muda quando a garantia muda.
 *
 * ⚠️ **NENHUMA CONTA AQUI É `admin`**, e não é descuido: a leitora usa
 * `encarregado_administracao_academica`, que tem `usuarios.ler` **sem** ser Admin. Um Admin a mais
 * na base faz `app.impedir_remocao_do_ultimo_admin()` parar de recusar em `rls.test.ts`, e 12
 * asserções de lá caem em cascata — é o **gotcha 8** do `CLAUDE.md`. Os arquivos de RLS rodam em
 * série (`--no-file-parallelism`), então não há corrida; o risco real é a execução **interrompida**
 * antes do `afterAll`, que deixaria o Admin de pé para a próxima suíte.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { chaveLocal } from "./chaves-locais";

const URL_SUPABASE = chaveLocal("API_URL", "SUPABASE_URL_TESTE");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE");

/**
 * Domínio próprio. ⚠️ `rls.test.ts` apaga **todas** as contas de `@ciaara.teste` na limpeza dela;
 * com o mesmo domínio, uma suíte derrubaria a conta da outra.
 */
const DOMINIO = "avatar-no-storage.teste";
const SENHA = "senha-de-teste-com-12+";
const BALDE = "avatares";

/** Cliente de privilégio elevado — só para MONTAR e LIMPAR. Nunca para asserção. */
const admin = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Um PNG de verdade, mínimo: a assinatura do formato. O conteúdo não importa; o tipo, sim. */
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");

type Papel = "dona" | "outra" | "leitora";

/** ⚠️ O perfil de cada papel é escolha medida na matriz, não conveniência — ver o cabeçalho. */
const PERFIL_DO_PAPEL: Record<Papel, string> = {
  dona: "operador",
  outra: "operador",
  leitora: "encarregado_administracao_academica",
};

const idDeAuth = new Map<Papel, string>();
const sessoes = new Map<Papel, SupabaseClient>();

const email = (papel: Papel) => `avatar-${papel}@${DOMINIO}`;
const caminhoDe = (papel: Papel) => `${idDeAuth.get(papel)}/avatar`;
const sessao = (papel: Papel) => sessoes.get(papel)!;
const codigoDe = (erro: unknown) => (erro as { statusCode?: string } | null)?.statusCode;

async function limpar(): Promise<void> {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) {
    if (!u.email?.endsWith(`@${DOMINIO}`)) continue;
    // ⚠️ O arquivo sai pela chave de serviço, que ignora a RLS. Pela sessão da dona ele NÃO sairia
    //    — não há policy de DELETE, e é justamente o que a última asserção deste arquivo prova.
    const { data: objetos } = await admin.storage.from(BALDE).list(u.id);
    if (objetos?.length) {
      await admin.storage.from(BALDE).remove(objetos.map((o) => `${u.id}/${o.name}`));
    }
    await admin.from("usuarios").delete().eq("auth_user_id", u.id);
    await admin.auth.admin.deleteUser(u.id);
  }
}

beforeAll(async () => {
  // Roda ANTES e DEPOIS: execução interrompida no meio não pode inviabilizar a seguinte.
  await limpar();

  for (const papel of Object.keys(PERFIL_DO_PAPEL) as Papel[]) {
    const { data, error } = await admin.auth.admin.createUser({
      email: email(papel),
      password: SENHA,
      email_confirm: true,
    });
    if (error) throw new Error(`falha ao criar a conta ${papel}: ${error.message}`);
    idDeAuth.set(papel, data.user.id);

    const { error: erroCadastro } = await admin.from("usuarios").insert({
      codigo: `USR-AVT-${papel.toUpperCase()}`,
      auth_user_id: data.user.id,
      email: email(papel),
      nome: `Prova Avatar ${papel}`,
      perfil: PERFIL_DO_PAPEL[papel],
      escopo_curso: "geral",
    });
    if (erroCadastro) throw new Error(`falha ao cadastrar ${papel}: ${erroCadastro.message}`);

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
}, 120_000);

afterAll(limpar);

describe("`FR-013` · o caminho carrega o dono, e é ele quem decide a escrita", () => {
  it("a dona envia no PRÓPRIO caminho e consegue — controle positivo", async () => {
    const { error } = await sessao("dona")
      .storage.from(BALDE)
      .upload(caminhoDe("dona"), PNG, { contentType: "image/png", upsert: true });
    expect(error, `a dona não conseguiu enviar a própria foto: ${error?.message}`).toBeNull();
  });

  it("⚠️ a dona tenta enviar no caminho de OUTRA conta e é recusada pela RLS, com `403`", async () => {
    const { error } = await sessao("dona")
      .storage.from(BALDE)
      .upload(caminhoDe("outra"), PNG, { contentType: "image/png", upsert: true });

    expect(
      error,
      "escrever na pasta de outra pessoa passou — a policy não está comparando a primeira pasta",
    ).not.toBeNull();
    // ⚠️ Confere o CÓDIGO, não só a existência do erro: um `409` de arquivo já existente também
    //    seria "erro", e aceitá-lo faria a asserção passar pelo motivo errado.
    expect(codigoDe(error)).toBe("403");
    expect(error?.message).toContain("row-level security");
  });

  it("⚠️ nem a leitora, que pode LER o cadastro, escreve a foto de outra pessoa", async () => {
    const { error } = await sessao("leitora")
      .storage.from(BALDE)
      .upload(caminhoDe("dona"), PNG, { contentType: "image/png", upsert: true });
    expect(codigoDe(error)).toBe("403");
  });
});

describe("`FR-015` · quem lê a foto é quem já lê o cadastro", () => {
  it("a dona lê a própria foto", async () => {
    const { error } = await sessao("dona").storage.from(BALDE).download(caminhoDe("dona"));
    expect(error).toBeNull();
  });

  it("quem tem `usuarios.ler` lê a foto alheia — a foto não é mais fechada que o cadastro", async () => {
    const { error } = await sessao("leitora").storage.from(BALDE).download(caminhoDe("dona"));
    expect(error, `a leitora não alcançou a foto: ${error?.message}`).toBeNull();
  });

  it("⚠️ quem NÃO tem `usuarios.ler` não lê — e o caso que discrimina é este, não o positivo", async () => {
    // `operador` não tem `usuarios.ler` na matriz (medido em 29/09/2026). Se a segunda metade da
    // policy de leitura fosse `true` em vez de `app.pode('usuarios','ler')`, as duas asserções
    // acima continuariam verdes e só esta viraria.
    const { error } = await sessao("outra").storage.from(BALDE).download(caminhoDe("dona"));
    expect(error, "quem não pode ler o cadastro alcançou a foto").not.toBeNull();
  });
});

describe("⚠️ O CASO QUE DISCRIMINA · o limite e o tipo são do MOTOR, não do código", () => {
  it("`image/gif` é recusado pelo BUCKET, com `415`, sem passar por tela nenhuma", async () => {
    const { error } = await sessao("dona")
      .storage.from(BALDE)
      .upload(`${idDeAuth.get("dona")}/nao.gif`, Buffer.from("GIF89a"), {
        contentType: "image/gif",
        upsert: true,
      });

    expect(error, "o bucket aceitou GIF — `allowed_mime_types` não está valendo").not.toBeNull();
    expect(codigoDe(error)).toBe("415");
    expect(error?.message).toContain("mime type");
  });

  it("3 MB é recusado pelo BUCKET, com `413` — o teto de 2 MB vive em `file_size_limit`", async () => {
    const { error } = await sessao("dona")
      .storage.from(BALDE)
      .upload(`${idDeAuth.get("dona")}/grande`, Buffer.alloc(3 * 1024 * 1024), {
        contentType: "image/png",
        upsert: true,
      });

    expect(error, "o bucket aceitou 3 MB — `file_size_limit` não está valendo").not.toBeNull();
    expect(codigoDe(error)).toBe("413");
  });

  it("e 2 MB exatos passam — o controle positivo, sem o qual o teto podia ser ZERO", async () => {
    const { error } = await sessao("dona")
      .storage.from(BALDE)
      .upload(`${idDeAuth.get("dona")}/no-limite`, Buffer.alloc(2 * 1024 * 1024), {
        contentType: "image/png",
        upsert: true,
      });
    expect(error, `2 MB deveria caber no teto de 2 MB: ${error?.message}`).toBeNull();
  });
});

describe("regra 4 · não há policy de DELETE, e a recusa é SILENCIOSA", () => {
  it("⚠️ `remove()` devolve SUCESSO com lista VAZIA, e o arquivo continua lá", async () => {
    // ⚠️ **ESTA É A ASSERÇÃO MAIS IMPORTANTE DO ARQUIVO PARA QUEM FOR ESCREVER A TELA.** Medido em
    //    29/09/2026: sem policy de DELETE, o Storage **não devolve erro** — devolve `error: null` e
    //    uma lista VAZIA de removidos. É o gotcha 4 na forma dele: em vez de negar com estrondo,
    //    nega em silêncio. Código que faça `if (!error) avisar("foto removida")` mente.
    //
    //    Por isso `removerFoto` limpa `usuarios.avatar_caminho` e **não** chama `remove()`: a foto
    //    some da tela porque a coluna ficou nula, não porque o arquivo saiu.
    const dona = idDeAuth.get("dona")!;
    const antes = await admin.storage.from(BALDE).list(dona);
    expect(antes.data?.some((o) => o.name === "avatar")).toBe(true);

    const { data, error } = await sessao("dona")
      .storage.from(BALDE)
      .remove([caminhoDe("dona")]);

    expect(error, "apareceu erro onde a medição mostrou silêncio — releia o cabeçalho").toBeNull();
    expect(data, "a lista de removidos veio com conteúdo: nasceu uma policy de DELETE?").toEqual(
      [],
    );

    const depois = await admin.storage.from(BALDE).list(dona);
    expect(
      depois.data?.some((o) => o.name === "avatar"),
      "o arquivo saiu — alguém acrescentou policy de DELETE, que a regra 4 proíbe",
    ).toBe(true);
  });

  it("⚠️ e o lixo é LIMITADO A UM arquivo: o envio seguinte grava no MESMO caminho", async () => {
    // É o que sustenta a frase da migration de que não há crescimento por uso. Sem esta asserção,
    // "um arquivo por conta" seria promessa; com ela, é propriedade medida.
    const maior = Buffer.concat([PNG, Buffer.alloc(64)]);
    const { error } = await sessao("dona")
      .storage.from(BALDE)
      .upload(caminhoDe("dona"), maior, { contentType: "image/png", upsert: true });
    expect(error).toBeNull();

    const { data } = await admin.storage.from(BALDE).list(idDeAuth.get("dona")!);
    const avatares = data?.filter((o) => o.name === "avatar") ?? [];
    expect(avatares.length, "o segundo envio criou um arquivo novo em vez de substituir").toBe(1);
    expect(avatares[0]?.metadata?.size).toBe(maior.byteLength);
  });
});

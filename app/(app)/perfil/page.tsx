/**
 * **Meu perfil** — o próprio cadastro (`FR-020` a `FR-023`, `US2`).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Os dois formulários é que são folhas.
 *
 * ⚠️ **ELA É ALCANÇADA POR CLIQUE, pelo menu do avatar** (`FR-023`). Sem isso seria tela não
 * entregue — a regra de 24/09/2026 —, e é guardada por `tests/unidade/toda-tela-tem-caminho.test.ts`.
 *
 * ⚠️ **E-MAIL E PERFIL APARECEM SOMENTE PARA LEITURA, COM A RAZÃO ESCRITA NA TELA** (`FR-021`,
 * `FR-022`). Campo desabilitado sem explicação é o que faz alguém abrir chamado perguntando por quê;
 * e omitir os dois seria pior, porque a pessoa precisa saber com que endereço entra e o que pode
 * fazer. A frase fica ao lado do valor, não num rodapé.
 */
import { redirect } from "next/navigation";

import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { rotuloDoPerfil } from "@/lib/dominio/perfis";
import { enderecoDaFoto } from "@/lib/supabase/avatar";

import { FormularioDaFoto } from "./FormularioDaFoto";
import { FormularioDoNome } from "./FormularioDoNome";

export default async function MeuPerfil() {
  const usuario = await usuarioDaSessao();
  // O layout já barrou quem não tem sessão; isto é a rede da rede, e satisfaz o tipo.
  if (!usuario) redirect("/login");

  const fotoUrl = await enderecoDaFoto(usuario.avatarCaminho);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-texto text-xl font-semibold">Meu perfil</h1>
        <p className="text-texto-suave text-sm">
          Aqui você muda como o seu nome e a sua foto aparecem no sistema.
        </p>
      </header>

      <section
        aria-labelledby="titulo-da-foto"
        className="border-borda bg-superficie rounded-ciaara flex flex-col gap-3 border p-4"
      >
        <h2 id="titulo-da-foto" className="text-texto text-sm font-semibold">
          Foto
        </h2>
        <FormularioDaFoto
          nome={usuario.nomeExibicao ?? usuario.nome}
          fotoUrl={fotoUrl}
          temFoto={Boolean(usuario.avatarCaminho)}
        />
      </section>

      <section
        aria-labelledby="titulo-do-nome"
        className="border-borda bg-superficie rounded-ciaara flex flex-col gap-3 border p-4"
      >
        <h2 id="titulo-do-nome" className="text-texto text-sm font-semibold">
          Nome
        </h2>
        <FormularioDoNome nomeExibicao={usuario.nomeExibicao ?? usuario.nome} />
      </section>

      <section
        aria-labelledby="titulo-do-que-nao-muda"
        className="border-borda bg-superficie rounded-ciaara flex flex-col gap-3 border p-4"
      >
        <h2 id="titulo-do-que-nao-muda" className="text-texto text-sm font-semibold">
          O que só o Administrador muda
        </h2>

        <dl className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <dt className="text-texto-suave text-sm">E-mail</dt>
          <dd className="text-texto text-sm">
            {usuario.email}
            {/* veste: dica do porquê de o campo não ser editável (FR-021) */}
            <span className="text-texto-tenue block text-xs">
              O e-mail é a credencial de entrada e não é editável por ninguém, nem pelo
              Administrador. Para trocá-lo, fale com o Administrador.
            </span>
          </dd>

          <dt className="text-texto-suave text-sm">Perfil</dt>
          <dd className="text-texto text-sm">
            {rotuloDoPerfil(usuario.perfil)}
            {/* veste: dica do porquê de o campo não ser editável (FR-022) */}
            <span className="text-texto-tenue block text-xs">
              O perfil define o que você pode fazer, e por isso ninguém muda o próprio. Quem muda é
              o Administrador.
            </span>
          </dd>
        </dl>
      </section>

      <p className="text-texto-suave text-sm">
        <a
          href="/perfil/senha"
          className="text-marca focus-visible:ring-marca rounded-ciaara-sm underline focus-visible:ring-2 focus-visible:outline-none"
        >
          Trocar a minha senha
        </a>
      </p>
    </div>
  );
}

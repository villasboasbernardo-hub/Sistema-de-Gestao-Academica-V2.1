/**
 * **A tela única de senha nova** (`FR-030` a `FR-032`, `US3`).
 *
 * ⚠️ **UMA TELA, DOIS MODOS — e construir duas seria construir duas.** Aqui ela serve à troca
 * **voluntária**, alcançada por clique a partir de `/perfil`. No PR 2 a mesma tela passa a servir à
 * troca **obrigatória**: quando o Admin redefinir a senha, a marca em `app_metadata` manda a pessoa
 * para cá no login seguinte, e o que muda é o texto e a falta de saída — não o formulário, não a
 * ação, não a regra.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** O formulário é a folha.
 */
import { redirect } from "next/navigation";

import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { regraDaSenhaEmPortugues } from "@/lib/dominio/politica-de-senha";

import { FormularioDeSenhaNova } from "./FormularioDeSenhaNova";

export default async function SenhaNova() {
  const usuario = await usuarioDaSessao();
  if (!usuario) redirect("/login");

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-texto text-xl font-semibold">Trocar a minha senha</h1>
        {/* ⚠️ A regra é dita ANTES de a pessoa digitar (`FR-032`). Descobri-la na recusa é a forma
            cara de aprendê-la, e é como a plataforma a entrega — em inglês. */}
        <p className="text-texto-suave text-sm">{regraDaSenhaEmPortugues()}</p>
      </header>

      <section
        aria-labelledby="titulo-da-senha"
        className="border-borda bg-superficie rounded-ciaara flex flex-col gap-3 border p-4"
      >
        <h2 id="titulo-da-senha" className="text-texto text-sm font-semibold">
          Senha nova
        </h2>
        <FormularioDeSenhaNova />
      </section>

      <p className="text-texto-suave text-sm">
        <a
          href="/perfil"
          className="text-marca focus-visible:ring-marca rounded-ciaara-sm underline focus-visible:ring-2 focus-visible:outline-none"
        >
          Voltar ao meu perfil
        </a>
      </p>
    </div>
  );
}

/**
 * A página de **uma** conta: editar, redefinir senha, desativar e reativar (`FR-033` a `FR-043`).
 *
 * ⚠️ **ELA NASCEU DA CONFERÊNCIA REPROVADA DO PR 2, em 03/10/2026.** Nas palavras de Bernardo:
 * *"Editar usuário abre PÁGINA própria. (…) Nada de diálogo sobre diálogo na lista."* Antes, as quatro
 * ações viviam numa célula da tabela, e trocar o perfil era um formulário aberto dentro de uma linha.
 *
 * ⚠️ **AQUI MORA O QUE SAIU DA LISTA** — escopo, vínculo de instrutor e situação. Elas não eram
 * inúteis; eram inúteis **na lista**, onde ninguém as lê ao procurar uma pessoa. Nesta tela quem está
 * olhando já escolheu a conta.
 *
 * ⚠️ **AS AÇÕES SOBRE A PRÓPRIA CONTA NÃO APARECEM** (`FR-041`): *"a ação MUST NOT aparecer na tela"*.
 * A razão fica escrita onde elas estariam, senão a ausência se lê como defeito.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { BadgeStatus } from "@/components/ciaara/badge-status";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { Avatar, AvatarImagem, AvatarRecuo } from "@/components/ui/avatar";
import { permissoesDoPerfil } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { iniciaisDoNome } from "@/lib/dominio/iniciais-do-nome";
import { rotuloDoPerfil } from "@/lib/dominio/perfis";
import { enderecoDaFoto } from "@/lib/supabase/avatar";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { lerApoioDaConta } from "../dados-da-conta";
import { AcoesDaConta } from "./AcoesDaConta";
import { FormularioDaConta } from "./FormularioDaConta";

export default async function Conta({ params }: { params: Promise<{ readonly id: string }> }) {
  const { id } = await params;
  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);

  if (!permissoes.has("usuarios:editar")) {
    return (
      <EstadoVazio
        motivo="sem-permissao"
        detalhe="A gestão de usuários é do perfil Admin. Você enxerga apenas o próprio cadastro."
      />
    );
  }

  const supabase = await criarClienteDeServidor();
  const { data: conta } = await supabase
    .from("usuarios")
    .select(
      "id, codigo, nome, nome_exibicao, email, perfil, escopo_curso, status, ultimo_acesso, auth_user_id, avatar_caminho, instrutor_id",
    )
    .eq("id", id)
    .maybeSingle();

  // ⚠️ `notFound()` e não uma frase própria: a RLS pode negar em silêncio, e "não existe" é o que a
  //    tela honestamente sabe. Distinguir aqui exigiria consultar com privilégio elevado só para dar
  //    uma mensagem — e essa é a tentação que o Princípio XI recusa.
  if (!conta) notFound();

  const [foto, apoio, vinculos] = await Promise.all([
    enderecoDaFoto(conta.avatar_caminho),
    lerApoioDaConta(),
    supabase.from("usuario_curso").select("curso_id").eq("usuario_id", id).eq("status", "ativo"),
  ]);

  const nome = conta.nome_exibicao ?? conta.nome ?? "";
  const ehMinhaConta = conta.id === usuario?.id;

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Link
          href="/admin/usuarios"
          className="text-marca rounded-ciaara-sm focus-visible:ring-marca text-sm underline focus-visible:ring-2 focus-visible:outline-none"
        >
          ← Usuários
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Avatar className="size-12">
            {foto ? <AvatarImagem src={foto} alt="" /> : null}
            <AvatarRecuo>{iniciaisDoNome(nome)}</AvatarRecuo>
          </Avatar>
          <div>
            <h1 className="text-texto flex flex-wrap items-center gap-2 text-lg font-semibold">
              {nome}
              {conta.status !== "ativo" ? <BadgeStatus tom="inativo" rotulo="Desativada" /> : null}
            </h1>
            {/* veste: identificação da conta — dados de leitura, não valores editáveis */}
            <p className="text-texto-suave text-sm">
              {conta.email} · {rotuloDoPerfil(conta.perfil)} · {conta.codigo}
            </p>
            {/* veste: o carimbo de último acesso — unidade de leitura, não valor editável */}
            <p className="text-texto-tenue text-xs">
              Último acesso:{" "}
              {conta.ultimo_acesso
                ? new Date(conta.ultimo_acesso).toLocaleString("pt-BR")
                : "nunca"}
            </p>
          </div>
        </div>
      </div>

      {ehMinhaConta ? (
        // veste: a razão de a própria conta não ter ações — texto explicativo, não valor
        <p className="border-borda bg-superficie-2 rounded-ciaara text-texto-tenue border p-3 text-sm">
          Esta é a sua conta. Trocar o próprio perfil, desativar-se ou redefinir a própria senha por
          aqui não é possível — peça a outro Administrador. Para a sua senha, use{" "}
          <strong>Trocar a minha senha</strong> no seu perfil, e para o seu nome e foto,{" "}
          <strong>Meu perfil</strong>.
        </p>
      ) : (
        <>
          <FormularioDaConta
            usuarioId={conta.id}
            nomeExibicao={nome}
            perfil={conta.perfil}
            escopo={conta.escopo_curso ?? "geral"}
            cursosVinculados={(vinculos.data ?? []).map((v) => v.curso_id)}
            vinculoDeDocente={conta.instrutor_id ?? ""}
            cursos={apoio.cursos}
            instrutores={apoio.instrutores}
            escala={apoio.escala}
          />

          <AcoesDaConta
            usuarioId={conta.id}
            nome={nome}
            ativa={conta.status === "ativo"}
            temCredencial={Boolean(conta.auth_user_id)}
          />
        </>
      )}
    </section>
  );
}

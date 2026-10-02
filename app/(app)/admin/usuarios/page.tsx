/**
 * Gestão de contas — a **lista** (`FR-014`, `FR-040`).
 *
 * ⚠️ **ESTA TELA FOI REFEITA EM 03/10/2026, DEPOIS DE BERNARDO REPROVAR A CONFERÊNCIA DO PR 2.**
 * O pedido, nas palavras dele: *"Lista `/admin/usuarios` com layout limpo. Colunas: avatar (foto ou
 * iniciais), nome, e-mail, perfil (em português), último acesso."* e *"Nada de diálogo sobre diálogo
 * na lista."*
 *
 * **O que SAIU da lista, e por que a saída é o ponto:** vínculo de instrutor, situação e escopo. Eram
 * três colunas que **ninguém lê ao procurar uma pessoa** e que empurravam as cinco úteis para fora da
 * tela. Elas não desapareceram do sistema — moram na **página da conta**, onde quem vai mexer já está
 * olhando aquela conta.
 *
 * ⚠️ **A SITUAÇÃO NÃO VIROU COLUNA NENHUMA: ela virou ETIQUETA, e só quando é má notícia.** Conta
 * ativa é o caso normal e não precisa dizer nada; conta desativada ganha *"Desativada"*. Uma coluna
 * com *"ativo"* repetido em quase toda linha é tinta gasta para informar o esperado.
 *
 * ⚠️ **O AVATAR CUSTA UM ENDEREÇO ASSINADO POR CONTA, e eles saem em `Promise.all`.** O balde é
 * privado, então não há URL fixa; e um `await` por linha dentro do laço é o `N+1` que as convenções
 * proíbem em `app/**`. Com cinco contas a diferença é imperceptível — a regra existe para o dia em
 * que forem cinquenta.
 *
 * ⚠️ **A BUSCA FILTRA NO SERVIDOR, não na tela.** Ela é parâmetro do contrato com `avisaServidor`,
 * então o resultado é link compartilhável e o `Limpar filtros` nasce junto, pelo componente único.
 */
import Link from "next/link";

import { BadgeStatus } from "@/components/ciaara/badge-status";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { Avatar, AvatarImagem, AvatarRecuo } from "@/components/ui/avatar";
import { permissoesDoPerfil } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { iniciaisDoNome } from "@/lib/dominio/iniciais-do-nome";
import { rotuloDoPerfil } from "@/lib/dominio/perfis";
import { enderecoDaFoto } from "@/lib/supabase/avatar";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { BuscaDeUsuarios } from "./BuscaDeUsuarios";

/** Uma célula de cabeçalho, para as oito classes não se repetirem cinco vezes. */
const TH = "border-borda bg-superficie-2 text-texto border px-2 py-1 text-left";
const TD = "border-borda text-texto border px-2 py-1";

export default async function Usuarios({
  searchParams,
}: {
  searchParams: Promise<{ readonly busca?: string }>;
}) {
  const { busca = "" } = await searchParams;
  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);

  const supabase = await criarClienteDeServidor();
  let consulta = supabase
    .from("usuarios")
    .select("id, codigo, nome, nome_exibicao, email, perfil, status, ultimo_acesso, avatar_caminho")
    .order("nome");

  /*
   * ⚠️ **A BUSCA CASA NOME **E** NOME DE EXIBIÇÃO, não só um dos dois.** A lista mostra o nome de
   *    exibição quando ele existe; procurar apenas por `nome` faria a pessoa digitar o que está
   *    vendo na tela e não achar nada — o pior desfecho possível para uma busca.
   */
  if (busca.trim()) {
    const alvo = `%${busca.trim()}%`;
    consulta = consulta.or(`nome.ilike.${alvo},nome_exibicao.ilike.${alvo},email.ilike.${alvo}`);
  }

  const { data, error } = await consulta;

  if (error) return <EstadoVazio motivo="sem-permissao" />;

  // ⚠️ A DISTINÇÃO DO FR-025, e ela é real aqui: a RLS deixa quase todo perfil enxergar a PRÓPRIA
  // linha. Uma lista com uma linha só, para quem não administra usuários, não é "não há usuários"
  // — é "você só vê o seu". Dizer "nada cadastrado" seria mentira num sistema com nove contas.
  if (!permissoes.has("usuarios:editar")) {
    return (
      <EstadoVazio
        motivo="sem-permissao"
        detalhe="A gestão de usuários é do perfil Admin. Você enxerga apenas o próprio cadastro."
      />
    );
  }

  const contas = data ?? [];

  // ⚠️ Um endereço assinado por conta, TODOS DE UMA VEZ — ver a nota do cabeçalho.
  const fotos = await Promise.all(contas.map((c) => enderecoDaFoto(c.avatar_caminho)));

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Usuários</h1>
        {/*
          ⚠️ **É UM LINK PARA UMA PÁGINA, não um botão que abre formulário na lista.** É o que a
             decisão de 03/10/2026 pediu, e o que dá endereço compartilhável e botão de voltar.
             ⚠️ E ele é o caminho clicável que `toda-tela-tem-caminho.test.ts` exige para a rota nova.
        */}
        <Link
          href="/admin/usuarios/novo"
          className="border-marca bg-marca text-marca-contraste rounded-ciaara focus-visible:ring-marca border px-3 py-1 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          Cadastrar usuário
        </Link>
      </div>

      {/* veste: explicação do regime de acesso — texto de apoio, não valor */}
      <p className="text-texto-suave mt-1 text-sm">
        {contas.length} {contas.length === 1 ? "cadastro" : "cadastros"}. O acesso é{" "}
        <strong>somente por cadastro do Admin</strong>: não há autocadastro, e desativar nunca
        apaga.
      </p>

      <BuscaDeUsuarios />

      {contas.length === 0 ? (
        <div className="mt-6">
          <EstadoVazio
            motivo="sem-dado"
            detalhe={
              busca.trim()
                ? `Nenhuma conta com «${busca.trim()}» no nome ou no e-mail.`
                : "Nenhuma conta cadastrada."
            }
          />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {/* O avatar não tem rótulo visível: a coluna é a imagem, e um título ali seria ruído. */}
                <th className={TH}>
                  <span className="sr-only">Avatar</span>
                </th>
                <th className={TH}>Nome</th>
                <th className={TH}>E-mail</th>
                <th className={TH}>Perfil</th>
                <th className={TH}>Último acesso</th>
              </tr>
            </thead>
            <tbody>
              {contas.map((linha, indice) => {
                const nome = linha.nome_exibicao ?? linha.nome ?? "";
                return (
                  <tr key={linha.id}>
                    <td className={TD}>
                      <Avatar className="size-8">
                        {fotos[indice] ? <AvatarImagem src={fotos[indice]!} alt="" /> : null}
                        <AvatarRecuo className="text-xs">{iniciaisDoNome(nome)}</AvatarRecuo>
                      </Avatar>
                    </td>
                    <td className={TD}>
                      {/*
                        ⚠️ O NOME É O LINK PARA A PÁGINA DA CONTA. É o caminho clicável de
                           `/admin/usuarios/[id]`, e põe a ação onde a pessoa já está olhando.
                      */}
                      <span className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/usuarios/${linha.id}`}
                          className="text-marca rounded-ciaara-sm focus-visible:ring-marca underline focus-visible:ring-2 focus-visible:outline-none"
                        >
                          {nome}
                        </Link>
                        {/* A etiqueta só existe quando é má notícia — ver a nota do cabeçalho. */}
                        {linha.status !== "ativo" ? (
                          <BadgeStatus tom="inativo" rotulo="Desativada" />
                        ) : null}
                      </span>
                    </td>
                    <td className={TD}>{linha.email}</td>
                    <td className={TD}>{rotuloDoPerfil(linha.perfil)}</td>
                    <td className={TD}>
                      {linha.ultimo_acesso
                        ? new Date(linha.ultimo_acesso).toLocaleDateString("pt-BR")
                        : "nunca"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

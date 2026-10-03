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
 * ⚠️ **AS AÇÕES VIVEM NA LINHA, E SÃO QUATRO** *(D-USR-6, de Bernardo Villas Boas, 03/10/2026)*:
 * **Editar**, **Redefinir senha**, **Desativar/Reativar** e **Excluir**. O que ele recusou foi
 * **formulário** dentro da linha — trocar perfil, editar nome —, e isso continua na página da conta,
 * onde o «Editar» leva. Botão com diálogo não é formulário.
 * ⚠️ **A coluna de ações é a sexta**, e a lista segue sem vínculo, situação e escopo.
 * ⚠️ **E UMA DAS QUATRO PODE FALTAR, com a razão escrita no lugar dela:** conta **sem credencial**
 * não tem senha a redefinir. Medido no remoto em 03/10/2026, **4 das 5 contas reais** estão nesse
 * estado — vieram do ETL e do convite antigo, que gravava o cadastro e não emitia o convite.
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

import { AcoesDaLinha } from "./AcoesDaLinha";
import { AvisoDaLista } from "./AvisoDaLista";
import { BuscaDeUsuarios } from "./BuscaDeUsuarios";

/** Uma célula de cabeçalho, para as oito classes não se repetirem cinco vezes. */
const TH = "border-borda bg-superficie-2 text-texto border px-2 py-1 text-left";
const TD = "border-borda text-texto border px-2 py-1";

export default async function Usuarios({
  searchParams,
}: {
  searchParams: Promise<{ readonly busca?: string; readonly excluida?: string }>;
}) {
  const { busca = "", excluida = "" } = await searchParams;
  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);

  const supabase = await criarClienteDeServidor();
  /*
   * ⚠️ **`excluida_em is null` NÃO É FILTRO DE CONVENIÊNCIA: é o que faz a conta excluída sair da
   *    lista** (`FR-046`). A linha anonimizada continua existindo para `criado_por` resolver num
   *    nome — *"Conta excluída"* —, e mostrá-la aqui faria a lista exibir contas que ninguém pode
   *    usar, com e-mail sentinela `.invalid`, misturadas às vivas.
   */
  let consulta = supabase
    .from("usuarios")
    .select(
      "id, codigo, nome, nome_exibicao, email, perfil, status, ultimo_acesso, avatar_caminho, auth_user_id",
    )
    .is("excluida_em", null)
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

      {/*
        ⚠️ **O AVISO DA EXCLUSÃO FICA AQUI, FORA DA TABELA.** Ele vem da URL porque a linha que
           disparou a ação **não existe mais** — ver a nota no contrato de `/admin/usuarios`. As duas
           frases são diferentes de propósito: as duas exclusões são permanentes, e só uma deixa
           cadastro para trás.
      */}
      {excluida === "apagada" ||
      excluida === "anonimizada" ||
      excluida === "apagada_email_em_uso" ? (
        <p
          role="status"
          className="border-borda bg-superficie-2 rounded-ciaara text-texto mt-3 border p-2 text-sm"
        >
          {excluida === "apagada"
            ? "Conta excluída. Ela não deixou registro nenhum no sistema, então saiu inteira, e o e-mail está livre para um novo cadastro."
            : excluida === "anonimizada"
              ? "Conta excluída. Ela registrou histórico, então o cadastro ficou como «Conta excluída» e saiu da lista, para os registros antigos continuarem tendo autor. O e-mail está livre para um novo cadastro."
              : /*
                 ⚠️ **A TERCEIRA FRASE É A QUE EVITA UMA MENTIRA.** A conta saiu, mas o e-mail dela é
                    o login de OUTRA conta — e apagar aquela credencial derrubaria o acesso de quem
                    não pediu nada. Dizer "o e-mail está livre" aqui faria o Admin tentar cadastrar e
                    bater num erro sem explicação.
                */
                "Conta excluída e removida da lista. ⚠️ O e-mail dela NÃO ficou livre: esse endereço é a credencial de outra conta do sistema, e ela foi preservada. Para reaproveitar o endereço, resolva primeiro a conta que o usa."}
        </p>
      ) : null}

      <AvisoDaLista>
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
                  <th className={TH}>Ações</th>
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
                      <td className={TD}>
                        <AcoesDaLinha
                          usuarioId={linha.id}
                          nome={nome}
                          email={linha.email ?? ""}
                          ativa={linha.status === "ativo"}
                          temCredencial={Boolean(linha.auth_user_id)}
                          ehMinhaConta={linha.id === usuario?.id}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AvisoDaLista>
    </section>
  );
}

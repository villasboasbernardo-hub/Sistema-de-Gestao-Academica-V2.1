/**
 * Administração → **Tipos de atividade** — o catálogo da RA-1 (Bloco 18, spec 033, FR-001.3 e FR-001.4).
 *
 * > *"Catálogo de tipos de atividade (lista do sistema, Admin edita) (…) Cada tipo tem classificação PADRÃO
 * > (AEC/TAD/TR), que o operador pode trocar no lançamento."* — Bernardo Villas Boas, 03/11/2026 (RA-1)
 *
 * ⚠️ **A TELA FICA NA ADMINISTRAÇÃO E SEGUE A PERMISSÃO DAS SALAS** (D-6 da spec 033): o catálogo mora em
 *    `config_listas`, cuja policy de escrita é `parametros.criar`/`parametros.editar` (Admin e Encarregado). *"Admin
 *    edita"* com a policy só do Admin seria alterar policy existente — portão 9.4, fora deste bloco. A lista se lê com
 *    qualquer sessão (`config_listas_ler`), como a de salas.
 * ⚠️ **SÓ OS TIPOS DE ATIVIDADE** (os com categoria, `tiposDoCatalogo`): os de aula não são atividade. Os de Estudo
 *    Individual e de Apoio Individualizado aparecem SÓ PARA LER (decisão 2 da conferência do passo 0).
 * ⚠️ **O RÓTULO NA TELA, A CHAVE AO LADO QUANDO DIFERE** (decisão 4): «Atividade Extraclasse» é o rótulo; a chave
 *    gravada (que o gatilho, a sincronização e o ETL casam) aparece em letra menor, para quem edita saber que ela fica.
 * ⚠️ **A CONTAGEM É DOS LANÇAMENTOS ATIVOS E SALVOS** (RP-8) que a pessoa alcança (a RLS recorta), e é ela que o diálogo
 *    de *Editar* usa para dizer quantos mudam de categoria. Leitura que falha é dita — nunca vira zero (gotcha 4).
 * ⚠️ **SEM MARCADOR DE CLIENTE.** O cadastro e as ações da linha são folhas.
 */
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { SePodeVer } from "@/components/ciaara/SePodeVer";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import {
  contagemDoTipo,
  contagemPorTipo,
  ehClassificacaoDoCatalogo,
  rotuloDaClassificacao,
  tiposDoCatalogo,
  type LinhaDoCatalogo,
} from "@/lib/dominio/atividades/catalogo-de-tipos";
import type { TipoDeAtividade } from "@/lib/dominio/categoria-pelo-tipo";
import { contagemNaPrimeira, lerTodasAsPaginas } from "@/lib/supabase/paginacao";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { AcoesDoTipoDeAtividade } from "./AcoesDoTipoDeAtividade";
import { NovoTipoDeAtividade } from "./NovoTipoDeAtividade";

const CELULA = "border-borda text-texto border px-2 py-1";
const CABECALHO = "border-borda bg-superficie-2 text-texto border px-2 py-1 text-left";

export default async function TiposDeAtividade() {
  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  const supabase = await criarClienteDeServidor();

  const [catalogoRes, lancamentosRes] = await Promise.all([
    supabase
      .from("config_listas")
      .select("id, valor, rotulo_exibicao, ativo, ordem, metadados")
      .eq("lista", "tipos_atividade")
      .order("ordem"),
    lerTodasAsPaginas((f) =>
      supabase
        .from("atividades_nao_letivas")
        .select("id, tipo_atividade_id, conta_como", contagemNaPrimeira(f))
        .eq("status", "ativo")
        .eq("salvo", true)
        .not("tipo_atividade_id", "is", null)
        .order("id")
        .range(f.de, f.ate),
    ),
  ]);

  const tipos = tiposDoCatalogo(
    (
      (catalogoRes.data ?? []) as {
        id: string;
        valor: string;
        rotulo_exibicao: string | null;
        ativo: boolean | null;
        ordem: number | null;
        metadados: unknown;
      }[]
    ).map((l): LinhaDoCatalogo => ({
      id: l.id,
      valor: l.valor,
      rotulo: l.rotulo_exibicao,
      ativo: l.ativo !== false,
      ordem: Number(l.ordem ?? 0),
      metadados: l.metadados as TipoDeAtividade["metadados"],
    })),
  );
  const contagens = lancamentosRes.error
    ? null
    : contagemPorTipo(
        (
          (lancamentosRes.data ?? []) as {
            tipo_atividade_id: string | null;
            conta_como: string | null;
          }[]
        ).map((l) => ({ tipoId: l.tipo_atividade_id, contaComo: l.conta_como })),
      );

  const podeEditar = pode(permissoes, "parametros", "editar");
  const ativos = tipos.filter((t) => t.ativo).length;

  return (
    <section className="flex flex-col gap-3" data-slot="pagina-de-tipos-de-atividade">
      {/* RT-1: a ação da página no topo, à direita. */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-texto text-lg font-semibold">Tipos de atividade</h1>
          <p className="text-texto-suave text-sm">
            {catalogoRes.error
              ? "O catálogo dos tipos que o lançamento do DSA oferece."
              : `${tipos.length} tipos, ${ativos} ativos. `}
            {catalogoRes.error ? null : (
              <>
                Cada tipo tem uma classificação <strong>padrão</strong> — AEC (Atividade
                Extraclasse), TAD ou TR —, que o lançamento pode trocar no «Conta como». O nome
                gravado não muda: o que se edita é o rótulo. Tipo errado se{" "}
                <strong>desativa</strong>.
              </>
            )}
          </p>
        </div>
        <SePodeVer permissoes={permissoes} recurso="parametros" acao="criar">
          <NovoTipoDeAtividade />
        </SePodeVer>
      </header>

      {catalogoRes.error ? (
        <p role="alert" className="text-atrasado-tinta text-sm" data-slot="catalogo-nao-lido">
          Não foi possível ler o catálogo de tipos de atividade agora — não quer dizer que ele
          esteja vazio. Recarregue a página.
        </p>
      ) : tipos.length === 0 ? (
        <EstadoVazio
          motivo="sem-dado"
          titulo="Nenhum tipo de atividade no catálogo"
          detalhe="Acrescente o primeiro para que o lançamento do DSA possa oferecê-lo."
        />
      ) : (
        <>
          {contagens === null ? (
            <p role="alert" className="text-atrasado-tinta text-sm" data-slot="contagem-nao-lida">
              Não foi possível contar os lançamentos de cada tipo agora: a coluna fica sem número, e
              o diálogo de Editar não diz quantos mudam de categoria.
            </p>
          ) : null}
          <div className="mt-2 overflow-x-auto">
            <table
              className="w-full border-collapse text-sm"
              data-slot="tabela-de-tipos-de-atividade"
            >
              <thead>
                <tr>
                  {/* veste: os títulos das colunas; o que está abaixo deles é dado */}
                  <th className={CABECALHO}>Tipo</th>
                  <th className={CABECALHO}>Classificação padrão</th>
                  <th className={CABECALHO}>Lançamentos ativos</th>
                  <th className={CABECALHO}>Situação</th>
                  {podeEditar ? <th className={CABECALHO}>Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {tipos.map((tipo) => {
                  const contagem = contagens === null ? null : contagemDoTipo(contagens, tipo.id);
                  return (
                    <tr
                      key={tipo.id}
                      data-tipo={tipo.valor}
                      data-ativo={tipo.ativo}
                      data-classificacao={tipo.categoria}
                    >
                      <td className={CELULA}>
                        <span className="flex flex-col">
                          <span data-slot="rotulo-do-tipo">{tipo.rotulo}</span>
                          {tipo.chaveDiferente ? (
                            <span className="text-texto-suave text-xs" data-slot="chave-do-tipo">
                              chave gravada: {tipo.valor}
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className={CELULA} data-slot="classificacao-do-tipo">
                        {rotuloDaClassificacao(tipo.categoria)}
                        {tipo.editavel ? null : (
                          <span className="text-texto-suave block text-xs">fora da CHT</span>
                        )}
                      </td>
                      <td
                        className={CELULA}
                        data-slot="lancamentos-do-tipo"
                        data-quantidade={contagem === null ? "" : contagem.total}
                      >
                        {contagem === null ? "—" : contagem.total}
                      </td>
                      <td className={CELULA} data-slot="situacao-do-tipo">
                        {tipo.ativo ? "ativo" : "desativado"}
                      </td>
                      {podeEditar ? (
                        <td className={CELULA}>
                          {tipo.editavel && ehClassificacaoDoCatalogo(tipo.categoria) ? (
                            <AcoesDoTipoDeAtividade
                              id={tipo.id}
                              valor={tipo.valor}
                              rotulo={tipo.rotulo}
                              classificacao={tipo.categoria}
                              ativo={tipo.ativo}
                              contagem={contagem}
                            />
                          ) : (
                            <span className="text-texto-suave text-xs" data-slot="tipo-so-leitura">
                              só leitura: a classificação de Estudo Individual e de Apoio
                              Individualizado não se edita no catálogo
                            </span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

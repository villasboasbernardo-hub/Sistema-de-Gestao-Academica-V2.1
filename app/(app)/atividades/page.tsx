/**
 * `/atividades` — a lista de atividades não letivas (spec 014, PR 2, `FR-063`; `RF-EXTRA-03`).
 *
 * ⚠️ **SÓ LEITURA.** O lançamento continua no DSA da turma; aqui se consulta por turma, tipo,
 *    categoria (Apoio Individualizado e a global inclusive), data e TA.
 * ⚠️ **O FILTRO ESTÁ NA URL** e é validado antes de virar predicado (`RF-NAV-01`): valor fora do
 *    contrato cai para o padrão.
 * ⚠️ **"NÃO HÁ" × "VOCÊ NÃO VÊ"** (gotcha 4): a RLS nega em silêncio, e a frase do vazio distingue.
 * ⚠️ SEM MARCADOR DE CLIENTE. Só os filtros são folha.
 */
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { dataParaLeitura } from "@/lib/formato/data";
import { lerParametros } from "@/lib/navegacao/esquema";
import { idsArquivados, semAsArquivadas } from "@/lib/dominio/arquivamento-da-turma";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { alcanceDoPerfil } from "../cursos/consulta";
import {
  COLUNAS_DAS_ATIVIDADES,
  LIMITE_DE_ATIVIDADES,
  paraLinhas,
  ROTULO_DA_CATEGORIA,
} from "./consulta";
import { FiltrosDeAtividades } from "./FiltrosDeAtividades";

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function Atividades({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { valores } = lerParametros("/atividades", await searchParams);
  const filtro = {
    turma: String(valores.turma),
    categoria: String(valores.categoria),
    tipo: String(valores.tipo),
    de: DATA_ISO.test(String(valores.de)) ? String(valores.de) : "",
    ate: DATA_ISO.test(String(valores.ate)) ? String(valores.ate) : "",
  };

  const supabase = await criarClienteDeServidor();
  let consulta = supabase
    .from("atividades_nao_letivas")
    .select(
      filtro.turma
        ? COLUNAS_DAS_ATIVIDADES.replace("turmas(codigo)", "turmas!inner(codigo)")
        : COLUNAS_DAS_ATIVIDADES,
    )
    .eq("status", "ativo");
  if (filtro.turma) consulta = consulta.eq("turmas.codigo", filtro.turma);
  if (filtro.categoria) consulta = consulta.eq("categoria_normativa", filtro.categoria as never);
  if (filtro.tipo) consulta = consulta.ilike("subtipo", `%${filtro.tipo}%`);
  if (filtro.de) consulta = consulta.gte("data", filtro.de);
  if (filtro.ate) consulta = consulta.lte("data", filtro.ate);

  const [usuario, atividadesRes, turmasRes, arquivadasRes] = await Promise.all([
    usuarioDaSessao(),
    consulta.order("data", { ascending: false }).order("ta_inicial").limit(LIMITE_DE_ATIVIDADES),
    supabase.from("turmas").select("id, codigo").order("codigo"),
    /* D-COR-5 (spec 017, C-24): a turma arquivada some do filtro de turma. */
    supabase.from("vw_turmas_arquivadas").select("turma_id"),
  ]);
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  const podeLer = pode(permissoes, "atividades_nao_letivas", "ler");
  const alcance = alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso);
  const haFiltro = Object.values(filtro).some((v) => v !== "");

  const linhas = paraLinhas((atividadesRes.data ?? []) as never);
  const turmas = semAsArquivadas(
    turmasRes.data ?? [],
    idsArquivados((arquivadasRes.data ?? []) as { turma_id: string | null }[]),
    (t) => t.id as string,
  ).map((t) => t.codigo as string);

  return (
    <div className="flex flex-col gap-4" data-slot="lista-de-atividades">
      <header className="flex flex-col gap-1">
        <h1 className="text-texto text-xl font-semibold">Atividades</h1>
        <p className="text-texto-suave text-sm" data-slot="contagem-de-atividades">
          {linhas.length} atividade{linhas.length === 1 ? "" : "s"}
          {haFiltro ? " neste recorte" : ""}
          {linhas.length === LIMITE_DE_ATIVIDADES
            ? ` — mostrando as ${LIMITE_DE_ATIVIDADES} mais recentes; filtre para ver as demais`
            : ""}
          . O lançamento é feito no DSA da turma.
        </p>
      </header>

      <FiltrosDeAtividades turmas={turmas} />

      {atividadesRes.error ? (
        <EstadoVazio
          motivo="sem-permissao"
          titulo="Não foi possível ler as atividades agora"
          detalhe="A leitura falhou. Tente de novo; se persistir, procure o suporte."
        />
      ) : linhas.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="text-texto w-full text-sm" data-slot="tabela-de-atividades">
            <thead className="text-texto-suave text-left text-xs">
              <tr className="border-borda border-b">
                <th className="py-1 pr-3 font-medium">Data</th>
                <th className="py-1 pr-3 font-medium">TA</th>
                <th className="py-1 pr-3 font-medium">Turma</th>
                <th className="py-1 pr-3 font-medium">Categoria</th>
                <th className="py-1 pr-3 font-medium">Tipo</th>
                <th className="py-1 pr-3 font-medium">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.codigo} className="border-borda border-b" data-atividade={l.codigo}>
                  <td className="py-1 pr-3 tabular-nums">{dataParaLeitura(l.data)}</td>
                  <td className="py-1 pr-3 tabular-nums">
                    {l.taInicial === null ? "—" : `${l.taInicial}º`}
                    {l.tempos === null ? "" : ` · ${l.tempos} TA`}
                  </td>
                  <td className="py-1 pr-3">{l.turma ?? "Todas as turmas com DSA"}</td>
                  <td className="py-1 pr-3" data-categoria={l.categoria}>
                    {ROTULO_DA_CATEGORIA[l.categoria] ?? l.categoria}
                  </td>
                  <td className="py-1 pr-3">{l.tipo ?? "—"}</td>
                  <td className="py-1 pr-3">
                    {l.descricao}
                    {l.alunos === null ? "" : ` (${l.alunos} aluno${l.alunos === 1 ? "" : "s"})`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !podeLer ? (
        <EstadoVazio
          motivo="sem-permissao"
          titulo="O seu perfil não lê as atividades"
          detalhe="Quem nega o acesso é o banco, e a lista chega vazia por isso — não por falta de atividade."
        />
      ) : haFiltro ? (
        <EstadoVazio
          motivo="sem-dado"
          titulo="Nenhuma atividade neste recorte"
          detalhe="Afrouxe ou limpe os filtros acima."
        />
      ) : alcance === "recortado" ? (
        <EstadoVazio
          motivo="sem-permissao"
          titulo="Você não alcança atividades"
          detalhe="O seu perfil vê só as atividades das turmas dos cursos sob a sua responsabilidade."
        />
      ) : (
        <EstadoVazio
          motivo="sem-dado"
          titulo="Ainda não há atividade lançada"
          detalhe="As atividades nascem no DSA da turma."
        />
      )}
    </div>
  );
}

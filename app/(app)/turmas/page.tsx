/**
 * A lista de turmas (`FR-012` a `FR-016`, `FR-022` da spec 012; `RF-CURSO-01`).
 *
 * ⚠️ **ELA EXISTE PORQUE A TURMA NÃO TINHA LUGAR.** Até 04/10/2026 a turma só existia como
 * **parâmetro** de outras telas — `/cursos/[curso]?turma=` e `/disciplinas?curso=&turma=` — e a ficha
 * `/turmas/[turma]`, de pé desde a fatia (a) do Épico 5, só se alcançava **por dentro do curso**. Quem
 * pensava *"quero ver a turma T2"* não tinha por onde começar. Nasceu de uso real, nos testes de
 * Bernardo.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Filtro e tabela são folhas declaradas; a leitura é de servidor.
 *
 * ⚠️ **UMA CONSULTA DE TURMAS POR TELA, E NENHUMA POR LINHA** (`SC-008`). As três leituras vão em
 * paralelo: o recorte, o universo de anos e os cursos para o filtro.
 *
 * ⚠️ **O ESTADO VAZIO DISTINGUE QUATRO COISAS, E ISSO NÃO É ENFEITE** (gotcha 4): *a leitura falhou*,
 * *não há turma neste recorte*, *o seu perfil não lê turmas* e *você não alcança curso nenhum*. A
 * policy `turmas_ler` recorta por alcance **sem erro nenhum** — um perfil estreito recebe lista
 * parcial, e concluir *"não tem turma cadastrada"* a partir de uma lista vazia é exatamente a leitura
 * errada que o gotcha descreve. Quem decide a frase é o **alcance declarado do perfil**, nunca o
 * tamanho da lista.
 */
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { alcanceDoPerfil } from "../cursos/consulta";
import {
  anosDistintos,
  COLUNAS_DA_LISTA_DE_TURMAS,
  montarConsultaDeTurmas,
  paraLinhasDeTurma,
  type LinhaBrutaDeTurma,
} from "./consulta";
import { FiltrosDeTurmas } from "./FiltrosDeTurmas";
import { TabelaDeTurmas } from "./TabelaDeTurmas";

export default async function Turmas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /*
   * ⚠️ A VALIDAÇÃO ACONTECE ANTES DE O VALOR ALCANÇAR A CONSULTA. Com o `RF-NAV-01`, a barra de
   * endereço é entrada de usuário: valor fora do domínio cai para o padrão e nunca vira predicado.
   */
  const { valores } = lerParametros("/turmas", await searchParams);

  const parametros = {
    curso: String(valores.curso),
    ano: String(valores.ano),
    situacao: String(valores.situacao),
    busca: String(valores.busca),
  };

  const supabase = await criarClienteDeServidor();

  const [usuario, recorte, universo, cursosRes] = await Promise.all([
    usuarioDaSessao(),
    montarConsultaDeTurmas(supabase.from("turmas").select(COLUNAS_DA_LISTA_DE_TURMAS), parametros),
    supabase.from("turmas").select("ano_letivo"),
    supabase.from("cursos").select("codigo, nome_curso").eq("status", "ativo").order("codigo"),
  ]);

  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  const podeLer = pode(permissoes, "turmas", "ler");
  const alcance = alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso);
  const haFiltro = Object.values(parametros).some((v) => v !== "");

  const linhas = paraLinhasDeTurma((recorte.data ?? []) as unknown as readonly LinhaBrutaDeTurma[]);
  const anos = anosDistintos(universo.data ?? []);
  const cursos = (cursosRes.data ?? []).map((c) => ({ codigo: c.codigo, nome: c.nome_curso }));

  return (
    <div className="flex flex-col gap-4" data-slot="lista-de-turmas">
      <header className="flex flex-col gap-1">
        <h1 className="text-texto text-xl font-semibold">Turmas</h1>
        {/* veste: a contagem do recorte, em tom secundário, acima da tabela */}
        <p className="text-texto-suave text-sm" data-slot="contagem-de-turmas">
          {linhas.length} turma{linhas.length === 1 ? "" : "s"}
          {haFiltro ? " neste recorte" : ""}
        </p>
      </header>

      <FiltrosDeTurmas cursos={cursos} anos={anos} />

      {recorte.error ? (
        /*
         * ⚠️ **FALHA DE LEITURA NÃO ESTOURA A TELA** (`RN-DEG-01`): a lista volta vazia com aviso, e a
         *    pessoa continua com filtro, menu e sessão. Dizer "não há turma" aqui seria afirmar o que
         *    não se mediu.
         */
        <EstadoVazio
          motivo="sem-permissao"
          titulo="Não foi possível ler as turmas agora"
          detalhe="A leitura falhou. Tente de novo; se persistir, procure o suporte."
        />
      ) : linhas.length > 0 ? (
        <TabelaDeTurmas linhas={linhas} />
      ) : !podeLer ? (
        <EstadoVazio
          motivo="sem-permissao"
          titulo="O seu perfil não lê o cadastro de turmas"
          detalhe="Quem nega o acesso é o banco, e a lista chega vazia por isso — não por falta de turma."
        />
      ) : haFiltro ? (
        <EstadoVazio
          motivo="sem-dado"
          titulo="Nenhuma turma neste recorte"
          detalhe="Afrouxe ou limpe os filtros acima."
        />
      ) : alcance === "recortado" ? (
        /*
         * ⚠️ **SEM FILTRO E SEM LINHA, COM PERMISSÃO DE LER: a pergunta é se a pessoa ALCANÇA algum
         *    curso.** Um Operador de escopo estreito sem curso atribuído lê zero turmas, e a frase
         *    "ainda não existe turma" seria falsa — existem 28 no banco.
         */
        <EstadoVazio
          motivo="sem-permissao"
          titulo="Você não alcança turmas"
          detalhe="O seu perfil vê só as turmas dos cursos sob a sua responsabilidade."
        />
      ) : (
        <EstadoVazio
          motivo="sem-dado"
          titulo="Ainda não existe turma cadastrada"
          detalhe="As turmas nascem na página do curso, em “Nova turma”."
        />
      )}
    </div>
  );
}

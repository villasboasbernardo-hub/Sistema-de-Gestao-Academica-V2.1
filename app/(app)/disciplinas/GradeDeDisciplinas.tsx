"use client";

/**
 * A grade de disciplinas — **a folha de cliente desta tela** (`FR-003` a `FR-006`, `FR-050` a
 * `FR-054`).
 *
 * ⚠️ **É UMA FOLHA SÓ, e os painéis abaixo dela NÃO levam marcador próprio.** O `"use client"` marca
 * a **fronteira**; o que é importado a partir daqui já está no pacote do navegador. Marcar cada
 * painel não mudaria nada no que é enviado e encheria a lista fechada de `fronteira-das-telas` com
 * arquivos que não são fronteira de nada — e é essa lista que torna visível o marcador digitado sem
 * pensar.
 *
 * ⚠️ **TODO ESTADO DE VISTA MORA NA URL** (`FR-001`): curso, turma, filtros e **qual linha está
 * aberta**. Colar o endereço numa janela nova reabre a mesma tela, com a mesma linha expandida. Um
 * `useState` para a linha aberta daria um link que abre a tabela fechada.
 *
 * ⚠️ **TABELA, INDICADORES E GRÁFICO SAEM DAS MESMAS LINHAS** (`SC-011`). Elas são filtradas **uma
 * vez**, aqui, e os três consomem o resultado. Uma contagem buscada à parte mostraria o total do
 * curso ao lado de uma tabela filtrada, e ninguém notaria.
 *
 * ⚠️ **NÃO HÁ NENHUM `<select>` NESTE ARQUIVO, e a ausência é imposta por guarda.** O `SC-002`
 * reprova **qualquer** arquivo que mencione instrutor e construa uma escolha fora de
 * `components/ciaara/seletor-instrutor.tsx` — a `RN-ANT-01` é de Risco **ALTO** e vale por ponto
 * único. A primeira escrita desta tela tinha três `<select>` aqui e reprovou nas duas guardas, a de
 * instrutor e a de turma. O conserto foi **usar os canônicos**, não excepcioná-los: a cascata mudou
 * para `CascataDeCursoETurma.tsx` (com o `SeletorTurma`), os filtros para o `FiltroAvancado` — o
 * mesmo de `/cursos` e `/instrutores` — e a escolha de instrutor para o `SeletorInstrutor`.
 */
import * as React from "react";

import { BotaoLimparFiltros } from "@/components/ciaara/botao-limpar-filtros";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import {
  FiltroAvancado,
  type CampoDeFiltro,
  type EstadoDeFiltro,
} from "@/components/ciaara/filtro-avancado";
import { TabelaDensa, type Coluna } from "@/components/ciaara/tabela-densa";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { indicadoresDaGrade } from "@/lib/dominio/indicadores-da-grade";
import { useParametro } from "@/lib/navegacao/usar-parametro";

import { CascataDeCursoETurma } from "./CascataDeCursoETurma";
import type { GradeDeDisciplinas as Grade, LinhaDaGradeDeDisciplinas } from "./consulta";
import { DetalheDaDisciplina } from "./paineis/DetalheDaDisciplina";
import { ProporcaoDaCarga } from "./paineis/ProporcaoDaCarga";

const ROTA = "/disciplinas";

export type PermissoesDaGrade = {
  readonly criar: boolean;
  readonly editar: boolean;
  readonly desativar: boolean;
};

/*
 * ⚠️ **ESTA TELA DEIXOU DE TER RECORTE POR TURMA EM 04/10/2026** (`FR-018` da spec 012). O que era
 *    ligado por um `porTurma` — três colunas, dois filtros, dois indicadores, os painéis de período
 *    e de instrutores e os sinais por linha — foi para a **ficha da turma**, que é o lugar da turma;
 *    e `/disciplinas?turma=` **redireciona** para lá.
 * ⚠️ **O `turma` SAIU DOS PARÂMETROS DESTA FOLHA, e não ficou como campo morto:** a página desvia
 *    antes de montar a grade, então nenhum valor de turma chega aqui. Campo que não pode receber
 *    valor é campo que a próxima edição tenta usar.
 */
export type ParametrosDaGrade = {
  readonly curso: string;
  readonly situacao: string;
  readonly busca: string;
  readonly aberta: string;
};

export function GradeDeDisciplinas({
  grade,
  parametros,
  permissoes,
  hoje,
}: {
  readonly grade: Grade;
  readonly parametros: ParametrosDaGrade;
  readonly permissoes: PermissoesDaGrade;
  readonly hoje: string;
}) {
  const [, definirSituacao] = useParametro(ROTA, "situacao");
  const [, definirBusca] = useParametro(ROTA, "busca");
  /*
   * ⚠️ **`aberta` É LIDA DO GANCHO, NÃO DA PROPRIEDADE DO SERVIDOR — e a distinção é o mecanismo.**
   *    Ela é parâmetro **visual** (`avisaServidor: false`): mudá-la escreve na URL e **não** refaz a
   *    leitura do servidor. Lendo de `parametros.aberta`, que vem do servidor, o valor nunca
   *    chegaria de volta — e o detalhe **não abriria**, com a URL certa. Medido: o e2e reprovou em
   *    13 casos com *"element(s) not found"*, que se lê como "o detalhe não existe".
   * ⚠️ Os filtros são o contrário: eles avisam o servidor, e por isso vêm das propriedades.
   */
  const [abertaNaUrl, definirAberta] = useParametro(ROTA, "aberta");

  /*
   * ⚠️ **AS LINHAS SÃO FILTRADAS UMA VEZ**, e tabela, indicadores e gráfico leem daqui. Ver o
   * cabeçalho: é isto que faz os três refletirem o mesmo subconjunto (`SC-011`).
   */
  const linhas = React.useMemo(() => {
    const busca = parametros.busca.trim().toLocaleLowerCase("pt-BR");
    return grade.linhas.filter((linha) => {
      if (parametros.situacao === "ativo" && !linha.ativa) return false;
      if (parametros.situacao === "inativo" && linha.ativa) return false;

      if (busca !== "") {
        const alvo = `${linha.codDisciplina} ${linha.nomeDisciplina}`.toLocaleLowerCase("pt-BR");
        if (!alvo.includes(busca)) return false;
      }

      return true;
    });
  }, [grade.linhas, parametros]);

  const indicadores = React.useMemo(
    () =>
      indicadoresDaGrade(
        linhas.map((l) => ({
          previstos: l.cargaHorariaTempos,
          executados: l.temposExecutados,
          previsaoTermino: l.previsaoTermino,
          instrutoresAtribuidos: l.instrutores.length,
        })),
        hoje,
      ),
    [linhas, hoje],
  );

  /*
   * ⚠️ **`curso` E `turma` NÃO ENTRAM NA CONTA DO BOTÃO**, e é a decisão que o `FR-054` fixa: eles
   * são **navegação**, não filtro. Limpar filtros e perder a turma em que se estava faria o botão
   * navegar — e quem clicou queria ver a lista inteira **daquela** turma.
   */
  const haFiltroAtivo = parametros.busca !== "" || parametros.situacao !== "ativo";

  const limparFiltros = () => {
    void definirBusca(null);
    void definirSituacao(null);
  };

  /*
   * ⚠️ **OS FILTROS VÃO PELO `FiltroAvancado`, o mesmo de `/cursos` e `/instrutores`.** Ele é o
   * componente único de filtro do sistema; construir campos à mão aqui repetiria o teclado, o
   * rótulo e o comportamento de limpar — e reprovaria a guarda do `SC-002`, que conta qualquer
   * escolha construída num arquivo que menciona instrutor.
   */
  const campos: readonly CampoDeFiltro[] = [
    {
      chave: "busca",
      rotulo: "Buscar",
      tipo: "texto",
    },
    {
      chave: "situacao",
      rotulo: "Situação do cadastro",
      tipo: "escolha",
      opcoes: [
        { valor: "ativo", rotulo: "Em oferta" },
        { valor: "inativo", rotulo: "Fora de oferta" },
      ],
    },
  ];

  const estadoDosFiltros: EstadoDeFiltro = {
    busca: parametros.busca === "" ? [] : [parametros.busca],
    situacao: [parametros.situacao],
  };

  const aoMudarFiltro = (proximo: EstadoDeFiltro) => {
    const escolha = (chave: string) => proximo[chave]?.[0] ?? null;
    // ⚠️ Só escreve o que mudou: reescrever os dois a cada clique faria um aviso inútil ao
    //    servidor, e cada um é uma leitura do banco.
    if (escolha("busca") !== (parametros.busca || null)) void definirBusca(escolha("busca"));
    if (escolha("situacao") !== parametros.situacao) void definirSituacao(escolha("situacao"));
  };

  const colunas: readonly Coluna<LinhaDaGradeDeDisciplinas>[] = [
    {
      chave: "cod",
      titulo: "Código",
      valor: (l) => l.codDisciplina,
      celula: (l) => <span className="font-mono text-xs">{l.codDisciplina}</span>,
    },
    {
      chave: "nome",
      titulo: "Disciplina",
      valor: (l) => l.nomeDisciplina,
      /*
       * ⚠️ **OS SINAIS POR LINHA — "sem instrutor", "sem previsão de início" — SAÍRAM DAQUI** e
       *    foram para a ficha da turma. Eles só acendiam com turma escolhida (`porTurma`), porque é
       *    por turma que se atribui instrutor e se marca período: no catálogo do curso eles seriam
       *    uma afirmação sobre dado que a tela não tem.
       */
      celula: (l) => (
        <span className="flex flex-col">
          <span className="text-texto whitespace-normal">{l.nomeDisciplina}</span>
          {!l.ativa ? (
            /* veste: rótulo de situação do cadastro */
            <span className="text-texto-tenue text-2xs">Fora de oferta</span>
          ) : null}
        </span>
      ),
    },
    {
      chave: "ch",
      titulo: "CH",
      numerica: true,
      valor: (l) => l.cargaHorariaTempos,
      celula: (l) => l.cargaHorariaTempos,
    },
    {
      chave: "unidades",
      titulo: "UEs",
      numerica: true,
      valor: (l) => l.unidades.filter((u) => u.ativa).length,
      celula: (l) => {
        const ativas = l.unidades.filter((u) => u.ativa).length;
        // ⚠️ Sem UE, a célula fica **vazia** — não "0". Ter UE é dado, e zero afirmaria que faltam
        //    (`FR-061`, D-B3).
        return ativas === 0 ? <span className="text-texto-tenue">—</span> : ativas;
      },
    },
  ];

  const aberta = String(abertaNaUrl);
  const abertas = aberta === "" ? [] : [aberta];

  return (
    <div className="flex flex-col gap-4" data-slot="grade-de-disciplinas">
      <CascataDeCursoETurma cursos={grade.cursos} cursoNoEndereco={parametros.curso} />

      {grade.cursoNaoAlcancado ? (
        <Alert data-slot="curso-fora-do-alcance">
          <AlertTitle>Este curso não está ao seu alcance</AlertTitle>
          <AlertDescription>
            O endereço aponta para um curso que não existe ou que o seu perfil não enxerga. Escolha
            um curso na lista acima.
          </AlertDescription>
        </Alert>
      ) : null}

      {!grade.cursoEscolhido ? (
        <EstadoVazio
          motivo="sem-dado"
          titulo="Escolha um curso"
          detalhe="A grade mostra as disciplinas de um curso. O período previsto e os instrutores de cada turma ficam na ficha da turma."
        />
      ) : (
        <>
          {/* ── indicadores ───────────────────────────────────────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-slot="indicadores">
            <Indicador rotulo="Disciplinas" valor={indicadores.disciplinas} />
            <Indicador rotulo="CH prevista (tempos)" valor={indicadores.chPrevistaTempos} />
            {/* ⚠️ **DEGRADA COM AVISO, não com zero** (`RN-DEG-01`, `FR-081`). "0 sem instrutor"
                aqui afirmaria que está tudo designado; o certo é dizer onde isso se decide — e
                desde 04/10/2026 o lugar é a ficha da turma. */}
            <div className="border-borda bg-superficie rounded-ciaara border p-3 sm:col-span-2">
              <p className="text-texto-suave text-sm">
                Instrutores, período e execução são <strong>por turma</strong>, e ficam na{" "}
                <strong>ficha da turma</strong>.
              </p>
            </div>
          </div>

          {/* ── filtros ───────────────────────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2" data-slot="filtros-da-grade">
            <FiltroAvancado
              campos={campos}
              estado={estadoDosFiltros}
              aoMudar={aoMudarFiltro}
              titulo="Filtros"
            />
            <BotaoLimparFiltros haFiltroAtivo={haFiltroAtivo} aoLimpar={limparFiltros} />
          </div>

          {/* ── gráfico ───────────────────────────────────────────────────────────────────── */}
          <ProporcaoDaCarga linhas={linhas} />

          {/* ── tabela ────────────────────────────────────────────────────────────────────── */}
          <TabelaDensa
            linhas={linhas}
            colunas={colunas}
            chaveLinha={(l) => l.codigo}
            rotulo={`Disciplinas de ${grade.cursoEscolhido.codigo}`}
            densidade="compacta"
            motivoDoVazio="sem-dado"
            aoAtivarLinha={(l) =>
              void definirAberta(parametros.aberta === l.codigo ? null : l.codigo)
            }
            abertas={abertas}
            detalhe={(l) => (
              <DetalheDaDisciplina
                linha={l}
                permissoes={permissoes}
                cursoId={grade.cursoEscolhido?.id ?? ""}
              />
            )}
          />
        </>
      )}
    </div>
  );
}

function Indicador({ rotulo, valor }: { readonly rotulo: string; readonly valor: number }) {
  return (
    <div className="border-borda bg-superficie rounded-ciaara border p-3">
      {/* veste: rótulo do indicador; o número ao lado é dado */}
      <p className="text-texto-tenue text-2xs uppercase">{rotulo}</p>
      <p className="text-texto text-xl font-semibold tabular-nums">{valor}</p>
    </div>
  );
}

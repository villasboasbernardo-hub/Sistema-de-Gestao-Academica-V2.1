/**
 * A seção de disciplinas da ficha da turma — **folha de cliente** (`FR-018`, `FR-030` da spec 012).
 *
 * ⚠️ **ESTE BLOCO MUDOU DE TELA EM 04/10/2026, E NÃO DE CÓDIGO.** Ele vinha de
 * `/disciplinas?curso=X&turma=Y`, onde era ligado por um `porTurma` que acendia três colunas e dois
 * painéis dentro de uma tela que, no resto do tempo, fala de **catálogo do curso**. A turma passou a
 * ter lugar próprio, e o recorte por turma foi para onde ele pertence — o endereço antigo
 * **redireciona** para cá.
 *
 * ⚠️ **OS PAINÉIS SÃO OS MESMOS ARQUIVOS, IMPORTADOS DE `app/(app)/disciplinas/paineis/`, e isso é
 * decisão, não preguiça.** Eles chamam Server Actions (`@/lib/acoes/disciplina`,
 * `@/lib/acoes/atribuicao`), e `components/` **não pode** importar ação — a guarda de fronteira
 * reprova. Copiá-los para cá daria o segundo lugar a divergir numa regra de rateio que já é delicada;
 * deixá-los onde estão e importá-los mantém **um** lugar.
 *
 * ⚠️ **O DADO VEM DE `lerGradeDeDisciplinas`, A MESMA FUNÇÃO DA OUTRA TELA**, e reaproveitá-la não é
 * economia: ela já lê os instrutores com `.order("ordem_antiguidade")`, que é o que a guarda da
 * `RN-ANT-01` cobra de **toda** leitura de lista de instrutor. Uma consulta nova aqui teria de
 * reescrever essa garantia — e é exatamente assim que uma regra de *Risco: Alto* ganha um segundo
 * lugar onde ser esquecida.
 *
 * ⚠️ **SÓ O QUE É POR TURMA ENTRA NO DETALHE.** Cadastro, exclusão e unidades de ensino são do
 * **curso** e seguem em `/disciplinas`: trazê-los para a ficha da turma faria editar o currículo de
 * dentro de uma tela que fala de uma turma só.
 */
"use client";

import { TabelaDensa, type Coluna } from "@/components/ciaara/tabela-densa";
import { percentualExecutado } from "@/lib/dominio/andamento-da-turma";
import { dataParaLeitura } from "@/lib/formato/data";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import {
  indicadoresDaGrade,
  ROTULO_DA_SITUACAO,
  situacaoDaExecucao,
} from "@/lib/dominio/indicadores-da-grade";
import { severidadeDaLinha, sinaisDaDisciplina } from "@/lib/dominio/sinalizacao-de-disciplina";
import { ROTA_DA_FICHA_DA_TURMA } from "@/lib/navegacao/endereco-de-turma";
import { useParametro } from "@/lib/navegacao/usar-parametro";

import type { LinhaDaGradeDeDisciplinas } from "../../disciplinas/consulta";
import { PainelDeInstrutores } from "../../disciplinas/paineis/PainelDeInstrutores";
import { PainelDePeriodo } from "../../disciplinas/paineis/PainelDePeriodo";

/*
 * ⚠️ **A CHAVE DA ROTA VEM DO MÓDULO DE ENDEREÇO, e não escrita aqui.** A guarda da `T070` reprova
 *    qualquer `"/turmas/…"` fora dele — e reprovou este arquivo em 04/10/2026, com razão: é o mesmo
 *    texto que o resto do sistema usa para chegar à ficha.
 */

/** O destaque da linha por severidade — só tokens do tema, nenhuma cor literal. */
const CLASSE_DA_SEVERIDADE: Readonly<Record<string, string>> = {
  alerta: "text-conflito-tinta",
  atencao: "text-atrasado-tinta",
  // veste: dica de estado — "sem previsão de início" é observação sobre a linha, não dado dela
  informativo: "text-texto-tenue",
};

function colunas(
  hoje: string,
  avisoInicioDias: number,
): readonly Coluna<LinhaDaGradeDeDisciplinas>[] {
  return [
    {
      chave: "disciplina",
      titulo: "Disciplina",
      ordenavel: true,
      valor: (l) => l.ordemSugerida ?? Number.MAX_SAFE_INTEGER,
      /*
       * ⚠️ **OS SINAIS VIERAM DE `/disciplinas` JUNTO COM O RESTO DO BLOCO.** Eles só acendiam com
       *    turma escolhida — é por turma que se atribui instrutor e se marca período —, e por isso o
       *    lugar deles é aqui. Deixá-los para trás teria sido **remover** função, não mover o bloco.
       */
      celula: (l) => {
        const sinais = sinaisDaDisciplina(
          { instrutoresAtribuidos: l.instrutores.length, previsaoInicio: l.previsaoInicio },
          avisoInicioDias,
          hoje,
        );
        const severidade = severidadeDaLinha(sinais);
        return (
          <span className="flex flex-col whitespace-normal">
            <span>
              {/* veste: o código da disciplina acompanha o nome, em tom secundário */}
              <span className="text-texto-suave">{l.codDisciplina}</span> {l.nomeDisciplina}
            </span>
            {severidade !== null ? (
              <span className={`text-2xs ${CLASSE_DA_SEVERIDADE[severidade] ?? ""}`}>
                {sinais.map((s) => s.texto).join(" ")}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      chave: "ch",
      titulo: "CH prevista (TA)",
      numerica: true,
      ordenavel: true,
      valor: (l) => l.cargaHorariaTempos,
      celula: (l) => l.cargaHorariaTempos,
    },
    /*
     * ⚠️ **AS DUAS COLUNAS NOVAS SÃO DO PR 3, E ELAS RESPONDEM A PERGUNTA QUE A GRADE NÃO RESPONDIA:**
     *    *"quanto desta disciplina já foi dado nesta turma?"*. O número vem de `temposExecutados`,
     *    que `vw_disciplinas_execucao` soma dos **lançamentos** (`RN-CRONOS-01`) — nada aqui planeja.
     */
    {
      chave: "executada",
      titulo: "CH executada (TA)",
      numerica: true,
      ordenavel: true,
      valor: (l) => l.temposExecutados,
      celula: (l) => l.temposExecutados,
    },
    {
      chave: "percentual",
      titulo: "%",
      numerica: true,
      ordenavel: true,
      /*
       * ⚠️ **SEM DENOMINADOR A ORDENAÇÃO PRECISA DE UM NÚMERO, E ELE É `-1` DE PROPÓSITO:** o
       *    percentual **não existe** quando a CH prevista é zero, e `0` o faria ordenar junto com a
       *    disciplina que tem previsão e não começou. `-1` o manda para o extremo, onde a ausência
       *    fica visível em vez de se misturar com o zero.
       */
      valor: (l) => percentualExecutado(l.cargaHorariaTempos, l.temposExecutados) ?? -1,
      celula: (l) => {
        const pct = percentualExecutado(l.cargaHorariaTempos, l.temposExecutados);
        /* veste: dica de ausência — a disciplina sem CH prevista não tem percentual, e não tem 0 % */
        return pct === null ? <span className="text-texto-tenue">—</span> : `${pct} %`;
      },
    },
    {
      chave: "periodo",
      titulo: "Período previsto",
      ordenavel: true,
      valor: (l) => l.previsaoInicio ?? "",
      /*
       * ⚠️ **O `valor` ACIMA É CHAVE DE ORDENAÇÃO E FICA EM ISO; a `celula` é EXIBIÇÃO e vira
       *    `DD/MM/AAAA`.** Os dois leem o mesmo campo, a três linhas de distância: trocar o de cima
       *    faria a tabela ordenar por DIA, sem erro nenhum e sem teste que acuse.
       */
      celula: (l) =>
        l.previsaoInicio === null ? (
          /* veste: dica de ausência — "—" sozinho não distingue vazio de zero */
          <span className="text-texto-tenue">não informado</span>
        ) : (
          <span>
            {dataParaLeitura(l.previsaoInicio)}
            {l.previsaoTermino ? ` a ${dataParaLeitura(l.previsaoTermino)}` : ""}
          </span>
        ),
    },
    {
      chave: "instrutores",
      titulo: "Instrutores",
      ordenavel: true,
      valor: (l) => l.instrutores.length,
      celula: (l) =>
        l.instrutores.length === 0 ? (
          <span className="text-conflito-tinta text-xs">nenhum</span>
        ) : (
          <span className="text-xs whitespace-normal">
            {l.instrutores
              .map((i) =>
                i.temposPrevistos === null ? i.nome : `${i.nome} (${i.temposPrevistos})`,
              )
              .join(" · ")}
          </span>
        ),
    },
    {
      chave: "situacao",
      titulo: "Situação",
      ordenavel: true,
      valor: (l) =>
        ROTULO_DA_SITUACAO[
          situacaoDaExecucao(
            {
              previstos: l.cargaHorariaTempos,
              executados: l.temposExecutados,
              previsaoTermino: l.previsaoTermino,
            },
            hoje,
          )
        ],
      celula: (l) =>
        ROTULO_DA_SITUACAO[
          situacaoDaExecucao(
            {
              previstos: l.cargaHorariaTempos,
              executados: l.temposExecutados,
              previsaoTermino: l.previsaoTermino,
            },
            hoje,
          )
        ],
    },
  ];
}

export function DisciplinasDaTurma({
  linhas,
  turmaCodigo,
  escala,
  podeEditar,
  avisoInicioDias,
  hoje,
  abertaNoEndereco,
  executadaDaTurma,
}: {
  readonly linhas: readonly LinhaDaGradeDeDisciplinas[];
  readonly turmaCodigo: string;
  readonly escala: EscalaDeAntiguidade;
  readonly podeEditar: boolean;
  /** Quantos dias antes do início a disciplina sem instrutor passa a avisar — de `config_parametros`. */
  readonly avisoInicioDias: number;
  readonly hoje: string;
  readonly abertaNoEndereco: string;
  /**
   * A CH executada da **turma inteira**, de `vw_carga_horaria_turma` — a mesma que a seção Andamento
   * mostra. Ela entra aqui para o rodapé poder dizer **quanto não aparece** por disciplina.
   */
  readonly executadaDaTurma: number;
}) {
  /*
   * ⚠️ **`aberta` VEM DO GANCHO, NUNCA DA PROPRIEDADE DO SERVIDOR, e isso foi medido na fatia (b):**
   *    é parâmetro **visual** (`avisaServidor: false`), e lido do servidor o detalhe **nunca abria**,
   *    com a URL certa. O valor do servidor serve só ao primeiro desenho.
   */
  const [aberta, definirAberta] = useParametro(ROTA_DA_FICHA_DA_TURMA, "aberta");
  const atual = aberta === "" ? abertaNoEndereco : aberta;
  const abertas = atual === "" ? [] : [atual];

  /*
   * ⚠️ **OS DOIS INDICADORES TAMBÉM VIERAM DE `/disciplinas`**, onde eram os únicos que dependiam de
   *    turma escolhida. "Sem instrutor" é a pergunta que quem olha a grade de uma turma faz primeiro,
   *    e no catálogo do curso ela não tinha resposta — era um aviso no lugar de um número.
   */
  const indicadores = indicadoresDaGrade(
    linhas.map((l) => ({
      previstos: l.cargaHorariaTempos,
      executados: l.temposExecutados,
      previsaoTermino: l.previsaoTermino,
      instrutoresAtribuidos: l.instrutores.length,
    })),
    hoje,
  );

  /*
   * ⚠️ **A DIFERENÇA É SUBTRAÇÃO DE DUAS LEITURAS, E NÃO UMA REGRA**: o total da turma menos o que
   *    as disciplinas conseguem explicar. Ela não mora em `lib/dominio/` porque não há regra a
   *    preservar aqui — há duas views com grãos diferentes, e a tela diz qual é o resto.
   */
  const semUnidadeDeEnsino = Math.max(executadaDaTurma - indicadores.chCumpridaTempos, 0);

  return (
    <div className="flex flex-col gap-2">
      {/* veste: os rótulos dos indicadores da grade desta turma; os números ao lado são dado */}
      <p className="text-texto-suave text-sm" data-slot="indicadores-da-turma">
        {/* veste: rótulo do indicador; o número ao lado é dado */}
        <span className="text-texto-tenue">Disciplinas na grade:</span> {indicadores.disciplinas}
        {" · "}
        {/* veste: rótulo do indicador; o número ao lado é dado */}
        <span className="text-texto-tenue">sem instrutor:</span>{" "}
        <span className={indicadores.semInstrutor > 0 ? "text-conflito-tinta" : undefined}>
          {indicadores.semInstrutor}
        </span>
        {" · "}
        {/* veste: rótulo do indicador; o número ao lado é dado */}
        <span className="text-texto-tenue">CH prevista (TA):</span> {indicadores.chPrevistaTempos}
      </p>

      <TabelaDensa
        rotulo={`Disciplinas de ${turmaCodigo}`}
        linhas={linhas}
        colunas={colunas(hoje, avisoInicioDias)}
        chaveLinha={(l) => l.codigo}
        densidade="compacta"
        motivoDoVazio="sem-dado"
        aoAtivarLinha={(l) => void definirAberta(atual === l.codigo ? null : l.codigo)}
        abertas={abertas}
        detalhe={(l) =>
          l.turmaDisciplinaId === null ? (
            <p className="text-texto-suave text-sm" data-slot="sem-linha-de-turma">
              Esta disciplina não está na grade desta turma.
            </p>
          ) : (
            /*
             * ⚠️ **O INVÓLUCRO EXISTE PARA O TESTE PODER ESPERAR POR ELE, e isso não é enfeite.** Os
             *    percursos de ponta a ponta precisam de um sinal de que o detalhe **terminou de
             *    desenhar** antes de clicar dentro dele; sem um alvo estável, o jeito seria esperar
             *    por tempo — e teste que decide por tempo não prova nada (achado 9 do Épico 3). É o
             *    mesmo papel do `detalhe-da-disciplina` na tela de disciplinas, com nome próprio
             *    porque o conteúdo aqui é só o que é por turma.
             */
            <div className="flex flex-col gap-4" data-slot="detalhe-da-disciplina-da-turma">
              <PainelDePeriodo
                turmaDisciplinaId={l.turmaDisciplinaId}
                previsaoInicio={l.previsaoInicio}
                previsaoTermino={l.previsaoTermino}
                podeEditar={podeEditar}
              />

              <PainelDeInstrutores
                turmaDisciplinaId={l.turmaDisciplinaId}
                cargaHorariaTempos={l.cargaHorariaTempos}
                modoDaDisciplina={l.modoAtribuicaoPadrao}
                atribuidos={l.instrutores}
                habilitados={l.habilitados}
                unidades={l.unidades}
                escala={escala}
                podeEditar={podeEditar}
              />
            </div>
          )
        }
      />

      {/*
        ⚠️ **O RODAPÉ EXISTE PARA SER CONFERIDO CONTRA A SEÇÃO ANDAMENTO** (`SC-005`, cenário 7): as
           duas partes da tela somam execução por caminhos diferentes, e quem olha tem direito de
           comparar uma com a outra sem abrir o banco.
        ⚠️ **ELAS PODEM NÃO FECHAR POR DOIS MOTIVOS DE DESENHO, E OS DOIS ESTÃO MEDIDOS** — nenhum
           deles é defeito, e é por isso que o rótulo diz **«nesta grade»**:

           | Diferença | Por quê |
           |---|---|
           | a **prevista** do Andamento é maior | `vw_carga_horaria_turma.chr_curricular` soma a CH de **todas as disciplinas ativas do CURSO** (medido na definição da view, 04/10/2026), e a grade desta turma pode não ter todas — a base real tem 210 linhas de `turma_disciplina` para 175 disciplinas em 28 turmas |
           | a **executada** por disciplina é menor | `vw_disciplinas_execucao` soma por **unidade de ensino**, e lançamento com `unidade_ensino_id` nula entra no total da turma e **não** entra em disciplina nenhuma. As 1.566 linhas do ETL estão nesse estado, ratificado por Bernardo em 08/09/2026 (*"o ETL deve ser o retrato fiel da origem, sem preenchimentos inventados"*) |

        ⚠️ **A SEGUNDA É DITA NA TELA, COM O NÚMERO; A PRIMEIRA, NO RÓTULO.** Preencher a UE é a
           aplicação do cruzamento, pendência do Épico 2 — não desta fatia —, e inventar uma regra
           para a primeira seria criar regra de negócio nova, que este épico não faz.
        ⚠️ **A FRASE SÓ APARECE COM DIFERENÇA POSITIVA.** Diferença negativa seria soma por
           disciplina maior que a da turma, que não é o caso conhecido; afirmar sobre ela aqui seria
           inventar explicação para o que não foi medido.
        ⚠️ **E O CASO POSITIVO DELA NÃO É SEMEÁVEL EM TESTE:** a catraca `reg_aula_ue_so_nula_no_historico`
           **recusa** lançamento novo sem unidade de ensino, de propósito, e só as linhas migradas a
           têm nula. Ele se observa no banco **local**, com a carga do ETL — está no roteiro de
           conferência do PR 3.
      */}
      <p className="text-texto-suave text-sm" data-slot="rodape-das-disciplinas">
        {/* veste: rótulo da soma; o número ao lado é dado */}
        <span className="text-texto-tenue">Σ nesta grade — CH prevista:</span>{" "}
        <span data-rodape="prevista">{indicadores.chPrevistaTempos}</span> TA
        {" · "}
        {/* veste: rótulo da soma; o número ao lado é dado */}
        <span className="text-texto-tenue">CH executada:</span>{" "}
        <span data-rodape="executada">{indicadores.chCumpridaTempos}</span> TA
      </p>

      {semUnidadeDeEnsino > 0 ? (
        <p className="text-atrasado-tinta text-sm" data-slot="lancamentos-sem-unidade">
          {semUnidadeDeEnsino} TA lançados sem unidade de ensino não aparecem por disciplina.
        </p>
      ) : null}
    </div>
  );
}

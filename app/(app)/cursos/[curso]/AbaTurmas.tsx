/**
 * A aba **Turmas** — a turma selecionada e a lista de turmas do curso (`FR-006.2`, `FR-006.3`,
 * `FR-028.1`, `FR-047`).
 *
 * ⚠️ **ERA A ABA "GRADE" ATÉ O BLOCO 7** (spec 022, FR-005.1; pedido de Bernardo Villas Boas, 22/10/2026: *"aba Grade
 * passa a TURMAS e concentra as turmas do curso"*). O endereço antigo `?aba=grade` redireciona para `?aba=turmas` (D-12),
 * e a lista sai na ordem única de turmas (`emOrdemDeTurma`, FR-003): o ano mais recente primeiro, depois o código.
 *
 * ⚠️ **SEM PROGRESSO POR DISCIPLINA NESTA FATIA** — o `FR-009` foi **cortado** em 17/09/2026 pela
 * linha de corte do `FR-009.1`. O que entra aqui é a identificação da turma e a lista; o progresso
 * nasce com a fatia que o recebeu.
 *
 * ⚠️ **A SALA DE CADA TURMA APARECE NA LISTA** *(decisão de Bernardo Villas Boas, 23/09/2026)*. Ela é
 * o dado que se confere de relance — "onde essa turma vai acontecer" —, e até aqui só existia como
 * ausência, no aviso `sem_sala`. Turma sem sala mostra o traço, e o aviso continua contando.
 *
 * ⚠️ **CURSO SEM TURMA NÃO VIRA BECO** (`FR-006.3`): o botão de nova turma fica **fora** da lista, e
 * por isso continua alcançável quando a lista está vazia. Escondê-lo atrás da lista faria o único
 * caminho de saída desaparecer justo no estado em que ele é necessário.
 *
 * ⚠️ **AS AÇÕES DA LINHA** (spec 025, Bloco 10, item 2; RT-2): *Editar* (a página de edição), *Arquivar* ou *Desarquivar*
 * e *Excluir*, na última coluna, cada um pela permissão e pela regra da ficha — a arquivada não se edita nem se exclui,
 * e a turma com registro mostra o *Excluir* desabilitado com a dica (D-COR-6). Os impedimentos chegam numa ida ao banco
 * só, lida pela página.
 *
 * ⚠️ **SÓ AS TURMAS DO ANO ESCOLHIDO** (RT-6, D-26): a página já as recorta.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** O seletor de turma e as ações da linha são folhas.
 */
import type * as React from "react";

import Link from "next/link";

import { BadgeStatus } from "@/components/ciaara/badge-status";
import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import {
  ExclusaoPermanente,
  type ExclusaoPermanenteProps,
} from "@/components/ciaara/exclusao-permanente";
import { Button } from "@/components/ui/button";
import { avisosDaTurma, type TurmaParaAvisos } from "@/lib/dominio/avisos-da-turma";
import type { EstadoDaExclusao } from "@/lib/dominio/exclusao-permanente";
import { emOrdemDeTurma } from "@/lib/dominio/ordem-de-cursos";
import { dataParaLeitura } from "@/lib/formato/data";
import {
  ordenarTurmasParaSeletor,
  ROTULO_DO_STATUS_DE_TURMA,
  rotuloDaTurma,
  TOM_DO_STATUS_DE_TURMA,
} from "@/lib/dominio/seletor-de-turma";
import {
  enderecoDaSecaoDeDisciplinas,
  enderecoDasDisciplinas,
  enderecoDasTurmas,
  enderecoDaEdicaoDaTurma,
  enderecoDaTurma,
} from "@/lib/navegacao/endereco-de-turma";

import { ArquivarTurma } from "../../turmas/[turma]/ArquivarTurma";
import { SeletorDeTurmaNaUrl } from "./SeletorDeTurmaNaUrl";

export type TurmaDaAba = TurmaParaAvisos & {
  readonly id: string;
  readonly codigo: string;
  readonly rotulo: string | null;
  readonly ano: number;
  /** Spec 021 (RC-9, RC-12): "Currículo N (vigência AAAA)" — o currículo que a turma segue. */
  readonly curriculo: string | null;
  /** Spec 021 (RC-9): a arquivada aparece na lista, para consulta; o seletor continua sem ela (C-24 da spec 017). */
  readonly arquivada: boolean;
};

/*
 * ⚠️ **O MAPA DE TONS SAIU DAQUI EM 04/10/2026 e foi para `lib/dominio/seletor-de-turma.ts`**, ao lado
 *    dos rótulos, quando a lista de turmas passou a precisar dele. Copiá-lo seria o segundo lugar a
 *    divergir — o mesmo erro do botão de limpar filtros, que nasceu solto numa tela.
 */

const traco = (v: string | null) => (v === null || v.trim() === "" ? "—" : v);

/** As ações da linha (spec 025, item 2): o que cada perfil pode, decidido na página, e a ação de excluir. */
export type AcoesDasTurmas = {
  /** `turmas.editar` com o curso em oferta. */
  readonly podeEditar: boolean;
  /** O trio do arquivamento (`arquivamento_de_turma.editar`). */
  readonly podeArquivar: boolean;
  /** `turmas.criar` — quem exclui (D-9). */
  readonly podeExcluir: boolean;
  /** O estado do *Excluir* de cada turma, pelo `id`; ausente = não lido (desabilitado, D-13). */
  readonly exclusao: Readonly<Record<string, EstadoDaExclusao>>;
  readonly excluir: ExclusaoPermanenteProps["excluir"];
};

const SEM_LEITURA: EstadoDaExclusao = {
  liberada: false,
  dica: "não foi possível conferir os registros",
  detalhe: null,
};

/**
 * O rótulo de um campo e o cabeçalho de uma coluna — **os dois únicos usos de `--texto-tenue` aqui**.
 *
 * ⚠️ O token veste **rótulo e cabeçalho**, nunca valor (`FR-031`). Funilar os dois por estes dois
 * componentes deixa a regra num lugar só, em vez de num comentário repetido em cada `<span>`.
 */
function Rotulo({ children }: { readonly children: React.ReactNode }) {
  return <span className="text-texto-tenue">{children}</span>;
}

function Th({ children }: { readonly children: React.ReactNode }) {
  return (
    // veste: o cabeçalho da coluna; as células abaixo são dado
    <th scope="col" className="text-texto-tenue py-1 font-normal">
      {children}
    </th>
  );
}

/**
 * A janela em uma linha. Ponta ausente vira traço — nunca uma data inventada.
 *
 * ⚠️ `dataParaLeitura` JÁ DEVOLVE O TRAÇO para vazio e nulo, então encadeá-la com o `traco` local
 *    seria redundante: ela sozinha faz as duas coisas (`DD/MM/AAAA` desde 05/10/2026).
 */
function janela(t: TurmaDaAba): string {
  if (t.dataInicio === null && t.dataTermino === null) return "—";
  return `${dataParaLeitura(t.dataInicio)} a ${dataParaLeitura(t.dataTermino)}`;
}

export function AbaTurmas({
  sigla,
  turmas,
  selecionada,
  hoje,
  avisoDaSelecao,
  motivoDoVazio,
  acoes,
  ano,
}: {
  readonly sigla: string;
  readonly turmas: readonly TurmaDaAba[];
  readonly selecionada: string | null;
  readonly hoje: string;
  readonly avisoDaSelecao: string | null;
  /** Qual dos três vazios do `FR-047` mostrar quando não há turma. */
  readonly motivoDoVazio: "nao-ha" | "nao-ve" | "ainda-nao-existe" | "nenhuma-no-ano" | null;
  readonly acoes?: AcoesDasTurmas;
  /** O ano escolhido (RT-6): a lista só tem as turmas dele. */
  readonly ano?: number;
}) {
  const comAcoes =
    acoes !== undefined && (acoes.podeEditar || acoes.podeArquivar || acoes.podeExcluir);
  const turmaAtual = turmas.find((t) => t.codigo === selecionada) ?? null;
  /* Spec 022 (FR-003): a lista na ordem única — num curso só, o ano mais recente primeiro e depois o código. */
  const naOrdem = emOrdemDeTurma(
    turmas.map((t) => ({ ...t, cursoCodigo: sigla, cursoClassificacao: null })),
  );
  const doSeletor = turmas.filter((t) => !t.arquivada);

  /*
   * ⚠️ *NOVA TURMA* SAIU DAQUI EM 17/10/2026 (spec 016, FR-006.1): mora na barra única do topo da
   *    página (`BarraDoCurso.tsx`), que se vê em qualquer aba — com *Sobre o Curso* como padrão, um
   *    botão dentro da Grade ficaria escondido de quem abre o curso.
   */

  /*
   * ⚠️ **O CAMINHO CLICÁVEL PARA AS DISCIPLINAS** (fatia (b), 29/09/2026). *Tela sem caminho clicável
   *    é tela NÃO ENTREGUE*: `/disciplinas` tem a entrada do menu, mas chegar lá **com o curso já
   *    escolhido** é o percurso de quem está olhando a grade — e sem ele a pessoa reescolheria.
   * ⚠️ **SEM PERMISSÃO PRÓPRIA:** o botão segue a permissão da página de DESTINO, que é a leitura de
   *    disciplinas — a mesma que já deixou esta pessoa ver o curso. Uma regra própria aqui seria a
   *    segunda a divergir.
   * ⚠️ **O DESTINO MUDOU EM 04/10/2026, e o botão não:** com turma escolhida ele leva à **seção de
   *    disciplinas da ficha daquela turma**, porque o recorte por turma saiu de `/disciplinas` e
   *    passou a morar lá (`FR-018` da spec 012). Sem turma, continua levando ao catálogo do curso.
   *    Mandá-lo para `/disciplinas?turma=` funcionaria — aquele endereço redireciona — mas faria o
   *    clique dar **dois saltos** e passar por um redirecionamento que existe para link antigo, não
   *    para navegação nova.
   * ⚠️ **E DESDE O BLOCO 3 (spec 018), SEM TURMA ELE LEVA À ABA *Disciplinas* DESTE CURSO** — o catálogo saiu de
   *    `/disciplinas` e passou a morar aqui, numa aba.
   */
  const botaoDeDisciplinas = (
    <Button asChild size="sm" variant="outline">
      <Link
        href={
          turmaAtual
            ? enderecoDaSecaoDeDisciplinas(turmaAtual.codigo)
            : enderecoDasDisciplinas(sigla)
        }
        data-slot="ir-para-disciplinas"
      >
        Disciplinas
      </Link>
    </Button>
  );

  /*
   * ⚠️ **"VER TODAS AS TURMAS" É O CAMINHO QUE FALTAVA NA DIREÇÃO CONTRÁRIA** (`FR-017` da spec 012).
   *    A aba mostra as turmas **deste** curso; quem quer comparar com as de outro não tinha por onde
   *    sair sem voltar ao menu. O link leva à lista **já recortada por este curso**, que é o estado
   *    em que a pessoa está — e de lá ela afrouxa o filtro se quiser.
   */
  const linkDeTodasAsTurmas = (
    <Link
      href={enderecoDasTurmas(sigla)}
      data-slot="ver-todas-as-turmas"
      className="text-marca text-sm underline-offset-2 hover:underline"
    >
      Ver todas as turmas
    </Link>
  );

  return (
    <div className="flex flex-col gap-4" data-slot="aba-turmas">
      {avisoDaSelecao ? (
        <p role="status" className="text-atrasado-tinta text-sm" data-slot="aviso-da-selecao">
          {avisoDaSelecao}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        {doSeletor.length > 1 ? (
          /*
           * ⚠️ A ORDEM É A DO `FR-035`, e ela vem de `lib/dominio/` — ano ↓, início ↓ com sem data
           *    por último, código. O componente canônico **exibe** a lista como ela chega
           *    (`FR-033`); quem ordena é quem chama, e é aqui.
           * ⚠️ E O RÓTULO É `código · Status` (`FR-034`), nunca a `vw_turmas_rotulo`, que devolve
           *    nulo em 18 das 28 turmas.
           */
          <SeletorDeTurmaNaUrl
            turmas={ordenarTurmasParaSeletor(
              doSeletor.map((t) => ({
                codigo: t.codigo,
                ano: t.ano,
                dataInicio: t.dataInicio,
                status: t.status,
              })),
            ).map((t) => ({ id: t.codigo, rotulo: rotuloDaTurma(t) }))}
            selecionada={selecionada}
          />
        ) : null}
        {botaoDeDisciplinas}
        {linkDeTodasAsTurmas}
      </div>

      {turmaAtual ? (
        <section
          aria-label={`Turma ${turmaAtual.codigo}`}
          data-slot="turma-selecionada"
          data-turma={turmaAtual.codigo}
          className="border-borda bg-superficie rounded-ciaara flex flex-wrap gap-x-6 gap-y-2 border p-3"
        >
          <p className="text-sm">
            <Rotulo>Situação:</Rotulo>{" "}
            <span className="text-texto">
              {ROTULO_DO_STATUS_DE_TURMA[turmaAtual.status] ?? turmaAtual.status}
            </span>
          </p>
          <p className="text-sm">
            <Rotulo>Janela:</Rotulo> <span className="text-texto">{janela(turmaAtual)}</span>
          </p>
          <p className="text-sm">
            <Rotulo>Sala:</Rotulo>{" "}
            <span className="text-texto" data-slot="sala-da-turma">
              {traco(turmaAtual.sala)}
            </span>
          </p>
          <p className="text-sm">
            <Rotulo>Currículo:</Rotulo>{" "}
            <span className="text-texto" data-slot="curriculo-da-turma">
              {traco(turmaAtual.curriculo)}
            </span>
          </p>
          <p className="text-sm">
            <Rotulo>Efetivo:</Rotulo>{" "}
            <span className="text-texto">
              {turmaAtual.alunos === null ? "—" : String(turmaAtual.alunos)}
            </span>
          </p>
        </section>
      ) : null}

      {turmas.length === 0 ? (
        <EstadoVazio
          motivo={motivoDoVazio === "nao-ve" ? "sem-permissao" : "sem-dado"}
          titulo={
            motivoDoVazio === "nao-ve"
              ? "Você não alcança as turmas deste curso"
              : motivoDoVazio === "ainda-nao-existe"
                ? "Ainda não há turma no sistema"
                : motivoDoVazio === "nenhuma-no-ano"
                  ? `Este curso não tem turma em ${ano ?? ""}`.trim()
                  : "Este curso ainda não tem turma"
          }
          detalhe={
            motivoDoVazio === "nao-ve"
              ? "Existe turma aqui — o seu perfil não alcança."
              : motivoDoVazio === "nenhuma-no-ano"
                ? "As turmas de outros anos aparecem trocando o ano, no canto superior direito."
                : "Crie a primeira turma pelo botão Nova turma, no topo da página."
          }
        />
      ) : (
        <table
          className="w-full border-collapse text-sm"
          data-slot="turmas-do-curso"
          aria-label="Turmas do curso"
        >
          <thead>
            <tr className="border-borda border-b text-left">
              <Th>Turma</Th>
              <Th>Ano</Th>
              <Th>Situação</Th>
              <Th>Currículo</Th>
              <Th>Janela</Th>
              <Th>Sala</Th>
              <Th>Avisos</Th>
              {comAcoes ? (
                <th scope="col" className="py-1">
                  <span className="sr-only">Ações</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {naOrdem.map((t) => {
              const avisos = avisosDaTurma(t, hoje);
              return (
                <tr key={t.codigo} className="border-borda border-b" data-linha-turma={t.codigo}>
                  <td className="py-1">
                    <Link
                      href={enderecoDaTurma(t.codigo)}
                      className="text-texto underline-offset-2 hover:underline"
                      data-slot="link-da-turma"
                    >
                      {t.codigo}
                    </Link>
                  </td>
                  <td className="text-texto py-1">{t.ano}</td>
                  <td className="py-1">
                    <BadgeStatus
                      tom={TOM_DO_STATUS_DE_TURMA[t.status] ?? "planejado"}
                      rotulo={ROTULO_DO_STATUS_DE_TURMA[t.status] ?? t.status}
                    />
                    {t.arquivada ? (
                      <span className="text-texto-suave ml-2 text-xs" data-slot="turma-arquivada">
                        Arquivada
                      </span>
                    ) : null}
                  </td>
                  <td className="text-texto py-1" data-slot="curriculo-na-lista">
                    {traco(t.curriculo)}
                  </td>
                  <td className="text-texto py-1">{janela(t)}</td>
                  <td className="text-texto py-1" data-slot="sala-na-lista">
                    {traco(t.sala)}
                  </td>
                  <td className="text-texto py-1" data-slot="contagem-de-avisos">
                    {avisos.length}
                  </td>
                  {comAcoes && acoes ? (
                    <td className="py-1">
                      <span className="flex justify-end gap-1" data-slot="acoes-da-turma">
                        {acoes.podeEditar && !t.arquivada ? (
                          <BotaoDeIcone
                            acao="editar"
                            rotulo={`Editar a turma ${t.codigo}`}
                            variante="fantasma"
                            className="size-7"
                            href={enderecoDaEdicaoDaTurma(t.codigo)}
                            data-slot="editar-da-linha"
                          />
                        ) : null}
                        {acoes.podeArquivar ? (
                          <ArquivarTurma
                            codigo={t.codigo}
                            situacao={t.status}
                            arquivada={t.arquivada}
                            naLista
                          />
                        ) : null}
                        {acoes.podeExcluir ? (
                          <ExclusaoPermanente
                            id={t.id}
                            codigo={t.codigo}
                            nomeDoCodigo="o código da turma"
                            rotulo={`Excluir a turma ${t.codigo}`}
                            titulo={`Excluir a turma ${t.codigo} permanentemente?`}
                            consequencia="A turma sai do sistema, com as linhas da grade, as atribuições de instrutor e o rateio. Só é possível porque ela não tem registro."
                            estado={acoes.exclusao[t.id] ?? SEM_LEITURA}
                            excluir={acoes.excluir}
                            naLinha
                            slot="excluir-da-linha"
                          />
                        ) : null}
                      </span>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

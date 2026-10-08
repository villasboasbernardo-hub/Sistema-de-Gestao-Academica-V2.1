/**
 * O painel que junta a grade ao formulário e às ações do bloco (`RF-DSA-04`, `RF-DSA-07`, `Q-7`,
 * `Q-12` · spec 013, PR 2 e PR 4).
 *
 * ⚠️ **FOLHA DE CLIENTE, DECLARADA.** Ele guarda **só** o que está escolhido — célula livre ou
 * fato — , estado efêmero de tela que o guia manda deixar fora da URL: a célula selecionada não é
 * recorte compartilhável, e pô-la no endereço faria um link abrir um formulário.
 *
 * ⚠️ **A GRADE CONTINUA RECEBENDO A `Semana` PRONTA.** Este painel não lê banco e não calcula nada:
 * a página montou a semana no servidor e passou por propriedade. O que ele acrescenta é o clique.
 *
 * ⚠️ **AS CINCO AÇÕES CHEGAM POR PROPRIEDADE**, nunca por `import` de `@/lib/acoes/` — é a
 * proibição do Princípio XI, que as guardas de fronteira impõem.
 *
 * ⚠️ **ARRASTAR E O TECLADO CHEGAM À MESMA `mover`** (`RF-DSA-07`): o arrastar passa pela grade e o
 * teclado pelo painel de ações, e os dois chamam a **mesma** Server Action. Dois caminhos de
 * gravação seriam duas regras de teto, e uma delas esqueceria o TFM.
 *
 * ⚠️ **O EDITOR E O FORMULÁRIO ABREM NUM DIÁLOGO, e é ESTA a correção do item 2 de 08/10/2026**
 * *(«não consigo editar o total de TA de uma disciplina no dia»)*. Medido pela tela: a edição GRAVAVA
 * — o banco ficava certo —, mas o painel era desenhado ABAIXO da grade inteira, e na grade do modelo
 * v4 (nove tempos, cartões de várias linhas) ele abria fora da área visível: quem clicava num cartão
 * do alto não via nada acontecer. ⚠️ **O teste não via porque o Playwright rola sozinho** até o
 * elemento antes de agir; o caso novo confere `toBeInViewport`. Num diálogo o painel aparece onde a
 * pessoa está, e ao fechar o cartão atualizado está no mesmo lugar em que ela clicou.
 */
"use client";

import * as React from "react";

import { GradeDsa } from "@/components/ciaara/grade-dsa";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import type { Semana } from "@/lib/dominio/dsa/grade";
import type { GradeDoPapel } from "@/lib/dominio/dsa/grade-do-papel";
import { temposParaEscolher } from "@/lib/dominio/dsa/tempos-do-dia";
import type { InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";
import { dataComDiaDaSemana } from "@/lib/formato/data";

import { AcoesDoBloco, type FatoEscolhido } from "./AcoesDoBloco";
import {
  FormularioDeLancamento,
  type AvaliacaoOferecida,
  type DisciplinaOferecida,
  type ResultadoDaAcao,
  type UnidadeOferecida,
} from "./FormularioDeLancamento";

export type ResultadoDoEstudoIndividual =
  | { readonly ok: true; readonly criados: number; readonly pulados: readonly string[] }
  | { readonly ok: false; readonly mensagem: string };

export type PainelDeLancamentoProps = {
  readonly semana: Semana;
  /** A grade do modelo v4 — a MESMA montagem do `/print/dsa` (`montarDocumentoDoDsa`). */
  readonly grade: GradeDoPapel | null;
  /** As disciplinas do quadro de CH, para o nome no título do cartão. */
  readonly disciplinasDaSemana: readonly { readonly codigo: string; readonly nome: string }[];
  readonly turmaId: string;
  readonly cursoId: string;
  readonly salaDaTurma: string | null;
  readonly ano: number;
  readonly numeroDaSemana: number;
  readonly podeLancar: boolean;
  readonly unidades: readonly UnidadeOferecida[];
  readonly disciplinas: readonly DisciplinaOferecida[];
  readonly avaliacoesParaVista: readonly AvaliacaoOferecida[];
  readonly instrutores: readonly InstrutorParaExibir[];
  readonly escala: EscalaDeAntiguidade;
  readonly tecnicas: readonly string[];
  readonly tiposDeAvaliacao: readonly string[];
  readonly subtipos: readonly { readonly valor: string; readonly categoria: string | null }[];
  readonly lancar: (entrada: unknown) => Promise<ResultadoDaAcao>;
  readonly lancarEstudoIndividual: (entrada: unknown) => Promise<ResultadoDoEstudoIndividual>;
  /** As três do PR 4 — ausentes, a grade fica só de leitura. */
  readonly mover?: (entrada: unknown) => Promise<ResultadoDaAcao>;
  /** O cartão único (ajuste 1 do PR #40): tudo de um lançamento, numa gravação. */
  readonly atualizar?: (entrada: unknown) => Promise<ResultadoDaAcao>;
  readonly excluir?: (entrada: unknown) => Promise<ResultadoDaAcao>;
};

/**
 * Acha o fato na semana, pelo identificador — nas células **e** na faixa "Sem posição".
 *
 * ⚠️ **ELE PROCURA NOS DOIS LUGARES, e a faixa é metade do ponto** (`Q-12`): as 1.566 linhas do ETL
 * estão todas sem TA, então a faixa é onde o histórico mora. Procurar só nas células faria
 * *"posicionar"* não achar nada justamente no caso que a decisão criou.
 */
function fatoDaSemana(semana: Semana, fatoId: string): FatoEscolhido | null {
  for (const dia of semana.dias) {
    for (const celula of dia.celulas) {
      const bloco = celula.bloco;
      if (bloco && bloco.fatoId === fatoId) {
        return {
          fatoId: bloco.fatoId,
          origem: bloco.origem,
          data: bloco.data,
          taInicial: bloco.taInicial,
          tempos: bloco.tempos,
          disciplina: bloco.disciplina,
          conteudo: bloco.conteudo,
          local: bloco.local,
          tecnica: bloco.tecnica,
          instrutor: bloco.instrutor,
          herdado: bloco.herdado,
          gravado: bloco.gravado,
          semPosicao: false,
        };
      }
    }
    for (const { fato } of dia.semPosicao) {
      if (fato.fatoId === fatoId) {
        return {
          fatoId: fato.fatoId,
          origem: fato.origem,
          data: fato.data,
          taInicial: fato.taInicial,
          tempos: fato.tempos,
          disciplina: fato.disciplina,
          conteudo: fato.conteudo,
          local: fato.local,
          tecnica: fato.tecnica,
          instrutor: fato.instrutor,
          herdado: fato.herdado,
          gravado: fato.gravado,
          semPosicao: true,
        };
      }
    }
  }
  return null;
}

export function PainelDeLancamento({
  semana,
  grade,
  disciplinasDaSemana,
  turmaId,
  cursoId,
  salaDaTurma,
  ano,
  numeroDaSemana,
  podeLancar,
  unidades,
  disciplinas,
  avaliacoesParaVista,
  instrutores,
  escala,
  tecnicas,
  tiposDeAvaliacao,
  subtipos,
  lancar,
  lancarEstudoIndividual,
  mover,
  atualizar,
  excluir,
}: PainelDeLancamentoProps) {
  const [celula, definirCelula] = React.useState<{ dia: string; ta: number } | null>(null);
  const [fatoId, definirFato] = React.useState<string | null>(null);
  const [respostaDoEi, definirRespostaDoEi] = React.useState<string | null>(null);
  const [respostaDoArraste, definirRespostaDoArraste] = React.useState<string | null>(null);
  const [lancandoEi, definirLancandoEi] = React.useState(false);

  const podeMexer =
    podeLancar && mover !== undefined && atualizar !== undefined && excluir !== undefined;
  const fato = fatoId === null ? null : fatoDaSemana(semana, fatoId);

  /*
   * ⚠️ **QUEM ABRIU O DIÁLOGO, PARA O FOCO VOLTAR A ELE AO FECHAR** — e a primeira redação dizia que
   * o Radix fazia isso sozinho, e não faz (medido em 08/10/2026 pelo caso de teclado de
   * `dsa-ver.spec.ts`). Sem `DialogTrigger`, o Radix devolve o foco a um gatilho que não existe e ele
   * cai no `body`: quem fechou com `Esc` perdia o lugar na grade, e a seta não andava mais. Os
   * diálogos daqui são abertos pela CÉLULA, então é ela que se lembra.
   */
  const quemAbriu = React.useRef<HTMLElement | null>(null);
  const lembrarQuemAbriu = (): void => {
    quemAbriu.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  };
  const devolverOFoco = (evento: Event): void => {
    evento.preventDefault();
    const alvo = quemAbriu.current;
    quemAbriu.current = null;
    /* A grade pode ter sido redesenhada depois de gravar: célula que saiu da página não recebe foco. */
    if (alvo?.isConnected) alvo.focus();
  };

  async function lancarEi(): Promise<void> {
    definirRespostaDoEi(null);
    definirLancandoEi(true);
    const r = await lancarEstudoIndividual({ turmaId, ano, semana: numeroDaSemana });
    definirLancandoEi(false);
    if (!r.ok) {
      definirRespostaDoEi(r.mensagem);
      return;
    }
    /*
     * ⚠️ **OS PULADOS SÃO INFORMAÇÃO, NÃO SILÊNCIO.** Clicar de novo não cria nada — e sem dizer
     * isso a tela pareceria não ter feito nada. É a lição do `AvisoDaLista` da spec 011: a resposta
     * de toda ação é publicada, porque "não aconteceu nada" é o que uma falha invisível parece.
     */
    definirRespostaDoEi(
      r.criados === 0
        ? `Nenhum dia novo: os ${r.pulados.length} dias úteis desta semana já têm Estudo Individual, ou são feriado de dia inteiro.`
        : `Estudo Individual lançado em ${r.criados} dia(s).` +
            (r.pulados.length > 0
              ? ` ${r.pulados.length} pulado(s) — já tinham, ou são feriado.`
              : ""),
    );
  }

  /**
   * O arrastar-e-soltar — **o caminho secundário**, que chega à mesma `mover`.
   *
   * ⚠️ **A RESPOSTA É PUBLICADA ACIMA DA GRADE, e não dentro da célula.** O bloco que se move
   * **sai do lugar** onde a mensagem estaria: é o defeito da spec 011, em que *"a mensagem de
   * sucesso morria com a linha"* e duas conferências seguidas leram a falha como *"não aconteceu
   * nada"*.
   */
  async function moverArrastando(id: string, dia: string, ta: number): Promise<void> {
    if (mover === undefined) return;
    definirRespostaDoArraste(null);
    const resposta = await mover({
      fatoId: id,
      origem: fatoDaSemana(semana, id)?.origem,
      data: dia,
      taInicial: ta,
    });
    if (!resposta.ok) {
      definirRespostaDoArraste(resposta.mensagem);
      return;
    }
    definirRespostaDoArraste(
      resposta.avisos.length === 0
        ? "Lançamento movido."
        : `Lançamento movido, com aviso: ${resposta.avisos.map((a) => a.texto).join(" ")}`,
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {podeLancar ? (
        <div className="flex flex-wrap items-center gap-2">
          {/*
            ⚠️ `Q-7`: o Estudo Individual padrão da semana **em um clique**. Ele ocupa o slot
               seguinte ao último TA lançado de cada dia (`D-4`) e dura um TA (`D-11`).
          */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={lancandoEi}
            onClick={lancarEi}
            data-slot="lancar-estudo-individual"
          >
            {lancandoEi ? "Lançando…" : "Lançar o Estudo Individual da semana"}
          </Button>
          <span className="text-xs text-texto-suave">
            {podeMexer
              ? "Clique num tempo vazio para lançar, ou num cartão para mover, editar e excluir."
              : "Clique num tempo vazio da grade para lançar nele."}
          </span>
        </div>
      ) : null}

      {respostaDoEi ? (
        <p role="status" className="text-sm text-texto" data-slot="resposta-do-estudo-individual">
          {respostaDoEi}
        </p>
      ) : null}

      {respostaDoArraste ? (
        <p role="status" className="text-sm text-texto" data-slot="resposta-do-movimento">
          {respostaDoArraste}
        </p>
      ) : null}

      <GradeDsa
        semana={semana}
        grade={grade}
        nomesDasDisciplinas={new Map(disciplinasDaSemana.map((d) => [d.codigo, d.nome] as const))}
        salaDaTurma={salaDaTurma}
        {...(podeLancar
          ? {
              aoEscolherCelula: (dia: string, ta: number) => {
                lembrarQuemAbriu();
                definirFato(null);
                definirCelula({ dia, ta });
              },
            }
          : {})}
        {...(podeMexer
          ? {
              aoEscolherFato: (id: string) => {
                lembrarQuemAbriu();
                definirCelula(null);
                definirFato(id);
              },
              aoMoverBloco: (id: string, dia: string, ta: number) => {
                void moverArrastando(id, dia, ta);
              },
            }
          : {})}
      />

      {/*
        ⚠️ **UM DIÁLOGO PARA CADA, E NUNCA OS DOIS ABERTOS**: escolher célula limpa o fato e vice-versa
           (ver `aoEscolherCelula` e `aoEscolherFato` acima). `Esc` e o clique fora fecham, e o foco
           volta à célula de onde a pessoa saiu — por `devolverOFoco`, e NÃO pelo padrão do Radix.
      */}
      <Dialog
        open={fato !== null && atualizar !== undefined && excluir !== undefined}
        onOpenChange={(aberto) => {
          if (!aberto) definirFato(null);
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
          onCloseAutoFocus={devolverOFoco}
        >
          <DialogHeader>
            <DialogTitle>Lançamento</DialogTitle>
            <DialogDescription>Edite tudo de uma vez e grave, ou exclua.</DialogDescription>
          </DialogHeader>
          {fato !== null && atualizar && excluir ? (
            <AcoesDoBloco
              fato={fato}
              diasDaSemana={semana.dias}
              linhas={semana.linhas}
              unidades={unidades}
              disciplinas={disciplinas}
              instrutores={instrutores}
              escala={escala}
              tecnicas={tecnicas}
              atualizar={atualizar}
              excluir={excluir}
              aoFechar={() => definirFato(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={celula !== null}
        onOpenChange={(aberto) => {
          if (!aberto) definirCelula(null);
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
          onCloseAutoFocus={devolverOFoco}
        >
          <DialogHeader>
            <DialogTitle>Lançar</DialogTitle>
            <DialogDescription>
              {celula ? `No dia ${dataComDiaDaSemana(celula.dia)}.` : ""}
            </DialogDescription>
          </DialogHeader>
          {celula ? (
            <FormularioDeLancamento
              turmaId={turmaId}
              cursoId={cursoId}
              salaDaTurma={salaDaTurma}
              dia={celula.dia}
              taInicial={celula.ta}
              temposDoDia={temposParaEscolher(
                semana.dias.find((d) => d.data === celula.dia),
                semana.linhas,
              )}
              unidades={unidades}
              disciplinas={disciplinas}
              avaliacoesParaVista={avaliacoesParaVista}
              instrutores={instrutores}
              escala={escala}
              tecnicas={tecnicas}
              tiposDeAvaliacao={tiposDeAvaliacao}
              subtipos={subtipos}
              lancar={lancar}
              aoFechar={() => definirCelula(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

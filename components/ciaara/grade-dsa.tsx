/**
 * `GradeDsa` — a semana do Detalhe Semanal de Aula desenhada sobre `GradeAlocacao`
 * (`RF-DSA-01`, `RF-DSA-03`, `RF-HOR-04`, `RF-HOR-06`, `RN-EVT-02`, `RN-DEG-01` · spec 013).
 *
 * ⚠️ **ELE NÃO MONTA A SEMANA: ELE DESENHA A QUE RECEBEU.** O `Semana` chega pronto de
 * `montarSemana()` — qual TA existe, o que está ocupado, o que é continuação de bloco, o que o
 * feriado bloqueia, o que caiu em *"Sem posição"* e por quê. Fazer qualquer parte disso aqui seria
 * um **segundo** lugar onde a `RF-DSA-03` vive, e o Épico 12 precisa produzir a mesma grade por
 * função, sem passar por componente nenhum.
 *
 * ⚠️ **A SALA VAI NO CABEÇALHO UMA VEZ, E SÓ O DIFERENTE É DESTACADO — é o `RF-DSA-03` literal**
 * (`FR-006`): *"a sala da turma aparece no cabeçalho; o lançamento em local diferente é
 * destacado"*. Repetir a sala em toda célula encheria a grade com a informação que **não** muda e
 * esconderia a que muda. ⚠️ **E é o oposto do papel**, que traz `LOCAL` **por linha** (`Q-11`): na
 * tela o operador compara com a sala da turma; no papel assinado, cada bloco tem de se explicar
 * sozinho.
 *
 * ⚠️ **O BLOCO QUE ATRAVESSA O ALMOÇO MOSTRA OS DOIS TRECHOS** (`SC-011`, corrigindo o `D-3` da
 * planilha, que imprimia *"09:30 as 13:50"* para 4 TA em 64 ocorrências do CAHO). Os trechos vêm
 * do domínio; aqui eles só são escritos um sob o outro.
 *
 * ⚠️ **ELA TAMBÉM É FOLHA DE CLIENTE, pela mesma razão medida de `GradeAlocacao`** — ver a nota de
 * lá. Ela **cria** os elementos que vão para dentro da grade (o corpo de cada bloco), e um elemento
 * de servidor dentro de `cloneElement` no cliente devolve tipo `undefined` (React #130).
 * ⚠️ **O DADO CONTINUA NO SERVIDOR:** a página lê o banco, chama `montarSemana()` e passa o
 * `Semana` **pronto** por propriedade. O que vai ao bundle é o desenho, não a consulta — e é esse o
 * arranjo que o Princípio XI descreve.
 *
 * ⚠️ **A FAIXA "SEM POSIÇÃO" É RODAPÉ DE COLUNA, não linha da matriz**, e é o que faz as 1.566
 * linhas do ETL aparecerem sem quebrar a grade: elas não têm TA, então não há célula onde caibam.
 * Cada uma sai com o **motivo escrito** (`RN-DEG-01`) — *"sem posição"* sem motivo é a tela
 * dizendo que perdeu o dado.
 */
"use client";

import * as React from "react";

import {
  GradeAlocacao,
  type CelulaDaGrade,
  type ColunaDaGrade,
  type LinhaDaGrade,
  type TomDaCelula,
} from "@/components/ciaara/grade-alocacao";
import type { BlocoNaGrade, Celula, Semana } from "@/lib/dominio/dsa/grade";
import { dataParaLeitura } from "@/lib/formato/data";

/** O dia da semana abreviado, em maiúsculas, como o documento impresso o escreve. */
const DIA_DA_SEMANA = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"] as const;

export type GradeDsaProps = {
  readonly semana: Semana;
  /**
   * `turmas.sala_alocada` — aparece **uma vez**, no cabeçalho.
   *
   * ⚠️ `null` é caso real e não defeito: turma sem sala alocada existe, e aí **nenhum** bloco é
   * destacado por local — não há com o que comparar. Destacar todos nesse caso seria inventar
   * divergência.
   */
  readonly salaDaTurma: string | null;
  /**
   * A célula escolhida, já em **dia e TA** — não em linha e coluna.
   *
   * ⚠️ **A TRADUÇÃO MORA AQUI, e não em quem chama.** A grade genérica fala em linha e coluna; o
   * DSA fala em dia e Tempo de Aula. Deixar a conversão para a página faria dois lugares saberem
   * que a linha 3 é o TA 4 quando há um intervalo no meio — e um deles erraria.
   */
  readonly aoEscolherCelula?: (dia: string, ta: number) => void;
  readonly className?: string;
};

/**
 * O rótulo do dia: `SEG 06/04/2026`.
 *
 * ⚠️ **A DATA SAI INTEIRA DE `dataParaLeitura`, O PONTO ÚNICO.** A primeira versão disto fazia
 * `.slice(0, 5)` para mostrar só `DD/MM`, e `formato-de-data.test.ts` reprovou — com razão: a spec
 * 012 reduziu **quatro** donos do formato de data a um, e recortar a saída dele aqui é ser o
 * quinto. O dia completo é mais largo e não tem segundo dono.
 */
function rotuloDoDia(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  // `Date.UTC` e não `new Date(iso)`: o segundo interpreta `aaaa-mm-dd` como UTC em alguns
  // navegadores e como local em outros, e o dia da semana saía errado na fronteira do fuso.
  const indice = new Date(Date.UTC(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1)).getUTCDay();
  return `${DIA_DA_SEMANA[indice]} ${dataParaLeitura(iso)}`;
}

/** O tom de uma célula ocupada, pela origem do fato e pelo conflito. */
function tomDoBloco(bloco: BlocoNaGrade): TomDaCelula {
  if (bloco.conflito) return "conflito";
  if (bloco.origem === "avaliacao" || bloco.origem === "vista_prova") return "avaliacao";
  if (bloco.origem === "atividade_nao_letiva") return "nao_letivo";
  return "ocupada";
}

const TOM_DO_ESTADO: Readonly<Record<Celula["estado"], TomDaCelula>> = {
  livre: "livre",
  ocupada: "ocupada",
  continuacao: "ocupada",
  bloqueada: "bloqueada",
  sem_relogio: "sem_relogio",
};

/** O conteúdo de uma célula ocupada. */
function CorpoDoBloco({
  bloco,
  salaDaTurma,
}: {
  readonly bloco: BlocoNaGrade;
  readonly salaDaTurma: string | null;
}) {
  /*
   * ⚠️ A COMPARAÇÃO DE LOCAL É POR TEXTO NORMALIZADO, e não por igualdade crua: a planilha escreve
   * `SALA 3` e `Sala 3`, e uma comparação estrita destacaria a sala da própria turma como se fosse
   * outra. Minúsculas e espaços colapsados bastam aqui — a reconciliação de grafia de sala é do
   * ETL (`FR-029.8`), não da tela.
   */
  const normal = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");
  const foraDaSala =
    bloco.local != null && salaDaTurma != null && normal(bloco.local) !== normal(salaDaTurma);

  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      <span className="flex items-baseline gap-1">
        {bloco.disciplina ? <strong className="font-semibold">{bloco.disciplina}</strong> : null}
        {bloco.tecnica ? <span className="text-[10px] uppercase">{bloco.tecnica}</span> : null}
      </span>
      {bloco.conteudo ? <span className="line-clamp-2">{bloco.conteudo}</span> : null}
      {bloco.instrutor ? <span className="truncate text-[10px]">{bloco.instrutor}</span> : null}
      <span className="flex flex-wrap items-center gap-1 text-[10px]">
        {bloco.trechos.map((t) => (
          <span key={`${t.inicio}-${t.fim}`} className="tabular-nums">
            {t.inicio}–{t.fim}
          </span>
        ))}
      </span>
      {/*
       * ⚠️ Os três marcadores vão como TEXTO, nunca só como cor (`RNF-USA-05`). O conflito já
       * tinge a célula; sem a palavra, quem não distingue a cor não sabe que há conflito.
       */}
      {foraDaSala ? (
        <span className="w-fit rounded bg-conflito-fundo px-1 text-[10px] text-conflito-tinta">
          fora da sala · {bloco.local}
        </span>
      ) : null}
      {bloco.conflito ? (
        <span className="w-fit rounded bg-conflito-fundo px-1 text-[10px] font-medium text-conflito-tinta">
          conflito de {bloco.conflito === "instrutor" ? "instrutor" : "fiscal"}
        </span>
      ) : null}
      {bloco.alertaSala ? (
        <span className="w-fit rounded bg-atrasado-fundo px-1 text-[10px] text-atrasado-tinta">
          mesma sala em outra turma
        </span>
      ) : null}
      {bloco.lancadoAFrente ? (
        <span className="w-fit rounded bg-planejado-fundo px-1 text-[10px] text-planejado-tinta">
          lançado à frente
        </span>
      ) : null}
    </div>
  );
}

export function GradeDsa({ semana, salaDaTurma, aoEscolherCelula, className }: GradeDsaProps) {
  const { dias, relogio, linhas } = semana;

  const colunas: readonly ColunaDaGrade[] = dias.map((d) => ({
    chave: d.data,
    rotulo: rotuloDoDia(d.data),
    ...(d.bloqueio ? { bloqueio: d.bloqueio } : {}),
    ...(d.avisos.length > 0 ? { nota: d.avisos.join(" · ") } : {}),
  }));

  /*
   * As linhas: um TA por linha, mais a separadora do almoço.
   *
   * ⚠️ **O ALMOÇO É DETECTADO PELA TROCA DE PERÍODO, não por um horário escrito aqui.** As duas
   * grades reais mudam de período em pontos diferentes (a G45 tem 5 TA de manhã, a G50 tem 4), e
   * um horário fixo acertaria uma e erraria a outra. Sem relógio não há período, logo não há
   * separadora — a grade sai com os TA numerados, que é a degradação da `RN-DEG-01`.
   */
  const linhasDaGrade: LinhaDaGrade[] = [];
  const indiceDaLinhaPorTa = new Map<number, number>();
  for (let ta = 1; ta <= linhas; ta += 1) {
    const tempo = relogio?.tempos[ta - 1];
    const anterior = relogio?.tempos[ta - 2];
    if (tempo && anterior && anterior.periodo === "manha" && tempo.periodo === "tarde") {
      linhasDaGrade.push({ chave: `almoco-${ta}`, rotulo: "almoço", separadora: true });
    }
    indiceDaLinhaPorTa.set(ta, linhasDaGrade.length);
    linhasDaGrade.push({
      chave: String(ta),
      rotulo: (
        <span className="flex flex-col leading-tight">
          <span className="font-medium tabular-nums">{ta}</span>
          {tempo ? (
            /* ⚠️ `--texto-suave`: o horário é **valor** derivado do regime, não rótulo. */
            <span className="text-[10px] tabular-nums text-texto-suave">{tempo.inicio}</span>
          ) : null}
          {tempo?.tipo === "excepcional" ? (
            /* O 9º TA é alerta, nunca bloqueio (`RF-HOR-03.1`, `RN-DEG-02`) — e ele é dito. */
            <span className="text-[10px] text-atrasado-tinta">excepcional</span>
          ) : null}
        </span>
      ),
    });
  }

  /* A matriz, na ordem de `linhasDaGrade` — a separadora recebe uma linha vazia. */
  const celulas: CelulaDaGrade[][] = linhasDaGrade.map(() => []);
  for (let ta = 1; ta <= linhas; ta += 1) {
    const iLinha = indiceDaLinhaPorTa.get(ta);
    if (iLinha === undefined) continue;
    celulas[iLinha] = dias.map((dia) => {
      const celula = dia.celulas[ta - 1];
      if (!celula) return { tom: "sem_relogio" };
      if (celula.estado === "continuacao") return { coberta: true };
      if (celula.estado === "ocupada" && celula.bloco) {
        const bloco = celula.bloco;
        return {
          conteudo: <CorpoDoBloco bloco={bloco} salaDaTurma={salaDaTurma} />,
          tom: tomDoBloco(bloco),
          /*
           * ⚠️ `tempos` pode ser nulo em linha histórica (`ativ_tempos_so_nulo_no_historico`), e
           * `rowSpan={0}` em HTML significa *"até o fim da seção"* — a célula engoliria a coluna
           * inteira. O `?? 1` é o que impede isso.
           */
          alturaEmLinhas: Math.max(bloco.tempos ?? 1, 1),
          rotuloAcessivel: [bloco.disciplina, bloco.conteudo].filter(Boolean).join(" — "),
        };
      }
      return { tom: TOM_DO_ESTADO[celula.estado] };
    });
  }

  /* A faixa "Sem posição", por dia. */
  const rodapes = dias.map((dia) =>
    dia.semPosicao.length === 0 ? (
      // veste: o placeholder de faixa vazia — o travessão não é dado, é ausência dele.
      <span key={dia.data} className="text-[10px] text-texto-tenue">
        —
      </span>
    ) : (
      <ul key={dia.data} className="flex flex-col gap-1">
        {dia.semPosicao.map(({ fato, motivo }) => (
          <li key={fato.fatoId} className="leading-tight">
            <span className="block">
              {[fato.disciplina, fato.conteudo].filter(Boolean).join(" — ") || "Lançamento"}
            </span>
            {/* O MOTIVO é obrigatório: é ele que distingue "não há" de "não sei onde pôr". */}
            <span className="block text-[10px] text-texto-suave">{motivo}</span>
          </li>
        ))}
      </ul>
    ),
  );

  const algumSemPosicao = dias.some((d) => d.semPosicao.length > 0);

  /* O TA de cada linha navegável — o inverso de `indiceDaLinhaPorTa`, sem as separadoras. */
  const taDaLinhaNavegavel: number[] = [];
  for (let ta = 1; ta <= linhas; ta += 1) taDaLinhaNavegavel.push(ta);

  return (
    <div className={className}>
      <GradeAlocacao
        rotulo="Grade da semana"
        colunas={colunas}
        linhas={linhasDaGrade}
        celulas={celulas}
        cantoSuperior={
          <span className="flex flex-col leading-tight">
            <span>TA</span>
            {salaDaTurma ? (
              <span className="text-[10px] font-normal text-texto-suave">{salaDaTurma}</span>
            ) : null}
          </span>
        }
        {...(algumSemPosicao ? { rodapeDasColunas: rodapes } : {})}
        {...(aoEscolherCelula
          ? {
              aoAtivarCelula: (linha: number, coluna: number) => {
                const dia = dias[coluna]?.data;
                const ta = taDaLinhaNavegavel[linha];
                if (dia !== undefined && ta !== undefined) aoEscolherCelula(dia, ta);
              },
            }
          : {})}
      />
    </div>
  );
}

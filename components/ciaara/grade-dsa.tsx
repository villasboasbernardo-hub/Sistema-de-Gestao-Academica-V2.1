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
import { cn } from "cn";

import {
  GradeAlocacao,
  type CelulaDaGrade,
  type ColunaDaGrade,
  type LinhaDaGrade,
  type TomDaCelula,
} from "@/components/ciaara/grade-alocacao";
import type { BlocoNaGrade, Celula, Semana } from "@/lib/dominio/dsa/grade";
import type { CartaoDaGrade, GradeDoPapel } from "@/lib/dominio/dsa/grade-do-papel";
import { dataComDiaDaSemana } from "@/lib/formato/data";

export type GradeDsaProps = {
  readonly semana: Semana;
  /**
   * A grade do MODELO v4, montada por `gradeDoPapel` — **a mesma montagem do `/print/dsa`**.
   *
   * ⚠️ Com ela, as linhas são os tempos do relógio (com o intervalo e o almoço reais) e cada
   * lançamento é um cartão com as informações do papel. Sem ela (`null`, sem relógio), a grade sai
   * com os TA numerados, que é a degradação da `RN-DEG-01`.
   */
  readonly grade?: GradeDoPapel | null;
  /** `cod_disciplina` → nome, do quadro de CH do documento — para o título do cartão. */
  readonly nomesDasDisciplinas?: ReadonlyMap<string, string>;
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
  /**
   * Um fato OCUPADO foi escolhido — por clique, por `Enter` na célula, ou na faixa "Sem posição".
   *
   * ⚠️ **ELE E `aoEscolherCelula` SÃO EXCLUDENTES POR CÉLULA, e a grade é quem decide qual chamar.**
   * Célula livre abre o formulário de lançar; célula ocupada abre as ações do bloco. Deixar a
   * decisão para quem chama obrigaria a página a descobrir **de novo** se há bloco naquele TA — e
   * ela já passou a semana montada para cá.
   *
   * ⚠️ **A FAIXA «SEM POSIÇÃO» CHAMA O MESMO RETORNO** (`Q-12`, segunda metade): posicionar um
   * lançamento sem TA é o **mesmo** mover, e um segundo caminho para isso seria uma segunda
   * implementação da mesma ação.
   */
  readonly aoEscolherFato?: (fatoId: string) => void;
  /**
   * Um bloco foi **arrastado** até a célula de `dia`/`ta` (`RF-DSA-07`).
   *
   * ⚠️ **ARRASTAR É O CAMINHO SECUNDÁRIO.** O primário é o teclado, por `aoEscolherFato` →
   * *Mover para…*: o `RF-DSA-07` pede **as duas** formas, e só a segunda funciona sem mouse.
   */
  readonly aoMoverBloco?: (fatoId: string, dia: string, ta: number) => void;
  readonly className?: string;
};

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

export function GradeDsa(props: GradeDsaProps) {
  return props.grade ? (
    <GradeDoModelo {...props} grade={props.grade} />
  ) : (
    <GradeNumerada {...props} />
  );
}

/** O tom de um cartão do modelo — pela origem do fato e pelo conflito, como o da grade numerada. */
function tomDoCartao(cartao: CartaoDaGrade, bloco: BlocoNaGrade | undefined): TomDaCelula {
  if (bloco) return tomDoBloco(bloco);
  if (cartao.tipo === "estudo" || cartao.tipo === "atividade") return "nao_letivo";
  if (cartao.tipo === "avaliacao") return "avaliacao";
  return "ocupada";
}

/**
 * O corpo do cartão — **as mesmas informações do papel** (disciplina, UE/tópico, TA, local, T/E,
 * instrutor), mais as marcas que só a tela tem: conflito, sala e «lançado à frente».
 */
function CorpoDoCartao({
  cartao,
  bloco,
  nome,
  salaDaTurma,
}: {
  readonly cartao: CartaoDaGrade;
  readonly bloco: BlocoNaGrade | undefined;
  readonly nome: string;
  readonly salaDaTurma: string | null;
}) {
  const { linha } = cartao;
  const normal = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");
  const foraDaSala =
    bloco?.local != null && salaDaTurma != null && normal(bloco.local) !== normal(salaDaTurma);
  return (
    <div
      className="flex flex-col gap-0.5 leading-tight"
      data-slot="dsa-cartao"
      data-tipo={cartao.tipo}
      data-parte={cartao.parte}
      data-partes={cartao.partes}
      data-lancado={bloco ? "sim" : "nao"}
    >
      {linha.disciplina === "" ? null : (
        <span className="flex items-baseline gap-1 font-semibold">
          <span>{linha.disciplina}</span>
          {nome === "" ? null : <span className="font-normal">{nome}</span>}
        </span>
      )}
      <span className={cn("line-clamp-3", cartao.tipo !== "aula" && "font-medium")}>
        {linha.conteudo}
        {cartao.tipo === "estudo" ? " *" : ""}
      </span>
      {linha.instrutor === "" ? null : (
        <span className="truncate text-[10px]">{linha.instrutor}</span>
      )}
      <span className="flex flex-wrap items-center gap-x-1.5 text-[10px] tabular-nums">
        <span>{cartao.ta} TA</span>
        {linha.local === "" ? null : <span>{linha.local}</span>}
        {linha.te === "" ? null : <strong className="font-semibold">{linha.te}</strong>}
        {cartao.partes > 1 ? (
          /*
           * ⚠️ **O TOTAL DO BLOCO VAI JUNTO DA PARTE** (item 2 do comando de 08/10/2026). O bloco que
           * atravessa o almoço sai em duas partes (`SC-011`), cada uma com o TA DELA — e quem acabava
           * de editar «Quantos tempos» para 2 via "1 TA" e "1 TA" e concluía que a edição não pegou.
           * Só a tela ganha o total: o papel continua com o TA de cada linha, como o documento assinado.
           */
          <span>
            · parte {cartao.parte} de {cartao.partes}
            {bloco?.tempos != null ? ` · bloco de ${bloco.tempos} TA` : ""}
          </span>
        ) : null}
      </span>
      {bloco === undefined && cartao.tipo === "estudo" ? (
        <span className="w-fit text-[10px] text-texto-suave">no papel, sem lançamento</span>
      ) : null}
      {/* ⚠️ As marcas vão como TEXTO, nunca só como cor (`RNF-USA-05`). */}
      {foraDaSala ? (
        <span className="w-fit rounded bg-conflito-fundo px-1 text-[10px] text-conflito-tinta">
          fora da sala · {bloco?.local}
        </span>
      ) : null}
      {bloco?.conflito ? (
        <span className="w-fit rounded bg-conflito-fundo px-1 text-[10px] font-medium text-conflito-tinta">
          conflito de {bloco.conflito === "instrutor" ? "instrutor" : "fiscal"}
        </span>
      ) : null}
      {bloco?.alertaSala ? (
        <span className="w-fit rounded bg-atrasado-fundo px-1 text-[10px] text-atrasado-tinta">
          mesma sala em outra turma
        </span>
      ) : null}
      {bloco?.lancadoAFrente ? (
        <span className="w-fit rounded bg-planejado-fundo px-1 text-[10px] text-planejado-tinta">
          lançado à frente
        </span>
      ) : null}
    </div>
  );
}

type ForaDaGrade = {
  readonly coluna: number;
  readonly linha: {
    readonly chave: string;
    readonly disciplina: string;
    readonly conteudo: string;
  };
};

/**
 * A grade da tela no **modelo v4** — linhas e cartões de `gradeDoPapel`, a montagem do papel.
 *
 * ⚠️ **SÓ A APRESENTAÇÃO MUDA.** Quem diz onde cada cartão vai é `gradeDoPapel`; quem diz se a
 * célula livre está bloqueada pelo calendário é `montarSemana` (`Semana`); quem grava é a Server
 * Action. Aqui só se casa um com o outro, pela chave do lançamento.
 *
 * ⚠️ **O INTERVALO NÃO É LINHA DA TABELA**: uma linha de separação no meio quebraria o `rowSpan` do
 * cartão de vários tempos. Ele vai escrito na régua (*"intervalo 5 min"*), sobre o tempo que vem
 * depois dele; o **almoço** é linha de separação, porque o cartão já se divide nele (`SC-011`).
 */
function GradeDoModelo({
  semana,
  grade,
  nomesDasDisciplinas,
  salaDaTurma,
  aoEscolherCelula,
  aoEscolherFato,
  aoMoverBloco,
  className,
}: GradeDsaProps & { readonly grade: GradeDoPapel }) {
  const { dias } = semana;
  const arrastado = React.useRef<string | null>(null);

  const blocos = new Map<string, BlocoNaGrade>();
  for (const dia of dias) {
    for (const c of dia.celulas) if (c.bloco) blocos.set(c.bloco.fatoId, c.bloco);
  }

  const colunas: readonly ColunaDaGrade[] = grade.colunas.map((c, i) => {
    const dia = dias[i];
    return {
      chave: c.data,
      rotulo: dataComDiaDaSemana(c.data),
      ...(c.bloqueio ? { bloqueio: c.bloqueio } : {}),
      ...(dia && dia.avisos.length > 0 ? { nota: dia.avisos.join(" · ") } : {}),
    };
  });

  /* As linhas: um tempo por linha, o almoço como separadora; o intervalo vai na régua. */
  const linhasDaGrade: LinhaDaGrade[] = [];
  const tempos: number[] = [];
  let intervalo: number | null = null;
  for (const f of grade.faixas) {
    if (f.tipo === "intervalo") {
      intervalo = f.minutos;
      continue;
    }
    if (f.tipo === "almoco") {
      intervalo = null;
      linhasDaGrade.push({
        chave: `almoco-${f.inicio}`,
        rotulo: `almoço ${f.inicio}–${f.fim}`,
        separadora: true,
      });
      continue;
    }
    tempos.push(f.numero);
    linhasDaGrade.push({
      chave: String(f.numero),
      rotulo: (
        <span className="flex flex-col leading-tight" data-tempo="sim">
          {intervalo !== null && intervalo > 0 ? (
            // veste: o intervalo é RÓTULO da régua, não dado do lançamento.
            <span className="text-[9px] text-texto-tenue">intervalo {intervalo} min</span>
          ) : null}
          <span className="font-medium tabular-nums">{f.numero}º</span>
          <span className="text-[10px] tabular-nums text-texto-suave">
            {f.inicio}–{f.fim}
          </span>
          {f.excepcional ? (
            <span className="text-[10px] text-atrasado-tinta">excepcional</span>
          ) : null}
        </span>
      ),
    });
    intervalo = null;
  }

  /* Onde cada cartão começa e o que ele cobre — por coluna e número do tempo. */
  const inicio = new Map<string, CartaoDaGrade>();
  const coberto = new Set<string>();
  const foraDaGrade: ForaDaGrade[] = [...grade.foraDaGrade];
  for (const cartao of grade.cartoes) {
    const primeiro = grade.faixas[cartao.faixaInicial];
    if (primeiro?.tipo !== "tempo") continue;
    const chaves = Array.from(
      { length: cartao.ta },
      (_, k) => `${cartao.coluna}:${primeiro.numero + k}`,
    );
    if (chaves.some((k) => inicio.has(k) || coberto.has(k))) {
      foraDaGrade.push({ coluna: cartao.coluna, linha: cartao.linha });
      continue;
    }
    inicio.set(chaves[0] as string, cartao);
    for (const k of chaves.slice(1)) coberto.add(k);
  }

  const celulas: CelulaDaGrade[][] = linhasDaGrade.map((l) => {
    if (l.separadora) return [];
    const ta = Number(l.chave);
    return grade.colunas.map((_, coluna): CelulaDaGrade => {
      const chave = `${coluna}:${ta}`;
      if (coberto.has(chave)) return { coberta: true };
      const cartao = inicio.get(chave);
      if (cartao) {
        const bloco = blocos.get(cartao.linha.chave);
        return {
          conteudo: (
            <CorpoDoCartao
              cartao={cartao}
              bloco={bloco}
              nome={nomesDasDisciplinas?.get(cartao.linha.disciplina) ?? ""}
              salaDaTurma={salaDaTurma}
            />
          ),
          tom: tomDoCartao(cartao, bloco),
          alturaEmLinhas: cartao.ta,
          rotuloAcessivel: [cartao.linha.disciplina, cartao.linha.conteudo]
            .filter(Boolean)
            .join(" — "),
          ...(bloco && aoMoverBloco ? { arrastavel: true } : {}),
          ...(bloco && (bloco.conflito !== null || bloco.alertaSala)
            ? {
                marcaDeConflito: [
                  bloco.conflito === null ? null : `conflito de ${bloco.conflito}`,
                  bloco.alertaSala ? "mesma sala em outra turma" : null,
                ]
                  .filter(Boolean)
                  .join(" · "),
              }
            : {}),
        };
      }
      const celula = dias[coluna]?.celulas[ta - 1];
      if (!celula) return { tom: "sem_relogio" };
      return { tom: TOM_DO_ESTADO[celula.estado] };
    });
  });

  const rodapes = rodapesSemPosicao(dias, aoEscolherFato, foraDaGrade);

  return (
    <div className={cn("min-w-0", className)} data-slot="grade-da-semana" data-modelo="v4">
      <GradeAlocacao
        rotulo="Grade da semana"
        colunas={colunas}
        linhas={linhasDaGrade}
        celulas={celulas}
        cantoSuperior={
          <span className="flex flex-col leading-tight">
            <span>Horário</span>
            {salaDaTurma ? (
              <span className="text-[10px] font-normal text-texto-suave">{salaDaTurma}</span>
            ) : null}
          </span>
        }
        {...(rodapes !== null ? { rodapeDasColunas: rodapes } : {})}
        {...(aoEscolherCelula || aoEscolherFato
          ? {
              /*
               * ⚠️ **CARTÃO DE LANÇAMENTO ABRE AS AÇÕES; TEMPO VAZIO ABRE O FORMULÁRIO** — e o cartão
               * de Estudo Individual que só existe no papel (sem lançamento) é tempo vazio: clicar
               * nele lança ali, com o dia e o tempo já preenchidos.
               */
              aoAtivarCelula: (linha: number, coluna: number) => {
                const dia = grade.colunas[coluna]?.data;
                const ta = tempos[linha];
                if (dia === undefined || ta === undefined) return;
                const cartao = inicio.get(`${coluna}:${ta}`);
                const bloco = cartao ? blocos.get(cartao.linha.chave) : undefined;
                if (bloco && aoEscolherFato) {
                  aoEscolherFato(bloco.fatoId);
                  return;
                }
                const naSemana = dias[coluna]?.celulas[ta - 1]?.bloco ?? null;
                if (naSemana !== null && aoEscolherFato) {
                  aoEscolherFato(naSemana.fatoId);
                  return;
                }
                if (naSemana === null && aoEscolherCelula) aoEscolherCelula(dia, ta);
              },
            }
          : {})}
        {...(aoMoverBloco
          ? {
              aoArrastar: (linha: number, coluna: number) => {
                const ta = tempos[linha];
                const cartao = ta === undefined ? undefined : inicio.get(`${coluna}:${ta}`);
                arrastado.current =
                  cartao && blocos.has(cartao.linha.chave) ? cartao.linha.chave : null;
              },
              aoSoltar: (linha: number, coluna: number) => {
                const dia = grade.colunas[coluna]?.data;
                const ta = tempos[linha];
                const fatoId = arrastado.current;
                arrastado.current = null;
                if (dia !== undefined && ta !== undefined && fatoId !== null) {
                  aoMoverBloco(fatoId, dia, ta);
                }
              },
            }
          : {})}
      />
    </div>
  );
}

/**
 * A faixa "Sem posição", por dia — e, no modelo, também o que ficou fora do relógio.
 * `null` quando não há nada em dia nenhum.
 *
 * ⚠️ **ELE É UM BOTÃO QUANDO HÁ O QUE FAZER, e texto quando não há** (`Q-12`, segunda metade).
 * Posicionar um lançamento da faixa é o **mesmo** mover; e o MOTIVO é obrigatório — é ele que
 * distingue "não há" de "não sei onde pôr".
 */
function rodapesSemPosicao(
  dias: Semana["dias"],
  aoEscolherFato: ((fatoId: string) => void) | undefined,
  foraDaGrade: readonly ForaDaGrade[] = [],
): React.ReactNode[] | null {
  const algum = dias.some((d) => d.semPosicao.length > 0) || foraDaGrade.length > 0;
  if (!algum) return null;
  return dias.map((dia, i) => {
    const fora = foraDaGrade.filter((f) => f.coluna === i);
    if (dia.semPosicao.length === 0 && fora.length === 0) {
      return (
        // veste: o placeholder de faixa vazia — o travessão não é dado, é ausência dele.
        <span key={dia.data} className="text-[10px] text-texto-tenue">
          —
        </span>
      );
    }
    return (
      <ul key={dia.data} className="flex flex-col gap-1">
        {dia.semPosicao.map(({ fato, motivo }) => {
          const descricao =
            [fato.disciplina, fato.conteudo].filter(Boolean).join(" — ") || "Lançamento";
          return (
            <li key={fato.fatoId} className="leading-tight">
              {aoEscolherFato ? (
                <button
                  type="button"
                  onClick={() => aoEscolherFato(fato.fatoId)}
                  data-slot="posicionar-sem-posicao"
                  data-fato={fato.fatoId}
                  className="block text-left underline underline-offset-2 hover:text-texto"
                >
                  {descricao}
                </button>
              ) : (
                <span className="block">{descricao}</span>
              )}
              <span className="block text-[10px] text-texto-suave">{motivo}</span>
            </li>
          );
        })}
        {fora.map(({ linha }) => {
          const descricao = [linha.disciplina, linha.conteudo].filter(Boolean).join(" — ");
          return (
            <li key={linha.chave} className="leading-tight" data-fora-da-grade="sim">
              {aoEscolherFato && !linha.chave.startsWith("ei-") ? (
                <button
                  type="button"
                  onClick={() => aoEscolherFato(linha.chave)}
                  className="block text-left underline underline-offset-2 hover:text-texto"
                >
                  {descricao}
                </button>
              ) : (
                <span className="block">{descricao}</span>
              )}
              <span className="block text-[10px] text-texto-suave">fora dos tempos do relógio</span>
            </li>
          );
        })}
      </ul>
    );
  });
}

/** A grade sem relógio — os TA numerados, sem horário (`RN-DEG-01`). */
function GradeNumerada({
  semana,
  salaDaTurma,
  aoEscolherCelula,
  aoEscolherFato,
  aoMoverBloco,
  className,
}: GradeDsaProps) {
  const { dias, relogio, linhas } = semana;

  /*
   * ⚠️ **O BLOCO ARRASTADO VIVE NUM `ref`, NÃO EM `useState`.** O `dragstart` e o `drop` acontecem
   * no mesmo gesto, e um `setState` entre os dois **não** teria sido aplicado quando o `drop`
   * dispara: o `drop` leria o valor anterior — nulo na primeira vez — e o movimento se perderia em
   * silêncio, que é o pior sintoma possível para arrastar-e-soltar.
   */
  const arrastado = React.useRef<string | null>(null);

  const colunas: readonly ColunaDaGrade[] = dias.map((d) => ({
    chave: d.data,
    rotulo: dataComDiaDaSemana(d.data),
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
          ...(aoMoverBloco ? { arrastavel: true } : {}),
          /*
           * ⚠️ **A MARCA VAI PARA O ATRIBUTO E PARA O RÓTULO ACESSÍVEL, não só para a cor**
           * (`RNF-USA-05`). E `conflito de instrutor` e `mesma sala em outra turma` são coisas
           * diferentes: a primeira é conflito **primário**, a segunda é alerta **secundário**
           * (`RN-CONF-01`) — um atributo só com "conflito" apagaria a distinção que a regra faz.
           */
          ...(bloco.conflito !== null || bloco.alertaSala
            ? {
                marcaDeConflito: [
                  bloco.conflito === null ? null : `conflito de ${bloco.conflito}`,
                  bloco.alertaSala ? "mesma sala em outra turma" : null,
                ]
                  .filter(Boolean)
                  .join(" · "),
              }
            : {}),
        };
      }
      return { tom: TOM_DO_ESTADO[celula.estado] };
    });
  }

  const rodapes = rodapesSemPosicao(dias, aoEscolherFato);

  /* O TA de cada linha navegável — o inverso de `indiceDaLinhaPorTa`, sem as separadoras. */
  const taDaLinhaNavegavel: number[] = [];
  for (let ta = 1; ta <= linhas; ta += 1) taDaLinhaNavegavel.push(ta);

  return (
    /*
     * ⚠️ **`min-w-0` AQUI É O QUE FAZ A ROLAGEM SER DA GRADE, E A FALTA DELE FOI MEDIDA.** O
     * contêiner interno tem `overflow-x-auto`, mas um item de flex **não encolhe abaixo do
     * min-content** sem isto (`min-width: auto` é o padrão): a tabela larga empurrava este `div`,
     * que empurrava a coluna, que empurrava a **página** — e o `RNF-COMP-01` diz o contrário, porque
     * rolar a página lateralmente arrasta o cabeçalho e o menu e o operador perde a referência de
     * qual dia está olhando.
     * ⚠️ **O sintoma só aparecia com a grade CHEIA**: com dois processos, as suítes do DSA
     * compartilham a semente por processo de trabalho, e os lançamentos de uma engordavam as células
     * medidas pela outra. Passava sozinho e reprovava na suíte — o modo de falha que mais parece azar.
     */
    <div className={cn("min-w-0", className)}>
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
        {...(rodapes !== null ? { rodapeDasColunas: rodapes } : {})}
        {...(aoEscolherCelula || aoEscolherFato
          ? {
              /*
               * ⚠️ **A GRADE DECIDE QUAL DOS DOIS CHAMAR, pelo que há na célula.** Célula ocupada
               * abre as AÇÕES do bloco; célula livre abre o formulário de LANÇAR. A `GradeAlocacao`
               * entrega linha e coluna — a tradução para dia e TA mora aqui, e o bloco também.
               */
              aoAtivarCelula: (linha: number, coluna: number) => {
                const dia = dias[coluna]?.data;
                const ta = taDaLinhaNavegavel[linha];
                if (dia === undefined || ta === undefined) return;
                const bloco = dias[coluna]?.celulas[ta - 1]?.bloco ?? null;
                if (bloco !== null && aoEscolherFato) {
                  aoEscolherFato(bloco.fatoId);
                  return;
                }
                if (bloco === null && aoEscolherCelula) aoEscolherCelula(dia, ta);
              },
            }
          : {})}
        {...(aoMoverBloco
          ? {
              aoArrastar: (linha: number, coluna: number) => {
                const ta = taDaLinhaNavegavel[linha];
                if (ta === undefined) return;
                arrastado.current = dias[coluna]?.celulas[ta - 1]?.bloco?.fatoId ?? null;
              },
              aoSoltar: (linha: number, coluna: number) => {
                const dia = dias[coluna]?.data;
                const ta = taDaLinhaNavegavel[linha];
                const fatoId = arrastado.current;
                arrastado.current = null;
                if (dia !== undefined && ta !== undefined && fatoId !== null) {
                  aoMoverBloco(fatoId, dia, ta);
                }
              },
            }
          : {})}
      />
    </div>
  );
}

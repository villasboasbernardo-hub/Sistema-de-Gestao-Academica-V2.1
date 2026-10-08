/**
 * O painel de **situação e carga horária** da turma, **abaixo da grade e em largura total**
 * (`RF-DSA-05`, `RN-CRONOS-03`, `Q-2`, `FR-018`, `FR-028.1` · spec 013, PR 5 e item 3 do comando de
 * correções de 08/10/2026).
 *
 * *(decisão de Bernardo Villas Boas, 08/10/2026: "Cada disciplina vira uma linha que, ao clicar, abre
 * em CASCATA as suas UEs (prevista, lançada, restante, situação da UE). O quadro «Por unidade de
 * ensino» separado deixa de existir: ele vive dentro da cascata.")*
 *
 * ⚠️ **A TABELA É A ÚNICA DO SISTEMA, `components/ciaara/tabela-densa.tsx`, COM A LINHA EXPANSÍVEL QUE
 * ELA JÁ TEM** (`detalhe`/`abertas`, o mesmo mecanismo de `/disciplinas` e da ficha da turma). Uma
 * tabela com cascata escrita aqui herdaria por cópia o teclado, o foco e o estado vazio — a terceira
 * cópia de um componente é o terceiro a divergir.
 *
 * ⚠️ **AGORA É FOLHA DE CLIENTE, e até 08/10/2026 não era.** Ele era só desenho sobre quadros prontos,
 * e um marcador de cliente teria levado duas tabelas ao pacote do navegador para ganhar nada (gotcha
 * 1). A cascata mudou a conta: abrir e fechar a linha é interação, a tabela única já é de cliente, e as
 * colunas dela são **funções** — que não atravessam a fronteira servidor → cliente. Declarado em
 * `tests/unidade/fronteira-das-telas.test.ts`.
 *
 * ⚠️ **QUAIS LINHAS ESTÃO ABERTAS FICA NO COMPONENTE, E NÃO NA URL.** É a pergunta do guia de estado
 * na URL: *"este estado faz sentido num link que eu mando para outra pessoa?"* — e a semana do DSA faz
 * (ela já está lá), a cascata aberta não: é seção recolhida ou aberta, o contraexemplo nomeado do
 * documento 25 §3.3 e do `FR-013` da spec 008. Na grade de disciplinas a linha aberta vai para a URL
 * porque um requisito daquela tela (`FR-002` da spec 010) põe a *"linha expandida"* no recorte; aqui
 * não há requisito nenhum, e um `?aberta=` mudaria o contrato da rota do DSA — cuja guarda, em
 * `contrato-de-parametros.test.ts`, exige hoje que **todo** parâmetro dela avise o servidor.
 *
 * ⚠️ **ELE NÃO CALCULA NADA.** A situação, o acumulado, o restante, o percentual e o *lançado à frente*
 * da disciplina chegam prontos de `quadroDaDisciplina`; os da UE saem de `quadroDaUnidade` — as duas
 * em `lib/dominio/dsa/situacao.ts`, com teste ao lado. Aqui só se agrupa a UE pela disciplina e se
 * desenha.
 *
 * ⚠️ **A DISCIPLINA E A UE TÊM O MESMO CORTE: o fim da semana selecionada** (`RN-CRONOS-03`, `Q-2`).
 * A primeira versão da cascata usava o lançado de `vw_unidades_ensino_execucao`, que soma a turma
 * **sem data** — e a semana 10 mostraria a disciplina *Aguardando início* com uma UE dela *Em
 * andamento*. Quem calcula os dois lançados da UE é `unidadesDaTurma`, em `consulta.ts`; a página
 * entrega aqui o da semana.
 */
"use client";

import * as React from "react";
import { cn } from "cn";
import { ChevronRightIcon } from "lucide-react";

import { BadgeStatus } from "@/components/ciaara/badge-status";
import { TabelaDensa, type Coluna } from "@/components/ciaara/tabela-densa";
import type { Tom } from "@/lib/design/vocabulario";
import {
  quadroDaUnidade,
  type QuadroDaDisciplina,
  type SituacaoDaUnidade,
} from "@/lib/dominio/dsa/situacao";

/** O quadro de uma disciplina, com o que a tela precisa para nomeá-la. */
export type QuadroParaExibir = QuadroDaDisciplina & {
  readonly codigo: string;
  readonly nome: string;
};

/**
 * Uma unidade de ensino na cascata — o mínimo que ela precisa (`P-3` da planilha).
 *
 * ⚠️ **`disciplinaId` É O QUE PENDURA A UE NA LINHA CERTA**, e não o código: o código é único só entre
 * as disciplinas ativas do curso, e o `id` é o mesmo que o quadro da disciplina carrega.
 * ⚠️ **NÃO HÁ `restante` AQUI, DE PROPÓSITO:** o `ta_saldo` da view fica **negativo** quando a UE
 * passa da prevista, e o da cascata sai de `quadroDaUnidade`, que nunca é negativo — como o da
 * disciplina, na linha de cima. O excesso é dito pela situação *Passou da prevista*.
 */
export type UnidadeNoQuadro = {
  readonly id: string;
  readonly disciplinaId: string;
  readonly numero: number;
  readonly topico: string;
  readonly prevista: number;
  readonly lancada: number;
};

type Aparencia = { readonly rotulo: string; readonly tom: Tom };

/**
 * O rótulo e o tom de cada situação da disciplina.
 *
 * ⚠️ **`conflitou` USA O TOM DE CONFLITO — o mesmo que a grade usa na célula.** Dois tons para a
 * mesma coisa faria a tela dizer que são coisas diferentes.
 *
 * ⚠️ **`concluida` USA `conformidade`, E NÃO UM TOM NOVO:** o vocabulário do tema tem nove tons
 * declarados (`lib/design/vocabulario.ts`), e um nome inventado aqui **não compilaria para cor
 * nenhuma** — é o defeito dos cinco tokens inexistentes de 05/10/2026, que a invariante `I-4c`
 * passou a guardar.
 */
const APARENCIA: Readonly<Record<QuadroDaDisciplina["situacao"], Aparencia>> = {
  aguardando_inicio: { rotulo: "Aguardando início", tom: "planejado" },
  em_andamento: { rotulo: "Em andamento", tom: "executado" },
  concluida: { rotulo: "Concluída", tom: "conformidade" },
  conflitou: { rotulo: "Conflitou", tom: "conflito" },
};

/**
 * O rótulo e o tom de cada situação da UE.
 *
 * ⚠️ **OS TRÊS DEGRAUS QUE A UE DIVIDE COM A DISCIPLINA TÊM A MESMA PALAVRA E O MESMO TOM** — a UE
 * fica logo embaixo da linha dela, e *"Em andamento"* lá e *"Falta"* aqui pareceriam duas coisas.
 *
 * ⚠️ **`passou` É `adiantado`, PELO NOME DO DOMÍNIO, NUNCA PELA COR** (`FR-003` da spec 005): o
 * documento 23 define o tom como *"executado acima do previsto"*, que é exatamente o `PASSOU` do
 * `P-3`. O rótulo diz *da prevista* porque *"Passou"* sozinho, num sistema de ensino, se lê como
 * aprovação.
 */
const APARENCIA_DA_UNIDADE: Readonly<Record<SituacaoDaUnidade, Aparencia>> = {
  aguardando_inicio: { rotulo: "Aguardando início", tom: "planejado" },
  em_andamento: { rotulo: "Em andamento", tom: "executado" },
  concluida: { rotulo: "Concluída", tom: "conformidade" },
  passou: { rotulo: "Passou da prevista", tom: "adiantado" },
};

/** As UEs de cada disciplina, pelo `id` dela. A ordem é a de chegada; quem ordena é a cascata. */
function agruparPorDisciplina(
  unidades: readonly UnidadeNoQuadro[],
): ReadonlyMap<string, readonly UnidadeNoQuadro[]> {
  const grupos = new Map<string, UnidadeNoQuadro[]>();
  for (const u of unidades) {
    const lista = grupos.get(u.disciplinaId) ?? [];
    lista.push(u);
    grupos.set(u.disciplinaId, lista);
  }
  return grupos;
}

export function PainelDeSituacao({
  quadros,
  unidades,
  rotuloDaSemana,
}: {
  readonly quadros: readonly QuadroParaExibir[];
  readonly unidades: readonly UnidadeNoQuadro[];
  readonly rotuloDaSemana: string;
}) {
  /*
   * ⚠️ **MAIS DE UMA PODE FICAR ABERTA**, ao contrário da grade de disciplinas: lá a linha aberta é
   *    um parâmetro de URL de valor único; aqui comparar as UEs de duas disciplinas lado a lado é o
   *    uso natural, e não há endereço a preservar.
   */
  const [abertas, definirAbertas] = React.useState<readonly string[]>([]);
  const unidadesPorDisciplina = React.useMemo(() => agruparPorDisciplina(unidades), [unidades]);

  function alternar(q: QuadroParaExibir): void {
    definirAbertas((atuais) =>
      atuais.includes(q.disciplinaId)
        ? atuais.filter((id) => id !== q.disciplinaId)
        : [...atuais, q.disciplinaId],
    );
  }

  const colunas: readonly Coluna<QuadroParaExibir>[] = [
    {
      chave: "disciplina",
      titulo: "Disciplina",
      celula: (q) => (
        <span className="flex items-start gap-1.5 whitespace-normal" data-disciplina={q.codigo}>
          {/*
            ⚠️ A SETA NÃO É O ESTADO: quem anuncia aberto/fechado é o `aria-expanded` que a tabela
               única põe na linha. A seta só o repete para quem vê.
          */}
          <ChevronRightIcon
            aria-hidden="true"
            className={cn(
              "text-texto-suave mt-0.5 size-3.5 shrink-0 transition-transform motion-reduce:transition-none",
              abertas.includes(q.disciplinaId) && "rotate-90",
            )}
          />
          <span className="flex flex-col">
            <span>
              <span className="text-texto font-medium">{q.codigo}</span>{" "}
              <span className="text-texto-suave">{q.nome}</span>
            </span>
            {/*
              ⚠️ **O «LANÇADO À FRENTE» É DITO EM TEXTO, COM O NÚMERO NO ATRIBUTO** (`FR-028.1`,
                 `RNF-USA-05`). Ele **conta** no acumulado — é a decisão da `Q-2` —, e por isso
                 precisa aparecer: sem a marca, a pessoa leria execução onde há planejamento, que é o
                 `D-5` da planilha (*"a CH cumprida conta semana futura já planejada como cumprida"*)
                 com a diferença de que aqui está **escrito**.
            */}
            {q.taLancadoAFrente > 0 ? (
              <span
                data-slot="lancado-a-frente"
                data-ta={q.taLancadoAFrente}
                className="bg-planejado-fundo text-planejado-tinta mt-0.5 block w-fit rounded px-1 text-[10px]"
              >
                {q.taLancadoAFrente} TA lançado(s) à frente
              </span>
            ) : null}
          </span>
        </span>
      ),
    },
    {
      chave: "prevista",
      titulo: "Prevista (TA)",
      numerica: true,
      celula: (q) => (q.chPrevista === 0 ? "—" : q.chPrevista),
    },
    {
      chave: "acumulada",
      titulo: "Acumulada (TA)",
      numerica: true,
      celula: (q) => q.chAcumulada,
    },
    {
      chave: "percentual",
      titulo: "%",
      numerica: true,
      /*
       * ⚠️ **PERCENTUAL `null` NÃO É `0 %`** (`RN-DEG-01`): os dois cursos por competências têm
       *    `chPrevista` **zero**, e `0 %` ali seria uma afirmação sobre execução em vez da ausência de
       *    denominador.
       */
      celula: (q) => (q.percentual === null ? "—" : `${q.percentual} %`),
    },
    {
      chave: "resta",
      titulo: "Resta (TA)",
      numerica: true,
      celula: (q) => (q.chPrevista === 0 ? "—" : q.chRestante),
    },
    {
      chave: "situacao",
      titulo: "Situação",
      celula: (q) => (
        <BadgeStatus tom={APARENCIA[q.situacao].tom} rotulo={APARENCIA[q.situacao].rotulo} />
      ),
    },
  ];

  return (
    <section
      data-slot="painel-de-situacao"
      aria-label="Situação das disciplinas e carga horária"
      className="rounded-ciaara border-borda bg-superficie flex min-w-0 flex-col gap-3 border p-3"
    >
      <header className="flex flex-col">
        <h2 className="text-texto text-sm font-semibold">Situação por disciplina</h2>
        {/*
          ⚠️ **O CORTE É DITO NA TELA, e não presumido.** Sem esta linha, o acumulado de uma semana
             passada se leria como o acumulado de hoje — e a diferença é justamente o que a
             `RN-CRONOS-03` existe para preservar.
        */}
        <p className="text-texto-suave text-xs">
          Carga horária acumulada até a semana de {rotuloDaSemana}. Clique numa disciplina — ou
          tecle Enter sobre ela — para abrir as unidades de ensino.
        </p>
      </header>

      {quadros.length === 0 ? (
        /* ⚠️ Vazio é VAZIO, e é dito: *"não há"* é diferente de *"você não vê"* (gotcha 4). */
        <p role="status" className="text-texto-suave text-sm" data-slot="sem-disciplinas">
          Esta turma não tem disciplina com carga horária prevista na grade.
        </p>
      ) : (
        <div data-slot="quadro-por-disciplina" className="min-w-0">
          <TabelaDensa
            linhas={quadros}
            colunas={colunas}
            chaveLinha={(q) => q.disciplinaId}
            rotulo="Situação por disciplina"
            densidade="compacta"
            aoAtivarLinha={alternar}
            abertas={abertas}
            detalhe={(q) => (
              <UnidadesDaDisciplina
                codigo={q.codigo}
                unidades={unidadesPorDisciplina.get(q.disciplinaId) ?? []}
              />
            )}
          />
        </div>
      )}
    </section>
  );
}

/**
 * A cascata de uma disciplina: as UEs dela, com prevista, lançada, restante e situação.
 *
 * ⚠️ **EXPORTADA PARA SER DESENHADA NO TESTE DE UNIDADE**: dentro do painel ela só existe com a linha
 * aberta, e abrir é clique — que se prova no navegador (`tests/e2e/dsa-situacao.spec.ts`).
 *
 * ⚠️ **A TABELA DE DENTRO É SÓ LEITURA, SEM CÉLULA NAVEGÁVEL**, e é por isso que ela não é uma
 * segunda `TabelaDensa`: a linha de detalhe fica **fora** da grade de teclado da tabela única, e
 * conteúdo navegável ali dentro quebraria o *"`Tab` entra na grade e sai dela em um passo"*.
 */
export function UnidadesDaDisciplina({
  codigo,
  unidades,
}: {
  readonly codigo: string;
  readonly unidades: readonly UnidadeNoQuadro[];
}) {
  /* A ordem do currículo: UE 1, 2, 3… A view não garante ordem nenhuma. */
  const emOrdem = [...unidades].sort((a, b) => a.numero - b.numero);

  return (
    <div data-slot="ues-da-disciplina" data-unidades-de={codigo} className="flex flex-col gap-2">
      {emOrdem.length === 0 ? (
        <p role="status" className="text-texto-suave text-xs" data-slot="sem-unidades">
          {codigo} não tem unidades de ensino cadastradas.
        </p>
      ) : (
        <>
          {/*
            ⚠️ **O LIMITE DA UE, DITO ONDE ELA APARECE.** A soma das UEs não fecha com a disciplina
               por desenho: a avaliação não aponta UE e a aula sem UE da `D-DSA-1` não tem onde cair —
               a `PEND-E8-1` registra o primeiro.
          */}
          <p className="text-texto-suave text-xs">
            Unidades de ensino de {codigo}, acumuladas até a mesma semana. Avaliação e aula sem
            unidade de ensino contam só na disciplina.
          </p>
          <table data-slot="quadro-por-unidade" className="w-full border-collapse text-xs">
            <thead>
              <tr className="text-texto-suave">
                <th scope="col" className="border-borda border-b p-1 text-left font-medium">
                  Unidade de ensino
                </th>
                <th scope="col" className="border-borda border-b p-1 text-right font-medium">
                  Prevista (TA)
                </th>
                <th scope="col" className="border-borda border-b p-1 text-right font-medium">
                  Lançada (TA)
                </th>
                <th scope="col" className="border-borda border-b p-1 text-right font-medium">
                  Resta (TA)
                </th>
                <th scope="col" className="border-borda border-b p-1 text-left font-medium">
                  Situação
                </th>
              </tr>
            </thead>
            <tbody>
              {emOrdem.map((u) => {
                const q = quadroDaUnidade({ chPrevista: u.prevista, chLancada: u.lancada });
                const aparencia = APARENCIA_DA_UNIDADE[q.situacao];
                return (
                  /* ⚠️ Os números vão também no ATRIBUTO, não só no texto (`RNF-USA-05`). */
                  <tr
                    key={u.id}
                    data-unidade={u.numero}
                    data-prevista={q.chPrevista}
                    data-lancada={q.chLancada}
                    data-restante={q.chRestante}
                    data-situacao={q.situacao}
                  >
                    <th
                      scope="row"
                      className="border-borda border-b p-1 text-left font-normal whitespace-normal"
                    >
                      <span className="text-texto font-medium">UE {u.numero}</span>
                      <span className="text-texto-suave block">{u.topico}</span>
                    </th>
                    <td className="border-borda border-b p-1 text-right align-top tabular-nums">
                      {q.chPrevista}
                    </td>
                    <td className="border-borda border-b p-1 text-right align-top tabular-nums">
                      {q.chLancada}
                    </td>
                    <td className="border-borda border-b p-1 text-right align-top tabular-nums">
                      {q.chRestante}
                    </td>
                    <td className="border-borda border-b p-1 align-top">
                      <BadgeStatus tom={aparencia.tom} rotulo={aparencia.rotulo} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

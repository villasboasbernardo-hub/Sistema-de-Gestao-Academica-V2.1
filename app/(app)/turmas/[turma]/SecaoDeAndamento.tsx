/**
 * A seção **Andamento** da ficha da turma (`FR-023` a `FR-027`, `FR-035`, `SC-005` da spec 012).
 *
 * ⚠️ **AQUI NÃO SE CALCULA NADA.** Todo número chega pronto de `lib/dominio/andamento-da-turma.ts`,
 * que é o único lugar do sistema onde `emAtraso` se decide (`SC-006`). Esta folha escolhe **frases**,
 * e a escolha segue `contracts/andamento.md` §2.
 *
 * ⚠️ **ELA GANHOU A FAIXA DE INDICADORES EM 05/10/2026** *(decisão de Bernardo, na conferência:
 * cabeçalho compacto, faixa de indicadores, Andamento em destaque)*. ⚠️ **E A FAIXA FICOU DENTRO
 * DESTA SEÇÃO, não acima dela, por uma razão medida:** os marcadores `data-andamento="prevista"`,
 * `"executada"` e `"percentual"` são lidos por `tests/e2e/andamento.spec.ts` **dentro** de
 * `[data-slot="andamento-da-turma"]`, e a tela já pagou uma vez o preço de mostrar o mesmo número
 * duas vezes (o `<dl>` de somente-leitura que saiu em 04/10/2026, com a razão escrita em `page.tsx`).
 * Faixa fora da seção seria ou **dois lugares com o mesmo marcador** — violação de modo estrito, que
 * falha na hora e não reexecuta — ou o mesmo dado escrito duas vezes na mesma tela.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE** — ela não interage.
 *
 * ⚠️ **"SALDO DE CAPACIDADE (TA)" É O NOME DO INDICADOR, e ele é normativo** (`D-NAV-4`, Glossário
 * 07): a palavra que a v2.0 usava na conversa **não** é termo do glossário e não aparece em tela,
 * código ou banco — há guarda varrendo o repositório por ela (`SC-007`).
 *
 * ⚠️ **NENHUM ESTADO DESTA SEÇÃO BLOQUEIA A EDIÇÃO DA FICHA** (`FR-033`, `RN-DEG-02`): falta de
 * término ou de regime vigente degrada **este** quadro e deixa o formulário intacto — é justamente
 * pelo formulário que a pessoa conserta a data que falta. Desde 05/10/2026 ele vive recolhido atrás
 * de *"Editar turma"*, um clique abaixo: a frase daqui continua apontando para lá.
 */
import type { Andamento } from "@/lib/dominio/andamento-da-turma";
import { dataParaLeitura } from "@/lib/formato/data";
import { BadgeStatus } from "@/components/ciaara/badge-status";
import { BarraDeProgresso } from "@/components/ciaara/barra-de-progresso";
import { CardKpi } from "@/components/ciaara/card-kpi";

import { Rotulo } from "./Rotulo";

/** `+32` · `-12` — o sinal do saldo é informação, e o positivo também precisa aparecer. */
function comSinal(valor: number): string {
  return valor > 0 ? `+${valor}` : String(valor);
}

/** `1 dia` · `4 dias` · `-3 dias` — o plural olha o módulo, senão `-1` sairia "dias". */
function emDias(valor: number): string {
  return `${valor} ${Math.abs(valor) === 1 ? "dia" : "dias"}`;
}

/** A frase de degradação, no lugar do número que não existe (`RN-DEG-01`). */
function Frase({ children, slot }: { readonly children: React.ReactNode; readonly slot: string }) {
  return (
    <span className="text-texto-suave" data-andamento={slot}>
      {children}
    </span>
  );
}

export function SecaoDeAndamento({
  andamento,
  dataTermino,
}: {
  readonly andamento: Andamento;
  /** O término **gravado na turma** — é ele que a frase de `sem_termino` manda informar. */
  readonly dataTermino: string | null;
}) {
  const { prevista, executada, percentual, saldo, saldoEmDias, capacidadeDiaria, diasUteis } =
    andamento;

  const calculada = andamento.situacaoDaCapacidade === "calculada";
  /*
   * ⚠️ **O CARTÃO DO SALDO NÃO MOSTRA ZERO QUANDO NÃO HÁ SALDO, E A DISTINÇÃO É O REQUISITO.** Ele
   *    mostra traço com a razão curta ao lado, e a **frase inteira** fica na linha de detalhe abaixo
   *    — porque são duas ausências diferentes, que se consertam em lugares diferentes (`FR-026.1`,
   *    `FR-027`). `0` ali seria o gotcha 4 na forma de número: a ausência chega como medição.
   */
  const razaoCurta =
    andamento.situacaoDaCapacidade === "sem_termino" ? "sem término" : "sem regime vigente";

  return (
    <section
      aria-labelledby="titulo-do-andamento"
      className="flex flex-col gap-3"
      data-slot="andamento-da-turma"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="titulo-do-andamento" className="text-texto text-base font-semibold">
          Andamento
        </h2>
        {/*
          ⚠️ **A TARJA SUBIU PARA O LADO DO TÍTULO EM 05/10/2026** — é o veredito da seção, e no pé
             dela ela ficava abaixo de tudo o que a explica. Ela é alerta, nunca bloqueio
             (`RN-DEG-02`), e só existe para turma **ativa** com saldo negativo: concluída, cancelada
             e planejada não estão *"em andamento"*, que é a palavra do `RF-INI-01`. Quem decide é o
             módulo puro; aqui só se desenha.
        */}
        {andamento.emAtraso ? (
          <span className="flex items-center gap-2 text-sm" data-slot="em-atraso">
            <BadgeStatus tom="atrasado" rotulo="Em atraso" />
            <span className="text-texto-suave">
              A capacidade restante até o término não cobre a carga que falta.
            </span>
          </span>
        ) : null}
      </div>

      {/*
        ⚠️ **A FAIXA USA O `CardKpi`, QUE NÃO FORMATA NADA** — *"quem divide, soma ou compara é quem
           chama"*, diz o cabeçalho dele. O valor chega como texto montado, do mesmo jeito que o
           `/inicio` faz desde a fatia (c) do Épico 4.
        ⚠️ **E A UNIDADE VAI DENTRO DO VALOR, de propósito:** no `unidade` ela sai noutro `<span>`, e
           `10` e `TA` ficariam colados no texto do elemento (`10TA`) — o que quebra a asserção que
           procura `10 TA` sem que nada na tela pareça errado.
      */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div data-andamento="prevista">
          <CardKpi rotulo="CH prevista" valor={`${prevista} TA`} />
        </div>
        <div data-andamento="executada">
          <CardKpi rotulo="CH executada" valor={`${executada} TA`} />
        </div>
        <div data-andamento="percentual">
          <CardKpi
            rotulo="Progresso"
            valor={percentual === null ? "—" : `${percentual} %`}
            {...(percentual === null ? { unidade: "sem CH prevista" } : {})}
          />
        </div>
        <div data-andamento="saldo">
          <CardKpi
            rotulo="Saldo de capacidade (TA)"
            valor={saldo === null ? "—" : `${comSinal(saldo)} TA`}
            {...(calculada ? {} : { unidade: razaoCurta })}
            {...(calculada && saldoEmDias !== null
              ? {
                  variacao: {
                    texto: `${emDias(saldoEmDias)} de capacidade`,
                    favoravel: saldo !== null && saldo >= 0,
                  },
                }
              : {})}
          />
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <Rotulo>Progresso</Rotulo>
        <dd className="text-texto">
          {/*
            ⚠️ **TRÊS CAMINHOS, E A ORDEM IMPORTA.** Currículo **por competências** não tem CH em
               disciplina — são **dois** cursos na base real —, e ali `0%` não é um progresso baixo:
               é ausência de denominador. Depois dele vem a turma que ainda não lançou nada, que
               também não é `0%` executado (`FR-029`): é falta de lançamento.
          */}
          {percentual === null ? (
            <Frase slot="sem-prevista">
              O curso não tem carga curricular lançada em disciplinas.
            </Frase>
          ) : andamento.semLancamentos ? (
            <Frase slot="sem-lancamentos">Ainda sem lançamentos.</Frase>
          ) : (
            <BarraDeProgresso
              valor={percentual}
              tom={andamento.emAtraso ? "atrasado" : "executado"}
              rotuloAcessivel={`Progresso da turma: ${percentual}% da carga prevista`}
              className="max-w-56"
            />
          )}
        </dd>

        <Rotulo>Saldo em dias</Rotulo>
        <dd className="text-texto">
          {/*
            ⚠️ **AS DUAS FRASES NOMEIAM O QUE FALTA, E NÃO É A MESMA COISA** (`FR-026.1`, `FR-027`):
               sem **término** o saldo não se calcula porque não há intervalo, e o conserto é um
               campo desta própria ficha; sem **regime vigente** falta o TA/dia do curso, e o
               conserto é a vigência do curso. Uma frase só mandaria metade das pessoas ao lugar
               errado.
            ⚠️ **E O SALDO APARECE EM TURMA SEM LANÇAMENTO, o que EMENDA a tabela de
               `contracts/andamento.md` §2**: o `restante` é a prevista inteira quando nada foi
               lançado, então é justamente a turma que ainda não começou que pode já estar sem
               capacidade para terminar. Esconder o número e mostrar a tarja diria o veredito sem
               dizer de quanto.
          */}
          {andamento.situacaoDaCapacidade === "sem_termino" ? (
            <Frase slot="sem-termino">Sem data de término — informe-a para calcular o saldo.</Frase>
          ) : andamento.situacaoDaCapacidade === "sem_regime" ? (
            <Frase slot="sem-regime">
              Sem dado de capacidade — o curso não tem regime vigente para a modalidade desta turma.
            </Frase>
          ) : (
            <span
              className={andamento.emAtraso ? "text-atrasado-tinta font-medium" : undefined}
              data-andamento="saldo-em-dias"
            >
              {emDias(saldoEmDias ?? 0)}
            </span>
          )}
        </dd>

        {/*
          ⚠️ **A CAPACIDADE DIÁRIA SÓ APARECE QUANDO FOI USADA.** Ela é o `TA/dia` do regime vigente
             do curso escolhido pela modalidade da **turma** (`RN-MAT-04`), e mostrá-la sem o saldo
             seria exibir o insumo de uma conta que a tela acabou de dizer que não fez.
        */}
        {capacidadeDiaria !== null && diasUteis !== null ? (
          <>
            <Rotulo>Capacidade diária</Rotulo>
            <dd className="text-texto" data-andamento="capacidade">
              {capacidadeDiaria} TA/dia · {diasUteis} dias úteis
              {dataTermino === null ? "" : ` até ${dataParaLeitura(dataTermino)}`}
            </dd>
          </>
        ) : null}
      </dl>
    </section>
  );
}

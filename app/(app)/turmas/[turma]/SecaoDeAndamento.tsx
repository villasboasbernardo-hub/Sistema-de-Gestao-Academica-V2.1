/**
 * A seção **Andamento** da ficha da turma (`FR-023` a `FR-027`, `SC-005` da spec 012; `RF-INI-01`).
 *
 * ⚠️ **AQUI NÃO SE CALCULA NADA.** Todo número chega pronto de `lib/dominio/andamento-da-turma.ts`,
 * que é o único lugar do sistema onde `emAtraso` se decide (`SC-006`). Esta folha escolhe **frases**,
 * e a escolha segue `contracts/andamento.md` §2.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE** — ela não interage.
 *
 * ⚠️ **"SALDO DE CAPACIDADE (TA)" É O NOME DO INDICADOR, e ele é normativo** (`D-NAV-4`, Glossário
 * 07): a palavra que a v2.0 usava na conversa **não** é termo do glossário e não aparece em tela,
 * código ou banco — há guarda varrendo o repositório por ela (`SC-007`).
 *
 * ⚠️ **NENHUM ESTADO DESTA SEÇÃO BLOQUEIA A EDIÇÃO DA FICHA** (`FR-033`, `RN-DEG-02`): falta de
 * término ou de regime vigente degrada **este** quadro e deixa o formulário intacto — é justamente
 * pelo formulário que a pessoa conserta a data que falta.
 */
import type { Andamento } from "@/lib/dominio/andamento-da-turma";
import { dataParaLeitura } from "@/lib/formato/data";
import { BadgeStatus } from "@/components/ciaara/badge-status";
import { BarraDeProgresso } from "@/components/ciaara/barra-de-progresso";

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

  return (
    <section
      aria-labelledby="titulo-do-andamento"
      className="flex flex-col gap-2"
      data-slot="andamento-da-turma"
    >
      <h2 id="titulo-do-andamento" className="text-texto text-base font-semibold">
        Andamento
      </h2>

      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <Rotulo>CH prevista</Rotulo>
        <dd className="text-texto" data-andamento="prevista">
          {prevista} TA
        </dd>

        <Rotulo>CH executada</Rotulo>
        <dd className="text-texto" data-andamento="executada">
          {executada} TA
        </dd>

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
            <span className="flex flex-col gap-1">
              <span data-andamento="percentual">{percentual} %</span>
              <BarraDeProgresso
                valor={percentual}
                tom={andamento.emAtraso ? "atrasado" : "executado"}
                rotuloAcessivel={`Progresso da turma: ${percentual}% da carga prevista`}
                className="max-w-56"
              />
            </span>
          )}
        </dd>

        <Rotulo>Saldo de capacidade (TA)</Rotulo>
        <dd className="text-texto">
          {/*
            ⚠️ **AS DUAS FRASES NOMEIAM O QUE FALTA, E NÃO É A MESMA COISA** (`FR-026.1`, `FR-027`):
               sem **término** o saldo não se calcula porque não há intervalo, e o conserto é um
               campo desta própria ficha; sem **regime vigente** falta o TA/dia do curso, e o
               conserto é a vigência do curso. Uma frase só mandaria metade das pessoas ao lugar
               errado.
            ⚠️ **ELE CONTINUA APARECENDO EM TURMA SEM LANÇAMENTO, e isto EMENDA a tabela de
               `contracts/andamento.md` §2**, que mandava escondê-lo junto com o progresso. O motivo
               é medido no desenho: o saldo é `capacidade − restante`, e `restante` é a **prevista**
               inteira quando nada foi lançado — ou seja, é exatamente a turma que ainda não começou
               que pode já estar sem capacidade para terminar. Esconder o número e mostrar a tarja
               *"em atraso"* logo abaixo diria o veredito sem dizer de quanto.
          */}
          {andamento.situacaoDaCapacidade === "sem_termino" ? (
            <Frase slot="sem-termino">Sem data de término — informe-a para calcular o saldo.</Frase>
          ) : andamento.situacaoDaCapacidade === "sem_regime" ? (
            <Frase slot="sem-regime">
              Sem dado de capacidade — o curso não tem regime vigente para a modalidade desta turma.
            </Frase>
          ) : (
            <span className={andamento.emAtraso ? "text-atrasado-tinta font-medium" : undefined}>
              <span data-andamento="saldo">{comSinal(saldo ?? 0)} TA</span>
              {" · "}
              <span data-andamento="saldo-em-dias">{emDias(saldoEmDias ?? 0)}</span>
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

      {/*
        ⚠️ **A TARJA É ALERTA, NUNCA BLOQUEIO** (`RN-DEG-02`), e ela só existe para turma **ativa**
           com saldo negativo — concluída, cancelada e planejada não estão *"em andamento"*, que é a
           palavra do `RF-INI-01`. Quem decide é o módulo puro; aqui só se desenha.
      */}
      {andamento.emAtraso ? (
        <p className="flex items-center gap-2 text-sm" data-slot="em-atraso">
          <BadgeStatus tom="atrasado" rotulo="Em atraso" />
          <span className="text-texto-suave">
            A capacidade restante até o término não cobre a carga que falta.
          </span>
        </p>
      ) : null}
    </section>
  );
}

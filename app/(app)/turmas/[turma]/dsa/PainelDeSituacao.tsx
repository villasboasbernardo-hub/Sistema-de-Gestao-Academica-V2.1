/**
 * O painel de **situação e carga horária** da turma, ao lado da grade (`RF-DSA-05`, `RN-CRONOS-03`,
 * `Q-2`, `FR-028.1` · spec 013, PR 5).
 *
 * ⚠️ **SERVER COMPONENT, SEM MARCADOR DE CLIENTE.** Ele não tem interação nenhuma: recebe os
 * quadros **já calculados** e desenha. Um `"use client"` aqui levaria duas tabelas ao pacote do
 * navegador para ganhar nada (gotcha 1).
 *
 * ⚠️ **ELE NÃO CALCULA NADA.** A situação, o acumulado, o restante, o percentual e o *lançado à
 * frente* saem de `quadroDaDisciplina`, em `lib/dominio/dsa/situacao.ts`, com teste ao lado. A
 * `RN-CRONOS-03` tem **uma** implementação, e o percentual tem **um** dono (`percentualExecutado`)
 * — uma quarta cópia da conta de uma linha passaria sem ninguém notar até o dia em que uma delas
 * arredondasse para o outro lado.
 *
 * ⚠️ **O ACUMULADO É ATÉ A SEMANA SELECIONADA, NÃO ATÉ HOJE** (`RN-CRONOS-03`, `Q-2`): abrir a
 * semana 20 mostra a CH acumulada **até a 20**. E esse é o **único** corte que existe: lançamento
 * com data futura **conta** e aparece **marcado**, porque a `Q-2` decidiu que `chd_executada` não
 * muda de valor — cortar por hoje mudaria o número da ficha da turma e o atraso do `/inicio` sem
 * que ninguém tivesse lançado nada.
 */
import { BadgeStatus } from "@/components/ciaara/badge-status";
import type { Tom } from "@/lib/design/vocabulario";
import type { QuadroDaDisciplina } from "@/lib/dominio/dsa/situacao";

/** O quadro de uma disciplina, com o que a tela precisa para nomeá-la. */
export type QuadroParaExibir = QuadroDaDisciplina & {
  readonly codigo: string;
  readonly nome: string;
};

/** Uma unidade de ensino no quadro — prevista, lançada e restante (`P-3` da planilha). */
export type UnidadeNoQuadro = {
  readonly id: string;
  readonly disciplinaCodigo: string;
  readonly numero: number;
  readonly topico: string;
  readonly prevista: number;
  readonly lancada: number;
  readonly restante: number;
};

/**
 * O rótulo e o tom de cada situação.
 *
 * ⚠️ **`conflitou` USA O TOM DE CONFLITO — o mesmo que a grade usa na célula.** Dois tons para a
 * mesma coisa faria a tela dizer que são coisas diferentes.
 *
 * ⚠️ **`concluida` USA `conformidade`, E NÃO UM TOM NOVO:** o vocabulário do tema tem nove tons
 * declarados (`lib/design/vocabulario.ts`), e um nome inventado aqui **não compilaria para cor
 * nenhuma** — é o defeito dos cinco tokens inexistentes de 05/10/2026, que a invariante `I-4c`
 * passou a guardar.
 */
const APARENCIA: Readonly<
  Record<QuadroDaDisciplina["situacao"], { readonly rotulo: string; readonly tom: Tom }>
> = {
  aguardando_inicio: { rotulo: "Aguardando início", tom: "planejado" },
  em_andamento: { rotulo: "Em andamento", tom: "executado" },
  concluida: { rotulo: "Concluída", tom: "conformidade" },
  conflitou: { rotulo: "Conflitou", tom: "conflito" },
};

export function PainelDeSituacao({
  quadros,
  unidades,
  rotuloDaSemana,
}: {
  readonly quadros: readonly QuadroParaExibir[];
  readonly unidades: readonly UnidadeNoQuadro[];
  readonly rotuloDaSemana: string;
}) {
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
          Carga horária acumulada até a semana de {rotuloDaSemana}.
        </p>
      </header>

      {quadros.length === 0 ? (
        /* ⚠️ Vazio é VAZIO, e é dito: *"não há"* é diferente de *"você não vê"* (gotcha 4). */
        <p role="status" className="text-texto-suave text-sm" data-slot="sem-disciplinas">
          Esta turma não tem disciplina com carga horária prevista na grade.
        </p>
      ) : (
        <table className="w-full border-collapse text-xs" data-slot="quadro-por-disciplina">
          <thead>
            <tr className="text-texto-suave">
              <th scope="col" className="border-borda border-b p-1 text-left font-medium">
                Disciplina
              </th>
              <th scope="col" className="border-borda border-b p-1 text-left font-medium">
                Situação
              </th>
              <th scope="col" className="border-borda border-b p-1 text-right font-medium">
                Acumulada
              </th>
              <th scope="col" className="border-borda border-b p-1 text-right font-medium">
                Prevista
              </th>
              <th scope="col" className="border-borda border-b p-1 text-right font-medium">
                Resta
              </th>
            </tr>
          </thead>
          <tbody>
            {quadros.map((q) => (
              <tr key={q.disciplinaId} data-disciplina={q.codigo}>
                <th scope="row" className="border-borda border-b p-1 text-left font-normal">
                  <span className="text-texto font-medium">{q.codigo}</span>
                  <span className="text-texto-suave block">{q.nome}</span>
                  {/*
                    ⚠️ **O «LANÇADO À FRENTE» É DITO EM TEXTO, COM O NÚMERO NO ATRIBUTO**
                       (`FR-028.1`, `RNF-USA-05`). Ele **conta** no acumulado — é a decisão da `Q-2`
                       —, e por isso precisa aparecer: sem a marca, a pessoa leria execução onde há
                       planejamento, que é o `D-5` da planilha (*"a CH cumprida conta semana futura
                       já planejada como cumprida"*) com a diferença de que aqui está **escrito**.
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
                </th>
                <td className="border-borda border-b p-1 align-top">
                  <BadgeStatus
                    tom={APARENCIA[q.situacao].tom}
                    rotulo={APARENCIA[q.situacao].rotulo}
                  />
                </td>
                <td className="border-borda border-b p-1 text-right align-top tabular-nums">
                  {q.chAcumulada}
                  {/*
                    ⚠️ **PERCENTUAL `null` NÃO É `0 %`** (`RN-DEG-01`): os dois cursos por
                       competências têm `chPrevista` **zero**, e `0 %` ali seria uma afirmação sobre
                       execução em vez da ausência de denominador.
                  */}
                  {q.percentual === null ? null : (
                    <span className="text-texto-suave block text-[10px]">{q.percentual}%</span>
                  )}
                </td>
                <td className="border-borda border-b p-1 text-right align-top tabular-nums">
                  {q.chPrevista === 0 ? "—" : q.chPrevista}
                </td>
                <td className="border-borda border-b p-1 text-right align-top tabular-nums">
                  {q.chPrevista === 0 ? "—" : q.chRestante}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex flex-col gap-1">
        <h2 className="text-texto text-sm font-semibold">Por unidade de ensino</h2>
        {unidades.length === 0 ? (
          <p role="status" className="text-texto-suave text-sm" data-slot="sem-unidades">
            Nenhuma unidade de ensino oferecida a esta turma.
          </p>
        ) : (
          <table className="w-full border-collapse text-xs" data-slot="quadro-por-unidade">
            <thead>
              <tr className="text-texto-suave">
                <th scope="col" className="border-borda border-b p-1 text-left font-medium">
                  Unidade
                </th>
                <th scope="col" className="border-borda border-b p-1 text-right font-medium">
                  Lançada
                </th>
                <th scope="col" className="border-borda border-b p-1 text-right font-medium">
                  Prevista
                </th>
                <th scope="col" className="border-borda border-b p-1 text-right font-medium">
                  Resta
                </th>
              </tr>
            </thead>
            <tbody>
              {unidades.map((u) => (
                <tr key={u.id} data-unidade={u.numero}>
                  <th scope="row" className="border-borda border-b p-1 text-left font-normal">
                    <span className="text-texto font-medium">
                      {u.disciplinaCodigo} · UE {u.numero}
                    </span>
                    <span className="text-texto-suave block">{u.topico}</span>
                  </th>
                  <td className="border-borda border-b p-1 text-right align-top tabular-nums">
                    {u.lancada}
                  </td>
                  <td className="border-borda border-b p-1 text-right align-top tabular-nums">
                    {u.prevista}
                  </td>
                  <td className="border-borda border-b p-1 text-right align-top tabular-nums">
                    {u.restante}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

/**
 * A carga horária do instrutor no ano corrente — somente leitura (`FR-014`, `FR-015`, `RF-INSTR-13`).
 *
 * ⚠️ SEM MARCADOR DE CLIENTE, E SEM CAMPO. As duas grandezas são calculadas pelo banco: a ministrada vem
 * dos lançamentos, e a prevista das atribuições ativas, pela fórmula da T011 (decisão de Bernardo
 * Villas Boas, 15/09/2026) — ano pela data de início prevista, rateio pelo `RN-MAT-05`.
 *
 * ⚠️ A MÉDIA SEMANAL APARECE POR ATRIBUIÇÃO, E NÃO SOMADA. A soma é por semana ISO, só das atribuições
 * que cobrem a mesma semana (decisão de Bernardo Villas Boas, 15/09/2026), e vive em
 * `lib/dominio/carga-semanal.ts`; o alerta de faixa sai no topo da ficha, nomeando a semana.
 *
 * ⚠️ FALHA DE LEITURA É "—", NÃO ZERO (`RN-DEG-01`). Zero afirmaria que não houve aula nem atribuição.
 */
import { dataParaLeitura } from "@/lib/formato/data";

export type AtribuicaoPrevista = {
  readonly id: string;
  readonly disciplina: string;
  readonly curso: string;
  readonly turma: string;
  readonly inicio: string | null;
  readonly termino: string | null;
  readonly tempos: number;
  readonly semanas: number | null;
  readonly mediaSemanal: number | null;
};

const numero = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function CargaDoInstrutor({
  ano,
  ministrada,
  prevista,
  atribuicoes,
}: {
  readonly ano: number;
  readonly ministrada: number | null;
  readonly prevista: number | null;
  /** `null` quando a leitura das atribuições falhou. */
  readonly atribuicoes: readonly AtribuicaoPrevista[] | null;
}) {
  return (
    <section
      aria-labelledby="carga-do-instrutor"
      className="border-borda rounded-ciaara flex flex-col gap-3 border p-4 text-sm"
      data-slot="carga-do-instrutor"
    >
      <h2 id="carga-do-instrutor" className="text-texto font-semibold">
        Carga horária de {ano}
      </h2>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <div>
          <dt className="text-texto-suave">Ministrada no ano</dt>
          <dd className="text-texto" data-slot="carga-ministrada">
            {ministrada === null ? "—" : `${numero(ministrada)} TA`}
          </dd>
        </div>
        <div>
          <dt className="text-texto-suave">Prevista no ano</dt>
          <dd className="text-texto" data-slot="carga-prevista">
            {prevista === null ? "—" : `${numero(prevista)} TA`}
          </dd>
        </div>
      </dl>

      {atribuicoes === null ? (
        <p className="text-texto-suave" role="status">
          Não foi possível ler as atribuições deste instrutor.
        </p>
      ) : atribuicoes.length === 0 ? (
        <p className="text-texto-suave" data-slot="sem-atribuicao">
          Nenhuma atribuição ativa.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm" data-slot="atribuicoes-previstas">
            <caption className="text-texto-suave mb-1 text-left text-xs">
              Atribuições ativas e a média semanal de cada uma
            </caption>
            <thead>
              <tr className="text-texto-suave text-left">
                <th className="border-borda border-b px-2 py-1 font-medium">Disciplina</th>
                <th className="border-borda border-b px-2 py-1 font-medium">Turma</th>
                <th className="border-borda border-b px-2 py-1 font-medium">Janela prevista</th>
                <th className="border-borda border-b px-2 py-1 text-right font-medium">Tempos</th>
                <th className="border-borda border-b px-2 py-1 text-right font-medium">Semanas</th>
                <th className="border-borda border-b px-2 py-1 text-right font-medium">
                  Média semanal
                </th>
              </tr>
            </thead>
            <tbody>
              {atribuicoes.map((a) => (
                <tr key={a.id} className="border-borda border-b">
                  <td className="text-texto px-2 py-1">
                    {a.disciplina} ({a.curso})
                  </td>
                  <td className="text-texto px-2 py-1">{a.turma}</td>
                  <td className="text-texto px-2 py-1">
                    {dataParaLeitura(a.inicio)} a {dataParaLeitura(a.termino)}
                  </td>
                  <td className="text-texto px-2 py-1 text-right tabular-nums">
                    {numero(a.tempos)}
                  </td>
                  <td className="text-texto px-2 py-1 text-right tabular-nums">
                    {a.semanas ?? "—"}
                  </td>
                  <td className="text-texto px-2 py-1 text-right tabular-nums">
                    {a.mediaSemanal === null ? "—" : numero(a.mediaSemanal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* veste: a dica que diz de onde vêm os números — texto fixo, nunca dado */}
      <p className="text-texto-tenue text-xs">
        Calculadas a partir das aulas lançadas e das atribuições ativas; não são digitadas. A
        prevista usa a data de início prevista da disciplina e reparte a carga entre os instrutores
        designados.
      </p>
    </section>
  );
}

/**
 * *Histórico da situação* na ficha da turma — D-COR-4 e D-COR-5 (spec 017, FR-003.4 e FR-004.5).
 *
 * ⚠️ **SERVIDOR, SEM MARCADOR DE CLIENTE**: recolher é o `<details>` do navegador, que não pede JavaScript. A lista
 *    chega pronta de `historicoDaTurma` — trocas e arquivamentos juntos, o mais recente primeiro.
 * ⚠️ **QUEM VÊ É QUEM LÊ A TURMA**: as duas trilhas têm policy de leitura pelo alcance da turma, e são só de
 *    acréscimo — ninguém as edita, nem o Admin.
 */
import type { EventoDoHistorico } from "@/lib/dominio/historico-da-turma";
import { instanteComHoraParaLeitura } from "@/lib/formato/data";

export function HistoricoDaTurma({ eventos }: { readonly eventos: readonly EventoDoHistorico[] }) {
  return (
    <details className="flex flex-col gap-2" data-slot="historico-da-situacao">
      <summary className="text-texto cursor-pointer text-base font-semibold">
        Histórico da situação{" "}
        <span className="text-texto-suave text-sm font-normal">({eventos.length})</span>
      </summary>
      {eventos.length === 0 ? (
        <p className="text-texto-suave mt-2 text-sm" data-slot="historico-vazio">
          Nenhuma troca de situação registrada desde 19/10/2026, quando o histórico começou.
        </p>
      ) : (
        <ol className="mt-2 flex flex-col gap-1 text-sm">
          {eventos.map((e) => (
            <li
              key={e.chave}
              className="border-borda flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b pb-1"
              data-slot="evento-da-situacao"
            >
              <span className="text-texto font-medium">{e.rotulo}</span>
              <span className="text-texto-suave">
                {e.autor} · {instanteComHoraParaLeitura(e.em)}
              </span>
              {e.observacao ? (
                <span className="text-texto" data-slot="observacao-do-evento">
                  {e.observacao}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}

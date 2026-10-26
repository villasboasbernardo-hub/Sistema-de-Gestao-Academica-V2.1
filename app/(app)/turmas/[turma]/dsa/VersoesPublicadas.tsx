/**
 * As notas da situação da semana e as **versões publicadas** do DSA, abaixo do cabeçalho (spec 024, RP-3 e RP-4; Bloco
 * 11, D-24).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE**: é leitura. As ações estão na barra do cabeçalho (`BarraDoDsa`); aqui fica o que a
 *    situação diz — *alterado desde a publicação*, o lembrete da trava e do rascunho — e o histórico, com o
 *    *Reimprimir* de cada versão, que leva à impressão com `?versao=N` (o retrato, idêntico).
 */
import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import type { SituacaoDaSemana } from "@/lib/dominio/dsa/publicacao";
import { instanteComHoraParaLeitura } from "@/lib/formato/data";

export function VersoesPublicadas({
  situacao,
  enderecosDeReimpressao,
}: {
  readonly situacao: SituacaoDaSemana;
  /** O endereço da impressão de cada versão publicada, pelo número. */
  readonly enderecosDeReimpressao: Readonly<Record<number, string>>;
}) {
  return (
    <>
      {situacao.alteradoDesdeAPublicacao ? (
        <p
          role="alert"
          className="text-atrasado-tinta text-sm font-medium"
          data-slot="alterado-desde-a-publicacao"
        >
          Alterado desde a publicação: o papel de hoje não é mais o publicado (calendário, parada ou
          sincronização). Faça uma alteração para republicar.
        </p>
      ) : null}
      {situacao.travada ? (
        <p className="text-texto-suave text-xs">
          Semana publicada: para lançar, editar ou excluir, use «Fazer alteração».
        </p>
      ) : situacao.rascunhos > 0 ? (
        <p className="text-texto-suave text-xs">
          O que não foi salvo fica guardado, mas não conta em nada (CH, andamento, papel) até
          «Salvar minuta».
        </p>
      ) : null}

      {situacao.historico.length > 0 ? (
        <section
          className="rounded-ciaara border-borda bg-superficie flex flex-col gap-1 border p-3"
          aria-labelledby="versoes-publicadas"
        >
          <h2 id="versoes-publicadas" className="text-texto text-sm font-semibold">
            Versões publicadas
          </h2>
          <div className="overflow-x-auto">
            <table className="text-texto w-full text-sm" data-slot="historico-da-publicacao">
              <thead className="text-texto-suave text-left text-xs">
                <tr className="border-borda border-b">
                  <th className="py-1 pr-3 font-medium">Versão</th>
                  <th className="py-1 pr-3 font-medium">Publicada em</th>
                  <th className="py-1 pr-3 font-medium">Por</th>
                  <th className="py-1 pr-3 font-medium">Justificativa</th>
                  <th className="py-1 font-medium">
                    <span className="sr-only">Reimprimir</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {situacao.historico.map((h) => (
                  <tr key={h.numero} className="border-borda border-b" data-versao={h.numero}>
                    <td className="py-1 pr-3">{h.numero === 0 ? "Original" : `ALT ${h.numero}`}</td>
                    <td className="py-1 pr-3 tabular-nums">
                      {instanteComHoraParaLeitura(h.ocorridoEm)}
                    </td>
                    <td className="py-1 pr-3">{h.autor ?? "—"}</td>
                    <td className="py-1 pr-3">{h.justificativa ?? "—"}</td>
                    <td className="py-1">
                      {enderecosDeReimpressao[h.numero] !== undefined ? (
                        <BotaoDeIcone
                          acao="imprimir"
                          rotulo={`Reimprimir ${h.numero === 0 ? "a original" : `a ALT ${h.numero}`}`}
                          variante="fantasma"
                          className="size-7"
                          href={enderecosDeReimpressao[h.numero] ?? ""}
                          data-slot="reimprimir-versao"
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}

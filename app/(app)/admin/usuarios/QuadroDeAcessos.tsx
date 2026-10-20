/**
 * O quadro *Acessos ao sistema* da lista de usuários — spec 020 (Bloco 5), C-13 a C-15. **Servidor**, só leitura.
 *
 * ⚠️ **A CONTAGEM COMEÇA QUANDO A TABELA ENTROU NO AR**, e o quadro diz isso (*"contados desde"*, a data do primeiro
 *    acesso registrado): sem a frase, "3 acessos" de quem usa o sistema há um mês se leria como "quase não usa".
 * ⚠️ **QUEM MAIS ACESSOU É SÓ DE CONTAS VIVAS**; nos recentes, o acesso de uma conta que saiu continua aparecendo,
 *    como *"Conta excluída"* — apagá-lo da lista seria reescrever o que aconteceu.
 */
import { instanteComHoraParaLeitura, instanteParaLeitura } from "@/lib/formato/data";

export type AcessoRecente = { readonly nome: string; readonly ocorridoEm: string };
export type ContaQueMaisAcessou = { readonly nome: string; readonly total: number };

const TH = "border-borda bg-superficie-2 text-texto border px-2 py-1 text-left";
const TD = "border-borda text-texto border px-2 py-1";

export function QuadroDeAcessos({
  desde,
  maisAcessaram,
  recentes,
}: {
  /** O instante do primeiro acesso registrado; `null` quando não há nenhum. */
  readonly desde: string | null;
  readonly maisAcessaram: readonly ContaQueMaisAcessou[];
  readonly recentes: readonly AcessoRecente[];
}) {
  return (
    <section
      aria-labelledby="titulo-do-quadro-de-acessos"
      className="border-borda rounded-ciaara mt-3 flex flex-col gap-2 border p-3 text-sm"
      data-slot="quadro-de-acessos"
    >
      <h2 id="titulo-do-quadro-de-acessos" className="text-texto font-semibold">
        Acessos ao sistema
        {desde ? (
          <span className="text-texto-suave ml-2 text-xs font-normal">
            contados desde {instanteParaLeitura(desde)}
          </span>
        ) : null}
      </h2>
      {recentes.length === 0 ? (
        <p className="text-texto-suave" role="status">
          Nenhum acesso registrado ainda.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1" data-slot="quem-mais-acessou">
            <h3 className="text-texto text-xs font-semibold">Quem mais acessou</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={TH}>Conta</th>
                  <th className={TH}>Acessos</th>
                </tr>
              </thead>
              <tbody>
                {maisAcessaram.map((c, n) => (
                  <tr key={`${c.nome}-${n}`}>
                    <td className={TD}>{c.nome}</td>
                    <td className={TD}>{c.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-1" data-slot="acessos-recentes">
            <h3 className="text-texto text-xs font-semibold">Acessos recentes</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={TH}>Conta</th>
                  <th className={TH}>Quando</th>
                </tr>
              </thead>
              <tbody>
                {recentes.map((a, n) => (
                  <tr key={`${a.ocorridoEm}-${n}`}>
                    <td className={TD}>{a.nome}</td>
                    <td className={TD}>{instanteComHoraParaLeitura(a.ocorridoEm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

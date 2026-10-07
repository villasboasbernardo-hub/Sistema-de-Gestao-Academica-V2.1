/**
 * O cabeçalho e o rodapé do DSA **na tela** — as mesmas informações do papel (`RF-DSA-06`,
 * `RF-PDF-01`), no visual do sistema: tokens do tema, claro e escuro, sem faixa, logo nem cor
 * institucional, que ficam **só** no `/print/dsa`.
 *
 * ⚠️ **O DADO É O MESMO OBJETO DO PAPEL** (`montarDocumentoDoDsa`): número do DSA, período, alunos,
 * quadro de CH acumulada, técnicas usadas e as assinaturas pela data da semana. Aqui não se calcula
 * nada — só se escreve.
 */
import type { Assinatura } from "@/lib/dominio/dsa/assinaturas";
import { NOTA_DO_ESTUDO_INDIVIDUAL } from "@/lib/dominio/dsa/impressao";
import { NUMERO_AUSENTE_NO_CABECALHO } from "@/lib/dominio/dsa/numero-do-dsa";
import { dataParaLeitura } from "@/lib/formato/data";

import type { DadosDoDocumento } from "../../../../print/dsa/documento";

export function CabecalhoDaSemana({ dados }: { readonly dados: DadosDoDocumento }) {
  const campos: readonly { rotulo: string; valor: string; slot: string }[] = [
    { rotulo: "Semana", valor: `${dados.semana.numero}/${dados.semana.ano}`, slot: "tela-semana" },
    {
      rotulo: "DSA",
      valor: `Nº ${dados.numero === null ? NUMERO_AUSENTE_NO_CABECALHO : dados.numero}`,
      slot: "tela-numero",
    },
    {
      rotulo: "Período",
      valor: `${dataParaLeitura(dados.primeiro)} a ${dataParaLeitura(dados.ultimo)}`,
      slot: "tela-periodo",
    },
    {
      rotulo: "Alunos",
      valor: dados.alunos === null ? "—" : String(dados.alunos),
      slot: "tela-alunos",
    },
  ];
  return (
    <dl
      className="rounded-ciaara border-borda bg-superficie grid grid-cols-2 gap-px overflow-hidden border sm:grid-cols-4"
      data-slot="cabecalho-da-semana"
    >
      {campos.map((c) => (
        <div key={c.rotulo} className="bg-superficie flex flex-col px-3 py-2">
          <dt className="text-xs text-texto-suave">{c.rotulo}</dt>
          <dd className="text-sm font-semibold text-texto tabular-nums" data-slot={c.slot}>
            {c.valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function RodapeDaSemana({
  dados,
  nomeDeQuemImprime,
}: {
  readonly dados: DadosDoDocumento;
  readonly nomeDeQuemImprime: string | null;
}) {
  return (
    <section
      aria-label="Carga horária, técnicas e assinaturas"
      className="rounded-ciaara border-borda bg-superficie flex flex-col gap-3 border p-3"
      data-slot="rodape-da-semana"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="text-sm font-semibold text-texto">Carga horária</h2>
          {dados.quadroDeCh.length === 0 ? (
            <p className="text-sm text-texto-suave">Nenhuma disciplina lançada nesta semana.</p>
          ) : (
            <table className="w-full text-sm" data-slot="tela-quadro-de-ch">
              <thead>
                <tr className="border-b border-borda text-left text-xs text-texto-suave">
                  <th scope="col" className="py-1 pr-2 font-medium">
                    Cód.
                  </th>
                  <th scope="col" className="py-1 pr-2 font-medium">
                    Disciplina
                  </th>
                  <th scope="col" className="py-1 pr-2 text-right font-medium">
                    CH prevista
                  </th>
                  <th scope="col" className="py-1 text-right font-medium">
                    CH cumprida
                  </th>
                </tr>
              </thead>
              <tbody>
                {dados.quadroDeCh.map((d) => (
                  <tr key={d.codigo} className="border-b border-borda last:border-0">
                    <td className="py-1 pr-2 font-semibold whitespace-nowrap">{d.codigo}</td>
                    <td className="py-1 pr-2">{d.nome}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{d.prevista}</td>
                    <td className="py-1 text-right font-semibold tabular-nums">{d.cumprida}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {dados.legenda.length > 0 ? (
            <p className="text-xs text-texto-suave" data-slot="tela-legenda">
              <span className="font-medium text-texto">Técnicas de ensino: </span>
              {dados.legenda.map((i) => `${i.sigla} — ${i.nome}`).join("; ")}
            </p>
          ) : null}
          <p className="text-xs text-texto-suave">{NOTA_DO_ESTUDO_INDIVIDUAL}</p>
          {dados.aFrente === 0 ? null : (
            <p className="text-xs text-texto-suave">
              {dados.aFrente} TA desta semana estão lançados para datas que ainda não chegaram.
            </p>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2" data-slot="tela-assinaturas">
          <h2 className="text-sm font-semibold text-texto">Assinaturas</h2>
          <Rubrica assinatura={dados.assinaturas.esquerda} nomeDeQuemImprime={nomeDeQuemImprime} />
          <Rubrica assinatura={dados.assinaturas.direita} nomeDeQuemImprime={nomeDeQuemImprime} />
        </div>
      </div>
    </section>
  );
}

/** ⚠️ Mesma resolução do papel: modo dinâmico assina quem imprime, sem posto (`Q-14`). */
function Rubrica({
  assinatura,
  nomeDeQuemImprime,
}: {
  readonly assinatura: Assinatura | null;
  readonly nomeDeQuemImprime: string | null;
}) {
  if (assinatura === null) {
    return (
      <p className="text-sm text-atrasado-tinta">
        Sem responsável vigente nesta data — a linha sai em branco no papel.
      </p>
    );
  }
  const nome = assinatura.resolvePeloUsuarioLogado
    ? (nomeDeQuemImprime ?? "")
    : (assinatura.nomeCompleto ?? "");
  const posto = assinatura.resolvePeloUsuarioLogado ? "" : (assinatura.postoGraduacao ?? "");
  return (
    <div className="flex flex-col border-t border-borda pt-1 text-sm">
      <span className="font-semibold text-texto">{[posto, nome].filter(Boolean).join(" ")}</span>
      <span className="text-xs text-texto-suave">{assinatura.funcaoDescricao}</span>
    </div>
  );
}

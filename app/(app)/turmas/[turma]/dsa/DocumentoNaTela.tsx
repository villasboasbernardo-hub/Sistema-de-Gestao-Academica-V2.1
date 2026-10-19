/**
 * O cabeçalho e o rodapé do DSA **na tela** — as mesmas informações do papel (`RF-DSA-06`,
 * `RF-PDF-01`), no visual do sistema: tokens do tema, claro e escuro, sem faixa, logo nem cor
 * institucional, que ficam **só** no `/print/dsa`.
 *
 * ⚠️ **O DADO É O MESMO OBJETO DO PAPEL** (`montarDocumentoDoDsa`): semana do curso, período, alunos,
 * quadro de CH acumulada, técnicas usadas e as assinaturas pela data da semana. Aqui não se calcula
 * nada — só se escreve.
 *
 * ⚠️ **AS ASSINATURAS SÃO EDITÁVEIS, E SÓ PARA A IMPRESSÃO** (item 4 da conferência do PR #40,
 * 08/10/2026): a rubrica é a folha `RubricaEditavel`, e o que se edita vai para o `/print/dsa` pelo
 * endereço do botão *Imprimir* — nunca para o banco. Ver `AssinaturasEditaveis.tsx`.
 */
import { rubricaResolvida } from "@/lib/dominio/dsa/assinatura-editada";
import { NOTA_DO_ESTUDO_INDIVIDUAL } from "@/lib/dominio/dsa/impressao";
import { ROTULO_DO_CAMPO_DA_SEMANA } from "@/lib/dominio/dsa/semana-do-curso";
import { dataParaLeitura } from "@/lib/formato/data";

import type { DadosDoDocumento } from "../../../../print/dsa/documento";
import { RubricaEditavel } from "./AssinaturasEditaveis";

export function CabecalhoDaSemana({ dados }: { readonly dados: DadosDoDocumento }) {
  const campos: readonly { rotulo: string; valor: string; slot: string; emLinha?: boolean }[] = [
    /*
     * ⚠️ **"SEMANA N DE T" NO LUGAR DE "SEMANA 41/2026" E "DSA Nº"** (spec 016, FR-009.2; D-COR-1): a
     *    semana ISO fica só na URL, e o número do DSA passou a ser a semana corrida do curso.
     * ⚠️ **NUM RÓTULO SÓ, como no papel** (ajuste A da conferência do PR #68, 18/10/2026): "Semana do
     *    curso: 28 de 37" numa linha, e não o rótulo em cima e "Semana 28 de 37" embaixo.
     */
    {
      rotulo: ROTULO_DO_CAMPO_DA_SEMANA,
      valor: dados.valorDaSemanaDoCurso,
      slot: "tela-semana",
      emLinha: true,
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
      className="rounded-ciaara border-borda bg-superficie grid grid-cols-2 gap-px overflow-hidden border sm:grid-cols-3"
      data-slot="cabecalho-da-semana"
    >
      {campos.map((c) =>
        c.emLinha ? (
          <div key={c.rotulo} className="bg-superficie flex items-end px-3 py-2" data-slot={c.slot}>
            <dt className="text-xs text-texto-suave">{c.rotulo}:</dt>{" "}
            <dd className="ml-1 text-sm font-semibold text-texto tabular-nums">{c.valor}</dd>
          </div>
        ) : (
          <div key={c.rotulo} className="bg-superficie flex flex-col px-3 py-2">
            <dt className="text-xs text-texto-suave">{c.rotulo}</dt>
            <dd className="text-sm font-semibold text-texto tabular-nums" data-slot={c.slot}>
              {c.valor}
            </dd>
          </div>
        ),
      )}
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
          {/*
            ⚠️ **O «LANÇADO À FRENTE» SAIU DO RODAPÉ DA TELA** (item 3 da conferência do PR #40,
               decisão de Bernardo Villas Boas, 08/10/2026). O cálculo (`taLancadoAFrente`) não mudou
               e o papel (`/print/dsa`) continua dizendo a frase; só a tela deixou de repeti-la aqui.
          */}
        </div>
        <div className="flex min-w-0 flex-col gap-2" data-slot="tela-assinaturas">
          <h2 className="text-sm font-semibold text-texto">Assinaturas</h2>
          <RubricaEditavel
            lado="esquerda"
            titulo="assinatura à esquerda"
            resolvida={rubricaResolvida(dados.assinaturas.esquerda, nomeDeQuemImprime)}
          />
          <RubricaEditavel
            lado="direita"
            titulo="assinatura à direita"
            resolvida={rubricaResolvida(dados.assinaturas.direita, nomeDeQuemImprime)}
          />
        </div>
      </div>
    </section>
  );
}

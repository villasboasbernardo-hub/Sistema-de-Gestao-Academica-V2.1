/**
 * Os DSA da semana atual, como manchetes — spec 019 (Bloco 4), C-8 a C-11 — componente de servidor.
 *
 * ⚠️ **QUEM ENTRA E O QUE A MANCHETE DIZ SÃO DO DOMÍNIO**: `temDsaNaSemana` e `resumoDoDsa`/`fraseDoResumo`
 *    (`lib/dominio/dsa-da-semana.ts`), e a semana do curso é `semanaDoCurso` — a mesma do cabeçalho do DSA.
 * ⚠️ **É A SEMANA DE HOJE, EM QUALQUER ANO ESCOLHIDO** (C-9), e por isso o título diz as datas.
 */

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { Carrossel } from "@/components/ciaara/carrossel";
import { fraseDoResumo, type ResumoDoDsa } from "@/lib/dominio/dsa-da-semana";
import { campoDaSemanaDoCurso, type SemanaDoCurso } from "@/lib/dominio/dsa/semana-do-curso";
import { dataParaLeitura } from "@/lib/formato/data";
import { enderecoDoDsa } from "@/lib/navegacao/endereco-de-turma";

export type MancheteDoDsa = {
  readonly turmaCodigo: string;
  readonly cursoCodigo: string;
  readonly nomeCurso: string;
  readonly semana: SemanaDoCurso;
  readonly resumo: ResumoDoDsa;
};

export function ManchetesDoDsa({
  manchetes,
  semana,
  erro,
}: {
  readonly manchetes: readonly MancheteDoDsa[];
  readonly semana: { readonly de: string; readonly ate: string };
  readonly erro: boolean;
}) {
  const periodo = `${dataParaLeitura(semana.de)} a ${dataParaLeitura(semana.ate)}`;
  return (
    <section
      aria-labelledby="titulo-dsa-da-semana"
      className="flex flex-col gap-2"
      data-slot="dsa-da-semana-do-inicio"
    >
      <h2 id="titulo-dsa-da-semana" className="text-texto text-base font-semibold">
        DSA da semana — {periodo}
      </h2>
      {erro ? (
        <p role="alert" className="text-atrasado-tinta text-sm">
          Não foi possível ler os lançamentos desta semana agora.
        </p>
      ) : manchetes.length === 0 ? (
        <p className="text-texto-suave text-sm" data-slot="sem-dsa-na-semana">
          Nenhuma turma tem DSA nesta semana no recorte atual.
        </p>
      ) : (
        <Carrossel
          rotulo={`DSA da semana de ${periodo}`}
          intervaloMs={8000}
          largura="inteira"
          dataSlot="carrossel-de-dsa"
          itens={manchetes.map((m) => (
            <article
              key={m.turmaCodigo}
              className="border-borda bg-superficie rounded-ciaara flex flex-col gap-1 border p-4"
              data-slot="manchete-do-dsa"
              /* ⚠️ `data-turma` é do CARTÃO (os percursos o procuram na página inteira); a manchete tem o seu. */
              data-turma-da-manchete={m.turmaCodigo}
            >
              <p
                className="text-texto-suave text-xs font-medium tracking-wide uppercase"
                data-slot="semana-do-curso-da-manchete"
              >
                {campoDaSemanaDoCurso(m.semana)}
              </p>
              <h3 className="text-texto text-base font-semibold">
                {m.turmaCodigo}
                <span className="text-texto-suave font-normal"> · {m.nomeCurso}</span>
              </h3>
              <p
                className="text-texto text-sm"
                data-slot="resumo-do-dsa"
                data-ta={m.resumo.ta}
                data-dias={m.resumo.dias}
              >
                {fraseDoResumo(m.resumo)}
              </p>
              <p className="flex justify-end text-sm">
                <BotaoDeIcone
                  acao="abrir-dsa"
                  rotulo="Abrir o DSA"
                  href={enderecoDoDsa(m.turmaCodigo)}
                  data-slot="abrir-o-dsa-da-manchete"
                />
              </p>
            </article>
          ))}
        />
      )}
    </section>
  );
}

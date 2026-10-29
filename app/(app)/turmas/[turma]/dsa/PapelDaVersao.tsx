/**
 * O papel de uma versão publicada do DSA — o conteúdo das abas *Original · ALT N* (Bloco 15, spec 030, `FR-007`).
 *
 * > *"(papel de cada versão publicada, só leitura, com Reimprimir)"* — Bernardo Villas Boas, 29/10/2026
 *
 * ⚠️ **É O RETRATO, NÃO O DADO DE HOJE**: o mesmo `DocumentoDoDsa` do *Reimprimir* e do carrossel do Início (RD-7), com a
 *    data da publicação e o ALT da versão — idêntico ao que foi distribuído, ainda que a semana tenha mudado depois.
 * ⚠️ **SEM MARCADOR DE CLIENTE**: é leitura; a escala do papel é a folha `EscalaDoPapel`.
 */
import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { rotuloDoAlt } from "@/lib/dominio/dsa/publicacao";
import { rotuloDaVersao } from "@/lib/dominio/dsa/versao-escolhida";
import { instanteComHoraParaLeitura } from "@/lib/formato/data";

import type { DadosDoDocumento } from "../../../../print/dsa/documento";
import { DocumentoDoDsa } from "../../../../print/dsa/DocumentoDoDsa";
import { EscalaDoPapel } from "../../../inicio/EscalaDoPapel";

export function PapelDaVersao({
  numero,
  ocorridoEm,
  autor,
  justificativa,
  dados,
  enderecoDeReimpressao,
}: {
  readonly numero: number;
  readonly ocorridoEm: string;
  readonly autor: string | null;
  readonly justificativa: string | null;
  /** O retrato da versão; nulo quando a trilha não o guardou (não acontece desde o Bloco 9, mas o tipo permite). */
  readonly dados: DadosDoDocumento | null;
  readonly enderecoDeReimpressao: string;
}) {
  const nome = rotuloDaVersao(numero);
  return (
    <section
      className="flex min-w-0 flex-col gap-2"
      aria-label={`${nome} publicada`}
      data-slot="papel-da-versao"
      data-versao-aberta={numero}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-texto text-sm">
          <strong>{nome}</strong> · publicada em {instanteComHoraParaLeitura(ocorridoEm)}
          {autor ? ` por ${autor}` : ""}
          {numero > 0 && justificativa ? (
            <span className="text-texto-suave block" data-slot="justificativa-da-versao">
              Justificativa: {justificativa}
            </span>
          ) : null}
        </p>
        <BotaoDeIcone
          acao="imprimir"
          rotulo={`Reimprimir ${numero === 0 ? "a original" : `a ALT ${numero}`}`}
          href={enderecoDeReimpressao}
          data-slot="reimprimir-versao"
        />
      </div>
      {dados === null ? (
        <p role="status" className="text-atrasado-tinta text-sm">
          O retrato desta versão não foi guardado; reimprima pelo botão acima.
        </p>
      ) : (
        <EscalaDoPapel>
          <DocumentoDoDsa
            dados={dados}
            nomeDeQuemImprime={null}
            geradoEm={ocorridoEm}
            alteracao={rotuloDoAlt(numero)}
            nivelDoTitulo={3}
          />
        </EscalaDoPapel>
      )}
    </section>
  );
}

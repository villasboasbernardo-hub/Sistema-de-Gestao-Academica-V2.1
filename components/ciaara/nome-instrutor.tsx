/**
 * Nome de instrutor no formato padronizado (`RF-INSTR-15`, `RF-DS-05`, `FR-012`).
 *
 * ⚠️ SEM MARCADOR DE CLIENTE, E A AUSÊNCIA É REQUISITO. As rotas de impressão dos Épicos 10 e 11
 * vão consumi-lo, e impressão é renderizada no servidor. É exatamente a coisa que a v2.0 não
 * conseguia: lá `.gs` e `.html` não compartilhavam código, e a formatação existia em cópias que
 * divergiam.
 *
 * ⚠️ ELE NÃO CALCULA QUAIS PALAVRAS DESTACAR. Quem calcula é `lib/dominio/nome-instrutor.ts`, e a
 * separação é o `FR-020`: o componente exibe, o domínio decide.
 *
 * ⚠️ O NEGRITO É `<strong>`, NÃO UMA CLASSE. Ele carrega ênfase semântica: quem usa leitor de tela
 * ouve a distinção, e a impressão em preto e branco a preserva. Um `font-bold` solto seria só
 * espessura.
 */
import { fragmentosDoNome, type InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";

export type { InstrutorParaExibir };

export type NomeInstrutorProps = {
  readonly instrutor: InstrutorParaExibir;
  readonly className?: string;
};

export function NomeInstrutor({ instrutor, className }: NomeInstrutorProps) {
  return (
    <span data-slot="nome-instrutor" className={className}>
      {fragmentosDoNome(instrutor).map((fragmento, i) =>
        fragmento.destacado ? (
          <strong key={i} className="font-semibold">
            {fragmento.texto}
          </strong>
        ) : (
          <span key={i}>{fragmento.texto}</span>
        ),
      )}
    </span>
  );
}

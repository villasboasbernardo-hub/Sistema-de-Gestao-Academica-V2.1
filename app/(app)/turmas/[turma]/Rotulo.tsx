/**
 * O rótulo de um termo da ficha da turma (`FR-031`, `FR-023` da spec 012).
 *
 * ⚠️ **ELE SAIU DE DENTRO DA PÁGINA EM 04/10/2026, E O MOTIVO É A SEGUNDA TELA DO MESMO `<dl>`.** O
 * cabeçalho da turma e a seção **Andamento** usam o mesmo par rótulo/valor, e `--texto-tenue` veste
 * **rótulo, nunca valor** — a invariante `texto-tenue.test.ts` cobra a declaração do que o token
 * veste **na linha de cima de cada uso**. Duas cópias são duas declarações a manter em dia, e é
 * exatamente o caminho que o botão de limpar filtros percorreu antes de virar componente.
 *
 * ⚠️ **ELE NÃO É `components/ciaara/`, de propósito:** é o `<dt>` desta tela, não vocabulário visual
 * do sistema — e um componente naquela pasta exige amostra na vitrine. ⚠️ **Há duas cópias irmãs em
 * `app/(app)/cursos/[curso]/` (`AbaGrade` e `AbaSobre`)**, que esta fatia **não** toca: unificá-las
 * mexeria em tela que o épico não altera. Fica registrado, não consertado.
 *
 * ⚠️ **ELE NÃO SE RENDERIZA:** o elemento é `<dt>`, e não `<Rotulo>`, que foi o defeito de recursão
 * medido em 22/09/2026.
 */
export function Rotulo({ children }: { readonly children: React.ReactNode }) {
  // veste: o rótulo do termo, à esquerda; o valor ao lado é dado
  return <dt className="text-texto-tenue">{children}</dt>;
}

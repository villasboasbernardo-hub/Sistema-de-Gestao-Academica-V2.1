/**
 * `RF-DSA-06` — o posto/graduação **por extenso** na assinatura do DSA.
 *
 * > *"ASSINATURA: no campo de assinatura do DSA (tela e /print/dsa), o posto/graduação sai POR
 * > EXTENSO, não abreviado (ex.: "Primeiro-Tenente (RM2-T)", "Capitão de Corveta"). Use um
 * > mapeamento único em lib/dominio/ (TS puro), reaproveitando o que já existir sobre posto e
 * > círculo hierárquico; o quadro entre parênteses continua. Só a assinatura muda; a coluna de
 * > instrutor da grade continua como está."*
 * > — decisão de Bernardo Villas Boas, 08/10/2026 (item 7 de
 * > `specs/013-detalhe-semanal-de-aula/comando-correcoes-do-dsa.md`)
 *
 * > *"[…] campo de observação e as assinaturas dos responsáveis do curso (Encarregado da Divisão
 * > de Administração Acadêmica e Operador responsável pelo lançamento)."*
 * > — documento 02, `RF-DSA-06` **[PRESERVADO]**
 *
 * ⚠️ **É FATO DE DOMÍNIO MILITAR ESTÁVEL, NÃO PARÂMETRO NORMATIVO** — o mesmo tratamento que
 * `circulo-hierarquico.ts` dá à escala de postos. Não vive em `config_parametros`.
 *
 * ⚠️ **O QUE FOI REAPROVEITADO, E COMO A DUPLICAÇÃO FICA SOB GUARDA.** As siglas são as do cadastro —
 * as de `POSTOS_POR_CIRCULO` (`circulo-hierarquico.ts`), as de `POSTOS_CIVIS` (`militar-ou-civil.ts`)
 * e as de `config_listas.escala_antiguidade`; a comparação é a mesma leitura tolerante de
 * `circuloDoPosto` e `pesoAntiguidade` (sem caixa, sem espaço em volta), estendida ao indicador
 * ordinal. ⚠️ **E O BANCO JÁ TEM O POR EXTENSO DE 14 DELAS**, em `rotulo_exibicao` da lista
 * `escala_antiguidade` (migration `20260829235410`; os mesmos 14 medidos na cópia datada do remoto
 * `remoto-20261007-155824.sql`). A decisão pede TS puro, e por isso o mapa está escrito aqui; quem
 * impede as duas listas de divergirem em silêncio é `tests/unidade/posto-por-extenso.test.ts`, que
 * as compara — com **uma** exceção nominal, o `SCNS` (ver o mapa).
 *
 * ⚠️ **A COLUNA DE INSTRUTOR NÃO PASSA POR AQUI.** Ela continua com a sigla, por `nomeParaDsa`
 * (`nome-instrutor.ts`), como o DSA assinado sempre trouxe (`1TEN (RM2-T) FULANO`). Só a assinatura
 * chama este módulo, e só por `assinaturas.ts`.
 *
 * ⚠️ **SIGLA DESCONHECIDA SAI COMO VEIO — NUNCA VAZIA** (`RN-DEG-01`). Um posto que o mapa não conhece
 * sumir do rodapé faria a linha parecer em branco por falta de cadastro, que é afirmação diferente.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`** (Princípio II, imposto por ESLint).
 */

/**
 * O mapeamento **único** — sigla (a grafia do cadastro) → posto/graduação por extenso.
 *
 * ⚠️ **A GRAFIA É A INSTITUCIONAL ATUAL** — sem hífen nos compostos com preposição (*Capitão de Mar e
 * Guerra*) e com hífen nos sem ela (*Capitão-Tenente*, *Primeiro-Sargento*), que é também a de
 * `config_listas.escala_antiguidade`.
 */
export const POSTOS_POR_EXTENSO: Readonly<Record<string, string>> = {
  /* Oficiais-generais — fora da base hoje, mas na escala da Marinha (documento 25 §6.2). */
  AE: "Almirante de Esquadra",
  VA: "Vice-Almirante",
  CA: "Contra-Almirante",
  /* Oficiais superiores, intermediário e subalternos. */
  CMG: "Capitão de Mar e Guerra",
  CF: "Capitão de Fragata",
  CC: "Capitão de Corveta",
  CT: "Capitão-Tenente",
  "1ºTen": "Primeiro-Tenente",
  "2ºTen": "Segundo-Tenente",
  /* Praça especial. */
  GM: "Guarda-Marinha",
  /* Praças. */
  SO: "Suboficial",
  "1ºSG": "Primeiro-Sargento",
  "2ºSG": "Segundo-Sargento",
  "3ºSG": "Terceiro-Sargento",
  CB: "Cabo",
  MN: "Marinheiro",
  SD: "Soldado",
  /* Civis. */
  SC: "Servidor Civil",
  /*
   * ⚠️ **A EXCEÇÃO NOMINAL À GUARDA DO BANCO.** `config_listas` escreve *"Servidor Civil não
   * Sigiloso"*, e, fora deste mapa e da guarda dele, a frase só existe nos três arquivos SQL da
   * semente (a migration e as duas cópias de `docs/sql-referencia/`) — nenhum documento desta base
   * explica a sigla assim. O rótulo da v2.0
   * para o valor `SCNS` é *"Servidor Civil"* (spec 015 da v2.0, `FR-010`), e é o que sai aqui.
   * Medido na cópia datada do remoto `remoto-20261007-155824.sql`: nenhum instrutor nem responsável
   * tem posto `SCNS` (os 6 civis são `SC`, com especialidade `NS`).
   */
  SCNS: "Servidor Civil",
};

/**
 * Grafias que a leitura tolerante não alcança sozinha: `1T`/`2T` são `1ºTen`/`2ºTen` (as planilhas de
 * controle escrevem assim — `POSTOS_EQUIVALENTES` de `scripts/carga_dsa/plano.py`, medido na onda 2
 * da VIRADA-1 —, e o documento 25 §6.2 também).
 */
const SINONIMOS: Readonly<Record<string, string>> = { "1T": "1ºTen", "2T": "2ºTen" };

/**
 * A chave de comparação: sem caixa, sem espaço e sem o indicador ordinal depois do algarismo.
 *
 * ⚠️ **É LEITURA TOLERANTE DE UMA CHAVE, NÃO NORMALIZAÇÃO DE DADO** — nada do que está gravado muda.
 * `1ºTEN`, `1ºTen`, `1º Ten`, `1°Ten` (símbolo de grau, o achado 2 da spec 001 da v2.0) e `1TEN`
 * casam a mesma entrada.
 */
function chaveDoPosto(posto: string): string {
  return posto
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/gu, "")
    .replace(/^(\d)[º°o]/u, "$1");
}

const POR_CHAVE: ReadonlyMap<string, string> = new Map([
  ...Object.entries(POSTOS_POR_EXTENSO).map(
    ([sigla, extenso]) => [chaveDoPosto(sigla), extenso] as const,
  ),
  ...Object.entries(SINONIMOS).flatMap(([sinonimo, sigla]) => {
    const extenso = POSTOS_POR_EXTENSO[sigla];
    return extenso === undefined ? [] : [[chaveDoPosto(sinonimo), extenso] as const];
  }),
]);

/**
 * O posto/graduação por extenso — `1ºTEN` → `Primeiro-Tenente`.
 *
 * ⚠️ **O QUADRO ESCRITO JUNTO DO POSTO CONTINUA, COMO VEIO**: `1ºTen (RM2-T)` → `Primeiro-Tenente
 * (RM2-T)`. Sigla desconhecida sai como veio (aparada); ausente, `""`.
 */
export function postoPorExtenso(posto: string | null | undefined): string {
  const texto = (posto ?? "").trim();
  if (texto === "") return "";
  const partes = /^([^()]*?)\s*(\(.*\))?$/u.exec(texto);
  const sigla = partes?.[1] ?? texto;
  const quadro = partes?.[2] ?? "";
  const extenso = POR_CHAVE.get(chaveDoPosto(sigla));
  if (extenso === undefined) return texto;
  return quadro === "" ? extenso : `${extenso} ${quadro}`;
}

/**
 * O quadro/especialidade entre parênteses — `FR`, `-FR` e `(FR)` → `(FR)`; vazio → `""`.
 *
 * ⚠️ **O BANCO GUARDA AS DUAS FORMAS, e sem isto sairia `((T))`.** As 10 linhas por curso de
 * `responsaveis_curso` têm `FR`, `HN` e `CA` sem parênteses (medido na cópia datada do remoto
 * `remoto-20261007-155824.sql`); o mapa do ETL documenta `(T)` e `(AA)` com eles; e o cadastro de
 * instrutor escreve praça com hífen (`-HN`). Os parênteses e o hífen das pontas saem antes de os
 * da assinatura entrarem — o miolo (`RM2-T`) fica intacto.
 */
export function quadroEntreParenteses(especialidade: string | null | undefined): string {
  const miolo = (especialidade ?? "")
    .trim()
    .replace(/^\((.*)\)$/u, "$1")
    .replace(/^[\s-]+|[\s-]+$/gu, "");
  return miolo === "" ? "" : `(${miolo})`;
}

/**
 * A linha do posto na assinatura — `Primeiro-Tenente (RM2-T)`, `Capitão de Corveta`,
 * `Segundo-Sargento (FR)` (o formato do modelo v4, escolhido por Bernardo Villas Boas em 07/10/2026).
 *
 * ⚠️ **O QUADRO QUE JÁ VEIO NO CAMPO DO POSTO NÃO SAI DUAS VEZES.** Sem posto nem quadro, `""` — e a
 * rubrica não desenha a linha.
 */
export function postoParaAssinatura(
  postoGraduacao: string | null | undefined,
  especialidade: string | null | undefined,
): string {
  const posto = postoPorExtenso(postoGraduacao);
  const quadro = quadroEntreParenteses(especialidade);
  if (quadro !== "" && posto.includes(quadro)) return posto;
  return [posto, quadro].filter((parte) => parte !== "").join(" ");
}

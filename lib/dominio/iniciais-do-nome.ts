/**
 * As INICIAIS que o avatar mostra quando não há foto (`FR-010`, `FR-011`).
 *
 * ⚠️ **NÃO é "a primeira letra de cada palavra".** A regra ingênua produz `MDS` para
 * *"Maria de Souza"* e `A` para *"Ana"*, e a segunda está certa por acidente. As duas decisões que
 * a tornam uma regra, e não um `split`:
 *
 * 1. **Preposição não conta.** Em português, `de`, `da`, `do`, `das`, `dos` e `e` são ligação, não
 *    nome — quem lê `MDS` não reconhece *"Maria de Souza"*.
 * 2. **Duas iniciais, no máximo.** A primeira e a ÚLTIMA parte que valem, que é como se abrevia
 *    nome de pessoa. Três ou quatro letras num círculo de 32 pixels não se leem.
 *
 * ⚠️ **Nome de UMA palavra devolve UMA inicial**, e isso é escolha. Repetir a letra (`AA` para
 * *"Ana"*) inventa informação que não existe, e duas contas chamadas *"Ana"* e *"Ana Paula"*
 * passariam a parecer a mesma.
 *
 * Módulo **puro**: só texto entra e só texto sai. Nada de `supabase`, `next` nem `react`.
 */

/**
 * As partículas de ligação que NÃO contam como parte do nome.
 *
 * ⚠️ Comparadas **sem acento e em minúsculas**, porque o cadastro real traz `DE`, `De` e `de` na
 * mesma base — o ETL trouxe o que a planilha tinha.
 */
const LIGACOES: ReadonlySet<string> = new Set(["de", "da", "do", "das", "dos", "e", "du", "del"]);

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Mn}/gu, "");
}

/**
 * As iniciais de um nome, para o avatar.
 *
 * @example iniciaisDoNome("Maria de Souza")   // "MS"
 * @example iniciaisDoNome("Ana")              // "A"
 * @example iniciaisDoNome("  ")               // ""
 */
export function iniciaisDoNome(nome: string | null | undefined): string {
  if (!nome) return "";

  const partes = nome
    .trim()
    .split(/\s+/)
    .filter((parte) => parte.length > 0)
    // ⚠️ A ligação sai DEPOIS da separação e ANTES da escolha das duas: tirá-la antes de separar
    //    comeria o "de" de "Demétrio".
    .filter((parte) => !LIGACOES.has(semAcento(parte).toLowerCase()));

  // ⚠️ A primeira e a ÚLTIMA, não as duas primeiras: "Maria Fernanda Souza" abrevia-se `MS`.
  // ⚠️ E a conferência é por `undefined`, não por `partes.length === 0`: com
  //    `noUncheckedIndexedAccess` ligado, o compilador NÃO estreita o índice a partir do
  //    comprimento, e `partes[0]` continuaria opcional. Ler o valor é o que o convence.
  const primeira = partes[0];
  const ultima = partes[partes.length - 1];
  if (primeira === undefined || ultima === undefined) return "";

  const letras = partes.length === 1 ? [primeira] : [primeira, ultima];

  return letras.map((parte) => parte.charAt(0).toLocaleUpperCase("pt-BR")).join("");
}

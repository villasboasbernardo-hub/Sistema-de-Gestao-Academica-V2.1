/**
 * O endereço de uma turma — **uma função só** (`FR-031.1` a `FR-031.3`, `FR-037`).
 *
 * TypeScript puro: sem `next`, sem `react`, sem `supabase`. É o que permite que o teste de
 * unidade o exercite sem subir nada, e que a varredura da `T070` exija que **nenhum outro
 * ponto do código** monte um endereço de turma à mão.
 *
 * ⚠️ **POR QUE ISTO É UM MÓDULO E NÃO UM TEMPLATE ESPALHADO.** O código da turma é
 * `sigla [rótulo] ano` e **contém espaços** — `C-ApA-AuxNav-PR-SP T1 2026`. Um endereço
 * montado à mão em cada tela funciona na primeira e falha na que esquecer de codificar; e
 * falha **em silêncio**, porque o navegador aceita o espaço e o servidor recebe outra
 * coisa. Concentrar aqui torna a codificação um fato do módulo, não uma lembrança.
 *
 * ⚠️ **NO CAMINHO, `encodeURIComponent`: espaço vira `%20`.** `+` é forma de corpo de formulário e
 * **não** vale em caminho de URL.
 *
 * ⚠️ **NA CONSULTA, `+` — decisão de Bernardo Villas Boas, 23/09/2026, fechando a `PEND-5a-8`.** O
 * `FR-036` obriga a escolha de turma a ir para a URL **por `useParametro`**, que é o `nuqs`; e o
 * `encodeQueryValue` dele escapa `%` **primeiro** e depois troca espaço por `+`
 * (`node_modules/nuqs/dist/context-Mu913OAK.js:31`, medido em 23/09/2026). **Não há costura**:
 * `processUrlSearchParams` roda antes da serialização, e pré-codificar produziria `%2520`.
 *
 * ⚠️ **ENQUANTO ESTA FUNÇÃO ESCREVIA `%20` NA CONSULTA, O SISTEMA TINHA DUAS GRAFIAS** do mesmo
 * endereço — a do vínculo do Início e a que o seletor escrevia ao trocar de turma —, que é
 * exatamente o que o `FR-031.1` proíbe. A unificação foi pela grafia do `nuqs` porque o `FR-036` não
 * dá escolha sobre quem escreve. **O que o `%20` original protegia continua protegido**: o defeito
 * de 18/09/2026 era **espaço cru** no `href` (`FR-031.2`), e `+` não é espaço cru.
 */

/** O prefixo das rotas de turma. Mudou de lugar? Mudou aqui, e só aqui. */
const RAIZ_DE_TURMAS = "/turmas";
const RAIZ_DE_CURSOS = "/cursos";

/**
 * O caminho da ficha da turma.
 *
 * @example enderecoDaTurma("C-ApA-PCN-PR-EAD T2 2026")
 *          → "/turmas/C-ApA-PCN-PR-EAD%20T2%202026"
 */
export function enderecoDaTurma(codigo: string): string {
  return `${RAIZ_DE_TURMAS}/${encodeURIComponent(codigo)}`;
}

/**
 * A página do curso com a turma já selecionada — o endereço que o Início passa a usar.
 *
 * ⚠️ **A ABA É OPCIONAL E VEM PRIMEIRO NA URL**, para que dois links da mesma turma em
 * abas diferentes não sejam a mesma cadeia por acidente de ordem.
 *
 * @example enderecoDaTurmaNoCurso("C-ApA-PCN-PR-EAD", "C-ApA-PCN-PR-EAD T2 2026", "grade")
 *          → "/cursos/C-ApA-PCN-PR-EAD?aba=grade&turma=C-ApA-PCN-PR-EAD+T2+2026"
 */
/**
 * Um valor de consulta escrito **exatamente como o `nuqs` o escreve**.
 *
 * ⚠️ É CÓPIA DELIBERADA DO `encodeQueryValue` DELE, e a ordem das trocas importa: `%` primeiro,
 * espaço depois. Reproduzi-la aqui é o que garante que o vínculo montado por esta função e a URL que
 * o seletor escreve sejam **a mesma cadeia**, byte a byte — a única representação, como o `FR-031.1`
 * exige.
 */
function comoAConsultaEscreve(valor: string): string {
  return valor
    .replace(/%/g, "%25")
    .replace(/\+/g, "%2B")
    .replace(/ /g, "+")
    .replace(/#/g, "%23")
    .replace(/&/g, "%26")
    .replace(/"/g, "%22")
    .replace(/'/g, "%27")
    .replace(/`/g, "%60")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E");
}

export function enderecoDaTurmaNoCurso(sigla: string, codigo: string, aba?: string): string {
  const caminho = `${RAIZ_DE_CURSOS}/${encodeURIComponent(sigla)}`;
  const partes = [
    ...(aba ? [`aba=${comoAConsultaEscreve(aba)}`] : []),
    `turma=${comoAConsultaEscreve(codigo)}`,
  ];
  return `${caminho}?${partes.join("&")}`;
}

/**
 * O endereço de criação de turma dentro de um curso.
 *
 * @example enderecoDaNovaTurma("C-Ap-FR") → "/cursos/C-Ap-FR/turmas/nova"
 */
export function enderecoDaNovaTurma(sigla: string): string {
  return `${RAIZ_DE_CURSOS}/${encodeURIComponent(sigla)}/turmas/nova`;
}

/**
 * O código gravado, a partir do que a rota entregou.
 *
 * ⚠️ **DECODIFICA UMA VEZ SÓ, E ISSO É DECISÃO** (contrato de rotas §4). O Next já entrega
 * `params` decodificado; decodificar de novo é inofensivo para todos os 28 códigos de hoje
 * e **destrutivo** para qualquer código que venha a conter `%` — `50%` viraria uma
 * sequência de escape inválida e a rota quebraria. Por isso a função tenta decodificar e,
 * se o texto não for uma sequência válida, **devolve o que recebeu** em vez de estourar
 * (`RN-DEG-01`).
 */
export function codigoDaTurmaNoSegmento(segmento: string): string {
  try {
    return decodeURIComponent(segmento);
  } catch {
    // Sequência de escape malformada: o segmento já é o código, ou é lixo — e lixo que
    // chega aqui vira "turma não encontrada" na tela, não uma exceção não tratada.
    return segmento;
  }
}

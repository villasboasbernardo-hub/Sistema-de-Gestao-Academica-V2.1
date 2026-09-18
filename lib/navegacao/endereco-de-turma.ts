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
 * ⚠️ **`encodeURIComponent` E NÃO `URLSearchParams` PARA O ESPAÇO.** `URLSearchParams`
 * serializa espaço como `+`, que é válido em corpo de formulário e **não** em caminho de
 * URL. Os dois decodificam para o mesmo texto, mas o `FR-031.1` pede **uma representação
 * só** — duas grafias do mesmo endereço quebram comparação de link, cache e histórico.
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
 *          → "/cursos/C-ApA-PCN-PR-EAD?aba=grade&turma=C-ApA-PCN-PR-EAD%20T2%202026"
 */
export function enderecoDaTurmaNoCurso(sigla: string, codigo: string, aba?: string): string {
  const caminho = `${RAIZ_DE_CURSOS}/${encodeURIComponent(sigla)}`;
  const partes = [
    ...(aba ? [`aba=${encodeURIComponent(aba)}`] : []),
    `turma=${encodeURIComponent(codigo)}`,
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

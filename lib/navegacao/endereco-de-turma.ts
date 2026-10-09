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
import {
  CAMPOS_DA_RUBRICA,
  LADOS_DA_ASSINATURA,
  limparCampo,
  type CampoDaRubrica,
  type EdicaoDasAssinaturas,
  type LadoDaAssinatura,
} from "@/lib/dominio/dsa/assinatura-editada";

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
 * O padrão de rota da ficha — para `revalidatePath(ROTA_DA_FICHA_DA_TURMA, "page")`.
 *
 * ⚠️ **ELE MORA AQUI PORQUE A GUARDA COBRA, e a guarda está certa:** `endereco-de-turma-unico.test.ts`
 * reprova **qualquer** texto `"/turmas/…"` fora deste módulo, e um `revalidatePath("/turmas/[turma]")`
 * escrito dentro de `lib/acoes/` é exatamente isso. ⚠️ **E ela cobrou DE VERDADE em 04/10/2026**: a
 * primeira escrita do PR 2 deixou o literal `"/turmas/[turma]"` em dois arquivos — a folha da seção de
 * disciplinas e a página da ficha, que o usam como **chave de rota** em `useParametro` e
 * `lerParametros` — e a varredura reprovou os dois. É o mesmo texto, com o mesmo risco: o dia em que
 * a rota mudar de nome, quem não passa por aqui fica para trás.
 *
 * ⚠️ **E É PADRÃO, NÃO ENDEREÇO:** ele revalida a ficha de **todas** as turmas de uma vez, o que serve
 * a quem grava período ou instrutores sabendo só o `turmaDisciplinaId` — descobrir o código da turma a
 * partir dele custaria uma consulta a mais para revalidar uma tela (decisão **D12**, 04/10/2026).
 *
 * ⚠️ **ESCRITO COMO LITERAL `as const`, e não montado com a constante da raiz:** o tipo precisa ser a
 * cadeia exata para satisfazer `Rota`, que é `keyof typeof CONTRATO`. Montado por template, o tipo
 * seria `string` e nenhuma das duas funções o aceitaria.
 */
export const ROTA_DA_FICHA_DA_TURMA = "/turmas/[turma]" as const;

/**
 * A seção de disciplinas **dentro** da ficha da turma.
 *
 * ⚠️ **É O DESTINO DO ENDEREÇO ANTIGO** (`FR-019` da spec 012): `/disciplinas?curso=X&turma=Y` passou
 * a redirecionar para cá. A âncora é o que faz a pessoa cair **na seção**, e não no topo de uma ficha
 * que agora tem quatro.
 *
 * ⚠️ **A ÂNCORA É CONCATENADA DEPOIS, e isso não é estilo:** `#` dentro de um valor de consulta é
 * escapado por `comoAConsultaEscreve`; aqui ele é separador de fragmento e precisa chegar cru.
 *
 * @example enderecoDaSecaoDeDisciplinas("C-Ap-FR T2 2026")
 *          → "/turmas/C-Ap-FR%20T2%202026#disciplinas"
 */
/**
 * O endereço da semana do DSA, com o recorte (`RF-DSA-01`, spec 013).
 *
 * ⚠️ **ELE MORA AQUI, E NÃO NA PASTA DA TELA, PORQUE A GUARDA ESTÁ CERTA.** Eu o escrevi primeiro
 * em `app/(app)/turmas/[turma]/dsa/consulta.ts`, e `endereco-de-turma-unico.test.ts` reprovou: o
 * `FR-031.2` manda que **ninguém** monte `/turmas/` fora deste módulo. O motivo é medido (gotcha
 * 12): o código da turma contém espaços, e montá-lo à mão funciona na primeira tela e falha **em
 * silêncio** na que esquecer de codificar.
 *
 * ⚠️ **VALOR NO PADRÃO NÃO VAI NA URL** — é o que mantém o endereço da semana corrente favoritável,
 * e o que faz `?semana=` aparecer só quando alguém navegou de propósito.
 */
export function enderecoDoDsa(
  codigo: string,
  recorte?: { readonly semana?: number; readonly ano?: number; readonly sabado?: boolean },
): string {
  /*
   * ⚠️ **O CAMINHO SAI DA CONSTANTE, E NÃO DE `enderecoDaTurma(codigo)`, POR UMA RAZÃO MEDIDA.**
   * A primeira escrita era `` `${enderecoDaTurma(codigo)}/dsa` `` — mais curta e com um dono só —,
   * e `toda-tela-tem-caminho.test.ts` passou a acusar a tela do DSA como **órfã**: a varredura
   * resolve `${CONSTANTE}`, e **não** resolve chamada de função, então o destino que ela via era
   * `[param]/dsa`, que não casa com `/turmas/[param]/dsa`. Os três links existiam; a guarda não os
   * enxergava.
   * ⚠️ **E isto não quebra a regra do dono único**: `RAIZ_DE_TURMAS` e `encodeURIComponent` são
   * deste mesmo módulo, que é justamente o único autorizado a montar `/turmas/…` (`FR-031.2`).
   */
  const base = `${RAIZ_DE_TURMAS}/${encodeURIComponent(codigo)}/dsa`;
  const busca = new URLSearchParams();
  if (recorte?.semana) busca.set("semana", String(recorte.semana));
  if (recorte?.ano) busca.set("ano", String(recorte.ano));
  if (recorte?.sabado) busca.set("sabado", "sim");
  const sufixo = busca.toString();
  return sufixo === "" ? base : `${base}?${sufixo}`;
}

export const ROTA_DO_DSA = "/turmas/[turma]/dsa" as const;

/** A rota da impressão do DSA — **fora** de `(app)`, sem casca (`RF-PDF-01`). */
export const ROTA_DA_IMPRESSAO_DO_DSA = "/print/dsa" as const;

/**
 * O endereço da impressão do DSA — `/print/dsa?turma=&semana=&ano=&sabado=` (`RF-PDF-01`).
 *
 * ⚠️ **ELE MORA AQUI PORQUE A GUARDA COBRA, e a guarda está certa:**
 * `endereco-de-turma-unico.test.ts` reprova **qualquer** arquivo que monte `?turma=` fora deste
 * módulo (`MONTA_PARAMETRO`), e o `FR-031.2` é o motivo — o código da turma **contém espaços**, e
 * montá-lo à mão funciona na primeira tela e falha **em silêncio** na que esquecer de codificar.
 *
 * ⚠️ **AQUI A TURMA VAI NA CONSULTA, não no caminho, e a diferença é do documento 25 §1.3 item 2:**
 * a rota de impressão vive **fora** do segmento dinâmico `/turmas/[turma]` porque está **fora** do
 * grupo `(app)` — ela não tem casca, não tem menu e não tem faixa de ambiente. Herdar os
 * parâmetros *"sem tradução"* é o que faz o papel sair da **mesma** semana que a tela mostra.
 *
 * ⚠️ **A GRAFIA DO VALOR É A DA CONSULTA — `+` para espaço**, a mesma de
 * `enderecoDaTurmaNoCurso` e `enderecoDasDisciplinas` (decisão de Bernardo Villas Boas,
 * 23/09/2026, `PEND-5a-8`). ⚠️ **E aqui não há segundo escritor**: a rota de impressão não está no
 * contrato do `nuqs`, então quem escreve este endereço é **só** esta função — a razão de manter a
 * grafia é não ter duas convenções de consulta no mesmo módulo, e `+` é lido como espaço por
 * `URLSearchParams`, que é o que o servidor usa para montar `searchParams`.
 *
 * ⚠️ **`semana` e `ano` VÃO SEMPRE, ao contrário de `enderecoDoDsa`.** Lá o valor no padrão fica
 * fora da URL, para que o endereço da semana corrente seja favoritável. Aqui o padrão **não
 * existe**: o papel é de uma semana determinada, e um `/print/dsa?turma=X` sem semana imprimiria a
 * semana de **hoje** no dia em que alguém reabrisse o link — que é o `D-8` da planilha ("a `DSA
 * C-ESPC-HN 2027` ainda tem as datas de 2026") pelo avesso.
 */
/**
 * O caminho do download da planilha de contingência da turma (`contracts/rota-de-download.md` da
 * spec 015).
 *
 * ⚠️ **SEM PARÂMETRO DE BUSCA, DE PROPÓSITO**: a planilha é sempre do ano inteiro (`FR-030`), e a
 * semana que abre selecionada é decidida no servidor (`FR-022`).
 * ⚠️ **O CAMINHO SAI DA CONSTANTE**, como o do DSA — a guarda de caminho resolve `${CONSTANTE}` e não
 * resolve chamada de função (ver `enderecoDoDsa`).
 *
 * @example enderecoDaPlanilhaDeContingencia("C-ApA-PCN-PR-EAD T2 2026")
 *          → "/turmas/C-ApA-PCN-PR-EAD%20T2%202026/dsa/planilha"
 */
export function enderecoDaPlanilhaDeContingencia(codigo: string): string {
  return `${RAIZ_DE_TURMAS}/${encodeURIComponent(codigo)}/dsa/planilha`;
}

export function enderecoDaImpressaoDoDsa(
  codigo: string,
  recorte: {
    readonly semana: number;
    readonly ano: number;
    readonly sabado?: boolean;
    /** As assinaturas editadas na tela antes de imprimir — só o que foi editado (item 4 de 08/10/2026). */
    readonly assinaturas?: EdicaoDasAssinaturas;
  },
): string {
  const partes = [
    `turma=${comoAConsultaEscreve(codigo)}`,
    `semana=${String(recorte.semana)}`,
    `ano=${String(recorte.ano)}`,
    ...(recorte.sabado ? ["sabado=sim"] : []),
    ...LADOS_DA_ASSINATURA.flatMap((lado) =>
      CAMPOS_DA_RUBRICA.flatMap((campo) => {
        const valor = recorte.assinaturas?.[lado]?.[campo];
        return valor === undefined
          ? []
          : [`${PARAMETRO_DA_ASSINATURA[lado][campo]}=${comoAConsultaEscreve(valor)}`];
      }),
    ),
  ];
  return `${ROTA_DA_IMPRESSAO_DO_DSA}?${partes.join("&")}`;
}

/**
 * Os parâmetros da assinatura editada na impressão do DSA (item 4 das correções de 08/10/2026,
 * decisão de Bernardo Villas Boas: *"o que foi editado vai para a IMPRESSÃO; NÃO grava no cadastro
 * nem no banco"*).
 *
 * ⚠️ **ELES NÃO ESTÃO NO `CONTRATO` DE `contrato.ts`, e não é esquecimento — é a guarda do `FR-035`**:
 * `opcoes-de-parametro.test.ts` reprova qualquer rota `/print` declarada ali (*"a rota de impressão
 * herda, e nenhuma existe ainda"*). A impressão do DSA já vivia fora do contrato, com o endereço
 * escrito **só** por esta função; os parâmetros novos seguem o mesmo dono, e quem os lê é
 * `edicaoDaImpressaoDoDsa`, logo abaixo — um nome só para escrever e para ler.
 *
 * ⚠️ **PRESENÇA É EDIÇÃO.** Parâmetro ausente = vale o resolvido; presente e vazio = o campo sai
 * vazio, porque apagar um campo também é editar.
 */
export const PARAMETRO_DA_ASSINATURA: Readonly<
  Record<LadoDaAssinatura, Readonly<Record<CampoDaRubrica, string>>>
> = {
  esquerda: { nome: "esq_nome", posto: "esq_posto", funcao: "esq_funcao" },
  direita: { nome: "dir_nome", posto: "dir_posto", funcao: "dir_funcao" },
};

/**
 * A edição das assinaturas, lida da consulta de `/print/dsa`.
 *
 * ⚠️ **TEXTO LIVRE, DE QUEM QUER QUE TENHA MONTADO O ENDEREÇO**: cada valor passa por `limparCampo`
 * (pontas e `LIMITE_DO_CAMPO`), e o React escapa ao desenhar. Repetido, vale o primeiro.
 */
export function edicaoDaImpressaoDoDsa(
  busca: Readonly<Record<string, string | readonly string[] | undefined>>,
): EdicaoDasAssinaturas {
  const edicao: Partial<Record<LadoDaAssinatura, Partial<Record<CampoDaRubrica, string>>>> = {};
  for (const lado of LADOS_DA_ASSINATURA) {
    for (const campo of CAMPOS_DA_RUBRICA) {
      const bruto = busca[PARAMETRO_DA_ASSINATURA[lado][campo]];
      const valor = typeof bruto === "string" ? bruto : bruto?.[0];
      if (valor === undefined) continue;
      (edicao[lado] ??= {})[campo] = limparCampo(valor);
    }
  }
  return edicao;
}

export const ANCORA_DAS_DISCIPLINAS = "disciplinas";

export function enderecoDaSecaoDeDisciplinas(codigo: string): string {
  return `${enderecoDaTurma(codigo)}#${ANCORA_DAS_DISCIPLINAS}`;
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

/** A raiz da grade de disciplinas. Mudou de lugar? Mudou aqui, e só aqui. */
const RAIZ_DE_DISCIPLINAS = "/disciplinas";

/**
 * A grade de disciplinas de um curso, e opcionalmente **de uma turma** (fatia (b), 29/09/2026).
 *
 * ⚠️ **ELA ENTROU AQUI PORQUE A GUARDA COBROU, e a guarda estava certa.** A primeira escrita montava
 * `?curso=…&turma=…` à mão em dois lugares — a aba *Grade* do curso e a ficha da turma —, e
 * `endereco-de-turma-unico.test.ts` reprovou: *"endereço de turma montado fora de
 * `lib/navegacao/endereco-de-turma.ts`"*. É exatamente o defeito que o `FR-031.2` existe para
 * impedir: o código da turma **contém espaços**, e um endereço montado à mão funciona na primeira
 * tela e falha **em silêncio** na que esquecer de codificar.
 *
 * ⚠️ **A GRAFIA É A DA CONSULTA — `+` para espaço**, a mesma que o `nuqs` escreve (decisão de
 * Bernardo Villas Boas, 23/09/2026, `PEND-5a-8`). Usar `%20` aqui daria **duas grafias** do mesmo
 * endereço: a do link e a que o seletor escreve ao trocar de turma.
 *
 * @example enderecoDasDisciplinas("C-Ap-FR") → "/disciplinas?curso=C-Ap-FR"
 * @example enderecoDasDisciplinas("C-Ap-FR", "C-Ap-FR T2 2026")
 *          → "/disciplinas?curso=C-Ap-FR&turma=C-Ap-FR+T2+2026"
 */
export function enderecoDasDisciplinas(sigla: string, codigoDaTurma?: string): string {
  const partes = [
    `curso=${comoAConsultaEscreve(sigla)}`,
    ...(codigoDaTurma ? [`turma=${comoAConsultaEscreve(codigoDaTurma)}`] : []),
  ];
  return `${RAIZ_DE_DISCIPLINAS}?${partes.join("&")}`;
}

/**
 * A lista de turmas, inteira ou recortada por curso (`FR-012`, `FR-017` da spec 012).
 *
 * ⚠️ **A GRAFIA DE `?curso=` É A DA CONSULTA — `+` para espaço**, a mesma que o `nuqs` escreve. A
 * sigla de curso não tem espaço hoje (`C-Ap-FR`), mas escrever `%20` aqui criaria a **segunda
 * grafia** do mesmo endereço no dia em que tiver — e é o `FR-031.1` que proíbe isso, não a prudência.
 *
 * @example enderecoDasTurmas() → "/turmas"
 * @example enderecoDasTurmas("C-Ap-FR") → "/turmas?curso=C-Ap-FR"
 */
export function enderecoDasTurmas(sigla?: string): string {
  if (sigla === undefined || sigla === "") return RAIZ_DE_TURMAS;
  return `${RAIZ_DE_TURMAS}?curso=${comoAConsultaEscreve(sigla)}`;
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

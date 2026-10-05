/**
 * O **Nº do DSA** — o número sequencial que sai no cabeçalho do documento oficial
 * (`T024`, decisões `Q-3` e `D-7` da spec 013).
 *
 * > *"O **«Nº»** do DSA é **sequencial por turma** (o C-Ap-HN estava no **13** em 06/07/2026). A aba
 * > CRONOS **pula** a numeração numa semana sem aula; a aba PREENCHIMENTO **não pula**. **As duas
 * > contagens divergem.**"*
 * > — `praticas-da-planilha.md` §1.1, **P-6**, medido por **Bernardo Villas Boas** em **15
 * > planilhas**, 05/10/2026
 *
 * > *"Sem a tabela de emissão, esse número **é derivado** da ordem das semanas da turma — e, pela
 * > convenção da aba CRONOS, **semana sem aula não consome número**. Isso basta para o papel sair
 * > completo no PR 3; o que falta até o PR 6 é o `ALT <n>`, que **não aparece** em vez de aparecer
 * > errado."*
 * > — `spec.md` §2.3 da spec 013, resposta `Q-3`
 *
 * ⚠️ **A DECISÃO QUE EXPLICA ESTE MÓDULO EXISTIR ASSIM: a `Q-3` tirou do núcleo o REGISTRO DA
 * EMISSÃO** — a tabela com o número e o `ALT`, que é **PR 6**. Enquanto ela não existe, o número
 * **não é fato, é cálculo**: ele sai da ordem das semanas da turma. ⚠️ **E a consequência está
 * escrita na própria `Q-3`, opção (b): se a janela da turma mudar, o número muda.** Um DSA já
 * impresso e assinado com `Nº 7` pode, depois de alguém corrigir o `data_inicio` da turma, voltar a
 * ser calculado como `Nº 6`. **Isso não é defeito deste módulo — é o preço de derivar**, e é
 * exatamente o que o PR 6 vem pagar ao gravar a emissão como fato só de acréscimo.
 *
 * ⚠️ **A CONVENÇÃO ADOTADA É A DA ABA CRONOS: semana sem aula NÃO consome número.** As duas
 * contagens da planilha divergem (P-6), então **não há prática a preservar** — é decisão, e está
 * registrada na `Q-3`. Contar como a aba PREENCHIMENTO (toda semana consome) daria um número
 * **maior** no mesmo papel, e as duas formas são indistinguíveis sem conhecer a semana vazia.
 *
 * ⚠️ **TURMA SEM `data_inicio` DEVOLVE `null`, E O PAPEL IMPRIME `Nº —`** (`D-7`): *"`data_inicio` é
 * nulável e inventar o início é inventar o número"*. A tela avisa **antes** de imprimir
 * (`motivoDoNumeroAusente`), e o aviso **não bloqueia** nada (`RN-DEG-02`): quem precisa do papel
 * hoje imprime com o traço e corrige o cadastro depois.
 *
 * ⚠️ **NÃO HÁ DSA NÚMERO ZERO, e a ausência é `null`, nunca `0`** (`RN-DEG-01`). O `D-9` da planilha
 * registra *"«SEMANA 0» no bloco cujo DSA é o Nº 1"* como defeito a **não repetir**: um zero no
 * cabeçalho se leria como um documento que existe e é o de número zero, enquanto o que há é semana
 * nenhuma com aula até ali.
 *
 * ⚠️ **A NUMERAÇÃO DA SEMANA ISO NÃO NASCE AQUI** (ponto único): ela é `semanaIsoDe`, de
 * `lib/dominio/carga-semanal.ts`, a mesma que `distribuicao-semanal.ts` consome — calcular semana
 * ISO num segundo lugar é o que a `RN-DIST-01` proíbe, e a virada do ano é justamente onde duas
 * implementações discordariam. ⚠️ **A FUNÇÃO VEM DE `carga-semanal` E O TIPO DE
 * `distribuicao-semanal` porque é de onde cada um é exportado** — `distribuicao-semanal.ts`
 * reexporta o **tipo** `SemanaIso` e **não** a função; importar da origem é o que evita um reexport
 * a mais só para encurtar o caminho.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`** (Princípio II, imposto por
 * ESLint). As datas com lançamento e o `data_inicio` chegam **por parâmetro**, já lidos — este
 * módulo não sabe de onde, e por isso a contagem se prova com casos sintéticos, sem subir banco.
 *
 * ⚠️ **DATA DE CALENDÁRIO É `string` `aaaa-mm-dd`, NUNCA `Date`** — a convenção da pasta inteira.
 * `new Date("2026-03-01")` é meia-noite **UTC**, e em São Paulo isso é 28/02; comparação
 * lexicográfica de data ISO é exata e não tem fuso.
 */

import { semanaIsoDe } from "@/lib/dominio/carga-semanal";
import type { IdentidadeDaSemana } from "@/lib/dominio/distribuicao-semanal";

/**
 * O que se precisa saber para numerar o DSA de uma semana.
 *
 * ⚠️ **A SEMANA PEDIDA É `IdentidadeDaSemana` — o par `ano` + `numero` —, NÃO a `SemanaIso`
 * INTEIRA**, pelo mesmo motivo que `previstoDaSemana` adota: quem tem a semana na URL (`?semana=`)
 * não tem a segunda nem o domingo em mão, e exigi-los faria a tela montar um objeto pela metade só
 * para poder perguntar.
 */
export type EntradaDoNumeroDoDsa = {
  /**
   * As datas em que a turma **tem lançamento**, `aaaa-mm-dd`, em qualquer ordem.
   *
   * ⚠️ **DATA REPETIDA NÃO CONTA DUAS VEZES** — a contagem é de **semanas** distintas, e várias
   * aulas no mesmo dia (ou o mesmo dia vindo por dois caminhos) são uma semana só. O chamador pode
   * mandar `select distinct data` ou a lista crua: o resultado é o mesmo.
   */
  readonly datasComLancamento: readonly string[];
  /** `turmas.data_inicio`. **Nulável no banco** — e é o caso que a `D-7` decide. */
  readonly dataInicio: string | null;
  /** A semana cujo DSA se quer numerar. */
  readonly semana: IdentidadeDaSemana;
};

/**
 * O que o cabeçalho imprime quando não há número (`D-7`).
 *
 * ⚠️ **É CONSTANTE PARA QUE A TELA NÃO INVENTE O SEU PRÓPRIO** — `0`, `N/A` ou campo em branco são
 * as três coisas que apareceriam, e a primeira é o `D-9` de volta.
 */
export const NUMERO_AUSENTE_NO_CABECALHO = "—";

/**
 * As duas frases, e **são duas porque são dois problemas** — quem lê precisa saber o que fazer.
 *
 * ⚠️ **"SEM DATA DE INÍCIO" é cadastro a completar**, na ficha da turma. ⚠️ **"SEM SEMANA COM AULA"
 * é ausência de lançamento**, e quem resolve é lançar — o cadastro está certo. A mesma frase para os
 * dois mandaria o operador à tela errada.
 */
export const MOTIVO_SEM_DATA_DE_INICIO =
  "A turma não tem data de início — o Nº do DSA sai como «—» até que ela seja preenchida na ficha da turma.";

/** A frase da semana sem aula nenhuma até ali. */
export const MOTIVO_SEM_SEMANA_COM_AULA =
  "Nenhuma semana desta turma tem lançamento até aqui — o Nº do DSA começa no 1 na primeira semana com aula.";

const FORMATO_DE_DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A data de calendário já aparada, ou `null` fora do formato.
 *
 * ⚠️ **ISTO NÃO DUPLICA `semanaIsoDe`, E A DISTINÇÃO IMPORTA:** ela devolve a **semana**, e aqui se
 * precisa da **data** para comparar com o início da turma. Comparar `aaaa-mm-dd` aparadas por `<` é
 * exato — ordem lexicográfica e cronológica coincidem —, mas **só depois de conferir o formato**: um
 * texto com espaço à frente compararia errado em silêncio, e o lançamento anterior ao início
 * passaria a contar.
 */
function dataDeCalendario(valor: string | null): string | null {
  if (valor === null) return null;
  const limpo = valor.trim();
  return FORMATO_DE_DATA.test(limpo) ? limpo : null;
}

/**
 * A chave que **ordena** semanas ISO: `ano * 100 + numero`.
 *
 * ⚠️ **ELA EXISTE PARA QUE A VIRADA DO ANO NÃO PRECISE DE CASO ESPECIAL.** O número da semana volta
 * a 1 em janeiro, então comparar `numero` sozinho poria a semana 1 de 2027 **antes** da 53 de 2026 —
 * e a janela de uma turma que atravessa o ano é exatamente onde isso apareceria. Como `numero` nunca
 * passa de 53, multiplicar o ano por 100 mantém a ordem cronológica sem colisão.
 *
 * ⚠️ **FORA DA FAIXA 1–53 A RESPOSTA É `null`, não um número torto:** a semana chega da URL, onde
 * `?semana=0` ou `?semana=99` são digitáveis, e uma chave inventada compararia com as outras sem
 * erro nenhum.
 */
function chaveDaSemana(semana: IdentidadeDaSemana): number | null {
  const ano = Number(semana.ano);
  const numero = Number(semana.numero);
  if (!Number.isInteger(ano) || !Number.isInteger(numero)) return null;
  if (numero < 1 || numero > 53) return null;
  return ano * 100 + numero;
}

/**
 * O Nº do DSA da semana pedida — **a contagem das semanas ISO com lançamento**, da semana do
 * `data_inicio` até a pedida, **inclusive**. `null` quando não há número a imprimir.
 *
 * ⚠️ **SEMANA PEDIDA SEM AULA NÃO ENTRA NA CONTA, e por isso ela devolve o número da ÚLTIMA semana
 * com aula até ali** — não é estimativa: é a mesma contagem, porque a semana vazia não consome
 * número (convenção CRONOS). É o que faz o cabeçalho de uma semana sem lançamento repetir o número
 * do DSA anterior em vez de abrir um documento novo.
 *
 * ⚠️ **LANÇAMENTO ANTERIOR AO `data_inicio` É IGNORADO, no grão do DIA.** A consequência de borda
 * está declarada de propósito: um lançamento na **própria semana do início**, mas em dia anterior a
 * ele, **não** faz aquela semana contar — ela só conta se tiver lançamento em dia igual ou posterior
 * ao início. Filtrar por semana em vez de por dia aceitaria aula de antes do começo da turma como se
 * fosse da turma.
 *
 * ⚠️ **SEMANA PEDIDA ANTES DO INÍCIO DEVOLVE `null`**, e não o número de semana nenhuma: ali não
 * existe DSA daquela turma, e o `0` seria o `D-9`.
 */
export function numeroDoDsa(entrada: EntradaDoNumeroDoDsa): number | null {
  const inicio = dataDeCalendario(entrada.dataInicio);
  if (inicio === null) return null;

  const semanaDoInicio = semanaIsoDe(inicio);
  if (semanaDoInicio === null) return null;

  const chaveDoInicio = chaveDaSemana(semanaDoInicio);
  const chavePedida = chaveDaSemana(entrada.semana);
  if (chaveDoInicio === null || chavePedida === null) return null;
  if (chavePedida < chaveDoInicio) return null;

  const semanasComAula = new Set<number>();

  for (const bruta of entrada.datasComLancamento) {
    const data = dataDeCalendario(bruta);
    if (data === null) continue;
    if (data < inicio) continue;

    const semana = semanaIsoDe(data);
    if (semana === null) continue;

    const chave = chaveDaSemana(semana);
    if (chave === null || chave > chavePedida) continue;

    semanasComAula.add(chave);
  }

  /*
   * ⚠️ **ZERO VIRA `null` AQUI, E É A ÚLTIMA LINHA DE DEFESA DO `D-9`.** `Set.size` devolve `0`
   *    naturalmente, e devolvê-lo pronto faria o cabeçalho imprimir `Nº 0` — um documento que não
   *    existe. O que existe é *"ainda não há semana com aula"*, e isso é ausência (`RN-DEG-01`).
   */
  return semanasComAula.size === 0 ? null : semanasComAula.size;
}

/**
 * A frase que a tela mostra **antes de imprimir** quando não há número (`D-7`). `null` quando há.
 *
 * ⚠️ **ELA RECALCULA O NÚMERO DE PROPÓSITO, em vez de receber o `null` já pronto:** o motivo depende
 * de **qual** das duas ausências ocorreu, e um `null` não carrega essa informação. Receber o número
 * por parâmetro obrigaria a tela a decidir o motivo — que é a regra voltando a viver fora daqui.
 */
export function motivoDoNumeroAusente(entrada: EntradaDoNumeroDoDsa): string | null {
  if (dataDeCalendario(entrada.dataInicio) === null) return MOTIVO_SEM_DATA_DE_INICIO;
  if (numeroDoDsa(entrada) === null) return MOTIVO_SEM_SEMANA_COM_AULA;
  return null;
}

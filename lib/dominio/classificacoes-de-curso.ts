/**
 * `FR-003` — as classificações de curso, e a ordem em que os grupos aparecem.
 *
 * > *"As classificações de curso MUST ser **as cinco do Glossário**, e a ordem dos grupos MUST ser
 * > **a do Glossário e da v1.0**, fixa e a mesma em todo lugar desta fatia: **Regular · Expedito ·
 * > Especial · Aperfeiçoamento Avançado · Estágio de Qualificação** (Q-08, 16/09/2026). A
 * > classificação **agrupa** os cartões, **recorta o escopo do Operador** (por igualdade exata) e
 * > **determina o limite padrão de turmas por ano** (`FR-003.2`). A ordem da v2.0 diverge e fica
 * > registrada (D-18)."*
 * > — `FR-003` da spec 009
 *
 * ⚠️ **A LISTA É ESCRITA, NÃO DERIVADA DE `Constants`** — e a diferença é a ordem. O `ENUM`
 * `escopo_curso` do banco tem sete valores na ordem em que o tipo foi criado; derivar dele daria
 * cinco valores certos **na ordem errada**, e a tela pareceria funcionar. Quem confere que a lista
 * continua sendo um subconjunto do tipo é `tests/unidade/classificacoes-de-curso.test.ts`, nas duas
 * direções.
 *
 * ⚠️ **DOIS VALORES DO TIPO FICAM DE FORA, POR MOTIVOS DIFERENTES.** `geral` é sentinela de escopo e
 * nunca foi curso (achado 4 do Épico 2); `ead_semipresencial` é **recusado pelo banco** desde o
 * `FR-003.1`, porque o recorte do Operador é `classificacao = escopo` e um curso gravado com esse
 * valor ficaria **invisível para todos os Operadores**.
 *
 * ⚠️ **ESTA NÃO É A LISTA DO FILTRO DO INÍCIO.** `lib/navegacao/contrato.ts` exporta `CLASSIFICACOES`
 * como o tipo inteiro, para o `/inicio` do Épico 4 (c), sob o critério *"o filtro não pode recusar um
 * valor que a coluna aceita"*. As duas convivem de propósito, e a divergência está registrada como
 * D-19: mudar o filtro do Início é decisão à parte.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

/** As cinco, na ordem do Glossário. É esta ordem que agrupa os cartões de `/cursos`. */
export const CLASSIFICACOES_DE_CURSO = [
  "regular",
  "expedito",
  "especial",
  "aperfeicoamento_avancado",
  "estagio_qualificacao",
] as const;

export type ClassificacaoDeCurso = (typeof CLASSIFICACOES_DE_CURSO)[number];

/**
 * O rótulo de tela de cada uma — **o do Glossário, literalmente**.
 *
 * > *"**Classificação (do curso).** Categoria administrativa do curso: Curso Regular, Curso
 * > Expedito, Curso Especial, Curso de Aperfeiçoamento Avançado, ou Estágio de Qualificação."*
 * > — `docs/fase-1/07-Glossario.md`, linha 132
 *
 * ⚠️ **O `FR-003` LISTA A ORDEM, NÃO O RÓTULO.** Ele escreve *"Regular · Expedito · Especial ·
 * Aperfeiçoamento Avançado · Estágio de Qualificação"* para dizer **em que ordem** os grupos
 * aparecem — e ler aquilo como vocabulário produz "Regular" onde a Divisão diz "Curso Regular".
 * Dúvida de vocabulário vai ao documento 07, não ao requisito que por acaso cita a lista.
 *
 * ⚠️ **ESTA É A ÚNICA LISTA DE RÓTULOS, e ela nasceu duplicada.** `lib/constantes/instrutor.ts`
 * já trazia as mesmas cinco, com os mesmos nomes, para a barra de filtros de `/instrutores`
 * (spec 006). Ele agora **deriva daqui**: duas listas do mesmo vocabulário divergem no dia em que
 * alguém corrige uma — e a tela de cursos diria "Regular" enquanto a de instrutores dizia
 * "Curso Regular", para a mesma coisa.
 *
 * ⚠️ O VALOR DO BANCO NÃO VAI PARA A TELA. `aperfeicoamento_avancado` é `snake_case` sem acento por
 * restrição do motor, não por escolha de vocabulário.
 */
export const ROTULO_DA_CLASSIFICACAO: Readonly<Record<ClassificacaoDeCurso, string>> = {
  regular: "Curso Regular",
  expedito: "Curso Expedito",
  especial: "Curso Especial",
  aperfeicoamento_avancado: "Curso de Aperfeiçoamento Avançado",
  estagio_qualificacao: "Estágio de Qualificação",
};

/**
 * O porteiro do que chega pela URL.
 *
 * ⚠️ **SEM ELE, `?classificacao=geral` ABRE A TELA VAZIA SEM DIZER POR QUÊ** — e a pessoa conclui
 * "não tem curso cadastrado". É o gotcha nº 4 do `CLAUDE.md` chegando pela porta da frente: distinga
 * sempre *"não há"* de *"esse valor não existe aqui"*.
 */
export function ehClassificacaoDeCurso(valor: string): valor is ClassificacaoDeCurso {
  return (CLASSIFICACOES_DE_CURSO as readonly string[]).includes(valor);
}

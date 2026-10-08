/**
 * Quem assina o DSA impresso, pela vigência **na data da semana** — `FR-036`, `FR-036.1`, `Q-14`.
 *
 * > *"Reimprimir hoje um DSA de março traz quem assinava em março, não quem assina hoje."*
 * > — critério **3** do Épico 6, documento 06 da Fase 1
 *
 * > *"O rodapé impresso sai com as assinaturas preenchidas — o defeito histórico do achado (b) não
 * > reaparece."*
 * > — critério **2** do Épico 6, documento 06 da Fase 1
 *
 * > *"As assinaturas MUST ser resolvidas de `responsaveis_curso` pela vigência **na data da
 * > semana**, nos modos **fixo** e **dinâmico**; sem responsável vigente, a linha MUST sair **em
 * > branco**."*
 * > — `FR-036`, spec 013
 *
 * > *"A resolução MUST procurar, por papel, a linha **do curso** e, não a achando, cair na linha
 * > **GERAL** (`curso_id` nulo) — a linha do curso **prevalece**."*
 * > — `FR-036.1`, spec 013
 *
 * ⚠️ **O QUE FOI MEDIDO, e é o que torna o critério 3 não demonstrável sem semear dado** (banco
 * **remoto**, só por leitura, **05/10/2026**; `estado-atual.md` §10 e §10.3): `responsaveis_curso`
 * tem **duas** linhas, **as duas com `curso_id` nulo** (GERAL) — `elaborador` em modo
 * **`dinamico_usuario_logado`** e `encarregado_divisao` em modo **`fixo`**. Três leituras saem daí:
 *
 * 1. **O par de assinaturas do DSA existe e cobre TODOS os cursos**, então o critério **2** é
 *    alcançável **sem cadastro novo** — o achado (b) da v1.0 (aba com 0 linhas, todo DSA saindo em
 *    branco) já está resolvido no dado.
 * 2. ⚠️ **Quem assina à esquerda é QUEM IMPRIME, e isso é o CONTRÁRIO da prática da planilha**, onde
 *    o Auxiliar é **fixo por curso**. A configuração do banco já respondeu à `Q-14`, e respondeu
 *    contra o hábito. Trocar é **`UPDATE` + uma linha por curso**, nunca código — e é justamente
 *    para isso que o `FR-036.1` existe.
 * 3. ⚠️ **HÁ UMA SÓ VIGÊNCIA POR PAPEL, logo qualquer semana resolve para as mesmas duas pessoas** —
 *    o critério **3** **não é demonstrável com o dado de hoje**. Por isso o teste de unidade
 *    **semeia duas** vigências do mesmo papel: é a única forma de o caso de março separar-se do caso
 *    de setembro. **Caso que dá o mesmo veredito antes e depois não testa a mudança** (DoD 8).
 *
 * ⚠️ **AUSÊNCIA DEVOLVE `null`, E A LINHA SAI EM BRANCO — NUNCA UM ERRO** (`RN-DEG-01`, `FR-036`).
 * E o `comment on column responsaveis_curso.vigente_de` explica por que isto é o comportamento
 * **honesto** e não uma degradação: as linhas semente receberam a **data da migração**, de propósito,
 * para que *"um DSA de semana anterior reimprimido saia sem assinatura — naquela data não havia
 * responsável cadastrado"*. Inventar quem assinou é afirmar retroativamente que alguém assinou um
 * documento que saiu em branco.
 *
 * ⚠️ **O DESEMPATE POR `ordem` NÃO É DECORATIVO: a `EXCLUDE` do banco NÃO PROTEGE AS LINHAS GERAL.**
 * Medido no texto da própria restrição (`ex_assinatura_sem_sobreposicao`, migration
 * `20260829233423`, nota do autor): *"`curso_id` é anulável (assinatura global). Em constraint de
 * exclusão uma linha com expressão nula não conflita com ninguém, então assinaturas globais ficam
 * fora desta proteção."* Logo **duas linhas GERAL do mesmo papel com vigências sobrepostas são
 * possíveis no banco** — e as duas linhas reais são GERAL. Sem desempate determinístico, o rodapé
 * mudaria de nome conforme a ordem em que o PostgREST devolvesse as linhas, **sem erro nenhum**.
 *
 * ⚠️ **`status` NÃO É CAMPO DESTE MÓDULO, e `exibirNoDsa` É — a assimetria é deliberada.** A
 * exclusão lógica (`status = 'ativo'`) é universal no sistema e já vive no `where` da consulta e no
 * índice parcial `idx_responsaveis_resolucao`; reimplementá-la aqui seria o **segundo** lugar onde
 * ela mora. `exibir_no_dsa` é o contrário: é decisão **deste documento**, a coluna existe para ele,
 * e por isso o filtro é regra de domínio e é provado por teste.
 *
 * ⚠️ **ESTE MÓDULO NÃO FORMATA NOME.** O formato `P/G Especialidade Nome de Guerra` (`RF-INSTR-15`,
 * `RN-ANT-01` por perto) tem ponto único em `lib/dominio/nome-instrutor.ts`; aqui os campos **passam
 * adiante** como chegaram. Duas montagens do mesmo nome divergiriam na primeira abreviação nova.
 *
 * ⚠️ **O POSTO DA ASSINATURA SAI POR EXTENSO, COM O QUADRO — e é derivado AQUI, uma vez** *(item 7 das
 * correções de 08/10/2026, decisão de Bernardo Villas Boas)*. Quem sabe o por extenso é
 * `lib/dominio/posto-por-extenso.ts`; este módulo só o chama, para que a rubrica da tela e a do papel
 * imprimam o **mesmo** campo (`postoPorExtenso`) e nenhuma das duas volte a ler a sigla. Os campos
 * crus (`postoGraduacao`, `especialidade`) continuam transportados. ⚠️ **Até esta correção a leitura
 * nem trazia `especialidade`**: o quadro nunca chegava ao rodapé.
 *
 * ⚠️ **DIVERGÊNCIA REPORTADA, NÃO CORRIGIDA (regra 1):** o `CHECK resp_fixo_tem_nominal` exige, no
 * modo `fixo`, **`posto_graduacao` e `nome_guerra`** — e **não** `nome_completo`, que é **nulável**.
 * Então uma linha `fixo` perfeitamente válida pode chegar aqui com `nomeCompleto` **nulo**, e o
 * rodapé sairia com posto e sem nome. O contrato desta fatia pede `nomeCompleto`; o módulo
 * **transporta o que recebe** e não inventa substituto. Está anotado aqui para que quem escrever a
 * rota de impressão (T083) leia isto antes de descobrir na tela.
 *
 * ⚠️ **COMPARAÇÃO DE DATA É LEXICOGRÁFICA SOBRE O TEXTO ISO, e é de propósito.** `aaaa-mm-dd` ordena
 * como texto exatamente como ordena no calendário, sem fuso e sem `Date`: `new Date("2026-03-01")` é
 * meia-noite **em UTC**, e em `America/Sao_Paulo` isso é **28/02** — um DSA da primeira semana de
 * março resolveria pela vigência de fevereiro, **sem erro nenhum**. É a convenção da pasta inteira
 * (ver `horario-do-bloco.ts`, `capacidade.ts` e `situacao.ts`).
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`** (Princípio II, imposto por ESLint).
 * As linhas, o curso e a data chegam **por parâmetro** — é o que permite provar a vigência com casos
 * sintéticos, sem subir banco, e é o que faz o caso de março existir.
 */
import { postoParaAssinatura } from "@/lib/dominio/posto-por-extenso";

/** O `public.papel_assinatura` do banco — ENUM nativo, `not null`, medido em 05/10/2026. */
export type PapelDeAssinatura =
  "elaborador" | "encarregado_divisao" | "encarregado_curso" | "chefe_departamento";

/** O `public.modo_preenchimento_assinatura` do banco — ENUM nativo, `not null`. */
export type ModoDePreenchimento = "fixo" | "dinamico_usuario_logado";

/**
 * Uma linha de `responsaveis_curso`, no mínimo que a resolução precisa saber dela.
 *
 * ⚠️ Chega **já filtrada por `status = 'ativo'`** — ver a nota da assimetria, no topo.
 */
export type ResponsavelDoCurso = {
  readonly papel: PapelDeAssinatura;
  readonly preenchimento: ModoDePreenchimento;
  /** `null` = GERAL, vale para todos os cursos. A linha DO CURSO prevalece (`FR-036.1`). */
  readonly cursoId: string | null;
  /** `aaaa-mm-dd`, nunca `Date`. */
  readonly vigenteDe: string;
  /** `aaaa-mm-dd` ou `null` = vigente para sempre. */
  readonly vigenteAte: string | null;
  readonly exibirNoDsa: boolean;
  /** `smallint not null`, `>= 1` por `CHECK`. É a ordem do rodapé, e o desempate daqui. */
  readonly ordem: number;
  readonly nomeCompleto: string | null;
  readonly postoGraduacao: string | null;
  /**
   * O quadro/especialidade (`responsaveis_curso.especialidade`), como veio — `FR`, `(T)`, `(RM2-T)`.
   * Quem o põe entre parênteses é `postoParaAssinatura`.
   */
  readonly especialidade: string | null;
  /** `not null` no banco — a linha impressa ABAIXO da rubrica. Vale nos DOIS modos. */
  readonly funcaoDescricao: string;
};

/**
 * Uma assinatura resolvida, pronta para o rodapé.
 *
 * ⚠️ **A `funcaoDescricao` SAI DA LINHA NOS DOIS MODOS, inclusive no dinâmico.** No dinâmico o que
 * a sessão resolve é **a pessoa**, nunca o **cargo** — se a função viesse de quem imprime, o rodapé
 * diria que o Ajudante é o Encarregado da Divisão.
 */
export type Assinatura = {
  readonly papel: PapelDeAssinatura;
  readonly funcaoDescricao: string;
  /** `null` no modo dinâmico: quem assina é quem imprime, e a ROTA resolve isso. */
  readonly nomeCompleto: string | null;
  /** A sigla, crua (`1ºTen`). ⚠️ **A rubrica não a imprime** — imprime `postoPorExtenso`. */
  readonly postoGraduacao: string | null;
  readonly especialidade: string | null;
  /**
   * **O que a rubrica imprime** — `Primeiro-Tenente (RM2-T)`, `Capitão de Corveta` (item 7 de
   * 08/10/2026). `""` sem posto, e sempre `""` no modo dinâmico (`usuarios` não tem posto).
   */
  readonly postoPorExtenso: string;
  readonly resolvePeloUsuarioLogado: boolean;
};

/**
 * O par do rodapé: `elaborador` à esquerda, `encarregado_divisao` à direita.
 *
 * ⚠️ **`null` em qualquer um dos lados é LINHA EM BRANCO, nunca erro** (`FR-036`, `RN-DEG-01`).
 */
export type AssinaturasDoDsa = {
  readonly esquerda: Assinatura | null;
  readonly direita: Assinatura | null;
};

/**
 * O papel que assina à **esquerda** do rodapé, e o que assina à **direita**.
 *
 * ⚠️ **SÃO O PAR MÍNIMO EXIGIDO, e está escrito no catálogo:** o `comment on type
 * public.papel_assinatura` diz *"`elaborador` + `encarregado_divisao` são o par mínimo exigido por
 * `RF-DSA-06`"*. Os outros dois valores do ENUM — `encarregado_curso` e `chefe_departamento` —
 * **existem e são resolvíveis** por `resolverAssinatura`, mas **não entram neste par**: eles
 * assinam outros documentos, e enfiá-los aqui mudaria o layout aprovado da v2.0, que é requisito de
 * paridade (`RNF-COMP-01`).
 */
export const PAPEL_DA_ESQUERDA: PapelDeAssinatura = "elaborador";
export const PAPEL_DA_DIREITA: PapelDeAssinatura = "encarregado_divisao";

/** `true` quando `data` cai dentro da vigência da linha — fim **inclusivo**. */
function vigenteNaData(linha: ResponsavelDoCurso, data: string): boolean {
  /*
   * ⚠️ **FIM INCLUSIVO, e é escolha consciente contra a `daterange(…, '[)')` da `EXCLUDE`.** A
   *    divergência de semântica de `vigente_ate` é **conhecida e reportada** no `CLAUDE.md`
   *    (*"Divergência reportada, não corrigida"*): o documento 05 §7.5 escreve fim **exclusivo** e o
   *    SQL de referência implementa `vigente_ate + 1`, fim **inclusivo**. **Seguimos o referência**,
   *    que é o que o banco faz. Vale **um dia, na fronteira** — e é exatamente o dia em que alguém
   *    reimprime o último DSA de quem acabou de render.
   */
  if (linha.vigenteDe > data) return false;
  return linha.vigenteAte === null || linha.vigenteAte >= data;
}

/**
 * A assinatura de **um** papel, para um curso, numa data — ou `null` se não houver vigente.
 *
 * A ordem das regras é a do `FR-036.1`, e ela importa:
 * 1. descarta `exibirNoDsa === false`;
 * 2. filtra pelo `papel`;
 * 3. filtra pela **vigência na data**;
 * 4. ⚠️ **a linha DO CURSO prevalece sobre a GERAL** — havendo candidata do curso, as GERAL saem;
 * 5. entre as que sobraram, a de **maior `vigenteDe`**; empatando, a de **menor `ordem`**;
 * 6. nenhuma → `null`, e a tela imprime a linha **em branco**.
 *
 * ⚠️ **O PASSO 4 VEM ANTES DO PASSO 5, E A ORDEM NÃO É PERMUTÁVEL.** Invertidos, uma linha GERAL
 * com `vigente_de` **mais recente** venceria a linha **do curso** — e o Auxiliar que a divisão
 * cadastrou para o CAHO desapareceria do rodapé no dia em que alguém atualizasse a assinatura
 * institucional. É o `FR-036.1` ao contrário, e nenhuma tela mostraria o porquê.
 */
export function resolverAssinatura(
  linhas: readonly ResponsavelDoCurso[],
  entrada: {
    readonly papel: PapelDeAssinatura;
    readonly cursoId: string;
    readonly data: string;
  },
): Assinatura | null {
  const candidatas = linhas.filter(
    (linha) =>
      linha.exibirNoDsa &&
      linha.papel === entrada.papel &&
      (linha.cursoId === null || linha.cursoId === entrada.cursoId) &&
      vigenteNaData(linha, entrada.data),
  );

  if (candidatas.length === 0) return null;

  // Passo 4 — `FR-036.1`: havendo linha DO CURSO, as GERAL saem de cena.
  const doCurso = candidatas.filter((linha) => linha.cursoId === entrada.cursoId);
  const finalistas = doCurso.length > 0 ? doCurso : candidatas;

  // Passo 5 — a mais recente; empatando, a de menor `ordem`. Sem índice, por `noUncheckedIndexedAccess`.
  let escolhida: ResponsavelDoCurso | null = null;
  for (const linha of finalistas) {
    if (escolhida === null) {
      escolhida = linha;
      continue;
    }
    if (linha.vigenteDe > escolhida.vigenteDe) {
      escolhida = linha;
      continue;
    }
    if (linha.vigenteDe === escolhida.vigenteDe && linha.ordem < escolhida.ordem) {
      escolhida = linha;
    }
  }

  if (escolhida === null) return null;

  const dinamico = escolhida.preenchimento === "dinamico_usuario_logado";
  /*
   * ⚠️ **NO MODO DINÂMICO OS NOMINAIS SAEM `null`, E NÃO "o que estiver na linha".** A linha
   *    dinâmica guarda `email_usuario`/`usuario_id` como chave de resolução, e pode ter nominal
   *    antigo esquecido ali — imprimi-lo faria o rodapé mostrar **quem não está imprimindo**, com
   *    cara de dado correto. `null` + `resolvePeloUsuarioLogado` obriga a rota a resolver, ou a
   *    deixar em branco. O posto por extenso sai dos campos JÁ anulados, então também sai vazio.
   */
  const postoGraduacao = dinamico ? null : escolhida.postoGraduacao;
  const especialidade = dinamico ? null : escolhida.especialidade;

  return {
    papel: escolhida.papel,
    funcaoDescricao: escolhida.funcaoDescricao,
    nomeCompleto: dinamico ? null : escolhida.nomeCompleto,
    postoGraduacao,
    especialidade,
    postoPorExtenso: postoParaAssinatura(postoGraduacao, especialidade),
    resolvePeloUsuarioLogado: dinamico,
  };
}

/**
 * O par de assinaturas do rodapé do DSA — `elaborador` à esquerda, `encarregado_divisao` à direita.
 *
 * ⚠️ **NUNCA LEVANTA EXCEÇÃO E NUNCA DEVOLVE OBJETO VAZIO NO LUGAR DE `null`** (`RN-DEG-01`): lado
 * sem vigente sai `null`, e a tela imprime a linha em branco. Um objeto com campos vazios se leria
 * como *"existe assinatura, sem nome"*, que é afirmação diferente de *"não havia responsável
 * cadastrado naquela data"*.
 */
export function assinaturasDoDsa(
  linhas: readonly ResponsavelDoCurso[],
  entrada: { readonly cursoId: string; readonly data: string },
): AssinaturasDoDsa {
  return {
    esquerda: resolverAssinatura(linhas, {
      papel: PAPEL_DA_ESQUERDA,
      cursoId: entrada.cursoId,
      data: entrada.data,
    }),
    direita: resolverAssinatura(linhas, {
      papel: PAPEL_DA_DIREITA,
      cursoId: entrada.cursoId,
      data: entrada.data,
    }),
  };
}

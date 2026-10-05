/**
 * O **pré-preenchimento** do formulário de lançamento — `FR-013`, `FR-014`, `FR-015`, `SC-009`.
 *
 * > *"O operador escolhe **onde** (dia + TA inicial) na grade, a **disciplina** da turma, a
 * > **Unidade de Ensino** e **quantos TA**. Instrutor, técnica de ensino e local **chegam
 * > preenchidos**; o conteúdo nasce do tópico da UE. Qualquer um deles pode ser trocado **naquele
 * > lançamento**, sem alterar cadastro nenhum."*
 * > — User Story 2 (a `H2`), spec 013
 *
 * > *"O pré-preenchimento do instrutor MUST seguir a cascata **UE da turma → disciplina da turma →
 * > vazio com aviso**, e MUST NOT inventar instrutor."*
 * > — `FR-014`, spec 013
 *
 * > *"Lançar um bloco de aula MUST exigir **no máximo quatro** decisões — onde, disciplina, UE,
 * > quantos TA; instrutor, técnica e local MUST chegar **preenchidos** e MUST ser editáveis
 * > **naquele lançamento**."*
 * > — `FR-013`, spec 013
 *
 * ⚠️ **ESTE MÓDULO NÃO DECIDE NADA SOBRE CADASTRO — ele SÓ SUGERE, e é isso que mata o `D-4` da
 * planilha.** Medido na prática da v2.0: *"Instrutor, local e técnica são atributo DO ITEM do
 * catálogo, não do lançamento: trocar o instrutor de uma UE reescreve todo DSA passado"*
 * (`praticas-da-planilha.md`, `D-4`). Aqui o catálogo é **só a origem do valor inicial** — o valor
 * vive na **linha do lançamento** (`registros_aula.instrutor_id`, `.local`, `.metodologia`), que é
 * propriedade do schema desde o Épico 1. A saída desta função é, portanto, um **retrato de abertura
 * de formulário**: ela não tem caminho nenhum de volta ao cadastro, e é a forma do retorno que
 * garante o `FR-015`, não a lembrança de quem escreve a tela.
 *
 * ⚠️ **A MEDIÇÃO QUE MUDA A EXPECTATIVA, e ela inverte a leitura fácil da cascata:** no banco
 * **remoto** (projeto `cqhpfuaweoyglhtrckcp`, lido só por leitura em **05/10/2026**, registrado em
 * `specs/013-detalhe-semanal-de-aula/estado-atual.md` §5), **`turma_disciplina_unidade` tem ZERO
 * linhas** e **`turma_disciplina_instrutor` tem 99**. Ou seja: **o primeiro degrau da cascata está
 * vazio hoje**, e quem sustenta o pré-preenchimento inteiro é o **segundo**. ⚠️ **Escrever a cascata
 * sem essa medição faria o caso de teste "vence a por UE" parecer o caminho normal, quando ele é
 * hoje o caminho que NUNCA acontece** — e o degrau que a operação vai ver é o segundo, com o
 * terceiro aparecendo em toda disciplina sem atribuição.
 *
 * ⚠️ **E É POR ISSO QUE O TERCEIRO DEGRAU TEM FRASE, NÃO SILÊNCIO** (`RN-DEG-01`):
 * *"pré-preenchimento que cai em branco na maioria das turmas não é pré-preenchimento, é um campo
 * vazio com cara de preenchido"* (`estado-atual.md` §5). O campo vazio **e mudo** manda o operador
 * concluir que a tela está quebrada; o campo vazio **com a frase** manda-o atribuir o instrutor onde
 * se atribui. ⚠️ **E a gravação sem instrutor SERÁ RECUSADA de todo jeito** — o
 * `CHECK reg_aula_instrutor_obrigatorio` exige instrutor em categoria `aula` (medido em 05/10/2026)
 * —, então sem a frase a pessoa só descobriria o que falta **depois** de preencher o resto.
 *
 * ⚠️ **NADA AQUI INVENTA VALOR — em especial o `local`, que NÃO inventa sala.** As quatro saídas
 * podem sair `null`, e `null` é a resposta honesta de *"o cadastro não tem isso"*. Um valor plausível
 * no lugar da ausência é o modo de falha mais caro desta tela: ele **grava** — o operador confirma um
 * campo que ninguém escolheu, e o DSA assinado sai com uma sala em que a aula não aconteceu.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`** (Princípio II, imposto por ESLint).
 * As atribuições, a UE e a sala chegam **por parâmetro**, já lidas — é o que permite provar a cascata
 * com casos sintéticos, sem subir banco, e é também o que impede este módulo de consultar o cadastro
 * por conta própria.
 */

/** Uma linha de `turma_disciplina_unidade` — o **primeiro** degrau (hoje vazio no remoto). */
export type AtribuicaoPorUnidade = {
  readonly unidadeEnsinoId: string;
  readonly instrutorId: string;
};

/** Uma linha de `turma_disciplina_instrutor` — o **segundo** degrau (99 linhas no remoto). */
export type AtribuicaoPorDisciplina = {
  readonly disciplinaId: string;
  readonly instrutorId: string;
};

/**
 * Por que o instrutor não veio — a tela mostra a frase e diz onde se atribui.
 *
 * ⚠️ **É UM MOTIVO, E NÃO UM BOOLEANO, DE PROPÓSITO.** `instrutorId: null` sozinho só diz *"está
 * vazio"*; quem olha a tela precisa saber **por quê** e **onde resolver**. E ele é um tipo fechado
 * para que a frase tenha dono único (`frasePara`) em vez de nascer escrita à mão em cada tela.
 */
export type MotivoDoInstrutorVazio = "sem_atribuicao_na_turma" | null;

export type Preenchimento = {
  readonly instrutorId: string | null;
  readonly motivoDoInstrutorVazio: MotivoDoInstrutorVazio;
  /** Valor da lista `metodologias` — `unidades_ensino.tecnica_ensino_sugerida`. */
  readonly tecnica: string | null;
  /** `turmas.sala_alocada`. **Nunca inventada.** */
  readonly local: string | null;
  /** `unidades_ensino.topico` — em aula **sem UE** sai `null`, para o operador digitar (`Q-1`). */
  readonly conteudo: string | null;
};

/**
 * Texto do cadastro, ou `null` quando não há o que preencher.
 *
 * ⚠️ **BRANCO É AUSÊNCIA, NÃO VALOR.** Coluna `text` nulável chega do PostgREST como `null` **ou**
 * como `""` quando alguém gravou um campo vazio, e `""` num campo pré-preenchido é indistinguível de
 * *"preenchido"* para quem confere a tela de relance. Os dois viram `null`, que é o único estado que
 * a tela sabe tratar (`RN-DEG-01`).
 */
function textoOuNulo(valor: string | null): string | null {
  if (valor === null) return null;
  const limpo = valor.trim();
  return limpo === "" ? null : limpo;
}

/**
 * O que vem **da UE** só vem quando há UE escolhida.
 *
 * ⚠️ **ISSO É GUARDA CONTRA VALOR QUE SOBRA, e o caso existe:** `tecnica_ensino_sugerida` e `topico`
 * são colunas de **`unidades_ensino`**, e o formulário é folha de cliente com estado — ao trocar para
 * *aula sem UE* (a `Q-1`: curso por competências e as 6 disciplinas sem UE), o tópico da UE anterior
 * continuaria no campo. ⚠️ **E ele não cairia em nenhuma recusa:** o `CHECK` da `Q-1` exige
 * **conteúdo** em aula sem UE, então o tópico herdado o satisfaria — gravando conteúdo de uma UE que
 * **não está no lançamento**, sem erro nenhum. Para o operador correto esta guarda é inerte (sem UE,
 * o cadastro não tem o que entregar); para o caminho da `Q-1` ela é o que faz o campo abrir vazio,
 * que é o que o contrato manda (*"aula sem UE: obrigatório digitar"*).
 *
 * ⚠️ **O `local` NÃO passa por aqui** — ele é de `turmas`, não da UE, e vale com UE ou sem ela.
 */
function daUnidadeDeEnsino(unidadeEnsinoId: string | null, valor: string | null): string | null {
  return unidadeEnsinoId === null ? null : textoOuNulo(valor);
}

/** O instrutor de uma atribuição, ou `null` quando a linha não nomeia ninguém. */
function instrutorDaAtribuicao(atribuicao: { readonly instrutorId: string } | undefined) {
  return atribuicao === undefined ? null : textoOuNulo(atribuicao.instrutorId);
}

/**
 * O que já vem preenchido quando o operador abre o formulário — **no máximo quatro decisões para
 * ele** (`FR-013`, `SC-009`).
 *
 * **A cascata do instrutor, nesta ordem, e cada degrau tem razão:**
 * 1. a atribuição **por UE** daquela turma (`turma_disciplina_unidade`), quando há UE escolhida —
 *    é a mais específica, e quem a cadastrou quis exatamente aquele instrutor naquela unidade;
 * 2. a atribuição **por disciplina** da turma (`turma_disciplina_instrutor`) — é a que existe de
 *    fato hoje (99 linhas), e a que sustenta o `SC-009`;
 * 3. **nenhuma** → `instrutorId: null` com `motivoDoInstrutorVazio: "sem_atribuicao_na_turma"`.
 *
 * ⚠️ **COM UE NULA, O PRIMEIRO DEGRAU É PULADO — não "procurado e não encontrado".** Aula sem UE é
 * caminho legítimo (`Q-1`), e varrer `porUnidade` sem id de UE casaria com a primeira linha da lista,
 * que é atribuição de **outra** unidade. Daria um instrutor plausível e errado, que é pior que vazio.
 *
 * ⚠️ **MAIS DE UMA ATRIBUIÇÃO PARA A MESMA UE (ou disciplina) É POSSÍVEL — é o rateio em cinco casos
 * da spec 010 —, e aqui vem A PRIMEIRA DA LISTA RECEBIDA.** O lançamento tem **um** instrutor nesta
 * fatia (`Q-9`: *"mais de um instrutor na mesma aula fica para depois"*), então alguém tem de ser
 * sugerido e o operador troca se não for ele. ⚠️ **A ORDEM É DO CHAMADOR, e ela não é indiferente:**
 * lista de instrutor sai **em antiguidade** (`RN-ANT-01`, Risco Alto), e é na consulta que isso se
 * garante — este módulo não reordena nada, porque reordenar aqui seria o segundo lugar onde a
 * `RN-ANT-01` vive.
 */
export function preencherLancamento(entrada: {
  readonly disciplinaId: string;
  readonly unidadeEnsinoId: string | null;
  readonly porUnidade: readonly AtribuicaoPorUnidade[];
  readonly porDisciplina: readonly AtribuicaoPorDisciplina[];
  /** `unidades_ensino.tecnica_ensino_sugerida` — pode ser nula. */
  readonly tecnicaSugerida: string | null;
  /** `unidades_ensino.topico` — `NOT NULL` no banco quando há UE. */
  readonly topico: string | null;
  /** `turmas.sala_alocada` — pode ser nula. */
  readonly salaDaTurma: string | null;
}): Preenchimento {
  const { disciplinaId, unidadeEnsinoId, porUnidade, porDisciplina } = entrada;

  // Degrau 1 — só existe quando há UE escolhida.
  const porUe =
    unidadeEnsinoId === null
      ? null
      : instrutorDaAtribuicao(porUnidade.find((a) => a.unidadeEnsinoId === unidadeEnsinoId));

  // Degrau 2 — a atribuição da disciplina **nesta** turma.
  const porDisc =
    porUe !== null
      ? null
      : instrutorDaAtribuicao(porDisciplina.find((a) => a.disciplinaId === disciplinaId));

  const instrutorId = porUe ?? porDisc;

  return {
    instrutorId,
    /*
     * ⚠️ **O MOTIVO É DERIVADO DO RESULTADO, NUNCA ESCRITO EM DOIS LUGARES.** Um `motivo` montado
     *    nos ramos da cascata poderia discordar do `instrutorId` — frase de ausência com instrutor
     *    preenchido, que é a tela mentindo sobre o próprio campo.
     */
    motivoDoInstrutorVazio: instrutorId === null ? "sem_atribuicao_na_turma" : null,
    tecnica: daUnidadeDeEnsino(unidadeEnsinoId, entrada.tecnicaSugerida),
    local: textoOuNulo(entrada.salaDaTurma),
    conteudo: daUnidadeDeEnsino(unidadeEnsinoId, entrada.topico),
  };
}

/**
 * A frase do campo vazio — **uma só, com dono único** (`RN-DEG-01`).
 *
 * > *"A tela precisa dizer «esta disciplina não tem instrutor atribuído nesta turma» e apontar onde
 * > se atribui — degradação segura (`RN-DEG-01`), não campo mudo."*
 * > — `estado-atual.md` §5, spec 013
 *
 * ⚠️ **O DESTINO CITADO É O RÓTULO REAL DA TELA, lido no código em 05/10/2026** —
 * `app/(app)/disciplinas/paineis/PainelDeInstrutores.tsx` escreve **"Instrutores nesta turma"**, e a
 * cascata curso → turma que leva até ele é a de `/disciplinas`. ⚠️ **Frase que manda a pessoa a um
 * lugar com outro nome é pior que frase genérica:** ela parece precisa e faz procurar o que não
 * existe. O **link** é da tela, não deste módulo (ele é puro); o que mora aqui é o texto.
 *
 * ⚠️ **`null` DEVOLVE `null` — a ausência de motivo não tem frase.** É o controle negativo da própria
 * função: o dia em que ela devolver texto para `null`, a tela mostra aviso de instrutor faltando com
 * o instrutor preenchido ao lado.
 */
export function frasePara(motivo: MotivoDoInstrutorVazio): string | null {
  if (motivo === "sem_atribuicao_na_turma") {
    return (
      "Esta disciplina não tem instrutor atribuído nesta turma. Atribua em Disciplinas, " +
      "no painel «Instrutores nesta turma» — aula sem instrutor não é gravada."
    );
  }
  return null;
}

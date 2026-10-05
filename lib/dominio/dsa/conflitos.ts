/**
 * O conflito de horário da grade semanal — `RN-CONF-01` **[REVISADA]**, critério **5** da spec 013.
 *
 * > *"Dois lançamentos do mesmo dia são considerados em conflito quando seus intervalos de tempo de
 * > aula se sobrepõem **e** (o instrutor é o mesmo **ou** a sala é a mesma). Nesta revisão, a
 * > verificação de conflito de instrutor deixa de ficar restrita à turma sendo visualizada e passa a
 * > considerar **todas as turmas do sistema** no mesmo dia/horário — a implementação da v1.0 só
 * > compara lançamentos dentro de uma única turma, o que deixa passar despercebido um instrutor
 * > escalado simultaneamente em duas turmas diferentes. Conflito de sala continua sendo sinalizado,
 * > mas como alerta secundário, por ser um caso mais raro (duas turmas de cursos diferentes ocupando
 * > a mesma sala). O cálculo continua sendo feito em memória, nunca através de uma tabela de
 * > conflitos persistida. **Risco: Alto** (sobe em relação à v1.0 porque a nova verificação cruza
 * > turmas, exigindo acesso a mais dados do que o cálculo original)."*
 * > — `RN-CONF-01`, documento 04 da Fase 1, **Risco: Alto**
 *
 * ## O que este módulo NÃO faz, e é o mais importante dele
 *
 * ⚠️ **ELE SÓ MARCA. NUNCA BLOQUEIA** (`RN-DEG-02`). O veredito volta como marca por bloco, a tela
 * pinta, e a gravação segue. O documento 20 §6.4 registra a decisão de **não** transformar a regra
 * em `EXCLUDE USING gist`: *"o Encarregado precisa poder lançar e ver o vermelho para negociar a
 * troca"*. Um `throw` aqui, ou um `boolean` que a Server Action lesse como recusa, seria a mesma
 * mudança de regra por outro caminho.
 *
 * ⚠️ **NADA É PERSISTIDO.** A regra diz *"em memória, nunca através de uma tabela de conflitos
 * persistida"* — e é por isso que a saída é um `Map` descartável, recalculado a cada leitura da
 * semana, e não uma coluna.
 *
 * ## O bloco alheio NÃO TEM IDENTIDADE, e isso é contrato, não descuido
 *
 * ⚠️ **SÓ OS BLOCOS DESTA TURMA PODEM SER CHAVE DO MAPA.** `public.conflitos_da_semana()` **nunca**
 * devolve `turma_id`, `fato_id`, disciplina nem o código da turma alheia (`contracts/conflito.md`):
 * ela entrega a ocupação **anônima**, para que um Operador de escopo recortado veja o conflito sem
 * ganhar leitura de uma turma fora do alcance dele. Logo o *"ambos marcados"* do critério **5**
 * acontece **na tela de quem alcança as duas turmas** — cada semana marca o seu próprio lado, a
 * partir da ocupação anônima do outro. Um `fatoId` no alheio seria vazamento, não conveniência.
 *
 * ## O fiscal externo não participa — declarado, não esquecido
 *
 * ⚠️ **AVALIAÇÃO FISCALIZADA POR ALGUÉM DE FORA DO CADASTRO FICA SEM CRUZAMENTO.** O banco guarda
 * `nome_fiscal_externo` como **texto livre** (`RF-AVAL-06`, e o `CHECK aval_fiscal_exclusivo` já
 * impede os dois juntos): não há `id` para comparar. Cruzar por **nome** casaria homônimo e deixaria
 * passar grafia diferente — as duas falhas são silenciosas, e a segunda é a pior, porque produz
 * tranquilidade. Então o fiscal externo **não entra**, e quem lê esta grade precisa saber disso.
 *
 * ## A sala só é alerta ENTRE turmas
 *
 * ⚠️ **DOIS BLOCOS DESTA MESMA TURMA NA MESMA SALA NÃO SÃO CONFLITO DE SALA.** A regra define o caso
 * com essas palavras — *"duas turmas de cursos diferentes ocupando a mesma sala"* —, e o `RF-DSA-04`
 * repete *"duas turmas diferentes na mesma sala no mesmo horário"*. A turma na sala dela, em dois
 * blocos sobrepostos, é **lançamento duplicado**, que é outra regra e outra frase; chamar isso de
 * disputa de sala encheria a semana de vermelho pelo motivo errado. ⚠️ **O conflito de PESSOA, ao
 * contrário, vale dentro da própria turma**, porque a mesma pessoa não se desdobra — e esse caso a
 * v1.0 já pegava.
 *
 * ## Notas de desenho que mordem
 *
 * ⚠️ **O INTERVALO DE TA É FECHADO NAS DUAS PONTAS, e é a inclusividade que faz ADJACENTE não
 * casar.** `taFinal` é o último TA ocupado, então a sobreposição é `a.taInicial <= b.taFinal &&
 * a.taFinal >= b.taInicial`: um bloco que termina no 3º e outro que começa no 4º **não dividem TA
 * nenhum**. Um `+ 1` numa dessas comparações acusaria a semana inteira de conflito, e a tela ficaria
 * vermelha o tempo todo — que é o modo de falha que apaga o valor do alerta.
 *
 * ⚠️ **`data` É TEXTO `aaaa-mm-dd`, NUNCA `Date`** — a convenção da pasta inteira. A comparação é de
 * igualdade exata de string, sem fuso: `new Date("2026-03-01")` é meia-noite **UTC**, e em
 * `America/Sao_Paulo` isso é 28/02 (ver `lib/formato/data.ts`).
 *
 * ⚠️ **`local` NULO NÃO CASA COM `local` NULO** (`RN-DEG-01`). Duas turmas sem sala informada não
 * disputam nada; tratar a ausência como recurso faria toda semana sem sala preenchida nascer em
 * alerta — e, medido na base real, sala é coluna que quase ninguém preenche.
 *
 * ⚠️ **BLOCO SEM POSIÇÃO NÃO PARTICIPA** (`RN-DEG-01`). Registro histórico migrado sem TA, ou com
 * `taFinal` antes do `taInicial`, não se posiciona na grade — e *"acusar conflito de um bloco cuja
 * posição não se conhece seria inventar informação"* (documento 20 §6.4). Ele sai **sem marca**, e
 * não com marca falsa.
 *
 * ⚠️ **AUSÊNCIA DE CHAVE É AUSÊNCIA DE MARCA.** O mapa carrega **só** os blocos que têm algo a
 * sinalizar. Um mapa cheio de marcas vazias obrigaria toda tela a distinguir *"conferido e limpo"* de
 * *"nada a dizer"*, e a primeira que esquecesse pintaria a semana toda.
 *
 * ⚠️ **O CUSTO É `meus × alheios`, e isso é deliberado.** A v1.0 chegou a ~435 leituras redundantes
 * da planilha por requisição aqui (achado da spec 017); com os blocos já carregados e os volumes
 * reais — ~1.753 registros de aula **por ano**, e esta função vê **uma semana** —, a varredura direta
 * é irrelevante e é o que se consegue ler sem índice auxiliar nenhum.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`** (Princípio II, imposto por ESLint).
 * A semana da turma e a ocupação alheia chegam **por parâmetro** — é o que permite provar a regra de
 * *Risco: Alto* com casos sintéticos, sem subir banco.
 */

/**
 * Uma ocupação de TA na grade, no grão que a regra compara.
 *
 * É a forma que `public.conflitos_da_semana()` devolve, coluna por coluna — por isso `fiscalId` é um
 * `uuid` e não o tipo `Fiscal` de `bloco.ts`: o fiscal **externo** chega como nome e **não** vem
 * nesta lista (ver o cabeçalho).
 */
export type OcupacaoDeTa = {
  /** `aaaa-mm-dd`. Texto, nunca `Date`. */
  readonly data: string;
  /** Primeiro TA ocupado. */
  readonly taInicial: number;
  /** Último TA ocupado — **inclusive**. */
  readonly taFinal: number;
  readonly instrutorId: string | null;
  /** O fiscal **cadastrado** de uma avaliação. O de fora não tem `id` e não participa. */
  readonly fiscalId: string | null;
  /** Nome da sala, como foi digitado. `null` quando ninguém informou. */
  readonly local: string | null;
};

/** Uma ocupação **desta** turma — a única que pode ser marcada, porque é a única com identidade. */
export type OcupacaoPropria = OcupacaoDeTa & { readonly fatoId: string };

/**
 * O que a tela pinta numa célula.
 *
 * ⚠️ **SÃO DOIS CAMPOS, E NÃO UM NÍVEL ÚNICO**, porque a regra tem **dois pesos**: pessoa é conflito,
 * sala é *"alerta secundário"*. Um bloco pode ter os dois ao mesmo tempo, e colapsá-los num enum
 * perderia o segundo sempre que o primeiro existisse.
 *
 * ⚠️ **`null` EM VEZ DE OPCIONAL** porque `exactOptionalPropertyTypes` está ligado: *"sem conflito"*
 * é uma resposta medida, não um campo que faltou.
 */
export type MarcaDeConflito = {
  /** Por qual pessoa **do meu bloco** a coincidência aconteceu. `null` = nenhuma. */
  readonly conflito: "instrutor" | "fiscal" | null;
  /** O alerta secundário da regra: a mesma sala, em **outra** turma. */
  readonly alertaSala: boolean;
};

/** O bloco se posiciona na grade? Sem posição ele não participa de comparação nenhuma. */
function posiciona(ocupacao: OcupacaoDeTa): boolean {
  const { taInicial, taFinal } = ocupacao;
  if (!Number.isInteger(taInicial) || !Number.isInteger(taFinal)) return false;
  if (taInicial < 1) return false;
  return taFinal >= taInicial;
}

/**
 * Os dois ocupam TA em comum, no mesmo dia?
 *
 * ⚠️ **ADJACENTE NÃO SE SOBREPÕE** — ver a nota do cabeçalho sobre o intervalo fechado. Exportada
 * porque é a metade da regra que o teste precisa exercitar sozinha: um defeito aqui erra **toda** a
 * grade, e provar só pelo resultado final não diria qual das duas metades falhou.
 */
export function seSobrepoem(a: OcupacaoDeTa, b: OcupacaoDeTa): boolean {
  if (!posiciona(a) || !posiciona(b)) return false;
  if (a.data !== b.data) return false;
  return a.taInicial <= b.taFinal && a.taFinal >= b.taInicial;
}

/**
 * A sala, normalizada para comparar: sem espaço nas pontas e sem distinguir caixa.
 *
 * Devolve `null` quando não há sala — inclusive quando o texto é só espaço, que é o mesmo nada
 * escrito de outro jeito.
 */
function salaComparavel(local: string | null): string | null {
  if (local === null) return null;
  const limpo = local.trim().toLocaleLowerCase("pt-BR");
  return limpo === "" ? null : limpo;
}

/** A mesma sala nos dois? `null` **não** casa com `null`. */
function mesmaSala(a: OcupacaoDeTa, b: OcupacaoDeTa): boolean {
  const minha = salaComparavel(a.local);
  const outra = salaComparavel(b.local);
  return minha !== null && outra !== null && minha === outra;
}

/**
 * Por qual pessoa **do meu bloco** a coincidência acontece — ou `null` se não há coincidência.
 *
 * O cruzamento é de **conjunto contra conjunto**: o instrutor **ou** o fiscal do meu bloco aparecendo
 * como instrutor **ou** fiscal do outro. É o que a regra pede ao dizer *"o instrutor é o mesmo"* numa
 * grade em que a mesma pessoa fiscaliza avaliação e dá aula no mesmo dia.
 *
 * ⚠️ **O INSTRUTOR PREVALECE SOBRE O FISCAL quando as duas pessoas do meu bloco coincidem.** A célula
 * tem uma marca só, e quem responde pela aula é o instrutor: nomear o papel menor esconderia o maior.
 */
function coincidenciaDePessoa(
  meu: OcupacaoDeTa,
  outro: OcupacaoDeTa,
): "instrutor" | "fiscal" | null {
  const pessoasDoOutro = new Set<string>();
  if (outro.instrutorId !== null) pessoasDoOutro.add(outro.instrutorId);
  if (outro.fiscalId !== null) pessoasDoOutro.add(outro.fiscalId);
  if (pessoasDoOutro.size === 0) return null;

  if (meu.instrutorId !== null && pessoasDoOutro.has(meu.instrutorId)) return "instrutor";
  if (meu.fiscalId !== null && pessoasDoOutro.has(meu.fiscalId)) return "fiscal";
  return null;
}

/** Entre duas coincidências, a que a célula mostra: instrutor > fiscal > nenhuma. */
function marcaMaisForte(
  atual: "instrutor" | "fiscal" | null,
  nova: "instrutor" | "fiscal" | null,
): "instrutor" | "fiscal" | null {
  if (atual === "instrutor" || nova === "instrutor") return "instrutor";
  if (atual === "fiscal" || nova === "fiscal") return "fiscal";
  return null;
}

/**
 * As marcas da semana — chaveadas pelo `fatoId` do bloco **desta** turma.
 *
 * `meus` é a semana da turma sendo olhada; `alheios` é a ocupação **anônima** das outras turmas no
 * mesmo intervalo, como `public.conflitos_da_semana()` a entrega. O mapa traz **só** os blocos com
 * algo a sinalizar (ver o cabeçalho).
 *
 * ⚠️ **A COMPARAÇÃO ENTRE OS MEUS PULA O PRÓPRIO BLOCO PELO `fatoId`, não pelo índice da lista.** O
 * mapa é chaveado por `fatoId`, então duas entradas com o mesmo `fatoId` são a **mesma** linha lida
 * duas vezes — e um bloco sobreposto a si mesmo marcaria conflito em toda a grade.
 */
export function detectarConflitos(
  meus: readonly OcupacaoPropria[],
  alheios: readonly OcupacaoDeTa[],
): ReadonlyMap<string, MarcaDeConflito> {
  const marcas = new Map<string, MarcaDeConflito>();

  for (const meu of meus) {
    if (!posiciona(meu)) continue;

    let conflito: "instrutor" | "fiscal" | null = null;
    let alertaSala = false;

    // As outras turmas — a metade que a `RN-CONF-01` acrescentou nesta revisão (critério 5).
    for (const outro of alheios) {
      if (!seSobrepoem(meu, outro)) continue;
      conflito = marcaMaisForte(conflito, coincidenciaDePessoa(meu, outro));
      if (mesmaSala(meu, outro)) alertaSala = true;
    }

    // A própria turma — só PESSOA. Sala entre os meus não é disputa de sala (ver o cabeçalho).
    for (const vizinho of meus) {
      if (vizinho.fatoId === meu.fatoId) continue;
      if (!seSobrepoem(meu, vizinho)) continue;
      conflito = marcaMaisForte(conflito, coincidenciaDePessoa(meu, vizinho));
    }

    if (conflito !== null || alertaSala) {
      marcas.set(meu.fatoId, { conflito, alertaSala });
    }
  }

  return marcas;
}

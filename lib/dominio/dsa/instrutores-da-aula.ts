/**
 * RD-1 — **na aula, só o habilitado** (Bloco 11, spec 026). Continua a `RN-INST-01`. **Risco: Alto.**
 *
 * > *"Na aula, a lista de instrutores traz só os HABILITADOS na disciplina; padrão é o designado para a turma; não
 * > habilitado não aparece nem é aceito pela Server Action."* — Bernardo Villas Boas, 26/10/2026
 * > (`docs/correcoes/regras-do-dsa-lancamento.md`, RD-1)
 *
 * > *"Um instrutor só pode ser escolhido para **ministrar** ou ser **responsável** por uma matéria se existir um vínculo
 * > de habilitação explícito entre ele e aquela matéria (…)"* — documento 04, `RN-INST-01`
 *
 * ⚠️ **SÓ FILTRA, NUNCA ORDENA.** A ordem da lista é a antiguidade (`RN-ANT-01`, Risco Alto), e ela tem dono único: o
 *    `SeletorInstrutor`. Reordenar aqui seria o segundo lugar onde a regra vive.
 * ⚠️ **HABILITAÇÃO É VÍNCULO ATIVO, DE INSTRUTOR ATIVO.** O vínculo inativo é histórico (`RN-INST-05`), e o instrutor
 *    inativo não atua — a leitura do DSA o tirava da lista por um filtro que não funcionava (o `status` não vinha na
 *    consulta; achado do Bloco 11).
 * ⚠️ **SÓ A AULA** (D-1): o aplicador da prova, o fiscal, a vista e a atividade seguem com a lista inteira — a `RN-INST-01`
 *    delimita o fiscal, e o aplicador sem habilitação só recebe aviso (D-AV-3).
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

/** Uma linha ativa de `instrutor_disciplina` — a habilitação. */
export type HabilitacaoAtiva = {
  readonly instrutorId: string;
  readonly disciplinaId: string;
};

/** Os instrutores habilitados (vínculo ativo) na disciplina. */
export function habilitadosNaDisciplina(
  habilitacoes: readonly HabilitacaoAtiva[],
  disciplinaId: string | null,
): ReadonlySet<string> {
  if (disciplinaId === null || disciplinaId === "") return new Set();
  return new Set(
    habilitacoes.filter((h) => h.disciplinaId === disciplinaId).map((h) => h.instrutorId),
  );
}

/**
 * A lista de *quem ministra* a aula: os instrutores recebidos (já os ativos) que são habilitados na disciplina. Sem
 * disciplina escolhida, vazia — a frase diz o que falta (`fraseDaListaDaAula`).
 */
export function instrutoresDaAula<T extends { readonly id: string }>(
  instrutores: readonly T[],
  habilitacoes: readonly HabilitacaoAtiva[],
  disciplinaId: string | null,
): readonly T[] {
  const habilitados = habilitadosNaDisciplina(habilitacoes, disciplinaId);
  return instrutores.filter((i) => habilitados.has(i.id));
}

/**
 * Quem a **sugestão** pode pôr na aula (D-3, D-5): os ids da lista da aula — ativo **e** habilitado. ⚠️ A habilitação
 * sozinha não basta: desativar o instrutor não toca o vínculo (`instrutor_disciplina` segue ativo), e o designado
 * inativo saía sugerido fora da lista, com o seletor sem valor válido e a recusa só no *Lançar*.
 */
export function idsDaListaDaAula(
  instrutores: readonly { readonly id: string }[],
  habilitacoes: readonly HabilitacaoAtiva[],
  disciplinaId: string | null,
): ReadonlySet<string> {
  return new Set(instrutoresDaAula(instrutores, habilitacoes, disciplinaId).map((i) => i.id));
}

/*
 * ── FR-006 (spec 029, Bloco 14, item 6 — `PEND-026-2`): a lista de instrutores VAZIA diz o motivo certo ──────────────
 *
 * > *"Sempre que uma funcionalidade depender de uma aba, coluna ou registro que ainda não existe (…), o sistema deve
 * > devolver um resultado vazio/neutro com aviso — nunca travar ou lançar um erro não tratado ao usuário final."*
 * > — documento 04, `RN-DEG-01`
 *
 * > *"O `SeletorInstrutor` exige de quem chama o motivo do vazio: «você não vê» (perfil sem `instrutores.ler`, frase do
 * > componente) ou «não há» com a frase do chamador — disciplina sem habilitado, ninguém atribuído, escolha a disciplina
 * > —, num único dono de frases em `lib/dominio/`."* — spec 029, FR-006.1
 *
 * ⚠️ **A PREMISSA DA PENDÊNCIA ESTAVA INVERTIDA**, medido na `main` `07d84c3`: o seletor tinha `motivoDoVazio = "sem-dado"`
 *    por padrão e nenhum chamador passava outro valor. *"O seu perfil não os alcança"* nunca aparecia; todo vazio dizia
 *    *"Nada cadastrado ainda"* — inclusive o que vem de FILTRO (a habilitação no TA fora do DSA, a atribuição no rateio
 *    por UE), com instrutor cadastrado e ativo no banco.
 * ⚠️ **AQUI MORAM SÓ AS FRASES DO «NÃO HÁ».** A do «você não vê» é do `SeletorInstrutor` (FR-006.1): quem não tem
 *    `instrutores.ler` recebe a lista vazia da RLS — que é tudo ou nada por perfil —, e o motivo é um só, seja qual for o
 *    filtro que viria depois. Por isso `vazioDaListaDeInstrutores` decide a PRECEDÊNCIA: sem permissão, nenhuma frase de
 *    filtro (escolher a disciplina não encheria a lista).
 * ⚠️ **DOIS MOTIVOS A MAIS QUE OS TRÊS DO PEDIDO**, e os dois são o mesmo *"dizer o motivo certo"*: `sem-cadastro` (fora
 *    da aula, a lista do DSA é o cadastro ativo inteiro, e vazia com permissão é ela vazia) e `sem-leitura` (a falha de
 *    leitura dos habilitados da ficha da turma, D-16 — até ali ela virava lista vazia e a tela dizia *"Nenhum instrutor
 *    habilitado"*, o erro descartado inventando outra causa).
 */

/** Por que a lista de instrutores chegou vazia, do lado do «não há» — o «você não vê» não é motivo daqui. */
export type MotivoDaListaVazia =
  | "sem-disciplina"
  | "sem-habilitado"
  | "sem-atribuido"
  | "sem-cadastro"
  | "sem-leitura"
  | "sem-outro-habilitado";

const FRASE_DA_LISTA_VAZIA: Readonly<Record<MotivoDaListaVazia, string>> = {
  "sem-disciplina": "Escolha a disciplina.",
  "sem-habilitado":
    "Nenhum instrutor habilitado nesta disciplina. A habilitação é feita na ficha do instrutor.",
  "sem-atribuido":
    "Nenhum instrutor atribuído nesta turma: acrescente um instrutor acima para dividir pelas unidades de ensino.",
  "sem-cadastro": "Nenhum instrutor ativo no cadastro.",
  "sem-leitura":
    "A lista de instrutores não pôde ser lida agora. Recarregue a página; se continuar, avise o suporte.",
  /* Bloco 16 (RD-9): a lista dos ADICIONAIS — a da aula, sem quem ministra e sem os já escolhidos. */
  "sem-outro-habilitado":
    "Nenhum outro instrutor habilitado nesta disciplina. A habilitação é feita na ficha do instrutor.",
};

/**
 * A frase da lista vazia por motivo (`RN-DEG-01`: nunca campo mudo) — o dono único. O caminho clicável até *Instrutores*
 * é da tela (a `acao` do seletor, o vínculo do painel); o texto mora aqui.
 */
export function fraseDaListaDeInstrutoresVazia(motivo: MotivoDaListaVazia): string {
  return FRASE_DA_LISTA_VAZIA[motivo];
}

/** O que o `SeletorInstrutor` recebe em `vazio` — o mesmo desenho, sem a `acao`, que é da tela. */
export type VazioDaListaDeInstrutores =
  { readonly motivo: "sem-permissao" } | { readonly motivo: "sem-dado"; readonly detalhe: string };

/**
 * O vazio da lista de instrutores, com a precedência decidida num lugar só: **sem `instrutores.ler`, «você não vê»**
 * (a frase é do componente); com ela, o «não há» do motivo do chamador. Quem chama decide `podeLerInstrutores` no
 * servidor, por `pode(permissoes, "instrutores", "ler")` — o mesmo predicado da RLS de `instrutores` e de
 * `instrutor_disciplina`.
 */
export function vazioDaListaDeInstrutores(
  podeLerInstrutores: boolean,
  motivo: MotivoDaListaVazia,
): VazioDaListaDeInstrutores {
  return podeLerInstrutores
    ? { motivo: "sem-dado", detalhe: fraseDaListaDeInstrutoresVazia(motivo) }
    : { motivo: "sem-permissao" };
}

/**
 * A frase da lista da AULA (D-32 da spec 026): *escolha a disciplina* ou *nenhum habilitado* — delega ao dono único, com
 * o mesmo texto de antes. `null` com a lista cheia.
 */
export function fraseDaListaDaAula(
  disciplinaId: string | null,
  lista: readonly unknown[],
): string | null {
  if (disciplinaId === null || disciplinaId === "") {
    return fraseDaListaDeInstrutoresVazia("sem-disciplina");
  }
  if (lista.length === 0) return fraseDaListaDeInstrutoresVazia("sem-habilitado");
  return null;
}

/** Quem ministra e o que se ministra numa aula: o par que a RD-1 confere. */
export type ParDaAula = {
  readonly instrutorId: string | null;
  readonly disciplinaId: string | null;
  readonly unidadeEnsinoId: string | null;
};

/**
 * O par que vale **depois** de uma edição pelo id de um SALVO (RD-1, D-4; revisão do Bloco 11): com rascunho de edição
 * por cima, `gravar_rascunho_do_dsa` grava **na sombra**, então o par pendente é o dela. A sombra de **exclusão** não
 * conta (a linha sai), e sem sombra vale o próprio salvo. Conferir pelo salvo deixava duas edições seguidas — o instrutor
 * numa, a UE na outra — gravarem um par não habilitado sem recusa.
 */
export function parPendenteDaAula(
  salvo: ParDaAula,
  sombra: (ParDaAula & { readonly rascunhoExclui: boolean }) | null,
): ParDaAula {
  if (sombra === null || sombra.rascunhoExclui) return salvo;
  return {
    instrutorId: sombra.instrutorId,
    disciplinaId: sombra.disciplinaId,
    unidadeEnsinoId: sombra.unidadeEnsinoId,
  };
}

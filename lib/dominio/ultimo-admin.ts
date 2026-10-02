/**
 * `FR-041` a `FR-043` · o que o Admin **não** pode fazer com a própria conta, e o chão de um Admin
 * ativo.
 *
 * > **`FR-041`**: *"O Admin MUST NOT poder **excluir, desativar nem rebaixar a si mesmo**; a ação
 * > MUST NOT aparecer na tela."*
 * > **`FR-042`**: *"O sistema MUST manter **pelo menos um Admin ativo**; a tentativa de deixar zero
 * > MUST ser recusada."*
 * > **`FR-043`**: *"A regra do último Admin MUST existir em **função pura**, além da que já existe no
 * > banco."*
 *
 * ⚠️ **ISTO NÃO SUBSTITUI O GATILHO DO BANCO, E A ORDEM IMPORTA.**
 * `app.impedir_remocao_do_ultimo_admin()` é a **garantia** — ela vale para quem chamar por `curl`,
 * por `psql` ou por script. Esta função existe para a tela **não oferecer** uma ação que vai ser
 * recusada, que é a diferença entre um sistema que explica e um que castiga quem clicou.
 *
 * ⚠️ **E ELA NASCE PORQUE A REGRA ESTAVA AFIRMADA DUAS VEZES E IMPLEMENTADA ZERO** —
 * `estado-atual.md` §3.1 registra as duas afirmações de que a regra vivia no código, e a varredura
 * não achou função nenhuma. O gatilho existia; o código, não.
 *
 * ⚠️ **O "REBAIXAR" É O CASO QUE A CONTAGEM SOZINHA NÃO PEGA.** Desativar e excluir tiram o Admin da
 * lista; **rebaixar também** — trocar o perfil de `admin` para qualquer outro deixa a mesma conta
 * ativa e o sistema sem Admin. Uma regra escrita só sobre `status` passaria por aí.
 */

/** Uma conta com perfil Admin e situação ativa, como o banco a devolve. */
export type AdminAtivo = {
  readonly id: string;
};

/** O que se quer fazer com a conta alvo. */
export type AcaoSobreAdmin = "rebaixar" | "desativar" | "excluir";

export type VeredictoDoUltimoAdmin =
  { readonly permitido: true } | { readonly permitido: false; readonly motivo: string };

const PERMITIDO: VeredictoDoUltimoAdmin = { permitido: true };

const VERBO: Record<AcaoSobreAdmin, string> = {
  rebaixar: "trocar o perfil",
  desativar: "desativar",
  excluir: "excluir",
};

/**
 * Pode fazer `acao` com `contaAlvoId`, dado o conjunto de Admins **ativos**?
 *
 * ⚠️ **A LISTA É DE ADMINS ATIVOS, E É QUEM A CHAMA QUE A BUSCA.** Esta função não conhece banco
 * (regra 9) — e receber a lista, em vez de uma contagem, é o que permite responder *"você é o
 * último"* em vez de *"não deu"*.
 *
 * ⚠️ **A CONTA ALVO PODE NÃO SER ADMIN, e aí não há nada a proteger**: rebaixar quem já não é Admin,
 * ou desativar um Operador, não mexe no chão da `FR-042`. Devolver `permitido` nesse caso não é
 * frouxidão — é a regra dizendo que ela não se aplica.
 */
export function podeMexerNoAdmin(
  acao: AcaoSobreAdmin,
  contaAlvoId: string,
  adminsAtivos: readonly AdminAtivo[],
): VeredictoDoUltimoAdmin {
  const alvoEhAdminAtivo = adminsAtivos.some((a) => a.id === contaAlvoId);
  if (!alvoEhAdminAtivo) return PERMITIDO;

  if (adminsAtivos.length > 1) return PERMITIDO;

  return {
    permitido: false,
    motivo:
      `Não é possível ${VERBO[acao]} desta conta: ela é o último Administrador ativo, e o ` +
      `sistema precisa de pelo menos um. Promova outra conta a Administrador antes.`,
  };
}

/**
 * A própria conta é intocável pelas três ações (`FR-041`), e isso **não** depende de quantos Admins
 * existem.
 *
 * ⚠️ **SÃO DUAS REGRAS DIFERENTES, E CONFUNDI-LAS ABRE UM BURACO.** Com dois Admins, a contagem da
 * `FR-042` libera — e a `FR-041` continua proibindo que o Admin rebaixe **a si mesmo**. Quem
 * quisesse se despromover por engano passaria por `podeMexerNoAdmin` sem ser barrado.
 */
export function podeMexerNaPropriaConta(
  acao: AcaoSobreAdmin,
  contaAlvoId: string,
  minhaContaId: string,
): VeredictoDoUltimoAdmin {
  if (contaAlvoId !== minhaContaId) return PERMITIDO;

  return {
    permitido: false,
    motivo:
      `Não é possível ${VERBO[acao]} da sua própria conta. Pedir a outro Administrador evita ` +
      `que alguém se tranque fora do sistema sem perceber.`,
  };
}

/**
 * O veredito que a tela usa: as **duas** regras, na ordem em que fazem sentido para quem lê.
 *
 * ⚠️ **A PRÓPRIA CONTA VEM PRIMEIRO de propósito.** Um Admin único tentando se rebaixar viola as
 * duas, e *"não mexa na sua própria conta"* é a frase acionável — *"você é o último Admin"* o
 * mandaria promover alguém para fazer algo que ele continuaria não podendo fazer.
 */
export function vereditoSobreConta(
  acao: AcaoSobreAdmin,
  contaAlvoId: string,
  minhaContaId: string,
  adminsAtivos: readonly AdminAtivo[],
): VeredictoDoUltimoAdmin {
  const propria = podeMexerNaPropriaConta(acao, contaAlvoId, minhaContaId);
  if (!propria.permitido) return propria;
  return podeMexerNoAdmin(acao, contaAlvoId, adminsAtivos);
}

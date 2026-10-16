/**
 * `RN-RESP-1` — quem pode ser o responsável de cada lançamento (emenda de 15/10/2026 à spec 014).
 *
 * > *"RN-RESP-1: aula de disciplina (técnica EO ou prática de disciplina) exige instrutor habilitado. Palestra, AEC,
 * > estudo individual, monitoria, orientação/Apoio Individualizado aceitam responsável de nome livre, sem cadastro e
 * > sem alerta. Aplicador de prova = instrutor habilitado; fiscal e quem conduz a vista = instrutor OU nome livre. O
 * > formulário do DSA e o lançamento em tela oferecem "outro responsável (nome livre)" nesses casos. A sincronização
 * > aplica a mesma regra: texto que não casa com o cadastro só vira pendência se a linha for aula de disciplina com
 * > EO."* — Bernardo Villas Boas, 15/10/2026
 *
 * ⚠️ **A HABILITAÇÃO NÃO É DECIDIDA AQUI.** Ela sai de `EXIGE_HABILITACAO` e `AVISA_SEM_HABILITACAO`
 *    (`habilitacao.ts`, `RN-INST-01` do documento 04): este módulo só diz QUAL atuação cada papel é. Duas tabelas de
 *    "quem exige habilitação" divergiriam no dia em que uma mudasse.
 * ⚠️ **O APLICADOR É «AVISO», NÃO «EXIGE»** (D-AV-3 de 13/10/2026, `RN-DEG-02` e a regra 6 do `CLAUDE.md`): a emenda
 *    diz *"aplicador de prova = instrutor habilitado"*, e o que a tela faz hoje é gravar com aviso quando ele não está
 *    habilitado. Virar recusa é decisão de Bernardo (interpretação a confirmar, `aprovacoes-pendentes.md`). O que
 *    muda já: o aplicador é OBRIGATÓRIO e do cadastro — nunca nome livre.
 * ⚠️ **O FISCAL NÃO É ATUAÇÃO DE INSTRUTOR** (`RN-INST-01`: *"esta validação não se aplica ao papel de fiscal de
 *    avaliação, que pode ser exercido por qualquer pessoa, inclusive alguém não cadastrado como instrutor"*).
 * ⚠️ **TODA ATIVIDADE ACEITA NOME LIVRE, TAD E TR INCLUSIVE.** A emenda nomeia palestra, AEC, estudo individual,
 *    monitoria e orientação/Apoio Individualizado; TAD e TR já tinham o campo livre na tela (status quo), e a frase da
 *    sincronização (*"só vira pendência se for aula de disciplina com EO"*) também as libera. O `Record` sobre a
 *    categoria obriga a decidir cada categoria nova — ela não compila sem decisão.
 * ⚠️ TypeScript puro: sem `next`, sem `react`, sem `supabase` (Princípio II).
 */
import type { CategoriaDeAtividade } from "@/lib/dominio/categoria-pelo-tipo";
import { AVISA_SEM_HABILITACAO, EXIGE_HABILITACAO, type Atuacao } from "@/lib/dominio/habilitacao";

/** O rótulo ÚNICO do campo livre — formulário do DSA e cartão de edição usam este texto, nunca outro. */
export const ROTULO_NOME_LIVRE = "Outro responsável (nome livre)";

/** O lançamento, do ponto de vista de quem responde por ele. */
export type LancamentoDoResponsavel =
  | { readonly tipo: "aula" }
  | { readonly tipo: "avaliacao"; readonly papel: "aplicador" | "fiscal" }
  /** Quem CONDUZ a sessão de vista. */
  | { readonly tipo: "vista" }
  /**
   * A categoria NORMATIVA da atividade. Desconhecida (o cartão de edição não a lê), vale o que TODAS as categorias
   * dizem em comum — hoje, nome livre aceito em todas.
   */
  | { readonly tipo: "atividade"; readonly categoria: CategoriaDeAtividade | null };

export type RegraDoResponsavel = {
  /** O instrutor do cadastro é obrigatório ou opcional neste papel. */
  readonly instrutorDoCadastro: "obrigatorio" | "opcional";
  /** O papel aceita "outro responsável (nome livre)", sem cadastro e sem alerta. */
  readonly nomeLivre: boolean;
  /** `exige` = recusa sem habilitação; `aviso` = grava e avisa (D-AV-3); `nao` = não confere. */
  readonly habilitacao: "exige" | "aviso" | "nao";
};

/** A atuação de instrutor de cada papel — `null` quando o papel não é atuação de instrutor (fiscal, atividade). */
function atuacaoDo(lancamento: LancamentoDoResponsavel): Atuacao | null {
  switch (lancamento.tipo) {
    case "aula":
      return "ministrar";
    case "avaliacao":
      return lancamento.papel === "aplicador" ? "avaliacao" : null;
    case "vista":
      return "vista_de_prova";
    case "atividade":
      return null;
  }
}

/** Cada categoria de atividade decidida (RN-RESP-1): nome livre aceito, cadastro opcional. */
const NOME_LIVRE_NA_ATIVIDADE: Readonly<Record<CategoriaDeAtividade, boolean>> = {
  AEC: true,
  TAD: true,
  TR: true,
  Estudo_Individual: true,
  Apoio_Individualizado: true,
};

export function regraDoResponsavel(lancamento: LancamentoDoResponsavel): RegraDoResponsavel {
  const atuacao = atuacaoDo(lancamento);
  const habilitacao: RegraDoResponsavel["habilitacao"] =
    atuacao === null
      ? "nao"
      : EXIGE_HABILITACAO[atuacao]
        ? "exige"
        : AVISA_SEM_HABILITACAO[atuacao]
          ? "aviso"
          : "nao";
  /* Aula e aplicador: o cadastro é obrigatório, e nunca nome livre — são os dois papéis docentes da emenda. */
  const docente =
    lancamento.tipo === "aula" ||
    (lancamento.tipo === "avaliacao" && lancamento.papel === "aplicador");
  const nomeLivre = docente
    ? false
    : lancamento.tipo === "atividade"
      ? lancamento.categoria === null
        ? Object.values(NOME_LIVRE_NA_ATIVIDADE).every(Boolean)
        : NOME_LIVRE_NA_ATIVIDADE[lancamento.categoria]
      : true;
  return {
    instrutorDoCadastro: docente ? "obrigatorio" : "opcional",
    nomeLivre,
    habilitacao,
  };
}

/** A frase da recusa — uma só, na ação de lançar e na de editar. */
export const FRASE_SEM_NOME_LIVRE =
  "Este lançamento não aceita outro responsável (nome livre): escolha um instrutor do cadastro.";

/**
 * O nome livre mandado num papel que NÃO o aceita (`RN-RESP-1`) vira recusa — no SERVIDOR, e não só na tela.
 *
 * ⚠️ **A TELA NÃO É A DEFESA**: a Server Action é endpoint HTTP de fato, e a regra de negócio implementada apenas na
 *    UI é proibida (BRIEF §2). O formulário só MOSTRA o campo onde `regraDoResponsavel` o aceita; esta função é o que
 *    a ação confere, sobre a MESMA regra.
 * ⚠️ **RECEBE A REGRA, NÃO O LANÇAMENTO**: a ação compõe `recusaDoNomeLivre(regraDoResponsavel(…), nome)`. Hoje toda
 *    categoria de atividade aceita nome livre, e o caso «categoria que recusa» só se prova com uma regra que diga
 *    `nomeLivre: false` — a de aula, a do aplicador, ou uma escrita no teste.
 * ⚠️ Vazio ou só espaço não é nome: não recusa (o esquema já o transforma em nulo).
 */
export function recusaDoNomeLivre(
  regra: Pick<RegraDoResponsavel, "nomeLivre">,
  responsavelExterno: string | null | undefined,
): string | null {
  if (responsavelExterno == null || responsavelExterno.trim() === "") return null;
  return regra.nomeLivre ? null : FRASE_SEM_NOME_LIVRE;
}

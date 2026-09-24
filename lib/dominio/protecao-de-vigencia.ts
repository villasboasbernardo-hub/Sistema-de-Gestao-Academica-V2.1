/**
 * `FR-021.8` — quais vigências **deixam de estar protegidas** quando a janela ou o curso da turma
 * muda.
 *
 * > *"**Saída:** as vigências que **perdem** a proteção — travadas **só** por atividade global que,
 * > com a mudança, **nenhuma** turma do curso alcança mais. Vigência com lançamento próprio, ou ainda
 * > alcançada por outra turma, **não** entra. […] **Mudar o curso** da turma avalia o curso **de
 * > origem** — é dele que a turma sai."*
 * > — contrato de escritas §3, spec 009
 *
 * ⚠️ **A DECISÃO É DE `lib/dominio/` PORQUE A JANELA NOVA SÓ EXISTE NO FORMULÁRIO.** O banco sabe o
 * que trava cada vigência **hoje**; o que a pessoa está digitando ainda não foi gravado. A RPC entrega
 * o retrato, e esta função responde "e se".
 *
 * ⚠️ **TRAVADA POR LANÇAMENTO PRÓPRIO NUNCA ENTRA.** Encurtar a janela não a desprotege: o lançamento
 * continua lá. Avisar sobre ela seria avisar sobre o que não vai acontecer, e aviso que erra treina a
 * pessoa a ignorar o quadro (`RN-DEG-02`).
 *
 * ⚠️ **AINDA ALCANÇADA POR OUTRA TURMA TAMBÉM NÃO ENTRA.** A proteção é do conjunto: basta uma turma
 * do curso cobrir a data da atividade para a vigência seguir travada.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

/** Uma linha de `protecao_das_vigencias_por_atividade_global`, como a página a recebe. */
export type VigenciaProtegida = {
  readonly vigencia: string;
  readonly vigenteDe: string;
  /** Quando `true`, encurtar a janela **não** a desprotege. */
  readonly travadaPorLancamentoProprio: boolean;
  readonly atividade: string;
  readonly dataAtividade: string;
};

/** A janela de uma turma do curso. Ponta ausente é ponta aberta. */
export type JanelaDeTurma = {
  readonly codigo: string;
  readonly dataInicio: string | null;
  readonly dataTermino: string | null;
};

export type MudancaDaTurma = {
  /** A turma que está sendo criada ou editada. */
  readonly codigo: string;
  readonly janelaNova: { readonly dataInicio: string | null; readonly dataTermino: string | null };
  /** `true` quando a edição está movendo a turma para **outro** curso. */
  readonly saiDoCurso?: boolean;
};

/** A janela alcança a data? Ponta ausente é ponta aberta — a mesma leitura do banco. */
function alcanca(janela: JanelaDeTurma | MudancaDaTurma["janelaNova"], data: string): boolean {
  if (janela.dataInicio === null && janela.dataTermino === null) return false;
  if (janela.dataInicio !== null && janela.dataInicio > data) return false;
  if (janela.dataTermino !== null && janela.dataTermino < data) return false;
  return true;
}

/**
 * As vigências que a mudança desprotege.
 *
 * ⚠️ **AS JANELAS ATUAIS SÃO AS DO CURSO DE ORIGEM.** Quando a turma muda de curso, ela sai do
 * conjunto que protege — e é por isso que `saiDoCurso` a remove em vez de aplicar a janela nova.
 */
export function vigenciasQuePerdemProtecao(
  protegidas: readonly VigenciaProtegida[],
  janelasAtuais: readonly JanelaDeTurma[],
  mudanca: MudancaDaTurma,
): readonly VigenciaProtegida[] {
  /*
   * O conjunto de janelas **depois** da gravação: a turma editada entra com a janela nova, ou sai de
   * cena quando muda de curso. Turma nova (ainda sem linha em `janelasAtuais`) entra por acréscimo.
   */
  const depois: JanelaDeTurma[] = janelasAtuais
    .filter((j) => j.codigo !== mudanca.codigo)
    .map((j) => ({ ...j }));

  if (mudanca.saiDoCurso !== true) {
    depois.push({
      codigo: mudanca.codigo,
      dataInicio: mudanca.janelaNova.dataInicio,
      dataTermino: mudanca.janelaNova.dataTermino,
    });
  }

  return protegidas.filter((p) => {
    if (p.travadaPorLancamentoProprio) return false;
    return !depois.some((j) => alcanca(j, p.dataAtividade));
  });
}

/**
 * A frase do diálogo de salvar (`FR-021.8`). Uma linha por vigência; nenhuma afetada, nenhum aviso.
 *
 * ⚠️ **ELA DIZ O QUE PASSA A SER POSSÍVEL, e não o que está proibido.** A gravação acontece de
 * qualquer forma: o teto é alerta, nunca bloqueio.
 */
export function mensagemDaProtecaoPerdida(perdidas: readonly VigenciaProtegida[]): string | null {
  const linhas = linhasDaProtecaoPerdida(perdidas);
  if (linhas.length === 0) return null;
  return (
    `Com esta janela, deixam de estar protegidas: ${linhas.join("; ")}. ` +
    `Elas poderão ser corrigidas.`
  );
}

/**
 * **Uma linha por vigência, sem o envoltório da frase** — é isto que o diálogo do `FR-018.1` recebe.
 *
 * ⚠️ **ELA EXISTE PORQUE O ENVOLTÓRIO TEM UM DONO SÓ.** `confirmacao-de-gravacao.ts` já escreve
 * *"Com esta janela, deixam de estar protegidas: … Elas poderão ser corrigidas."* em volta do que
 * recebe; passar-lhe a frase pronta de `mensagemDaProtecaoPerdida` produzia o texto **duas vezes**,
 * aninhado — medido no percurso de encurtar janela em 23/09/2026. Quem monta a frase inteira é o
 * quadro; quem monta o diálogo é o diálogo, e os dois leem as mesmas linhas daqui.
 */
export function linhasDaProtecaoPerdida(perdidas: readonly VigenciaProtegida[]): readonly string[] {
  return perdidas.map(
    (p) =>
      `vigência de ${p.vigenteDe} (${p.vigencia}) — travada pela atividade ${p.atividade} de ${p.dataAtividade}`,
  );
}

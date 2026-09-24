/**
 * `FR-010` — os avisos de qualidade de cadastro do curso.
 *
 * > *"Cada tipo é **função pura** com teste Vitest, com o identificador e a citação no topo
 * > (`FR-043`). **Nenhum** bloqueia gravação (`RN-DEG-02`). Tipo com contagem zero não aparece; sem
 * > aviso nenhum, o quadro diz isso (`FR-010`)."*
 * > — contrato de escritas §3, spec 009
 *
 * ⚠️ **A LISTA É ABERTA** — ao contrário da lista fechada do `FR-018.1`. Aviso novo é decisão barata:
 * ele informa e some quando o cadastro melhora. Confirmação nova é decisão cara, porque treina a
 * pessoa a clicar sem ler.
 *
 * ⚠️ **NENHUM DELES BLOQUEIA NADA.** São a leitura do cadastro como ele está, e o `RN-DEG-02` é
 * explícito: teto normativo vira alerta, nunca `CHECK`.
 *
 * ⚠️ **QUEM CONTA O LIMITE É `limite-de-turmas.ts`.** Este módulo não reimplementa a contagem — duas
 * respostas para "passou do limite?" divergiriam entre o quadro e o diálogo de salvar.
 *
 * Retrato da base, medido em 16/09/2026: `sem_duracao_semanas` **12**, `sem_proposito` **10**,
 * `acima_do_limite` **0**.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import { anosAcimaDoLimite, mensagemDoQuadro, type TurmaParaLimite } from "./limite-de-turmas";

/** O que o curso precisa trazer para a leitura. */
export type CursoParaAvisos = {
  readonly duracaoSemanas: number | null;
  readonly proposito: string | null;
  readonly limiteTurmasAno: number | null;
};

export type AvisoDoCurso = {
  readonly chave: string;
  readonly titulo: string;
  /** O dado que torna o aviso acionável — por ora, só o ano acima do limite. */
  readonly detalhe?: string;
};

const vazio = (texto: string | null): boolean => texto === null || texto.trim() === "";

/**
 * Os avisos que **de fato ocorrem** neste curso, na ordem do contrato §3.
 *
 * ⚠️ **TIPO COM ZERO NÃO ENTRA NA LISTA.** É a diferença entre o quadro do curso e o da listagem de
 * instrutores, que devolve todas as regras: aqui o sujeito é **um** curso, e "sem propósito: 0" não
 * é informação, é ruído.
 */
export function avisosDoCurso(
  curso: CursoParaAvisos,
  turmas: readonly TurmaParaLimite[],
): readonly AvisoDoCurso[] {
  const avisos: AvisoDoCurso[] = [];

  if (curso.duracaoSemanas === null) {
    avisos.push({
      chave: "sem_duracao_semanas",
      titulo: "Duração em semanas não informada",
    });
  }

  /*
   * ⚠️ SÓ ESPAÇOS CONTA COMO VAZIO. Um propósito com três espaços parece preenchido em toda
   * listagem e não diz nada a ninguém — e é o caso que o contrato §3 nomeia.
   */
  if (vazio(curso.proposito)) {
    avisos.push({ chave: "sem_proposito", titulo: "Propósito do curso não informado" });
  }

  for (const ano of anosAcimaDoLimite(turmas, curso.limiteTurmasAno)) {
    avisos.push({
      chave: "acima_do_limite",
      titulo: "Turmas acima do limite do ano",
      detalhe: mensagemDoQuadro(ano),
    });
  }

  return avisos;
}

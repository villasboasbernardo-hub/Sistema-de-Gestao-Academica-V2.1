/**
 * O submenu da lateral — spec 019 (Bloco 4), C-12 a C-15; pedido de Bernardo Villas Boas de 20/10/2026: *"Cursos →
 * classificação → curso (abre a página do curso) e Turmas → curso → turma (abre a ficha da turma), expandindo dentro
 * da própria lateral, com o item ativo marcado (…). Turmas arquivadas fora."*
 *
 * ⚠️ **AJUSTE A-5 DA CONFERÊNCIA DE 20/10/2026** (Bernardo Villas Boas): *"SUBMENU DE TURMAS na lateral: sem o nível do
 *    curso — lista direto as turmas do ANO VIGENTE (mesma regra de padrão do item 1), não arquivadas, em ordem natural
 *    (ex.: CAHO 2026, C-Ap-FR 2026, C-Ap-HN 2026 …). O submenu de Cursos continua como está."* Turmas deixou de ser
 *    árvore: é uma LISTA, e o ano chega por parâmetro — quem o tira do relógio é quem chama (`anoDoPainel`), e um ano
 *    escrito aqui seria o erro que o ajuste proíbe.
 *
 * ⚠️ **O ENDEREÇO CHEGA POR PARÂMETRO**: montar `/turmas/…` fora de `lib/navegacao/endereco-de-turma.ts` é proibido
 *    por guarda (`FR-031.2`), e o ramo ativo compara o caminho com as rotas que a árvore já tem — sem literal nenhum.
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.**
 */
import { compararCodigoDeTurma } from "@/lib/dominio/ordem-natural";
import {
  CLASSIFICACOES_DE_CURSO,
  ROTULO_DA_CLASSIFICACAO,
  ehClassificacaoDeCurso,
} from "@/lib/dominio/classificacoes-de-curso";

export type ItemDoSubmenu = {
  readonly rota: string;
  readonly rotulo: string;
  /** O texto inteiro, para o `title` (o nome do curso). */
  readonly titulo?: string;
};

export type GrupoDoSubmenu = {
  /** A classificação do curso. */
  readonly chave: string;
  readonly rotulo: string;
  readonly itens: readonly ItemDoSubmenu[];
};

export type CursoDoSubmenu = {
  readonly id: string;
  readonly codigo: string;
  readonly nome: string;
  readonly classificacao: string;
};

export type TurmaDoSubmenu = {
  readonly codigo: string;
  readonly ano: number;
  readonly arquivada: boolean;
};

const natural = (a: string, b: string) => a.localeCompare(b, "pt-BR", { numeric: true });

/** Cursos → classificação → curso, na ordem do catálogo, só as classificações com curso (C-14). */
export function arvoreDeCursos(
  cursos: readonly CursoDoSubmenu[],
  enderecoDoCurso: (sigla: string) => string,
): readonly GrupoDoSubmenu[] {
  return CLASSIFICACOES_DE_CURSO.map((c) => ({
    chave: c,
    rotulo: ROTULO_DA_CLASSIFICACAO[c],
    itens: cursos
      .filter((k) => ehClassificacaoDeCurso(k.classificacao) && k.classificacao === c)
      .sort((a, b) => natural(a.codigo, b.codigo))
      .map((k) => ({ rota: enderecoDoCurso(k.codigo), rotulo: k.codigo, titulo: k.nome })),
  })).filter((g) => g.itens.length > 0);
}

/** Turmas → turma: as do ano, sem as arquivadas, pelo código, em ordem natural sem os hífens (A-5). */
export function arvoreDeTurmas(
  turmas: readonly TurmaDoSubmenu[],
  ano: number,
  enderecoDaTurma: (codigo: string) => string,
): readonly ItemDoSubmenu[] {
  return turmas
    .filter((t) => !t.arquivada && t.ano === ano)
    .sort((a, b) => compararCodigoDeTurma(a.codigo, b.codigo))
    .map((t) => ({ rota: enderecoDaTurma(t.codigo), rotulo: t.codigo }));
}

/** O caminho está na rota, ou abaixo dela, por segmento (`/turmas/X/dsa` está em `/turmas/X`; `/turmas/XY`, não). */
function dentro(caminho: string, rota: string): boolean {
  return caminho === rota || caminho.startsWith(`${rota}/`);
}

/**
 * O ramo da página atual: o que abre sozinho e qual subentrada é a ativa (C-12, C-15).
 *
 * ⚠️ **NAS LISTAS, NADA**: `/cursos` e `/turmas` acendem a entrada do menu, não uma subentrada.
 * ⚠️ **TURMA DE OUTRO ANO NÃO ACENDE NADA** (A-5): ela não está na lista do ano vigente.
 */
export function ramoDoCaminho(
  caminho: string,
  arvores: {
    readonly cursos: readonly GrupoDoSubmenu[];
    readonly turmas: readonly ItemDoSubmenu[];
  },
): { readonly abertos: readonly string[]; readonly ativo: string | null } {
  for (const grupo of arvores.cursos) {
    const item = grupo.itens.find((i) => dentro(caminho, i.rota));
    if (item) return { abertos: ["cursos", `cursos:${grupo.chave}`], ativo: item.rota };
  }
  const turma = arvores.turmas.find((i) => dentro(caminho, i.rota));
  if (turma) return { abertos: ["turmas"], ativo: turma.rota };
  return { abertos: [], ativo: null };
}

/**
 * O submenu da lateral — spec 019 (Bloco 4), C-12 a C-15; pedido de Bernardo Villas Boas de 20/10/2026: *"Cursos →
 * classificação → curso (abre a página do curso) e Turmas → curso → turma (abre a ficha da turma), expandindo dentro
 * da própria lateral, com o item ativo marcado (…). Turmas arquivadas fora."*
 *
 * ⚠️ **O ENDEREÇO CHEGA POR PARÂMETRO**: montar `/turmas/…` fora de `lib/navegacao/endereco-de-turma.ts` é proibido
 *    por guarda (`FR-031.2`), e o ramo ativo compara o caminho com as rotas que a árvore já tem — sem literal nenhum.
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.**
 */
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
  /** A classificação (em Cursos) ou o id do curso (em Turmas). */
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
  readonly rotulo: string | null;
  readonly ano: number;
  readonly cursoId: string;
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

/** Turmas → curso → turma, sem as arquivadas, as mais novas primeiro, pelo rótulo e o ano (C-14). */
export function arvoreDeTurmas(
  turmas: readonly TurmaDoSubmenu[],
  cursos: readonly CursoDoSubmenu[],
  enderecoDaTurma: (codigo: string) => string,
): readonly GrupoDoSubmenu[] {
  const vivas = turmas.filter((t) => !t.arquivada);
  return [...cursos]
    .sort((a, b) => natural(a.codigo, b.codigo))
    .map((c) => ({
      chave: c.id,
      rotulo: c.codigo,
      itens: vivas
        .filter((t) => t.cursoId === c.id)
        .sort((a, b) => b.ano - a.ano || natural(a.rotulo ?? "", b.rotulo ?? ""))
        .map((t) => ({
          rota: enderecoDaTurma(t.codigo),
          rotulo: t.rotulo ? `${t.rotulo} ${t.ano}` : `${t.ano}`,
          titulo: t.codigo,
        })),
    }))
    .filter((g) => g.itens.length > 0);
}

/** O caminho está na rota, ou abaixo dela, por segmento (`/turmas/X/dsa` está em `/turmas/X`; `/turmas/XY`, não). */
function dentro(caminho: string, rota: string): boolean {
  return caminho === rota || caminho.startsWith(`${rota}/`);
}

/**
 * O ramo da página atual: o que abre sozinho e qual subentrada é a ativa (C-12, C-15).
 *
 * ⚠️ **NAS LISTAS, NADA**: `/cursos` e `/turmas` acendem a entrada do menu, não uma subentrada.
 */
export function ramoDoCaminho(
  caminho: string,
  arvores: {
    readonly cursos: readonly GrupoDoSubmenu[];
    readonly turmas: readonly GrupoDoSubmenu[];
  },
): { readonly abertos: readonly string[]; readonly ativo: string | null } {
  for (const [raiz, grupos] of [
    ["cursos", arvores.cursos],
    ["turmas", arvores.turmas],
  ] as const) {
    for (const grupo of grupos) {
      const item = grupo.itens.find((i) => dentro(caminho, i.rota));
      if (item) return { abertos: [raiz, `${raiz}:${grupo.chave}`], ativo: item.rota };
    }
  }
  return { abertos: [], ativo: null };
}

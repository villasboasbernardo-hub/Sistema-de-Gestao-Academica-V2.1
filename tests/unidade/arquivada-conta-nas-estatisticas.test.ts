/**
 * RT-8 (spec 029, Bloco 14, `FR-007.4`) — **as telas de Instrutores, a ficha do instrutor e a contagem de turmas por
 * currículo da página do curso NÃO tiram a turma arquivada antes da conta.**
 *
 * > *"Arquivar esconde a turma das listas do dia a dia (...), mas ela CONTINUA contando nas estatísticas e nos cartões
 * > do ano dela, com a situação que tinha."* — Bernardo Villas Boas, 28/10/2026 (RT-8)
 *
 * ⚠️ **É A METADE DA TELA; a do banco é `tests/invariantes/arquivada-nas-estatisticas.test.ts`.** Aquela prova que as
 *    fontes (as views da carga, a leitura das designações, a das turmas do curso) trazem a arquivada; esta prova que a
 *    página não a tira DEPOIS da leitura — o cenário do achado 16 da revisão adversarial: *"se alguém aplicar
 *    `semAsArquivadas` antes dessas contas, a RT-8 quebra ali sem nenhum teste reprovar"*.
 * ⚠️ **A PÁGINA DO CURSO LÊ AS ARQUIVADAS, e deve**: o seletor de turma e a pré-seleção as escondem (C-24 da spec 017).
 *    Por isso ali a guarda não proíbe a leitura — ela exige que a contagem por currículo corra sobre a lista INTEIRA
 *    (`todasAsTurmas`, a leitura sem filtro), e não sobre a lista já sem as arquivadas.
 * ⚠️ **LÊ CÓDIGO SEM COMENTÁRIO** (regra 9.1.1) e tem **CONTROLE POSITIVO**: os comentários destes arquivos falam de
 *    arquivo e de arquivamento, e citação não é uso.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8");

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

/**
 * As páginas de Instrutores e da ficha, e as funções puras que fazem as contas delas (*Selecionado*, taxa de seleção,
 * gráficos). Nenhuma consulta o arquivamento: a arquivada entra pela leitura e conta como qualquer turma.
 */
const SEM_ARQUIVAMENTO = [
  "app/(app)/instrutores/page.tsx",
  "app/(app)/instrutores/[codigo]/page.tsx",
  "lib/dominio/selecao-no-ano.ts",
  "lib/dominio/indicadores-instrutor.ts",
  "lib/dominio/graficos-instrutor.ts",
] as const;

/** Tudo por onde uma tela sabe que a turma está arquivada — a view, a tabela, a função do banco e o módulo de domínio. */
const ARQUIVAMENTO =
  /\b(vw_turmas_arquivadas|turma_arquivamentos|turma_arquivada|semAsArquivadas|idsArquivados)\b|arquivamento-da-turma/g;

const usosDoArquivamento = (fonte: string) =>
  [...semComentarios(fonte).matchAll(ARQUIVAMENTO)].map((m) => m[0]);

const PAGINA_DO_CURSO = "app/(app)/cursos/[curso]/page.tsx";

/** A lista sobre a qual corre o laço que preenche `turmasPorCurriculo` (a coluna *Turmas* da aba Currículo). */
function listaDaContagemPorCurriculo(fonte: string): string | null {
  const m = /for \(const \w+ of (\w+)\)\s*\{[^}]*turmasPorCurriculo\.set\(/.exec(
    semComentarios(fonte),
  );
  return m?.[1] ?? null;
}

/** `todasAsTurmas` é a leitura das turmas do curso como veio do banco, sem filtro nenhum. */
const todasAsTurmasSemFiltro = (fonte: string) =>
  /const todasAsTurmas = turmasRes\.data \?\? \[\];/.test(semComentarios(fonte));

describe("RT-8 (spec 029, FR-007.4) · a tela não tira a arquivada antes da conta", () => {
  it("controle positivo: acha o filtro plantado e ignora o que só está no comentário", () => {
    expect(
      usosDoArquivamento(
        "/* sem vw_turmas_arquivadas aqui */\n// nem semAsArquivadas\nconst turmas = semAsArquivadas(linhas, arquivadas, (l) => l.id);",
      ),
    ).toEqual(["semAsArquivadas"]);
    expect(usosDoArquivamento('supabase.from("vw_turmas_arquivadas").select("turma_id")')).toEqual([
      "vw_turmas_arquivadas",
    ]);
    expect(
      listaDaContagemPorCurriculo(
        "for (const t of turmas) {\n  const id = t.curriculo_id as string;\n  turmasPorCurriculo.set(id, 1);\n}",
      ),
      "a contagem sobre a lista já sem as arquivadas não foi reconhecida",
    ).toBe("turmas");
    expect(
      todasAsTurmasSemFiltro("const todasAsTurmas = semAsArquivadas(turmasRes.data ?? []);"),
    ).toBe(false);
  });

  it.each(SEM_ARQUIVAMENTO)(
    "%s não consulta o arquivamento — Instrutores e a ficha contam a arquivada",
    (caminho) => {
      expect(
        usosDoArquivamento(ler(caminho)),
        `${caminho} passou a saber da turma arquivada; a RT-8 manda que ela CONTE em Instrutores e na ficha`,
      ).toEqual([]);
    },
  );

  it("Cursos · a contagem de turmas por currículo corre sobre TODAS as turmas do curso, arquivadas inclusive", () => {
    const fonte = ler(PAGINA_DO_CURSO);
    expect(
      listaDaContagemPorCurriculo(fonte),
      "a contagem de turmas por currículo não corre mais sobre `todasAsTurmas` (ou o laço não foi achado)",
    ).toBe("todasAsTurmas");
    expect(
      todasAsTurmasSemFiltro(fonte),
      "`todasAsTurmas` deixou de ser a leitura sem filtro das turmas do curso",
    ).toBe(true);
  });
});

/**
 * D-COR-5 — a turma arquivada TRAVA o DSA, o instrutor e a edição (spec 017, FR-004.4, T041).
 *
 * ⚠️ **UMA TRAVA SÓ NO SERVIDOR** (`recusaSeTurmaArquivada*`, `lib/acoes/turma-arquivada.ts`), e esta guarda cobra a
 *    chamada em TODA Server Action que grava dado de uma turma. A trava do banco é a M4 (portão da regra 9.4);
 *    enquanto ela não chega ao remoto, a do servidor é a proteção — e mesmo depois, é ela que dá a frase certa.
 * ⚠️ **A LISTA É FECHADA NOS DOIS SENTIDOS**: (1) cada ação travada tem de chamar a trava (ou delegar, nominalmente,
 *    a quem chama); (2) toda ação EXPORTADA que grava nesses arquivos tem de estar na lista ou numa isenção nominal,
 *    com o porquê — a ação nova que alguém escrever sem pensar na arquivada reprova aqui.
 * ⚠️ **LÊ CÓDIGO SEM COMENTÁRIO** (regra 9.1.1): a frase *"chama recusaSeTurmaArquivada"* num comentário não é chamada.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const TRAVA = /recusaSeTurmaArquivada(PeloCodigo|PelaLinha)?\s*\(/;

/** A função → quem ela chama que já tem a trava (delegação nominal). */
const TRAVADAS: Readonly<Record<string, Readonly<Record<string, string | null>>>> = {
  "lib/acoes/ta-fora-do-dsa.ts": { registrarTaForaDoDsa: null, desfazerTaForaDoDsa: null },
  "lib/acoes/turma.ts": { editarTurma: null, trocarSituacaoDaTurma: null },
  "lib/acoes/atribuicao.ts": { definirInstrutoresDaTurma: null, removerInstrutorDaTurma: null },
  "lib/acoes/disciplina.ts": { definirPeriodoDaTurma: null },
  "lib/acoes/avaliacoes-do-curriculo.ts": { definirTempoArbitrado: null, confirmarSugestao: null },
  "lib/acoes/dia-parado.ts": { pararDia: null, desfazerParada: null },
  "lib/acoes/previsto-proens.ts": { gravarPrevistoProens: null },
  "lib/acoes/juntar-sessao.ts": { juntarComoSessao: null },
  "lib/acoes/dsa.ts": {
    lancar: null,
    lancarEstudoIndividualDaSemana: null,
    excluir: null,
    aplicarAtualizacao: null,
    atualizar: "aplicarAtualizacao",
    mover: "aplicarAtualizacao",
    editar: "aplicarAtualizacao",
  },
};

/** Ações exportadas destes arquivos que gravam e NÃO são da turma — com o porquê. */
const ISENTAS: Readonly<Record<string, string>> = {
  criarTurma: "a turma nasce agora: não existe arquivada",
  arquivarTurma: "é o próprio ato de arquivar (o banco recusa a já arquivada)",
  desarquivarTurma: "é o ato que destrava (só o Admin; o banco confere)",
  /* Spec 025 (Bloco 10, D-COR-6): a arquivada tem, por definição, o registro do arquivamento — e o banco recusa. */
  excluirTurma:
    "a arquivada sempre tem registro de arquivamento, e o banco recusa turma com registro",
  arbitrarQuantidade: "currículo do CURSO, não de uma turma",
  nomearUe: "currículo do CURSO, não de uma turma",
  criarDisciplina: "cadastro do CURSO",
  editarDisciplina: "cadastro do CURSO",
  desativarDisciplina: "cadastro do CURSO",
  reativarDisciplina: "cadastro do CURSO",
  excluirDisciplina: "cadastro do CURSO (com porteiro de histórico no banco)",
};

const GRAVA = /\.(insert|update|upsert|rpc)\s*\(|aplicarAtualizacao\s*\(|gravarNoFato\s*\(/;

function semComentario(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
}

/** O corpo de `function nome(` até a próxima função de topo (ou o fim do arquivo). */
function corpo(codigo: string, nome: string): string | null {
  const inicio = codigo.search(new RegExp(`(?:export )?async function ${nome}\\s*\\(`));
  if (inicio < 0) return null;
  const resto = codigo.slice(inicio + 1);
  const fim = resto.search(/\n(?:export )?(?:async )?function |\nconst [A-Z_]+ =|\nexport const /);
  return fim < 0 ? resto : resto.slice(0, fim);
}

describe("D-COR-5 · toda ação que grava dado da turma passa pela trava da arquivada", () => {
  for (const [arquivo, funcoes] of Object.entries(TRAVADAS)) {
    const codigo = semComentario(readFileSync(arquivo, "utf8"));
    for (const [nome, delega] of Object.entries(funcoes)) {
      it(`${arquivo} · ${nome}`, () => {
        const c = corpo(codigo, nome);
        expect(c, `${nome} não existe mais em ${arquivo}: atualize a lista`).not.toBeNull();
        if (delega === null) {
          expect(TRAVA.test(c as string), `${nome} grava sem conferir a turma arquivada`).toBe(
            true,
          );
        } else {
          expect(new RegExp(`${delega}\\s*\\(`).test(c as string)).toBe(true);
        }
      });
    }
  }

  it("⚠️ a lista é fechada: toda ação exportada que grava nesses arquivos está travada ou isenta pelo nome", () => {
    const soltas: string[] = [];
    for (const [arquivo, funcoes] of Object.entries(TRAVADAS)) {
      const codigo = semComentario(readFileSync(arquivo, "utf8"));
      for (const m of codigo.matchAll(/export async function (\w+)\s*\(/g)) {
        const nome = m[1] as string;
        if (nome in funcoes || nome in ISENTAS) continue;
        if (GRAVA.test(corpo(codigo, nome) ?? "")) soltas.push(`${arquivo} · ${nome}`);
      }
    }
    expect(soltas).toEqual([]);
  });

  it("controle positivo: a guarda acha a trava onde ela está e acusa onde ela falta", () => {
    expect(TRAVA.test("const a = await recusaSeTurmaArquivada(supabase, id);")).toBe(true);
    expect(
      TRAVA.test(semComentario("/* recusaSeTurmaArquivada(supabase, id) */ const a = 1;")),
    ).toBe(false);
    expect(corpo("export async function x() { return 1; }\nfunction y() {}", "x")).toContain(
      "return 1",
    );
  });
});

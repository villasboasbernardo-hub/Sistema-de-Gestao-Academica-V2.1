"use server";

/**
 * Server Actions de turma (`FR-025`, `FR-026`, `FR-031.6`, `FR-042`).
 *
 * ⚠️ **NENHUMA DELAS MANDA `codigo`** (`FR-025.1`). Ele é `sigla [rótulo] ano`, carimbado pelo gatilho
 * `app.gerar_codigo_da_turma()`, e o banco recusa valor divergente. A criação **lê o código de volta**
 * para saber para onde navegar.
 *
 * ⚠️ **O CURSO VEM DO CAMINHO, NUNCA DO CORPO** (`FR-031.6`). A rota é
 * `/cursos/[curso]/turmas/nova`: quem cria a turma já escolheu o curso ao chegar ali, e aceitar um
 * `curso_id` no corpo abriria um caminho para criar turma em curso que a pessoa não alcança.
 *
 * ⚠️ **A COLISÃO DE RÓTULO É LIDA, E NÃO ADIVINHADA** (`FR-026`). No `23505` da
 * `turmas_unica_por_ano`, a ação **busca a turma que ocupa o rótulo** — ela está no mesmo curso, logo
 * no alcance — e a mensagem a nomeia. Sem isso, a pessoa recebe "já existe" sem saber qual.
 *
 * ⚠️ **`UPDATE` BARRADO PELO `USING` DA POLICY NÃO DÁ ERRO NENHUM** — zero linhas é recusa.
 */
import { revalidatePath } from "next/cache";

import {
  recusaPorAlcance,
  traduzirRecusa,
  type ContextoDaRecusa,
  type ErroDoBanco,
} from "@/lib/acoes/traducao-de-recusas";
import { enderecoDaTurma } from "@/lib/navegacao/endereco-de-turma";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { esquemaDeTurma } from "@/lib/validacao/turma";

export type ResultadoDeTurma =
  | { readonly ok: true; readonly codigo: string; readonly destino: string }
  | { readonly ok: false; readonly erro: string };

const falha = (erro: string): ResultadoDeTurma => ({ ok: false, erro });

function primeiraMensagem(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? "Dados inválidos.";
}

/**
 * A turma que já ocupa o rótulo naquele curso e ano — o que a mensagem do `FR-026` nomeia.
 *
 * ⚠️ **ELA ESTÁ NO MESMO CURSO, PORTANTO NO ALCANCE.** Ler outra turma para montar a mensagem não
 * revela nada que a pessoa já não pudesse ver.
 */
async function turmaQueOcupa(
  cursoId: string,
  ano: number,
  rotulo: string | null,
): Promise<ContextoDaRecusa["turmaOcupante"] | undefined> {
  const supabase = await criarClienteDeServidor();
  const consulta = supabase
    .from("turmas")
    .select("codigo, turma, ano_letivo, cursos(codigo)")
    .eq("curso_id", cursoId)
    .eq("ano_letivo", ano);

  const { data } = await (
    rotulo === null ? consulta.is("turma", null) : consulta.eq("turma", rotulo)
  ).maybeSingle();

  if (!data) return undefined;
  const curso = data.cursos as { codigo?: string } | null;
  return {
    codigo: data.codigo as string,
    rotulo: data.turma,
    sigla: curso?.codigo ?? "",
    ano: Number(data.ano_letivo),
  };
}

/** A situação do curso, para distinguir "inativo" de "fora do escopo" na recusa da RLS. */
async function contextoDoCurso(cursoId: string, oQueNaoRecebe: string): Promise<ContextoDaRecusa> {
  const supabase = await criarClienteDeServidor();
  const { data } = await supabase
    .from("cursos")
    .select("codigo, status")
    .eq("id", cursoId)
    .maybeSingle();
  return {
    ...(data?.codigo ? { sigla: data.codigo as string } : {}),
    oQueNaoRecebe,
    cursoInativo: data?.status === "inativo",
  };
}

/** Cria a turma sob o curso do caminho. O código volta do banco (`FR-025.1`, `FR-031.6`). */
export async function criarTurma(cursoId: string, entrada: unknown): Promise<ResultadoDeTurma> {
  const conferido = esquemaDeTurma.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const supabase = await criarClienteDeServidor();
  const { data, error } = await supabase
    .from("turmas")
    .insert({ ...conferido.data, curso_id: cursoId })
    .select("codigo")
    .maybeSingle();

  if (error) {
    const contexto = await contextoDoCurso(cursoId, "turma nova");
    const ocupante = await turmaQueOcupa(cursoId, conferido.data.ano_letivo, conferido.data.turma);
    return falha(
      traduzirRecusa(error as ErroDoBanco, {
        ...contexto,
        ...(ocupante ? { turmaOcupante: ocupante } : {}),
      }),
    );
  }
  if (!data) return falha(recusaPorAlcance(await contextoDoCurso(cursoId, "turma nova")));

  const codigo = data.codigo as string;
  revalidatePath("/cursos");
  revalidatePath(enderecoDaTurma(codigo));
  return { ok: true, codigo, destino: enderecoDaTurma(codigo) };
}

/** Edita a turma. **Sem `codigo`**, e pedindo a linha de volta. */
export async function editarTurma(
  codigoAtual: string,
  entrada: unknown,
): Promise<ResultadoDeTurma> {
  const conferido = esquemaDeTurma.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const supabase = await criarClienteDeServidor();
  const { data: atual } = await supabase
    .from("turmas")
    .select("curso_id")
    .eq("codigo", codigoAtual)
    .maybeSingle();
  const cursoId = (atual?.curso_id as string | undefined) ?? "";

  const { data, error } = await supabase
    .from("turmas")
    .update(conferido.data)
    .eq("codigo", codigoAtual)
    .select("codigo");

  if (error) {
    const contexto = cursoId ? await contextoDoCurso(cursoId, "alterações") : {};
    const ocupante = cursoId
      ? await turmaQueOcupa(cursoId, conferido.data.ano_letivo, conferido.data.turma)
      : undefined;
    return falha(
      traduzirRecusa(error as ErroDoBanco, {
        ...contexto,
        ...(ocupante ? { turmaOcupante: ocupante } : {}),
      }),
    );
  }
  if (!data || data.length === 0) {
    return falha(recusaPorAlcance(cursoId ? await contextoDoCurso(cursoId, "alterações") : {}));
  }

  revalidatePath("/cursos");
  revalidatePath(enderecoDaTurma(codigoAtual));
  return { ok: true, codigo: codigoAtual, destino: enderecoDaTurma(codigoAtual) };
}

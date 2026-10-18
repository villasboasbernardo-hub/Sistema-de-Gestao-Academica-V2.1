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
import {
  esquemaDaTrocaDeSituacao,
  esquemaDeEdicaoDaTurma,
  esquemaDeTurma,
} from "@/lib/validacao/turma";

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

/**
 * Edita a turma. **Sem `codigo`**, e pedindo a linha de volta.
 *
 * ⚠️ **E SEM A SITUAÇÃO desde 17/10/2026** (spec 016, FR-015.4): ela se troca só por
 * `trocarSituacaoDaTurma`, e o esquema da edição a descarta se vier no corpo.
 */
export async function editarTurma(
  codigoAtual: string,
  entrada: unknown,
): Promise<ResultadoDeTurma> {
  const conferido = esquemaDeEdicaoDaTurma.safeParse(entrada);
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

  /*
   * ⚠️ **O CÓDIGO VOLTA DO BANCO, E NÃO É O QUE ENTROU** (`FR-025.1`). Mudar o ano ou o rótulo faz o
   *    gatilho **regerar** `sigla [rótulo] ano`: devolver `codigoAtual` mandaria a pessoa para uma
   *    ficha que deixou de existir no mesmo comando, e o 404 apareceria como se a gravação tivesse
   *    falhado. As duas revalidações existem porque os dois endereços mudaram de conteúdo.
   */
  const codigo = (data[0]?.codigo as string | undefined) ?? codigoAtual;
  revalidatePath("/cursos");
  revalidatePath(enderecoDaTurma(codigoAtual));
  if (codigo !== codigoAtual) revalidatePath(enderecoDaTurma(codigo));
  return { ok: true, codigo, destino: enderecoDaTurma(codigo) };
}

/**
 * Troca a situação da turma — o botão *"Trocar situação"* da ficha (spec 016, FR-015.1).
 *
 * > *"Ao lado do selo de Situação, um botão «Trocar situação» que abre um diálogo só com a situação e
 * > grava por uma Server Action própria — só o código da turma e a situação."* — Q-14, Bernardo Villas
 * > Boas, 17/10/2026
 *
 * ⚠️ **É O ÚNICO CAMINHO DA SITUAÇÃO NA EDIÇÃO** (FR-015.4): o formulário da turma não a manda mais. É
 * o diálogo que o Bloco 2 vai estender com a observação por troca de status (D-COR-4).
 *
 * ⚠️ **ZERO LINHAS É RECUSA**: o `UPDATE` barrado pela RLS volta sem erro (gotcha 4), e por isso a
 * linha é pedida de volta e a ausência dela vira a mesma recusa por alcance da edição.
 */
export async function trocarSituacaoDaTurma(entrada: unknown): Promise<ResultadoDeTurma> {
  const conferido = esquemaDaTrocaDeSituacao.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));
  const { codigo, status } = conferido.data;

  const supabase = await criarClienteDeServidor();
  const { data: atual } = await supabase
    .from("turmas")
    .select("curso_id")
    .eq("codigo", codigo)
    .maybeSingle();
  const cursoId = (atual?.curso_id as string | undefined) ?? "";

  const { data, error } = await supabase
    .from("turmas")
    .update({ status })
    .eq("codigo", codigo)
    .select("codigo");

  if (error) {
    const contexto = cursoId ? await contextoDoCurso(cursoId, "alterações") : {};
    return falha(traduzirRecusa(error as ErroDoBanco, contexto));
  }
  if (!data || data.length === 0) {
    return falha(recusaPorAlcance(cursoId ? await contextoDoCurso(cursoId, "alterações") : {}));
  }

  revalidatePath("/cursos");
  revalidatePath("/turmas");
  revalidatePath(enderecoDaTurma(codigo));
  return { ok: true, codigo, destino: enderecoDaTurma(codigo) };
}

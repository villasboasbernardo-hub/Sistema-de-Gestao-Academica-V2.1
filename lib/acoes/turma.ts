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
import {
  recusaSeTurmaArquivada,
  recusaSeTurmaArquivadaPeloCodigo,
} from "@/lib/acoes/turma-arquivada";
import { QUEM_DESARQUIVA } from "@/lib/dominio/arquivamento-da-turma";
import {
  enderecoDasTurmasComExclusao,
  enderecoDaTurma,
  enderecoDaTurmaGravada,
} from "@/lib/navegacao/endereco-de-turma";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { esquemaDaExclusaoPermanente } from "@/lib/validacao/exclusao";
import {
  esquemaDaSituacaoNaEdicao,
  esquemaDaTrocaDeSituacao,
  esquemaDeEdicaoDaTurma,
  esquemaDeTurma,
  esquemaDoArquivamento,
  esquemaDoDesarquivamento,
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
  /*
   * Spec 019 (Bloco 4, C-16): o submenu da lateral mora no layout, que não é redesenhado na navegação por clique —
   * sem isto, o curso ou a turma nova só apareceria nele depois de recarregar a página.
   */
  revalidatePath("/", "layout");
  return { ok: true, codigo, destino: enderecoDaTurma(codigo) };
}

/**
 * Edita a turma. **Sem `codigo`**, e pedindo a linha de volta.
 *
 * ⚠️ **A SITUAÇÃO VOLTOU, À PARTE DOS CAMPOS** (spec 025, Bloco 10, D-2): *Editar turma* edita tudo. O esquema dos
 * campos continua descartando `status`; a troca é lida por `esquemaDaSituacaoNaEdicao` e, **depois** de os campos
 * gravarem, vai pela função do banco que anota o histórico com a observação (D-COR-4). Se ela for recusada, a resposta
 * diz que os campos ficaram gravados.
 */
export async function editarTurma(
  codigoAtual: string,
  entrada: unknown,
): Promise<ResultadoDeTurma> {
  const conferido = esquemaDeEdicaoDaTurma.safeParse(entrada);
  const daSituacao = esquemaDaSituacaoNaEdicao.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));
  if (!daSituacao.success) return falha(primeiraMensagem(daSituacao.error.issues));

  const supabase = await criarClienteDeServidor();
  const { data: atual } = await supabase
    .from("turmas")
    .select("id, curso_id, status")
    .eq("codigo", codigoAtual)
    .maybeSingle();
  const cursoId = (atual?.curso_id as string | undefined) ?? "";

  /* D-COR-5: a turma arquivada é somente leitura — nem o Admin edita (C-4). */
  if (atual) {
    const arquivada = await recusaSeTurmaArquivada(supabase, atual.id as string);
    if (arquivada) return falha(arquivada);
  }

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

  /* D-2: a troca de situação, depois dos campos — pela função que anota o histórico (D-COR-4). */
  const { status, observacao_da_situacao: observacao } = daSituacao.data;
  if (status !== undefined && status !== (atual?.status as string | undefined)) {
    const troca = await trocarSituacaoDaTurma({ codigo, status, observacao });
    if (!troca.ok) {
      return falha(`As alterações da turma foram gravadas, mas a situação não: ${troca.erro}`);
    }
  }
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
  const { codigo, status, observacao } = conferido.data;

  const supabase = await criarClienteDeServidor();
  const { data: atual } = await supabase
    .from("turmas")
    .select("curso_id")
    .eq("codigo", codigo)
    .maybeSingle();
  const cursoId = (atual?.curso_id as string | undefined) ?? "";

  /* D-COR-5: a turma arquivada é somente leitura — a situação também não muda. */
  const arquivada = await recusaSeTurmaArquivadaPeloCodigo(supabase, codigo);
  if (arquivada) return falha(arquivada);

  /*
   * ⚠️ **A TROCA E A OBSERVAÇÃO VÃO JUNTAS PELA FUNÇÃO DO BANCO** (D-COR-4; spec 017, M2): ela põe a observação na
   *    transação e troca a situação; o gatilho anota a troca com quem e quando. A função recusa com `42501`
   *    (`turma_fora_do_alcance`) quando o `UPDATE` não alcança a linha — o zero linhas da RLS deixa de ser calado.
   */
  const { error } = await supabase.rpc("trocar_situacao_da_turma", {
    p_codigo: codigo,
    p_status: status,
    p_observacao: observacao,
  });

  if (error) {
    if (error.code === "42501" || error.hint === "turma_fora_do_alcance") {
      return falha(recusaPorAlcance(cursoId ? await contextoDoCurso(cursoId, "alterações") : {}));
    }
    const contexto = cursoId ? await contextoDoCurso(cursoId, "alterações") : {};
    return falha(traduzirRecusa(error as ErroDoBanco, contexto));
  }

  revalidatePath("/cursos");
  revalidatePath("/turmas");
  revalidatePath("/inicio");
  revalidatePath(enderecoDaTurma(codigo));
  return { ok: true, codigo, destino: enderecoDaTurmaGravada(codigo, "situacao") };
}

/**
 * Arquivar a turma — D-COR-5: *"Arquivar turma em QUALQUER estado, com aviso quando não estiver concluída; por
 * colunas próprias, NUNCA um 5º status. (…) o Admin desarquiva."*
 *
 * ⚠️ **É UM EVENTO, NÃO UMA COLUNA DA TURMA** (`turma_arquivamentos`, só de acréscimo; C-5): o banco carimba quem e
 *    quando, recusa arquivar a arquivada (`turma_ja_arquivada`) e a policy decide quem pode — o recurso
 *    `arquivamento_de_turma` (o Admin, o Encarregado e o Ajudante da Administração Acadêmica; decisão de Bernardo
 *    Villas Boas, 19/10/2026) e o alcance. A situação da turma NÃO muda.
 * ⚠️ **GERA O `id` NO BANCO E NÃO PEDE A LINHA DE VOLTA** (gotcha 4.1).
 */
export async function arquivarTurma(entrada: unknown): Promise<ResultadoDeTurma> {
  const conferido = esquemaDoArquivamento.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));
  const { codigo, observacao } = conferido.data;

  const supabase = await criarClienteDeServidor();
  const { data: turma } = await supabase
    .from("turmas")
    .select("id")
    .eq("codigo", codigo)
    .maybeSingle();
  if (!turma) return falha("A turma não existe mais, ou o seu perfil não a alcança.");

  const { error } = await supabase
    .from("turma_arquivamentos")
    .insert({ turma_id: turma.id as string, acao: "arquivar", observacao });
  if (error) {
    return falha(
      error.code === "42501"
        ? `O seu perfil não arquiva turma: arquivam ${QUEM_DESARQUIVA}.`
        : traduzirRecusa(error as ErroDoBanco),
    );
  }

  revalidarListasDaTurma(codigo);
  return { ok: true, codigo, destino: enderecoDaTurmaGravada(codigo, "arquivada") };
}

/** Desarquivar a turma — o mesmo trio que arquiva (decisão de 19/10/2026); a policy confere o recurso. */
export async function desarquivarTurma(entrada: unknown): Promise<ResultadoDeTurma> {
  const conferido = esquemaDoDesarquivamento.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));
  const { codigo } = conferido.data;

  const supabase = await criarClienteDeServidor();
  const { data: turma } = await supabase
    .from("turmas")
    .select("id")
    .eq("codigo", codigo)
    .maybeSingle();
  if (!turma) return falha("A turma não existe mais, ou o seu perfil não a alcança.");

  const { error } = await supabase
    .from("turma_arquivamentos")
    .insert({ turma_id: turma.id as string, acao: "desarquivar" });
  if (error) {
    return falha(
      error.code === "42501"
        ? `O seu perfil não desarquiva turma: desarquivam ${QUEM_DESARQUIVA}.`
        : traduzirRecusa(error as ErroDoBanco),
    );
  }

  revalidarListasDaTurma(codigo);
  return { ok: true, codigo, destino: enderecoDaTurmaGravada(codigo, "desarquivada") };
}

/** Arquivar e desarquivar mudam o que as listas mostram (C-24). */
function revalidarListasDaTurma(codigo: string): void {
  revalidatePath("/cursos");
  revalidatePath("/turmas");
  revalidatePath("/inicio");
  revalidatePath("/disciplinas");
  revalidatePath("/atividades");
  revalidatePath(enderecoDaTurma(codigo));
  /*
   * Spec 019 (Bloco 4, C-16): o submenu da lateral mora no layout, que não é redesenhado na navegação por clique —
   * sem isto, o curso ou a turma nova só apareceria nele depois de recarregar a página.
   */
  revalidatePath("/", "layout");
}

/**
 * Excluir a turma **permanentemente** — D-COR-6 (spec 025, D-9 a D-15).
 *
 * > *"Excluir turma (alerta de exclusão permanente)."* · *"…só habilitados sem semana salva/publicada ligada."* —
 * > Bernardo Villas Boas, 24/10/2026
 *
 * ⚠️ **NÃO HÁ `delete` AQUI, e não pode haver**: `authenticated` não tem privilégio nem policy de `DELETE` (regra 4). O
 *    caminho é `public.excluir_turma`, com porteiro (`turmas.criar` + alcance), o código digitado e os impedimentos
 *    conferidos no banco, e o rastro em `exclusoes_registradas` gravado antes.
 * ⚠️ **DEPOIS, A LISTA** — a ficha deixou de existir — com a confirmação na URL (`?excluida=`, D-15).
 */
export async function excluirTurma(entrada: unknown): Promise<ResultadoDeTurma> {
  const conferido = esquemaDaExclusaoPermanente.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const supabase = await criarClienteDeServidor();
  const { data, error } = await supabase.rpc("excluir_turma", {
    p_turma_id: conferido.data.id,
    p_codigo_confirmacao: conferido.data.codigoConfirmacao,
  });
  if (error) {
    if (error.code === "42501" && error.hint !== "rastro_imutavel") {
      return falha(
        "O seu perfil não exclui esta turma: excluem turma quem pode criá-la, no alcance do curso.",
      );
    }
    if (error.code === "P0002") return falha("A turma não existe mais.");
    return falha(traduzirRecusa(error as ErroDoBanco));
  }

  const codigo = String(
    (data as { codigo?: string } | null)?.codigo ?? conferido.data.codigoConfirmacao,
  );
  revalidarListasDaTurma(codigo);
  return { ok: true, codigo, destino: enderecoDasTurmasComExclusao(codigo) };
}

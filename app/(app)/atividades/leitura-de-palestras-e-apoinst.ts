/**
 * Bloco 18 (spec 033, RA-6, RA-7; FR-004.1, FR-006.5, FR-006.6) — o que as abas Palestras e APOINST leem ALÉM do leitor
 * compartilhado (`leitura-do-planejado.ts`): as turmas do ano (módulo), o ano inicial da APOINST (parâmetro) e as
 * opções do formulário da APOINST (as disciplinas da turma e os instrutores DESIGNADOS em cada uma).
 *
 * ⚠️ **O ANO É O DA TURMA** (RA-7, RT-6): o módulo lê as turmas de `ano_letivo = ano` — a arquivada inclusive, porque
 *    ela CONTA nos números (RT-8); quem a tira das opções do filtro é a tela.
 * ⚠️ **O ANO INICIAL É PARÂMETRO** (`apoinst.ano_inicial`, regra 8), lido com a regra de `app.fn_parametro_numerico`
 *    (`parametroDoAno`); ausente, não restringe (RN-DEG-01) — e «não li» é dito à parte de «não há».
 * ⚠️ **O INSTRUTOR RESPONSÁVEL É O DESIGNADO** (RA-6): `turma_disciplina_instrutor` ativo na linha ativa da turma — o
 *    mesmo que o gatilho `app.guardar_apoinst_planejada` confere. A lista sai em antiguidade (`ordem_antiguidade`) e o
 *    seletor único a reordena (`RN-ANT-01`).
 * ⚠️ **SEM AWAIT EM LAÇO**: uma rodada de `Promise.all` e o resto em memória.
 */
import "server-only";

import { escalaDeLinhas, type EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import type { TurmaDaAba } from "@/lib/dominio/atividades/palestras-e-apoinst-na-tela";
import { idsArquivados } from "@/lib/dominio/arquivamento-da-turma";
import { ehEadPuro } from "@/lib/dominio/dsa/ead-puro";
import type { InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";
import { emOrdemDeTurma } from "@/lib/dominio/ordem-de-cursos";
import { compararCodigoNatural } from "@/lib/dominio/ordem-natural";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { parametroDoAno } from "../turmas/[turma]/tetos";
import type { TurmaDoPlanejado } from "./leitura-do-planejado";

type Linha = Record<string, unknown>;

/** A turma do ano, como as abas Palestras e APOINST do módulo a usam. */
export type TurmaDoAnoNaAba = TurmaDaAba &
  TurmaDoPlanejado & {
    readonly ano: number;
    readonly eadPura: boolean;
  };

/** Uma disciplina da turma no formulário da APOINST, com os designados nela. */
export type DisciplinaParaApoinst = {
  readonly id: string;
  readonly rotulo: string;
  readonly designados: readonly InstrutorParaExibir[];
};

export type OpcoesDaApoinst = {
  /** Por id da turma: as disciplinas ATIVAS da turma, em ordem natural do código. */
  readonly disciplinas: ReadonlyMap<string, readonly DisciplinaParaApoinst[]>;
  readonly escala: EscalaDeAntiguidade;
  /** Por id da APOINST: a observação gravada (o leitor compartilhado não a traz — o formulário de editar precisa). */
  readonly observacoes: ReadonlyMap<string, string | null>;
  /** A leitura das opções falhou (a lista vazia seria «não há», e não é). */
  readonly erro: string | null;
};

const FALHA_DAS_TURMAS =
  "Não foi possível ler as turmas do ano agora. Recarregue a página; se persistir, procure o suporte.";
const FALHA_DAS_OPCOES =
  "Não foi possível ler as disciplinas e os instrutores designados da turma. Recarregue a página; se persistir, procure o suporte.";

/**
 * As turmas do ano (módulo Atividades), na ordem única (`emOrdemDeTurma`), com o currículo de cada uma e a marca de
 * arquivada. A turma EAD pura vem marcada (`eadPura`): ela não tem DSA, e quem chama decide o que mostrar.
 */
export async function lerTurmasDoAno(
  ano: number,
): Promise<{ readonly turmas: readonly TurmaDoAnoNaAba[]; readonly erro: string | null }> {
  const supabase = await criarClienteDeServidor();
  const [turmasRes, arquivadasRes] = await Promise.all([
    supabase
      .from("turmas")
      .select(
        "id, codigo, ano_letivo, curriculo_id, modalidade, curso:cursos!turmas_curso_id_fkey(codigo, classificacao)",
      )
      .eq("ano_letivo", ano),
    supabase.from("vw_turmas_arquivadas").select("turma_id"),
  ]);
  if (turmasRes.error || arquivadasRes.error) return { turmas: [], erro: FALHA_DAS_TURMAS };
  const arquivadas = idsArquivados((arquivadasRes.data ?? []) as { turma_id: string | null }[]);
  const turmas = ((turmasRes.data ?? []) as Linha[]).map((t) => {
    const curso = t.curso as { codigo: string; classificacao: string | null } | null;
    return {
      id: t.id as string,
      codigo: t.codigo as string,
      ano: Number(t.ano_letivo),
      curriculoId: (t.curriculo_id as string | null) ?? null,
      cursoCodigo: curso?.codigo ?? "",
      cursoClassificacao: curso?.classificacao ?? null,
      arquivada: arquivadas.has(t.id as string),
      eadPura: ehEadPuro(t.modalidade as string | null),
    };
  });
  return {
    /* A classificação só serve à ordem única; a turma da aba não a carrega. */
    turmas: emOrdemDeTurma(turmas).map((t) => ({
      id: t.id,
      codigo: t.codigo,
      ano: t.ano,
      curriculoId: t.curriculoId,
      cursoCodigo: t.cursoCodigo,
      arquivada: t.arquivada,
      eadPura: t.eadPura,
    })),
    erro: null,
  };
}

/**
 * O ano inicial da APOINST (`apoinst.ano_inicial`), que vale no ano dado. `lido: false` = a leitura falhou — não é o
 * mesmo que o parâmetro ausente (`valor: null`, que não restringe).
 */
export async function lerAnoInicialDaApoinst(
  ano: number,
): Promise<{ readonly valor: number | null; readonly lido: boolean }> {
  const supabase = await criarClienteDeServidor();
  const { data, error } = await supabase
    .from("config_parametros")
    .select("chave, valor, ano_vigencia")
    .eq("chave", "apoinst.ano_inicial")
    .eq("status", "ativo");
  if (error) return { valor: null, lido: false };
  return {
    valor: parametroDoAno(
      ((data ?? []) as Linha[]).map((p) => ({
        chave: p.chave as string,
        valor: String(p.valor),
        ano_vigencia: p.ano_vigencia === null ? null : Number(p.ano_vigencia),
      })),
      "apoinst.ano_inicial",
      ano,
    ),
    lido: true,
  };
}

/**
 * As opções do formulário da APOINST para as turmas dadas: as disciplinas ativas de cada turma, com os instrutores
 * designados nelas, a escala de antiguidade e as observações das APOINST já gravadas.
 */
export async function lerOpcoesDaApoinst(turmaIds: readonly string[]): Promise<OpcoesDaApoinst> {
  const vazio: OpcoesDaApoinst = {
    disciplinas: new Map(),
    escala: {},
    observacoes: new Map(),
    erro: null,
  };
  if (turmaIds.length === 0) return vazio;
  const supabase = await criarClienteDeServidor();
  const [linhasRes, escalaRes, observacoesRes] = await Promise.all([
    supabase
      .from("turma_disciplina")
      .select(
        "id, turma_id, disciplina:disciplinas!turma_disciplina_disciplina_id_fkey(id, codigo, cod_disciplina, nome_disciplina), designados:turma_disciplina_instrutor!turma_disciplina_instrutor_turma_disciplina_id_fkey(instrutor_id, status)",
      )
      .in("turma_id", [...turmaIds])
      .eq("status", "ativo"),
    supabase
      .from("config_listas")
      .select("valor, ordem, ativo")
      .eq("lista", "escala_antiguidade")
      .order("ordem"),
    supabase
      .from("apoinst_planejadas")
      .select("id, observacao")
      .in("turma_id", [...turmaIds]),
  ]);
  if (linhasRes.error || escalaRes.error || observacoesRes.error) {
    return { ...vazio, erro: FALHA_DAS_OPCOES };
  }
  const linhas = (linhasRes.data ?? []) as Linha[];
  const idsDosDesignados = [
    ...new Set(
      linhas.flatMap((l) =>
        ((l.designados as { instrutor_id: string; status: string }[] | null) ?? [])
          .filter((d) => d.status === "ativo")
          .map((d) => d.instrutor_id),
      ),
    ),
  ];
  const instrutoresRes =
    idsDosDesignados.length === 0
      ? { data: [] as Linha[], error: null }
      : await supabase
          .from("vw_instrutores")
          .select("id, posto_graduacao, esp_hab_obs, nome_completo, nome_guerra, ordem_antiguidade")
          .in("id", idsDosDesignados)
          .order("ordem_antiguidade");
  if (instrutoresRes.error) return { ...vazio, erro: FALHA_DAS_OPCOES };
  const instrutores = new Map(
    ((instrutoresRes.data ?? []) as Linha[]).map((i) => [
      i.id as string,
      {
        id: i.id as string,
        pg: (i.posto_graduacao as string | null) ?? "",
        especialidade: (i.esp_hab_obs as string | null) ?? null,
        nomeCompleto: (i.nome_completo as string | null) ?? "",
        nomeDeGuerra: (i.nome_guerra as string | null) ?? null,
      } satisfies InstrutorParaExibir,
    ]),
  );

  const porTurma = new Map<string, DisciplinaParaApoinst[]>();
  for (const l of linhas) {
    const d = l.disciplina as {
      id: string;
      codigo: string;
      cod_disciplina: string | null;
      nome_disciplina: string;
    } | null;
    if (!d) continue;
    const designados = ((l.designados as { instrutor_id: string; status: string }[] | null) ?? [])
      .filter((x) => x.status === "ativo")
      .map((x) => instrutores.get(x.instrutor_id))
      .filter((x): x is InstrutorParaExibir => x !== undefined);
    const lista = porTurma.get(l.turma_id as string) ?? [];
    lista.push({
      id: d.id,
      rotulo: `${d.cod_disciplina ?? d.codigo} — ${d.nome_disciplina}`,
      designados,
    });
    porTurma.set(l.turma_id as string, lista);
  }
  for (const [turma, lista] of porTurma) {
    porTurma.set(
      turma,
      [...lista].sort((a, b) => compararCodigoNatural(a.rotulo, b.rotulo)),
    );
  }

  return {
    disciplinas: porTurma,
    escala: escalaDeLinhas(
      ((escalaRes.data ?? []) as Linha[]).map((e) => ({
        valor: e.valor as string,
        ordem: Number(e.ordem),
        ativo: e.ativo !== false,
      })),
    ),
    observacoes: new Map(
      ((observacoesRes.data ?? []) as Linha[]).map((o) => [
        o.id as string,
        (o.observacao as string | null) ?? null,
      ]),
    ),
    erro: null,
  };
}

/**
 * RA-8 (Bloco 18, spec 033) — os avisos do sininho do módulo Atividades.
 *
 * > *"Avisos no sininho: AEC obrigatória não cumprida a 4 semanas do fim da turma; APOINST atrasada; AEC/TAD/TR da turma
 * > acima do limite do currículo."* — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **AS 4 SEMANAS SÃO PARÂMETRO** (`atividades.aviso_aec_semanas`, regra 8), lido por quem chama: ausente, o aviso da
 *    AEC não sai — e quem chama diz «não li» (RN-DEG-01), nunca «nenhum».
 * ⚠️ **A PARTIR DE N SEMANAS ANTES DO TÉRMINO, ENQUANTO A TURMA ESTIVER ATIVA** (inclusive depois do término, se ela
 *    continuar ativa): é o pedido «a 4 semanas do fim» lido como prazo, não como janela de um dia.
 * ⚠️ **O TERCEIRO AVISO JÁ EXISTE** (`turmas:teto_*`, por `tetosDaTurma`) e não se repete aqui (D-12 da spec 033).
 * ⚠️ **SEM ARQUIVADA E SEM EAD PURA** (RT-8: os avisos são lista do dia a dia).
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import { diasAte } from "@/lib/dominio/sinalizacao-de-disciplina";

export type TurmaParaAviso = {
  readonly id: string;
  readonly codigo: string;
  readonly termino: string | null;
  readonly ativa: boolean;
  readonly arquivada: boolean;
  readonly eadPura: boolean;
};

export type AecPendente = {
  readonly turmaCodigo: string;
  readonly codigo: string;
  readonly nome: string;
  readonly termino: string;
  /** Dias até o término (negativo = já passou). */
  readonly dias: number;
};

export type ApoinstAtrasada = {
  readonly turmaCodigo: string;
  readonly codigo: string;
  readonly nome: string;
  readonly fimPrevisto: string;
};

/** A turma entra no aviso da AEC obrigatória? */
export function dentroDoPrazoDeAviso(termino: string | null, hoje: string, semanas: number | null): boolean {
  if (termino === null || semanas === null) return false;
  return diasAte(termino, hoje) <= semanas * 7;
}

export function avisosDeAtividades(entrada: {
  readonly turmas: readonly TurmaParaAviso[];
  /** Por id da turma: as AEC obrigatórias AINDA NÃO cumpridas (de `quadroDasPrevistas`). */
  readonly obrigatoriasPendentes: ReadonlyMap<string, ReadonlyArray<{ readonly codigo: string; readonly nome: string }>>;
  /** Por id da turma: as APOINST ativas em situação «atrasada» (de `quadroDaApoinst`). */
  readonly apoinstAtrasadas: ReadonlyMap<
    string,
    ReadonlyArray<{ readonly codigo: string; readonly nome: string; readonly fimPrevisto: string }>
  >;
  readonly hoje: string;
  readonly semanasDeAviso: number | null;
}): { readonly aecPendentes: readonly AecPendente[]; readonly apoinstAtrasadas: readonly ApoinstAtrasada[] } {
  const aecPendentes: AecPendente[] = [];
  const apoinstAtrasadas: ApoinstAtrasada[] = [];
  for (const t of entrada.turmas) {
    if (!t.ativa || t.arquivada || t.eadPura) continue;
    if (t.termino !== null && dentroDoPrazoDeAviso(t.termino, entrada.hoje, entrada.semanasDeAviso)) {
      for (const p of entrada.obrigatoriasPendentes.get(t.id) ?? []) {
        aecPendentes.push({
          turmaCodigo: t.codigo,
          codigo: p.codigo,
          nome: p.nome,
          termino: t.termino,
          dias: diasAte(t.termino, entrada.hoje),
        });
      }
    }
    for (const a of entrada.apoinstAtrasadas.get(t.id) ?? []) {
      apoinstAtrasadas.push({ turmaCodigo: t.codigo, codigo: a.codigo, nome: a.nome, fimPrevisto: a.fimPrevisto });
    }
  }
  return { aecPendentes, apoinstAtrasadas };
}

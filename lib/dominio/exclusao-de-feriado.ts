/**
 * A exclusão permanente de linha do calendário (feriado) — D-COR-6 (spec 025, D-11 e D-13).
 *
 * > *"Excluir turma e Excluir feriado só habilitados sem semana salva/publicada ligada; com registros, ícone
 * > desabilitado com dica 'tem registros: use Arquivar/Desativar'."* — Bernardo Villas Boas, 24/10/2026
 *
 * ⚠️ **"SEMANA SALVA OU PUBLICADA LIGADA"** é o evento `salvo`, `publicado` ou `alteracao_publicada` na trilha do DSA
 *    (`dsa_eventos_da_semana`), na semana ISO da data, de alguma turma que o feriado alcança (D-11). A semana *registrada*
 *    sem evento (D-18 da spec 024) não conta — por ela, toda semana contaria.
 *
 * TypeScript puro: sem `next`, sem `react`, sem `supabase`.
 */
import { chavesDaRecusa, estadoDaExclusao, type EstadoDaExclusao } from "./exclusao-permanente";

export const ROTULO_DO_IMPEDIMENTO_DO_FERIADO: Readonly<Record<string, string>> = {
  semana_do_dsa_salva_ou_publicada: "semana do DSA salva ou publicada",
};

/** A dica do ícone com registros — a da D-COR-6, para o calendário. */
export const DICA_DO_FERIADO_COM_REGISTROS = "tem registros: use Desativar";

export function estadoDaExclusaoDoFeriado(
  impedimentos: readonly string[] | null,
): EstadoDaExclusao {
  return estadoDaExclusao(
    impedimentos,
    ROTULO_DO_IMPEDIMENTO_DO_FERIADO,
    DICA_DO_FERIADO_COM_REGISTROS,
    " nesta data",
  );
}

/** As chaves da recusa `feriado_com_historico: a, b`. */
export function chavesDaRecusaDoFeriado(mensagem: string): readonly string[] {
  return chavesDaRecusa(mensagem, "feriado_com_historico:");
}

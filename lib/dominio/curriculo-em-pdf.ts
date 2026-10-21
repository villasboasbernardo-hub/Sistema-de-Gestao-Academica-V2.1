/**
 * O currículo do curso em PDF — spec 020 (Bloco 5), C-5 a C-8.
 *
 * > *"CURRÍCULO EM PDF: carregar e baixar o currículo do curso (Supabase Storage, balde privado, só PDF, limite de
 * > tamanho no balde e no transporte — gotcha 14). Substituir sobrescreve; SEM policy de DELETE (regra 4, STORAGE-1).
 * > Quem carrega: quem edita curso; quem baixa: quem lê o curso."* — Bernardo Villas Boas, 20/10/2026
 *
 * ⚠️ **O LIMITE MORA NO BALDE** (`file_size_limit` de `curriculos`, M1), e quem recusa de verdade é o motor; esta
 *    conferência só antecipa a recusa com a frase em português. O pgTAP `143_bloco_5.sql` cobra que o balde tem o mesmo
 *    número daqui.
 * ⚠️ **O CAMINHO É PELO ID DO CURSO, NÃO PELA SIGLA** — a sigla pode mudar (`curso_sigla_historico`), e o arquivo não
 *    pode ficar órfão quando ela mudar.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

export const BALDE_DE_CURRICULOS = "curriculos";

/** 20 MB — C-6. */
export const LIMITE_DO_CURRICULO_EM_BYTES = 20 * 1024 * 1024;

export const TIPO_DO_CURRICULO = "application/pdf";

/** Um arquivo por curso: substituir sobrescreve. */
export function caminhoDoCurriculo(cursoId: string): string {
  return `${cursoId}/curriculo.pdf`;
}

/** A frase de recusa, ou `null` quando o arquivo pode ir. */
export function recusaDoCurriculo(arquivo: {
  readonly tipo: string;
  readonly tamanho: number;
}): string | null {
  if (arquivo.tipo !== TIPO_DO_CURRICULO) {
    return "O currículo tem de ser um arquivo PDF — só PDF é aceito.";
  }
  if (arquivo.tamanho <= 0) return "O arquivo escolhido está vazio.";
  if (arquivo.tamanho > LIMITE_DO_CURRICULO_EM_BYTES) {
    return "O PDF passa de 20 MB, o limite do currículo. Reduza o arquivo e tente de novo.";
  }
  return null;
}

/**
 * A recusa do balde, em português. ⚠️ O Storage responde por HTTP, com o código em TEXTO (gotcha 11): `403` é a RLS,
 * `413` o tamanho acima do `file_size_limit`, `415` o tipo fora de `allowed_mime_types`.
 */
export function fraseDaRecusaDoArmazenamento(status: string | undefined): string {
  if (status === "403") {
    return "O seu perfil não carrega currículo deste curso (ou o curso está inativo).";
  }
  if (status === "413") {
    return "O PDF passa de 20 MB, o limite do currículo. Reduza o arquivo e tente de novo.";
  }
  if (status === "415") return "O currículo tem de ser um arquivo PDF — só PDF é aceito.";
  return "Não foi possível carregar o PDF agora. Tente de novo; se persistir, procure o suporte.";
}

/**
 * `RN-RESP-1` — as colunas de quem responde, na EDIÇÃO de um lançamento do DSA (emenda de 15/10/2026 à spec 014).
 *
 * > *"RN-RESP-1: aula de disciplina (técnica EO ou prática de disciplina) exige instrutor habilitado. Palestra, AEC,
 * > estudo individual, monitoria, orientação/Apoio Individualizado aceitam responsável de nome livre, sem cadastro e
 * > sem alerta. Aplicador de prova = instrutor habilitado; fiscal e quem conduz a vista = instrutor OU nome livre. O
 * > formulário do DSA e o lançamento em tela oferecem "outro responsável (nome livre)" nesses casos."*
 * > — Bernardo Villas Boas, 15/10/2026
 *
 * ⚠️ **NA ATIVIDADE, INSTRUTOR DO CADASTRO E NOME LIVRE SÃO EXCLUSIVOS** (`CHECK ativ_responsavel_exclusivo`): gravar um
 *    ZERA o outro. Sem isso, quem chama o endpoint só com `instrutorId` numa atividade que tinha nome livre mandaria só
 *    `instrutor_id`, e o banco recusaria com `23514` — o cartão de edição manda os dois campos, mas a Server Action é
 *    endpoint HTTP de fato e não pode depender do cartão. É ESTA função que o garante, e o teste dela o prova.
 * ⚠️ **A VISTA TEM A MESMA FORMA** (`conduz_instrutor_id` × `conduz_nome_externo`): trocar quem conduz pelo cadastro
 *    apaga o nome de fora. O nome livre da vista não é editado por aqui — o campo `responsavelExterno` é o da
 *    ATIVIDADE e não alcança `conduz_nome_externo`.
 * ⚠️ **O NOME LIVRE NUM PAPEL QUE NÃO O ACEITA É RECUSADO** (`recusaDoNomeLivre`, sobre `regraDoResponsavel`): aula e
 *    aplicador pedem o cadastro. Na atividade, a regra é a da CATEGORIA — hoje todas aceitam.
 * ⚠️ **CAMPO NÃO MANDADO NÃO É TOCADO** (`undefined` = *"não mandou"*, `null` = *"apague"*): editar só o horário não
 *    devolve coluna de responsável nenhuma.
 * ⚠️ **A SESSÃO DE APLICAÇÃO NÃO TEM RESPONSÁVEL PRÓPRIO** (`RN-AV-12`, 16/10/2026): o aplicador e o fiscal são os da
 *    avaliação, e mandar `instrutorId` para ela é recusado com a frase de `FRASE_SEM_APLICADOR_NA_SESSAO`.
 * ⚠️ TypeScript puro: sem `next`, sem `react`, sem `supabase` (Princípio II).
 */
import type { CategoriaDeAtividade } from "@/lib/dominio/categoria-pelo-tipo";
import {
  recusaDoNomeLivre,
  regraDoResponsavel,
  type LancamentoDoResponsavel,
} from "@/lib/dominio/responsavel";

import type { OrigemDoFato } from "./posicao-herdada";

export type EntradaDoResponsavelNaEdicao = {
  readonly origem: OrigemDoFato;
  /** A categoria normativa da ATIVIDADE, lida do fato; nas demais origens, `null`. */
  readonly categoria: CategoriaDeAtividade | null;
  readonly instrutorId?: string | null | undefined;
  readonly responsavelExterno?: string | null | undefined;
};

export type ResponsavelNaEdicao =
  | { readonly ok: true; readonly colunas: Readonly<Record<string, string | null>> }
  | {
      readonly ok: false;
      readonly mensagem: string;
      readonly campo: "responsavelExterno" | "instrutorId";
    };

/**
 * A frase da sessão de aplicação: ela não tem aplicador próprio.
 *
 * > *"…é UMA prova com N sessões de aplicação, não N provas."* — `RN-AV-12` (spec 014, emenda de 15/10/2026)
 *
 * ⚠️ Quem aplica e quem fiscaliza a 2ª sessão em diante são os DA AVALIAÇÃO (desenho de 15/10/2026, A1:
 *    *"a emenda não pede papel por sessão"*). Trocar o aplicador pela sessão trocaria o da prova inteira — e o
 *    cartão da sessão faria isso sem dizer. Quem troca é o cartão da 1ª sessão, que é a avaliação.
 */
export const FRASE_SEM_APLICADOR_NA_SESSAO =
  "A sessão de aplicação não tem aplicador próprio: quem aplica é o da prova. Troque-o no lançamento da 1ª sessão.";

/** O papel de quem responde em cada origem: na avaliação, o `instrutorId` editado é o do APLICADOR. */
function lancamentoDa(entrada: EntradaDoResponsavelNaEdicao): LancamentoDoResponsavel {
  switch (entrada.origem) {
    case "aula":
      return { tipo: "aula" };
    case "avaliacao":
    case "sessao_aplicacao":
      return { tipo: "avaliacao", papel: "aplicador" };
    case "vista_prova":
      return { tipo: "vista" };
    case "atividade_nao_letiva":
      return { tipo: "atividade", categoria: entrada.categoria };
  }
}

export function responsavelNaEdicao(entrada: EntradaDoResponsavelNaEdicao): ResponsavelNaEdicao {
  const recusa = recusaDoNomeLivre(
    regraDoResponsavel(lancamentoDa(entrada)),
    entrada.responsavelExterno,
  );
  if (recusa !== null) return { ok: false, mensagem: recusa, campo: "responsavelExterno" };

  const { instrutorId, responsavelExterno } = entrada;
  if (entrada.origem === "sessao_aplicacao" && instrutorId !== undefined) {
    return { ok: false, mensagem: FRASE_SEM_APLICADOR_NA_SESSAO, campo: "instrutorId" };
  }
  const colunas: Record<string, string | null> = {};
  switch (entrada.origem) {
    case "aula":
      if (instrutorId !== undefined) colunas["instrutor_id"] = instrutorId;
      break;
    case "avaliacao":
      if (instrutorId !== undefined) colunas["instrutor_responsavel_id"] = instrutorId;
      break;
    case "sessao_aplicacao":
      /* Nenhuma coluna de responsável: `sessoes_de_aplicacao` não as tem (o aplicador é o da avaliação). */
      break;
    case "vista_prova":
      if (instrutorId !== undefined) {
        colunas["conduz_instrutor_id"] = instrutorId;
        if (instrutorId !== null) colunas["conduz_nome_externo"] = null;
      }
      break;
    case "atividade_nao_letiva":
      if (instrutorId !== undefined) {
        colunas["instrutor_id"] = instrutorId;
        if (instrutorId !== null) colunas["responsavel_externo"] = null;
      }
      if (responsavelExterno !== undefined) {
        colunas["responsavel_externo"] = responsavelExterno;
        if (responsavelExterno !== null) colunas["instrutor_id"] = null;
      }
      break;
  }
  return { ok: true, colunas };
}

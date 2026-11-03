/**
 * Validação de entrada das Server Actions do catálogo de tipos de atividade (Bloco 18, spec 033, RA-1, FR-001.3).
 *
 * ⚠️ **O NOME DO TIPO NOVO É A CHAVE E O RÓTULO** (`valor = rotulo_exibicao`): a chave é o que o gatilho da categoria
 *    (`subtipo := valor`), a sincronização e o ETL casam, e por isso ela NÃO MUDA depois — *Editar* muda só o rótulo e a
 *    classificação padrão (decisão 3 da conferência do passo 0: nenhum tipo existente é renomeado).
 * ⚠️ **A CLASSIFICAÇÃO É OBRIGATÓRIA E SEM PADRÃO**: AEC, TAD ou TR (os componentes da CHT). Estudo Individual e Apoio
 *    Individualizado não se escolhem aqui (decisão 2). O banco tem o irmão: `app.validar_tipo_de_atividade`.
 */
import { z } from "zod";

import { CLASSIFICACOES_DO_CATALOGO } from "@/lib/dominio/atividades/catalogo-de-tipos";

/** O nome cabe numa célula da grade do DSA e no papel; 80 é folga sobre o maior de hoje («Português para Estrangeiros»). */
export const TAMANHO_MAXIMO_DO_NOME_DO_TIPO = 80;

const nome = z
  .string({ error: "O nome do tipo é obrigatório." })
  .trim()
  .min(1, "O nome do tipo é obrigatório.")
  .max(
    TAMANHO_MAXIMO_DO_NOME_DO_TIPO,
    `O nome do tipo tem no máximo ${TAMANHO_MAXIMO_DO_NOME_DO_TIPO} caracteres.`,
  )
  .transform((t) => t.replace(/\s+/g, " "));

const classificacao = z.enum(CLASSIFICACOES_DO_CATALOGO, {
  error: "Escolha a classificação padrão: AEC, TAD ou TR.",
});

const id = z.uuid({ error: "Tipo de atividade inválido. Recarregue a página." });

export const esquemaDoTipoNovo = z.object({ rotulo: nome, classificacao });

export const esquemaDaEdicaoDoTipo = z.object({ id, rotulo: nome, classificacao });

/** O que desativar e reativar precisam, e nada mais: mandar a linha inteira deixaria o rótulo viajar junto. */
export const esquemaDaSituacaoDoTipo = z.object({ id });

export type TipoNovo = z.infer<typeof esquemaDoTipoNovo>;
export type EdicaoDoTipo = z.infer<typeof esquemaDaEdicaoDoTipo>;

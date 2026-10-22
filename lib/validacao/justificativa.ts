/**
 * RC-6 (Bernardo Villas Boas, 21/10/2026) — a justificativa da correção de um currículo seguido por turma com
 * lançamento.
 *
 * > *"RC-6 · Correção de erro. Corrigir um currículo que já tem turma com lançamento (mudar valor, acrescentar ou
 * > inativar item) é permitido só ao trio (…), com justificativa obrigatória e trilha (quem, quando, o quê, valor
 * > anterior)."*
 *
 * ⚠️ OPCIONAL AQUI, e é de propósito: quem decide se ela é obrigatória é o BANCO (`app.guardar_curriculo_em_uso`), que
 *    sabe se o currículo está em uso e se a mudança é correção ou só completar o vazio. A tela a pede quando o banco
 *    responde `justificativa_obrigatoria`, e manda de novo com ela.
 * ⚠️ O mínimo (5 letras) é o MESMO do banco (`correcoes_de_curriculo.justificativa` e o gatilho): uma justificativa
 *    que o formulário aceitasse e o banco recusasse seria a frase errada na hora errada.
 */
import { z } from "zod";

export const MINIMO_DA_JUSTIFICATIVA = 5;
export const MAXIMO_DA_JUSTIFICATIVA = 1000;

export const campoDeJustificativa = z
  .string()
  .trim()
  .min(
    MINIMO_DA_JUSTIFICATIVA,
    `A justificativa da correção precisa de ao menos ${MINIMO_DA_JUSTIFICATIVA} letras.`,
  )
  .max(MAXIMO_DA_JUSTIFICATIVA, `A justificativa passou de ${MAXIMO_DA_JUSTIFICATIVA} caracteres.`)
  .optional();

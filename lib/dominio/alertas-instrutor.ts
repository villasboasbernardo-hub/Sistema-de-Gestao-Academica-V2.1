/**
 * Os alertas normativos da ficha do instrutor (`FR-016`, `FR-017` e `FR-018` da spec 006).
 *
 * > *"Regra normativa vira alerta, nunca bloqueio."* — `RN-DEG-02`, regra 6 do contrato do projeto
 *
 * > *"O alerta do FR-016 dispara quando ALGUMA semana coberta sai da faixa do regime — limites
 * > inclusivos — e a mensagem nomeia a semana."* — decisão de Bernardo Villas Boas, 15/09/2026
 *
 * > *"MUST ser sinalizado o instrutor em docência há mais de um ano sem capacitação didática"*
 * > — `FR-017` · *"com `data_inicio_docencia_ciaara` vazia, o alerta do FR-017 NÃO dispara — sem data
 * > não há como contar o ano"* — decisão de Bernardo Villas Boas, 15/09/2026
 *
 * ⚠️ O RESULTADO É SÓ AVISO. Não há campo que uma tela possa usar para desabilitar gravação, e nenhum
 * alerta daqui vira `CHECK`, policy que nega ou botão desabilitado — transformá-los em impedimento
 * mudaria a regra de negócio.
 *
 * ⚠️ A DATA VAZIA NÃO É SILÊNCIO: ela vira aviso no quadro de qualidade de cadastro
 * (`lib/dominio/avisos-cadastro-instrutor.ts`, "Data de início de docência não informada").
 *
 * ⚠️ "MAIS DE UM ANO" É ESTRITO. Quem começou em 15/09/2025 completa um ano em 15/09/2026 e ainda não
 * alerta; alerta a partir de 16/09/2026. As datas são texto `AAAA-MM-DD`, comparadas sem fuso.
 */

import type { SemanaForaDaFaixa } from "./carga-semanal";
import type { FaixaDoRegime } from "./carga-horaria";

export type AlertaDoInstrutor = {
  readonly chave: "fora-da-faixa" | "sem-capacitacao";
  readonly titulo: string;
  readonly detalhes: readonly string[];
};

const vazio = (texto: string | null): boolean => texto === null || texto.trim() === "";

/** `AAAA-MM-DD` → `DD/MM`. */
const diaMes = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;
/** `AAAA-MM-DD` → `DD/MM/AAAA`. */
const diaMesAno = (data: string) => `${diaMes(data)}/${data.slice(0, 4)}`;
const horas = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} h`;

/** `FR-016` · uma linha por semana fora da faixa, com a semana nomeada. */
export function alertaForaDaFaixa(
  semanas: readonly SemanaForaDaFaixa[],
  faixa: FaixaDoRegime | null,
): AlertaDoInstrutor | null {
  if (faixa === null || semanas.length === 0) return null;
  const limites = `${horas(faixa.minimo).replace(" h", "")} a ${horas(faixa.maximo)}`;
  return {
    chave: "fora-da-faixa",
    titulo: "Carga semanal prevista fora da faixa do regime",
    detalhes: semanas.map(
      (s) =>
        `Semana ${s.semana.numero}/${s.semana.ano} (${diaMes(s.semana.segunda)} a ${diaMes(s.semana.domingo)}): ` +
        `${horas(s.carga)}, ${s.situacao === "acima" ? "acima" : "abaixo"} da faixa de ${limites}.`,
    ),
  };
}

export type DadosDeCapacitacao = {
  readonly dataInicioDocenciaCiaara: string | null;
  readonly capacitacaoDidatica: string | null;
};

/** `FR-017` · docência no CIAARA há **mais** de um ano e capacitação vazia; data vazia não alerta. */
export function alertaSemCapacitacao(
  dados: DadosDeCapacitacao,
  hoje: string,
): AlertaDoInstrutor | null {
  if (!vazio(dados.capacitacaoDidatica)) return null;
  const inicio = dados.dataInicioDocenciaCiaara?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio)) return null;
  const aniversario = `${Number(inicio.slice(0, 4)) + 1}${inicio.slice(4)}`;
  if (!(hoje > aniversario)) return null;
  return {
    chave: "sem-capacitacao",
    titulo: "Docência há mais de um ano sem capacitação didática",
    detalhes: [
      `Em docência no CIAARA desde ${diaMesAno(inicio)}, sem capacitação didática registrada.`,
    ],
  };
}

/**
 * `RN-AV-13` — a vista de prova é obrigatória só para PM e PO (emenda de 15/10/2026 à spec 014).
 *
 * > *"RN-AV-13: vista é obrigatória só para PM e PO. PP, T e TG não geram alerta de vista; se a planilha trouxer
 * > vista, registra."* — Bernardo Villas Boas, 15/10/2026
 *
 * ⚠️ **O DADO NÃO MORA AQUI.** A lista dos instrumentos que exigem vista é `vistaObrigatoria` de
 *    `./instrumentos.json`, o MESMO arquivo que a sincronização lê (`scripts/carga_dsa/regras_de_prova.py`). Uma
 *    regra, um arquivo: escrever a lista à mão aqui ou numa tela a faria divergir da carga em silêncio — e a guarda
 *    `tests/unidade/instrumentos-dado-unico.test.ts` reprova quem tentar.
 * ⚠️ **LEITURA LITERAL** (interpretação a confirmar por Bernardo, `aprovacoes-pendentes.md` de 15/10/2026): só PM e PO
 *    exigem. PE, PD, TI, PP, TG, OD e os demais NÃO geram alerta de vista — a vista lançada continua registrada.
 * ⚠️ **INSTRUMENTO NULO = EXIGE, COMO ANTES.** A prova sem item do currículo ligado não tem instrumento no banco
 *    (`avaliacoes` não guarda o instrumento; é o item b do desenho de 15/10/2026). Sem saber o instrumento, a situação
 *    dela continua a de hoje — e ela já fica fora do ALERTA pela decisão de 14/10/2026 (`alertas-de-vista.ts`).
 * ⚠️ **O ESPELHO SQL AINDA NÃO SEGUE ESTA REGRA.** `app.fn_status_vista` (a view e o pgTAP cruzado) continua decidindo
 *    pelo TEMPO de vista do item até a migration do desenho (`specs/014-atividades-e-avaliacoes/desenho-emenda-15-10.md`,
 *    item c) ser aprovada e aplicada. Até lá, a tela decide por aqui e a view, pelo tempo.
 * ⚠️ TypeScript puro: sem `next`, sem `react`, sem `supabase` (Princípio II).
 */
import instrumentos from "./instrumentos.json";

const VISTA_OBRIGATORIA: ReadonlySet<string> = new Set(
  instrumentos.vistaObrigatoria.map((i) => i.trim().toUpperCase()),
);

/** O instrumento do currículo (`config_listas.instrumentos_avaliacao.valor`: `PM`, `PP`, `TG`…), ou nulo. */
export type EntradaDaVistaObrigatoria = { readonly instrumento: string | null | undefined };

/** O instrumento exige vista? Nulo (prova sem item ligado) → sim, como antes da emenda. */
export function exigeVista(entrada: EntradaDaVistaObrigatoria): boolean {
  const instrumento = entrada.instrumento?.trim().toUpperCase() ?? "";
  if (instrumento === "") return true;
  return VISTA_OBRIGATORIA.has(instrumento);
}

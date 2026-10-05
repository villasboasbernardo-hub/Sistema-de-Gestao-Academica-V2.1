/**
 * As grades de relógio REAIS, para os testes do DSA — **dado medido, nunca inventado**.
 *
 * ⚠️ **AS DUAS PRIMEIRAS SÃO A OPERAÇÃO; AS CINCO SEGUINTES SÃO O BANCO, E ELAS NÃO CONCORDAM.** As
 * grades **G45** e **G50** vêm da §1.3 de `specs/013-detalhe-semanal-de-aula/praticas-da-planilha.md`
 * — medidas por **Bernardo Villas Boas** em 15 planilhas, 05/10/2026. As **CFG-A a CFG-E** vêm de
 * `horarios_tempos_aula` no banco **remoto**, lidas só por `select` em 05/10/2026: **40 TA**, todas
 * começando às **08:00**.
 *
 * ⚠️ **ELAS EXISTEM JUNTAS DE PROPÓSITO.** A `R-2` do pedido manda testar o relógio *"com as grades
 * REAIS G45 e G50 e com as cinco configurações do catálogo, sem arredondamento de minuto"*. A G45 e a
 * G50 provam a **derivação** do regime; as cinco provam a **leitura** do catálogo. E a divergência
 * entre os dois conjuntos é o que a `Q-6` corrige, como **dado**, numa vigência nova por curso.
 */

import type { RegimeParaRelogio, TempoDoCatalogo } from "@/lib/dominio/dsa/horario-do-bloco";

/**
 * **G45** — TA de 45 min, intervalos de 5 min, **cinco** TA de manhã.
 *
 * Usada por CAHO, C-Ap-HN e C-Ap-FR. Medida: `07:50-08:35, 08:40-09:25, 09:30-10:15, 10:20-11:05,
 * 11:10-11:55 | almoço | 13:05-13:50, 13:55-14:40, 14:45-15:30, 15:35-16:20`.
 */
export const G45: RegimeParaRelogio = {
  regimeTempos: 8,
  taDuracaoMin: 45,
  intervaloManhaMin: 5,
  intervaloTardeMin: 5,
  horaInicioManha: "07:50",
  horaInicioTarde: "13:05",
  configuracaoHorarioId: null,
};

/** A G45 na vigência de **exceção** — 9 TA, o 9º sendo o "tempo opcional" da `RF-HOR-03`. */
export const G45_EXCECAO: RegimeParaRelogio = { ...G45, regimeTempos: 9 };

/**
 * **G50** — TA de 50 min, intervalo de **10 min de manhã e 5 à tarde**, **quatro** TA de manhã.
 *
 * Usada por C-Espc-HN, C-Espc-FR e C-Esp-ME. Medida: `08:10-09:00, 09:10-10:00, 10:10-11:00,
 * 11:10-12:00 | almoço | 13:05-13:55, 14:00-14:50, 14:55-15:45, 15:50-16:40`.
 */
export const G50: RegimeParaRelogio = {
  regimeTempos: 7,
  taDuracaoMin: 50,
  intervaloManhaMin: 10,
  intervaloTardeMin: 5,
  horaInicioManha: "08:10",
  horaInicioTarde: "13:05",
  configuracaoHorarioId: null,
};

/** A G50 na vigência de **exceção** — 8 TA, a que o C-Espc-HN usa nos dias cheios. */
export const G50_EXCECAO: RegimeParaRelogio = { ...G50, regimeTempos: 8 };

/** O relógio esperado da **G45**, TA a TA — `HH:MM-HH:MM`, derivado. */
export const G45_ESPERADA: readonly string[] = [
  "07:50-08:35",
  "08:40-09:25",
  "09:30-10:15",
  "10:20-11:05",
  "11:10-11:55",
  "13:05-13:50",
  "13:55-14:40",
  "14:45-15:30",
  "15:35-16:20",
  "16:25-17:10",
  "17:15-18:00",
  "18:05-18:50",
];

/** O relógio esperado da **G50**, TA a TA. */
export const G50_ESPERADA: readonly string[] = [
  "08:10-09:00",
  "09:10-10:00",
  "10:10-11:00",
  "11:10-12:00",
  "13:05-13:55",
  "14:00-14:50",
  "14:55-15:45",
  "15:50-16:40",
  "16:45-17:35",
  "17:40-18:30",
  "18:35-19:25",
  "19:30-20:20",
];

/** Quantos TA cabem na manhã de cada grade — **derivado**, pelo limite de 12:00. */
export const MANHA_ESPERADA = { G45: 5, G50: 4 } as const;

/**
 * As **cinco** configurações do catálogo, como estão no banco remoto.
 *
 * ⚠️ **TODAS COMEÇAM ÀS 08:00**, e é essa a divergência que a `Q-6` corrige. ⚠️ **E a CFG-E tem
 * CINCO TA de manhã, com o quinto encerrando 12:05** — ela é uma das duas que a `RF-HOR-04` nomeia
 * como fora da janela de almoço (as duas usam CFG-E, medido), e é o caso que justifica a derivação
 * do regime parar em **12:00 em ponto**.
 */
export const CATALOGO: Readonly<Record<string, readonly TempoDoCatalogo[]>> = {
  "CFG-A": catalogo([
    [1, "manha", "08:00", "08:50"],
    [2, "manha", "09:00", "09:50"],
    [3, "manha", "10:00", "10:50"],
    [4, "manha", "11:00", "11:50"],
    [5, "tarde", "13:00", "13:50"],
    [6, "tarde", "14:00", "14:50"],
    [7, "tarde", "15:00", "15:50"],
  ]),
  "CFG-B": catalogo([
    [1, "manha", "08:00", "08:50"],
    [2, "manha", "09:00", "09:50"],
    [3, "manha", "10:00", "10:50"],
    [4, "manha", "11:00", "11:50"],
    [5, "tarde", "13:05", "13:55"],
    [6, "tarde", "14:05", "14:55"],
    [7, "tarde", "15:05", "15:55"],
    [8, "tarde", "16:05", "16:55"],
  ]),
  "CFG-C": catalogo([
    [1, "manha", "08:00", "08:45"],
    [2, "manha", "08:55", "09:40"],
    [3, "manha", "09:50", "10:35"],
    [4, "manha", "10:45", "11:30"],
    [5, "tarde", "13:00", "13:45"],
    [6, "tarde", "13:55", "14:40"],
    [7, "tarde", "14:50", "15:35"],
    [8, "tarde", "15:45", "16:30"],
  ]),
  // ⚠️ A CFG-D é a única com `tipo_tempo = excepcional`: o 9º TA, 16:40-17:25.
  "CFG-D": [
    ...catalogo([
      [1, "manha", "08:00", "08:45"],
      [2, "manha", "08:55", "09:40"],
      [3, "manha", "09:50", "10:35"],
      [4, "manha", "10:45", "11:30"],
      [5, "tarde", "13:00", "13:45"],
      [6, "tarde", "13:55", "14:40"],
      [7, "tarde", "14:50", "15:35"],
      [8, "tarde", "15:45", "16:30"],
    ]),
    {
      tempoNumero: 9,
      periodo: "tarde",
      tipoTempo: "excepcional",
      horaInicio: "16:40",
      horaFim: "17:25",
    },
  ],
  "CFG-E": catalogo([
    [1, "manha", "08:00", "08:45"],
    [2, "manha", "08:50", "09:35"],
    [3, "manha", "09:40", "10:25"],
    [4, "manha", "10:30", "11:15"],
    [5, "manha", "11:20", "12:05"],
    [6, "tarde", "13:00", "13:45"],
    [7, "tarde", "13:50", "14:35"],
    [8, "tarde", "14:40", "15:25"],
  ]),
};

/** Quantos TA cada configuração tem — medido: **40** no total. */
export const TEMPOS_POR_CONFIGURACAO: Readonly<Record<string, number>> = {
  "CFG-A": 7,
  "CFG-B": 8,
  "CFG-C": 8,
  "CFG-D": 9,
  "CFG-E": 8,
};

function catalogo(
  linhas: readonly [number, "manha" | "tarde", string, string][],
): readonly TempoDoCatalogo[] {
  return linhas.map(([tempoNumero, periodo, horaInicio, horaFim]) => ({
    tempoNumero,
    periodo,
    tipoTempo: "normal" as const,
    horaInicio,
    horaFim,
  }));
}

/**
 * A montagem da planilha de contingência do DSA — `contracts/planilha.md` da spec 015.
 *
 * > *"o DSA é usado todo dia. Se o sistema falhar, quebrar ou tiver um defeito que impeça o DSA da
 * > semana, o operador precisa de um «estepe»: baixar UMA PLANILHA DA TURMA (.xlsx) e fazer o DSA
 * > manualmente, com total liberdade de edição, imprimir e publicar, até o defeito ser corrigido."*
 * > — pedido de Bernardo Villas Boas, 08/10/2026
 *
 * ⚠️ **ESTA FUNÇÃO SÓ ARRANJA.** O papel de cada semana chega pronto do domínio do DSA (o mesmo do
 * `/print/dsa`); o catálogo sai de `preencherLancamento`; o relógio, de `relogioDaSemana`. Aqui ele vira
 * abas, na ordem do contrato — PREENCHIMENTO · IMPRESSÃO · BD DISCIPLINAS · HORÁRIOS —, com a entrada
 * ativa e rolada até a semana inicial.
 *
 * ⚠️ **TypeScript puro** (regra 9): devolve o modelo da pasta; quem escreve o `.xlsx` é
 * `lib/planilha/ooxml.ts`, chamado pela rota.
 */
import type { Pasta } from "../../planilha/pasta";

import {
  abaDoCatalogo,
  chaveDaSemanaIso,
  itensDoCatalogo,
  tecnicasDaLegenda,
} from "./planilha/catalogo";
import {
  AVISO_SEMANA_SEM_RELOGIO,
  abaDeHorarios,
  relogiosDaPasta,
  temposDaGrade,
} from "./planilha/horarios";
import {
  abaDeImpressao,
  geometriaDaImpressao,
  type GeometriaDaImpressao,
} from "./planilha/impressao";
import {
  abaDeEntrada,
  geometriaDaEntrada,
  retratoDaSemana,
  type GeometriaDaEntrada,
} from "./planilha/preenchimento";
import { semanaIsoDe } from "../carga-semanal";
import type { InsumoDaPlanilha } from "./planilha/tipos";

/** Linhas de sobra na lista *sem posição* de cada semana, para o que for lançado offline. */
export const LINHAS_DE_SOBRA_SEM_POSICAO = 1;

/** A pasta e as duas geometrias — a suíte precisa delas para pôr o seletor em cada semana. */
export function montarPlanilhaComGeometria(insumo: InsumoDaPlanilha): {
  readonly pasta: Pasta;
  readonly entrada: GeometriaDaEntrada;
  readonly impressao: GeometriaDaImpressao;
} {
  const { itens, avisos: avisosDoCatalogo } = itensDoCatalogo(insumo);
  const { relogios, idDaSemana } = relogiosDaPasta(insumo.semanas);

  let ultimoOcupado = 0;
  for (const semana of insumo.semanas) {
    for (const dia of semana.dias) {
      for (const linha of dia.linhas) {
        if (linha.taInicial === null) continue;
        ultimoOcupado = Math.max(
          ultimoOcupado,
          linha.taInicial + Math.max(1, linha.tempos ?? 1) - 1,
        );
      }
    }
  }
  const tempos = temposDaGrade({ relogios: relogios.map((r) => r.relogio), ultimoOcupado });
  const catalogo = new Map(itens.map((i) => [i.chave.toUpperCase(), i]));
  const retratos = insumo.semanas.map((s) => retratoDaSemana(s, insumo, catalogo, tempos));
  const linhasSemPosicao = Math.max(
    2,
    ...retratos.map((r) => r.semPosicao.length + LINHAS_DE_SOBRA_SEM_POSICAO),
  );
  const geometria = geometriaDaEntrada(insumo.semanas.length, tempos, linhasSemPosicao);

  const semRelogio = idDaSemana.filter((id) => id === null).length;
  const comAvisos: InsumoDaPlanilha = {
    ...insumo,
    avisos: [
      ...insumo.avisos,
      ...avisosDoCatalogo,
      ...(semRelogio > 0 ? [`${semRelogio} ${AVISO_SEMANA_SEM_RELOGIO}`] : []),
    ],
  };

  const entrada = abaDeEntrada({
    insumo: comAvisos,
    catalogo: itens,
    idDaSemana,
    geometria,
    retratos,
  });
  const geometriaDoPapel = geometriaDaImpressao({
    temSabado: insumo.temSabado,
    tempos,
    linhasSemPosicao,
    disciplinas: insumo.disciplinas.length,
    tecnicas: tecnicasDaLegenda(insumo).length,
  });
  const impressao = abaDeImpressao({
    entrada: geometria,
    geometria: geometriaDoPapel,
    turma: insumo.turma.codigo,
    curso: insumo.turma.curso,
    geradaEm: insumo.geradaEm,
    rotuloInicial: insumo.semanas[insumo.semanaInicial]?.rotulo ?? insumo.semanas[0]?.rotulo ?? "",
  });
  const inicio = insumo.turma.dataInicio === null ? null : semanaIsoDe(insumo.turma.dataInicio);
  const catalogoDaPasta = abaDoCatalogo({
    insumo,
    itens,
    rotulosDasSemanas: insumo.semanas.map((s) => s.rotulo),
    chaveDaSemanaDoInicio: inicio === null ? null : chaveDaSemanaIso(inicio.ano, inicio.numero),
  });
  const horarios = abaDeHorarios(relogios);

  return {
    pasta: {
      abas: [entrada, impressao, catalogoDaPasta.aba, horarios.aba],
      nomes: [...catalogoDaPasta.nomes, ...horarios.nomes],
      abaAtiva: 0,
      propriedades: {
        titulo: `Planilha de contingência do DSA — ${insumo.turma.codigo}`,
        autor: insumo.geradaPor,
        criadaEm: insumo.geradaEm,
      },
    },
    entrada: geometria,
    impressao: geometriaDoPapel,
  };
}

export function montarPlanilhaDeContingencia(insumo: InsumoDaPlanilha): Pasta {
  return montarPlanilhaComGeometria(insumo).pasta;
}

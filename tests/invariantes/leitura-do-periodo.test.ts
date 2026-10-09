/**
 * A leitura do período e a leitura da semana são a MESMA montagem — R-2 da spec 015.
 *
 * > *"Geração no servidor (Route Handler), a partir do mesmo domínio do DSA (lib/dominio/dsa/), sem
 * > segunda implementação de horário, grade ou situação."*
 * > — restrição de Bernardo Villas Boas para a spec 015, 08/10/2026
 *
 * ⚠️ **A PLANILHA LÊ O ANO INTEIRO UMA VEZ, e a tela lê uma semana** — mas as duas passam por
 * `montarSemanaDoDsa`. Este teste é o que impede a montagem do período de divergir da da semana: para
 * cada semana do período de três turmas da semente do DSA (relógio normal, vigência trocando no meio
 * do ano e sem relógio), a semana recortada da leitura do período tem de ser IGUAL, campo a campo, à
 * semana lida sozinha.
 *
 * ⚠️ **A semente é a dos percursos do DSA** (`tests/e2e/dsa-de-teste.ts`): bloco atravessando o
 * almoço, aula de sábado, aula sem TA, avaliação herdada no TA 1, os três impactos de feriado e as
 * assinaturas de abril e de julho. Reaproveitá-la é o que faz este teste olhar os casos que a tela já
 * prova, em vez de uma amostra que só dá certo.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  lerPeriodoDoDsa,
  lerSemanaDoDsa,
  montarSemanaDoDsa,
} from "@/app/(app)/turmas/[turma]/dsa/leitura";
import { datasDaSemanaIso, semanaIsoDe } from "@/lib/dominio/carga-semanal";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "../e2e/conta-de-teste";
import { sessaoDe } from "../e2e/curso-de-teste";
import { limparDsa, semearDsa, type DsaSemeado } from "../e2e/dsa-de-teste";

const PROCESSO = 94;
const HOJE = "2026-10-09";

type Cliente = Parameters<typeof lerSemanaDoDsa>[0];

const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

let EMAIL = "";
let semeado: DsaSemeado | undefined;
let sessao: SupabaseClient;

beforeAll(async () => {
  EMAIL = emailDeTeste("periodo", PROCESSO);
  await criarConta(EMAIL, `USR-PER-${PROCESSO}`);
  semeado = await semearDsa(PROCESSO, EMAIL);
  sessao = await sessaoDe(EMAIL);
}, 180_000);

afterAll(async () => {
  await limparDsa(semeado);
  await apagarConta(EMAIL);
});

/** As semanas ISO do período da turma, da de `data_inicio` à de `data_termino`. */
function semanasDoPeriodo(inicio: string, termino: string) {
  const semanas: { ano: number; numero: number }[] = [];
  const dia = new Date(`${inicio}T12:00:00Z`);
  const fim = new Date(`${termino}T12:00:00Z`);
  const vistas = new Set<string>();
  while (dia <= fim) {
    const s = semanaIsoDe(dia.toISOString().slice(0, 10));
    if (s && !vistas.has(`${s.ano}-${s.numero}`)) {
      vistas.add(`${s.ano}-${s.numero}`);
      semanas.push({ ano: s.ano, numero: s.numero });
    }
    dia.setUTCDate(dia.getUTCDate() + 1);
  }
  return semanas;
}

describe("R-2 · a semana recortada do período é a semana lida sozinha", () => {
  it.each(["turmaComRelogio", "turmaComVigenciaNova", "turmaSemRelogio"] as const)(
    "%s: igual em toda semana do período, com e sem sábado pedido",
    async (qual) => {
      const codigo = (semeado as DsaSemeado)[qual];
      const { data: turma, error } = await admin
        .from("turmas")
        .select("id, curso_id, data_inicio, data_termino")
        .eq("codigo", codigo)
        .single();
      if (error || !turma) throw new Error(`turma ${codigo}: ${error?.message}`);

      const semanas = semanasDoPeriodo(turma.data_inicio as string, turma.data_termino as string);
      expect(semanas.length).toBeGreaterThan(40);
      const primeira = semanas[0] as { ano: number; numero: number };
      const ultima = semanas[semanas.length - 1] as { ano: number; numero: number };
      const cliente = sessao as unknown as Cliente;

      const periodo = await lerPeriodoDoDsa(cliente, {
        turmaId: turma.id as string,
        cursoId: turma.curso_id as string,
        de: datasDaSemanaIso(primeira.ano, primeira.numero)[0] as string,
        ate: datasDaSemanaIso(ultima.ano, ultima.numero)[5] as string,
        comConflitos: true,
      });

      /*
       * ⚠️ **SÓ O ERRO QUE JÁ EXISTIA** — a consulta das atribuições por UE pede uma coluna que não
       * existe (ver `DadosDoPeriodo.erros`). Qualquer outro erro faria a leitura degradar calada, e a
       * comparação passaria comparando vazio com vazio.
       */
      expect(periodo.erros.map((e) => e.lista)).toEqual(["atribuições por UE"]);

      /*
       * ⚠️ **UMA SEMANA DE CADA VEZ.** Com vinte leituras em paralelo, alguma consulta falhava sob a
       * carga do banco local e a semana degradava para «sem marca de conflito» — que é o comportamento
       * certo da tela, e fazia a comparação reprovar por causa da prova, não da leitura (medido em
       * 09/10/2026: a mesma semana passava e reprovava em rodadas seguidas).
       */
      for (const s of semanas) {
        for (const sabadoPedido of [false, true]) {
          const sozinha = await lerSemanaDoDsa(cliente, {
            turmaId: turma.id as string,
            cursoId: turma.curso_id as string,
            ano: s.ano,
            numero: s.numero,
            sabadoPedido,
            hoje: HOJE,
          });
          const recortada = montarSemanaDoDsa(periodo, {
            ano: s.ano,
            numero: s.numero,
            sabadoPedido,
            hoje: HOJE,
          });
          expect(recortada, `semana ${s.numero}, sábado pedido ${sabadoPedido}`).toEqual(sozinha);
        }
      }
    },
    240_000,
  );
});

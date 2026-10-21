/**
 * O RETRATO DAS TELAS — spec 021 (Bloco 6, currículo versionado), a prova de que a ligação de toda turma à versão 1
 * NÃO muda número nenhum: para cada turma do banco, a planilha de contingência (o insumo e o arquivo `.xlsx`), os
 * extras da impressão do DSA e o documento de CADA semana com lançamento, com o "hoje" fixo. Tira-se antes e depois
 * da migration, na mesma base (a cópia do remoto), e o `diff` dos dois arquivos tem de ser vazio.
 *
 * ⚠️ SÓ RODA COM `RETRATO_SAIDA` (o caminho do JSON): é instrumento de medição, não teste da suíte. No CI fica pulado.
 *    `RETRATO_SAIDA=… pnpm exec vitest run tests/invariantes/retrato-das-telas.test.ts`
 * ⚠️ SÓ LEITURA, menos a conta de teste da sessão, que nasce e sai aqui.
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  COLUNAS_DA_TURMA_DA_PLANILHA,
  lerDadosDaPlanilha,
  type TurmaDaPlanilha,
} from "@/app/(app)/turmas/[turma]/dsa/planilha/leitura";
import { lerExtrasDaImpressao, lerSemanaDoDsa } from "@/app/(app)/turmas/[turma]/dsa/leitura";
import { montarDocumentoDoDsa } from "@/app/print/dsa/documento";
import { montarPlanilhaComGeometria } from "@/lib/dominio/dsa/planilha-de-contingencia";
import { escreverXlsx } from "@/lib/planilha/ooxml";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "../e2e/conta-de-teste";
import { sessaoDe } from "../e2e/curso-de-teste";

const SAIDA = process.env.RETRATO_SAIDA ?? "";
const HOJE = "2026-10-20";
const GERADA_EM = "2026-10-20T12:00:00.000Z";

type Cliente = Parameters<typeof lerSemanaDoDsa>[0];

const md5 = (valor: unknown) =>
  createHash("md5")
    .update(
      typeof valor === "string" || valor instanceof Uint8Array ? valor : JSON.stringify(valor),
    )
    .digest("hex");

const admin = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EMAIL = emailDeTeste("retrato", 97);
let sessao: Awaited<ReturnType<typeof sessaoDe>> | undefined;

describe.skipIf(SAIDA === "")("spec 021 · o retrato das telas, turma a turma", () => {
  beforeAll(async () => {
    await criarConta(EMAIL, "USR-RETRATO-97", "admin");
    sessao = await sessaoDe(EMAIL);
  });

  afterAll(async () => {
    await apagarConta(EMAIL);
  });

  it("escreve o retrato de todas as turmas", async () => {
    const { data, error } = await admin
      .from("turmas")
      .select(COLUNAS_DA_TURMA_DA_PLANILHA)
      .order("codigo");
    if (error) throw new Error(error.message);
    const turmas = (data ?? []) as unknown as TurmaDaPlanilha[];
    expect(turmas.length).toBeGreaterThan(0);

    const retrato: Record<string, unknown> = {};
    for (const turma of turmas) {
      const cliente = sessao as unknown as Cliente;
      try {
        const insumo = await lerDadosDaPlanilha(cliente, turma, {
          hoje: HOJE,
          geradaEm: GERADA_EM,
          geradaPor: "Prova do retrato",
        });
        const arquivo = escreverXlsx(montarPlanilhaComGeometria(insumo).pasta);
        const extras = await lerExtrasDaImpressao(cliente, {
          turmaId: turma.id,
          cursoId: turma.curso_id,
        });
        const semanas: Record<string, string> = {};
        for (const s of insumo.semanas) {
          if (!s.dias.some((d) => d.linhas.some((l) => !l.chave.startsWith("ei-")))) continue;
          const escolha = { ano: s.semana.ano, numero: s.semana.numero };
          const lida = await lerSemanaDoDsa(cliente, {
            turmaId: turma.id,
            cursoId: turma.curso_id,
            ...escolha,
            sabadoPedido: false,
            hoje: HOJE,
          });
          semanas[s.rotulo] = md5(
            montarDocumentoDoDsa({
              codigoDaTurma: turma.codigo,
              turma,
              cursoId: turma.curso_id,
              escolha,
              lida,
              extras,
              hoje: HOJE,
            }),
          );
        }
        retrato[turma.codigo] = {
          planilha: md5(insumo),
          xlsx: md5(arquivo),
          extras: md5(extras),
          semanasComLancamento: Object.keys(semanas).length,
          semanas,
        };
      } catch (e) {
        retrato[turma.codigo] = { erro: (e as Error).message };
      }
    }
    writeFileSync(SAIDA, `${JSON.stringify(retrato, null, 2)}\n`, "utf8");
  }, 900_000);
});

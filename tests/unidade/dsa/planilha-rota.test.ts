/**
 * A rota de download da planilha de contingência — `contracts/rota-de-download.md`, `FR-003`,
 * `FR-005`, `FR-006` da spec 015 — com as dependências substituídas.
 */
import { describe, expect, it, vi } from "vitest";

/*
 * ⚠️ A matriz de permissões é módulo de servidor (`server-only`) e lê o banco; aqui só se usa a
 * função pura `pode` dela, então o cliente do servidor nunca é chamado.
 */
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  criarClienteDeServidor: async () => {
    throw new Error("o teste da rota não fala com o banco");
  },
}));

import {
  responderDownload,
  TIPO_DO_XLSX,
  type DependenciasDaRota,
} from "@/app/(app)/turmas/[turma]/dsa/planilha/resposta";
import type { TurmaDaPlanilha } from "@/app/(app)/turmas/[turma]/dsa/planilha/leitura";
import { enderecoDaPlanilhaDeContingencia, enderecoDoDsa } from "@/lib/navegacao/endereco-de-turma";

import { insumoSintetico } from "./planilha/sintetico";

const TURMA: TurmaDaPlanilha = {
  id: "t1",
  codigo: "C-TESTE 2026",
  curso_id: "c1",
  modalidade: "presencial",
  sala_alocada: null,
  alunos: 12,
  data_inicio: "2026-04-06",
  data_termino: "2026-04-24",
  inicio_etapa_presencial: null,
  termino_etapa_presencial: null,
};

const BASE = "http://localhost:3100";
const pedido = new Request(`${BASE}${enderecoDaPlanilhaDeContingencia(TURMA.codigo)}`);
const segmento = encodeURIComponent(TURMA.codigo);

function dependencias(parcial: Partial<DependenciasDaRota> = {}): DependenciasDaRota {
  return {
    permissoes: async () => new Set(["registros_aula:ler", "registros_aula:criar"]),
    nomeDeQuemGera: async () => "Operador de Teste",
    turma: async (codigo) => (codigo === TURMA.codigo ? TURMA : null),
    ler: async () => insumoSintetico(),
    escrever: () => new Uint8Array([0x50, 0x4b, 3, 4]),
    hoje: () => "2026-10-09",
    agora: () => new Date("2026-10-09T13:00:00Z"),
    ...parcial,
  };
}

describe("quem pode", () => {
  it("sem `registros_aula.criar`: 404", async () => {
    const r = await responderDownload(
      pedido,
      segmento,
      dependencias({ permissoes: async () => new Set(["registros_aula:ler"]) }),
    );
    expect(r.status).toBe(404);
  });

  it("`FR-003` · turma inexistente ou fora do alcance: o MESMO 404, com o mesmo corpo", async () => {
    const semPermissao = await responderDownload(
      pedido,
      segmento,
      dependencias({ permissoes: async () => new Set() }),
    );
    const inexistente = await responderDownload(
      pedido,
      encodeURIComponent("NÃO EXISTE"),
      dependencias(),
    );
    expect([semPermissao.status, inexistente.status]).toEqual([404, 404]);
    expect(await inexistente.text()).toBe(await semPermissao.text());
  });

  it("segmento vazio: o mesmo 404", async () => {
    expect((await responderDownload(pedido, "", dependencias())).status).toBe(404);
  });

  it("`FR-002` · turma EAD: 303 para o DSA, onde o aviso de turma EAD já está", async () => {
    const r = await responderDownload(
      pedido,
      segmento,
      dependencias({ turma: async () => ({ ...TURMA, modalidade: "ead" }) }),
    );
    expect(r.status).toBe(303);
    expect(r.headers.get("Location")).toBe(`${BASE}${enderecoDoDsa(TURMA.codigo)}`);
  });
});

describe("`FR-006` · arquivo inteiro ou frase de erro — nunca pela metade", () => {
  it("o leitor que rejeita: 303 para o DSA com o aviso, e nenhum corpo de arquivo", async () => {
    const r = await responderDownload(
      pedido,
      segmento,
      dependencias({
        ler: async () => {
          throw new Error("leitura caiu");
        },
      }),
    );
    expect(r.status).toBe(303);
    expect(r.headers.get("Location")).toBe(`${BASE}${enderecoDoDsa(TURMA.codigo)}?planilha=falhou`);
    expect(r.headers.get("Content-Type")).toBeNull();
    expect(await r.text()).toBe("");
  });

  it("o escritor que falha também volta com o aviso", async () => {
    const r = await responderDownload(
      pedido,
      segmento,
      dependencias({
        escrever: () => {
          throw new Error("montagem caiu");
        },
      }),
    );
    expect(r.status).toBe(303);
  });
});

describe("`FR-005` · o arquivo", () => {
  it("200, xlsx, nome com a turma e a data, sem cache", async () => {
    const r = await responderDownload(pedido, segmento, dependencias());
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toBe(TIPO_DO_XLSX);
    expect(r.headers.get("Content-Disposition")).toBe(
      `attachment; filename="DSA-contingencia-C-TESTE-2026-2026-10-09.xlsx"; filename*=UTF-8''${encodeURIComponent("DSA-contingencia-C-TESTE 2026-2026-10-09.xlsx")}`,
    );
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(r.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new Uint8Array(await r.arrayBuffer()).slice(0, 2)).toEqual(new Uint8Array([0x50, 0x4b]));
  });

  it("quem gerou e quando chegam ao leitor", async () => {
    let contexto: unknown = null;
    await responderDownload(
      pedido,
      segmento,
      dependencias({
        ler: async (_t, c) => {
          contexto = c;
          return insumoSintetico();
        },
      }),
    );
    expect(contexto).toEqual({
      hoje: "2026-10-09",
      geradaEm: "2026-10-09T13:00:00.000Z",
      geradaPor: "Operador de Teste",
    });
  });
});

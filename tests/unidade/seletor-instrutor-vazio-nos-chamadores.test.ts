/**
 * FR-006.3 (spec 029, Bloco 14, item 6 — `PEND-026-2`): **sem `instrutores.ler`, todo chamador diz «você não vê»**.
 *
 * > *"O `SeletorInstrutor` exige de quem chama o motivo do vazio: **«você não vê»** (perfil sem `instrutores.ler`,
 * > frase do componente) ou **«não há»** com a frase do chamador — disciplina sem habilitado, ninguém atribuído,
 * > escolha a disciplina —, num único dono de frases em `lib/dominio/`."* — spec 029, FR-006.1
 *
 * ⚠️ **O QUE ESTE ARQUIVO PROVA, E O VIZINHO NÃO:** `seletor-instrutor-vazio.test.ts` passa o `vazio` montado à mão e
 *    prova o componente; `dsa/instrutores-da-aula.test.ts` prova a precedência no domínio. Faltava a **ligação**: que
 *    cada chamador entrega a `podeLerInstrutores` ao vazio. Achado da revisão adversarial do Bloco 14 — com um chamador
 *    passando `true` fixo, ou o ternário da aula invertido, o Vitest e as pontas a ponta tocadas ficavam verdes, porque
 *    todas rodam com perfil que lê instrutores.
 * ⚠️ **CADA CHAMADOR É DESENHADO DUAS VEZES COM A MESMA ENTRADA, só a permissão muda** (DoD 8): sem ela, *"o seu perfil
 *    não os alcança"*; com ela, a frase do «não há» daquele lugar. Sem a metade de controle, um chamador que nunca
 *    desenhasse o vazio passaria no «não diz "Nenhum instrutor habilitado"».
 * ⚠️ **O DIÁLOGO É SUBSTITUÍDO PELO CONTEÚDO** (`vi.mock` de `DialogoDeFormulario`): o do Radix só desenha aberto, e o
 *    formulário do TA fora do DSA mora dentro dele. As Server Actions e o roteador também são trocados — aqui só se
 *    desenha, nada se grava. O clique continua em `tests/e2e/ta-fora-do-dsa.spec.ts`.
 * ⚠️ **E A ORIGEM DA PERMISSÃO É LIDA SEM COMENTÁRIO** (regra 9.1.1, último bloco): toda `podeLerInstrutores={…}` em
 *    `app/` repassa a propriedade ou a decide por `pode(permissoes, "instrutores", "ler")` — o mesmo predicado da RLS de
 *    `instrutores` e `instrutor_disciplina`. Um `{true}` fixo numa página reprova ali.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => undefined, push: () => undefined, refresh: () => undefined }),
}));
vi.mock("@/lib/acoes/ta-fora-do-dsa", () => ({
  registrarTaForaDoDsa: async () => ({ ok: false, erro: "não chamado" }),
  desfazerTaForaDoDsa: async () => ({ ok: false, erro: "não chamado" }),
}));
vi.mock("@/lib/acoes/atribuicao", () => ({
  definirInstrutoresDaTurma: async () => ({ ok: false, erro: "não chamado" }),
}));
vi.mock("@/components/ciaara/dialogo-de-formulario", () => ({
  /* O conteúdo, aberto e sem o gatilho: é o formulário de dentro que se quer ler. */
  DialogoDeFormulario: ({ children }: { readonly children: (fechar: () => void) => ReactNode }) =>
    children(() => undefined),
}));

import { PainelDeInstrutores } from "@/app/(app)/disciplinas/paineis/PainelDeInstrutores";
import { AcoesDoBloco, type FatoEscolhido } from "@/app/(app)/turmas/[turma]/dsa/AcoesDoBloco";
import { FormularioDeLancamento } from "@/app/(app)/turmas/[turma]/dsa/FormularioDeLancamento";
import { ResponsavelOuNomeLivre } from "@/app/(app)/turmas/[turma]/dsa/ResponsavelOuNomeLivre";
import { TaForaDoDsa } from "@/app/(app)/turmas/[turma]/TaForaDoDsa";
import { SeletorInstrutor } from "@/components/ciaara/seletor-instrutor";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import { vazioDaListaDeInstrutores } from "@/lib/dominio/dsa/instrutores-da-aula";
import { regraDoResponsavel } from "@/lib/dominio/responsavel";

const ESCALA: EscalaDeAntiguidade = { CT: 10, "1T": 9 };

/** A frase do «você não vê» — do `SeletorInstrutor`, a mesma para qualquer lista. */
const VOCE_NAO_VE = "o seu perfil não os alcança";
const SEM_PERMISSAO = 'data-motivo="sem-permissao"';
/** O «não há» da habilitação — o que a tela dizia, sem a permissão, onde o motivo era «você não vê». */
const NENHUM_HABILITADO = "Nenhum instrutor habilitado";

const nada = () => undefined;
const naoChamado = async () => ({ ok: false as const, mensagem: "não chamado" });

/** A conferência comum do «você não vê», com a mensagem que diz qual chamador errou. */
function confereVoceNaoVe(html: string, chamador: string): void {
  expect(html, `${chamador}: sem \`instrutores.ler\`, o vazio não diz «você não vê»`).toContain(
    VOCE_NAO_VE,
  );
  expect(html, `${chamador}: o vazio não declara o motivo «sem-permissao»`).toContain(
    SEM_PERMISSAO,
  );
  expect(
    html,
    `${chamador}: sem \`instrutores.ler\`, o vazio diz o «não há» da habilitação`,
  ).not.toContain(NENHUM_HABILITADO);
}

describe("domínio → componente: o vazio de `vazioDaListaDeInstrutores` chega ao seletor", () => {
  it("sem permissão e motivo de FILTRO: o seletor diz «você não vê», não a frase do filtro", () => {
    const html = renderToStaticMarkup(
      createElement(SeletorInstrutor, {
        instrutores: [],
        escala: ESCALA,
        aoMudar: nada,
        vazio: vazioDaListaDeInstrutores(false, "sem-habilitado"),
      }),
    );
    confereVoceNaoVe(html, "SeletorInstrutor");
  });

  it("controle positivo: com permissão, o mesmo motivo dá a frase da habilitação", () => {
    const html = renderToStaticMarkup(
      createElement(SeletorInstrutor, {
        instrutores: [],
        escala: ESCALA,
        aoMudar: nada,
        vazio: vazioDaListaDeInstrutores(true, "sem-habilitado"),
      }),
    );
    expect(html).toContain(NENHUM_HABILITADO);
    expect(html).not.toContain(VOCE_NAO_VE);
  });
});

describe("TA fora do DSA: o instrutor do formulário (habilitados da disciplina)", () => {
  const desenhar = (podeLerInstrutores: boolean) =>
    renderToStaticMarkup(
      createElement(TaForaDoDsa, {
        turmaCodigo: "C-Ap-FR 2026",
        turmaDisciplinaId: "td-1",
        registros: [],
        instrutores: [],
        podeLerInstrutores,
        habilitadosLidos: true,
        escala: ESCALA,
        podeGravar: true,
        hoje: "2026-10-28",
      }),
    );

  it("sem `instrutores.ler`: «você não vê»", () => {
    const html = desenhar(false);
    expect(html, "o formulário não foi desenhado: o teste não lê o campo").toContain(
      'data-slot="formulario-ta-fora"',
    );
    confereVoceNaoVe(html, "TaForaDoDsa");
  });

  it("controle: com `instrutores.ler`, «Nenhum instrutor habilitado nesta disciplina»", () => {
    const html = desenhar(true);
    expect(html).toContain("Nenhum instrutor habilitado nesta disciplina");
    expect(html).not.toContain(VOCE_NAO_VE);
  });
});

describe("PainelDeInstrutores: a lista de habilitados da linha da turma", () => {
  const desenhar = (podeLerInstrutores: boolean) =>
    renderToStaticMarkup(
      createElement(PainelDeInstrutores, {
        turmaDisciplinaId: "td-1",
        cargaHorariaTempos: 40,
        modoDaDisciplina: "dividido",
        atribuidos: [],
        habilitados: [],
        unidades: [],
        escala: ESCALA,
        podeEditar: true,
        podeLerInstrutores,
        habilitadosLidos: true,
      }),
    );

  it("sem `instrutores.ler`: «você não vê», e não o caminho de habilitar", () => {
    const html = desenhar(false);
    confereVoceNaoVe(html, "PainelDeInstrutores");
    expect(html, "o «não há» com o caminho de habilitar, sem a permissão").not.toContain(
      'data-slot="sem-habilitado"',
    );
  });

  it("controle: com `instrutores.ler`, a frase da habilitação e o caminho até *Instrutores*", () => {
    const html = desenhar(true);
    expect(html).toContain('data-slot="sem-habilitado"');
    expect(html).toContain(NENHUM_HABILITADO);
    expect(html).toContain('href="/instrutores"');
    expect(html).not.toContain(VOCE_NAO_VE);
  });
});

describe("DSA · lançamento novo: o ramo da AULA (quem ministra)", () => {
  /* Abre como aula, sem disciplina: a lista da aula é vazia, e é o ramo da RD-1 que se desenha. */
  const desenhar = (podeLerInstrutores: boolean) =>
    renderToStaticMarkup(
      createElement(FormularioDeLancamento, {
        turmaId: "t-1",
        cursoId: "c-1",
        salaDaTurma: null,
        dia: "2026-10-26",
        taInicial: 1,
        temposDoDia: [],
        unidades: [],
        disciplinas: [{ id: "dis-1", codigo: "I", nome: "Navegação" }],
        avaliacoesParaVista: [],
        instrutores: [],
        habilitacoes: [],
        podeLerInstrutores,
        escala: ESCALA,
        tecnicas: [],
        tiposDeAvaliacao: [],
        subtipos: [],
        lancar: naoChamado,
        aoFechar: nada,
      }),
    );

  it("sem `instrutores.ler`: o seletor com «você não vê», e não a frase da aula", () => {
    const html = desenhar(false);
    confereVoceNaoVe(html, "FormularioDeLancamento (aula)");
    expect(html, "a frase da aula (D-32), sem a permissão").not.toContain(
      'data-slot="aula-sem-habilitado"',
    );
  });

  it("controle: com `instrutores.ler`, a frase da aula — escolher a disciplina", () => {
    const html = desenhar(true);
    expect(html).toContain('data-slot="aula-sem-habilitado"');
    expect(html).toContain("Escolha a disciplina.");
    expect(html).not.toContain(VOCE_NAO_VE);
  });
});

describe("DSA · cartão do lançamento: o ramo da AULA com a disciplina gravada", () => {
  /* Aula gravada com disciplina e instrutor; a lista da aula chega vazia (pela RLS, ou ninguém habilitado). */
  const FATO: FatoEscolhido = {
    fatoId: "f-1",
    origem: "aula",
    data: "2026-10-26",
    taInicial: 1,
    tempos: 2,
    disciplina: "I — Navegação",
    conteudo: "Cartas náuticas",
    local: "Sala 1",
    tecnica: null,
    instrutor: "CT Fulano",
    herdado: false,
    semPosicao: false,
    gravado: {
      instrutorId: "i-1",
      unidadeEnsinoId: null,
      disciplinaId: "dis-1",
      conteudo: "Cartas náuticas",
      tecnica: null,
      local: "Sala 1",
    },
  };
  const desenhar = (podeLerInstrutores: boolean) =>
    renderToStaticMarkup(
      createElement(AcoesDoBloco, {
        fato: FATO,
        diasDaSemana: [],
        linhas: 8,
        unidades: [],
        disciplinas: [{ id: "dis-1", codigo: "I", nome: "Navegação" }],
        instrutores: [],
        habilitacoes: [],
        podeLerInstrutores,
        escala: ESCALA,
        tecnicas: [],
        atualizar: naoChamado,
        excluir: naoChamado,
        aoFechar: nada,
      }),
    );

  it("sem `instrutores.ler`: «você não vê», e o gravado NÃO sai como «não habilitado» (não foi conferido)", () => {
    const html = desenhar(false);
    confereVoceNaoVe(html, "AcoesDoBloco (aula)");
    expect(html).not.toContain('data-slot="aula-sem-habilitado"');
    expect(
      html,
      "sem a permissão, o gravado sai «não habilitado» sem ter sido conferido",
    ).not.toContain('data-slot="instrutor-nao-habilitado"');
  });

  it("controle: com `instrutores.ler`, «Nenhum instrutor habilitado» e o aviso do gravado fora da lista", () => {
    const html = desenhar(true);
    expect(html).toContain('data-slot="aula-sem-habilitado"');
    expect(html).toContain(NENHUM_HABILITADO);
    expect(html).toContain('data-slot="instrutor-nao-habilitado"');
    expect(html).not.toContain(VOCE_NAO_VE);
  });
});

describe("DSA · quem responde fora da aula (o cadastro ativo inteiro)", () => {
  const desenhar = (podeLerInstrutores: boolean) =>
    renderToStaticMarkup(
      createElement(ResponsavelOuNomeLivre, {
        regra: regraDoResponsavel({ tipo: "vista" }),
        instrutores: [],
        podeLerInstrutores,
        escala: ESCALA,
        rotuloDoCadastro: "Instrutor do cadastro",
        idDoNomeLivre: "dsa-conduz-externo",
        exemplo: "Posto e nome",
        instrutorId: "",
        aoMudarInstrutor: nada,
        nomeLivre: "",
        aoMudarNomeLivre: nada,
        slot: "quem-conduz-a-vista",
      }),
    );

  it("sem `instrutores.ler`: «você não vê», e não «Nenhum instrutor ativo no cadastro»", () => {
    const html = desenhar(false);
    confereVoceNaoVe(html, "ResponsavelOuNomeLivre");
    expect(html).not.toContain("Nenhum instrutor ativo no cadastro");
  });

  it("controle: com `instrutores.ler`, «Nenhum instrutor ativo no cadastro»", () => {
    const html = desenhar(true);
    expect(html).toContain("Nenhum instrutor ativo no cadastro");
    expect(html).not.toContain(VOCE_NAO_VE);
  });
});

/* ── a origem da permissão: lida no código, sem comentário (regra 9.1.1) ───────────────────────────────────────── */

const RAIZ = resolve(__dirname, "..", "..");
const APP = join(RAIZ, "app");
/**
 * A vitrine de estilo mostra os dois vazios lado a lado, com `true` e `false` escritos — é amostra, não tela com perfil.
 * Isenção nominal, e a única.
 */
const VITRINE = join(APP, "estilo");

/** O código sem comentários — mede o que o arquivo FAZ, não o que ele diz (regra 9.1.1). */
function semComentario(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

function arquivosTsx(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) return caminho === VITRINE ? [] : arquivosTsx(caminho);
    return entrada.name.endsWith(".tsx") ? [caminho] : [];
  });
}

const FONTES = arquivosTsx(APP).map((caminho) => ({
  arquivo: relative(RAIZ, caminho).replaceAll("\\", "/"),
  codigo: semComentario(readFileSync(caminho, "utf8")),
}));

/** Toda `podeLerInstrutores={…}` passada a um componente, com a expressão entre as chaves. */
const ATRIBUTOS = FONTES.flatMap(({ arquivo, codigo }) =>
  [...codigo.matchAll(/podeLerInstrutores=\{([^{}]*(?:\([^()]*\))?[^{}]*)\}/g)].map((m) => ({
    arquivo,
    expressao: (m[1] ?? "").replace(/\s+/g, " ").trim(),
  })),
);
/** O primeiro argumento de toda chamada a `vazioDaListaDeInstrutores`. */
const PRIMEIROS_ARGUMENTOS = FONTES.flatMap(({ arquivo, codigo }) =>
  [...codigo.matchAll(/vazioDaListaDeInstrutores\(\s*([^,)]+),/g)].map((m) => ({
    arquivo,
    argumento: (m[1] ?? "").trim(),
  })),
);

const DECIDIDA_NO_SERVIDOR = 'pode(permissoes, "instrutores", "ler")';

describe("a permissão chega de `pode(…)` e só é repassada — nunca escrita à mão (lido sem comentário)", () => {
  it("controle positivo: a varredura enxerga as duas origens no servidor e os repasses", () => {
    expect(
      ATRIBUTOS.filter((a) => a.expressao === DECIDIDA_NO_SERVIDOR)
        .map((a) => a.arquivo)
        .sort(),
      "a varredura não achou as páginas que decidem a permissão: está cega",
    ).toEqual(["app/(app)/turmas/[turma]/dsa/page.tsx", "app/(app)/turmas/[turma]/page.tsx"]);
    expect(ATRIBUTOS.filter((a) => a.expressao === "podeLerInstrutores").length).toBeGreaterThan(0);
    expect(PRIMEIROS_ARGUMENTOS.length, "a varredura não achou chamada ao vazio").toBeGreaterThan(
      0,
    );
  });

  it("toda `podeLerInstrutores={…}` é o repasse da propriedade ou a decisão por `pode(…)`", () => {
    const fora = ATRIBUTOS.filter(
      (a) => a.expressao !== "podeLerInstrutores" && a.expressao !== DECIDIDA_NO_SERVIDOR,
    );
    expect(fora, "permissão escrita à mão, ou decidida por outro predicado").toEqual([]);
  });

  it("todo `vazioDaListaDeInstrutores(…)` das telas recebe a permissão, não um literal", () => {
    const fora = PRIMEIROS_ARGUMENTOS.filter((a) => a.argumento !== "podeLerInstrutores");
    expect(fora, "o vazio decidido com a permissão fixa").toEqual([]);
  });
});

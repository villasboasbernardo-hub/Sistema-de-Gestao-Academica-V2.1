/**
 * O contrato de parâmetros é completo e rastreável (`SC-007`, `FR-001` a `FR-005`).
 *
 * ⚠️ ESTE ARQUIVO NÃO TESTA COMPORTAMENTO: testa o **contrato em si**. É a diferença entre uma
 * tabela que descreve intenção e um contrato que alguém é obrigado a seguir — e a tabela do
 * documento 25 §1.3 existia desde a Fase 2 sem que requisito nenhum a citasse.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CLASSIFICACOES_DE_CURSO } from "@/lib/dominio/classificacoes-de-curso";
import {
  CLASSIFICACOES,
  CONTRATO,
  LIMITE_DE_FREQUENCIA_MS,
  MODALIDADES,
  parametrosDaRota,
  type Parametro,
  type Rota,
} from "@/lib/navegacao/contrato";
import { MENU } from "@/lib/navegacao/menu";
import { Constants } from "@/lib/tipos/database";

const ROTAS = Object.keys(CONTRATO) as Rota[];
const TODOS: readonly Parametro[] = ROTAS.flatMap((r) => parametrosDaRota(r));

describe("`SC-007` · todo parâmetro traz os cinco campos", () => {
  it("há parâmetro para testar — controle positivo", () => {
    // Sem isto, um contrato vazio passaria em tudo abaixo e pareceria cumprido por ausência.
    expect(TODOS.length).toBeGreaterThan(0);
  });

  it.each(TODOS)("$nome tem nome, tipo, padrão, histórico e aviso ao servidor", (p) => {
    expect(p.nome, "nome vazio").not.toBe("");
    expect(["texto", "inteiro", "escolha", "lista"]).toContain(p.tipo);
    expect(
      p.padrao,
      "padrão ausente — sem ele não há como saber quando o parâmetro some da URL",
    ).toBeDefined();
    expect(["empilha", "substitui"]).toContain(p.historico);
    expect(typeof p.avisaServidor, "o campo cujo erro é silencioso não pode ficar implícito").toBe(
      "boolean",
    );
  });

  it("o nome é `snake_case` curto, sem acento", () => {
    const fora = TODOS.filter((p) => !/^[a-z][a-z0-9_]*$/.test(p.nome)).map((p) => p.nome);
    expect(fora, `nomes fora da convenção: ${fora.join(", ")}`).toEqual([]);
  });

  it("parâmetro de escolha declara as opções, e o padrão não precisa estar entre elas", () => {
    // ⚠️ O padrão é o "todas": ele significa **sem recorte**, e não uma das opções.
    for (const p of TODOS.filter((x) => x.tipo === "escolha")) {
      expect(p.tipo === "escolha" && p.opcoes.length, `${p.nome} sem opções`).toBeGreaterThan(0);
    }
  });
});

describe("Princípio VIII · toda rota aponta para um requisito que existe", () => {
  const requisitos = readFileSync(
    resolve(process.cwd(), "docs/fase-1/02-Requisitos-Funcionais.md"),
    "utf8",
  );

  it.each(ROTAS)("a origem de %s é um `RF-` do documento 02", (rota) => {
    const origem = CONTRATO[rota].origem;
    expect(origem, `${rota} sem origem declarada`).toMatch(/^RF-/);
    expect(
      requisitos.includes(origem),
      `${rota} aponta para ${origem}, que não existe no documento 02`,
    ).toBe(true);
  });
});

describe("`FR-004` · a política de histórico não é implícita", () => {
  it("parâmetro que troca CONTEXTO empilha", () => {
    // ⚠️ O padrão da biblioteca é SUBSTITUIR — medido em 11/09/2026. Um parâmetro de contexto que
    // esquecesse isto deixaria o botão voltar sem nada para desfazer, com a URL correta.
    const contexto = parametrosDaRota("/inicio");
    expect(contexto.every((p) => p.historico === "empilha")).toBe(true);
  });

  it("o limite de frequência tem número, e ele vive no contrato", () => {
    // ⚠️ Ele morava num EXEMPLO DE CÓDIGO do documento 25 §1.5 — e valor que mora em exemplo é
    // valor que a próxima tela escolhe de novo.
    expect(LIMITE_DE_FREQUENCIA_MS).toBe(300);
  });
});

describe("`FR-037.1` · nenhum parâmetro de paginação, e é recusa declarada", () => {
  it("o contrato não tem página, tamanho de página nem deslocamento", () => {
    const proibidos = ["pagina", "page", "por_pagina", "tamanho", "offset", "limite"];
    const achados = TODOS.filter((p) => proibidos.includes(p.nome)).map((p) => p.nome);
    expect(
      achados,
      `paginação entrou no contrato: ${achados.join(", ")}. A fatia (b) decidiu por medição que a ` +
        `tabela renderiza todas as linhas, e reabrir isso exige medição na mão.`,
    ).toEqual([]);
  });
});

describe("`FR-001.1` · a emenda ao documento 25 foi aplicada nos DOIS lugares", () => {
  it("o contrato tem classificação e modalidade na tela inicial", () => {
    const nomes = parametrosDaRota("/inicio").map((p) => p.nome);
    expect(nomes).toEqual(["classificacao", "modalidade"]);
  });

  it("o documento 25 §1.3 traz os dois", () => {
    /*
     * ⚠️ É A INVARIANTE QUE IMPEDE OS DOIS PONTOS DE VERDADE DE DIVERGIREM. A tabela listava só
     * `classificacao`, e o `RF-INI-02` — que é **[PRESERVADO]** — escreve os dois na própria nota
     * de mecanismo. Sem este caso, a emenda envelheceria sem ninguém conferir, que é exatamente o
     * que aconteceu com as sete anotações de contraste do documento 23.
     */
    const doc = readFileSync(
      resolve(process.cwd(), "docs/fase-2/25-Camada-de-Dados-e-Estado.md"),
      "utf8",
    );
    const linha = doc.split(/\r?\n/).find((l) => l.includes("| `/inicio` |"));
    expect(linha, "a linha da tela inicial sumiu da tabela do documento 25").toBeDefined();
    expect(linha).toContain("classificacao");
    expect(linha).toContain("modalidade");
  });
});

describe("`RF-INI-02` · o domínio do filtro é o domínio do BANCO, não uma lista à mão", () => {
  /*
   * ⚠️ ESTE BLOCO NASCEU DE UM DEFEITO MEDIDO EM 11/09/2026. A primeira versão do contrato listava
   * três classificações; a coluna `cursos.classificacao` aceita **sete**. O efeito seria do pior
   * tipo: um link filtrando por `estagio_qualificacao` seria degradado para "todas" pelo `FR-006`, a
   * tela abriria cheia, e não haveria erro nenhum para ver — só um recorte que não pegou.
   *
   * ⚠️ E A TABELA DO DOCUMENTO 25 ESCONDIA A DIVERGÊNCIA porque anotava o tipo como **texto**: texto
   * não tem domínio do qual estar fora. Foi a emenda para **escolha** que criou a pergunta certa.
   */
  it("classificação oferece exatamente o enum do banco", () => {
    expect([...CLASSIFICACOES]).toEqual([...Constants.public.Enums.escopo_curso]);
  });

  it("modalidade oferece exatamente o enum do banco", () => {
    expect([...MODALIDADES]).toEqual([...Constants.public.Enums.modalidade_ensino]);
  });

  it("⚠️ e o contrato não encolhe o domínio — nenhum valor do banco fica de fora", () => {
    // Escrever a lista à mão é justamente como ela encolhe: alguém copia os valores que conhece.
    // `pnpm db:tipos` mantém o outro lado em dia, e o CI reprova se ele divergir do schema.
    const nomes = parametrosDaRota("/inicio").map((p) => p.nome);
    expect(nomes).toEqual(["classificacao", "modalidade"]);
    for (const p of parametrosDaRota("/inicio")) {
      expect(p.tipo, `${p.nome} voltou a ser texto — texto não tem domínio`).toBe("escolha");
    }
  });
});

describe("`FR-028` da spec 006 · as rotas de instrutor seguem o contrato humano", () => {
  /*
   * Contrato: `specs/006-cadastro-de-instrutores/contracts/parametros-instrutores.md`
   *
   * ⚠️ O ERRO QUE ESTE BLOCO GUARDA É SILENCIOSO. Um filtro que não avisasse o servidor deixaria a URL
   * certa, o link compartilhado abrindo — e o número na tela velho. Um filtro que empilhasse faria o
   * voltar desfazer letra por letra. Nenhum dos dois quebra a tela.
   */
  const FILTROS = [
    "busca",
    "om",
    "categoria",
    "capacitacao",
    "regime",
    "escolaridade",
    "posto",
    "circulo",
    "curso",
    "classificacao",
    "habilitado",
    "selecionado",
    "situacao",
  ];

  it("as três rotas existem: listagem, ficha e cadastro", () => {
    expect(ROTAS).toEqual(
      expect.arrayContaining(["/instrutores", "/instrutores/[codigo]", "/instrutores/novo"]),
    );
  });

  it("a listagem declara exatamente os parâmetros do contrato, na ordem dele (emenda de 15/09/2026)", () => {
    expect(parametrosDaRota("/instrutores").map((p) => p.nome)).toEqual([...FILTROS, "ordem"]);
  });

  it("ficha e cadastro não têm parâmetro de consulta — identidade no caminho, rascunho fora da URL", () => {
    expect(parametrosDaRota("/instrutores/[codigo]")).toEqual([]);
    expect(parametrosDaRota("/instrutores/novo")).toEqual([]);
  });

  it.each(FILTROS)("o filtro %s substitui o histórico e avisa o servidor", (nome) => {
    const p = parametrosDaRota("/instrutores").find((x) => x.nome === nome);
    expect(p?.historico, `${nome} empilharia: o voltar desfaria refino`).toBe("substitui");
    expect(p?.avisaServidor, `${nome} deixaria o número da tela velho`).toBe(true);
  });

  it("`ordem` é o único que não avisa o servidor — a antiguidade continua vindo do banco", () => {
    const naoAvisam = parametrosDaRota("/instrutores")
      .filter((p) => !p.avisaServidor)
      .map((p) => p.nome);
    expect(naoAvisam).toEqual(["ordem"]);
  });

  it("`situacao` é o único padrão não vazio, e ele é `ativo`", () => {
    const naoVazios = parametrosDaRota("/instrutores").filter((p) => p.padrao !== "");
    expect(naoVazios.map((p) => [p.nome, p.padrao])).toEqual([["situacao", "ativo"]]);
  });

  it("a busca limita frequência pelo número do contrato", () => {
    const busca = parametrosDaRota("/instrutores").find((p) => p.nome === "busca");
    expect(busca?.limiteDeFrequenciaMs).toBe(LIMITE_DE_FREQUENCIA_MS);
  });

  it("regime e situação oferecem exatamente o domínio do banco", () => {
    const porNome = (nome: string) =>
      parametrosDaRota("/instrutores").find((p) => p.nome === nome) as Parametro;
    const regime = porNome("regime");
    const situacao = porNome("situacao");
    expect(regime.tipo === "escolha" && [...regime.opcoes]).toEqual([
      ...Constants.public.Enums.regime_trabalho_docente,
    ]);
    expect(situacao.tipo === "escolha" && [...situacao.opcoes]).toEqual([
      ...Constants.public.Enums.status_registro,
    ]);
  });

  it("⚠️ nenhum parâmetro de instrutor aceita identificação civil ou residência", () => {
    const pii = [
      "cpf",
      "rg",
      "orgao_emissor",
      "telefone",
      "retelma",
      "endereco",
      "cep",
      "logradouro",
      "bairro",
      "cidade",
      "estado",
    ];
    const achados = ["/instrutores", "/instrutores/[codigo]", "/instrutores/novo"]
      .flatMap((r) => parametrosDaRota(r as Rota))
      .filter((p) => pii.some((termo) => p.nome.includes(termo)))
      .map((p) => p.nome);
    expect(achados, `PII na barra de endereço: ${achados.join(", ")}`).toEqual([]);
  });

  it("os filtros da emenda de 15/09/2026 oferecem o domínio certo", () => {
    const porNome = (nome: string) =>
      parametrosDaRota("/instrutores").find((p) => p.nome === nome) as Parametro;
    const opcoes = (nome: string) => {
      const p = porNome(nome);
      return p.tipo === "escolha" ? [...p.opcoes] : null;
    };
    expect(opcoes("habilitado")).toEqual(["sim", "nao"]);
    expect(opcoes("selecionado")).toEqual(["sim", "nao"]);
    expect(opcoes("circulo")).toEqual(["oficiais", "pracas"]);
    expect(opcoes("classificacao")).toEqual([...Constants.public.Enums.escopo_curso]);
    expect(porNome("posto").tipo, "posto tem domínio no dado, e é texto").toBe("texto");
    expect(porNome("curso").tipo, "curso tem domínio no dado, e é texto").toBe("texto");
  });
});

describe("`FR-004` · o catálogo `/cursos` declara os três filtros, e nada mais", () => {
  const doCatalogo = (nome: string) =>
    parametrosDaRota("/cursos").find((p) => p.nome === nome) as Parametro;

  const opcoes = (nome: string) => {
    const p = doCatalogo(nome);
    return p && p.tipo === "escolha" ? [...p.opcoes] : null;
  };

  it("a rota existe", () => {
    expect(ROTAS).toContain("/cursos");
  });

  it("são exatamente três: classificação, modalidade e situação", () => {
    expect(parametrosDaRota("/cursos").map((p) => p.nome)).toEqual([
      "classificacao",
      "modalidade",
      "situacao",
    ]);
  });

  it("⚠️ `situacao` tem padrão `ativo`, e é o único padrão não vazio — como em `/instrutores`", () => {
    expect(doCatalogo("situacao").padrao).toBe("ativo");
    const naoVazios = parametrosDaRota("/cursos").filter((p) => p.padrao !== "");
    expect(naoVazios.map((p) => p.nome)).toEqual(["situacao"]);
  });

  it("`situacao` oferece o mesmo domínio de `/instrutores` — não uma segunda lista", () => {
    expect(opcoes("situacao")).toEqual([...Constants.public.Enums.status_registro]);
    const daListagemDeInstrutores = parametrosDaRota("/instrutores").find(
      (p) => p.nome === "situacao",
    ) as Parametro;
    expect(daListagemDeInstrutores.tipo).toBe("escolha");
    if (daListagemDeInstrutores.tipo === "escolha") {
      expect(opcoes("situacao")).toEqual([...daListagemDeInstrutores.opcoes]);
    }
  });

  it("modalidade oferece o enum do banco inteiro", () => {
    expect(opcoes("modalidade")).toEqual([...MODALIDADES]);
  });

  it("⚠️ classificação oferece as CINCO do Glossário, e NÃO o enum inteiro", () => {
    // É a diferença entre `/cursos` e `/inicio`, e ela é deliberada: aqui a classificação AGRUPA
    // os cartões, e um grupo `geral` ou `ead_semipresencial` nunca teria cartão — o banco recusa
    // os dois valores. No Início ela só filtra, e lá o critério registrado é o oposto.
    expect(opcoes("classificacao")).toEqual([...CLASSIFICACOES_DE_CURSO]);
    expect(opcoes("classificacao")).not.toContain("geral");
    expect(opcoes("classificacao")).not.toContain("ead_semipresencial");
  });

  it("⚠️ e o Início NÃO mudou — as duas listas convivem de propósito (D-19)", () => {
    const doInicio = parametrosDaRota("/inicio").find(
      (p) => p.nome === "classificacao",
    ) as Parametro;
    expect(doInicio.tipo).toBe("escolha");
    if (doInicio.tipo === "escolha") {
      expect([...doInicio.opcoes]).toEqual([...CLASSIFICACOES]);
      expect([...doInicio.opcoes]).toContain("geral");
    }
  });

  it("⚠️ nenhum filtro de busca por texto — o catálogo tem 24 cartões, não uma tabela", () => {
    expect(parametrosDaRota("/cursos").map((p) => p.tipo)).toEqual([
      "escolha",
      "escolha",
      "escolha",
    ]);
  });

  it("os três avisam o servidor — o recorte é feito pela consulta, não no navegador", () => {
    for (const p of parametrosDaRota("/cursos")) {
      expect(p.avisaServidor, `${p.nome} filtra sem consultar o banco`).toBe(true);
    }
  });
});

describe("`FR-006.2` · a página do curso tem aba e turma na URL", () => {
  const daPagina = (nome: string) =>
    parametrosDaRota("/cursos/[curso]").find((p) => p.nome === nome) as Parametro;

  it("a rota existe, com exatamente dois parâmetros", () => {
    expect(ROTAS).toContain("/cursos/[curso]");
    expect(parametrosDaRota("/cursos/[curso]").map((p) => p.nome)).toEqual(["aba", "turma"]);
  });

  it("`aba` é escolha entre duas, com padrão `grade`", () => {
    const aba = daPagina("aba");
    expect(aba.tipo).toBe("escolha");
    if (aba.tipo === "escolha") expect([...aba.opcoes]).toEqual(["grade", "sobre"]);
    expect(aba.padrao).toBe("grade");
  });

  it("⚠️ `turma` é TEXTO, e não escolha — o domínio dela é o dado, não uma lista fechada", () => {
    // As turmas mudam a cada ano letivo. Uma escolha com opções escritas no contrato degradaria
    // para "nenhuma", em silêncio, o link que apontasse para uma turma criada depois.
    expect(daPagina("turma").tipo).toBe("texto");
    expect(daPagina("turma").padrao).toBe("");
  });

  it("⚠️ os dois EMPILHAM histórico — trocar de aba ou de turma é navegação (`FR-036`)", () => {
    // É a diferença para os filtros de `/cursos`, que substituem: filtrar é refinar a mesma vista,
    // trocar de turma é ir a outro lugar, e "voltar" precisa desfazer um passo.
    expect(daPagina("aba").historico).toBe("empilha");
    expect(daPagina("turma").historico).toBe("empilha");
  });

  it("os dois avisam o servidor — a leitura da turma é do servidor", () => {
    for (const p of parametrosDaRota("/cursos/[curso]")) expect(p.avisaServidor).toBe(true);
  });
});

describe("`FR-013.1` · cadastro e edição de curso não têm parâmetro de consulta", () => {
  it("as duas rotas existem", () => {
    expect(ROTAS).toEqual(expect.arrayContaining(["/cursos/novo", "/cursos/[curso]/editar"]));
  });

  it("⚠️ e nenhuma das duas declara parâmetro — rascunho de formulário NÃO vai para a URL", () => {
    // É a mesma decisão de `/instrutores/novo`: o que a pessoa ainda está digitando não é estado
    // compartilhável, e pô-lo na barra de endereço vaza por histórico e por ombro.
    expect(parametrosDaRota("/cursos/novo")).toEqual([]);
    expect(parametrosDaRota("/cursos/[curso]/editar")).toEqual([]);
  });
});

describe("`FR-031` · turma e salas: identidade no caminho, nada na consulta", () => {
  it("as três rotas existem", () => {
    expect(ROTAS).toEqual(
      expect.arrayContaining(["/cursos/[curso]/turmas/nova", "/turmas/[turma]", "/admin/salas"]),
    );
  });

  /*
   * ⚠️ **A FICHA DA TURMA SAIU DESTA LISTA EM 04/10/2026, E É A ÚNICA DAS TRÊS.** Ela recebeu a seção
   *    de disciplinas que vinha de `/disciplinas?turma=`, e com ela a linha expansível — cujo estado
   *    é `aberta`, parâmetro **visual**. As outras duas continuam sem parâmetro: são formulários, e o
   *    que a pessoa está digitando não é estado compartilhável.
   */
  it("e as duas rotas de formulário não declaram parâmetro", () => {
    for (const rota of ["/cursos/[curso]/turmas/nova", "/admin/salas"]) {
      expect(parametrosDaRota(rota as Rota), rota).toEqual([]);
    }
  });

  it("a ficha da turma declara `aberta`, e só ela", () => {
    expect(parametrosDaRota("/turmas/[turma]").map((p) => p.nome)).toEqual(["aberta"]);
  });
});

describe("⚠️ `FR-012` da spec 012 · a guarda INVERTIDA — a lista de turmas agora EXISTE", () => {
  /*
   * ⚠️ **ESTE BLOCO ERA A GUARDA DE AUSÊNCIA DO `FR-031.7`, E FOI INVERTIDO — NÃO APAGADO.** Até
   * 03/10/2026 ele exigia que `/turmas` **não** existisse, que o menu **não** tivesse "Turmas" e que
   * `app/(app)/turmas/page.tsx` **não** nascesse, citando a `MENU-1`. A **`D-NAV-1`, de 04/10/2026**
   * (decisão de Bernardo Villas Boas, que **substitui** a MENU-1) manda o contrário: a turma deixa de
   * se alcançar só pela página do curso e ganha lista própria, terceira no menu.
   *
   * ⚠️ **APAGAR OS CASOS TERIA SIDO MAIS FÁCIL E PIOR.** O que eles protegiam deixou de valer; o que
   * eles **registravam** — que a existência da rota é decisão datada, e não descuido — continua
   * valendo, e agora protege o estado novo. Guarda que vira é guarda; guarda que desaparece é lacuna.
   *
   * ⚠️ **O DSA SEGUE AUSENTE**, e o caso dele ficou de pé: ele é do **Épico 6**.
   */
  it("a rota `/turmas` existe, com os quatro filtros da `D4`", () => {
    expect(ROTAS, "a lista de turmas sumiu do contrato — ver a `D-NAV-1` de 04/10/2026").toContain(
      "/turmas",
    );
    expect(
      [...parametrosDaRota("/turmas").map((p) => p.nome)].sort(),
      "os quatro filtros da lista de turmas mudaram sem decisão nova",
    ).toEqual(["ano", "busca", "curso", "situacao"]);
  });

  it("⚠️ a situação de turma NÃO é a de cadastro — são enums diferentes", () => {
    /*
     * ⚠️ **O MODO DE FALHA QUE ESTE CASO IMPEDE É SILENCIOSO.** `SITUACOES_DE_CADASTRO` é
     *    `status_registro` (`ativo` | `inativo`); turma tem `status_turma`. Filtrar a lista por
     *    `ativo` não dá erro nenhum — devolve **zero turmas**, porque esse valor não existe na
     *    coluna, e a tela diz "nenhuma turma neste recorte" sobre um banco cheio.
     */
    const opcoes = CONTRATO["/turmas"].parametros.situacao;
    expect(opcoes.tipo).toBe("escolha");
    if (opcoes.tipo !== "escolha") return;
    expect([...opcoes.opcoes].sort()).toEqual(["ativa", "cancelada", "concluida", "planejada"]);
  });

  it("o menu tem a entrada 'Turmas', na terceira posição da `D-NAV-1`", () => {
    const doc = readFileSync(resolve(process.cwd(), "lib/navegacao/menu.ts"), "utf8");
    const semComentario = doc.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\r\n]*/g, " ");

    expect(
      semComentario,
      'o menu perdeu a entrada "Turmas" — a `D-NAV-1` de 04/10/2026 a põe em terceiro lugar',
    ).toMatch(/rotulo:\s*"Turmas"/);
    expect(MENU.map((e) => e.rota).indexOf("/turmas"), "Turmas saiu do terceiro lugar").toBe(2);
    expect(
      MENU.find((e) => e.rota === "/turmas")?.disponivel,
      'Turmas voltou a "em breve", e a tela existe — a guarda do `FR-017` reprova nos dois sentidos',
    ).toBe(true);
  });

  /*
   * ⚠️ **ESTA ASSERÇÃO FOI INVERTIDA EM 05/10/2026, NÃO APAGADA — e é a segunda vez que ela vira.**
   * Ela era *"a tela da lista existe, e a do DSA continua não existindo"*, com
   * `.toBe(false)` no diretório e `.not.toContain` na rota, e a razão escrita era *"o DSA é do
   * Épico 6, e não desta fatia"*. **Ela era verdadeira, e deixou de ser**: o PR 1 do Épico 6
   * (spec 013, `RF-DSA-01`) construiu a tela.
   *
   * ⚠️ Inverter em vez de apagar é o que a `/turmas` já fez em 04/10/2026: o registro de por que a
   * rota existe passa a ser o que a asserção protege. Apagá-la deixaria de guardar qualquer coisa.
   */
  it("a tela da lista e a do DSA existem, as duas", () => {
    expect(
      existsSync(resolve(process.cwd(), "app/(app)/turmas/page.tsx")),
      "a lista de turmas não existe em `app/`, mas o menu a anuncia",
    ).toBe(true);
    expect(
      existsSync(resolve(process.cwd(), "app/(app)/turmas/[turma]/dsa/page.tsx")),
      "a tela do DSA não existe em `app/`, e o contrato a declara (`RF-DSA-01`)",
    ).toBe(true);
    expect(ROTAS, "o DSA saiu do contrato de parâmetros").toContain("/turmas/[turma]/dsa");
  });

  /*
   * O `RF-NAV-04` no contrato: *"navegar entre semanas usa o histórico do navegador"*.
   *
   * ⚠️ **SEM ESTA ASSERÇÃO, O DEFEITO SERIA SILENCIOSO** — o padrão da biblioteca é SUBSTITUIR, e
   * com ele a URL fica correta, o link compartilhado abre na semana certa, e **o botão voltar sai
   * da tela** em vez de voltar uma semana. É a mesma classe do `/inicio`, que já tem guarda.
   */
  it("`RF-NAV-04` · semana e ano EMPILHAM; o sábado SUBSTITUI", () => {
    const dsa = parametrosDaRota("/turmas/[turma]/dsa");
    const por = (n: string) => dsa.find((p) => p.nome === n);
    expect(por("semana")?.historico, "voltar sairia da tela em vez de voltar uma semana").toBe(
      "empilha",
    );
    expect(por("ano")?.historico, "a virada do ano precisa empilhar junto com a semana").toBe(
      "empilha",
    );
    expect(por("sabado")?.historico, "abrir a coluna é refinar a MESMA semana").toBe("substitui");
    // Os três alimentam consulta no servidor — é o campo cujo erro é silencioso (`FR-004.1`).
    expect(dsa.every((p) => p.avisaServidor)).toBe(true);
  });

  /*
   * ⚠️ **O PADRÃO `0` É SENTINELA, E ISTO É O QUE IMPEDE ALGUÉM DE "CONSERTÁ-LO" PARA `1`.**
   * O padrão de verdade é a semana ISO de hoje, que é dinâmica. Com `padrao: 1`, a semana 1 — um
   * valor legítimo — desapareceria da URL e o link compartilhado abriria na semana corrente em vez
   * da primeira do ano. Zero não é semana ISO (1..53) nem ano, então não se confunde com dado.
   */
  it("o padrão de `semana` e `ano` é a sentinela 0, e as faixas são as normativas", () => {
    const dsa = parametrosDaRota("/turmas/[turma]/dsa");
    const semana = dsa.find((p) => p.nome === "semana");
    const ano = dsa.find((p) => p.nome === "ano");
    expect(semana?.padrao, "1 é semana legítima e não pode ser o padrão").toBe(0);
    expect(ano?.padrao).toBe(0);
    // ISO 8601: o ano tem 52 ou 53 semanas. Não é número escolhido à mão.
    expect(semana?.tipo === "inteiro" && [semana.minimo, semana.maximo]).toEqual([1, 53]);
    // A mesma faixa do `CHECK config_param_ano_valido` do banco (medido), não um palpite.
    expect(ano?.tipo === "inteiro" && [ano.minimo, ano.maximo]).toEqual([2020, 2099]);
  });
});

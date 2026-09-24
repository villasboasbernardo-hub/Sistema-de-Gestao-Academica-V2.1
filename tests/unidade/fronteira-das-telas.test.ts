/**
 * A fronteira das TELAS — `app/**` (`FR-041`, `FR-045`, `SC-007`, `SC-010`).
 *
 * ⚠️ **AS VARREDURAS QUE JÁ EXISTEM OLHAM `components/` E `components/casca/`**, e as telas do PR 2
 * são de `app/`. Um `"use client"` num `page.tsx` contamina **toda a subárvore de importação** — a
 * tabela inteira, o catálogo de siglas, a consulta — e **não aparece no `tsc`**: aparece no `next
 * build`, se aparecer.
 *
 * ⚠️ **A LISTA DE FOLHAS É FECHADA, E ESSA É A GRAÇA.** Acrescentar um marcador de cliente exige
 * acrescentar o arquivo aqui, o que é decisão visível — não um `"use client"` digitado sem pensar.
 *
 * ⚠️ **TODA VARREDURA LÊ CÓDIGO SEM COMENTÁRIO** (regra 9.1.1 do `CLAUDE.md`). O cabeçalho de quase
 * toda página desta fatia **fala** de marcador de cliente e de `await` em laço, para explicar por que
 * não os tem; um teste que confunda a menção com o uso ensina a apagar a documentação para ficar
 * verde — que é o contrário do que estes requisitos querem.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();

/**
 * As folhas de cliente de `app/**`, e o que cada uma justifica.
 *
 * ⚠️ **TODAS SÃO FORMULÁRIO OU AÇÃO**, e nenhuma é página. Interação de formulário — digitar,
 * escolher, abrir diálogo, chamar a Server Action e tratar a recusa — não existe no servidor.
 */
const FOLHAS_DE_CLIENTE: Readonly<Record<string, string>> = {
  // ── Épico 3: autenticação ──────────────────────────────────────────────────────────────────
  "app/(auth)/login/FormularioDeLogin.tsx": "entrar: campo, envio e a recusa de credencial",
  "app/(auth)/convite/FormularioDeSenha.tsx": "definir senha a partir do token do fragmento",
  "app/(auth)/recuperar-senha/FormularioDeRecuperacao.tsx": "pedir o link de recuperação",
  "app/(app)/admin/usuarios/FormularioDeConvite.tsx": "convidar usuário",
  "app/(app)/admin/usuarios/AcoesDeUsuario.tsx": "reenviar convite, desativar e reativar conta",

  // ── Épico 4: vitrine e panorama ────────────────────────────────────────────────────────────
  "app/estilo/amostras.tsx": "as amostras interativas da vitrine",
  "app/(app)/inicio/FiltroDoPanorama.tsx": "o recorte do panorama, escrito na URL",

  // ── Épico 5 (c): instrutores ───────────────────────────────────────────────────────────────
  "app/(app)/instrutores/FiltrosDeInstrutores.tsx": "os filtros da listagem, na URL",
  "app/(app)/instrutores/TabelaDeInstrutores.tsx": "a grade navegável por teclado",
  "app/(app)/instrutores/EstatisticasRecolhiveis.tsx": "recolher o painel — estado efêmero",
  "app/(app)/instrutores/FormularioDeInstrutor.tsx": "cadastrar e editar instrutor",
  "app/(app)/instrutores/PainelDeDisciplinas.tsx": "marcar e desmarcar habilitações",
  "app/(app)/instrutores/[codigo]/AcoesDeInstrutor.tsx": "desativar e reativar, com confirmação",
  "app/(app)/instrutores/[codigo]/ExcluirInstrutor.tsx": "a exclusão com código de confirmação",

  // ── Épico 5 (a), PR 2: cursos, turmas, salas e regime ──────────────────────────────────────
  "app/(app)/cursos/FiltrosDoCatalogo.tsx": "os filtros do catálogo, na URL",
  "app/(app)/cursos/FormularioDeCurso.tsx": "cadastrar e editar curso, com o diálogo da sigla",
  "app/(app)/cursos/[curso]/AbasDoCurso.tsx": "trocar de aba escrevendo na URL",
  "app/(app)/cursos/[curso]/AcoesDeSituacao.tsx": "desativar e reativar, com confirmação",
  "app/(app)/cursos/[curso]/SeletorDeTurmaNaUrl.tsx": "escolher a turma escrevendo na URL",
  "app/(app)/cursos/[curso]/editar/FormularioDeVigencia.tsx": "registrar e corrigir vigência",
  "app/(app)/turmas/FormularioDeTurma.tsx": "criar e editar turma, com o diálogo do limite",
  "app/(app)/admin/salas/FormularioDeSala.tsx": "acrescentar sala",
  "app/(app)/admin/salas/AcoesDeSala.tsx": "desativar e reativar sala, com o diálogo das turmas",
};

function semComentario(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

function arquivosDe(pasta: string): string[] {
  const caminho = resolve(RAIZ, pasta);
  return readdirSync(caminho).flatMap((nome) => {
    const completo = join(caminho, nome);
    if (statSync(completo).isDirectory()) return arquivosDe(relative(RAIZ, completo));
    return /\.tsx?$/.test(nome) ? [relative(RAIZ, completo).replaceAll("\\", "/")] : [];
  });
}

type Arquivo = { readonly caminho: string; readonly codigo: string };

function telas(): Arquivo[] {
  return arquivosDe("app").map((caminho) => ({
    caminho,
    codigo: semComentario(readFileSync(resolve(RAIZ, caminho), "utf8")),
  }));
}

const temMarcador = (codigo: string) => /^\s*"use client";/m.test(codigo);

describe("`FR-041` · nenhuma página nem layout leva marcador de cliente", () => {
  it("há tela para varrer — controle positivo", () => {
    expect(telas().length, "a varredura não achou `app/`").toBeGreaterThan(20);
  });

  it("⚠️ `page.tsx`, `layout.tsx`, `loading.tsx` e as consultas ficam no servidor", () => {
    const violacoes = telas()
      .filter((a) => /\/(page|layout|loading|consulta)\.tsx?$/.test(a.caminho))
      .filter((a) => temMarcador(a.codigo))
      .map((a) => a.caminho);
    expect(
      violacoes,
      `marcador de cliente em página ou layout: ${violacoes.join(", ")}. Ele contamina toda a ` +
        `subárvore de importação, e o erro não aparece no \`tsc\`.`,
    ).toEqual([]);
  });

  it("⚠️ `error.tsx` é a EXCEÇÃO declarada — o Next exige que ele seja de cliente", () => {
    const erros = telas().filter((a) => /\/error\.tsx$/.test(a.caminho));
    expect(erros.length, "nenhum `error.tsx`: a degradação do `RN-DEG-01` sumiu").toBeGreaterThan(
      2,
    );
    expect(erros.every((a) => temMarcador(a.codigo))).toBe(true);
  });

  it("a varredura PEGA um marcador — controle positivo com fonte sintética", () => {
    expect(temMarcador(semComentario('"use client";\nexport default function P() {}'))).toBe(true);
    expect(temMarcador(semComentario('// "use client";\nexport default function P() {}'))).toBe(
      false,
    );
  });
});

describe("`SC-010` · as folhas de cliente de `app/**` são declaradas e contadas", () => {
  const folhas = () =>
    telas()
      .filter((a) => temMarcador(a.codigo))
      .filter((a) => !/\/error\.tsx$/.test(a.caminho))
      .map((a) => a.caminho);

  it("nenhuma folha fora da lista", () => {
    const foraDaLista = folhas().filter((c) => !(c in FOLHAS_DE_CLIENTE));
    expect(
      foraDaLista,
      `folha de cliente não declarada: ${foraDaLista.join(", ")}. Acrescente o arquivo à lista ` +
        `deste teste, com o motivo — a decisão é visível de propósito.`,
    ).toEqual([]);
  });

  it("⚠️ e nenhuma declarada que deixou de existir — lista que envelhece não guarda nada", () => {
    const declaradas = Object.keys(FOLHAS_DE_CLIENTE);
    const sumidas = declaradas.filter((c) => !folhas().includes(c));
    expect(sumidas, `declarada e sem marcador: ${sumidas.join(", ")}`).toEqual([]);
  });
});

describe("`FR-045` · nenhum `await` dentro de laço em `app/**`", () => {
  /**
   * O primeiro `await` dentro do corpo de um `for`/`while`, se houver.
   *
   * ⚠️ **O CORPO É DELIMITADO POR CHAVES BALANCEADAS**, e não por linha: um `await` três linhas
   * abaixo do `for` pode estar fora dele. Contar por linha daria falso positivo justamente onde a
   * página faz `Promise.all` logo depois de um laço.
   */
  function awaitEmLaco(codigo: string): boolean {
    for (const abre of codigo.matchAll(/\b(for|while)\s*\(/g)) {
      const inicio = codigo.indexOf("{", abre.index + abre[0].length);
      if (inicio === -1) continue;
      let profundidade = 0;
      for (let i = inicio; i < codigo.length; i++) {
        if (codigo[i] === "{") profundidade++;
        else if (codigo[i] === "}") {
          profundidade--;
          if (profundidade === 0) {
            if (/\bawait\b/.test(codigo.slice(inicio, i))) return true;
            break;
          }
        }
      }
    }
    return false;
  }

  it("⚠️ uma consulta por linha é o que faz a tela ficar lenta sem nada ter mudado", () => {
    const violacoes = telas()
      .filter((a) => awaitEmLaco(a.codigo))
      .map((a) => a.caminho);
    expect(
      violacoes,
      `\`await\` dentro de laço: ${violacoes.join(", ")}. Consultas independentes vão num ` +
        `\`Promise.all\` só (\`FR-012\`).`,
    ).toEqual([]);
  });

  it("a varredura PEGA o defeito, e não pega o que só parece — controle positivo", () => {
    expect(awaitEmLaco("for (const t of turmas) { const r = await ler(t); }")).toBe(true);
    expect(awaitEmLaco("while (fila.length) { await passo(); }")).toBe(true);
    // ⚠️ `await` DEPOIS do laço não é `await` no laço.
    expect(awaitEmLaco("for (const t of turmas) { soma += t.n; }\nconst r = await tudo();")).toBe(
      false,
    );
    expect(awaitEmLaco("const r = await Promise.all(turmas.map((t) => ler(t)));")).toBe(false);
  });
});

describe("`SC-007` · a regra de cor vale nas telas, e não só nos componentes", () => {
  it("nenhuma tela escreve cor à mão nem usa a paleta padrão", () => {
    /*
     * ⚠️ O PORTÃO É O ESLint, e ele já barra as duas formas no repositório inteiro. O que este caso
     *    acrescenta é a CONTAGEM sobre `app/**`, com o arquivo no erro — a mesma metade que
     *    `fronteira-componentes.test.ts` acrescenta sobre `components/`.
     */
    const literal = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/;
    const paleta =
      /\b(?:text|bg|border|ring|fill|stroke|from|via|to|decoration|outline|shadow|accent|caret|divide|placeholder)-(?:slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?\b/;
    const violacoes = telas()
      .filter((a) => literal.test(a.codigo) || paleta.test(a.codigo))
      .map((a) => a.caminho);
    expect(
      violacoes,
      `cor fora do ponto único: ${violacoes.join(", ")}. Toda cor vem de \`app/globals.css\`.`,
    ).toEqual([]);
  });
});

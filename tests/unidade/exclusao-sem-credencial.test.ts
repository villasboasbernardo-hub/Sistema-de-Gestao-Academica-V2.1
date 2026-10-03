/**
 * `D-USR-3` · **excluir conta SEM credencial não depende da chave administrativa** — e o erro de uma
 * consulta não vira "Conta não encontrada".
 *
 * ⚠️ **ESTE ARQUIVO NASCE DE UM DEFEITO QUE BERNARDO ENCONTROU DUAS VEZES NO PREVIEW**, e a segunda
 * vez só aconteceu porque a primeira correção tratou o sintoma. Ao clicar em *Excluir* numa das
 * contas sem credencial, a tela respondia **"Conta não encontrada."** — sobre uma conta que estava
 * ali, na lista, à vista.
 *
 * ⚠️ **A FRASE ERA UMA INVENÇÃO DO CÓDIGO, não um diagnóstico.** `excluirConta` lia a conta com o
 * **cliente administrativo** (`service_role`) e **descartava o `error`** da consulta:
 * `const { data: alvo } = await admin...`. Com o `error` no lixo, **qualquer** falha — chave
 * recusada, rede, privilégio — produzia `data: null`, e `if (!alvo)` concluía *"não encontrada"*.
 * Erro descartado é pior que erro bruto: ele não só esconde a causa, **ele inventa outra**, e manda
 * quem investiga procurar o cadastro em vez da credencial.
 *
 * ⚠️ **E A DEPENDÊNCIA ERA DESNECESSÁRIA, que é o conserto de fundo.** Excluir uma conta **sem
 * credencial** não tem nada para a `service_role` fazer: o cadastro sai pela RPC, com a sessão de
 * quem clicou. Medido no remoto em 03/10/2026, só por leitura: **4 das 5 contas reais estão nesse
 * estado**. O Princípio XI diz o inverso do que o código fazia — *se uma tela precisou da
 * `service_role` para funcionar, a policy está errada* —, e aqui a policy estava certa.
 *
 * ⚠️ **POR QUE A GUARDA É DE FORMA, E NÃO DE COMPORTAMENTO.** Na máquina de quem desenvolve a chave
 * administrativa **funciona**, então a exclusão de conta sem credencial passava no local **antes e
 * depois** — é o `SC-005` ao contrário: um caso que dá o mesmo veredito nas duas versões não testa a
 * mudança. O que mudou foi a **ordem das dependências**, e isso se lê no código: a chave só pode ser
 * pedida **depois** de o código saber que há credencial a remover. Esta varredura reprova com o
 * código de antes.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const CAMINHO = "lib/acoes/usuarios.ts";

/** Lê sem comentário: uso mencionado não é uso (regra 9.1.1 do `CLAUDE.md`). */
function semComentario(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const FONTE = semComentario(readFileSync(resolve(process.cwd(), CAMINHO), "utf8"));

/** O corpo de uma função exportada, do `export async function <nome>` até a chave que o fecha. */
function corpoDe(nome: string): string {
  const inicio = FONTE.indexOf(`export async function ${nome}(`);
  expect(inicio, `não achei \`${nome}\` em ${CAMINHO}`).toBeGreaterThan(-1);
  const resto = FONTE.slice(inicio);
  const fim = resto.indexOf("\n}\n");
  return fim === -1 ? resto : resto.slice(0, fim);
}

describe("`D-USR-3` · a exclusão não pede chave administrativa antes de precisar dela", () => {
  it("⚠️ O CASO QUE DISCRIMINA · em `excluirConta`, a chave vem DEPOIS de saber que há credencial", () => {
    const corpo = corpoDe("excluirConta");

    const pedeAChave = corpo.search(/criarClienteAdministrativo\s*\(|administrativoOuRecusa\s*\(/);
    const sabeDaCredencial = corpo.indexOf("alvo.auth_user_id");

    expect(
      sabeDaCredencial,
      "`excluirConta` não consulta mais `alvo.auth_user_id`",
    ).toBeGreaterThan(-1);
    expect(
      pedeAChave,
      "`excluirConta` pede a chave administrativa antes de saber se há credencial a remover — " +
        "é a dependência que fazia a exclusão de conta SEM credencial falhar num ambiente onde " +
        "a chave está vencida, e falhar dizendo «Conta não encontrada»",
    ).toBeGreaterThan(sabeDaCredencial);
  });

  it("⚠️ a leitura da conta alvo vai pela SESSÃO, não pela `service_role`", () => {
    const corpo = corpoDe("excluirConta");

    // A linha que lê a conta tem de sair do cliente de servidor (sessão de quem clicou).
    expect(
      /criarClienteDeServidor\s*\(\)[\s\S]{0,400}?\.from\("usuarios"\)[\s\S]{0,200}?\.eq\("id", usuarioId\)/.test(
        corpo,
      ),
      "a leitura da conta alvo não está vindo da sessão — o Admin lê `usuarios` pela policy " +
        "`usuarios_ler`, e usar a chave administrativa aqui é dependência desnecessária",
    ).toBe(true);
  });

  it.each(["excluirConta", "redefinirSenha"])(
    "⚠️ em `%s`, a leitura da conta alvo NÃO descarta o `error`",
    (nome) => {
      const corpo = corpoDe(nome);

      /*
       * ⚠️ **O PADRÃO PROIBIDO É EXATAMENTE ESTE:** `const { data: alvo } = await ...`, sem `error`.
       *    Ele transforma falha de consulta em `data: null`, e o `if (!alvo)` seguinte transforma
       *    `null` na frase "Conta não encontrada." — que acusa o cadastro por um problema que não é
       *    dele. A forma certa captura o `error` e o diz.
       */
      expect(
        /const\s*\{\s*data:\s*alvo\s*\}\s*=/.test(corpo),
        `\`${nome}\` lê a conta alvo descartando o \`error\`: qualquer falha da consulta vai ` +
          "aparecer como «Conta não encontrada.», que é mentira — a conta existe",
      ).toBe(false);

      expect(
        /error:\s*erroDaLeitura/.test(corpo),
        `\`${nome}\` não trata o erro da leitura da conta alvo`,
      ).toBe(true);
    },
  );

  it("controle positivo · a varredura está lendo o arquivo certo", () => {
    // Sem isto, um caminho errado faria os três casos acima passarem sobre uma string vazia.
    expect(FONTE.length, `${CAMINHO} veio vazio`).toBeGreaterThan(5000);
    expect(FONTE).toContain("export async function excluirConta(");
    expect(FONTE).toContain("export async function redefinirSenha(");
  });
});

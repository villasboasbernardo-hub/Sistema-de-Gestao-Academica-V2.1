/**
 * Spec 022 (Bloco 7), FR-001.4 — a guarda dos botões padrão: **verbo de ação é ícone**, em tela nova e antiga.
 *
 * > *"Botões padrão como ÍCONE com dica (tooltip) e aria-label (…). Componente único + guarda para telas futuras. Em
 * > diálogo de confirmação destrutiva o texto continua."* — Bernardo Villas Boas, 22/10/2026
 *
 * ⚠️ **LÊ O JSX DE VERDADE, COM O COMPILADOR DO TYPESCRIPT** — não por expressão regular sobre o texto do arquivo:
 *    assim comentário não conta (regra 9.1.1), um título *"Editar curso"* num `<h1>` não é botão, e o texto que chega
 *    por expressão (`{ativo ? "Desativar" : "Reativar"}`) é visto.
 * ⚠️ **O QUE CONTA COMO BOTÃO:** `<Button>`, `<button>`, `<Link>` e `<a>` — o link de ação tem cara de botão e o mesmo
 *    verbo; o link no meio de uma frase não começa por verbo de ação.
 * ⚠️ **ONDE O TEXTO CONTINUA (A-1, D-3):** dentro de `DialogFooter`, `AlertDialogFooter`, `AlertDialogAction`,
 *    `AlertDialogCancel` e `DialogClose` — o rodapé dos diálogos, o de confirmação destrutiva inclusive.
 */
import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";

const RAIZ = path.resolve(__dirname, "../..");

/** Os verbos padrão (D-4 da spec 022), no começo do texto do botão. */
const VERBO_PADRAO =
  /^(Editar|Excluir|Desativar|Reativar|Inativar|Imprimir|Salvar|Gravar|Novo|Nova|Cadastrar|Acrescentar|Registrar|Declarar|Arquivar|Desarquivar|Descartar|Retirar|Baixar|Carregar|Substituir|Redefinir senha|Trocar situação|Desfazer|Parar dia|Limpar filtros|Enviar foto|Remover foto|Abrir o DSA|DSA da semana|Juntar|Claro|Noturno|Sistema)(?![\p{L}\p{N}])/u;

const BOTOES = new Set(["Button", "button", "Link", "a"]);
const ONDE_O_TEXTO_CONTINUA = new Set([
  "DialogFooter",
  "AlertDialogFooter",
  "AlertDialogAction",
  "AlertDialogCancel",
  "DialogClose",
]);

function nomeDaTag(no: ts.JsxElement | ts.JsxSelfClosingElement): string {
  const tag = ts.isJsxElement(no) ? no.openingElement.tagName : no.tagName;
  return tag.getText();
}

/** Os textos de um elemento: o texto JSX e as cadeias de caracteres das expressões filhas, sem os atributos. */
function textosDo(no: ts.Node): string[] {
  const textos: string[] = [];
  const visitar = (n: ts.Node): void => {
    if (ts.isJsxAttribute(n)) return;
    if (ts.isJsxText(n)) {
      const t = n.getText().replace(/\s+/g, " ").trim();
      if (t !== "") textos.push(t);
      return;
    }
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      textos.push(n.text.trim());
      return;
    }
    ts.forEachChild(n, visitar);
  };
  if (ts.isJsxElement(no)) no.children.forEach(visitar);
  return textos;
}

export type BotaoDeTexto = { readonly linha: number; readonly tag: string; readonly texto: string };

/** Os botões com verbo padrão escrito, fora dos rodapés de diálogo. */
export function botoesDeTexto(codigo: string, arquivo = "x.tsx"): BotaoDeTexto[] {
  const fonte = ts.createSourceFile(
    arquivo,
    codigo,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const achados: BotaoDeTexto[] = [];
  const visitar = (n: ts.Node, protegido: boolean): void => {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
      const tag = nomeDaTag(n);
      const aqui = protegido || ONDE_O_TEXTO_CONTINUA.has(tag);
      if (!aqui && BOTOES.has(tag) && ts.isJsxElement(n)) {
        for (const texto of textosDo(n)) {
          if (VERBO_PADRAO.test(texto)) {
            achados.push({
              linha: fonte.getLineAndCharacterOfPosition(n.getStart()).line + 1,
              tag,
              texto,
            });
            break;
          }
        }
      }
      ts.forEachChild(n, (f) => visitar(f, aqui));
      return;
    }
    ts.forEachChild(n, (f) => visitar(f, protegido));
  };
  visitar(fonte, false);
  return achados;
}

function arquivosTsx(dir: string): string[] {
  const absoluto = path.join(RAIZ, dir);
  if (!fs.existsSync(absoluto)) return [];
  return fs
    .readdirSync(absoluto, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".tsx"))
    .map((e) => path.relative(RAIZ, path.join(e.parentPath, e.name)).replaceAll("\\", "/"));
}

/** Os primitivos do shadcn e a impressão (o papel não tem botão de tela) ficam de fora. */
const FORA = (a: string) => a.startsWith("components/ui/") || a.startsWith("app/print/");

describe("FR-001.4 · verbo de ação é botão de ícone", () => {
  it("controle positivo: acha o botão de texto, inclusive o que vem por expressão e o link de ação", () => {
    const achados = botoesDeTexto(`
      export function T({ ativo }: { ativo: boolean }) {
        return (
          <div>
            <h1>Editar curso</h1>
            {/* <Button>Editar</Button> num comentário não conta */}
            <Button size="sm">Editar</Button>
            <Button>{ativo ? "Desativar curso" : "Reativar curso"}</Button>
            <Link href="/x">Novo instrutor</Link>
            <a href="/y">Baixar planilha de contingência</a>
            <Button>Semana anterior</Button>
          </div>
        );
      }`);
    expect(achados.map((a) => a.texto)).toEqual([
      "Editar",
      "Desativar curso",
      "Novo instrutor",
      "Baixar planilha de contingência",
    ]);
  });

  it("controle negativo: o rodapé dos diálogos e a confirmação destrutiva continuam com texto", () => {
    expect(
      botoesDeTexto(`
        export function T() {
          return (
            <>
              <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction>Excluir permanentemente</AlertDialogAction></AlertDialogFooter>
              <BotaoDeIcone acao="editar" rotulo="Editar curso" />
            </>
          );
        }`),
    ).toEqual([]);
  });

  it("nenhuma tela tem botão de texto com verbo padrão", () => {
    const violacoes = [...arquivosTsx("app"), ...arquivosTsx("components")]
      .filter((a) => !FORA(a))
      .flatMap((a) =>
        botoesDeTexto(fs.readFileSync(path.join(RAIZ, a), "utf8"), a).map(
          (b) => `${a}:${b.linha} <${b.tag}> «${b.texto}»`,
        ),
      );
    expect(
      violacoes,
      `botão de texto com verbo padrão — use BotaoDeIcone (components/ciaara/botao-de-icone.tsx), com o rótulo no ` +
        `\`rotulo\`; no rodapé de diálogo, ponha os botões dentro de DialogFooter:\n${violacoes.join("\n")}`,
    ).toEqual([]);
  });
});

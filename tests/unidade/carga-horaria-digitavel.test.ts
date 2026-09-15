/**
 * `SC-002` da spec 006 — a contagem de campos de carga horária digitáveis em todo o sistema é **zero**.
 *
 * > *"Não MUST existir campo de carga horária digitável em formulário algum, e a escrita por fora da
 * > tela MUST ser recusada. ⚠️ "Permitir ajuste manual" é proibido."* — `FR-015`
 *
 * ⚠️ DUAS PORTAS DE ENTRADA, E A VARREDURA OLHA AS DUAS:
 *   1. **a tela** — arquivo de `app/` ou `components/` que tem controle de formulário não pode citar
 *      grandeza de carga do instrutor. Ler e exibir é permitido: a ficha e a listagem mostram a
 *      carga, mas não têm campo;
 *   2. **o caminho de escrita** — `lib/validacao/` e `lib/acoes/` não citam a grandeza **em nada**.
 *      Os campos do formulário são desenhados a partir de listas, e um campo novo numa lista não
 *      aparece como `name="…"` literal em JSX; o esquema do Zod é onde ele teria de entrar.
 *
 * ⚠️ O VOCABULÁRIO É O DA CARGA DO INSTRUTOR, E NÃO QUALQUER "CARGA HORÁRIA". `carga_horaria_tempos` da
 * disciplina, `ch_semanal` da disciplina e `ch_prevista_tempos` da unidade de ensino são dado
 * curricular da DEnsM, não grandeza derivada — pôr os dois aqui faria reprovar, no Épico 6, o cadastro que tem de digitá-los.
 *
 * ⚠️ A VARREDURA LÊ CÓDIGO SEM COMENTÁRIO, como as outras desta fatia: o cabeçalho que promete a
 * ausência não pode contar como violação.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();

/** As grandezas de carga do instrutor — as de `vw_instrutor_carga_anual` e os nomes da v1.0/v2.0. */
const GRANDEZA_DE_CARGA =
  /\b(ta_ministrado_ano|ta_previsto_ano|ta_previsto_semanal|ta_fiscalizado_ano|carga_horaria_ministrada\w*|carga_horaria_prevista\w*|carga_ministrada\w*|carga_prevista\w*|ch_ministrada\w*)\b/i;

/** Sinais de que o arquivo desenha um campo que aceita digitação ou escolha. */
const CONTROLE_DE_FORMULARIO = /<(input|select|textarea|Input|Select|Textarea|CampoDeEscolha)\b/;

function semComentario(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

function arquivos(pasta: string): string[] {
  const caminho = resolve(RAIZ, pasta);
  return readdirSync(caminho).flatMap((nome) => {
    const completo = join(caminho, nome);
    if (statSync(completo).isDirectory()) return arquivos(relative(RAIZ, completo));
    return /\.(ts|tsx)$/.test(nome) ? [relative(RAIZ, completo).replaceAll("\\", "/")] : [];
  });
}

/** A tela: controle de formulário e grandeza de carga no mesmo arquivo. */
function campoDeCargaNaTela(codigo: string): boolean {
  return CONTROLE_DE_FORMULARIO.test(codigo) && GRANDEZA_DE_CARGA.test(codigo);
}

/** O caminho de escrita: a grandeza não é citada em lugar nenhum. */
function cargaNoCaminhoDeEscrita(codigo: string): boolean {
  return GRANDEZA_DE_CARGA.test(codigo);
}

const TELA = [...arquivos("app"), ...arquivos("components")];
const ESCRITA = [...arquivos("lib/validacao"), ...arquivos("lib/acoes")];
const ler = (caminho: string) => semComentario(readFileSync(resolve(RAIZ, caminho), "utf8"));

describe("`SC-002` · zero campo de carga horária digitável", () => {
  it("nenhuma tela com campo de formulário cita a carga do instrutor", () => {
    const achados = TELA.filter((c) => campoDeCargaNaTela(ler(c)));
    expect(
      achados,
      `campo de carga horária em formulário: ${achados.join(", ")}. A carga é derivada ` +
        `(RN-INST-04): um número digitado é a origem de toda divergência com os lançamentos.`,
    ).toEqual([]);
  });

  it("nem o esquema do Zod nem a Server Action aceitam a carga do instrutor", () => {
    const achados = ESCRITA.filter((c) => cargaNoCaminhoDeEscrita(ler(c)));
    expect(
      achados,
      `a carga do instrutor chegou ao caminho de escrita: ${achados.join(", ")}.`,
    ).toEqual([]);
  });
});

describe("controle positivo — a varredura enxerga o que diz enxergar", () => {
  it("as pastas não estão vazias, e o formulário de instrutor é reconhecido como formulário", () => {
    expect(TELA.length).toBeGreaterThan(20);
    expect(ESCRITA.length).toBeGreaterThan(1);
    // Sem isto, um sinal de controle que não casa com nada faria o primeiro caso passar sempre.
    expect(
      CONTROLE_DE_FORMULARIO.test(ler("app/(app)/instrutores/FormularioDeInstrutor.tsx")),
    ).toBe(true);
  });

  it("um campo de carga digitável reprova, em JSX ou no esquema", () => {
    expect(campoDeCargaNaTela('<input name="ta_ministrado_ano" type="number" />')).toBe(true);
    expect(campoDeCargaNaTela('<CampoDeEscolha id="carga_prevista" opcoes={x} />')).toBe(true);
    expect(cargaNoCaminhoDeEscrita("z.object({ carga_horaria_ministrada_ano: z.number() })")).toBe(
      true,
    );
  });

  it("exibir a carga sem campo não reprova, e o comentário que a menciona também não", () => {
    expect(campoDeCargaNaTela("<dd>{linha.ta_ministrado_ano}</dd>")).toBe(false);
    expect(
      campoDeCargaNaTela(
        semComentario('/* ta_ministrado_ano nunca é campo */\n<input name="om" />'),
      ),
    ).toBe(false);
  });

  it("a CH curricular da disciplina e da unidade de ensino não é a carga do instrutor", () => {
    expect(campoDeCargaNaTela('<input name="carga_horaria_tempos" />')).toBe(false);
    expect(campoDeCargaNaTela('<input name="ch_prevista_tempos" />')).toBe(false);
    expect(campoDeCargaNaTela('<input name="ch_semanal" />')).toBe(false);
  });
});

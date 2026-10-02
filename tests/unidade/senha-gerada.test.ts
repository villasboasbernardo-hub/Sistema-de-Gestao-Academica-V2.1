/**
 * `FR-033` e `FR-034` · a senha temporária gerada pelo servidor.
 *
 * ⚠️ **ESTE TESTE USA O `crypto` DE VERDADE, não um sorteio falso.** O que está sob prova é que
 * **as senhas que o sistema emite** passam na política e não trazem símbolo ambíguo — e um sorteio
 * de mentira provaria isso sobre um gerador que não é o que roda em produção. O sorteio injetável
 * existe para o caso do viés, abaixo, que precisa de um gerador controlado.
 *
 * ⚠️ **1.000 SENHAS, E O NÚMERO NÃO É DECORAÇÃO.** Com 16 caracteres sobre 57 símbolos, repetição
 * por coincidência é astronomicamente improvável; mil repetições idênticas seriam o sintoma de um
 * gerador travado — que é o modo de falha de quem troca `randomInt` por algo semeado uma vez.
 */
import { randomInt } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  ALFABETO_SEM_AMBIGUIDADE,
  AMBIGUOS_PROIBIDOS,
  gerarSenhaTemporaria,
} from "@/lib/dominio/senha-gerada";
import {
  COMPRIMENTO_DA_SENHA_GERADA,
  conferirSenha,
  MINIMO_DE_CARACTERES,
} from "@/lib/dominio/politica-de-senha";

const QUANTAS = 1_000;

function milSenhas(): readonly string[] {
  return Array.from({ length: QUANTAS }, () => gerarSenhaTemporaria((n) => randomInt(n)));
}

describe("`FR-034` · a senha gerada", () => {
  const senhas = milSenhas();

  it("as 1.000 passam na política — o sistema não emite senha que ele mesmo recusa", () => {
    const recusadas = senhas.filter((s) => !conferirSenha(s).aceita);
    expect(recusadas, `${recusadas.length} de ${QUANTAS} reprovaram na política`).toHaveLength(0);
  });

  it("⚠️ NENHUMA das 1.000 se repete — gerador travado daria mil iguais", () => {
    expect(new Set(senhas).size).toBe(QUANTAS);
  });

  it("⚠️ NENHUMA traz `O`, `0`, `l`, `1` ou `I` — a senha é ditada em voz alta", () => {
    for (const proibido of AMBIGUOS_PROIBIDOS) {
      const comAmbiguo = senhas.filter((s) => s.includes(proibido));
      expect(comAmbiguo.slice(0, 3), `senha com \`${proibido}\``).toHaveLength(0);
    }
  });

  it("o alfabeto também não CONTÉM os cinco — a varredura acima pega uso, esta pega a origem", () => {
    // ⚠️ Sem esta asserção, alguém que reescrevesse o alfabeto em ordem (`ABC…Z0123…`) só seria
    //    pego por sorte: com 16 de 62 símbolos, uma senha sem nenhum dos cinco é comum.
    for (const proibido of AMBIGUOS_PROIBIDOS) {
      expect(ALFABETO_SEM_AMBIGUIDADE, `o alfabeto traz \`${proibido}\``).not.toContain(proibido);
    }
  });

  it("o comprimento é o declarado, e ele está ACIMA do mínimo da política", () => {
    for (const s of senhas.slice(0, 50)) expect(s).toHaveLength(COMPRIMENTO_DA_SENHA_GERADA);
    expect(COMPRIMENTO_DA_SENHA_GERADA).toBeGreaterThan(MINIMO_DE_CARACTERES);
  });

  it("⚠️ O CASO QUE DISCRIMINA do viés · todo símbolo do alfabeto é alcançável", () => {
    // Um gerador com `byte % n` nunca emite os últimos símbolos quando `n` não divide 256, e o
    // formato da senha continua perfeito — nenhuma asserção acima pegaria.
    const vistos = new Set([...senhas.join("")]);
    const inalcancaveis = [...ALFABETO_SEM_AMBIGUIDADE].filter((c) => !vistos.has(c));
    expect(
      inalcancaveis,
      `${inalcancaveis.length} símbolos nunca saíram em ${QUANTAS} senhas de ${COMPRIMENTO_DA_SENHA_GERADA}`,
    ).toHaveLength(0);
  });

  it("⚠️ O CASO QUE DISCRIMINA do sorteio · com sorteio fixo, a senha é um símbolo repetido", () => {
    // Controle positivo do próprio gerador: se ele ignorasse o sorteio e usasse outra fonte, este
    // caso reprovaria — e é ele que garante que o `randomInt` injetado acima é de fato o que decide.
    expect(gerarSenhaTemporaria(() => 0, 8)).toBe(ALFABETO_SEM_AMBIGUIDADE[0]!.repeat(8));
  });
});

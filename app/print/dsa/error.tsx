/**
 * A degradação da impressão (`RN-DEG-01`, DoD 7).
 *
 * ⚠️ **`"use client"` AQUI É EXIGÊNCIA DO NEXT, e a guarda declara a exceção:**
 * `fronteira-das-telas.test.ts` isenta `error.tsx` nominalmente e, **com controle positivo**, exige
 * que todos eles tenham o marcador — uma isenção que não cobra nada guardaria nada.
 *
 * ⚠️ **NENHUM TEXTO TÉCNICO CHEGA AQUI** (`SC-013`): `error.digest` é identificador de registro, e
 * um documento oficial não carrega código de erro. Quem precisa do papel volta à grade, conserta o
 * que falta e imprime de novo — e a grade já avisa **antes** o que vai sair faltando (`FR-039`).
 */
"use client";

export default function ErroNaImpressao({ reset }: { readonly reset: () => void }) {
  return (
    <section role="alert" data-slot="erro-na-impressao">
      <h1>Não foi possível montar este Detalhe Semanal de Aula.</h1>
      <p>
        Volte à semana do DSA da turma e confira os avisos que aparecem ao lado do botão
        <strong> Imprimir</strong> — eles dizem o que está faltando.
      </p>
      <button type="button" onClick={reset}>
        Tentar de novo
      </button>
    </section>
  );
}

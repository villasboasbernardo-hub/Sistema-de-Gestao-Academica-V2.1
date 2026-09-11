"use client";

/**
 * Alternador de tema (`FR-006`, `FR-022`).
 *
 * ⚠️ ELE CHEGOU AO LUGAR DELE EM 11/09/2026, e a mudança de endereço é parte do requisito. Na fatia
 * (a) ele morava em `components/ciaara/` e aparecia na vitrine, porque sem cabeçalho e sem navegação
 * **não haveria onde clicar**. O `FR-018` manda substituir, não duplicar: com a casca de pé ele é
 * **cromo**, não vocabulário de domínio, e por isso mudou de pasta junto com o de tela.
 *
 * ⚠️ **E A MUDANÇA DE PASTA NÃO É COSMÉTICA.** A invariante da fatia (a) exige que **todo** componente
 * de `components/ciaara/` tenha amostra na vitrine — foi ela que acusou a remoção, e com razão:
 * enquanto o arquivo estivesse ali, tirá-lo da vitrine o deixaria sem exemplo utilizável. Movê-lo
 * concilia os dois requisitos em vez de isentar um deles.
 *
 * ⚠️ `suppressHydrationWarning` NO BOTÃO, e não um estado de montagem: no servidor não se sabe
 * qual tema o navegador vai resolver, então `aria-pressed` diverge de propósito. A alternativa
 * usual — marcar montagem num efeito — é o que a regra `react-hooks/set-state-in-effect` barra,
 * com razão: efeito que só existe para chamar `setState` é renderização em duas passadas.
 */
import { useTheme } from "next-themes";

const OPCOES = [
  { valor: "light", rotulo: "Claro" },
  { valor: "dark", rotulo: "Noturno" },
  { valor: "system", rotulo: "Sistema" },
] as const;

export function SeletorDeTema() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2" data-testid="seletor-de-tema">
      <span className="text-texto-suave text-sm">Tema:</span>
      {OPCOES.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => setTheme(o.valor)}
          suppressHydrationWarning
          aria-pressed={theme === o.valor}
          data-testid={`tema-${o.valor}`}
          className="border-borda-forte rounded-ciaara-sm aria-pressed:bg-marca aria-pressed:text-marca-contraste border px-2 py-1 text-sm"
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

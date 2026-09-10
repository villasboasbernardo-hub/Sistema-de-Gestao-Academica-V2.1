"use client";

/**
 * Alternador de tema (`FR-006`, `FR-022`).
 *
 * ⚠️ ELE É PROVISÓRIO DESTA FATIA. O definitivo entra no cabeçalho da fatia (c), que é onde ele
 * pertence. Aqui ele existe porque, sem cabeçalho e sem navegação, **não haveria onde clicar** —
 * e a história 2 sairia da fatia sem que ninguém, nem pessoa nem teste, pudesse exercitá-la.
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

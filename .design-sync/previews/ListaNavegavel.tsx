import * as React from "react";
import { CelulaNavegavel, ListaNavegavel } from "ciaara-11-ds";

const TURMAS = ["C-Ap-HN 2026", "CAHO 2026", "C-Espc-HN 2026", "C-Ap-FR 2026", "C-Exp-Obs-ME 2026"];

export function ListaDeOpcoes() {
  const [escolhida, definir] = React.useState("CAHO 2026");
  return (
    <div className="border-borda bg-superficie w-72 rounded-md border p-1">
      <ListaNavegavel
        linhas={TURMAS.length}
        colunas={1}
        rotulo="Turmas de 2026"
        papel="listbox"
        aoAtivar={(p) => definir(TURMAS[p.linha] ?? escolhida)}
      >
        <ul className="flex flex-col">
          {TURMAS.map((t, i) => (
            <li key={t}>
              <CelulaNavegavel linha={i} coluna={0}>
                <button
                  type="button"
                  role="option"
                  aria-selected={t === escolhida}
                  onClick={() => definir(t)}
                  className={
                    t === escolhida
                      ? "bg-marca-suave text-texto w-full rounded-sm px-2 py-1.5 text-left text-sm font-medium"
                      : "text-texto hover:bg-superficie-2 w-full rounded-sm px-2 py-1.5 text-left text-sm"
                  }
                >
                  {t}
                </button>
              </CelulaNavegavel>
            </li>
          ))}
        </ul>
      </ListaNavegavel>
      <p className="text-texto-suave px-2 pt-2 text-xs">Setas andam; Enter escolhe: {escolhida}</p>
    </div>
  );
}

const DISCIPLINAS = [
  ["IV", "Meteorologia", "60"],
  ["V", "Navegação", "92"],
  ["XI", "Hidrografia", "148"],
];

export function GradeDeCelulas() {
  return (
    <ListaNavegavel linhas={DISCIPLINAS.length} colunas={3} rotulo="Disciplinas" papel="nenhum">
      <table
        role="grid"
        aria-label="Disciplinas"
        className="border-borda text-texto w-96 border text-sm"
      >
        <tbody>
          {DISCIPLINAS.map((linha, i) => (
            <tr key={linha[0]}>
              {linha.map((valor, j) => (
                <CelulaNavegavel key={valor} linha={i} coluna={j}>
                  <td className="border-borda focus-visible:ring-foco border px-2 py-1 outline-none focus-visible:ring-2">
                    {valor}
                  </td>
                </CelulaNavegavel>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ListaNavegavel>
  );
}

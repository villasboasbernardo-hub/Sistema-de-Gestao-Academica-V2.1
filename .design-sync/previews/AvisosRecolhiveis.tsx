import * as React from "react";
import { AvisosRecolhiveis } from "ciaara-11-ds";

/*
 * O componente nasce recolhido e guarda o estado consigo (fora da URL). Para fotografar o quadro
 * aberto, a prévia aciona o próprio botão uma vez, ao montar — o mesmo clique de quem usa.
 */
function AbrirAoMontar({ children }: { readonly children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button[aria-expanded="false"]')?.click();
  }, []);
  return <div ref={ref}>{children}</div>;
}

/** O quadro do catálogo de cursos: faixa de aviso, título e as contagens sempre à vista. */
function QuadroDoCatalogo() {
  return (
    <section className="border-atrasado-borda bg-atrasado-fundo rounded-ciaara flex max-w-2xl flex-col gap-2 border p-3 text-sm">
      <h2 className="text-atrasado-tinta font-semibold">Avisos de qualidade de cadastro</h2>
      <AvisosRecolhiveis
        contagens={
          <ul className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <li className="text-texto">
              Sem duração em semanas: <strong>3</strong>
            </li>
            <li className="text-texto">
              Sem propósito: <strong>2</strong>
            </li>
            <li className="text-texto">
              Total: <strong>5</strong> avisos
            </li>
          </ul>
        }
      >
        <ul className="flex flex-col gap-2">
          <li className="flex flex-col gap-1">
            <p className="text-texto font-medium">Sem duração em semanas: 3</p>
            <p className="text-texto">C-Ap-HN · C-Ap-FR · C-Esp-ALH</p>
          </li>
          <li className="flex flex-col gap-1">
            <p className="text-texto font-medium">Sem propósito: 2</p>
            <p className="text-texto">C-Exp-BATI · C-ApA-OcOp-PR-SP</p>
          </li>
        </ul>
      </AvisosRecolhiveis>
    </section>
  );
}

export function Recolhido() {
  return <QuadroDoCatalogo />;
}

export function Aberto() {
  return (
    <AbrirAoMontar>
      <QuadroDoCatalogo />
    </AbrirAoMontar>
  );
}

/** O quadro da ficha da turma: superfície neutra e uma contagem só. */
export function QuadroDaTurma() {
  return (
    <AbrirAoMontar>
      <section className="border-borda bg-superficie rounded-ciaara flex max-w-2xl flex-col gap-2 border p-3">
        <h2 className="text-atrasado-tinta font-semibold">Avisos de qualidade de cadastro</h2>
        <AvisosRecolhiveis
          contagens={
            <p className="text-texto">
              <strong>3</strong> avisos
            </p>
          }
        >
          <ul className="flex flex-col gap-1">
            <li className="text-texto">Sala não alocada</li>
            <li className="text-texto">
              Efetivo não informado em turma que já saiu do planejamento
            </li>
            <li className="text-texto">Turma ativa com término já passado</li>
          </ul>
        </AvisosRecolhiveis>
      </section>
    </AbrirAoMontar>
  );
}

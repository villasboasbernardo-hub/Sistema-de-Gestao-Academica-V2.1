/**
 * A navegação interna da administração (`SC-002`, `SC-003`, `RF-CURSO-02` por analogia).
 *
 * ⚠️ **ELA EXISTE PORQUE `/admin/permissoes` NÃO ERA ALCANÇÁVEL POR CLIQUE NENHUM.** Medido em
 * 11/09/2026: a tela existia desde o Épico 3 e a única forma de chegar nela era digitar o endereço.
 * O `SC-003` cobra **zero** telas alcançáveis apenas por digitação, e esta era uma.
 *
 * ⚠️ **E ELA NÃO VIRA ENTRADA NO MENU LATERAL, de propósito.** Se Administração é entrada única ou
 * grupo é **uma das três perguntas que só quem vê a v2.0 responde** (`FR-017.1`), e o `RF-NAV-02` é
 * **[PRESERVADO]**: a troca de mecanismo de estado não autoriza reorganizar o menu. Resolver o
 * alcance sem mexer no menu é o mesmo padrão que o `RF-CURSO-02` manda usar para Avaliações e
 * Relatório — a função é alcançada **pela tela de que ela faz parte**.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** A aba ativa é derivada do caminho, no servidor.
 */
import { headers } from "next/headers";
import Link from "next/link";
import { cn } from "cn";

import { CABECALHO_DO_CAMINHO, caminhoOuRaiz } from "@/lib/navegacao/caminho";

const ABAS = [
  { rotulo: "Usuários", rota: "/admin/usuarios" },
  { rotulo: "Permissões", rota: "/admin/permissoes" },
] as const;

export default async function LayoutDaAdministracao({ children }: { children: React.ReactNode }) {
  const caminho = caminhoOuRaiz((await headers()).get(CABECALHO_DO_CAMINHO));

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Administração" data-slot="abas-da-administracao">
        <ul className="border-borda flex gap-1 border-b">
          {ABAS.map((aba) => {
            const ativa = caminho === aba.rota || caminho.startsWith(`${aba.rota}/`);
            return (
              <li key={aba.rota}>
                <Link
                  href={aba.rota}
                  {...(ativa ? { "aria-current": "page" as const } : {})}
                  className={cn(
                    "-mb-px inline-block border-b-2 px-3 py-2 text-sm",
                    "focus-visible:ring-marca focus-visible:ring-2 focus-visible:outline-none",
                    ativa
                      ? "border-marca text-texto font-medium"
                      : "text-texto-suave border-transparent",
                  )}
                >
                  {aba.rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
    </div>
  );
}

/**
 * As abas da Administração — Usuários, Permissões e Salas —, com a aba ativa pelo caminho do NAVEGADOR.
 *
 * ⚠️ **O MESMO DEFEITO DO MENU LATERAL** (conferência do PR #67, 17/10/2026): `layout.tsx` decidia a
 * aba ativa pelo caminho lido do cabeçalho da requisição, e o App Router não redesenha o layout ao
 * trocar de aba por clique — a aba marcada ficava a de entrada na Administração. O caminho sempre
 * atual é o do navegador (`usePathname`), e por isso esta folha; o layout continua servidor.
 *
 * ⚠️ **A REGRA É A MESMA DE ANTES, por prefixo de segmento**: `/admin/usuarios/novo` acende *Usuários*.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const ABAS = [
  { rotulo: "Usuários", rota: "/admin/usuarios" },
  { rotulo: "Permissões", rota: "/admin/permissoes" },
  /*
   * ⚠️ **SALAS ENTRA AQUI, E NÃO NO MENU LATERAL** (`FR-029`, 23/09/2026). É o mesmo motivo das
   *    outras duas: Administração é entrada única, decidida na MENU-1, e a lista de salas é
   *    parâmetro administrado — não um módulo do ensino. Sem esta aba ela seria alcançável só por
   *    digitação, que é o que o `SC-003` proíbe.
   */
  { rotulo: "Salas", rota: "/admin/salas" },
] as const;

export function AbasDaAdministracao() {
  const caminho = usePathname() ?? "/";

  return (
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
  );
}

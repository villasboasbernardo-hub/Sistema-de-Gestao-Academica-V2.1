/**
 * O menu lateral (`RF-NAV-02`, `FR-017`, `FR-019`, `FR-021`).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** A entrada ativa é derivada do caminho, no servidor: ela muda por
 * navegação, não por interação. Não há estado a guardar, e por isso não há o que sincronizar — **a
 * entrada ativa é a URL**. O abrir e fechar de tela estreita vive noutro arquivo, e só ele é cliente.
 *
 * ⚠️ **ESCONDER ENTRADA NÃO PROTEGE NADA** (Princípio XI). Quem nega acesso é o banco, ainda que a
 * pessoa digite a URL. O menu é cortesia.
 *
 * ⚠️ **A ENTRADA ATIVA É COMUNICADA ALÉM DA COR** (`FR-021`): `aria-current="page"`, um traço à
 * esquerda e o peso da fonte. É o `FR-025` da fatia (b) aplicado à navegação — quem não distingue as
 * duas cores continua sabendo onde está.
 */
import Link from "next/link";
import { cn } from "cn";

import { PainelRetratil } from "@/components/casca/painel-retratil";
import { entradaAtiva, MENU } from "@/lib/navegacao/menu";

const ID_DO_PAINEL = "navegacao-principal";

export function NavegacaoLateral({ caminho }: { readonly caminho: string }) {
  const ativa = entradaAtiva(caminho);

  return (
    <PainelRetratil idDoPainel={ID_DO_PAINEL}>
      <nav
        aria-label="Navegação principal"
        data-slot="navegacao-lateral"
        className="border-borda bg-superficie-2 lg:h-full lg:w-56 lg:shrink-0 lg:border-r"
      >
        <ul className="flex flex-col gap-0.5 p-2">
          {MENU.map((entrada) => {
            const estaAtiva = ativa?.rota === entrada.rota;

            if (!entrada.disponivel) {
              /*
               * ⚠️ A ENTRADA QUE AINDA NÃO TEM TELA APARECE, E DIZ QUE NÃO TEM. Um menu que cresce
               * a cada épico ensina quem usa a reaprender a navegação sete vezes, e o `RF-NAV-02` é
               * **[PRESERVADO]**: ele manda manter os mesmos pontos de entrada de hoje. Quem chega
               * numa entrada futura sabe que ela vem, em vez de concluir que o sistema perdeu a
               * função — que é a leitura de quem migra de uma versão que tinha tudo.
               */
              return (
                <li key={entrada.rota}>
                  {/* veste: rótulo e etiqueta da entrada sem tela — texto fixo, nunca dado */}
                  <span
                    className="text-texto-tenue rounded-ciaara-sm flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    aria-disabled="true"
                    data-entrada={entrada.rota}
                  >
                    {entrada.rotulo}
                    <span className="text-2xs">em breve</span>
                  </span>
                </li>
              );
            }

            return (
              <li key={entrada.rota}>
                <Link
                  href={entrada.rota}
                  data-entrada={entrada.rota}
                  {...(estaAtiva ? { "aria-current": "page" as const } : {})}
                  className={cn(
                    "rounded-ciaara-sm flex items-center border-l-2 px-3 py-2 text-sm",
                    "hover:bg-marca-suave focus-visible:ring-marca focus-visible:ring-2 focus-visible:outline-none",
                    estaAtiva
                      ? "border-marca bg-marca-suave text-texto font-medium"
                      : "text-texto-suave border-transparent",
                  )}
                >
                  {entrada.rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </PainelRetratil>
  );
}

/**
 * A porta de entrada (`FR-030`, `SC-002`) — desde o Bloco 13 (spec 028, 27/10/2026), a **abertura com a moeda do
 * CIAARA**: só a moeda e o botão **"Início"**, que leva ao Início.
 *
 * ⚠️ **ELA ERA UM BECO ATÉ 11/09/2026**, e a palavra é literal: mostrava que a fundação estava de pé
 * e **não levava a lugar nenhum**. Quem entrava no sistema sem destino guardado terminava aqui, numa
 * página sem um único link, e a única saída era digitar um endereço. O `SC-003` cobra que o número
 * de telas alcançáveis só por digitação seja **zero**, e esta era a primeira delas. O botão "Início" da abertura é a
 * saída, e sem JavaScript ele aparece pelo `<noscript>`.
 *
 * ⚠️ **A RAIZ EXIGE SESSÃO** (`SEM_SESSAO` em `lib/supabase/middleware.ts`): quem entra sem destino cai aqui
 * (`DESTINO_PADRAO`), e a abertura é a tela de boas-vindas. O Bloco 13 não mexe em login, proxy nem redirecionamento.
 *
 * ⚠️ **O AVISO DE CONFIGURAÇÃO FICA, e não é resíduo do Épico 0** — com a mesma marcação, o mesmo texto e a mesma
 * condição de antes do Bloco 13 (FR-002 da spec 028). É a explicação para quem chegar aqui com variável de ambiente
 * faltando, em vez de bater numa tela de login que não tem como funcionar.
 *
 * ⚠️ **SERVER COMPONENT, COM UMA FOLHA DE CLIENTE**: a animação vive em `AberturaComMoeda.tsx`. O fundo é desta página:
 * o degradê do protótipo com os tokens do sistema — `superficie` → `fundo` no claro, `ciaara-azul-800` → `900` no escuro.
 */
import { conferirAmbiente, mensagemDeConfiguracaoIncompleta } from "@/lib/ambiente";

import { AberturaComMoeda } from "./AberturaComMoeda";

export default function Raiz() {
  const faltas = conferirAmbiente();
  const aviso = mensagemDeConfiguracaoIncompleta(faltas);

  return (
    <main
      aria-label="Abertura do CIAARA-11"
      className="from-superficie to-fundo dark:from-ciaara-azul-800 dark:to-ciaara-azul-900 flex min-h-0 flex-1 flex-col bg-radial-[90%_70%_at_50%_42%] to-70%"
    >
      {aviso ? (
        <div className="mx-auto w-full max-w-3xl px-4 pt-6">
          <section className="border-atrasado-borda bg-atrasado-fundo text-atrasado-tinta rounded-ciaara border p-4">
            <h2 className="font-semibold">Configuração incompleta</h2>
            <pre className="mt-2 text-sm whitespace-pre-wrap">{aviso}</pre>
          </section>
        </div>
      ) : null}

      <AberturaComMoeda />
    </main>
  );
}

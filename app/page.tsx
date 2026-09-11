/**
 * A porta de entrada pública (`FR-030`, `SC-002`).
 *
 * ⚠️ **ELA ERA UM BECO ATÉ 11/09/2026**, e a palavra é literal: mostrava que a fundação estava de pé
 * e **não levava a lugar nenhum**. Quem entrava no sistema sem destino guardado terminava aqui, numa
 * página sem um único link, e a única saída era digitar um endereço. O `SC-003` cobra que o número
 * de telas alcançáveis só por digitação seja **zero**, e esta era a primeira delas.
 *
 * ⚠️ **O AVISO DE CONFIGURAÇÃO FICA, e não é resíduo do Épico 0.** Ele é a única tela do sistema que
 * se alcança **sem sessão e sem banco** — se faltar variável de ambiente, é aqui que a pessoa lê o
 * que falta, em vez de bater numa tela de login que não tem como funcionar.
 *
 * ⚠️ **LINK, E NÃO REDIRECIONAMENTO.** Mandar direto para `/inicio` empurraria quem não tem sessão
 * para o login sem nunca ver o aviso acima — e um sistema que não sobe mandaria a pessoa para a tela
 * que menos explica o que houve.
 */
import Link from "next/link";

import { ambienteAtual, conferirAmbiente, mensagemDeConfiguracaoIncompleta } from "@/lib/ambiente";

export default function Raiz() {
  const faltas = conferirAmbiente();
  const aviso = mensagemDeConfiguracaoIncompleta(faltas);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">CIAARA-11 · Gestão Acadêmica</h1>
        <p className="text-texto-suave text-sm">
          Divisão de Administração Acadêmica. Ambiente: <strong>{ambienteAtual()}</strong>.
        </p>
      </header>

      {aviso ? (
        <section className="border-atrasado-borda bg-atrasado-fundo text-atrasado-tinta rounded-ciaara border p-4">
          <h2 className="font-semibold">Configuração incompleta</h2>
          <pre className="mt-2 text-sm whitespace-pre-wrap">{aviso}</pre>
        </section>
      ) : null}

      {/*
        ⚠️ O CAMINHO PARA DENTRO APARECE MESMO COM A CONFIGURAÇÃO INCOMPLETA, e isso é decisão. A
        primeira versão mostrava **ou** o aviso **ou** o link, e o efeito era o pior dos dois mundos:
        num ambiente com variável faltando, a raiz voltava a ser o beco que este arquivo veio
        consertar. Quem clicar sem configuração encontra a tela que explica o que falta — o proxy já
        cuida disso, e ele explica melhor do que uma página sem saída.
      */}
      <section className="flex flex-col items-start gap-3">
        <p className="text-texto text-sm">
          O panorama das turmas fica na tela Início. O acesso é <strong>somente por convite</strong>{" "}
          do Admin.
        </p>
        <Link
          href="/inicio"
          className="bg-marca text-marca-contraste rounded-ciaara focus-visible:ring-marca inline-block px-4 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Ir para o Início
        </Link>
      </section>

      <footer className="text-texto-suave text-sm">
        <p>
          A produção do CIAARA-11 continua sendo a <strong>v2.0</strong> até o corte. Esta é a
          plataforma nova, no mesmo domínio.
        </p>
      </footer>
    </main>
  );
}

/**
 * Semana anterior · atual · próxima — e a coluna de sábado (`RF-DSA-02`, `RF-NAV-04`, `Q-4`).
 *
 * ⚠️ **FOLHA DE CLIENTE, DECLARADA.** Ela escreve na URL pelo gancho de `nuqs`, que é estado de
 * navegador. A grade continua no servidor; só estes quatro controles atravessam a fronteira.
 *
 * ⚠️ **`semana` E `ano` EMPILHAM NO HISTÓRICO, e é o `RF-NAV-04` literal** — *"navegar entre
 * semanas usa o histórico do navegador"*. O padrão da biblioteca é SUBSTITUIR: com ele a URL
 * ficaria certa, o link compartilhado abriria na semana certa, **e o botão voltar sairia da tela**
 * em vez de voltar uma semana. Quem garante isso é o contrato, e há asserção sobre ele.
 *
 * ⚠️ **A VIRADA DO ANO É O CASO QUE QUASE NINGUÉM TESTA, e ela acontece DUAS vezes por turma**: a
 * semana anterior à 1 é a **última do ano anterior** — que pode ser 52 **ou 53** —, e a seguinte à
 * última é a 1 do ano seguinte. Um `semana - 1` sem isso produziria `?semana=0`, que o contrato
 * degrada para a semana corrente: o botão "anterior" saltaria para hoje, em silêncio.
 */
"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { semanasDoAnoIso } from "@/lib/dominio/carga-semanal";
import { Button } from "@/components/ui/button";

import { enderecoDoDsa } from "./consulta";

export type NavegacaoDaSemanaProps = {
  readonly codigo: string;
  readonly ano: number;
  readonly semana: number;
  readonly sabadoAberto: boolean;
};

/** A semana anterior, atravessando a virada do ano. */
export function anterior(ano: number, semana: number): { ano: number; semana: number } {
  if (semana > 1) return { ano, semana: semana - 1 };
  const passado = ano - 1;
  return { ano: passado, semana: semanasDoAnoIso(passado) };
}

/** A semana seguinte, atravessando a virada do ano. */
export function proxima(ano: number, semana: number): { ano: number; semana: number } {
  if (semana < semanasDoAnoIso(ano)) return { ano, semana: semana + 1 };
  return { ano: ano + 1, semana: 1 };
}

export function NavegacaoDaSemana({ codigo, ano, semana, sabadoAberto }: NavegacaoDaSemanaProps) {
  const router = useRouter();

  /*
   * ⚠️ `router.push` e NÃO `replace`: é o `push` que empilha, e é o empilhamento que faz o botão
   * voltar do navegador voltar **uma semana** (`RF-NAV-04`). Trocar por `replace` deixaria o
   * histórico sem nada para desfazer, com a URL correta — o defeito silencioso do `FR-004`.
   */
  const ir = React.useCallback(
    (destino: { ano: number; semana: number }) => {
      router.push(
        enderecoDoDsa(codigo, {
          semana: destino.semana,
          ano: destino.ano,
          ...(sabadoAberto ? { sabado: true } : {}),
        }),
      );
    },
    [codigo, router, sabadoAberto],
  );

  const antes = anterior(ano, semana);
  const depois = proxima(ano, semana);

  return (
    <nav
      aria-label="Navegação da semana"
      className="flex flex-wrap items-center gap-2"
      data-slot="navegacao-da-semana"
    >
      <Button variant="outline" size="sm" onClick={() => ir(antes)} data-acao="semana-anterior">
        Semana anterior
      </Button>
      {/*
       * ⚠️ "Esta semana" leva ao endereço SEM parâmetro — e é isso que o torna favoritável: o
       * valor no padrão não aparece na URL, então o link guardado abre sempre na semana corrente.
       */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(enderecoDoDsa(codigo))}
        data-acao="semana-atual"
      >
        Esta semana
      </Button>
      <Button variant="outline" size="sm" onClick={() => ir(depois)} data-acao="semana-proxima">
        Próxima semana
      </Button>
      <span className="ml-1 text-sm tabular-nums text-texto-suave" data-slot="semana-atual">
        semana {semana} de {ano}
      </span>
      {/*
       * O sábado (`Q-4`): entra **por ação do operador**. ⚠️ Quando há lançamento nele a coluna
       * aparece de qualquer jeito, e aí o botão só muda o que já está à vista — esconder um
       * lançamento gravado seria esconder um fato.
       */}
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto"
        aria-pressed={sabadoAberto}
        onClick={() =>
          router.push(
            enderecoDoDsa(codigo, {
              semana,
              ano,
              ...(sabadoAberto ? {} : { sabado: true }),
            }),
          )
        }
        data-acao="alternar-sabado"
      >
        {sabadoAberto ? "Fechar o sábado" : "Abrir o sábado"}
      </Button>
    </nav>
  );
}

/**
 * A semana dos DSA publicados no Início — folha de cliente (Bloco 11, RD-7, D-28).
 *
 * > *"Abre na semana de hoje (seg–sáb); ícone de calendário escolhe outra semana (anterior/seguinte)."* — Bernardo Villas
 * > Boas, 26/10/2026
 *
 * ⚠️ **A SEMANA VAI PARA A URL** (`?semana=`, uma data da semana): o link abre na mesma semana, e anterior/seguinte
 *    empilham no histórico, como no DSA (`RF-NAV-04`). As datas de anterior e seguinte chegam prontas do servidor.
 * ⚠️ **O CALENDÁRIO É O DO NAVEGADOR, SEM PACOTE** (o mesmo campo de data da navegação do DSA): escolhida uma data, a
 *    semana é a que a contém — quem valida é o servidor (`semanaDaDataEscolhida`); data inválida cai na de hoje.
 */
"use client";

import * as React from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useParametro } from "@/lib/navegacao/usar-parametro";

export function EscolhaDaSemana({
  rotulo,
  dataDaSemana,
  anterior,
  seguinte,
  ehAAtual,
}: {
  /** *"26/10 a 31/10/2026"*. */
  readonly rotulo: string;
  /** A segunda-feira da semana mostrada, `aaaa-mm-dd` — o valor do calendário. */
  readonly dataDaSemana: string;
  readonly anterior: string;
  readonly seguinte: string;
  /** A semana mostrada é a de hoje: o «Esta semana» some. */
  readonly ehAAtual: boolean;
}) {
  const [, definirSemana, esperando] = useParametro("/inicio", "semana");
  const [calendarioAberto, definirCalendarioAberto] = React.useState(false);

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Semana dos DSA publicados"
      data-slot="escolha-da-semana"
      data-esperando={esperando ? "sim" : "nao"}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => void definirSemana(anterior)}
        data-acao="semana-anterior"
      >
        Semana anterior
      </Button>
      <span className="text-texto text-sm tabular-nums" data-slot="rotulo-da-semana">
        {rotulo}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void definirSemana(seguinte)}
        data-acao="semana-seguinte"
      >
        Semana seguinte
      </Button>
      {ehAAtual ? null : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void definirSemana(null)}
          data-acao="semana-atual"
        >
          Esta semana
        </Button>
      )}
      <BotaoDeIcone
        acao="escolher-semana"
        rotulo="Escolher a semana no calendário"
        variante="contorno"
        aria-expanded={calendarioAberto}
        onClick={() => definirCalendarioAberto((v) => !v)}
        data-slot="abrir-calendario-da-semana"
      />
      {calendarioAberto ? (
        <Input
          type="date"
          aria-label="Uma data da semana"
          className="w-auto"
          defaultValue={dataDaSemana}
          onChange={(e) => {
            if (e.target.value !== "") {
              definirCalendarioAberto(false);
              void definirSemana(e.target.value);
            }
          }}
          data-slot="data-da-semana"
        />
      ) : null}
    </div>
  );
}

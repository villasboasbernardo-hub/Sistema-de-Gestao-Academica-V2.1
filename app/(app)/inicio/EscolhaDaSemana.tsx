/**
 * A semana dos DSA publicados no Início — folha de cliente (Bloco 11, RD-7, D-28).
 *
 * > *"Abre na semana de hoje (seg–sáb); ícone de calendário escolhe outra semana (anterior/seguinte)."* — Bernardo Villas
 * > Boas, 26/10/2026
 *
 * ⚠️ **A SEMANA VAI PARA A URL** (`?semana=`, uma data da semana): o link abre na mesma semana, e anterior/seguinte
 *    empilham no histórico, como no DSA (`RF-NAV-04`). As datas de anterior e seguinte chegam prontas do servidor.
 * ⚠️ **O CALENDÁRIO É O DO NAVEGADOR, SEM PACOTE** (o mesmo campo de data da navegação do DSA): escolhida uma data, a
 *    semana é a que a contém — `semanaDaDataEscolhida`, aqui e no servidor (data inválida lá cai na de hoje).
 * ⚠️ **COMO NO DSA, UM RASCUNHO E A CONFERÊNCIA ANTES DE NAVEGAR** (revisão do Bloco 11): navegar e fechar o campo no
 *    primeiro `onChange` engolia a digitação — o dia "1" de "15" já é uma data, e o ano "2" virava `0002-…`, que o
 *    servidor descartava em silêncio. O campo fica aberto (o ícone o abre e o fecha); só a data inteira, nos anos da
 *    URL e de outra semana, navega — e ao sair do campo ele volta a dizer a semana aberta.
 */
"use client";

import * as React from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { semanaIsoDe } from "@/lib/dominio/carga-semanal";
import {
  datasEscolhiveis,
  semanaDaDataEscolhida,
  type FaixaDeAnos,
} from "@/lib/dominio/dsa/semana-pela-data";
import { useParametro } from "@/lib/navegacao/usar-parametro";

export function EscolhaDaSemana({
  rotulo,
  dataDaSemana,
  anterior,
  seguinte,
  ehAAtual,
  anos,
}: {
  /** *"26/10 a 31/10/2026"*. */
  readonly rotulo: string;
  /** A segunda-feira da semana mostrada, `aaaa-mm-dd` — o valor do calendário. */
  readonly dataDaSemana: string;
  readonly anterior: string;
  readonly seguinte: string;
  /** A semana mostrada é a de hoje: o «Esta semana» some. */
  readonly ehAAtual: boolean;
  /** Os anos que a URL aceita — os mesmos do DSA (`ANOS_DA_URL`). */
  readonly anos: FaixaDeAnos;
}) {
  const [, definirSemana, esperando] = useParametro("/inicio", "semana");
  const [calendarioAberto, definirCalendarioAberto] = React.useState(false);
  const [rascunho, definirRascunho] = React.useState<string | null>(null);
  const escolhiveis = datasEscolhiveis(anos);

  const escolherData = (valor: string) => {
    definirRascunho(valor);
    const destino = semanaDaDataEscolhida(valor, anos);
    /* Apagada, incompleta, inexistente ou fora dos anos da URL: não navega (`RN-DEG-01`). */
    if (destino === null) return;
    const aberta = semanaIsoDe(dataDaSemana);
    if (aberta !== null && aberta.ano === destino.ano && aberta.numero === destino.numero) return;
    void definirSemana(valor);
  };

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
          min={escolhiveis.primeira}
          max={escolhiveis.ultima}
          value={rascunho ?? dataDaSemana}
          onChange={(e) => escolherData(e.target.value)}
          onBlur={() => definirRascunho(null)}
          data-slot="data-da-semana"
        />
      ) : null}
    </div>
  );
}

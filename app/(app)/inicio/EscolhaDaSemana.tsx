/**
 * A semana dos DSA publicados no Início — folha de cliente (Bloco 11, RD-7, D-28; Bloco 15, spec 030, `FR-002`).
 *
 * > *"Abre na semana de hoje (seg–sáb); ícone de calendário escolhe outra semana (anterior/seguinte)."* — Bernardo Villas
 * > Boas, 26/10/2026
 *
 * > *"SETAS (RT-1): semana com ícones de seta nos cantos esquerdo e direito e as datas de início e término centralizadas
 * > entre eles (calendário junto das datas)"* — Bernardo Villas Boas, 29/10/2026
 *
 * ⚠️ **UMA LINHA SÓ, EM TRÊS COLUNAS** (D-6 da spec 030): a seta *Voltar* no canto esquerdo, ao centro o título da seção, as
 *    datas em formato curto e o calendário (e *Ir para esta semana*, fora da semana de hoje), e a seta *Avançar* no canto
 *    direito. Ícones com a dica só do verbo; o nome acessível é o completo. Os `data-acao` são os de antes.
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
import { Input } from "@/components/ui/input";
import { semanaIsoDe } from "@/lib/dominio/carga-semanal";
import {
  datasEscolhiveis,
  semanaDaDataEscolhida,
  type FaixaDeAnos,
} from "@/lib/dominio/dsa/semana-pela-data";
import { useParametro } from "@/lib/navegacao/usar-parametro";

export function EscolhaDaSemana({
  titulo,
  rotulo,
  dataDaSemana,
  anterior,
  seguinte,
  ehAAtual,
  anos,
}: {
  /** O título da seção (o `h2`), desenhado no servidor — fica no centro, antes das datas. */
  readonly titulo: React.ReactNode;
  /** *"26/10 a 31/10/2026"*. */
  readonly rotulo: string;
  /** A segunda-feira da semana mostrada, `aaaa-mm-dd` — o valor do calendário. */
  readonly dataDaSemana: string;
  readonly anterior: string;
  readonly seguinte: string;
  /** A semana mostrada é a de hoje: o «Ir para esta semana» some. */
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
      className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2"
      role="group"
      aria-label="Semana dos DSA publicados"
      data-slot="escolha-da-semana"
      data-esperando={esperando ? "sim" : "nao"}
    >
      <BotaoDeIcone
        acao="voltar"
        rotulo="Semana anterior"
        ladoDaDica="right"
        onClick={() => void definirSemana(anterior)}
        data-acao="semana-anterior"
      />
      <div className="flex min-w-0 flex-wrap items-center justify-center gap-2 text-center">
        {titulo}
        <span className="text-texto text-sm tabular-nums" data-slot="rotulo-da-semana">
          {rotulo}
        </span>
        <BotaoDeIcone
          acao="escolher-semana"
          rotulo="Escolher a semana no calendário"
          variante="fantasma"
          aria-expanded={calendarioAberto}
          onClick={() => definirCalendarioAberto((v) => !v)}
          data-slot="abrir-calendario-da-semana"
        />
        {ehAAtual ? null : (
          <BotaoDeIcone
            acao="esta-semana"
            rotulo="Ir para esta semana"
            variante="fantasma"
            onClick={() => void definirSemana(null)}
            data-acao="semana-atual"
          />
        )}
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
      <BotaoDeIcone
        acao="avancar"
        rotulo="Semana seguinte"
        ladoDaDica="left"
        onClick={() => void definirSemana(seguinte)}
        data-acao="semana-seguinte"
      />
    </div>
  );
}

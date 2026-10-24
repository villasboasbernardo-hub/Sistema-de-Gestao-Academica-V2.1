/**
 * O seletor de ano — **um só, em todo módulo** (RT-6 do Bloco 10, spec 025, D-24 a D-26). Substitui o `AnoDoPainel`
 * do Início, de Turmas e do Calendário (Blocos 2, 4 e 8).
 *
 * > *"Seletor de ano aceita qualquer ano, padrão = ano da data atual, todos os módulos mostram só o ano selecionado,
 * > virada automática."* — Bernardo Villas Boas, 24/10/2026
 *
 * ⚠️ **QUALQUER ANO DO BANCO** (D-25): as opções vão de 2020 ao ano de hoje + 10 (`opcoesDeAno`), não só os anos que já
 *    têm turma — era o *"não só 2026/2027"* do pedido.
 * ⚠️ **A ESCOLHA VALE NAS OUTRAS TELAS** (D-24): ela vai para o `?ano=` desta tela **e** para o cookie `ciaara-ano`, que
 *    as outras leem no servidor; escolher o ano de hoje apaga o cookie. O cookie expira na virada do ano em São Paulo —
 *    é a virada automática.
 * ⚠️ **UMA IDA AO SERVIDOR, E A LATERAL JUNTO**: a URL muda pela API de histórico (sem buscar), e `router.refresh()`
 *    redesenha a página **e o layout** — o submenu de Turmas lista as turmas do ano escolhido, e o layout não é
 *    redesenhado na navegação comum (C-16 da spec 019).
 * ⚠️ **ANO QUE VEIO DO COOKIE APARECE NA URL** ao abrir a tela (sem ida ao servidor): o link copiado dali mostra o mesmo
 *    ano a quem o receber.
 * ⚠️ **QUEM POSICIONA É A PÁGINA**, no canto superior direito, na barra de ações (A-1 da spec 019, RT-1).
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { expiracaoDaEscolha, opcoesDeAno, type OrigemDoAno } from "@/lib/dominio/ano-escolhido";
import { descritor, type Rota, type RotaComParametro } from "@/lib/navegacao/contrato";
import { cookieDoAno } from "@/lib/navegacao/cookie-do-ano";

/**
 * As telas cujo contrato declara `ano` — tirado do contrato, e não escrito aqui: a lista escrita à mão envelheceria no
 * dia em que uma tela nova ganhasse o ano.
 */
export type RotaComAno = RotaComParametro<"ano">;

export function SeletorDeAno({
  ano,
  vigente,
  origem,
  rota,
}: {
  /** O ano que a tela mostra. */
  readonly ano: number;
  /** O ano de hoje em São Paulo — o padrão. */
  readonly vigente: number;
  /** De onde o ano veio (`anoEscolhido`); o guardado no navegador vai para a URL ao abrir. */
  readonly origem: OrigemDoAno;
  readonly rota: RotaComAno;
}) {
  const router = useRouter();
  const [pendente, iniciar] = React.useTransition();
  const empilha = descritor(rota as Rota, "ano" as never).historico === "empilha";

  /* O ano que veio do navegador entra na URL, sem buscar de novo: a tela já está nele. */
  React.useEffect(() => {
    if (origem !== "guardado") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("ano") === String(ano)) return;
    url.searchParams.set("ano", String(ano));
    window.history.replaceState(window.history.state, "", url);
  }, [ano, origem]);

  function escolher(escolhido: number) {
    const padrao = escolhido === vigente;
    document.cookie = cookieDoAno(
      padrao ? null : escolhido,
      expiracaoDaEscolha(`${vigente}-01-01`),
      window.location.protocol === "https:",
    );
    const url = new URL(window.location.href);
    if (padrao) url.searchParams.delete("ano");
    else url.searchParams.set("ano", String(escolhido));
    if (empilha) window.history.pushState(window.history.state, "", url);
    else window.history.replaceState(window.history.state, "", url);
    iniciar(() => router.refresh());
  }

  return (
    <label
      className="flex shrink-0 items-center gap-2 text-sm"
      data-slot="ano-do-painel"
      data-esperando={pendente ? "sim" : "nao"}
    >
      <span className="text-texto-suave">Ano</span>
      <select
        value={ano}
        onChange={(e) => escolher(Number(e.target.value))}
        data-slot="ano-do-painel-escolha"
        aria-busy={pendente || undefined}
        className="border-borda bg-superficie text-texto rounded-ciaara h-8 border px-2 text-sm"
      >
        {opcoesDeAno(vigente, ano).map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </label>
  );
}

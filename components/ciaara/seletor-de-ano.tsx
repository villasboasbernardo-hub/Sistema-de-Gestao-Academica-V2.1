/**
 * O seletor de ano — **um só, no cabeçalho do sistema** (RT-6 do Bloco 10, spec 025, D-24 a D-26; emendada no Bloco 15,
 * spec 030, `FR-003`). Substitui o `AnoDoPainel` do Início, de Turmas e do Calendário (Blocos 2, 4 e 8) e, desde
 * 29/10/2026, os sete seletores que as páginas desenhavam.
 *
 * > *"Seletor de ano aceita qualquer ano, padrão = ano da data atual, todos os módulos mostram só o ano selecionado,
 * > virada automática."* — Bernardo Villas Boas, 24/10/2026
 *
 * > *"ANO NO CABEÇALHO (RT-6): um seletor de ano só, na barra superior, junto do sininho e do tema claro/escuro,
 * > valendo para o sistema todo (mesmo cookie e ?ano= da D-24)."* — Bernardo Villas Boas, 29/10/2026
 *
 * ⚠️ **QUALQUER ANO DO BANCO** (D-25): as opções vão de 2020 ao ano de hoje + 10 (`opcoesDeAno`), não só os anos que já
 *    têm turma — era o *"não só 2026/2027"* do pedido.
 * ⚠️ **A ESCOLHA VALE NAS OUTRAS TELAS** (D-24): ela vai para o cookie `ciaara-ano`, que as telas leem no servidor, e —
 *    na página que tem o ano no endereço — para o `?ano=` dela; escolher o ano de hoje apaga o cookie. O cookie expira na
 *    virada do ano em São Paulo — é a virada automática.
 * ⚠️ **O CABEÇALHO NÃO CONHECE A PÁGINA** (ele vive no layout): a rota sai do caminho (`rotaComAnoDoCaminho`), e o ano
 *    do link, do `?ano=` — o layout só sabe o guardado. Na página **sem** ano no endereço (o DSA, a ficha da turma), a
 *    escolha vai só para o cookie (D-7 da spec 030); o `ano` do DSA é a semana ISO, que o seletor não toca.
 * ⚠️ **UMA IDA AO SERVIDOR, E A LATERAL JUNTO**: `router.refresh()` redesenha a página **e o layout** — o submenu de
 *    Turmas lista as turmas do ano escolhido, e o layout não é redesenhado na navegação comum (C-16 da spec 019).
 * ⚠️ **ANO QUE VEIO DO COOKIE APARECE NA URL** ao abrir a tela que tem ano (sem ida ao servidor): o link copiado dali
 *    mostra o mesmo ano a quem o receber.
 * ⚠️ **`useSearchParams` PEDE UM `Suspense` ACIMA** — o cabeçalho o põe, com o mesmo seletor sem o ano do link de
 *    reserva.
 */
"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  anoValido,
  expiracaoDaEscolha,
  opcoesDeAno,
  type OrigemDoAno,
} from "@/lib/dominio/ano-escolhido";
import { descritor, rotaComAnoDoCaminho, type Rota } from "@/lib/navegacao/contrato";
import { cookieDoAno } from "@/lib/navegacao/cookie-do-ano";

export type PropsDoSeletorDeAno = {
  /** O ano guardado (cookie) ou o de hoje — o que o layout sabe. */
  readonly ano: number;
  /** O ano de hoje em São Paulo — o padrão. */
  readonly vigente: number;
  /** De onde o ano veio (`anoEscolhido`); o guardado vai para a URL ao abrir uma tela que tem ano. */
  readonly origem: OrigemDoAno;
};

export function SeletorDeAno(props: PropsDoSeletorDeAno) {
  const busca = useSearchParams();
  return <SeletorDeAnoSemBusca {...props} daUrl={busca.get("ano")} />;
}

/** O mesmo seletor, sem ler o `?ano=` — a reserva do `Suspense` e o que a vitrine mostra. */
export function SeletorDeAnoSemBusca({
  ano: guardado,
  vigente,
  origem: origemGuardada,
  daUrl = null,
}: PropsDoSeletorDeAno & { readonly daUrl?: string | null }) {
  const router = useRouter();
  const caminho = usePathname();
  const [pendente, iniciar] = React.useTransition();
  const rota = rotaComAnoDoCaminho(caminho ?? "");
  /* O `?ano=` do link vence o guardado — mas só na página que tem o ano do RT-6 no endereço. */
  const doLink = rota === null ? null : anoValido(daUrl);
  const ano = doLink ?? guardado;
  const origem: OrigemDoAno = doLink !== null ? "url" : origemGuardada;

  /* O ano que veio do navegador entra na URL, sem buscar de novo: a tela já está nele. */
  React.useEffect(() => {
    if (rota === null || origem !== "guardado") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("ano") === String(ano)) return;
    url.searchParams.set("ano", String(ano));
    window.history.replaceState(null, "", url);
  }, [ano, origem, rota]);

  function escolher(escolhido: number) {
    const padrao = escolhido === vigente;
    document.cookie = cookieDoAno(
      padrao ? null : escolhido,
      expiracaoDaEscolha(`${vigente}-01-01`),
      window.location.protocol === "https:",
    );
    if (rota === null) {
      /* Página sem ano no endereço: a escolha é do cookie, e a página (e a lateral) se redesenham com ele. */
      iniciar(() => router.refresh());
      return;
    }
    const url = new URL(window.location.href);
    if (padrao) url.searchParams.delete("ano");
    else url.searchParams.set("ano", String(escolhido));
    const empilha = descritor(rota as Rota, "ano" as never).historico === "empilha";
    /*
     * ⚠️ NAVEGA PARA O ENDEREÇO NOVO E DEPOIS ATUALIZA — as duas coisas, nesta ordem (revisão do PR #90, medido):
     *    - só `history.pushState` + `refresh()`: com `window.history.state` (marca `__NA`) o Next não passava a URL ao
     *      roteador, e o `refresh()` pedia a antiga — presa no ano de um link `?ano=`, porque a URL vence o cookie;
     *    - só a navegação: a página SEM `?ano=` depende do cookie, e o Next a serviu do cache, desenhada com o cookie de
     *      antes — voltar ao ano de hoje no *Início* não ia ao servidor. E o layout (o submenu de *Turmas*) não se redesenha
     *      numa navegação;
     *    - a navegação acerta o endereço do roteador, e o `refresh()`, que vem depois na fila, invalida o cache e relê a
     *      página e o layout com o cookie novo.
     */
    const destino = `${url.pathname}${url.search}${url.hash}`;
    iniciar(() => {
      if (empilha) router.push(destino, { scroll: false });
      else router.replace(destino, { scroll: false });
      router.refresh();
    });
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

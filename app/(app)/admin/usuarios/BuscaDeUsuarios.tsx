"use client";

/**
 * A busca da lista de contas — **folha de cliente**.
 *
 * ⚠️ **O ESTADO MORA NA URL, e esta folha só traduz.** `busca` é parâmetro do contrato de
 * `/admin/usuarios`, com `avisaServidor` ligado: quem filtra é a consulta do servidor, e o resultado é
 * link compartilhável.
 *
 * ⚠️ **O BOTÃO «LIMPAR FILTROS» É O COMPONENTE ÚNICO**, `components/ciaara/botao-limpar-filtros.tsx`.
 * O `CLAUDE.md` é explícito: *"Segundo componente de limpar filtro é rejeitado"* — ele nasceu como JSX
 * solto dentro de `FiltrosDeInstrutores.tsx` e virou componente na segunda tela que precisou dele.
 * Esta é a terceira, e ela **usa**, não copia.
 *
 * ⚠️ **VOLTAR AO PADRÃO É `null`, NÃO TEXTO VAZIO.** `null` apaga o parâmetro da URL; texto vazio o
 * escreve vazio. A distinção foi medida na fatia (c) do Épico 4 — com ela trocada, o percurso do valor
 * padrão passava sem provar nada.
 */
import { BotaoLimparFiltros } from "@/components/ciaara/botao-limpar-filtros";
import { useParametro } from "@/lib/navegacao/usar-parametro";

const ROTA = "/admin/usuarios";

export function BuscaDeUsuarios() {
  const [busca, definirBusca] = useParametro(ROTA, "busca");

  return (
    <div className="mt-4 flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-texto-suave text-xs" htmlFor="busca-de-usuarios">
          Buscar por nome ou e-mail
        </label>
        <input
          id="busca-de-usuarios"
          type="search"
          value={busca}
          onChange={(evento) => definirBusca(evento.target.value || null)}
          placeholder="nome ou e-mail"
          className="border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none"
        />
      </div>

      <BotaoLimparFiltros haFiltroAtivo={busca !== ""} aoLimpar={() => definirBusca(null)} />
    </div>
  );
}

"use client";

/**
 * O lugar onde a resposta das ações da lista aparece: **acima da tabela**, não dentro da linha.
 *
 * ⚠️ **ELE NASCEU DE UM DEFEITO MEDIDO em 03/10/2026, e o defeito era de VISIBILIDADE, não de
 * lógica.** Bernardo clicou em *Excluir* no preview e a conta não saiu da lista. Medido no remoto, só
 * por leitura: **nenhuma linha `excluir` na trilha** — e `excluir_conta` grava o rastro **antes** de
 * tocar na linha —, **`excluida_em` nulo nas cinco contas**, todas intactas. Ou seja: **nada foi
 * excluído**, e portanto não era filtro da lista nem falta de revalidação, que exigiriam a exclusão ter
 * acontecido. A ação falhou, **e a falha ficou invisível**: ela era texto vermelho de 11px **dentro da
 * linha que não mudou** — que é exatamente o que "não aconteceu nada" parece.
 *
 * ⚠️ **A CAUSA PROVÁVEL DA FALHA É TRANSITÓRIA; A DA INVISIBILIDADE NÃO ERA.** Pela linha do tempo, o
 * botão chegou ao preview com o push de hoje e `public.excluir_conta` só chegou ao **remoto** depois:
 * nessa janela o `rpc` responde *"função não encontrada"*. Isso se conserta sozinho — **a falha muda,
 * a cegueira ficava**. Por isso o conserto é aqui, e não no caminho de erro de uma ação.
 *
 * ⚠️ **AÇÃO DESTRUTIVA QUE FALHA EM SILÊNCIO É PIOR QUE AÇÃO QUE RECUSA**: quem recusa ensina; quem
 * cala faz a pessoa repetir o clique, ou — muito pior — concluir que deu certo.
 */
import { createContext, useContext, useState, type ReactNode } from "react";

type Aviso = { readonly tom: "ok" | "erro"; readonly texto: string };

const Contexto = createContext<{ readonly avisar: (aviso: Aviso) => void } | null>(null);

/**
 * O que as linhas chamam para falar. ⚠️ **Fora do provedor ele não estoura: devolve um avisador
 * inerte.** Uma folha que não consegue avisar não deve derrubar a tela inteira — e o teste do
 * provedor é que garante que o caminho real passa por ele.
 */
export function useAvisoDaLista(): { readonly avisar: (aviso: Aviso) => void } {
  return useContext(Contexto) ?? { avisar: () => undefined };
}

export function AvisoDaLista({ children }: { readonly children: ReactNode }) {
  const [aviso, definirAviso] = useState<Aviso | null>(null);

  return (
    <Contexto.Provider value={{ avisar: definirAviso }}>
      {aviso ? (
        /*
          ⚠️ **`alert` PARA FALHA E `status` PARA SUCESSO, e a distinção não é estética:** `alert` é
             anunciado de imediato por leitor de tela e `status` espera a vez. Uma exclusão que falhou
             é interrupção; uma que deu certo é informação.
        */
        <p
          role={aviso.tom === "erro" ? "alert" : "status"}
          data-slot="aviso-da-lista"
          className={
            aviso.tom === "erro"
              ? "border-conflito-tinta bg-superficie-2 text-conflito-tinta rounded-ciaara mt-3 border-2 p-3 text-sm font-medium"
              : "border-borda bg-superficie-2 text-texto rounded-ciaara mt-3 border p-3 text-sm"
          }
        >
          {aviso.texto}
        </p>
      ) : null}
      {children}
    </Contexto.Provider>
  );
}

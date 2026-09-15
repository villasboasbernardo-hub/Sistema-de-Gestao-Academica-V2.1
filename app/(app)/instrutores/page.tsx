/**
 * Instrutores — a listagem (`RF-INSTR-01`, `RN-ANT-01` e `FR-027.1` da spec 006).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** A tabela é folha, noutro arquivo. Um `"use client"` aqui mandaria a
 * listagem de 177 linhas inteira para o navegador, e o erro não aparece na checagem de tipos.
 *
 * ⚠️ **A ORDEM VEM DO BANCO.** A consulta é montada por `consulta.ts`, que pede `ordem_antiguidade`
 * sempre; `?ordem=` reordena por cima, na folha. É a separação que `tests/unidade/consulta-de-instrutores.test.ts`
 * prova, e que a varredura de `ordenacao-de-instrutor.test.ts` cobra de toda tela nova.
 *
 * ⚠️ **ERRO DE LEITURA NÃO ESTOURA** (`RN-DEG-01`): vira o vazio de "você não vê", que é o que uma
 * negativa da RLS de fato significa.
 */
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import {
  COLUNAS_DA_LISTAGEM,
  montarConsultaDeInstrutores,
  type ParametrosDaListagem,
} from "./consulta";
import { TabelaDeInstrutores, type LinhaDeInstrutor } from "./TabelaDeInstrutores";

export default async function Instrutores({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /*
   * ⚠️ A VALIDAÇÃO ACONTECE ANTES DE O VALOR ALCANÇAR A CONSULTA. Com o `RF-NAV-01`, a barra de
   * endereço é entrada de usuário; valor fora do domínio cai para o padrão e nunca vira predicado.
   */
  const { valores } = lerParametros("/instrutores", await searchParams);
  const parametros: ParametrosDaListagem = {
    busca: String(valores.busca),
    om: String(valores.om),
    categoria: String(valores.categoria),
    capacitacao: String(valores.capacitacao),
    regime: String(valores.regime),
    escolaridade: String(valores.escolaridade),
    situacao: String(valores.situacao),
    ordem: String(valores.ordem),
  };

  const supabase = await criarClienteDeServidor();
  const { data, error } = await montarConsultaDeInstrutores(
    supabase.from("vw_instrutores").select(COLUNAS_DA_LISTAGEM),
    parametros,
  );

  if (error) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Instrutores</h1>
        <EstadoVazio motivo="sem-permissao" />
      </section>
    );
  }

  const linhas: LinhaDeInstrutor[] = (data ?? []).map((i) => ({
    id: i.id as string,
    codigo: i.codigo as string,
    pg: i.posto_graduacao as string,
    especialidade: i.esp_hab_obs,
    nomeCompleto: i.nome_completo as string,
    nomeDeGuerra: i.nome_guerra,
    categoria: i.categoria as string,
    om: i.om as string,
    regime: i.regime_trabalho,
    ordemAntiguidade: i.ordem_antiguidade as number,
  }));

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-texto text-lg font-semibold">Instrutores</h1>
        {/* veste: a dica que explica a ordem da lista — texto fixo, nunca dado */}
        <p className="text-texto-tenue text-xs">
          A lista sai sempre em antiguidade. Clicar num cabeçalho reordena só a exibição.
        </p>
      </header>

      <p className="text-texto-suave text-sm" data-slot="contagem-de-instrutores">
        {linhas.length} instrutor(es){" "}
        {parametros.situacao === "inativo" ? "inativo(s)" : "ativo(s)"}
      </p>

      <TabelaDeInstrutores linhas={linhas} />
    </section>
  );
}

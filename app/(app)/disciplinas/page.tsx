/**
 * `/disciplinas` — **só um endereço**, desde o Bloco 3 (spec 018, FR-001, C-1; pedido de Bernardo Villas Boas,
 * 19/10/2026: *"/disciplinas pode continuar existindo como endereço (redirecionando ou servindo a aba), mas todo
 * caminho por clique passa pelo curso"*).
 *
 * ⚠️ **NENHUM LINK DA APLICAÇÃO APONTA PARA CÁ** — o menu perdeu a entrada e o botão da aba *Grade* leva à aba
 *    *Disciplinas* do curso. O que ainda chega aqui é link salvo, favorito ou mensagem antiga, e nenhum deles quebra:
 *    - `?turma=T` → a seção de disciplinas da ficha de T (como desde 04/10/2026, `FR-019` da spec 012);
 *    - `?curso=X` → a aba *Disciplinas* de X, com os filtros e a linha aberta (os nomes são os mesmos, C-3);
 *    - sem curso → o catálogo de cursos, que é onde a escolha de curso acontece agora.
 * ⚠️ **O DESTINO SAI DO MÓDULO ÚNICO DE ENDEREÇO** (`endereco-de-turma-unico.test.ts`): o código da turma contém
 *    espaços, e um caminho montado à mão falha em silêncio no primeiro que esquecer de codificar.
 */
import { redirect } from "next/navigation";

import {
  enderecoDaSecaoDeDisciplinas,
  enderecoDasDisciplinas,
} from "@/lib/navegacao/endereco-de-turma";
import { lerParametros } from "@/lib/navegacao/esquema";

export default async function Disciplinas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { valores } = lerParametros("/disciplinas", await searchParams);

  const turma = String(valores.turma);
  if (turma !== "") redirect(enderecoDaSecaoDeDisciplinas(turma));

  const curso = String(valores.curso);
  if (curso === "") redirect("/cursos");

  const situacao = String(valores.situacao);
  redirect(
    enderecoDasDisciplinas(curso, {
      // O padrão (`ativo`) fica fora do endereço, como o `nuqs` escreve.
      ...(situacao !== "ativo" ? { situacao } : {}),
      busca: String(valores.busca),
      aberta: String(valores.aberta),
    }),
  );
}

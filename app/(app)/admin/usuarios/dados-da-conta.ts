/**
 * A leitura que as duas páginas de conta compartilham — cadastrar e editar.
 *
 * ⚠️ **ELA ERA MAIOR, E ENCOLHEU EM 03/10/2026.** Ela trazia também a lista de instrutores e a escala
 * de antiguidade de `config_listas`, para o seletor de vínculo de docente. **Bernardo tirou o vínculo
 * da tela** — nenhuma policy lê `usuarios.instrutor_id` —, e com ele saíram as duas consultas. ⚠️ **E
 * com elas saiu a obrigação do `SC-001`**: não há mais leitura de lista de instrutor aqui, então não
 * há mais o que ordenar por antiguidade. Deixar a consulta de pé sem consumidor seria carregar duas
 * idas ao banco por abertura de tela, e uma guarda viva sobre código morto.
 */
import { criarClienteDeServidor } from "@/lib/supabase/server";

export type CursoParaVincular = {
  readonly id: string;
  readonly codigo: string;
  readonly nomeCurso: string;
};

export type ApoioDaConta = {
  readonly cursos: readonly CursoParaVincular[];
};

export async function lerApoioDaConta(): Promise<ApoioDaConta> {
  const supabase = await criarClienteDeServidor();

  const { data } = await supabase
    .from("cursos")
    .select("id, codigo, nome_curso")
    .eq("status", "ativo")
    .order("codigo");

  return {
    cursos: (data ?? []).map((c) => ({
      id: c.id,
      codigo: c.codigo ?? "",
      nomeCurso: c.nome_curso ?? "",
    })),
  };
}

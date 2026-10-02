/**
 * A leitura que as duas páginas de conta compartilham — cadastrar e editar.
 *
 * ⚠️ **ELA EXISTE PORQUE AS DUAS TELAS PEDEM A MESMA COISA:** a lista de cursos para o vínculo, a de
 * instrutores para a associação, e a **escala de antiguidade**, que vem de `config_listas` e nunca de
 * constante. Duplicar a consulta faria as duas telas divergirem na primeira vez que uma delas ganhasse
 * um filtro.
 *
 * ⚠️ **A ESCALA É OBRIGATÓRIA PARA O SELETOR DE INSTRUTOR, e isso não é detalhe:** ele **reordena por
 * antiguidade** a lista que recebe (`RN-ANT-01`, de Risco Alto), e a escala `P/G` → peso é dado de
 * `config_listas`. Passar uma constante aqui quebraria a regra pelo caminho mais silencioso possível.
 *
 * ⚠️ **UM `Promise.all`, NUNCA `await` EM LAÇO** — as três consultas são independentes, e a convenção
 * de `app/**` proíbe o `N+1`.
 */
import { escalaDeLinhas, type EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import type { InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";
import { criarClienteDeServidor } from "@/lib/supabase/server";

export type CursoParaVincular = {
  readonly id: string;
  readonly codigo: string;
  readonly nomeCurso: string;
};

export type ApoioDaConta = {
  readonly cursos: readonly CursoParaVincular[];
  readonly instrutores: readonly InstrutorParaExibir[];
  readonly escala: EscalaDeAntiguidade;
};

export async function lerApoioDaConta(): Promise<ApoioDaConta> {
  const supabase = await criarClienteDeServidor();

  const [cursosRes, instrutoresRes, escalaRes] = await Promise.all([
    supabase.from("cursos").select("id, codigo, nome_curso").eq("status", "ativo").order("codigo"),
    /*
     * ⚠️ **A LEITURA PEDE A ANTIGUIDADE AO BANCO, e a primeira escrita desta função NÃO pedia.** Eu
     *    havia argumentado que bastava o `SeletorInstrutor` reordenar o que chega — e o `SC-001`
     *    reprovou, com razão: a `RN-ANT-01` é de Risco Alto e vale nas **duas** metades. Ordenar no
     *    componente garante a tela; pedir ao banco garante **toda** leitura, inclusive a que um dia
     *    deixar de passar pelo componente.
     * ⚠️ `ordem_antiguidade` é coluna da view, e foi ela que o `D-5` acrescentou exatamente para isto.
     */
    supabase
      .from("vw_instrutores")
      .select("id, posto_graduacao, esp_hab_obs, nome_completo, nome_guerra")
      .eq("status", "ativo")
      .order("ordem_antiguidade"),
    supabase
      .from("config_listas")
      .select("valor, ordem, ativo")
      .eq("lista", "escala_antiguidade")
      .order("ordem"),
  ]);

  return {
    cursos: (cursosRes.data ?? []).map((c) => ({
      id: c.id,
      codigo: c.codigo ?? "",
      nomeCurso: c.nome_curso ?? "",
    })),
    instrutores: (instrutoresRes.data ?? []).map((i) => ({
      id: i.id ?? "",
      pg: i.posto_graduacao ?? "",
      especialidade: i.esp_hab_obs,
      nomeCompleto: i.nome_completo ?? "",
      nomeDeGuerra: i.nome_guerra,
    })),
    escala: escalaDeLinhas(
      (escalaRes.data ?? []).map((e) => ({
        valor: e.valor ?? "",
        ordem: Number(e.ordem ?? 0),
        ativo: e.ativo !== false,
      })),
    ),
  };
}

/**
 * Cadastro de instrutor novo (`RF-INSTR-02`, `FR-005` a `FR-007` e `FR-011` da spec 006).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** O formulário é folha, noutro arquivo.
 *
 * ⚠️ **QUEM NÃO PODE CRIAR NÃO VÊ O FORMULÁRIO** — e, se chamar a ação por fora da tela, a RLS nega.
 * A ocultação é cortesia; a negação é do banco (`FR-020` e `FR-022` da spec 004).
 *
 * ⚠️ **SEM DADO PESSOAL NO CADASTRO.** Identificação civil e residência são gravadas na ficha, depois
 * de o instrutor existir, e só por quem as lê. Decidir aqui quem as vê exigiria escrever na tela a
 * lista de perfis autorizados — uma segunda declaração de permissão, que o `FR-021` da spec 004
 * proíbe. Na ficha, quem decide é a visão com porteiro: se ela entrega a linha, a seção aparece.
 */
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { valoresFuncionaisDe } from "../campos";
import { comSigla } from "../catalogo";
import { FormularioDeInstrutor } from "../FormularioDeInstrutor";

export default async function NovoInstrutor() {
  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);

  if (!pode(permissoes, "instrutores", "criar")) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Novo instrutor</h1>
        <EstadoVazio
          motivo="sem-permissao"
          detalhe="O cadastro de instrutor é dos perfis com permissão de criar. Fale com o Admin se precisar."
        />
      </section>
    );
  }

  const supabase = await criarClienteDeServidor();
  const [{ data: escala }, { data: disciplinas }, { data: cursos }] = await Promise.all([
    supabase
      .from("config_listas")
      .select("valor, ordem")
      .eq("lista", "escala_antiguidade")
      .eq("ativo", true)
      .order("ordem"),
    supabase
      .from("disciplinas")
      .select("id, nome_disciplina, curso_id, status")
      .eq("status", "ativo")
      .order("nome_disciplina"),
    // ⚠️ `status` entra porque o painel precisa dele: disciplina ATIVA de curso INATIVO não é
    //    oferecível (`FR-017.6` da spec 009). Ver `catalogo.ts`.
    supabase.from("cursos").select("id, codigo, status"),
  ]);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-texto text-lg font-semibold">Novo instrutor</h1>
        {/* veste: a dica sobre o código e o dado pessoal — texto fixo, nunca dado */}
        <p className="text-texto-tenue text-xs">
          O código é gerado pelo sistema. Identificação civil e residência são registradas na ficha,
          depois do cadastro.
        </p>
      </header>

      <FormularioDeInstrutor
        modo="novo"
        iniciais={valoresFuncionaisDe(null)}
        pessoais={null}
        postos={(escala ?? []).map((e) => e.valor)}
        disciplinas={comSigla(disciplinas ?? [], cursos ?? []).filter((d) => d.ativa)}
        habilitadas={[]}
      />
    </section>
  );
}

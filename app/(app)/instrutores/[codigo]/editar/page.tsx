/**
 * *Editar instrutor* — **página própria** (RT-3 do Bloco 10, spec 025, D-35).
 *
 * > *"Edição só em janela ou página própria; um único Editar edita tudo da entidade."* — Bernardo Villas Boas,
 * > 24/10/2026 (`docs/correcoes/padroes-de-tela.md`)
 *
 * ⚠️ **O MESMO FORMULÁRIO QUE FICAVA RECOLHIDO NO FIM DA FICHA** (spec 016, FR-010.2): o cadastro funcional, as
 *    disciplinas habilitadas e — para os três perfis que leem a PII — a identificação civil e a residência.
 * ⚠️ **O DADO PESSOAL SÓ É LIDO PELA VISÃO COM PORTEIRO.** Se ela entrega a linha, a sessão é de um dos três perfis que
 *    leem a PII, e só então a seção existe no formulário. Quem decidiu foi o banco.
 * ⚠️ **SEM PERMISSÃO, A TELA DIZ ISSO** — e não mostra um formulário que o banco vai recusar.
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Só o formulário é folha.
 */
import Link from "next/link";

import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { NomeInstrutor } from "@/components/ciaara/nome-instrutor";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { COLUNAS_PESSOAIS, valoresFuncionaisDe, valoresPessoaisDe } from "../../campos";
import { comSigla } from "../../catalogo";
import { FormularioDeInstrutor } from "../../FormularioDeInstrutor";

const COLUNAS_DA_EDICAO =
  "id, codigo, status, posto_graduacao, esp_hab_obs, nome_completo, categoria, om, nome_guerra, nip, data_nascimento, dep_divisao, data_assuncao_setor, email, regime_trabalho, nivel_escolaridade, formacao_principal_secundaria, capacitacoes_didaticas, capacitacao_didatica_a_corrigir, data_inicio_docencia_mb, data_inicio_docencia_ciaara, ultima_avaliacao_desempenho, data_avaliacao_desempenho, preferencia, antiguidade_declarada, area_conhecimento";

export default async function EditarInstrutor({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  const voltar = (
    <Link
      href={`/instrutores/${encodeURIComponent(codigo)}`}
      className="text-marca text-sm underline-offset-2 hover:underline"
      data-slot="voltar-a-ficha"
    >
      Voltar à ficha do instrutor
    </Link>
  );

  if (!pode(permissoes, "instrutores", "editar")) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Editar instrutor</h1>
        <EstadoVazio
          motivo="sem-permissao"
          titulo="O seu perfil não edita instrutor"
          detalhe="Fale com o Admin se precisar deste acesso."
        />
        {voltar}
      </section>
    );
  }

  const supabase = await criarClienteDeServidor();
  const [instrutorRes, disciplinasRes, cursosRes, escalaRes, curriculosRes] = await Promise.all([
    supabase.from("vw_instrutores").select(COLUNAS_DA_EDICAO).eq("codigo", codigo).maybeSingle(),
    supabase
      .from("disciplinas")
      .select("id, nome_disciplina, curso_id, curriculo_id, status")
      .order("nome_disciplina"),
    supabase.from("cursos").select("id, codigo, status"),
    supabase
      .from("config_listas")
      .select("valor, ordem")
      .eq("lista", "escala_antiguidade")
      .eq("ativo", true)
      .order("ordem"),
    supabase.from("curriculos").select("id, curso_id, versao, vigente_de").eq("status", "ativo"),
  ]);

  const instrutor = instrutorRes.data;
  if (instrutorRes.error || !instrutor) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Editar instrutor</h1>
        {instrutorRes.error ? (
          <EstadoVazio motivo="sem-permissao" />
        ) : (
          <EstadoVazio
            motivo="sem-dado"
            titulo="Instrutor não encontrado"
            detalhe={`Não há instrutor com o código ${codigo}.`}
          />
        )}
        {voltar}
      </section>
    );
  }

  const [{ data: pessoal }, vinculosRes] = await Promise.all([
    supabase
      .from("vw_instrutor_dados_pessoais")
      .select(COLUNAS_PESSOAIS)
      .eq("id", instrutor.id)
      .maybeSingle(),
    supabase
      .from("instrutor_disciplina")
      .select("disciplina_id")
      .eq("instrutor_id", instrutor.id)
      .eq("status", "ativo"),
  ]);

  const catalogo = comSigla(
    disciplinasRes.data ?? [],
    cursosRes.data ?? [],
    curriculosRes.data ?? [],
  );
  const habilitadas = (vinculosRes.data ?? []).flatMap((v) =>
    v.disciplina_id ? [v.disciplina_id] : [],
  );

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-texto text-lg font-semibold">
            Editar{" "}
            <NomeInstrutor
              instrutor={{
                id: instrutor.id,
                pg: instrutor.posto_graduacao,
                especialidade: instrutor.esp_hab_obs,
                nomeCompleto: instrutor.nome_completo,
                nomeDeGuerra: instrutor.nome_guerra,
              }}
            />
          </h1>
          <p className="text-texto-suave text-sm" data-slot="codigo-do-instrutor">
            Código {instrutor.codigo}
          </p>
        </div>
        {voltar}
      </header>

      {/*
       * ⚠️ SEM AS HABILITAÇÕES LIDAS, NÃO HÁ FORMULÁRIO (RN-DEG-01; revisão do PR #90): ele abriria com todas as disciplinas
       *    desmarcadas, e o *Salvar* sincroniza a lista — desativaria todo vínculo ativo do instrutor sem ninguém ter
       *    mexido no painel.
       */}
      {vinculosRes.error ? (
        <p role="alert" className="text-atrasado-tinta text-sm" data-slot="habilitacoes-ilegiveis">
          Não foi possível ler as disciplinas habilitadas deste instrutor. Recarregue a página antes
          de editar: gravar sem elas desmarcaria todas.
        </p>
      ) : (
        <FormularioDeInstrutor
          modo="edicao"
          instrutorId={instrutor.id}
          iniciais={valoresFuncionaisDe(instrutor)}
          pessoais={
            pessoal ? valoresPessoaisDe(pessoal as unknown as Record<string, unknown>) : null
          }
          postos={(escalaRes.data ?? []).map((e) => e.valor)}
          disciplinas={catalogo.filter((d) => d.ativa)}
          habilitadas={habilitadas}
        />
      )}
    </section>
  );
}

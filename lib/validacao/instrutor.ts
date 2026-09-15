/**
 * Validação de entrada das Server Actions de instrutor (`RN-INST-03`, `FR-005`, `FR-015` e `FR-032` da
 * spec 006).
 *
 * ⚠️ ESTE ESQUEMA NÃO É A GARANTIA. O `CHECK` do banco é: o `FR-006` exige que a recusa valha por
 * qualquer caminho, e uma Server Action é só um deles. O esquema recusa cedo, na primeira linha, e diz
 * **qual** campo falta — o que o erro do banco não diz a quem está na tela.
 *
 * ⚠️ BRANCO É AUSÊNCIA. `trim` antes de `min(1)`: texto só com espaços é recusado igual ao vazio.
 *
 * ⚠️ NENHUM CAMPO DE CARGA HORÁRIA (`FR-015`). `z.object` descarta chave desconhecida, então uma
 * carga horária mandada no corpo nem chega à escrita. A grandeza é view; não há onde gravá-la.
 *
 * ⚠️ DADO PESSOAL VIAJA EM ESQUEMA PRÓPRIO (`FR-032`). O bloco funcional descarta CPF, RG, telefone e
 * endereço: eles só são gravados pela função com porteiro, e só por quem os lê.
 */
import { z } from "zod";

import { Constants } from "@/lib/tipos/database";

const REGIMES = Constants.public.Enums.regime_trabalho_docente;

/** Os cinco obrigatórios, com a mensagem que diz qual falta. A ordem é a do `RN-INST-03`. */
export const OBRIGATORIOS_DO_INSTRUTOR = [
  { campo: "posto_graduacao", rotulo: "Posto/Graduação", mensagem: "Informe o posto/graduação." },
  {
    campo: "esp_hab_obs",
    rotulo: "Especialidade/Habilitação",
    mensagem: "Informe a especialidade/habilitação.",
  },
  { campo: "nome_completo", rotulo: "Nome completo", mensagem: "Informe o nome completo." },
  { campo: "categoria", rotulo: "Categoria", mensagem: "Informe a categoria." },
  { campo: "om", rotulo: "Organização militar", mensagem: "Informe a organização militar." },
] as const;

const obrigatorio = (mensagem: string) =>
  z.string({ error: mensagem }).trim().min(1, mensagem).max(200, "Texto longo demais.");

/** Texto opcional: vazio ou só com espaços vira `null`, e nunca string em branco no banco. */
const textoOpcional = (maximo = 500) =>
  z
    .string()
    .trim()
    .max(maximo, "Texto longo demais.")
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v));

/** Data no formato do campo de data do navegador, `AAAA-MM-DD`, ou `null`. */
const dataOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : v))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida — use AAAA-MM-DD.");

const emailOpcional = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : v))
  .refine((v) => v === null || z.email().safeParse(v).success, "Informe um e-mail válido.");

const regimeOpcional = z
  .union([z.enum(REGIMES, { error: "Regime fora do domínio." }), z.literal("")])
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : v));

/**
 * As colunas funcionais que a tela grava.
 *
 * ⚠️ FICAM DE FORA, DE PROPÓSITO: `codigo` (gerado pelo banco, `FR-007`), `status` (ações próprias de
 * desativar e reativar, `FR-008`), `disciplinas_ministradas_legado_v1` e `origem_migracao_v1` (rastro
 * da v2.0, não se edita) e o quarteto de auditoria (carimbo do motor, `FR-029`).
 */
export const esquemaFuncionalDeInstrutor = z.object({
  posto_graduacao: obrigatorio(OBRIGATORIOS_DO_INSTRUTOR[0].mensagem),
  esp_hab_obs: obrigatorio(OBRIGATORIOS_DO_INSTRUTOR[1].mensagem),
  nome_completo: obrigatorio(OBRIGATORIOS_DO_INSTRUTOR[2].mensagem),
  categoria: obrigatorio(OBRIGATORIOS_DO_INSTRUTOR[3].mensagem),
  om: obrigatorio(OBRIGATORIOS_DO_INSTRUTOR[4].mensagem),
  nome_guerra: textoOpcional(120),
  nip: textoOpcional(20),
  data_nascimento: dataOpcional,
  dep_divisao: textoOpcional(120),
  data_assuncao_setor: dataOpcional,
  email: emailOpcional,
  regime_trabalho: regimeOpcional,
  nivel_escolaridade: textoOpcional(120),
  formacao_principal_secundaria: textoOpcional(),
  capacitacao_didatica: textoOpcional(),
  data_inicio_docencia_mb: dataOpcional,
  data_inicio_docencia_ciaara: dataOpcional,
  ultima_avaliacao_desempenho: textoOpcional(120),
  data_avaliacao_desempenho: dataOpcional,
  preferencia: textoOpcional(2000),
  antiguidade_declarada: textoOpcional(20),
  area_conhecimento: textoOpcional(200),
});

/**
 * As 12 colunas de identificação civil e residência (`FR-032`).
 *
 * ⚠️ A GRAVAÇÃO PASSA POR `gravar_dados_pessoais_instrutor`, com o porteiro do banco. Este esquema só
 * confere a forma; quem decide se a pessoa pode gravar é o banco.
 */
export const esquemaDeDadosPessoais = z.object({
  cpf: textoOpcional(20),
  rg: textoOpcional(30),
  orgao_emissor: textoOpcional(30),
  telefone: textoOpcional(20),
  retelma: textoOpcional(20),
  endereco_logradouro: textoOpcional(200),
  endereco_numero: textoOpcional(20),
  endereco_complemento: textoOpcional(120),
  endereco_bairro: textoOpcional(120),
  endereco_cidade: textoOpcional(120),
  endereco_estado: textoOpcional(2),
  endereco_cep: textoOpcional(10),
});

export const esquemaDeCriacaoDeInstrutor = z.object({ funcional: esquemaFuncionalDeInstrutor });

export const esquemaDeEdicaoDeInstrutor = z.object({
  id: z.guid("Instrutor inválido."),
  funcional: esquemaFuncionalDeInstrutor,
});

export const esquemaDeGravacaoDePessoais = z.object({
  id: z.guid("Instrutor inválido."),
  pessoal: esquemaDeDadosPessoais,
});

export const esquemaDeSituacao = z.object({ id: z.guid("Instrutor inválido.") });

export type DadosFuncionaisDeInstrutor = z.infer<typeof esquemaFuncionalDeInstrutor>;
export type DadosPessoaisDeInstrutor = z.infer<typeof esquemaDeDadosPessoais>;

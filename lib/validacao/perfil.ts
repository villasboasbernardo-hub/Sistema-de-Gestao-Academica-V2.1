/**
 * Validação de entrada das Server Actions do **próprio cadastro** (`FR-012` a `FR-014`, `FR-020`).
 *
 * ⚠️ **NÃO HÁ CAMPO DE E-MAIL NEM DE PERFIL AQUI, E A AUSÊNCIA É A REGRA** (`FR-021`, `FR-022`). Um
 * esquema que aceitasse `email` ou `perfil` os deixaria chegar à ação, e a única coisa entre eles e
 * o banco seria o cuidado de quem escreveu o `update`. Não estando no esquema, o `safeParse` os
 * descarta antes de qualquer linha de lógica — e o gatilho `app.impedir_autoescalonamento` continua
 * sendo a última palavra no banco, para quem chamar a interface sem passar por aqui.
 *
 * ⚠️ **O TIPO E O TAMANHO DA FOTO SÃO CONFERIDOS EM TRÊS LUGARES, e nenhum é redundante**: o
 * navegador (conveniência, `FR-013`), este esquema (a ação é endpoint HTTP de fato) e o **bucket**
 * (`file_size_limit` e `allowed_mime_types`, que é a garantia estrutural — R-3). Só o terceiro
 * sobrevive a alguém apagar os dois primeiros, e foi exatamente isso que faltou no Épico 3, quando o
 * mínimo de senha existia só no formulário.
 */
import { z } from "zod";

/** ⚠️ Espelha `allowed_mime_types` do bucket `avatares`. O bucket é quem manda. */
export const TIPOS_DE_IMAGEM_ACEITOS = ["image/jpeg", "image/png"] as const;

/** ⚠️ Espelha `file_size_limit` do bucket `avatares`: 2 MB em bytes. */
export const TAMANHO_MAXIMO_DA_FOTO = 2 * 1024 * 1024;

/** A frase que a tela mostra **antes** de a pessoa escolher o arquivo (`FR-013`). */
export function regraDaFotoEmPortugues(): string {
  return "A foto precisa ser JPG ou PNG, de até 2 MB.";
}

export const esquemaDoProprioCadastro = z.object({
  /*
   * ⚠️ É `nome_exibicao`, NÃO `nome` — e a distinção não é de gosto. `nome` é o que o convite
   * gravou, e em boa parte das contas ele é o nome de registro; `nome_exibicao` é como a pessoa quer
   * ser chamada na tela, e o cabeçalho já preferia um ao outro desde a fatia (c) do Épico 4.
   * Deixar a pessoa reescrever `nome` apagaria o que o Admin cadastrou, que não é o pedido.
   */
  nomeExibicao: z
    .string({ error: "Informe como você quer ser chamado." })
    .trim()
    .min(2, "O nome de exibição precisa ter pelo menos 2 caracteres.")
    .max(120, "O nome de exibição passou de 120 caracteres."),
});

export const esquemaDaFoto = z.object({
  tipo: z.enum(TIPOS_DE_IMAGEM_ACEITOS, {
    error: "A foto precisa ser JPG ou PNG.",
  }),
  tamanho: z
    .number({ error: "Não foi possível medir o arquivo." })
    .int()
    .positive("O arquivo está vazio.")
    .max(TAMANHO_MAXIMO_DA_FOTO, "A foto passou de 2 MB."),
});

export type ProprioCadastroParaGravar = z.infer<typeof esquemaDoProprioCadastro>;

/**
 * A troca da própria senha (`FR-030`).
 *
 * ⚠️ **AQUI SÓ O FORMATO; A REGRA MORA EM `lib/dominio/politica-de-senha.ts`.** O mínimo de
 * caracteres e a frase que o explica são domínio puro, com teste de unidade próprio — repeti-los
 * neste esquema criaria a segunda fonte de verdade que envelheceria no dia em que o mínimo mudasse.
 * O que o esquema garante é que os dois campos **chegaram**.
 */
export const esquemaDaPropriaSenha = z.object({
  senha: z.string({ error: "Informe a senha." }).min(1, "Informe a senha."),
  confirmacao: z.string({ error: "Repita a senha." }).min(1, "Repita a senha."),
});

# Modelo de dados — Épico 3

**Fase 1** · 08/09/2026 · entrada: [research.md](./research.md)

## O que muda no schema

**Uma migration, e ela não cria nem remove coluna nenhuma.** Ela redistribui privilégio e cria
duas views. É a menor alteração possível que satisfaz o FR-028 sem violar a regra 4 do `CLAUDE.md`.

| Objeto | Operação | Razão |
|---|---|---|
| `public.instrutores` | `revoke select … from authenticated` | Privilégio de **tabela** cobre toda coluna; sem revogá-lo, o `grant` por coluna não tem efeito (medido — ver R-1) |
| `public.instrutores` | `grant select (<33 funcionais>) to authenticated` | Devolve o dado de trabalho a **todos** os 9 perfis (FR-029) |
| `public.vw_instrutores` | `create view … security_invoker = true` | Só as 33 funcionais. Devolve a ergonomia de `select *` e **mantém a RLS da tabela base valendo** |
| `public.vw_instrutor_dados_pessoais` | `create view …` (direitos do dono) | As 12 de PII, com o porteiro `app.perfil_atual() in (<os 3>)` |

⚠️ **Nenhuma tabela nova, nenhuma coluna nova, nenhum `drop`.** O dado migrado pelo Épico 2 fica
onde está; muda quem consegue nomeá-lo.

## As 12 colunas do recorte

`cpf` · `rg` · `orgao_emissor` · `telefone` · `retelma` · `endereco_logradouro` ·
`endereco_numero` · `endereco_complemento` · `endereco_bairro` · `endereco_cidade` ·
`endereco_estado` · `endereco_cep`

⚠️ **`area_conhecimento` NÃO entra.** Ela nasceu na mesma migration do Épico 2 e no mesmo bloco de
colunas não mapeadas, mas **não é dado pessoal** — é área de atuação docente, e a grade precisa
dela. Está escrito no comentário da coluna desde que ela foi criada.

## Entidades já existentes, e o papel de cada uma nesta fatia

### `usuarios` — nenhuma coluna nova

| Coluna | Papel aqui |
|---|---|
| `auth_user_id` | O **espelho** para a credencial. `NULL` = convite emitido e não aceito, que é estado legítimo (FR-008) |
| `perfil` | Lido por `app.perfil_atual()`. Protegido pelo gatilho anti-escalonamento |
| `escopo_curso` | Alcance do Operador. Protegido pelo mesmo gatilho |
| `status` | `inativo` corta o alcance na requisição **seguinte** — `app.usuario_atual()` filtra por ele |
| `ultimo_acesso` | Escrito na autenticação, uma vez por sessão (R-5) |
| `instrutor_id` | Liga a pessoa ao cadastro docente. Instrutor inativo **não** rompe o vínculo |
| `codigo`, `origem_migracao_v1` | Sobrevivem à obtenção de credencial (FR-032) |

**Estados da conta, e como se distinguem na tela:**

| Estado | `auth_user_id` | `status` | O que a tela mostra |
|---|---|---|---|
| Convidado, não aceito | `NULL` | `ativo` | *"convite pendente"* — com a data, para separar recém-enviado de esquecido |
| Ativo | preenchido | `ativo` | último acesso |
| Desativado | preenchido | `inativo` | *"inativo"* — **nunca some da lista** |
| Credencial órfã | — | — | Não aparece: não há linha. Detectada pela rotina do FR-013 |

### `usuario_curso` — hoje vazia, e isso não é lacuna

Os três usuários migrados são dois `admin` e um `visualizacao`, **todos de escopo `Geral`**, que
alcança todos os cursos sem precisar de vínculo. O primeiro `encarregado_curso` do sistema será
**criado por convite**, não migrado (FR-032.1).

### `perfil_permissao` — 152 linhas, lida por dois lados

| Lado | Como lê | Escreve? |
|---|---|---|
| Banco | `app.pode(recurso, acao)` dentro das policies | — |
| Aplicação | `lib/autorizacao/matriz.ts`, uma vez por requisição | **Não nesta fatia** (FR-024.1) |

⚠️ **Os dois lados leem a MESMA tabela.** Uma lista de recursos ou de perfis escrita no código da
aplicação seria a segunda fonte de verdade que o FR-021 proíbe — e divergiria da primeira no dia
em que alguém alterasse a matriz.

### `instrutores` — 45 colunas, 33 funcionais e 12 de PII

Sem alteração de estrutura. A RLS de linha continua sendo `app.pode('instrutores','ler')` — **sem
predicado de linha**, medido. É por isso que a visão com porteiro não duplica lógica de escopo:
não há lógica de escopo a duplicar.

## Regras de validação que a fatia impõe

| Regra | Onde vive | Prova |
|---|---|---|
| Senha ≥ 12 caracteres, conferida contra vazamento | Plataforma de autenticação | SC-003 |
| E-mail único entre contas ativas | `usuarios` + a checagem do FR-012 | Teste de convite duplicado |
| Perfil e escopo só mudam por Admin | `app.impedir_autoescalonamento` (já existe) | Teste já na suíte |
| Último Admin não se desativa nem se rebaixa | Server Action + conferência no banco | FR-016 |
| Recuperação só para conta **ativa** | Server Action, antes de chamar a plataforma | SC-010 |
| PII só para 3 perfis | **Privilégio de banco** | 092_recorte_pii + negativos |

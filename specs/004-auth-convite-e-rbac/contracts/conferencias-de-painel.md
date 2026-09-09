# Contrato — o que não se garante por código

**Fase 1** · 08/09/2026 · fonte: [research.md §R-6](../research.md) · documento 22 §3.4

Duas garantias desta fatia vivem no painel da plataforma. Nenhum arquivo do repositório as impõe,
e **fingir que impõem é pior que admitir que não**.

## Por que não viram teste automatizado

Um teste que afirme *"o auto-cadastro está desligado"* sem consultar o painel dá a sensação de
cobertura sem a cobertura — é o `ok(true)` que a suíte de pgTAP recusa. A alternativa, consultar a
API de administração a cada execução do CI, exigiria a **chave administrativa dentro do CI**: troca
uma garantia fraca por um risco real, e o risco é o A-5 do modelo de ameaças (vazamento da
`service_role`), que é o de impacto **crítico**.

**Decisão: conferência humana, com valor observado registrado.** Registrar "sim" não serve;
registra-se **o que se viu**.

## Os itens

### 1. Auto-cadastro desligado (FR-003)

| | |
|---|---|
| **Onde** | Painel do projeto → Authentication → Providers/Sign-ups |
| **O que conferir** | `Enable Sign Ups` **desligado** |
| **Valor a registrar** | o estado observado e a data |
| **Por que importa** | Com ele ligado, qualquer pessoa com o endereço da aplicação cria credencial. Ela não alcançaria dado nenhum — sem linha em `usuarios`, `app.usuario_atual()` devolve `NULL` e nenhuma policy concede acesso a `NULL`, provado pelo teste T-09 — mas teria credencial válida no projeto. Lixo desnecessário e superfície gratuita |

### 2. Limite de tentativas de autenticação (FR-005.2)

| | |
|---|---|
| **Onde** | Painel do projeto → Authentication → Rate Limits |
| **O que conferir** | o limite aplicado às tentativas de login e ao envio de e-mail |
| **Valor a registrar** | **o número observado**, não "está configurado" |
| **Por que importa** | ⚠️ **O documento 22 não trata do assunto.** O modelo de ameaças vai de A-1 a A-7 e nenhuma delas é tentativa repetida de senha; a defesa de A-7 (política de senha) protege a senha escolhida, não o endereço de login. Depois desta fatia esse endereço dá acesso a CPF e residência de 177 militares |

### 3. Política de senha (FR-006)

| | |
|---|---|
| **Onde** | Painel do projeto → Authentication → Policies |
| **O que conferir** | comprimento mínimo **12**; verificação contra vazamento (HaveIBeenPwned) **habilitada** |
| **Valor a registrar** | **os dois valores observados**, e a data |
| **Por que importa** | É a defesa da ameaça **A-7** do documento 22 §1.2 — senha fraca ou reutilizada, probabilidade **média**. ⚠️ Composição obrigatória e expiração compulsória ficam **desligadas de propósito** (documento 22 §4.5, alinhado ao NIST SP 800-63B): exigir símbolo e trocar senha a cada 90 dias produz senhas piores, previsíveis e anotadas em papel. Se alguém as ligar "para reforçar", **enfraquece** |

### 4. Região do projeto

| | |
|---|---|
| **Onde** | Painel do projeto → Settings → General |
| **O que conferir** | região **São Paulo (`sa-east-1`)**, não região estrangeira |
| **Por que importa** | Documento 22 §9: a autorização da CIAARA-14.2 tratou de hospedagem em nuvem comercial; a localização física continua sendo o que a autoridade precisa saber |

## Entregável desta fatia

Além das quatro conferências: **propor ao documento 22 uma ameaça A-8** — tentativa repetida de
senha contra o endereço de login, com a defesa observada no item 2. Propor é da fatia; **aprovar é
do Bernardo**.

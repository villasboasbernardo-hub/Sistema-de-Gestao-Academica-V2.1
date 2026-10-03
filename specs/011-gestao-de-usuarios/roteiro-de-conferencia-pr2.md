# Conferência do PR 2 — as quatro ações sobre conta

> **Para Bernardo Villas Boas.** Doze passos, **só com contas de teste criadas aqui**. Nenhum passo
> mexe nas cinco contas reais — o estado delas está na tabela no fim deste arquivo.
>
> **Onde:** <https://sistema-de-gestao-academica-v2-1-git-feat-epic-35e53b-ciaara-11.vercel.app>
>
> **Commit que esse endereço serve:** **`4ea4f4f`** — deploy
> `4Ucq4HVjf7gFJz2Zg2P12LbCZ6Gk`, **Ready**, e **CI verde nos três blocos** sobre ele
> (run `37119236623`). O comportamento que você vai conferir entrou em **`7c5c44a`**; o que veio
> depois foi **documento** e uma **migration só de comentário** — nenhuma linha que os doze passos
> abaixo toquem.
>
> ⚠️ **O APELIDO É FIXO POR RAMO; o que muda é o build que ele serve.** Medido em 03/10/2026 com
> `vercel inspect`: os deploys deste ramo compartilham esse endereço, e ele responde **302 para o
> `sso-api` da Vercel** por proteção de deploy — é preciso estar autenticado na Vercel para abrir.
> Para amarrar um commit exato: `gh api repos/…/commits/<sha>/statuses`.
>
> ⚠️ **AS SEIS DECISÕES D-USR ESTÃO APLICADAS.** As que mudam o que você vê: a confirmação da
> exclusão **não pede nada digitado** (D-USR-4) e cada linha tem **quatro** ações, começando por
> **Editar** (D-USR-6).
>
> ⚠️ **O CONVITE SAIU DA INTERFACE, E NÃO SÓ DOS DOCUMENTOS.** A tela de login dizia *"o acesso é
> somente por convite do Admin"* — a primeira tela do sistema — e a recusa de *Redefinir senha*
> mandava usar «Reenviar convite», que não existe mais. As duas foram corrigidas, e agora há
> **guarda** que reprova se o convite ou qualquer envio de e-mail voltarem.
>
> ⚠️ **UMA DAS QUATRO AÇÕES PODE FALTAR, com a razão escrita no lugar dela.** Conta **sem
> credencial** não tem senha a redefinir, e **4 das 5 contas reais estão nesse estado** — vieram do
> ETL e do convite antigo. No lugar do botão aparece *"sem credencial — não entra"*.

## Os doze passos

| #   | Passo                                                                                       | Resultado esperado                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Menu → **Administração** → olhar a lista                                                    | Seis colunas: avatar, nome, e-mail, perfil, último acesso e **Ações**. Em cada linha: **Editar · Redefinir senha · Desativar · Excluir**             |
| 2   | Olhar a **sua própria** linha                                                               | Nenhum botão, **nem Editar** — *"sua conta — peça a outro Administrador"*. O **nome** continua clicável                                             |
| 3   | Numa linha que não é a sua, clicar **Editar**; voltar e clicar no **nome**                   | Os dois abrem a **mesma** página da conta, com nome, perfil, escopo e as ações de acesso                                                           |
| 4   | **Cadastrar usuário** → nome «Teste Um», e-mail `teste-um@ciaara.teste` → salvar             | **Senha temporária** de 16 caracteres, sem `O`, `0`, `l`, `1` nem `I`. **Copie.** Dar F5 a perde                                                    |
| 5   | Repetir para «Teste Dois», `teste-dois@ciaara.teste`                                         | Idem. Agora há duas contas de teste na lista, as duas com as quatro ações                                                                           |
| 6   | Sair; entrar como **Teste Um** com a temporária; tentar ir a **Início**                      | Cai em **Trocar a minha senha** e não sai de lá. Definir a nova → **Início abre**                                                                   |
| 7   | Sair; tentar a **temporária** e depois a **nova**                                            | A temporária é **recusada**; a nova entra                                                                                                          |
| 8   | Voltar como Admin → **Redefinir senha** na linha de **Teste Dois** → confirmar                | O diálogo avisa que **encerra as sessões abertas**. Aparece outra temporária, uma vez                                                               |
| 9   | **Desativar** Teste Dois → confirmar; depois **Reativar**                                     | O diálogo diz que ela **perde o acesso**, que **nada é apagado** e que **NÃO é exclusão**. A linha ganha **Desativada** e **fica**. Reativar não pergunta nada |
| 10  | **Excluir** na linha de **Teste Um** → **ler o cartão** e clicar em **Cancelar**               | *"Tem certeza que deseja excluir a conta Teste Um (teste-um@ciaara.teste)?"* e *"A exclusão é permanente."* Só **Cancelar** e **Excluir** — **nenhum campo para digitar**. Cancelar não muda nada |
| 11  | **Excluir** outra vez e confirmar                                                             | A conta **sai da lista**, e **acima da tabela** aparece o que aconteceu. Entrar com ela: **recusado**                                               |
| 12  | **Cadastrar** de novo `teste-um@ciaara.teste`; depois excluir **Teste Dois** do mesmo modo     | O e-mail **é aceito** — a exclusão liberou o endereço. Teste Dois nunca usou o sistema, e também sai                                                |

---

## As cinco contas reais — estado medido no remoto em 03/10/2026, **só por leitura**

⚠️ **Nenhuma delas foi alterada.** O que segue é leitura: `public.usuarios`, `auth.users` e
`public.dependentes_da_conta`.

| Código          | Perfil    | Situação | Entra?                              | Dependentes                   | Excluível pela tela?                                      |
| --------------- | --------- | -------- | ----------------------------------- | ----------------------------- | --------------------------------------------------------- |
| `USR-01`        | Admin     | ativa    | **não** — sem credencial            | 0                             | **sim**, e o e-mail fica livre                            |
| `USR-02`        | Admin     | ativa    | **não** — sem credencial            | 0                             | **sim**, mas o **e-mail NÃO fica livre** (ver abaixo)     |
| `USR-03`        | Visualização | desativada | **não** — sem credencial         | 0                             | **sim**, e o e-mail fica livre                            |
| `USR-ADMIN-001` | Admin     | ativa    | **sim** — é a **única** que entra   | **17**, em 7 tabelas          | **não** — é a **sua própria** conta (D-USR-3)             |
| `USR-MUEF9CLK`  | Ajudante  | desativada | **não** — convite antigo, nunca emitido | 0                        | **sim**, e o e-mail fica livre                            |

**Três coisas que essa tabela diz, e que vale ler devagar:**

**1. Só uma conta entra no sistema.** `USR-ADMIN-001` é a única com credencial, e é por ela que você
está entrando. As outras quatro são cadastros que **nunca** conseguiram acessar — três do ETL e uma
do convite que gravou a linha e não emitiu o convite.

**2. `USR-02` e `USR-ADMIN-001` dividem o seu e-mail, e isso explica o resto.** O endereço que
funciona é a **credencial** de `USR-ADMIN-001`, cuja **linha** mostra um sentinela
`@ciaara11.invalid`; `USR-02` mostra o endereço de verdade na tela e **não tem credencial nenhuma**.
Por isso excluir `USR-02` **não libera** aquele e-mail: ele é o login de outra conta, e apagá-lo
derrubaria o seu acesso. ⚠️ **A tela diz isso agora** — antes ela prometia que o endereço ficaria
livre. **Como juntar as duas é decisão sua**, e está na lista de dúvidas.

**3. Os zeros de «Dependentes» são por construção, não por varredura.** Conta sem credencial nunca
carimbou nada — o gatilho de auditoria lê `auth.uid()` —, então a função devolve vazio **de
propósito**. O único número varrido de verdade é o **17** de `USR-ADMIN-001`:
`auditoria_de_conta` (4), `usuarios.editado_por` (4), `instrutor_disciplina` (2),
`instrutores.editado_por` (2), `turma_disciplina_instrutor` (2), `turma_disciplina.editado_por` (2)
e `usuarios.criado_por` (1).

---

## Como dar acesso a uma das quatro contas sem credencial

Não há botão para isso, e a razão está na tela: *Redefinir senha* só existe onde há senha. O caminho
é **excluir a conta e cadastrar o mesmo e-mail de novo** — a exclusão libera o endereço, e o cadastro
cria a credencial com senha temporária. ⚠️ **Para `USR-02` isso não funciona**, pelo motivo 2 acima.
Se você preferir que *Redefinir senha* passe a **criar** a credencial quando ela não existe, é uma
decisão de uma linha — está na lista de dúvidas.

# Dúvidas em lote — spec 011, gestão de usuários

**Levantadas em 29/09/2026**, ao escrever a spec sobre o estado medido. Cada uma tem **opções**, uma
**recomendação** e o **padrão já adotado** na spec, para que ela seja executável sem resposta. Nenhuma
bloqueia o `/speckit.plan`; as duas primeiras mudam o desenho, as demais mudam detalhe.

---

## D-1 — Quais perfis o Admin pode escolher ao editar alguém?

**O enunciado da fatia diz "Operador/Encarregado/Admin". O enum do banco tem NOVE valores**, e a
matriz `perfil_permissao` semeia os nove, com permissões diferentes para cada.

| Opção | O quê | O que implica |
|---|---|---|
| **(a)** | Oferecer os **nove** do enum | a tela reflete o domínio; nada fica inalcançável; a lista fica longa |
| (b) | Oferecer **três** (`operador`, `encarregado_administracao_academica`, `admin`) | tela curta, mas **seis perfis ficam sem caminho de atribuição** — e quatro deles já têm permissões semeadas, inclusive de leitura de PII |
| (c) | Oferecer os nove, **agrupados** por divisão (CIAARA-10 / 11 / 12 / operação) | o melhor dos dois, e é só apresentação |

**Recomendação: (c)**, e (a) se agrupar custar tempo. ⚠️ **(b) tem um custo escondido**: hoje
`chefe_departamento_ensino`, `encarregado_orientacao_pedagogica` e os dois ajudantes só podem ser
atribuídos por escrita direta no banco — se a tela não os oferece, eles deixam de existir na prática.

**Padrão adotado na spec**: (a), os nove. *(Assumption 2.)*

---

## D-2 — Onde fica o rastro das ações administrativas?

A `FR-047` pede rastro de **toda** ação administrativa. A tabela `exclusoes_registradas` existe e é
imutável até para a chave privilegiada — mas o `CHECK` dela aceita **três** tabelas
(`instrutores`, `disciplinas`, `unidades_ensino`) e **não** aceita `usuarios`.

| Opção | O quê | O que implica |
|---|---|---|
| **(a)** | **Trilha nova**, própria de ações sobre conta | cobre editar perfil, redefinir senha, desativar, reativar e excluir — as cinco. Uma tabela a mais |
| (b) | Estender o `CHECK` de `exclusoes_registradas` para aceitar `usuarios` | reusa a imutabilidade pronta, mas ela é **exclusões**: redefinir senha e mudar perfil **não são exclusão** e ficariam sem lugar |
| (c) | Só o quarteto de auditoria que já existe (`editado_por`/`editado_em`) | zero trabalho, e **não responde "quem redefiniu a senha de quem"** — o quarteto guarda o último autor, não o histórico |

**Recomendação: (a)**, com o `CHECK` de exclusões estendido **junto** para o caso da exclusão de
conta, que é destrutiva e merece retrato. ⚠️ **(c) parece suficiente e não é**: redefinir senha não
altera linha nenhuma de `usuarios`, então o quarteto **nem se move**.

**Padrão adotado na spec**: (a). *(Assumption 7.)*

---

## D-3 — A foto fica em espaço público ou privado?

Não há bucket nenhum hoje — o bloco no `config.toml` está inteiramente comentado.

| Opção | O quê | O que implica |
|---|---|---|
| **(a)** | **Privado**, com endereço temporário por requisição | foto de pessoa não vaza por endereço adivinhável; custa um endereço assinado por exibição |
| (b) | Público, com nome de arquivo imprevisível | mais simples e mais rápido; quem tiver o endereço vê para sempre, e o repositório é público |

**Recomendação: (a)**. ⚠️ O repositório é **público** desde 26/08/2026, e a decisão PII-1 já restringe
identificação civil a três perfis. Foto é dado pessoal; o padrão mais restrito é o que combina.

**Padrão adotado na spec**: (a). *(Assumption 3.)*

---

## D-4 — Redefinir a senha derruba as sessões abertas daquela pessoa?

| Opção | O quê | O que implica |
|---|---|---|
| **(a)** | **Não derruba**; a obrigação aparece no próximo login | menos surpresa; uma sessão roubada continua válida até expirar |
| (b) | Derruba todas na hora | é o comportamento de segurança forte, e é o que se espera quando a senha é redefinida **porque vazou** |

**Recomendação: (b)**, se for barato. Redefinição pelo Admin quase sempre significa *"perdi o
acesso"* ou *"a senha vazou"*, e nos dois casos derrubar é o certo. **(a)** só é melhor se a
redefinição for usada como conveniência.

**Padrão adotado na spec**: (a), por ser o menos surpreendente. *(Assumption 4.)* ⚠️ É a dúvida em
que a recomendação **diverge** do padrão adotado — porque (b) muda o que a pessoa vê sem aviso, e
isso é decisão sua.

---

## D-5 — O que conta como "dependente" e impede excluir uma conta?

A D-B1 exige "registro SEM HISTÓRICO NENHUM". Para conta, os candidatos medidos são: credencial já
usada, vínculo de curso, ficha de instrutor vinculada, e **ter criado ou editado qualquer registro**
(o quarteto de auditoria aponta para a conta).

| Opção | O quê | O que implica |
|---|---|---|
| **(a)** | Os **quatro** | é o mais fiel à D-B1. Na prática, quem já usou o sistema uma vez deixa de ser excluível — que é justamente o caso que a regra 4 protege |
| (b) | Só credencial usada e vínculo de curso | mais contas ficam excluíveis; a autoria de um registro pode apontar para conta que não existe mais |
| (c) | Os quatro, e o alvo real é **só o convite criado por engano** | mesma lista de (a), com o nome certo: a exclusão existe para desfazer engano, não para limpar cadastro |

**Recomendação: (c)** — mesma regra de (a), com o propósito escrito, para ninguém esperar que a
exclusão sirva de faxina.

**Padrão adotado na spec**: (a). *(Assumption 5.)*

---

## D-6 — Reativar conta: ação nova na matriz, ou é "editar"?

⚠️ **Esta é a única que conflita com uma asserção existente.** `supabase/tests/103_permissoes.sql`
prova, por `is_empty`, que a matriz tem **zero** ações `reativar` — e a `FR-044` pede reativar.

| Opção | O quê | O que implica |
|---|---|---|
| **(a)** | Reativar é **`usuarios.editar`** | nada muda na matriz, a asserção continua valendo, e quem edita reativa |
| (b) | Criar a ação `reativar` na matriz | mais preciso, e **quebra a asserção** — que teria de mudar com a razão escrita |
| (c) | Reativar é `usuarios.desativar` (a permissão de mexer na situação) | o nome fica estranho, mas a permissão é exatamente a que já existe para o inverso |

**Recomendação: (a)**. A asserção de zero `reativar` não é acidente: ela foi escrita para impedir que
a matriz cresça sem decisão. Respeitá-la custa nada.

**Padrão adotado na spec**: nenhum — a `FR-044` diz **o quê**, e o **como** é do plano.

---

## D-7 — A pessoa pode trocar o próprio nome sem limite?

| Opção | O quê | O que implica |
|---|---|---|
| **(a)** | Sim, e a mudança fica no rastro | simples; o Admin vê quem mudou o quê |
| (b) | Sim, mas só `nome_exibicao`; o `nome` civil só o Admin muda | preserva a distinção que a tabela já faz entre nome civil e nome de tratamento |

**Recomendação: (b)**, e é o padrão adotado. ⚠️ A coluna `nome_exibicao` **existe desde o Épico 1 e
nunca foi escrita por tela nenhuma** — ela foi criada exatamente para isto.

**Padrão adotado na spec**: (b). *(Assumption 1.)*

---

## D-8 — A troca obrigatória bloqueia também as rotas abertas?

Hoje `/login`, `/convite`, `/recuperar-senha`, `/sem-configuracao` e `/estilo` passam sem sessão.

| Opção | O quê | O que implica |
|---|---|---|
| **(a)** | A obrigação bloqueia só as rotas **do sistema**; as abertas seguem abertas | a pessoa consegue sair e a vitrine continua acessível |
| (b) | Bloqueia tudo menos a própria tela de senha nova | mais rígido, e **tira o botão de sair de quem está preso** |

**Recomendação: (a)**. ⚠️ **(b) cria um beco**: quem entrou na conta errada com uma senha temporária
não teria como voltar à tela de entrada.

**Padrão adotado na spec**: (a), implícito na `FR-036`, que fala das "telas do sistema".

---

## Uma observação que não é dúvida

O enunciado desta fatia fala em marcar a obrigação em **`app_metadata`** e conferir no **middleware**.
Registro dois fatos medidos, sem contestar a escolha:

1. **`app_metadata` não é usado em lugar nenhum hoje** — zero ocorrências no repositório. E há uma
   decisão registrada em `lib/autorizacao/sessao.ts` de **não guardar perfil no token**, para que a
   desativação valha na requisição seguinte. A obrigação de trocar senha é diferente de perfil: ela
   só muda quando a própria pessoa a resolve. Ainda assim, **onde** ela mora é decisão do plano, e a
   spec pede só o comportamento (`FR-035`, `FR-036`).
2. **O arquivo é `proxy.ts`, não `middleware.ts`** — o `next build` recusa os dois juntos.

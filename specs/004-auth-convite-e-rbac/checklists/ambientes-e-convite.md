# Checklist de qualidade dos requisitos: ambientes remotos e ciclo de vida do convite — Épico 3

**Propósito**: testar se os requisitos que governam **o projeto remoto, os escopos da Vercel e o
convite** estão bem escritos — completos, claros, consistentes e mensuráveis. Não testa se o sistema
funciona; testa se o que está escrito permite decidir se ele funciona.
**Criado**: 14/09/2026
**Feature**: [spec.md](../spec.md) · [contrato do convite](../contracts/convite.md) · [contrato de conferências](../contracts/conferencias-de-painel.md) · [data-model](../data-model.md) · [spec 001](../../001-fundacao-repositorio-ci/spec.md)
**Alcance**: spec 004, os contratos dela, e os requisitos da spec 001 que governam ambiente. Ficam
**de fora** os itens que [`security.md`](./security.md) já cobre — em especial o CHK002 (quando as
migrations chegam ao remoto), o CHK003 (paridade de configuração), o CHK007 (falha do provedor de
e-mail) e o CHK019 (auto-cadastro na tabela de dependências). Onde um item daqui toca um de lá, a
linha diz qual.
**Momento**: portão **antes de declarar o Épico 3 fechado**. Público: quem revisa o fechamento, e
Bernardo para os itens de conflito, que só ele decide.
**Profundidade**: padrão. Dois focos, escolhidos pelos sinais mais fortes do épico: as divergências
de configuração medidas no projeto remoto em 14/09/2026, e os dois defeitos do convite corrigidos
**depois** do merge (PR #12 e PR #13).

> **Como ler cada item.** Todos são perguntas sobre **o que está escrito**. "Não" não significa que
> o sistema esteja errado — significa que o requisito não permite decidir se está. **Nenhum
> requisito foi alterado na redação desta lista**: os conflitos estão reportados, não resolvidos.

## Consistência entre specs — o ambiente de Production que passou a existir

- [ ] CHK001 O `FR-016.1` da spec 001 — *"MUST NOT criar ambiente de produção da v2.1. O `main` MUST NOT publicar em produção"* — continua vigente, ou foi emendado em algum lugar? [Conflito, Spec 001 §FR-016.1] ⚠️ Medido em 14/09/2026: o escopo Production da Vercel tem cinco variáveis, `NEXT_PUBLIC_AMBIENTE` existe nele há 11 dias, e há deployments de Production servidos no endereço estável `https://sistema-de-gestao-academica-v2-1.vercel.app`. Nenhuma emenda foi encontrada nas specs 001 e 004. O CLAUDE.md ainda descreve o escopo como vazio.
- [ ] CHK002 O rótulo `producao` é admitido pelo `FR-022.2` quando o projeto apontado é o `cqhpfuaweoyglhtrckcp`, que o `FR-022.1` designa **desenvolvimento/preview**? [Conflito, Spec 001 §FR-022.1 e §FR-022.2] O `FR-022.2` exige que o rótulo corresponda ao projeto realmente apontado, e o `FR-017` da mesma spec só conhece `local` e `preview`.
- [ ] CHK003 As tarefas T003 e T062.1 ainda exigem o escopo Production **vazio** como o que satisfaz o requisito? [Conflito, Tasks §T003 e §T062.1] As duas estão abertas e assumidas por Bernardo. Com o estado de 14/09/2026, ou elas ficaram obsoletas, ou o estado as viola — e o texto não permite dizer qual.
- [ ] CHK004 "Projeto de produção" no `FR-031.1` e no invariante C-5 do contrato do convite é definido pelo **projeto Supabase** ou pelo **escopo da Vercel**? [Ambiguidade, Spec §FR-031.1, Contrato convite §C-5] ⚠️ A diferença tem consequência: quem ler "já existe Production" pode disparar os convites às três contas reais contra o projeto de preview, exatamente o que a decisão de 08/09/2026 quis impedir.
- [ ] CHK005 Algum requisito diz **em quais escopos** a `SUPABASE_SERVICE_ROLE_KEY` pode existir? [Gap, Contrato convite §C-4, Constitution §XI] O C-4 diz **quando** ela é usada — só no passo 2 do convite — e nada sobre **onde** ela reside. Medido: está no escopo Preview há 7 dias e foi adicionada ao Production em 14/09/2026, os dois apontando para o mesmo projeto.
- [ ] CHK006 Os identificadores citados entre artefatos são inequívocos? [Ambiguidade, Rastreabilidade] Dois casos medidos: a T003 e a T062.1 citam **`FR-022`** querendo dizer o da spec 001 (dado sintético em preview), enquanto o `FR-022` da spec 004 é a negação pelo banco; e **`V-6`** é o reenvio no contrato do convite e a desativação no `quickstart.md`. É a mesma classe da nota *"Spec 001 exige o diretório"* do CLAUDE.md.

## Completude — a configuração de autenticação do projeto remoto

- [ ] CHK007 Existe requisito que enumere **quais chaves de autenticação** o projeto remoto deve ter, e com que valor? [Gap, Spec §FR-003, §FR-006] Hoje só três são requisito: auto-cadastro, comprimento mínimo e composição da senha. Medido em 14/09/2026: **seis outras** divergem entre o remoto e o `config.toml`, e nenhuma linha escrita decide qual lado está certo. Ver a tabela em *Medição*, abaixo. *(Complementa o CHK003 de `security.md`, que pede a paridade sem dizer de quê.)*
- [ ] CHK008 O `site_url` e a lista de redirecionamento do projeto remoto são objeto de algum requisito? [Gap, Spec §FR-033] O `FR-033` nomeia a URL canônica **da aplicação**, mas quem monta o link de convite e de recuperação é a plataforma, a partir do `site_url` e da lista de redirecionamento dela. ⚠️ Um `supabase config push` feito da raiz do repositório troca o `site_url` remoto por `http://127.0.0.1:3000`, e nenhum requisito diz que isso está errado.
- [ ] CHK009 Está decidido se a lista de redirecionamento pode conter **curinga**? [Gap, Segurança, Doc 22 §3.3] Medido no remoto: `https://*-ciaara-11.vercel.app/**`. O padrão casa com qualquer deployment de qualquer projeto do mesmo time na Vercel. Nenhum requisito aceita nem recusa isso.
- [ ] CHK010 A confirmação de e-mail tem valor requerido? [Gap, Spec §FR-009, §US1] Medido: ligada no remoto, desligada no `config.toml`. O percurso do `FR-036` e do `SC-002` foi provado com a configuração local, então a prova e o ambiente de preview podem estar exercitando fluxos diferentes.
- [ ] CHK011 A Premissa 5 — *"MFA opcional para o Admin é configuração de painel, não requisito"* — decide o estado do TOTP no remoto? [Ambiguidade, Spec §Premissa 5] "Opcional" admite duas leituras: disponível para quem quiser, que é o remoto medido, ou desligado, que é o `config.toml`. As duas satisfazem a frase.
- [ ] CHK012 Está escrito **qual é a fonte de verdade** quando o `config.toml` e o painel remoto divergem? [Conflito, Contrato de conferências §"O que continua sendo só do painel"] O contrato afirma que o remoto *"não lê o `config.toml`"* e que *"nenhum arquivo do repositório as alcança"*. ⚠️ Medido em 14/09/2026 com a CLI 2.116.0: `supabase config push` **escreve** a seção `[auth]` inteira do arquivo no remoto, com confirmação única e resposta padrão "sim" quando não há terminal. A afirmação do contrato é anterior a isso e já não descreve a ferramenta.
- [ ] CHK013 A tabela de valores observados do contrato de conferências separa as linhas do **stack local** das do **projeto remoto**, com data em cada uma? [Completude, Contrato de conferências §"Valores observados"] Hoje toda linha medida é do `config.toml`, e as duas do remoto — vazamento e região — seguem "pendente". *(Para quem fechar: a CLI devolveu `sa-east-1` para o projeto em 14/09/2026. É leitura de ferramenta, não conferência de painel registrada.)*

## Clareza — URL canônica e validade do link

- [ ] CHK014 O `FR-033` especifica o **formato** da URL canônica — endereço estável ou de deployment, com ou sem barra final? [Clareza, Spec §FR-033] ⚠️ Até 14/09/2026 o escopo Production apontava para um endereço de deployment específico, **com** barra final. Os dois detalhes produzem link errado sem erro nenhum, e o requisito não exclui nenhum deles.
- [ ] CHK015 O `FR-033` diz qual é a URL canônica **em cada ambiente**, inclusive no preview por branch? [Completude, Spec §FR-033, Spec 001 §FR-016] O `FR-016` da spec 001 dá URL própria a cada push. Um valor único por escopo não pode apontar para "o" preview, e o requisito não diz se o convite de preview vai para o endereço do branch ou para outro.
- [ ] CHK016 "Validade limitada", nos `FR-009` e `FR-018`, está quantificada, e a quantidade é a mesma nos documentos? [Conflito, Spec §FR-009, §FR-018, Doc 22 §4.2] O documento 22 §4.2 diz *"validade padrão de 24 horas"*. O `config.toml` e o remoto têm `otp_expiry = 3600` — **1 hora**. O `FR-013` depende desse número para separar "convite pendente" de "linha órfã".
- [ ] CHK017 Há requisito sobre o **intervalo mínimo entre dois envios** ao mesmo endereço, que o reenvio do `FR-011` encontra? [Gap, Spec §FR-011] Medido: 1 minuto no remoto, 1 segundo no `config.toml`. A prova de ponta a ponta do reenvio roda no local. O PR #13 passou a traduzir `over_email_send_rate_limit`, então o caso existe no código sem existir no requisito.

## Mensurabilidade — o espelho e o reenvio

- [ ] CHK018 O `FR-010` nomeia o **observável** que prova o espelho fechado — `usuarios.auth_user_id` igual ao id da credencial — ou só o desfecho *"deixar a pessoa autenticada"*? [Mensurabilidade, Spec §FR-010, Contrato convite §V-3] ⚠️ O PR #12 mostrou o custo: o requisito nunca foi cumprido durante o épico inteiro, e a verificação V-3 **selecionava** a coluna sem conferi-la.
- [ ] CHK019 "Autenticada", no `FR-010`, significa sessão **na plataforma** ou acesso **à aplicação**? [Ambiguidade, Spec §FR-010] O PR #12 é o caso em que as duas leituras se separam: havia sessão válida na plataforma, e a aplicação mandava a pessoa de volta ao login. A primeira leitura aprovava o defeito.
- [ ] CHK020 O `FR-036` exige que a conta usada nas provas de ponta a ponta nasça **pelo caminho que a aplicação oferece**? [Gap, Spec §FR-036] O PR #12 mediu que o auxiliar de teste gravava o vínculo direto no banco: os casos de ponta a ponta rodavam sobre um estado que a aplicação não sabia produzir. Nenhum requisito proibia.
- [ ] CHK021 A verificação V-6 do contrato do convite — *"novo link vale, anterior não"* — tem forma de observar a **segunda** metade? [Mensurabilidade, Spec §FR-011, Contrato convite §V-6] A prova de ponta a ponta do reenvio observa o e-mail novo chegar, que é a primeira metade. Nenhum artefato descreve como se observa o link antigo deixar de valer.
- [ ] CHK022 O `FR-012` e o caso de fronteira *"convite para quem já tem conta ativa"* definem **qual sinal** caracteriza conta ativa? [Ambiguidade, Spec §FR-012, §Edge Cases] Há três candidatos: `status` da linha, `auth_user_id` preenchido, credencial confirmada na plataforma. ⚠️ O PR #13 nasceu da divergência entre dois deles: a guarda da aplicação olhava o vínculo, a plataforma olhava a confirmação, e a frase em inglês vazou pelo meio.

## Consistência — mensagens e idioma

- [ ] CHK023 Existe requisito de que **erro vindo da plataforma** chegue ao usuário em português, e de que mensagem desconhecida **não** seja repassada? [Gap, Spec §FR-016, CLAUDE.md §Idioma] Desde o PR #13 a regra existe no código do reenvio, discriminada pelo código do erro. Ela não existe em requisito algum, e o login e a recuperação têm a mesma exposição.
- [ ] CHK024 A regra de **não ser oráculo** — `FR-019` e cenário 4 da US1 — delimita a quais telas se aplica? [Consistência, Spec §FR-019, §US1] A mensagem do reenvio diz *"Esta conta já tem credencial"*, o que revela a existência da conta. Em tela restrita ao Admin isso é defensável, mas o requisito não separa tela sem sessão de tela administrativa, e as duas leituras chegam a respostas opostas.

## Cobertura — exceção e recuperação do convite

- [ ] CHK025 Está especificado o caminho de saída quando a senha foi definida e o **vínculo não fecha**, o passo 4 do contrato? [Gap, Recuperação, Contrato convite §sequência, §C-2] O C-2 trata a falha do passo 2 e para aí. ⚠️ O estado resultante é o de todos os convites antes do PR #12, e nele o reenvio é recusado pela plataforma e a recuperação leva a uma aplicação que nega. Nenhum requisito descreve a saída.
- [ ] CHK026 Os **dois sentidos** do `FR-013` cobrem o estado *"linha e credencial existem, sem vínculo"*? [Cobertura, Spec §FR-013, §SC-012, Data-model §"Estados da conta"] Ele não é credencial sem linha nem linha sem credencial. Pela tabela de estados do data-model, a tela o mostraria como **"convite pendente"**, e a rotina de detecção só o acusaria depois da validade, classificado como convite nunca aceito.
- [ ] CHK027 O critério que separa convite **recém-enviado** de **esquecido** está quantificado? [Clareza, Data-model §"Estados da conta", Spec §Edge Cases "Linha órfã"] O data-model manda mostrar *"com a data"* e deixa o julgamento a quem lê. Depende do número do CHK016.
- [ ] CHK028 O comportamento quando a URL canônica está **presente e errada** está especificado? [Gap, Exceção, Spec §FR-033, §FR-005.1] O `FR-005.1` cobre a configuração **ausente**. O valor errado — o endereço de deployment com barra final, medido até 14/09/2026 — passa por qualquer conferência de presença e só aparece quando alguém abre o link.
- [ ] CHK029 Algum requisito impede que um convite emitido num ambiente seja **aceito em outro**? [Gap, Spec §FR-033] O aviso do `FR-033` nomeia o risco e oferece só a configuração como defesa. ⚠️ Existe um único projeto Supabase, e os escopos Preview e Production da Vercel apontam para ele: um link emitido por um é válido no outro.
- [ ] CHK030 O cenário 5 da US1 e o `FR-011` cobrem o reenvio para convite **ainda não expirado**? [Cobertura, Spec §US1-5, §FR-011] O cenário só nomeia o convite expirado. O PR #13 mediu o caso não expirado, que é o que o Admin mais usa.

## Dependências e critério de fechamento

- [ ] CHK031 A tabela de dependências da spec ainda marca `NEXT_PUBLIC_URL_APLICACAO` como *"⬜ entra nesta fatia"*? [Consistência, Spec §Dependências] Medido em 14/09/2026: ela existe nos escopos Preview e Production. *(Mesma tabela, outra linha, do CHK019 de `security.md`.)*
- [ ] CHK032 A Premissa 3 — *"a configuração do remetente é item de painel"* — tem item correspondente no contrato de conferências? [Gap, Spec §Premissa 3, Contrato de conferências §"Os itens"] O contrato tem quatro itens, e o remetente não é um deles. *(O CHK007 de `security.md` trata da falha do envio; este trata da conferência do remetente.)*
- [ ] CHK033 Está definido **quais conferências de painel** precisam ter valor observado para o Épico 3 ser declarado concluído, e **contra qual projeto**? [Gap, Mensurabilidade, Contrato de conferências] O CLAUDE.md lista como falta *"a conferência do painel do projeto remoto"*. O próprio contrato diz que *"a conferência que mais importa ainda não tem objeto"*, porque o projeto de produção não existe. Conferir o projeto de preview e dar o épico por fechado, ou adiar a conferência para o nascimento da produção, são leituras que o texto admite igualmente.

## Medição — autenticação do projeto remoto × `config.toml`, 14/09/2026

Leitura sem escrita, com `yes n | supabase config push`: a CLI mostra a diferença de cada seção e
recusa todas as confirmações. **API, banco e storage estão iguais.** Na seção de autenticação,
`enable_signup` e `minimum_password_length` **já coincidem** — o ajuste de 14/09/2026 foi aplicado.
Restam seis diferenças:

| Chave | Projeto remoto | `config.toml` | Item |
|---|---|---|---|
| `site_url` | `https://sistema-de-gestao-academica-v2-1.vercel.app` | `http://127.0.0.1:3000` | CHK008 |
| `additional_redirect_urls` | endereço estável `/**` · `https://*-ciaara-11.vercel.app/**` · `http://localhost:3000/**` | seis endereços de `127.0.0.1` e `localhost` | CHK008 · CHK009 |
| `[auth.mfa.totp]` `enroll_enabled` / `verify_enabled` | `true` / `true` | `false` / `false` | CHK011 |
| `[auth.email]` `enable_confirmations` | `true` | `false` | CHK010 |
| `[auth.email]` `max_frequency` | `1m0s` | `1s` | CHK017 |
| `[auth.email]` `otp_length` | `8` | `6` | CHK016 |

⚠️ **Não empurre o `config.toml` cru para o remoto.** A CLI envia a seção inteira, e as duas
primeiras linhas desta tabela quebrariam o convite no endereço estável sem erro nenhum.

## Notas

- Marque com `[x]` conforme fechar, e escreva o achado na própria linha.
- **Um item que reprova não é defeito do sistema.** É requisito que não permite decidir. A correção
  é escrever melhor o requisito; só depois, se for o caso, mudar configuração ou código.
- **Os CHK001 a CHK005 são de decisão do Bernardo**, e nenhum outro deve ser fechado antes deles:
  eles dizem se o escopo Production da Vercel é um ambiente legítimo da v2.1 ou uma violação do
  `FR-016.1`, e metade da lista muda de sentido conforme a resposta.
- A lista foi gerada sem sessão de perguntas, com os padrões do comando: profundidade padrão, os
  dois focos de maior sinal e o revisor do fechamento como público. Ficaram de fora a experiência
  das cinco telas, retrabalhadas na fatia (c) do Épico 4, e a matriz de permissões, provada por
  teste negativo nos 9 perfis.

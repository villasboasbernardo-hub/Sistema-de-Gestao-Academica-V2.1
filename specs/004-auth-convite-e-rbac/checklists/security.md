# Checklist de qualidade dos requisitos de segurança: Épico 3

**Propósito**: testar se os **requisitos de segurança estão bem escritos** — completos, claros,
consistentes e mensuráveis. Não testa se o sistema funciona; isso é a suíte, e ela está verde.
**Criado**: 09/09/2026
**Feature**: [spec.md](../spec.md) · [documento 22](../../../docs/fase-2/22-Seguranca-RLS-e-Autenticacao.md) · [contrato de conferências](../contracts/conferencias-de-painel.md)
**Alcance**: spec 004 **e** os documentos normativos que ela consome. Os dois defeitos de requisito
encontrados em 09/09/2026 moravam no documento 22, não na spec.
**Momento**: nasceu como portão antes do merge do **PR #5**, que foi mesclado em 09/09/2026 antes
de a lista existir. Ela passa a valer como **portão dos próximos `FR-` de segurança** — Épicos 4 em
diante — e como registro do que ficou aberto no Épico 3.

> **Como ler cada item.** Todos são perguntas sobre **o que está escrito**. "Não" não significa que
> o sistema esteja errado — significa que o requisito não permite decidir se está.

## Completude — o requisito diz quem o impõe?

- [ ] CHK001 Todo requisito de segurança nomeia **onde a garantia vive** — banco, plataforma, servidor ou navegador? [Completude, Gap] ⚠️ Esta é a classe de defeito de 09/09/2026: o FR-006 exigia 12 caracteres sem dizer **quem** os exige, e o número acabou existindo só no `minLength` do formulário. 🔸 **Parcial em 09/09/2026:** o `FR-006` foi reescrito e passa a nomear mecanismo e ambiente de cada exigência — é o **modelo**. O item continua **aberto** porque os demais `FR-` de segurança ainda não foram passados por ele.
- [ ] CHK002 Está definido **quando** as migrations desta fatia devem alcançar o projeto remoto de preview? [Gap] ⚠️ O `SC-002` exige o percurso funcionando "ponta a ponta em preview", e nenhum requisito diz como o banco de preview chega lá. Hoje ele **não tem** as duas migrations.
- [ ] CHK003 Existe requisito de **paridade de configuração** entre o stack local, o preview e a futura produção? [Gap] ⚠️ Sem ele, "conferido no local" não sustenta nenhuma afirmação sobre produção.
- [ ] CHK004 O que acontece **ao atingir** o limite de tentativas está especificado — bloqueio, espera crescente, mensagem ao usuário? [Gap, Doc 22 §1.2 A-8] A ameaça nomeia a defesa e nunca descreve o efeito dela.
- [ ] CHK005 A duração da sessão e o tempo de inatividade estão quantificados em algum requisito? [Gap, Spec §FR-004] O FR-004 diz "renovando o token enquanto for válida" e nunca define válida.
- [ ] CHK006 As **12 colunas** de identificação civil e residência estão enumeradas em documento normativo, ou só na migration? [Completude, Spec §FR-028] Requisito que só é legível no SQL não é revisável por quem decide.
- [ ] CHK007 Está escrito o que deve acontecer quando o **provedor de e-mail falha** ou recusa o envio do convite? [Gap, Exceção, Premissa 3] A premissa 3 delega o envio à plataforma e para aí.

## Clareza e mensurabilidade — o critério pode reprovar?

- [ ] CHK008 O `SC-003.1` pode **falhar**? [Mensurabilidade, Spec §SC-003.1] Ele exige que o limite esteja "conferido e registrado". Registrar qualquer número satisfaz. Sem faixa aceitável declarada, o critério aprova qualquer configuração, inclusive uma ruim.
- [ ] CHK009 O `SC-003` é verificável no ambiente em que será cobrado? [Mensurabilidade, Spec §SC-003] A recusa de senha vazada depende do HaveIBeenPwned, que **não tem chave** no `config.toml` e só existe no painel remoto.
- [ ] CHK010 "Por fora da tela" está definido no `FR-030`? [Ambiguidade, Spec §FR-030] Interface de dados pública, `curl`, cliente de terceiro e Studio são casos diferentes, com defesas diferentes.
- [ ] CHK011 O `FR-005.2` delimita o que **não** é contagem própria? [Clareza, Spec §FR-005.2] Proibir contagem própria e ao mesmo tempo registrar falha de autenticação em log são coisas distintas, e o requisito não as separa.
- [ ] CHK012 O `FR-027.1` declara a exceção da `service_role`? [Clareza, Conflito, Spec §FR-027.1] Ele exige que **toda** escrita chegue com identidade autenticada, e o convite pelo Admin é feito com chave de serviço, por desenho.
- [ ] CHK013 "Detectável" tem prazo ou frequência no `FR-013`? [Mensurabilidade, Spec §FR-013] Detectável um ano depois também é detectável.

## Consistência entre a spec, o documento 22 e o contrato

- [x] CHK014 A defesa da ameaça **A-3** ainda diz "Pendência formal — §9"? [Conflito, Doc 22 §1.2] **REPROVOU e foi corrigido em 09/09/2026, autorizado por Bernardo.** A defesa agora cita a autorização da CIAARA-14.2 e o recorte do `FR-028`. ⚠️ **A mesma afirmação vencida aparecia numa quarta ocorrência** — o ponto 1 do §11 —, que também foi atualizado: emendar três e deixar a quarta manteria a contradição.
- [x] CHK015 O §9 ainda afirma ser "a única pendência capaz de bloquear a v2.1 por razão não técnica"? [Conflito, Doc 22 §9] **REPROVOU e foi corrigido em 09/09/2026.** A frase saiu da citação e da linha da tabela. O raciocínio da urgência **ficou registrado**, porque explica por que a decisão precisava vir antes do Épico 2 — e veio. ⚠️ O **título** da seção ainda diz *"pendência formal"*; não foi tocado por não estar na autorização.
- [x] CHK016 A lista de dado pessoal do §9 inclui **CPF, RG, telefone e endereço**? [Completude, Doc 22 §9] **REPROVOU e foi corrigido em 09/09/2026.** As **12 colunas** entraram nomeadas — CPF, RG e órgão emissor, telefone, RETELMA e o endereço em sete partes —, com a data da migração que as trouxe e a nota de que a restrição é por `grant` de coluna, não por RLS.
- [ ] CHK017 O mínimo de senha tem **fonte normativa única**? [Consistência, Doc 22 §4.5 · Spec §FR-006 · `config.toml`] Hoje o 12 está escrito em três lugares. Já divergiu uma vez, em silêncio.
- [ ] CHK018 A emenda de 09/09/2026 ao §3.4 foi aplicada **nos dois endereços** da constitution? [Consistência, CONST-1] A divergência silenciosa entre `docs/vibe-coding/40` e `.specify/memory/constitution.md` já aconteceu uma vez e está registrada no CLAUDE.md.
- [ ] CHK019 A tabela de dependências da spec ainda lista "auto-cadastro desligado no painel" como item de painel? [Consistência, Spec §Dependências] Depois da correção do contrato, ele é `config.toml` versionado no local e painel só no remoto.

## Cobertura de cenários — exceção, recuperação e reversão

- [ ] CHK020 Existe requisito para o que acontece se o **recorte de PII for revertido**? [Gap, Recuperação, Spec §FR-028] O plano de reversão está na migration e no PR. Nenhum requisito diz que a reversão exige nova decisão de autoridade, e ela devolve CPF e endereço a seis perfis.
- [ ] CHK021 A mensagem ao usuário quando o **último Admin** é bloqueado está especificada? [Gap, Exceção, Spec §FR-016] O requisito diz que o sistema impede. Não diz o que a pessoa lê.
- [ ] CHK022 Está previsto o caminho de recuperação quando **não há nenhum Admin ativo**? [Gap, Recuperação] O gatilho impede chegar lá pela aplicação. Se o estado existir por outra via, nenhum requisito descreve a saída.
- [ ] CHK023 A `Q3.c` — log de leitura de dado pessoal — tem **gatilho de reabertura** declarado? [Premissa, Spec §Perguntas em aberto] Ela está fora de escopo com motivo escrito, e sem nenhuma condição que a traga de volta ela some.

## Premissas e rastreabilidade

- [ ] CHK024 As afirmações sobre a plataforma trazem **data e medição**, ou são herdadas por repetição? [Premissa, Doc 22 §3.4] "Não há como garanti-lo por código" atravessou a Fase 2 inteira sem ninguém medir, e era falsa.
- [ ] CHK025 A soma dos perfis autorizados e negados a ler PII é conferida contra o `ENUM`? [Rastreabilidade, Spec §FR-028 e §FR-028.1] São 3 mais 6. O `ENUM` tem 9. Nenhum requisito exige que continuem somando quando um décimo perfil nascer.
- [ ] CHK026 Todo item de conferência humana nomeia **quem** confere e **com que periodicidade**? [Gap, Contrato] O contrato diz o que observar e onde registrar. Não diz de quem é a tarefa nem quando ela se repete.

## Notas

- Marque com `[x]` conforme fechar, e escreva o achado na própria linha.
- **Um item que reprova não é defeito do sistema.** É requisito que não permite decidir. A correção
  é escrever melhor o requisito, e só depois, se for o caso, mudar o código.
- Os itens **CHK014, CHK015 e CHK016** reprovaram já na redação desta lista, e **foram corrigidos
  em 09/09/2026 com autorização nominal de Bernardo** — as três eram afirmações vencidas sobre
  fatos decididos fora do documento 22: a autorização da CIAARA-14.2 de 08/09 e o recorte de PII
  que o Épico 3 implementou. **Nenhuma regra de negócio mudou**; mudou o que o documento afirma
  sobre o mundo.
- Os **23 itens restantes seguem abertos** e nenhum é bloqueante isolado. O de maior alcance é o
  **CHK001**: passar os demais `FR-` de segurança pelo modelo que o `FR-006` inaugurou.

# Aplicação no remoto — spec 033 (Bloco 18)

*Registro de 10/11/2026. Projeto `cqhpfuaweoyglhtrckcp` (Preview e Production, exceção do `FR-016.1` da spec 001).*

## 1. As duas migrations

| Passo | Resultado |
|---|---|
| CI do PR #113 | verde nos três blocos sobre `59632ae` (run `42581685433`) — e antes sobre `1760840` (run `42577178641`: 1.235 pgTAP, 510 RLS + 1 pulado, 642 de ponta a ponta + 2 instáveis + 7 pulados) |
| Reversão provada antes (banco local limpo) | 2.929 objetos (`da3197bf…`) → `reversao.sql` → **2.781 objetos, `315a6f87…`**, a impressão do remoto antes do bloco; com uma AEC prevista gravada, o bloco 0 recusa e o esquema não muda |
| Efeito zero remedido | sobre `remoto-20261110-201931.sql`, com as migrations corrigidas pela revisão: os dez objetos com o mesmo md5 antes e depois ([`medicao-efeito-zero.md`](medicao-efeito-zero.md), §Remedição) |
| Backup do rito | **`remoto-20261110-202159.sql`** — os mesmos dados da cópia medida (o `diff` dos dois retratos traz só as 4 linhas do token `\restrict` do `pg_dump`) |
| Dry-run | só `20261103140231` e `20261103140512` |
| `supabase db push --linked` | saída **0**, as duas na ordem |
| Migrations | **105 e 105**, nenhuma só de um lado |
| Impressão digital do esquema | **2.929 objetos, `da3197bf70beb6452d3cf4246cb79732`**, igual no local e no remoto |
| Efeito zero **no próprio remoto** | os dez objetos, valor a valor, iguais aos da medição |
| Conferências | colunas novas valem 0 em todas as linhas; as **6** views recriadas com `security_invoker=true`; **0** policies de `DELETE`; **19** tipos com categoria; o rótulo «Atividade Extraclasse»; `planejamento_de_atividades` para **3** perfis; **0** lançamentos com «Conta como»; **0** retratos publicados com «Atividade Extracurricular» |
| Production | `/login` 200; `/`, `/inicio`, `/atividades` e `/admin/tipos-de-atividade` 307 para o login, como antes |

## 2. A carga das AEC previstas (autorização nominal 6, 03/11/2026)

- **Backup antes:** `remoto-20261110-203845.sql`.
- **Ensaio** sobre a cópia de hoje, numa transação desfeita: 48 incluídas, 48 linhas de trilha, a segunda rodada 0.
- **No remoto:** `supabase db query --linked -f scripts/manutencao/carga_aec_previstas.sql`, saída 0.
- **Conferência só de leitura** (`conferir_aec_previstas.sql` e a trilha): **48** AEC previstas ativas em **8** currículos 1
  de 2026, **46** obrigatórias; **48** linhas `incluir` em `correcoes_de_curriculo`, autor `USR-ADMIN-001` (a sessão com
  que o script rodou — D-13), com a justificativa *«Carga inicial das AEC previstas do currículo (bloco de Atividades,
  conferida por Bernardo em 03/11/2026)»*. Item sem TA no currículo entrou com TA vazio («—»).

| Código | Curso | Ordem | Nome (grafia do PDF) | Tipo | TA | Disciplina |
|---|---|---|---|---|---|---|
| `AEP-000011` | C-Ap-FR | 1 | AMAZÔNIA AZUL (AMAZUL) | Palestra | 2 | — |
| `AEP-000012` | C-Ap-FR | 2 | PATRULHA NAVAL (PN) | Palestra | 2 | — |
| `AEP-000013` | C-Ap-FR | 3 | INTEGRAÇÃO DA MULHER E REGRAS DE CONDUTA E CONVIVÊNCIA (RCCM-MB) | Palestra | 2 | — |
| `AEP-000014` | C-Ap-FR | 4 | SEGURANÇA ORGÂNICA (SEGORG) | Palestra | 8 | — |
| `AEP-000015` | C-Ap-HN | 1 | AMAZÔNIA AZUL (AMAZUL) | Palestra | 2 | — |
| `AEP-000016` | C-Ap-HN | 2 | PATRULHA NAVAL (PN) | Palestra | 2 | — |
| `AEP-000017` | C-Ap-HN | 3 | INTEGRAÇÃO DA MULHER E REGRAS DE CONDUTA E CONVIVÊNCIA (RCCM-MB) | Palestra | 2 | — |
| `AEP-000018` | C-Ap-HN | 4 | SEGURANÇA ORGÂNICA (SEGORG) | Palestra | 8 | — |
| `AEP-000019` | C-Ap-HN | 5 | Visitas ao Serviço Meteorológico Marinho no Centro de Hidrografia da Marinha (2 visitas de 2 TA) | Visita Técnica | 4 | IV |
| `AEP-000020` | C-Espc-FR | 1 | SEGURANÇA ORGÂNICA | Palestra | 8 | — |
| `AEP-000021` | C-Espc-FR | 2 | DIREITO INTERNACIONAL DOS CONFLITOS ARMADOS | Palestra | 2 | — |
| `AEP-000022` | C-Espc-FR | 3 | SEGURANÇA DA INFORMAÇÃO E COMUNICAÇÕES | Palestra | 2 | — |
| `AEP-000023` | C-Espc-FR | 4 | PROGRAMA DE EXCELÊNCIA DE GESTÃO DA MARINHA - PROGRAMA NETUNO | Palestra | 3 | — |
| `AEP-000024` | C-Espc-FR | 5 | AMAZÔNIA AZUL | Palestra | 4 | — |
| `AEP-000025` | C-Espc-FR | 6 | EDUCAÇÃO AMBIENTAL | Palestra | 2 | — |
| `AEP-000026` | C-Espc-FR | 7 | EDUCAÇÃO FINANCEIRA 1 (início do curso) | Palestra | 2 | — |
| `AEP-000027` | C-Espc-FR | 8 | EDUCAÇÃO FINANCEIRA 2 (meio do ano) | Palestra | 2 | — |
| `AEP-000028` | C-Espc-FR | 9 | EDUCAÇÃO FINANCEIRA 3 (final do curso) | Palestra | 2 | — |
| `AEP-000029` | C-Espc-FR | 10 | PATRULHA NAVAL | Palestra | 2 | — |
| `AEP-000030` | C-Espc-FR | 11 | REGRAS DE CONDUTA E CONVIVÊNCIA ENTRE MILITARES DA MARINHA | Palestra | 2 | — |
| `AEP-000031` | C-Espc-HN | 1 | SEGURANÇA ORGÂNICA | Palestra | 8 | — |
| `AEP-000032` | C-Espc-HN | 2 | DIREITO INTERNACIONAL DOS CONFLITOS ARMADOS | Palestra | 2 | — |
| `AEP-000033` | C-Espc-HN | 3 | SEGURANÇA DA INFORMAÇÃO E COMUNICAÇÕES | Palestra | 2 | — |
| `AEP-000034` | C-Espc-HN | 4 | PROGRAMA DE EXCELÊNCIA DE GESTÃO DA MARINHA - PROGRAMA NETUNO | Palestra | 3 | — |
| `AEP-000035` | C-Espc-HN | 5 | AMAZÔNIA AZUL | Palestra | 4 | — |
| `AEP-000036` | C-Espc-HN | 6 | EDUCAÇÃO AMBIENTAL | Palestra | 2 | — |
| `AEP-000037` | C-Espc-HN | 7 | EDUCAÇÃO FINANCEIRA 1 (início do curso) | Palestra | 2 | — |
| `AEP-000038` | C-Espc-HN | 8 | EDUCAÇÃO FINANCEIRA 2 (meio do ano) | Palestra | 2 | — |
| `AEP-000039` | C-Espc-HN | 9 | EDUCAÇÃO FINANCEIRA 3 (final do curso) | Palestra | 2 | — |
| `AEP-000040` | C-Espc-HN | 10 | PATRULHA NAVAL | Palestra | 2 | — |
| `AEP-000041` | C-Espc-HN | 11 | REGRAS DE CONDUTA E CONVIVÊNCIA ENTRE MILITARES DA MARINHA | Palestra | 2 | — |
| `AEP-000042` | C-Espc-HN | 12 | APOIO LOGÍSTICO INTEGRADO E GESTÃO DO CICLO DE VIDA | Palestra | 2 | — |
| `AEP-000048` | C-Exp-Ag-Mag | 1 | Visita à oficina de Agulhas Magnéticas da Base de Hidrografia da Marinha em Niterói (BHMN) | Visita Técnica | — | II |
| `AEP-000043` | C-Exp-MetocOf | 1 | Visita à Divisão de Informações Oceanográficas do CHM (CH-11) | Visita Técnica | — | — |
| `AEP-000044` | C-Exp-MetocOf | 2 | Visita à Divisão de Sensoriamento Remoto do CHM (CH-14) | Visita Técnica | — | — |
| `AEP-000045` | C-Exp-MetocOf | 3 | Visita à Divisão do Banco Nacional de Dados Oceanográficos - BNDO do CHM (CH-22) | Visita Técnica | — | — |
| `AEP-000046` | C-Exp-Obs-ME | 1 | Visita à Divisão de Previsões Ambientais do CHM | Visita Técnica | — | — |
| `AEP-000047` | C-Exp-Obs-ME | 2 | Visita ao Departamento de Controle do Espaço Aéreo do Galeão (DTCEA-GL) | Visita Técnica | — | — |
| `AEP-000001` | CAHO | 1 | SEGURANÇA ORGÂNICA (SEGORG) | Palestra | 1 | — |
| `AEP-000002` | CAHO | 2 | AMAZÔNIA AZUL (AMAZUL) | Palestra | 4 | — |
| `AEP-000003` | CAHO | 3 | EDUCAÇÃO FINANCEIRA (EDFIN) | Palestra | 2 | — |
| `AEP-000004` | CAHO | 4 | ESTRATÉGIA NACIONAL DE DEFESA (END) | Palestra | 2 | — |
| `AEP-000005` | CAHO | 5 | Visita orientada ao Centro de Auxílios à Navegação Almirante Moraes Rego (CAMR) | Visita Técnica | 4 | VIII |
| `AEP-000006` | CAHO | 6 | Visitas ao CHM (UE 3 e 4: análise e carga dos dados nos bancos de dados) | Visita Técnica | 6 | XV |
| `AEP-000007` | CAHO | 7 | Visita à Divisão de Previsões Ambientais e à Divisão de Previsão Numérica (CH-12 e CH-13) | Visita Técnica | 2 | V |
| `AEP-000008` | CAHO | 8 | Visita à oficina de Agulhas Magnéticas da Base de Hidrografia da Marinha em Niterói (BHMN) | Visita Técnica | — | XII |
| `AEP-000009` | CAHO | 9 | Visita técnica à Raia Acústica em Arraial do Cabo (CASOP) | Visita Técnica | — | XIII |
| `AEP-000010` | CAHO | 10 | Visita ao Centro de Pesquisa da Eletrobrás (CEPEL) | Visita Técnica | — | VIII |

## 3. Os 24 PDFs dos currículos (autorização nominal 7, 03/11/2026)

- Pelo mesmo caminho da tela (*Editar curso → Currículo*): objeto `<curso>/<currículo>/<instante>.pdf` no balde
  `curriculos`, sem sobrescrever (`x-upsert: false`), e o currículo 1 apontado só onde não havia PDF.
- **Sem gravar, antes:** 24 a carregar (nenhum currículo do remoto tinha PDF). **Gravado:** 24 objetos e 24 currículos.
  **Depois, sem gravar:** 0 a carregar.
- **Conferência:** **24** objetos no balde, **24** currículos com PDF, todos com o objeto existente, todos no currículo 1,
  nenhum curso com dois. Baixados por link assinado — o mesmo que o *Baixar PDF* entrega —, **CAHO**, **C-Espc-HN** e
  **EST-QF-APOC** têm o **mesmo md5** do arquivo de origem. ⚠️ O clique em *Baixar PDF* na tela, com sessão, é da
  conferência de Bernardo (roteiro, §7).

| Curso | Arquivo | Bytes | md5 |
|---|---|---|---|
| CAHO | `2.-of-10-6-2025-densm-ciaara-ana-caho-512.2.01.pdf` | 432.891 | `80c1024610bfbc826224138d1c44cba9` |
| C-ApA-AuxNav-PR-SP | `2._of-10-26-2022-densm-ciaara-an-c-apa-aux-nav-sp_0_0.pdf` | 234.186 | `adc767eda204a45247034a83a2f666ad` |
| C-ApA-PCN-PR-EAD | `2._of-10-31-densm-ciaara-an-capa-pcn-pr-ead_2.pdf` | 180.386 | `cf9214412b8a59bece597939b5b5947f` |
| C-Ap-FR | `4.-of-10-6-2025-densm-ciaara-anc-c-ap-fr.pdf` | 351.618 | `a656930fd6796835b0e170982574711e` |
| C-Ap-HN | `c-ap-hn.pdf` | 354.887 | `4e42092628352fc1ca7b4d5c147674cd` |
| C-Esp-ALH | `c-esp-alh.pdf` | 449.860 | `4fb7e04c6a4296904fb3062ab76353f5` |
| C-Esp-ME | `c-esp-me.pdf` | 237.765 | `5a81bdbcf0d9549815181241e12eae35` |
| C-Esp-OpAP | `c-esp-opap.pdf` | 121.372 | `3a23bacd6738c5b04e5743a4b5de7f15` |
| C-Exp-Ag-Mag | `c-exp-agmag.pdf` | 103.938 | `cd8dfdfa5dd74df6e3e467a64802c575` |
| C-Exp-BATI | `c-exp-bati.pdf` | 178.186 | `7b9c41fd5198045ae5bdc27c72b07ec9` |
| C-Exp-MetocOf | `c-exp-metocof_0.pdf` | 92.729 | `a3ed4ba9534590a071fe39f51d9cfc94` |
| C-Exp-Obs-ME | `c-exp-obs-me_0_0.pdf` | 63.509 | `23e45b2f619f5c2fa688f6e394dca4a1` |
| EST-QF-APHID | `curriculo-ciaara-est-qf-aphid_presencial_mod2.pdf` | 197.119 | `87d3484775c6f37b1bad1df9d4f3510f` |
| EST-QF-EM2040PHS | `curriculo-ciaara-est-qf-em2040phs.pdf` | 304.463 | `66faa39d01e1dfffc04d8be416c2b709` |
| EST-QF-PROC-MF-EAD | `curriculo-ciaara-est-qf-proc-mf-ead_mod3.pdf` | 182.010 | `35c452fed04177630810965fa9112c13` |
| EST-QF-MAREFLU | `est-qf-mareflu.pdf` | 349.645 | `d536d6371eafd9c242c45f41eddbe16c` |
| EST-QF-NAVFLU-EAD | `est-qf-navflu-ead.pdf` | 366.823 | `43e0a0521f34b5db4b88a5c36a336683` |
| EST-QF-PGRS100 | `est-qf-pgrs100.pdf` | 487.492 | `bd8b89d473362ee4e3e7a75edf7b0b26` |
| EST-QF-APOC | `marinha_do_brasil_-_curriculo-do-est-qf-apoc.pdf` | 1.896.287 | `31ec727cf3c53aaa9dd6becf6dad9db5` |
| C-ApA-OcOp-PR-SP | `of-10-16-2023-densm-ciaara-an-c-apa-ocop-pr-sp.pdf` | 203.046 | `ca93fc503e68f29e16a929f546d85c7d` |
| C-Exp-Metoc-OF-SP | `of-10-16-2025-densm-ciaara-an-c-exp-metoc-sp-512.2.01.pdf` | 345.554 | `20b1cf44c2862d74340624a2c6fded2f` |
| C-ApA-PrevMe-PR-EAD | `of-10-27-2022-densm-ciaara-an-c-apa-prevme-pr-ead_0_0.pdf` | 314.267 | `2cef76c239c7e8a9b7dd8284823c8965` |
| C-Espc-FR | `of10-82-2024-densm-ana-c-espc-fr.pdf` | 3.759.868 | `068f3363eebb45c191915fa974ab2984` |
| C-Espc-HN | `of10-82-2024-densm-anb-c-espc-hn.pdf` | 3.852.224 | `96acec4908f3e4bc6aa1e4b54d83b179` |

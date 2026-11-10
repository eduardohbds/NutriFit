# Backlog

<!--
Fontes: Especificação de Requisitos: App de Treino com IA (rev. 32) e Arquitetura: App de Treino com IA (4 nov. 2026).
Ordem dos épicos: segue a seção 26 da especificação (BL01 a BL06 são P1) e, depois, prioriza o que reduz riscos altos da seção 24 (RK01 a RK05).
Códigos entre parênteses (RF, RB, CC, TE, CR, CE, SEG, VE, RNF, SP, RT) apontam para a especificação ou para a arquitetura e devem ser mantidos nos testes.
Spikes (SP01 a SP05, seção 15 da arquitetura) aparecem antes da história que dependem deles. Spike é código descartável numa branch própria; a resposta vai para as notas de domínio do AGENTS.md.
Falhas inaceitáveis: FI-1 a FI-6 seguem a ordem da tabela da seção 2 do AGENTS.md. Toda história que toca uma delas exige parar e chamar o usuário antes de mudar a regra (AGENTS.md, seção 6).
  FI-1 Perder uma série já concluída
  FI-2 Mostrar número errado em séries válidas, 1RM, recordes ou composição corporal
  FI-3 IA alterar a ficha além do pedido ou mexer em exercício travado
  FI-4 Apagar ou alterar versão de ficha, sessão registrada ou histórico
  FI-5 Importação ou restauração substituir ou corromper dados sem o usuário saber
  FI-6 Dado de saúde ou credencial sair do aparelho sem o usuário saber
Cada história é executada pela skill historia e fecha em um commit. Mensagens de erro na tela dizem o valor recebido e o formato esperado; o registro de falhas guarda só campo e regra (AGENTS.md, seção 5).
-->

## Épico E-01: Fundação de dados (BL01, BL02, BL03 · P1)
Objetivo: o app guarda fichas, sessões e medidas em um modelo versionado, que migra sem perda entre versões do app, preserva o histórico imutável e registra falhas sem expor dados pessoais.

### SP01: Esqueleto Expo, SQLite, Drizzle e login Google em APK de release
- Status: aceita (2026-11-10). APK de release assinado pelo GitHub Actions instalado no aparelho; gravação no SQLite e login Google funcionaram. Não verificado no spike: sobrevivência da série a fechamento forçado (fica para a US-001, RNF08) e conferência explícita do `journal_mode` na tela. Código na branch spike/esqueleto, que não entra na main.
- Tipo: spike (código descartável em branch própria), antes da US-001
- Pergunta: o esqueleto React Native com Expo, TypeScript, SQLite via Drizzle e login Google funciona num APK de release assinado no Poco M5s com MIUI 14?
- Critério de saída: APK de release instalado no Poco M5s, uma migração aplicada na abertura, login Google concluído e versões de Expo, Drizzle e módulos nativos fixadas.
- Saída esperada: versões fixadas e problemas encontrados registrados nas notas de domínio do AGENTS.md; a implementação volta pela US-001 com TDD.
- Riscos tratados: RT06 (atualização do Expo quebrar módulos nativos).

### US-041: Pipeline de CI e build do APK assinado (quebrada em US-041a, US-041b e US-041c)
A história original não cabia num commit: a main não tinha app (o código do SP01 não entra nela) e o pipeline exige esqueleto, ferramentas de qualidade e dois workflows. Os seis critérios originais estão distribuídos abaixo. Contexto comum: o AGENTS.md exige CI completo verde antes de todo commit e define "deploy" como tag de versão do APK; sem esse pipeline, nenhuma outra história consegue cumprir o checklist (AGENTS.md, seções 4, 7 e 9).

### US-041a: Esqueleto do projeto com testes rodando
- Status: aceita
- Contexto: a main não tem app; as demais histórias precisam de um projeto Expo com as versões fixadas no SP01 e de um runner de testes.
- Critérios de aceite (cada um vira um teste):
  - Dado o projeto recém-clonado, quando `npm ci` e `npm test` rodam em app/, então os testes passam sem interação nem rede.
  - Dado o app/package.json, quando inspecionado, então as versões de Expo, React Native, expo-sqlite, Drizzle e Google Sign-In são exatamente as fixadas no AGENTS.md, seção 11.
  - Dado o app.config, quando lido, então o pacote Android é `com.ehbds.nutrifit` (ou `.dev` com APP_VARIANT=dev) e o nome é "NutriFit" (ou "NutriFit (dev)").
  - Dado o repositório, quando inspecionado, então existem as pastas de camadas de app/src (dominio, aplicacao, adaptadores, interface, composicao) e as rotas ficam em app/app/.
- Fora do escopo: Prettier, ESLint, boundaries, gitleaks, workflows, banco, login Google.
- Falha inaceitável envolvida: nenhuma.
- Notas de domínio: dependências novas aprovadas: jest, jest-expo, @testing-library/react-native.

### US-041b: `npm run ci` local com camadas e segredos
- Status: a fazer
- Contexto: ver US-041. Depende da US-041a.
- Critérios de aceite (cada um vira um teste):
  - Dado o repositório, quando `npm run ci` roda, então executa formatação, lint, checagem de tipos, regra de camadas, testes, `npm audit` sem vulnerabilidade alta e gitleaks, e falha se qualquer etapa falhar.
  - Dado um arquivo em app/src/dominio que importa React, Expo, Drizzle ou um adaptador, quando o CI roda, então o eslint-plugin-boundaries reprova o commit (RT03).
  - Dado um segredo de teste falso commitado, quando o CI roda, então o gitleaks reprova.
  - Dado o código do app, quando inspecionado, então nenhuma variável EXPO_PUBLIC_ contém segredo.
- Fora do escopo: workflows do GitHub; publicação na Play Store.
- Falha inaceitável envolvida: FI-6 (dado de saúde ou credencial saindo sem o usuário saber).
- Notas de domínio: dependências novas aprovadas: prettier, eslint, eslint-plugin-boundaries; gitleaks é binário. CodeQL é pago em repositório privado, por isso a análise de segurança do MVP fica com regras de segurança do ESLint, auditoria de dependências e gitleaks.

### US-041c: Workflows do GitHub Actions e APK assinado
- Status: a fazer
- Contexto: ver US-041. Depende da US-041b.
- Critérios de aceite (cada um vira um teste):
  - Dado um push ou pull request, quando o GitHub Actions roda, então executa o mesmo `npm run ci`.
  - Dada uma tag de versão, quando o GitHub Actions roda, então gera o APK de release assinado com a chave dos segredos ANDROID_KEYSTORE_* como artefato, sem imprimir nenhum segredo no log.
- Fora do escopo: publicação na Play Store; deploy do Worker (US-032).
- Falha inaceitável envolvida: FI-6 (dado de saúde ou credencial saindo sem o usuário saber).
- Notas de domínio: partir do workflow do SP01 (branch spike/esqueleto); o escopo `workflow` do token é necessário (AGENTS.md, seção 10).

#### Notas da US-041 original
- Depende do SP01 (versões fixadas). A chave de assinatura fica guardada em dois lugares para não perder a possibilidade de atualizar o app (RT01). CodeQL é pago em repositório privado, por isso a análise de segurança do MVP fica com regras de segurança do ESLint, auditoria de dependências e gitleaks.

### US-001: Modelo de dados versionado com migração sem perda
- Status: a fazer
- Contexto: tudo o que vem depois grava dados neste modelo, e uma atualização que perde dados destrói a confiança no histórico, que é o núcleo do produto (RNF13, RNF32).
- Critérios de aceite (cada um vira um teste):
  - Dado um aparelho com dados gravados pela versão anterior do modelo, quando o app atualizado abre, então todas as fichas, versões, sessões, séries e medidas continuam presentes com os mesmos valores (CE63).
  - Dado que a migração falha no meio, quando o app abre, então os dados anteriores ficam intactos e o usuário é informado (CE63).
  - Dado que o app grava uma série, quando o processo é encerrado logo após a confirmação, então a série está presente na reabertura (RNF08).
  - Dado que falta espaço no aparelho ao gravar, quando o usuário confirma, então nada é gravado pela metade, o que foi digitado permanece na tela e é possível tentar de novo (CE61).
  - Dada uma migração, quando ela começa, então o app copia o arquivo do banco para uma pasta interna e só apaga a cópia depois que os totais de séries e sessões batem; se algo falhar, volta à cópia e registra a falha (arquitetura 7.3).
  - Dada uma carga de 22,5 kg, quando ela é convertida para libras e de volta várias vezes, então o valor gravado continua exatamente 22 500 g e nenhum recorde aparece ou some (arquitetura 7.1).
  - Dados registros criados no aparelho, quando são gravados, então recebem identificador UUID v7 e datas em ISO 8601 UTC.
- Fora do escopo: backup externo (E-07), telas de uso.
- Falha inaceitável envolvida: FI-1 (perder série concluída); FI-2 (número errado); FI-4 (apagar ou alterar versão, sessão ou histórico).
- Notas de domínio: SQLite com Drizzle, em modo WAL com sincronização completa; cada série concluída é gravada numa transação própria antes de qualquer chamada de rede. Carga é guardada em gramas inteiros e circunferências em milímetros inteiros; conversão só na exibição. Datas ficam em UTC no banco e o fuso do aparelho só entra na exibição e no cálculo da semana (segunda a domingo, RB16). Esquema versionado pelo drizzle-kit, uma migração SQL por mudança, e cada migração ganha um teste que parte de um banco da versão anterior com dados de exemplo. Vínculos obrigatórios: série executada pertence a um exercício da sessão, que pertence a uma sessão; série planejada pertence a um item, que pertence a uma rotina, que pertence a uma versão da ficha (seção 18.6). Dois ajustes ao modelo vindos da arquitetura (7.2): Etapa de drop-set como filha de Série executada, e Sessão aceitando ficha e versão vazias (treino livre).

### US-002: Regras de integridade e histórico que não muda
- Status: a fazer
- Contexto: versões da ficha, sessões presas à versão e ações da IA são a base do desfazer e da comparação antes e depois; se o histórico puder ser reescrito, o produto perde a rastreabilidade prometida (RB02, RB03, RB04).
- Critérios de aceite (cada um vira um teste):
  - Dada uma ficha com versões, quando qualquer alteração é salva, então uma nova versão é criada e nenhuma versão anterior é alterada ou apagada (RB02).
  - Dada uma sessão registrada com a versão 2 da ficha, quando a ficha passa para a versão 3, então a sessão continua apontando para a versão 2 (RB04).
  - Dada uma ficha com sessões ou um exercício com histórico, quando o usuário tenta excluir, então só a opção de arquivar está disponível (seção 18.6).
  - Dada uma ação da IA registrada, quando ela é desfeita, então o único campo que muda é a marca de desfeita.
  - Dado que valores derivados (classificação, contagens, recordes, 1RM, composição) são pedidos, quando uma série é corrigida, então os valores exibidos refletem a correção sem que nenhum valor derivado tenha sido gravado (seção 18.6).
- Fora do escopo: telas de versões e de desfazer (US-010).
- Falha inaceitável envolvida: FI-4 (apagar ou alterar versão, sessão ou histórico).
- Notas de domínio: tabelas de versão, rotina, item e série planejada só recebem inserção, e o repositório não expõe atualização nem exclusão; a exclusão física só existe em ApagarTudo. Importação, ação da IA e restauração passam pela porta UnidadeDeTrabalho, numa transação única (RNF09). Valores calculados nunca são gravados, sempre recalculados: classificação da série, séries válidas por grupo e semana, recordes, carga máxima, 1RM, RCE, percentual de gordura, massas, duração da sessão e proporção de ações da IA desfeitas.

### US-003: Registro local de falhas sem dados pessoais
- Status: a fazer
- Contexto: como só o autor testa o app (RK11), o registro local é o que permite diagnosticar erros reais sem vazar dados de saúde (RNF36, SEG13).
- Critérios de aceite (cada um vira um teste):
  - Dado um erro inesperado, quando ele ocorre, então o app mostra mensagem simples com opção de tentar de novo e cria um registro de falha (CE62).
  - Dados os testes de falha provocada, quando os registros são inspecionados, então não contêm credenciais, texto de comandos à IA, valores de medidas nem conteúdo de fichas e sessões (SEG13).
  - Dada uma falha de importação, backup, restauração ou IA, quando registrada, então o evento é um JSON com os campos quando, nivel, onde, codigo, campo, esperado e versaoApp, e nunca o valor recebido.
  - Dado o app, quando inspecionado, então nenhum registro de falha é enviado a terceiros (RES12).
  - Dado um erro inesperado, quando o app se recupera, então os dados já gravados estão preservados (CE62).
- Fora do escopo: envio de registros para fora do aparelho.
- Falha inaceitável envolvida: FI-6 (dado de saúde ou credencial saindo sem o usuário saber).
- Notas de domínio: o registro serve para diagnóstico do próprio usuário, que é o único dono dos dados (RB41).

## Épico E-02: Catálogo de exercícios (BL04 · P1)
Objetivo: o usuário tem um catálogo com os grupos musculares de cada exercício, para que fichas, importação e contagem de séries válidas funcionem sem duplicar exercícios.

### US-004: Catálogo inicial com grupos musculares
- Status: a fazer
- Contexto: a contagem por grupo depende de cada exercício ter grupos diretos e indiretos corretos (RB14, RF08).
- Critérios de aceite (cada um vira um teste):
  - Dado o primeiro uso, quando o catálogo é aberto, então os exercícios comuns da seção 18.4 aparecem com grupos diretos e indiretos já definidos.
  - Dado o catálogo inicial, quando os 30 itens da ficha de referência (DT01) são procurados, então todos existem ou têm equivalente (SL04, RF08).
  - Dado um exercício, quando o usuário edita os grupos, então só pode escolher entre os 16 grupos fixos da seção 18.3 e não consegue marcar um grupo como direto e indireto ao mesmo tempo.
- Fora do escopo: criar exercícios próprios (US-005), mesclar (US-006).
- Falha inaceitável envolvida: FI-2 (número errado); grupos errados distorcem as contagens.
- Notas de domínio: os 16 grupos são Peitoral, Costas, Trapézio, Ombro anterior, Ombro lateral, Ombro posterior, Bíceps, Tríceps, Antebraço, Abdômen, Lombar, Quadríceps, Posterior de coxa, Glúteos, Adutores e Panturrilha. Exemplo de referência: supino reto tem peitoral direto e tríceps e ombro anterior indiretos; remada curvada tem costas direto e bíceps indireto.

### US-005: Criar e editar exercícios com sinônimos
- Status: a fazer
- Contexto: fichas reais usam nomes variados, e sinônimos evitam duplicação na importação (RB35, RF08).
- Critérios de aceite (cada um vira um teste):
  - Dado o catálogo, quando o usuário cria um exercício com grupo direto costas e indireto bíceps, então ele fica disponível na ficha.
  - Dado o exercício "Rosca de Punho Inversa", quando o usuário cadastra "Reverse Wrist Curl" como sinônimo, então a busca por qualquer dos dois nomes encontra o mesmo exercício.
  - Dado um nome igual ou parecido com um existente, quando o usuário cria o exercício, então o app avisa e sugere associar ao existente.
  - Dado um exercício com histórico, quando o usuário tenta excluí-lo, então só o arquivamento é oferecido.
  - Dado um exercício com histórico, quando seus grupos são alterados, então as contagens das semanas passadas são recalculadas sem alterar séries registradas.
- Fora do escopo: mesclar duplicados (US-006).
- Falha inaceitável envolvida: FI-2 (número errado); FI-4 (apagar ou alterar versão, sessão ou histórico).
- Notas de domínio: campos do exercício: nome, grupos diretos e indiretos, unilateral (sim ou não), equipamento necessário opcional e sinônimos.

### US-006: Mesclar exercícios duplicados
- Status: a fazer
- Contexto: duplicatas criadas por engano dividem o histórico e escondem recordes (RF08).
- Critérios de aceite (cada um vira um teste):
  - Dados dois exercícios duplicados com sessões em ambos, quando o usuário os mescla, então todo o histórico passa para o exercício mantido e a contagem total de séries não muda.
  - Dados recordes nos dois exercícios, quando são mesclados, então os recordes exibidos são os do histórico combinado.
- Fora do escopo: mesclagem automática sem ação do usuário.
- Falha inaceitável envolvida: FI-4 (apagar ou alterar versão, sessão ou histórico).
- Notas de domínio: o nome do exercício descartado deve virar sinônimo do mantido, para não reaparecer como novo na próxima importação.

## Épico E-03: Fichas, versões e travas (BL05 · P1)
Objetivo: o usuário monta e edita fichas com todos os detalhes por série, consulta e restaura versões e protege exercícios contra alteração da IA.

### US-007: Criar e editar ficha com rotinas
- Status: a fazer
- Contexto: a ficha é o plano que o registro de treino executa; sem ela o app não tem uso na academia (RF05, RB01).
- Critérios de aceite (cada um vira um teste):
  - Dada uma ficha nova, quando o usuário define rotinas por dia da semana ou por rotação (Treino A, B, C), então todas as rotinas da ficha usam o mesmo tipo e misturar os dois bloqueia o salvamento (RB01).
  - Dada uma rotina, quando o usuário adiciona exercício do catálogo com ordem, séries, meta, carga, técnica, descanso, unilateral, grupo e observações, então os dados são salvos como uma nova versão com autor usuário, data e motivo opcional (RB02).
  - Dada a ficha de referência (DT01), quando é recriada manualmente, então as 30 linhas ficam registradas.
  - Dado um exercício sem séries ou com meta inválida, quando o usuário salva, então o salvamento é bloqueado com a linha indicada.
- Fora do escopo: listas por série e grupos em sequência (US-008), versões (US-010).
- Falha inaceitável envolvida: FI-4 (apagar ou alterar versão, sessão ou histórico).
- Notas de domínio: meta aceita repetições (10), faixa (8-12), falha ou tempo (60s, 30min). Carga vazia significa peso corporal ou carga a definir. Técnicas aceitas: aquecimento, drop-set, rest-pause, repetições parciais, negativa, isometria, cluster ou "-". O registro das etapas do drop-set está na US-039 (SL16 resolvida).

### US-008: Técnica, descanso e meta por série, e grupos em sequência
- Status: a fazer
- Contexto: o usuário pediu técnica e descanso por série, e bi-set, tri-set e circuito precisam ser representados sem colunas extras (RB06, RB07).
- Critérios de aceite (cada um vira um teste):
  - Dado um exercício de 4 séries, quando o descanso é "90/90/90/120", então é aceito com 120 segundos na última série.
  - Dado um exercício de 3 séries, quando o descanso é "90/90/90/120", então o salvamento é bloqueado indicando a linha (RF05).
  - Dado um exercício de 4 séries, quando a técnica é "aquecimento/-/-/-", então a primeira série fica como aquecimento e as outras três como trabalho.
  - Dados exercícios consecutivos com a mesma letra na coluna Grupo, quando a rotina é exibida, então eles aparecem como executados em sequência, e descanso 0 leva direto ao seguinte (RB07).
- Fora do escopo: execução desses grupos na tela de treino (E-04).
- Falha inaceitável envolvida: nenhuma direta.
- Notas de domínio: um valor único vale para todas as séries; lista separada por barra exige exatamente um valor por série (seção 11.3). Descanso aceita segundos (90) ou minutos e segundos (1:30).

### US-009: Ativar, duplicar e arquivar fichas
- Status: a fazer
- Contexto: o treino do dia depende de haver uma ficha ativa, e fichas antigas precisam sair das escolhas sem perder as sessões (RF05).
- Critérios de aceite (cada um vira um teste):
  - Dadas duas fichas, quando o usuário marca uma como ativa, então a outra deixa de ser ativa (SL09).
  - Dada uma ficha, quando o usuário a duplica, então surge uma ficha nova com conteúdo idêntico e histórico de versões próprio.
  - Dada uma ficha com sessões, quando é arquivada, então some das escolhas e suas sessões continuam no histórico.
- Fora do escopo: exclusão definitiva de fichas com sessões (proibida).
- Falha inaceitável envolvida: FI-4 (apagar ou alterar versão, sessão ou histórico).
- Notas de domínio: SL09 (uma ficha ativa por vez) é proposta a confirmar com o usuário.

### US-010: Consultar versões e desfazer
- Status: a fazer
- Contexto: mudanças reversíveis são um dos pilares do produto, e o desfazer é a rede de segurança das alterações da IA (RF06, RB03).
- Critérios de aceite (cada um vira um teste):
  - Dada uma ficha criada e editada 3 vezes, quando o usuário abre o histórico, então vê 4 versões com autor (usuário, IA ou importação), data, motivo e resumo da diferença.
  - Dadas as versões 1 a 4, quando o usuário restaura a versão 2, então é criada a versão 5 idêntica à 2 e as versões 1 a 4 continuam existindo.
  - Dadas duas versões, quando o usuário as compara, então as linhas alteradas aparecem destacadas lado a lado.
  - Dada uma ficha com uma única versão, quando o histórico é aberto, então a restauração não é oferecida.
- Fora do escopo: marca de desfeita no histórico da IA (US-037).
- Falha inaceitável envolvida: FI-4 (apagar ou alterar versão, sessão ou histórico).
- Notas de domínio: desfazer nunca apaga; sempre cria versão nova com o conteúdo escolhido (FL04).

### US-011: Travar exercícios contra a IA
- Status: a fazer
- Contexto: o usuário precisa proteger o que já funciona antes de dar comandos amplos à IA (RF07, RB05).
- Critérios de aceite (cada um vira um teste):
  - Dado um exercício na ficha, quando o usuário o trava, então aparece um indicador visível na linha.
  - Dado um exercício travado, quando o próprio usuário o edita, então a edição é permitida e gera versão.
  - Dado um exercício travado, quando o contexto de um comando de IA é montado, então a trava está incluída (verificado de ponta a ponta em US-034).
- Fora do escopo: comportamento da IA diante da trava (US-034).
- Falha inaceitável envolvida: FI-3 (IA além do pedido ou em exercício travado).
- Notas de domínio: a trava cobre séries, meta, carga, técnica, descanso, posição e remoção, mas só contra a IA.

## Épico E-04: Registro de treino (BL06 · P1)
Objetivo: na academia, com uma mão e sem internet, o usuário executa a ficha do dia, registra cada série em até 10 segundos e vê o resumo da sessão.

### US-012: Escolher o treino do dia
- Status: a fazer
- Contexto: abrir o app e já ver o treino de hoje elimina procura entre séries (RF01).
- Critérios de aceite (cada um vira um teste):
  - Dada uma ficha com rotinas de segunda a sexta e hoje sendo quarta, quando o app abre, então a rotina de quarta aparece sem toque adicional.
  - Dada uma rotação A, B, C com última sessão B, quando o app abre, então aparece C; depois de C, aparece A.
  - Dado o treino sugerido, quando o usuário escolhe outra rotina, então nenhuma versão da ficha é criada.
  - Dado um dia sem rotina, quando o app abre, então mostra aviso e lista as rotinas para escolha (CE01).
  - Dada a ausência de ficha ativa, quando o app abre, então oferece criar, importar, pedir à IA ou iniciar treino livre (CE02, ajustada pela SL18).
  - Dado um RelogioFixo em uma quarta-feira, quando o caso de uso EscolherTreinoDoDia roda, então o resultado é determinístico, sem depender do relógio do sistema.
- Fora do escopo: treino livre sem ficha (US-040).
- Falha inaceitável envolvida: nenhuma direta.
- Notas de domínio: a rotação avança a partir da última sessão concluída, não do calendário.

### US-013: Registrar uma série
- Status: a fazer
- Contexto: o registro de cada série com carga, repetições e RIR é a base de todas as métricas e da IA (RF02, RB08 a RB10).
- Critérios de aceite (cada um vira um teste):
  - Dado o celular em modo avião, quando o usuário registra uma série de trabalho, então leva até 10 segundos e a série é salva em até 1 segundo (TE01, RNF01).
  - Dada uma série de trabalho por repetições sem RIR, quando o usuário tenta concluir, então a conclusão é bloqueada e o campo é destacado (RB09).
  - Dada uma série com meta "falha", quando é exibida, então vem com RIR 0.
  - Dada uma série de aquecimento, por tempo ou de cardio, quando é concluída, então não pede RIR (RB11).
  - Dado um exercício já feito antes, quando a série é exibida, então vem preenchida com os valores da última sessão do mesmo exercício; sem histórico, com os da ficha.
  - Dado um valor negativo ou não numérico, quando o usuário confirma, então é rejeitado com mensagem que diz o valor recebido e o formato esperado.
  - Dado o RIR, quando o objeto de valor é construído com algo fora de 0 a 5, então não se constrói (AGENTS.md, seção 5).
  - Dada uma série concluída, quando a próxima é exibida, então o descanso planejado aparece como referência, sem cronômetro.
- Fora do escopo: cronômetro de descanso (descartado pelo usuário).
- Falha inaceitável envolvida: FI-1 (perder série concluída).
- Notas de domínio: RIR é inteiro de 0 a 5, em que 5 significa cinco ou mais. Em série unilateral, carga e repetições valem para cada lado e a série conta uma vez (RB19). Cada série guarda data e hora reais.

### US-014: Ajustar a sessão em andamento
- Status: a fazer
- Contexto: aparelho ocupado e imprevistos exigem desviar da ficha sem bagunçar o plano (RF03).
- Critérios de aceite (cada um vira um teste):
  - Dada uma sessão, quando o usuário troca um exercício, então o novo herda a posição e as séries planejadas do original e a ficha não ganha versão.
  - Dada uma sessão, quando o usuário pula um exercício, então ele fica marcado como pulado e não entra em nenhuma contagem.
  - Dada uma série adicionada além do planejado, quando é concluída, então entra nas contagens como qualquer outra.
  - Dada uma série já concluída, quando o usuário pede para removê-la, então o app pede confirmação.
  - Dada uma sessão já registrada, quando uma série é corrigida ou removida no histórico, então as contagens são recalculadas.
- Fora do escopo: alterar a ficha a partir da sessão.
- Falha inaceitável envolvida: FI-4 (apagar ou alterar versão, sessão ou histórico); a sessão nunca altera a ficha.
- Notas de domínio: se a ficha for editada durante a sessão, a sessão continua com a versão em que começou (CE05).

### US-015: Finalizar a sessão e ver o resumo
- Status: a fazer
- Contexto: o resumo fecha o ciclo do treino e dispara o backup (RF04, RB40).
- Critérios de aceite (cada um vira um teste):
  - Dada uma sessão com séries de trabalho sem RIR, quando o usuário finaliza, então o app pede o preenchimento antes de concluir.
  - Dada uma sessão completa, quando é finalizada, então o resumo lista as séries válidas por grupo muscular e os recordes batidos, com data e duração.
  - Dada uma sessão com exercícios previstos sem série feita, quando é finalizada, então fica marcada como parcial (CE07).
  - Dada uma sessão sem nenhuma série, quando o usuário finaliza, então o app pergunta se deve descartá-la, e a descartada não aparece no histórico (CE08).
  - Dada conexão disponível, quando a sessão é concluída, então o backup inicia (depende de E-07).
- Fora do escopo: o processo de backup em si (US-022).
- Falha inaceitável envolvida: FI-1 (perder série concluída); FI-2 (número errado).
- Notas de domínio: estados finais da sessão são concluída, parcial e descartada (seção 18.5). Uma sessão que passa da meia-noite pertence ao dia em que começou, mas cada série conta na semana em que foi concluída (CE06).

### US-016: Sessão interrompida e retomada
- Status: a fazer
- Contexto: perder uma série por fechamento forçado ou bateria é o risco mais alto do produto (RK01, RNF08).
- Critérios de aceite (cada um vira um teste):
  - Dadas 5 séries concluídas, quando o app é fechado à força, então as 5 séries estão preservadas na reabertura; repetido 20 vezes sem falha (TE02).
  - Dada uma sessão iniciada e não finalizada, quando o app reabre, então oferece retomá-la ou finalizá-la (CE03).
  - Dada uma série em preenchimento e não concluída, quando o app fecha, então ela não é guardada e as concluídas permanecem (CE04).
- Fora do escopo: finalização automática de sessões esquecidas.
- Falha inaceitável envolvida: FI-1 (perder série concluída).
- Notas de domínio: uma sessão só termina quando o usuário finaliza; fechar o app a deixa em andamento. A MIUI do Poco M5s encerra processos em segundo plano de forma agressiva (RT02), por isso cada série concluída precisa estar gravada antes de qualquer outra ação.

### US-039: Registrar drop-set por etapas
- Status: a fazer
- Contexto: o usuário decidiu que cada etapa do drop-set registra a própria carga e repetições (SL16, arquitetura 7.2), e isso muda contagens, recordes e 1RM.
- Critérios de aceite (cada um vira um teste):
  - Dada uma série com técnica drop-set, quando o usuário registra três etapas (por exemplo 60 kg x 10, 45 kg x 8, 30 kg x 6), então as três ficam gravadas na ordem, cada uma com carga e repetições.
  - Dada uma série de drop-set com três etapas, quando as séries válidas são contadas, então ela conta uma única vez.
  - Dada uma série de drop-set, quando o RIR é pedido, então é informado uma vez e vale como o RIR da última etapa.
  - Dada uma série de drop-set de 60 kg x 10 na primeira etapa e RIR 0, quando o 1RM e os recordes são calculados, então usam só a primeira etapa (1RM pela fórmula com n = 10) e ignoram as seguintes.
  - Dada uma etapa, quando o usuário a corrige ou remove no histórico, então as contagens e recordes são recalculados.
- Fora do escopo: rest-pause e cluster por etapas (continuam como série única).
- Falha inaceitável envolvida: FI-1 (perder série concluída); FI-2 (número errado).
- Notas de domínio: Etapa de drop-set é entidade filha de Série executada, com posição, carga e repetições. As etapas seguintes começam cansadas e distorceriam a estimativa, por isso só a primeira entra em recordes e 1RM (regra confirmada em 4 nov. 2026). A especificação ainda precisa refletir esse ajuste (arquitetura 16.2, passo 1).

### US-040: Treino livre, sem ficha
- Status: a fazer
- Contexto: o treino livre entrou no MVP (SL18) para permitir treinar sem ficha ativa ou fora do plano.
- Critérios de aceite (cada um vira um teste):
  - Dado o app com ou sem ficha ativa, quando o usuário escolhe treino livre, então uma sessão é iniciada sem ficha e sem versão associadas.
  - Dada uma sessão livre, quando o usuário adiciona exercícios do catálogo e registra séries, então elas seguem as mesmas regras de RIR e classificação da US-013 e entram nas contagens da semana.
  - Dada uma sessão livre finalizada, quando o resumo aparece, então mostra séries válidas por grupo e recordes como numa sessão com ficha, e não marca a sessão como parcial por falta de exercícios previstos.
  - Dada uma sessão livre, quando concluída, então nenhuma ficha ganha versão nova.
- Fora do escopo: transformar uma sessão livre em ficha.
- Falha inaceitável envolvida: FI-1 (perder série concluída).
- Notas de domínio: caso de uso IniciarTreinoLivre. O exercício da sessão já previa item de origem vazio; só a sessão passa a aceitar ficha e versão vazias (arquitetura 7.2). A especificação ainda precisa refletir esse ajuste.

## Épico E-05: Perfil, configurações e primeiro uso (P2)
Objetivo: o usuário informa perfil e preferências uma vez, e cálculos, IA e o primeiro uso passam a respeitá-las.

### US-017: Gerenciar perfil e configurações
- Status: a fazer
- Contexto: limiar de série válida, método de contagem, unidade e sexo e altura alimentam cálculos e a IA (RF22).
- Critérios de aceite (cada um vira um teste):
  - Dado o limiar 3, quando o usuário muda para 2, então as contagens da semana atual e das anteriores são recalculadas sem alterar séries (RB17).
  - Dada uma carga de 100 kg registrada, quando a unidade muda para lb, então é exibida como 220,5 lb e o dado gravado continua 100 kg (CC19).
  - Dado 220,5 lb, quando convertido para kg, então resulta 100,0 kg (CC20).
  - Dado um limiar fora de 0 a 5 ou altura impossível, quando o usuário salva, então o valor é rejeitado.
  - Dado um campo vazio, quando uma função que depende dele é usada, então o app pede o preenchimento naquele momento.
- Fora do escopo: personalização por múltiplos perfis.
- Falha inaceitável envolvida: FI-2 (número errado); FI-4 (apagar ou alterar versão, sessão ou histórico).
- Notas de domínio: padrões: limiar 3, método fracionado, método principal de composição relação cintura-estatura (SL11 confirmada). Conversão 1 kg = 2,20462 lb; arredondar só na exibição, uma casa para cargas.

### US-018: Primeiro uso
- Status: a fazer
- Contexto: o app precisa ficar pronto para treinar logo na primeira abertura (FL10, TE10).
- Critérios de aceite (cada um vira um teste):
  - Dado o app sem dados, quando é aberto, então pede o perfil e permite pular (CE58).
  - Dado o perfil feito ou pulado, quando o usuário segue, então são oferecidos três caminhos para a primeira ficha: manual, importar ou IA.
  - Dado o app fechado antes da primeira ficha, quando reabre, então repete a escolha preservando o perfil (CE59).
  - Dado que importar e pedir à IA ainda não existem, quando os caminhos são exibidos, então aparecem só criar manualmente e treino livre, sem botões que não funcionam.
- Fora do escopo: tutoriais e telas de boas-vindas; restaurar no primeiro uso e o fluxo de ponta a ponta do TE10 (US-042).
- Falha inaceitável envolvida: nenhuma direta.
- Notas de domínio: história dividida para caber em um commit e entregar software funcionando nesta fase; importar e IA aparecem como caminhos quando as US-029 e US-034 forem entregues. Os caminhos incluem o treino livre (US-040).

## Épico E-06: Séries válidas e metas semanais (P2)
Objetivo: o usuário vê, a qualquer momento e sem cálculo manual, quantas séries válidas cada grupo muscular recebeu na semana, comparadas com a meta.

### SP04: Desempenho com dois anos de histórico no aparelho
- Status: a fazer
- Tipo: spike, antes das telas de análise (US-020 e US-026)
- Pergunta: o app abre em até 3 s e a tela da semana em até 2 s com cerca de 6.000 séries gravadas, no Poco M5s?
- Critério de saída: tempos medidos no aparelho com o histórico gerado (DT02); se não atender, a forma de cálculo das contagens é revista antes da US-020.
- Saída esperada: tempos e eventual ajuste registrados nas notas de domínio do AGENTS.md.

### US-019: Classificar cada série
- Status: a fazer
- Contexto: a classificação define o que entra em contagens, recordes e 1RM, e precisa ser idêntica aos casos de referência (seção 13.2).
- Critérios de aceite (cada um vira um teste):
  - Dado limiar 3 e quatro séries de trabalho com RIR 0, 1, 3 e 4, quando classificadas, então resultam 3 válidas e 1 não válida (CC01).
  - Dado o mesmo caso com limiar 2, quando classificadas, então resultam 2 válidas e 2 não válidas (CC02).
  - Dada uma série de trabalho importada sem RIR, quando classificada, então fica sem classificação e fora das contagens e do 1RM (RB13).
  - Dada uma série de aquecimento, por tempo ou cardio, quando classificada, então não entra na contagem (RB11).
- Fora do escopo: exibição na tela da semana (US-020).
- Falha inaceitável envolvida: FI-2 (número errado).
- Notas de domínio: uma série conta uma vez qualquer que seja a técnica (drop-set, rest-pause). Esta regra roda sem interface (N1, RNF33).

### US-020: Contagem semanal de séries válidas por grupo
- Status: a fazer
- Contexto: volume por grupo é a métrica que o usuário não consegue obter hoje (RF09, RB15, RB16).
- Critérios de aceite (cada um vira um teste):
  - Dadas 4 séries válidas de supino reto, quando o método é fracionado, então peitoral 4, tríceps 2 e ombro anterior 2 (CC03); total: 4, 4 e 4 (CC04); direto: 4, 0 e 0 (CC05).
  - Dadas remada curvada com 4 válidas e rosca direta com 3 válidas, quando contadas, então fracionado costas 4 e bíceps 5; total 4 e 7; direto 4 e 3 (CC06).
  - Dada a semana de referência DT03, quando calculada com limiar 3 e 2 nos três métodos, então os 6 resultados coincidem com a tabela da seção 23.4 (TE03).
  - Dada uma troca de método ou limiar, quando aplicada, então todas as semanas são recalculadas sem alterar registros e a mudança é indicada na tela (EA09, RK06).
  - Dada uma semana sem treino, quando exibida, então todos os grupos aparecem com 0, e as séries sem classificação aparecem à parte.
- Fora do escopo: metas (US-021).
- Falha inaceitável envolvida: FI-2 (número errado).
- Notas de domínio: semana de segunda a domingo. Série unilateral conta uma vez (RB19). O app mostra por grupo quanto veio de séries diretas e indiretas. Permite navegar por semanas anteriores.

### US-021: Metas semanais por grupo muscular
- Status: a fazer
- Contexto: sem meta, o número de séries não diz se o volume está adequado (RF10, RB18).
- Critérios de aceite (cada um vira um teste):
  - Dada meta 12 para peitoral e 8,5 realizados, quando a semana é exibida, então aparece "8,5 de 12" com indicação de abaixo da meta.
  - Dada uma meta alterada, quando a semana é exibida, então reflete a nova meta sem alterar o histórico.
  - Dada uma meta negativa ou não numérica, quando salva, então é rejeitada.
  - Dado um grupo sem meta, quando exibido, então mostra só o realizado.
- Fora do escopo: metas que variam por semana.
- Falha inaceitável envolvida: nenhuma direta.
- Notas de domínio: decimais são permitidos. SL10 (meta vale para todas as semanas até ser alterada) é proposta a confirmar.

## Épico E-07: Backup, restauração e apagar dados (P2, risco alto RK02)
Objetivo: nenhuma série se perde ao trocar de celular, e o usuário consegue apagar tudo quando quiser.

### SP02: Tamanho e tempo da cópia completa para o Google Drive
- Status: a fazer
- Tipo: spike, antes da US-022
- Pergunta: quanto pesa e quanto demora enviar uma cópia completa do banco, com 2 anos de histórico gerado, para a pasta oculta do app no Google Drive?
- Critério de saída: tamanho e tempo medidos no Poco M5s. Abaixo de 20 MB, mantém a cópia completa; acima, a decisão da arquitetura (8.1) é revista antes da US-022.
- Saída esperada: medidas registradas nas notas de domínio do AGENTS.md.

### US-022: Fazer backup
- Status: a fazer
- Contexto: o critério de sucesso "nenhuma série registrada é perdida, inclusive ao trocar de celular" depende de cópia fora do aparelho (RF17, RB39, RB40).
- Critérios de aceite (cada um vira um teste):
  - Dada uma sessão finalizada em modo avião, quando a conexão volta, então a sessão é copiada.
  - Dado um backup concluído, quando a tela inicial abre, então mostra data e hora do último backup, e o backup manual com um toque atualiza essa informação.
  - Dado o serviço fora do ar ou sem espaço, quando o backup roda, então a falha é sinalizada na tela inicial, os dados locais ficam intactos e entram no próximo backup (CE50).
  - Dada uma sessão em andamento durante um backup, quando o usuário registra séries, então as metas de tempo do registro continuam valendo (RNF07).
  - Dado o backup armazenado, quando inspecionado, então não contém credenciais legíveis e só é restaurável com a conta Google do usuário (SEG10, SEG11).
  - Dada uma edição de ficha, medição ou perfil fora do treino, quando passam 60 segundos desde a última edição, então um backup é feito, juntando várias edições numa só cópia (SL21).
  - Dado um backup, quando enviado, então cria um arquivo novo com manifesto (data, versão do esquema, totais de fichas, versões, sessões, séries, medições e ações da IA, e SHA-256), sem sobrescrever nada durante o envio.
  - Dado o envio concluído, quando a soma de verificação devolvida pelo Drive confere, então a cópia é marcada como bem-sucedida e só então as cópias além das duas mais recentes são apagadas (SL17).
  - Dado um backup pendente por falta de internet ou falha, quando a conexão volta ou o app reabre, então a pendência gravada no banco é executada.
- Fora do escopo: cifrar o backup com senha própria (ponto de extensão previsto, SL24), backup em segundo plano com o app fechado.
- Falha inaceitável envolvida: FI-1 (perder série concluída); FI-6 (dado de saúde ou credencial saindo sem o usuário saber).
- Notas de domínio: cópia completa do banco gerada com VACUUM INTO, compactada, enviada à pasta oculta do app no Drive (appDataFolder) com a permissão mínima drive.appdata. O backup roda com o app aberto, porque a MIUI pode nunca executar tarefa agendada em segundo plano (RT02). Proteção padrão do Drive por decisão do usuário; o Google como operador fica como risco aceito. Porta ArmazenamentoDeBackup, com o dublê BackupEmMemoria nos testes e servidor HTTP falso no N3. Token do Google expirado é renovado em silêncio com uma nova tentativa antes de mostrar erro (RT07).

### US-023: Restaurar os dados em outro celular
- Status: a fazer
- Contexto: restauração incompleta ou corrompida sem aviso é risco alto (RK02, RF18).
- Critérios de aceite (cada um vira um teste):
  - Dado um backup, quando restaurado no segundo aparelho, então fichas, versões, sessões, séries, medidas e histórico de ações da IA coincidem em quantidade e conteúdo (TE09).
  - Dado um app que já tem dados, quando o usuário pede restauração, então é exigida confirmação explícita para substituir tudo (CE55).
  - Dada uma cópia corrompida, quando a restauração é tentada, então o app usa a cópia anterior e informa qual usou (CE54).
  - Dada uma falha no meio ou totais divergentes, quando a restauração termina, então os dados existentes ficam exatamente como antes (CE56).
  - Dada uma cópia de versão mais nova do app, quando a restauração é tentada, então é recusada com pedido de atualização (CE57).
  - Dada a ausência de internet, de cópia ou recusa de identificação, quando a restauração é pedida, então o app informa e nada muda (CE51 a CE53).
- Fora do escopo: mesclar dados de dois aparelhos.
- Falha inaceitável envolvida: FI-5 (importação ou restauração sem o usuário saber).
- Notas de domínio: o usuário entra com a conta Google e o app lista as duas cópias com data e totais do manifesto, sem baixar nada. A cópia baixada tem a soma de verificação conferida, é aberta como banco separado e passa por PRAGMA integrity_check e comparação de totais; só então o banco atual é trocado por troca de arquivo atômica, e o antigo fica guardado até a próxima abertura bem-sucedida (arquitetura 8.3).

### US-024: Apagar todos os dados
- Status: a fazer
- Contexto: o direito de apagar é exigido pela especificação (SEG14), mas ainda não tem RF próprio (SL19).
- Critérios de aceite (cada um vira um teste):
  - Dada a conexão disponível, quando o usuário apaga tudo com confirmação em duas etapas, então o app fica sem fichas, sessões, medidas e perfil e nenhuma cópia pode ser restaurada (TE12).
  - Dada a ausência de internet, quando o usuário pede para apagar, então o app avisa que as cópias não podem ser apagadas agora e oferece apagar só o aparelho ou tentar depois.
- Fora do escopo: apagar dados seletivamente.
- Falha inaceitável envolvida: FI-4 (apagar ou alterar versão, sessão ou histórico); a exclusão física só existe aqui e exige duas confirmações.
- Notas de domínio: confirmar com o usuário se esta história vira RF24 na especificação (SL19).

## Épico E-08: Desempenho (P2)
Objetivo: o usuário enxerga recordes, carga máxima, 1RM estimado e a evolução de cada exercício sem perguntar à IA.

### US-025: Recordes e 1RM estimado
- Status: a fazer
- Contexto: força é medida por recordes e 1RM, e números errados quebram a confiança no app (RF19, RB20, RB21, RK03).
- Critérios de aceite (cada um vira um teste):
  - Dado 100 kg, 5 repetições e RIR 0, quando o 1RM é calculado, então resulta 112,5 kg (CC07).
  - Dado 100 kg, 5 repetições, RIR 2, então 120,0 kg (CC08); 60 kg, 8, RIR 1, então 77,1 kg (CC09); 80 kg, 10, RIR 0, então 106,7 kg (CC10); 100 kg, 1, RIR 0, então 100,0 kg (CC11).
  - Dado 50 kg, 5 repetições, RIR 5, quando calculado, então exibe "≥ 66,7 kg" (CC12).
  - Dado 40 kg, 12 repetições, RIR 0, quando calculado, então não há estimativa (CC13).
  - Dada uma série de aquecimento de 60 kg com 10 repetições, quando processada, então não gera estimativa nem recorde (CC14).
  - Dado um valor igual ao recorde anterior, quando registrado, então não é recorde novo.
  - Dada uma série unilateral, quando avaliada para recorde, então vale o lado com menor resultado.
- Fora do escopo: gráficos (US-026).
- Falha inaceitável envolvida: FI-2 (número errado).
- Notas de domínio: em drop-set, só a primeira etapa entra em recordes e 1RM (US-039). Brzycki: 1RM = carga × 36 ÷ (37 − n), com n = repetições + RIR, válido para n de 1 a 10. Recordes em três modalidades: carga máxima, repetições por carga e 1RM. Exercício sem carga (barra fixa) tem só repetições por carga, com carga zero. Arredondar só na exibição, uma casa.

### US-026: Gráficos de evolução por exercício
- Status: a fazer
- Contexto: o progresso precisa ficar visível ao longo do tempo (RF20).
- Critérios de aceite (cada um vira um teste):
  - Dado um exercício com sessões, quando o gráfico é aberto, então os valores coincidem com os da US-025.
  - Dada a troca de período (4 semanas, 12 semanas, tudo) ou métrica (carga máxima, 1RM), quando aplicada, então o gráfico é atualizado.
  - Dado um ponto do gráfico, quando tocado, então abre a sessão correspondente.
  - Dadas menos de 2 sessões, quando exibido, então mostra pontos sem linha de tendência; sem dados, mostra aviso.
- Fora do escopo: gráficos comparando exercícios.
- Falha inaceitável envolvida: FI-2 (número errado).
- Notas de domínio: um ponto por sessão.

## Épico E-09: Corpo e composição corporal (P2)
Objetivo: o usuário registra peso e medidas e acompanha a composição corporal junto com o treino, sem falsa impressão de precisão.

### US-027: Registrar medidas e calcular composição corporal
- Status: a fazer
- Contexto: peso e medidas conectados ao treino ajudam a interpretar a evolução de carga (RF21, RB22 a RB26).
- Critérios de aceite (cada um vira um teste):
  - Dado masculino, 178 cm, pescoço 40, cintura 87, peso 80 kg, quando calculado, então RCE 0,49, gordura 16,5%, massa gorda 13,2 kg e massa magra 66,8 kg (CC15).
  - Dado feminino, 165 cm, pescoço 33, cintura 73, quadril 99, peso 60 kg, quando calculado, então RCE 0,44, gordura 28,2%, massa gorda 16,9 kg e massa magra 43,1 kg (CC16).
  - Dado masculino com cintura 40 e pescoço 40, quando salvo, então a medição é rejeitada com mensagem (CC17).
  - Dados os valores do CC15, quando a fórmula é aplicada, então as medidas são convertidas para polegadas antes e o resultado é 16,5%, e não cerca de 23,0% (CC18).
  - Dado o sexo feminino sem quadril, quando salvo, então só a RCE é calculada e o motivo é informado.
  - Dadas duas medições no mesmo dia, quando a tendência é calculada, então vale a mais recente.
  - Dado o resultado, quando exibido, então mostra o método principal em destaque, o outro como secundário, o aviso de margem de 3 a 4 pontos e a ressalva de triagem nas faixas de RCE (RB26).
- Fora do escopo: fotos de progresso e medidas extras.
- Falha inaceitável envolvida: FI-2 (número errado).
- Notas de domínio: fórmulas em polegadas com log10. Masculino: 86,010 × log10(cintura − pescoço) − 70,041 × log10(altura) + 36,76. Feminino: 163,205 × log10(cintura + quadril − pescoço) − 97,684 × log10(altura) − 78,387. Faixas de RCE (NICE NG246): abaixo de 0,40 sem rótulo; 0,40 a 0,49 sem risco aumentado; 0,50 a 0,59 risco aumentado; 0,60 ou mais risco ainda maior, definidas pelo valor exibido com duas casas. Tendência é a média móvel das 4 últimas medições. Instruções de medição: cintura na altura do umbigo com fita paralela ao chão (RB24).

## Épico E-10: Importação e exportação (P2)
Objetivo: o usuário traz e leva fichas e histórico em XLSX, CSV e ficha visual sem redigitar e sem perder ou duplicar dados.

### SP05: Listas suspensas no XLSX com a versão gratuita do SheetJS
- Status: a fazer
- Tipo: spike, antes da US-028
- Pergunta: a versão gratuita do SheetJS grava as listas suspensas (validação de dados) nas colunas Dia, Técnica e Unilateral do modelo XLSX?
- Critério de saída: arquivo aberto no Excel e no Google Planilhas com as listas funcionando. Se não funcionar, escolher entre gerar o modelo por outra biblioteca ou levar as listas para a aba Instruções, e ajustar o critério da US-028.
- Saída esperada: decisão registrada nas notas de domínio do AGENTS.md.

### US-028: Baixar o modelo de importação
- Status: a fazer
- Contexto: o modelo garante que a importação por regra fixa funcione sem IA (RF13, RB37).
- Critérios de aceite (cada um vira um teste):
  - Dado o pedido de modelo XLSX, quando gerado, então abre no Excel e no Google Planilhas com cabeçalho da seção 11.2, exemplos, aba de instruções com versão do formato e listas suspensas em Dia, Técnica e Unilateral.
  - Dado o pedido de modelo CSV, quando gerado, então vem com arquivo de instruções separado e versão no nome do arquivo.
  - Dado um modelo preenchido conforme as instruções, quando importado, então não há erros.
- Fora do escopo: importação (US-029).
- Falha inaceitável envolvida: nenhuma direta.
- Notas de domínio: formato canônico versão 1 (seção 11). A unidade de carga fica registrada na parte Instruções.

### US-029: Importar ficha em XLSX ou CSV no formato do modelo
- Status: a fazer
- Contexto: importação sem redigitar é critério de sucesso, e a leitura por regra fixa não depende de internet nem de IA (RF14, RB34 a RB37).
- Critérios de aceite (cada um vira um teste):
  - Dado um arquivo no modelo, quando importado, então a prévia mostra as linhas reconhecidas e nada é gravado antes da confirmação (RB34).
  - Dado um arquivo com "4 x 10", "4 x Até a Falha", "3 x 12 por braço", "3 x 60 segundos" e "30 minutos", quando lido, então vira Séries e Meta corretas, unilateral e metas de tempo (seção 11.6).
  - Dado "Corrida ou Esteira", quando lido, então pede escolha e guarda a outra opção em Observações.
  - Dados "Elevação Frontal" e "Elevação Frontal com Halteres", quando comparados ao catálogo, então pedem confirmação; os demais nomes com correspondência exata não pedem (seção 11.8).
  - Dados os arquivos da DT05 (separadores, decimais, acentos, sem versão, versão anterior, versão mais nova, mais de 500 linhas, mais de 5 MB), quando importados, então cada um é aceito, ajustado ou rejeitado conforme a seção 19.
  - Dado um arquivo com erros, quando o usuário confirma, então o app devolve o arquivo com uma coluna de erros por linha e permite importar só as linhas válidas.
  - Dada a confirmação, quando salva, então vira nova ficha ou nova versão de ficha existente com autor importação, sem duplicar exercícios no catálogo.
  - Dado um arquivo com 200 linhas, quando importado, então atende à meta de tempo do RNF04.
- Fora do escopo: planilhas fora do modelo e imagens (US-036, depende de IA).
- Falha inaceitável envolvida: FI-5 (importação ou restauração sem o usuário saber).
- Notas de domínio: cabeçalho sem diferenciar maiúsculas e acentos, ordem livre, colunas desconhecidas ignoradas com aviso, coluna obrigatória ausente bloqueia. Linhas em branco, títulos e cabeçalhos repetidos são ignorados. Unidade do arquivo diferente da configurada é convertida e informada na prévia. Cada arquivo contém uma ficha. A parte Histórico e Medidas é ignorada na importação do MVP.

### US-030: Exportar ficha, histórico e medidas em planilha
- Status: a fazer
- Contexto: dados portáteis e ida e volta sem retrabalho são pilares do produto (RF15, RB38).
- Critérios de aceite (cada um vira um teste):
  - Dada a DT01, quando exportada em XLSX e CSV, editada no Excel (mudar uma carga e acrescentar um exercício) e reimportada, então nenhuma linha é perdida ou duplicada, só as duas edições entram e uma versão nova é criada (TE05).
  - Dado o CSV exportado, quando aberto no Excel em português, então acentos e decimais aparecem corretamente.
  - Dado o XLSX, quando gerado, então ficha, histórico (uma linha por série com RIR, tipo e classificação) e medidas ficam em abas separadas; no CSV, em arquivos separados.
  - Dado um período sem dados, quando exportado, então o app informa e não gera arquivo.
  - Dada a primeira exportação de histórico ou de medidas, quando gerada, então aparece aviso único de que o arquivo contém dados pessoais, sem bloquear (SEG04).
  - Dado o histórico de dois anos (DT02), quando exportado em XLSX, então atende ao RNF06.
- Fora do escopo: ficha visual (US-031).
- Falha inaceitável envolvida: FI-6 (dado de saúde ou credencial saindo sem o usuário saber).
- Notas de domínio: colunas do Histórico e das Medidas estão na seção 11.5. O arquivo pode ser salvo no aparelho ou compartilhado. O CSV sai em UTF-8 com marca de ordem de bytes, separador ponto e vírgula e vírgula decimal, que é o que faz "Elevação" e "22,5" abrirem certos no Excel em português. Importação e exportação passam por um único conversor do formato canônico no domínio, então o teste de ida e volta roda inteiro em memória (arquitetura 10).

### US-031: Gerar a ficha visual em PDF e imagem
- Status: a fazer
- Contexto: a ficha visual substitui o print ou papel para imprimir ou mostrar a alguém (RF16).
- Critérios de aceite (cada um vira um teste):
  - Dada a DT01, quando gerada em PDF e em imagem, então há 5 blocos, de segunda a sexta, com 6 linhas cada (TE06).
  - Dada a geração sem colunas opcionais, quando exibida, então mostra só dia, exercício e séries e repetições, como a ficha anexada.
  - Dadas colunas opcionais selecionadas (carga, técnica, descanso, observações), quando gerada, então elas aparecem.
  - Dado um PDF com várias páginas, quando gerado, então nenhuma linha é cortada na quebra de página.
- Fora do escopo: personalização visual além do estilo da ficha de referência.
- Falha inaceitável envolvida: nenhuma direta.
- Notas de domínio: um bloco por rotina com o título da ficha.

### US-042: Primeiro uso de ponta a ponta, com restauração
- Status: a fazer
- Contexto: o TE10 atravessa perfil, importação, treino e backup, e só pode ser verificado depois que E-07 e a US-029 existirem.
- Critérios de aceite (cada um vira um teste):
  - Dado o app sem dados, quando o usuário preenche o perfil, importa a DT01, abre o treino do dia, registra uma sessão e finaliza, então o fluxo termina sem erro e o backup inicia ao concluir (TE10).
  - Dado um backup existente após reinstalação, quando o primeiro uso começa, então o app oferece restaurar antes de criar a primeira ficha (CE60).
  - Dada uma ficha criada antes de restaurar, quando o usuário restaura, então é exigida a confirmação explícita do CE55.
- Fora do escopo: o caminho de IA no primeiro uso (coberto pela US-034).
- Falha inaceitável envolvida: FI-5 (importação ou restauração sem o usuário saber).
- Notas de domínio: depende de US-018, US-022, US-023 e US-029. Roda no nível de integração com dados reais (N6) antes do deploy.

## Épico E-11: Inteligência artificial sob comando (P2, risco alto RK04 e RK05)
Objetivo: o usuário manda a IA avaliar, criar e adaptar fichas e converter importações, com mudanças reversíveis, travas respeitadas e só os dados necessários saindo do aparelho.

### SP03: Escolha do fornecedor de IA
- Status: a fazer
- Tipo: spike, antes da US-033
- Pergunta: qual modelo econômico (Google, Anthropic ou OpenAI) entrega fidelidade numérica, respeito às travas, português do Brasil e leitura de foto de ficha pelo menor custo por comando?
- Critério de saída: comandos de referência CR01 a CR14 rodados em um modelo de cada fornecedor, custo por comando medido e termos de uso e retenção de dados conferidos nos termos vigentes, somente em plano pago de API que não treina com os dados (SEG17).
- Saída esperada: fornecedor escolhido, prompts de referência e respostas reais copiadas para testes/dubles/respostas-ia/, que alimentam a IAFalsa. Enquanto não roda, o adaptador provisório é o Gemini Flash em plano pago.

### US-032: Aceite, transparência e envio mínimo à IA
- Status: a fazer
- Contexto: nenhum dado de saúde pode sair do aparelho sem o usuário saber e aceitar (SEG01 a SEG03, SEG05 a SEG07, RK05).
- Critérios de aceite (cada um vira um teste):
  - Dado o aceite pendente, quando o usuário envia um comando, então nenhuma chamada ao serviço de IA acontece e o aviso do que é enviado é exibido (SEG01).
  - Dado o aceite revogado nas configurações, quando o usuário tenta um comando, então os comandos ficam indisponíveis e o resto do app funciona (SEG02).
  - Dado qualquer envio à IA, quando a tela Dados e privacidade é aberta (em até 2 toques a partir das configurações), então o envio aparece com data, tipo e tamanho aproximado, sem conteúdo (SEG03).
  - Dado o campo de comando aberto, quando exibido, então mostra aviso permanente de que o texto vai ao serviço de IA (SEG05).
  - Dado o comando CR01 sobre costas, quando o conteúdo enviado é inspecionado, então não contém nome, e-mail, identificador de conta ou aparelho nem medidas corporais (SEG06, SEG07).
  - Dado qualquer comando, quando executado, então cada chamada é registrada e o limite mensal de uso é respeitado (RNF37, EA12, EA13).
  - Dado o APK extraído, quando inspecionado, então não contém nenhuma chave de serviço de IA (SEG11).
  - Dado um token de identidade Google de outra conta, vencido ou com destinatário diferente, quando chega ao Worker, então o pedido é recusado.
  - Dado o gasto do mês no teto de R$ 30, quando um novo comando é enviado, então o Worker recusa com aviso e o app mostra o uso do mês.
  - Dados mais de 30 comandos em uma hora, quando o próximo chega, então o Worker recusa.
  - Dado o Worker, quando publicado por `npm run deploy:worker` no CI, então usa o CLOUDFLARE_API_TOKEN dos segredos do GitHub e IA_API_KEY e CONTA_AUTORIZADA como segredos do Worker, sem expor valores no log.
- Fora do escopo: retenção zero no fornecedor (exige contrato empresarial; decisão do usuário foi aceitar a retenção curta padrão do plano pago).
- Falha inaceitável envolvida: FI-6 (dado de saúde ou credencial saindo sem o usuário saber).
- Notas de domínio: o app nunca fala direto com o fornecedor; chama POST /v1/comandos no Cloudflare Worker, que guarda a chave, confere o token Google (assinatura, validade, destinatário igual ao ID do app e conta igual à única autorizada), conta o gasto no KV e registra só metadados (tipo, tokens, duração, custo estimado). O contexto é montado por um construtor por tipo de comando, que só inclui o que a seção 12.3 da especificação lista. Lacuna SL20: a tela Dados e privacidade não tem RF próprio.

### US-033: Avaliar o treino por comando
- Status: a fazer
- Contexto: a avaliação interpreta o histórico sem alterar nada e precisa citar os números exatos do app (RF11, RB32).
- Critérios de aceite (cada um vira um teste):
  - Dado o comando CR01, quando executado 3 vezes, então os números citados coincidem 100% com os calculados pelo app e nada é alterado.
  - Dado menos de 2 semanas de sessões, quando o usuário pede "Avalie meu treino", então a resposta informa que há poucos dados e não estima (CR02).
  - Dado o comando CR11 sobre dieta e suplementos, quando executado, então a IA não orienta sobre dieta, suplementos ou medicamentos.
  - Dado o serviço fora do ar ou o comando cancelado, quando ocorre, então o app mostra mensagem, mantém o texto e permite repetir, e nada muda (CR14).
  - Dado sem internet, quando o usuário abre o comando, então fica indisponível e o resto do app funciona.
- Fora do escopo: alterações na ficha (US-034).
- Falha inaceitável envolvida: FI-2 (número errado); FI-6 (dado de saúde ou credencial saindo sem o usuário saber).
- Notas de domínio: o app envia os valores já calculados, e o teste de fidelidade compara os números citados com os do app. Tempo máximo de 60 s, com progresso visível e cancelamento (RNF05). Período padrão das últimas 4 semanas. A IA não guarda memória entre comandos; o contexto vem sempre dos dados do app. Respostas em português do Brasil.

### US-034: Criar ou adaptar ficha por comando
- Status: a fazer
- Contexto: é a principal promessa da IA no produto, e o risco de alterar além do pedido é alto (RF12, RB27 a RB31, RK04).
- Critérios de aceite (cada um vira um teste):
  - Dado o comando CR03, quando executado 3 vezes, então só a troca pedida é aplicada, cria versão com autor IA e motivo, mostra resumo do antes e depois e desfazer em um toque restaura o conteúdo anterior (TE07).
  - Dado o comando ambíguo CR04, quando executado, então a IA pergunta antes de agir e a ficha fica idêntica até a resposta (TE08, RB29).
  - Dado o CR05 com agachamento travado, quando executado, então o exercício travado fica 100% idêntico e o resumo o lista como não alterado.
  - Dado o CR06, quando executado, então cria nova ficha no formato da seção 11, validada pelo app, só com os equipamentos pedidos.
  - Dado o CR09 com relato de dor, quando executado, então a ficha não muda e a IA orienta procurar um profissional (RB31).
  - Dado o CR10 pedindo apagar sessões e medidas, quando executado, então é recusado e nada muda (SEG16).
  - Dada uma ficha inválida devolvida pela IA, quando validada pelo app, então nada é aplicado e o usuário é informado.
- Fora do escopo: limites de carga e volume (US-035).
- Falha inaceitável envolvida: FI-3 (IA além do pedido ou em exercício travado); FI-4 (apagar ou alterar versão, sessão ou histórico).
- Notas de domínio: o resumo tem motivo, adicionados, removidos, alterados com antes e depois, não alterados por trava e ajustes colaterais. A alteração é aplicada por inteiro ou não é aplicada. Exercício novo criado pela IA entra no catálogo com grupos editáveis. A IA respeita limitações físicas e equipamentos do perfil (RB30). A resposta é validada duas vezes: no Worker, pelo esquema Zod compartilhado em compartilhado/contrato-ia; no app, pelas regras do RF05, os limites da seção 12.5 e as travas, e só então aplicada numa transação única. O contrato não tem operação de exclusão (SEG16).

### US-035: Limites de segurança das propostas da IA
- Status: a fazer
- Contexto: o app precisa barrar aumentos de carga e volume perigosos antes de aplicar qualquer proposta (seção 12.5).
- Critérios de aceite (cada um vira um teste):
  - Dado o CR07 (aumentar 30% a carga do supino), quando a proposta passa de 10% sobre a maior carga de trabalho dos últimos 30 dias, então o app rejeita e pede nova tentativa; após duas rejeições, o comando termina sem alterações e informa o motivo.
  - Dado o CR08 (dobrar séries de peito e costas), quando a proposta passa de 30 séries fracionadas por grupo na semana, então o comportamento é o mesmo do CR07.
  - Dado um exercício sem histórico, quando a IA o inclui, então a carga fica em branco.
- Fora do escopo: limites configuráveis pelo usuário.
- Falha inaceitável envolvida: FI-3 (IA além do pedido ou em exercício travado).
- Notas de domínio: os valores 10% e 30 séries foram confirmados pelo usuário (SL08). Propostas rejeitadas são acompanhadas como indicador (seção 12.8).

### US-036: Importar ficha de imagem ou planilha fora do modelo com conversão pela IA
- Status: a fazer
- Contexto: a ficha de referência existe em print, e redigitá-la é exatamente o problema que o app resolve (RF14, TE04).
- Critérios de aceite (cada um vira um teste):
  - Dada a DT01 em imagem, quando importada, então as 30 linhas são reconhecidas, título e linhas em branco ignorados, e só os nomes ambíguos da seção 11.8 pedem confirmação; nada é gravado antes da confirmação (TE04).
  - Dada uma foto, quando o usuário inicia a importação, então o app mostra a imagem com aviso para cobrir dados pessoais e pede confirmação antes do envio (SEG08).
  - Dada a conversão concluída, quando a importação termina, então não há cópia da imagem no app nem no backup (CR13).
  - Dado o CR12 (célula de Observações com instrução para apagar sessões), quando importado, então o texto aparece como observação na prévia e nenhuma ação acontece (SEG15).
  - Dada uma imagem ilegível, quando convertida, então o app mostra dicas de enquadramento e iluminação.
  - Dado sem internet, quando a importação depende da IA, então o app informa a indisponibilidade.
  - Dada a permissão de câmera ou arquivos recusada, quando o usuário tenta importar, então o recurso fica indisponível com caminho alternativo (CE64).
- Fora do escopo: arquivos no formato do modelo (US-029).
- Falha inaceitável envolvida: FI-5 (importação ou restauração sem o usuário saber); FI-6 (dado de saúde ou credencial saindo sem o usuário saber).
- Notas de domínio: a IA converte para o formato canônico antes da prévia; daí em diante vale o mesmo fluxo da US-029. Conversão exige o aceite da US-032. A foto é reduzida no aparelho antes do envio, e o conteúdo de planilhas, imagens e observações vai em campos de dados, nunca no texto de instrução (SEG15).

### US-037: Histórico de ações da IA
- Status: a fazer
- Contexto: a proporção de ações desfeitas é o principal indicador de qualidade da IA (RF23, RB33).
- Critérios de aceite (cada um vira um teste):
  - Dados 4 comandos de adaptação com 1 desfeito, quando o histórico é aberto, então a proporção exibida é 25%.
  - Dadas avaliações registradas, quando a proporção é calculada, então elas não entram na conta.
  - Dada uma ação da IA desfeita pelo FL04, quando o histórico é aberto, então ela aparece marcada como desfeita.
  - Dada uma ação, quando tocada, então abre a versão da ficha relacionada.
  - Dado nenhum comando registrado, quando o histórico é aberto, então mostra aviso.
- Fora do escopo: metas automáticas de qualidade.
- Falha inaceitável envolvida: FI-4 (apagar ou alterar versão, sessão ou histórico).
- Notas de domínio: cada registro tem data, tipo (avaliação, criação, adaptação ou importação), resultado, versão criada e marca de desfeito. Referência inicial: menos de 20% de ações desfeitas, revisado após 30 ações.

## Épico E-12: Proteção do aparelho (P2)
Objetivo: dados de saúde e treino ficam protegidos se o celular for perdido ou emprestado.

### US-038: Bloqueio do app com o bloqueio do aparelho
- Status: a fazer
- Contexto: aparelho perdido é uma das ameaças da seção 17.4, e o controle previsto é o SEG12, que ainda não tem RF próprio (SL20).
- Critérios de aceite (cada um vira um teste):
  - Dado o bloqueio ativo, quando o app é aberto ou retomado após o tempo de espera (padrão 5 minutos), então exige biometria ou PIN do sistema.
  - Dada uma sessão em andamento, quando o usuário volta ao app dentro do tempo de espera, então não é pedido desbloqueio.
  - Dado o bloqueio desativado, quando o app abre, então não pede desbloqueio.
- Fora do escopo: senha própria do app.
- Falha inaceitável envolvida: nenhuma direta.
- Notas de domínio: o bloqueio usa o mecanismo do próprio aparelho, sem criar credencial nova.

## Achados da política de testes
<!-- Falhas fora do escopo entram aqui como histórias; se forem estruturais, viram épico -->

# Arquitetura: App de Treino com IA

Nov 4, 2026 · @Eduardo

## 1. Visão geral

O app será construído em React Native com Expo e TypeScript, guardará tudo em SQLite no aparelho, fará backup no Google Drive do usuário e falará com a IA por uma função no Cloudflare Workers. O código segue arquitetura hexagonal: as regras de treino ficam em TypeScript puro, sem saber que existem tela, banco, Drive ou IA.

Este documento responde à especificação "Especificação de Requisitos: App de Treino com IA" (29 de outubro de 2026) e não a substitui. Os códigos RF, RB, RNF, SEG, RES, INT e SL vêm de lá. Aqui ficam as escolhas de tecnologia, a estrutura do código e a resolução das lacunas que a especificação deixou para a arquitetura (SL17, SL22 a SL25).

| Tema | Decisão | Motivo principal |
| --- | --- | --- |
| Plataforma | React Native + Expo, TypeScript | Atende Android agora e web depois (RES07), na linguagem que você já conhece |
| Arquitetura | Hexagonal, com SOLID e Clean Code | Pedido seu; isola as regras de cálculo, que são o núcleo testável (RNF33) |
| Banco local | SQLite com Drizzle ORM | Funciona sem internet (RES08), com transações e migrações versionadas (RNF32) |
| Backup | Google Drive, pasta oculta do app, login Google | Custo zero e nenhum servidor próprio |
| IA | Cloudflare Worker como intermediário, fornecedor trocável | A chave nunca fica no aparelho (SEG11) |
| Distribuição | APK assinado agora, Play Store depois | Pedido seu; sem taxa nem revisão no MVP |
| Código | GitHub privado, CI no GitHub Actions | Gratuito e conhecido pelos três agentes |
| Custo | Até R$ 30 por mês, quase tudo de IA | Pedido seu; o intermediário bloqueia ao atingir o teto (RNF37) |

## 2. Decisões do usuário

As respostas ao questionário de 4 de novembro de 2026 fecham sete lacunas da especificação e definem o contexto de construção. Duas respostas foram ajustadas aqui, com o motivo, e você confirmou os ajustes. A plataforma futura ficou só a web: o iPhone saiu do escopo.

### 2.1 Contexto de construção

| Tema | Resposta |
| --- | --- |
| Quem escreve o código | Principalmente agentes de IA, com revisão sua |
| Agentes | Claude Code, Codex e Gemini |
| Linguagens conhecidas | JavaScript/TypeScript, Python, Java, Kotlin |
| Aparelho de teste | Poco M5s com MIUI 14 |
| Tempo disponível | Cerca de 10 horas por semana, com mais no fim de semana; sem data-alvo |
| Arquitetura | Hexagonal, SOLID, Clean Code; TDD com dublês para o que ainda não existe |

### 2.2 Lacunas da especificação resolvidas

| Código | Lacuna | Decisão |
| --- | --- | --- |
| SL08 | Limites da IA | Mantidos: até 10% de aumento de carga e até 30 séries fracionadas por grupo na semana |
| SL11 | Método principal de composição corporal | Relação cintura-estatura confirmada como padrão |
| SL12 | Nutrição | Fora do app, confirmado |
| SL13 | Prazo e orçamento | Sem prazo; teto de R$ 30 por mês |
| SL16 | Drop-set | Cada etapa registra a própria carga e repetições |
| SL18 | Treino livre | Entra no MVP: sessão sem ficha |
| SL21 | Backup fora do treino | Edições de ficha e medidas também disparam backup |
| SL17 | Retenção de cópias | Ajustado: a mais recente e a anterior (ver 2.3) |
| SL22 | Identificação no backup | Login com a conta Google (seção 8) |
| SL23 | Guarda das credenciais | Nenhuma chave de serviço no app; token do Google no cofre do sistema (seções 9 e 11) |
| SL24 | Criptografia do backup | Proteção padrão do Google Drive, sem senha extra |
| SL25 | Condições do fornecedor de IA | Somente plano pago de API, que não treina com os dados (ver 2.3) |

Drop-set e treino livre mudam o modelo de domínio da especificação: a série executada ganha uma lista de etapas, e a sessão passa a aceitar ficha vazia. Os dois ajustes aparecem na seção 7 e precisam ser refletidos na especificação.

### 2.3 Ajustes e respostas que você pediu

**Cópias de backup.** Você pediu só a mais recente, mas o RF18 manda tentar a cópia anterior quando a atual está corrompida, e o risco RK02 é de impacto alto. Com uma única cópia, um backup que falhe no meio da gravação pode deixar você sem nenhuma cópia boa. Guardar duas custa praticamente nada (poucos megabytes no seu Drive), então ficam duas, como você confirmou.

**Dados enviados à IA (pergunta 14).** A pergunta era se basta o fornecedor não treinar modelos com seus dados, ou se você quer também que ele não guarde nada. Os planos pagos de API dos três grandes fornecedores não treinam com os dados enviados, mas guardam as requisições por um período curto para detectar abuso. Retenção zero costuma exigir contrato empresarial, fora do alcance de um app pessoal. Decisão confirmada: opção (a), exigir plano pago que não treina e aceitar a retenção curta padrão. O ponto que mais importa é evitar planos gratuitos, porque o plano gratuito da API Gemini pode usar os dados para melhorar os produtos do Google ([fonte](https://wetheflywheel.com/en/ai-model-access/free-gemini-api/)). Os prazos exatos de retenção de cada fornecedor mudam com frequência e serão conferidos nos termos vigentes no spike SP03 (seção 15).

## 3. Stack

A escolha é React Native com Expo, em TypeScript estrito, porque é o único caminho multiplataforma na linguagem que você já lê e em que os três agentes têm mais código de exemplo. As versões exatas serão fixadas no spike SP01 com a versão estável do Expo SDK vigente no início do projeto.

### 3.1 Alternativas consideradas

| Critério | React Native + Expo | Flutter | Kotlin nativo |
| --- | --- | --- | --- |
| Atende web depois (RES07) | Sim, com o mesmo código | Sim, com o mesmo código | Não, exigiria reescrever |
| Linguagem | TypeScript, que você conhece | Dart, nova para você | Kotlin, que você conhece |
| Revisão do código dos agentes | Fácil para você | Exige aprender Dart | Fácil para você |
| Arquitetura hexagonal | Natural com interfaces TypeScript | Natural com classes abstratas | Natural com interfaces Kotlin |
| **Resultado** | **Escolhido** | Segunda opção | Descartado por RES07 |

Flutter teria desempenho de tela um pouco melhor, mas as metas da especificação (toque em até 100 ms, abertura em até 3 s) são alcançáveis em React Native, e revisar Dart sem conhecê-lo enfraqueceria sua revisão, que é o controle principal num projeto escrito por agentes.

### 3.2 Componentes e dependências

Cada dependência entra pelo motivo da coluna da direita; qualquer outra precisa de justificativa (regra do CLAUDE.md).

| Camada | Componente | Para que serve | Por que este |
| --- | --- | --- | --- |
| Linguagem | TypeScript em modo estrito | Todo o código do app e do intermediário | Tipos pegam erros dos agentes antes do teste |
| Base do app | Expo (gerenciado, com prebuild) | Build, módulos nativos, atualização | Evita configurar Android à mão; gera o projeto Android quando preciso |
| Navegação | Expo Router | Telas e rotas | Padrão do Expo; funciona também na web |
| Banco local | expo-sqlite | Guardar tudo no aparelho | Transações reais, funciona sem internet |
| Acesso ao banco | Drizzle ORM e drizzle-kit | Esquema tipado e migrações versionadas | Leve, sem mágica; migrações em SQL legível (RNF32) |
| Estado de tela | Zustand | Estado da sessão em andamento | Pequeno e explícito; fica só na camada de interface |
| Validação | Zod | Validar respostas da IA, importações e o contrato com o intermediário | O mesmo esquema serve ao app e ao Worker |
| Login Google | @react-native-google-signin/google-signin | Conta Google para backup e para autenticar no intermediário | Biblioteca de referência para login nativo no Android |
| Cofre | expo-secure-store | Guardar tokens | Usa o Keystore do Android |
| Bloqueio | expo-local-authentication | Biometria ou PIN do sistema (SEG12) | Módulo oficial do Expo |
| Arquivos | expo-file-system, expo-document-picker, expo-image-picker, expo-sharing | Importar, exportar, câmera e compartilhar (INT03 a INT05) | Módulos oficiais do Expo |
| Planilhas | SheetJS (xlsx), instalado pelo canal oficial do projeto | Ler e gravar XLSX | Funciona em React Native; o pacote antigo do npm não recebe correções |
| CSV | Papa Parse | Ler e gravar CSV com separadores variados (RB36) | Trata vírgula, ponto e vírgula e aspas |
| PDF e imagem | expo-print e react-native-view-shot | Ficha visual (RF16) | PDF a partir de HTML; imagem a partir da tela |
| Gráficos | react-native-gifted-charts | Evolução por exercício (RF20) | Simples e sem motor gráfico pesado |
| Intermediário de IA | Cloudflare Workers com KV | Guardar a chave, autenticar e contar o gasto | Plano gratuito suficiente para uso pessoal |
| Testes | Jest com jest-expo e React Native Testing Library | Testes de domínio, aplicação e telas | Padrão do Expo |
| Qualidade | ESLint, Prettier, eslint-plugin-boundaries | Estilo e regra de dependência entre camadas | O plugin impede, no CI, o domínio de importar adaptadores |

## 4. Arquitetura hexagonal

O domínio fica no centro e não importa nada de fora: nem React, nem SQLite, nem HTTP. A aplicação orquestra os casos de uso e declara, como interfaces, tudo o que precisa do mundo externo; os adaptadores implementam essas interfaces e são ligados a elas num único ponto de composição.

&#91;embedded content: arquitetura hexagonal · domínio, aplicação e 5 adaptadores\]

A interface chama os casos de uso, e cada adaptador depende da porta que implementa, nunca o contrário. Por isso o núcleo inteiro (as fórmulas da seção 13 da especificação e todas as regras RB) roda nos testes sem aparelho, banco ou rede (RNF33).

### 4.1 Regras de dependência

| Camada | Pode importar | Não pode importar |
| --- | --- | --- |
| Domínio | Apenas o próprio domínio | Aplicação, adaptadores, interface, React, Expo, Drizzle |
| Aplicação | Domínio | Adaptadores, interface, bibliotecas de plataforma |
| Adaptadores | Aplicação (portas) e domínio | Interface e outros adaptadores |
| Interface | Aplicação e domínio (só tipos) | Adaptadores |
| Composição | Todas | Nada é proibido; é o único lugar que conhece tudo |

O eslint-plugin-boundaries transforma essa tabela em erro de lint, então um agente que importar o SQLite dentro de uma regra de cálculo é barrado no CI antes do commit.

### 4.2 SOLID e Clean Code na prática

- **Responsabilidade única.** Um caso de uso por arquivo, com um método `executar`; cada fórmula (série válida, 1RM, Marinha, cintura-estatura) é uma função pura própria.
- **Aberto e fechado.** Os métodos de contagem (fracionado, total, direto) e os fornecedores de IA são estratégias: um novo entra como nova classe, sem editar as existentes.
- **Substituição de Liskov.** Todo adaptador e todo dublê passam pela mesma suíte de contrato da porta (seção 12).
- **Segregação de interfaces.** Portas pequenas por assunto (fichas, sessões, catálogo, corpo) em vez de um repositório genérico.
- **Inversão de dependência.** Casos de uso recebem as portas no construtor; quem decide qual adaptador usar é só a composição.
- **Clean Code.** Nomes do domínio da especificação, funções curtas, erros com o valor recebido e o esperado, como manda o CLAUDE.md.

Objetos de valor protegem as regras na origem: Rir só aceita inteiro de 0 a 5, Carga só aceita gramas não negativos, MetaDeSerie distingue repetições, faixa, falha e tempo. Um valor inválido não consegue nem ser construído, então não chega ao banco.

## 5. Portas e adaptadores

O app tem dez portas de saída, cada uma com um adaptador real e um dublê em memória que existe desde o primeiro teste. Os dublês permitem escrever e testar os casos de uso antes de existir banco, Drive ou IA, como você pediu.

### 5.1 Portas de entrada (casos de uso)

Cada caso de uso é uma classe com um único método público `executar`, chamada pela interface. Os nomes seguem os requisitos funcionais.

| Grupo | Casos de uso | Requisitos |
| --- | --- | --- |
| Treino | EscolherTreinoDoDia, IniciarSessao, IniciarTreinoLivre, RegistrarSerie, AjustarSessao, FinalizarSessao | RF01 a RF04, SL18 |
| Fichas | SalvarFicha, DuplicarFicha, ArquivarFicha, ListarVersoes, RestaurarVersao, TravarExercicio | RF05 a RF07 |
| Catálogo | SalvarExercicio, MesclarExercicios | RF08 |
| Análise | ContarSeriesDaSemana, DefinirMeta, CalcularRecordes, MontarGrafico | RF09, RF10, RF19, RF20 |
| Corpo | RegistrarMedicao | RF21 |
| IA | AvaliarTreino, CriarOuAdaptarFicha, ConverterImportacao, ListarAcoesDaIA | RF11, RF12, RF14, RF23 |
| Arquivos | BaixarModelo, ImportarFicha, Exportar, GerarFichaVisual | RF13 a RF16 |
| Backup | FazerBackup, RestaurarBackup | RF17, RF18 |
| Perfil e privacidade | SalvarPerfil, RegistrarAceiteDaIA, ApagarTudo | RF22, SEG01, SEG02, SEG14 |

### 5.2 Portas de saída

| Porta | O que oferece ao núcleo | Adaptador real | Dublê de teste |
| --- | --- | --- | --- |
| RepositorioDeFichas | Ler e gravar fichas e versões | SQLite via Drizzle | RepositorioDeFichasEmMemoria |
| RepositorioDeSessoes | Ler e gravar sessões e séries | SQLite via Drizzle | RepositorioDeSessoesEmMemoria |
| RepositorioDoCatalogo | Exercícios, grupos e sinônimos | SQLite via Drizzle | RepositorioDoCatalogoEmMemoria |
| RepositorioDoCorpo | Medições e perfil | SQLite via Drizzle | RepositorioDoCorpoEmMemoria |
| UnidadeDeTrabalho | Executar várias gravações numa única transação (RNF09) | Transação do SQLite | UnidadeDeTrabalhoEmMemoria |
| ServicoDeIA | Avaliar, gerar ficha, converter importação | Cliente HTTP do Worker | IAFalsa, com respostas copiadas de respostas reais |
| ArmazenamentoDeBackup | Enviar, listar e baixar cópias | API do Google Drive, pasta do app | BackupEmMemoria |
| LeitorEGravadorDeArquivos | XLSX, CSV, PDF e imagem | SheetJS, Papa Parse, expo-print | ArquivosEmMemoria |
| Relogio e RegistroDeFalhas | Data e hora atual; registro local de eventos (RNF36) | Relógio do sistema; arquivo JSON Lines fora do banco (não entra no backup, como pede a seção 17.2 da especificação, e sobrevive à volta do banco à cópia na migração; decisão da US-003) | RelogioFixo; RegistroDeFalhasEmMemoria |

O relógio vira porta porque metade das regras depende de data: semana de segunda a domingo (RB16), últimos 30 dias no limite de carga, rotação A, B, C. Com RelogioFixo, um teste de "hoje é quarta" é determinístico.

## 6. Estrutura de pastas

O repositório tem dois projetos: o app e o intermediário de IA, que compartilham só o contrato da API. Dentro do app, a pasta diz a camada, e a regra de dependência é verificada pelo eslint-plugin-boundaries no CI.

```
app/
  src/
    dominio/          # entidades, objetos de valor e regras puras (série válida, 1RM, Marinha)
      treino/         # Sessao, SerieExecutada, EtapaDeDropSet
      ficha/          # Ficha, VersaoDaFicha, Rotina, ItemDeExercicio, SeriePlanejada
      catalogo/       # Exercicio, GrupoMuscular
      corpo/          # MedicaoCorporal, Perfil
      calculos/       # contagem de séries, 1RM, recordes, composição corporal
    aplicacao/        # casos de uso e portas (interfaces)
      casos-de-uso/   # um arquivo por caso de uso
      portas/         # RepositorioDeFichas, ServicoDeIA, ArmazenamentoDeBackup...
    adaptadores/      # implementações reais das portas
      sqlite/         # esquema Drizzle, migrações, repositórios
      google-drive/   # backup
      ia/             # cliente HTTP do Worker
      arquivos/       # XLSX, CSV, PDF, imagem
      sistema/        # relógio, cofre, biometria
    interface/        # telas, componentes e estado de tela (Zustand)
      textos/         # todos os textos em português num só lugar (RNF35)
    composicao/       # liga cada porta ao seu adaptador; único lugar que conhece todos
  app/                # rotas do Expo Router, finas, que só montam telas
  testes/
    dubles/           # RepositorioDeFichasEmMemoria, IAFalsa, RelogioFixo...
    casos-de-referencia/ # CC01 a CC20 e a ficha de referência da seção 23
worker/
  src/                # rota única de IA, autenticação, limite de gasto, troca de fornecedor
compartilhado/
  contrato-ia/        # esquemas Zod da requisição e da resposta, usados pelo app e pelo Worker
```

Os nomes de código ficam em português, como os da especificação, para que um RF e a classe que o implementa usem as mesmas palavras. Termos técnicos sem tradução comum (hook, store, Worker) ficam em inglês.

## 7. Persistência local e migrações

O SQLite do aparelho é a fonte da verdade, e cada série concluída é gravada numa transação própria antes de qualquer chamada de rede (RNF08, falha inaceitável nº 1). O banco roda em modo WAL com sincronização completa, que é mais lento por gravação mas sobrevive a fechamento forçado e falta de bateria.

### 7.1 Regras de gravação

| Regra | Como é feita | Requisito |
| --- | --- | --- |
| Série salva em até 1 s | Uma transação por série, disparada no toque de concluir | RNF01, RNF08 |
| Alteração composta por inteiro ou nada | Importação, ação da IA e restauração passam pela UnidadeDeTrabalho, numa transação única | RNF09 |
| Versões imutáveis | Tabelas de versão, rotina, item e série planejada só recebem inserção; o repositório não expõe atualização nem exclusão | RB02, RB03 |
| Nada se apaga com histórico | Ficha e exercício têm situação "arquivada"; a exclusão física só existe em ApagarTudo | RB04, SEG14 |
| Identificadores | UUID v7, gerado no aparelho, ordenado no tempo | Base para a versão web sem colisão (RES07) |
| Datas | ISO 8601 em UTC no banco; fuso do aparelho só na exibição e no cálculo da semana | RB16 |
| Números sem erro de arredondamento | Carga em gramas e circunferências em milímetros, como inteiros; conversão só na exibição | Seção 13.1 da especificação |

Guardar carga em gramas inteiros evita que 22,5 kg vire 22,499999 depois de algumas conversões para libra e de volta, o que faria um recorde aparecer ou sumir por engano (falha inaceitável nº 2).

### 7.2 Ajustes ao modelo de domínio

As 16 entidades da seção 18 da especificação viram tabelas, com dois ajustes vindos das suas respostas:

- **Etapa de drop-set (SL16).** Nova entidade filha de Série executada, com posição, carga e repetições. A série continua contando uma vez para séries válidas; o RIR é o da última etapa. Para recordes e 1RM, vale só a primeira etapa, porque as seguintes começam cansadas e distorceriam a estimativa. Regra confirmada por você.
- **Treino livre (SL18).** Sessão de treino passa a aceitar ficha e versão vazias, e o exercício da sessão já previa item de origem vazio. Nada mais muda.

### 7.3 Migrações

O esquema é versionado pelo drizzle-kit, com uma migração SQL por mudança, aplicada na abertura do app. Antes de migrar, o app copia o arquivo do banco para uma pasta interna e só apaga a cópia depois de a migração terminar e os totais de séries e sessões baterem. Se algo falhar, o app volta à cópia e registra a falha (RNF13). Toda migração ganha um teste que parte de um banco da versão anterior com dados reais de exemplo.

## 8. Backup e restauração

O backup é uma cópia completa do banco, enviada para a pasta oculta do app no seu Google Drive (appDataFolder), com a permissão mínima `drive.appdata`. Essa pasta só é visível para o próprio app: você não a vê no Drive, outros apps não a leem, e ela não dá ao app acesso aos seus outros arquivos.

### 8.1 Como uma cópia é feita

1. O app gera uma cópia consistente do banco com `VACUUM INTO`, sem parar o uso, e a compacta.
2. Junto vai um manifesto com data, versão do esquema, totais (fichas, versões, sessões, séries, medições, ações da IA) e a soma de verificação SHA-256 do arquivo.
3. O envio cria um arquivo novo; nada é sobrescrito durante o envio.
4. O app confere a soma de verificação devolvida pelo Drive. Só depois disso marca a cópia como bem-sucedida e apaga as que passarem de duas.
5. A tela inicial mostra data e hora da última cópia boa, ou o aviso de falha (RF17).

A especificação fala em copiar "os dados novos desde o último backup". A cópia completa cumpre isso com menos código e menos pontos de falha, porque dois anos de histórico devem ocupar poucos megabytes. O tamanho real será medido no spike SP02; se passar de 20 MB, a decisão é revista.

### 8.2 Quando o backup roda

| Gatilho | Comportamento |
| --- | --- |
| Fim de sessão de treino | Imediato, se houver internet (RB40) |
| Pedido manual | Imediato, com um toque (RF17) |
| Edição de ficha, medição ou perfil fora do treino | Agendado para 60 segundos depois da última edição, para juntar várias edições numa cópia (SL21) |
| Sem internet ou falha | Pendência gravada no banco; nova tentativa ao voltar a conexão ou ao reabrir o app |

O backup roda com o app aberto e não depende de tarefa em segundo plano. A MIUI do Poco M5s encerra processos em segundo plano de forma agressiva para poupar bateria, então uma tarefa agendada fora do app poderia nunca rodar. A pendência gravada garante que nenhuma cópia seja esquecida: ela roda na próxima abertura.

### 8.3 Restauração

1. O usuário entra com a conta Google; o app lista as duas cópias com data e os totais do manifesto, sem baixar nada (RF18).
2. Se o app já tem dados, pede confirmação explícita para substituir tudo.
3. Baixa a cópia, confere a soma de verificação, abre como banco separado e roda `PRAGMA integrity_check` e a comparação de totais.
4. Só com tudo conferido, troca o banco atual pelo restaurado numa troca de arquivo atômica. O banco antigo fica guardado até a próxima abertura bem-sucedida.
5. Cópia corrompida leva à tentativa com a anterior. Qualquer falha antes do passo 4 deixa os dados atuais intactos (RNF09).

### 8.4 Proteção

Por decisão sua (SL24), o backup usa a proteção padrão do Drive: tráfego cifrado, armazenamento cifrado pelo Google e acesso só com a sua conta. Isso atende ao SEG10 contra terceiros. O Google, como operador, tecnicamente pode ler o conteúdo, e esse risco fica registrado como aceito. A arquitetura deixa um ponto de extensão na porta ArmazenamentoDeBackup para cifrar com senha no futuro, sem mudar o restante.

## 9. Integração com IA

O app nunca fala direto com o fornecedor de IA: ele chama uma rota do Cloudflare Worker, que guarda a chave, confere quem está pedindo, conta o gasto e repassa ao fornecedor configurado. A resposta só é aplicada depois de passar pela mesma validação de uma ficha feita à mão.

### 9.1 Caminho de um comando

1. **No app, antes de sair.** O caso de uso confere o aceite registrado (SEG01) e o limite do mês, e monta o contexto com um construtor por tipo de comando, que só inclui o que a seção 12.3 da especificação lista (SEG07). Nome, e-mail e identificadores nunca entram (SEG06).
2. **No Worker.** Confere o token de identidade do Google enviado no cabeçalho: assinatura, validade, destinatário igual ao ID do app e identificador da conta igual ao único autorizado, guardado como segredo do Worker. Qualquer outra conta recebe recusa.
3. **No Worker.** Confere o gasto do mês no KV, monta a chamada a partir de um modelo de prompt versionado e chama o fornecedor.
4. **No Worker.** Valida a resposta com o esquema Zod compartilhado, registra só metadados (tipo, tokens, duração, custo estimado) e devolve.
5. **No app.** Valida de novo no domínio: regras do RF05, limites da seção 12.5 e exercícios travados idênticos. Proposta reprovada gera nova tentativa; duas reprovações encerram o comando sem alteração.
6. **No app.** Aplica numa transação única (nova versão com autor IA e motivo), mostra o resumo com desfazer e registra a ação (RB28, RB33).

O token do Google resolve o problema da chave sem colocar segredo nenhum no app: ele prova quem você é, expira em cerca de uma hora e é renovado pelo login. Mesmo que alguém extraia o APK, não há chave para roubar, e sem a sua conta Google o Worker não responde.

### 9.2 Contrato

Uma rota, `POST /v1/comandos`, com quatro tipos: `avaliar`, `criar`, `adaptar` e `converter-importacao`. A requisição leva o tipo, o texto do comando e o contexto estruturado em JSON; a resposta traz texto (avaliação), uma pergunta de esclarecimento (RB29) ou uma ficha no formato canônico da seção 11 com o resumo das mudanças. O esquema fica em `compartilhado/contrato-ia` e tem número de versão.

### 9.3 Defesas

| Risco | Defesa |
| --- | --- |
| Instrução escondida em planilha, imagem ou observação (SEG15) | Esse conteúdo vai em campos de dados, nunca no texto de instrução; a IA não tem ferramentas e só consegue devolver um JSON validado |
| IA pedir para apagar algo (SEG16) | O contrato não tem nenhuma operação de exclusão; a pior resposta possível é uma ficha inválida, que é recusada |
| Número inventado na avaliação (RB32) | O app envia os valores já calculados; o teste de fidelidade compara os números citados com os do app |
| Gasto acima do teto (RNF37) | Contador mensal no Worker em reais estimados; acima do limite, recusa com aviso; o app mostra o uso do mês |
| Abuso com token roubado | Limite de 30 comandos por hora no Worker, além do teto mensal |
| Demora do fornecedor (RNF05) | Tempo máximo de 60 s, progresso visível e cancelamento; o texto do comando nunca se perde |

### 9.4 Fornecedor

O fornecedor fica atrás de um adaptador dentro do Worker, escolhido por variável de configuração, então trocar de fornecedor não muda o app (RES19). A escolha inicial sai do spike SP03, que roda os comandos de referência da seção 23.6 da especificação em um modelo econômico de cada fornecedor (Google, Anthropic e OpenAI) e compara fidelidade numérica, respeito às travas, qualidade do português, leitura de foto de ficha e custo por comando. Enquanto o spike não roda, o adaptador provisório é o Gemini Flash em plano pago, porque costuma ter o menor preço por token e lê imagens; esse ponto é provisório e depende de conferência de preço.

Regra fixa, qualquer que seja o fornecedor: somente plano pago de API, que não treina com os dados enviados (SEG17, seção 2.3).

## 10. Importação, exportação e ficha visual

Importação e exportação passam por um único conversor do formato canônico (seção 11 da especificação, versão 1), que vive no domínio e não conhece XLSX nem CSV. Os adaptadores só transformam arquivo em linhas e linhas em arquivo, então o teste de ida e volta (exportar, editar, reimportar sem perda) roda inteiro em memória.

| Fluxo | Caminho | Requisito |
| --- | --- | --- |
| Arquivo no formato do modelo | Adaptador lê as linhas; o domínio valida e monta a prévia, sem IA e sem internet | RF14, RB34 |
| Planilha fora do modelo, foto ou print | O caso de uso ConverterImportacao manda o conteúdo ao Worker; a resposta volta no formato canônico e segue o mesmo caminho da linha acima | RF14, RB27 |
| Foto | Mostrada para confirmação com o aviso de cobrir dados pessoais; reduzida no aparelho antes do envio; apagada do armazenamento temporário após a conversão | SEG08, RES13 |
| Nomes de exercício | Comparação com nome e sinônimos, sem acento e sem maiúsculas; sem correspondência exata, o usuário associa ou cria | RB35 |
| Erros em XLSX ou CSV | O mesmo arquivo volta com uma coluna de erros por linha | RF14 |
| Exportar CSV | UTF-8 com marca de ordem de bytes, separador ponto e vírgula e vírgula decimal, que o Excel em português abre sem mexer | RB38, RF15 |
| Exportar XLSX | Abas Instruções, Ficha, Histórico e Medidas; listas suspensas nas colunas Dia, Técnica e Unilateral | RF13, RF15 |
| Ficha visual | HTML gerado no app vira PDF pelo expo-print; a imagem vem do mesmo HTML renderizado em tela | RF16 |

A marca de ordem de bytes e o ponto e vírgula são o que faz acento e decimal aparecerem certos no Excel em português; sem eles, "Elevação" e "22,5" chegam quebrados. A importação aceita os dois separadores, como pede a RB36.

## 11. Segurança e privacidade

Cada um dos 17 requisitos SEG da especificação tem um mecanismo concreto nesta arquitetura. O único desvio é o SEG10, que aceita o Google como operador do backup por decisão sua.

| Código | Mecanismo | Onde |
| --- | --- | --- |
| SEG01 | Caso de uso RegistrarAceiteDaIA grava data do aceite; o ServicoDeIA recusa chamar sem aceite | Aplicação |
| SEG02 | Revogar apaga o aceite; os comandos ficam indisponíveis | Aplicação e interface |
| SEG03 | Tela Dados e privacidade lê a tabela de envios (data, tipo, tamanho), nunca o conteúdo | Interface |
| SEG04 | Aviso na primeira exportação de histórico ou medidas, guardado por tipo | Interface |
| SEG05 | Aviso fixo no campo de comando | Interface |
| SEG06 | Construtor de contexto sem campos de identificação; teste inspeciona o JSON enviado | Aplicação |
| SEG07 | Um construtor de contexto por tipo de comando, testado contra a tabela 12.3 | Aplicação |
| SEG08 | Confirmação da foto antes do envio e descarte depois | Interface e adaptador de arquivos |
| SEG09 | Todo tráfego em HTTPS; o Android bloqueia HTTP comum por padrão e a configuração não abre exceção | Plataforma |
| SEG10 | Pasta oculta do Drive com acesso só pela sua conta; Google como operador aceito (SL24) | Adaptador do Drive |
| SEG11 | Nenhuma chave de serviço no app; chave da IA só como segredo do Worker; token do Google no Keystore via expo-secure-store; varredura de segredos no CI | Worker, adaptador do sistema, CI |
| SEG12 | Bloqueio opcional com expo-local-authentication, tempo de espera padrão de 5 minutos | Interface |
| SEG13 | O registro de falhas aceita só código, local e mensagem curta; um teste tenta gravar texto de comando e medida e falha | Adaptador de falhas |
| SEG14 | ApagarTudo apaga o banco e as cópias do Drive, com duas confirmações; sem internet, oferece apagar só o aparelho | Aplicação |
| SEG15 | Conteúdo externo só em campos de dados do contrato | Worker e contrato |
| SEG16 | Contrato sem operação de exclusão; validação recusa ficha inválida | Contrato e domínio |
| SEG17 | Somente plano pago de API sem treino com os dados; termos conferidos no SP03 | Worker |

O Worker não grava conteúdo de comandos: o log dele guarda só tipo, tokens, duração e custo, e o KV guarda só os contadores de gasto. Assim, o intermediário não vira um segundo lugar com dados de saúde.

### 11.1 Registro de falhas e mensagens de erro

Cada falha gera duas saídas com conteúdos diferentes: uma mensagem para você, que pode mostrar o valor digitado, e uma linha no registro local, que nunca guarda valor de medida, carga, texto de comando ou credencial (SEG13). Assim valem ao mesmo tempo a regra do CLAUDE.md (o erro diz o valor recebido e o formato esperado) e a especificação.

| Saída | Exemplo | Pode conter o valor? |
| --- | --- | --- |
| Mensagem na tela | "Cintura de 38 cm precisa ser maior que o pescoço (40 cm)." | Sim, é só para você e não é gravada |
| Exceção do domínio | Classe `ErroDeValidacao` com campo, regra e valor | Sim, só em memória |
| Registro local de falhas | Uma linha JSON por falha | Não: só campo e regra |

Formato de cada linha do registro, em JSON estruturado:

```json
{"quando":"2026-11-07T20:15:03Z","nivel":"erro","onde":"RegistrarMedicao","codigo":"MEDICAO_INVALIDA","campo":"cintura","esperado":"numero maior que pescoco","versaoApp":"0.3.0"}
```

O adaptador do registro só aceita essas chaves; qualquer outra é descartada antes de gravar. Um teste tenta registrar um texto de comando e um valor de medida e confere que nenhum dos dois chega ao arquivo.

## 12. Testes, TDD e CI

Todo código nasce de um teste vermelho, e tudo o que ainda não existe (banco, Drive, IA, telas) entra nos testes como um dublê com nome próprio. Para não deixar o dublê mentir, a mesma suíte de contrato roda contra ele e contra o adaptador real quando este for escrito.

### 12.1 Dublês: falsos em vez de mocks soltos

Você pediu mocks para classes e bancos ainda não desenvolvidos. A forma recomendada é o dublê falso: uma classe pequena que implementa a porta de verdade, em memória (RepositorioDeFichasEmMemoria guarda as fichas num Map). Mocks gerados pelo Jest ficam só para módulos de plataforma na borda, como câmera e biometria.

A diferença importa para código escrito por agentes. Um mock solto ("quando chamar salvar, devolva ok") deixa o teste passar mesmo que o caso de uso use a porta do jeito errado, e o agente tende a ajustar o mock até o teste ficar verde. Um falso se comporta como o banco: se o caso de uso esquecer de salvar a versão, a leitura seguinte não a encontra e o teste falha.

- **Teste de contrato por porta.** Uma suíte única, por exemplo `contratoRepositorioDeFichas(criar)`, roda contra o falso no início e contra o adaptador SQLite quando ele existir. Os dois precisam passar.
- **Respostas da IA.** A IAFalsa devolve respostas copiadas de respostas reais observadas no SP03, guardadas em `testes/dubles/respostas-ia/`.

### 12.2 Níveis

Os níveis seguem a seção 23.2 da especificação.

| Nível | O que testa | Como | Quando |
| --- | --- | --- | --- |
| N1 Domínio | Regras puras, casos CC01 a CC20 | Jest, sem dublês | A cada passo |
| N2 Aplicação | Casos de uso | Jest com os falsos | A cada passo |
| N3 Adaptadores | SQLite, migrações, arquivos, Drive | Suítes de contrato; SQLite pelo mesmo esquema Drizzle num driver Node; Drive com servidor HTTP falso | A cada commit |
| N4 Telas | Fluxos de tela | React Native Testing Library com os falsos | A cada commit |
| N5 IA | Comandos de referência (seção 23.6 da especificação) | Chamada real ao fornecedor, com custo | Antes de cada versão publicada |
| N6 Aparelho | Sessão real na academia, modo avião, fechamento forçado | Manual, no Poco M5s | Antes de cada versão publicada |

Testes de desempenho usam um banco gerado com 2 anos de histórico (cerca de 6.000 séries) e rodam no N6, porque o tempo no CI não representa o aparelho.

### 12.3 CI no GitHub Actions

A cada push e pull request: formatação, lint, checagem de tipos, regra de camadas (eslint-plugin-boundaries), testes N1 a N4, `npm audit` sem vulnerabilidade alta e varredura de segredos com gitleaks. A cada tag de versão: o mesmo, mais o build do APK assinado como artefato. A análise CodeQL do GitHub é paga para repositório privado, então a análise de segurança do MVP fica com ESLint (regras de segurança), auditoria de dependências e gitleaks.

### 12.4 Camadas da política de testes do CLAUDE.md

As cinco camadas do CLAUDE.md se aplicam a este projeto assim. Como não há servidor de produção além do Worker, "deploy" significa publicar um APK com tag de versão ou publicar o Worker.

| Camada | Neste projeto | Bloqueia |
| --- | --- | --- |
| Testes da história | N1 a N4 da história em andamento, a cada passo do ciclo vermelho, verde, refatoração | O commit |
| CI completo | Workflow do GitHub Actions da seção 12.3, rodado também localmente com `npm run ci` | O commit |
| Integração com dados reais | N5 (comandos de referência na IA real) e N6 (sessão real no Poco M5s, modo avião, fechamento forçado, restauração) | A tag de versão |
| Auditoria de segurança e cobertura | Ao fechar cada épico: revisão da tabela SEG da seção 11, `npm audit` completo, gitleaks no histórico inteiro, inspeção do JSON enviado à IA e relatório de cobertura do Jest | A próxima tag, se houver achado grave de segurança |
| Verificação em produção | Depois de instalar o APK: abrir, conferir a migração, registrar uma série, ver o backup na tela inicial e rodar um comando de IA; depois de publicar o Worker, um comando de teste | Nada; falha vira história de prioridade alta |

A cobertura é acompanhada pelo relatório, mas nunca bloqueia commit nem versão, como manda o CLAUDE.md.

## 13. Build, distribuição e ambientes

O MVP é distribuído como APK assinado, gerado pelo CI a cada tag e instalado direto no Poco M5s. A chave de assinatura é o item mais crítico desta seção: o Android só aceita atualizar o app com a mesma chave, e perdê-la obriga a desinstalar, o que apaga os dados locais.

### 13.1 Como o APK é gerado

- **No CI (padrão).** O workflow de tag roda `npx expo prebuild` e o build de release do Gradle, assina com a chave guardada nos segredos do GitHub e publica o APK como artefato da versão.
- **No seu Ubuntu (alternativa).** Os mesmos comandos, com o Android SDK instalado. Serve para depurar o build.
- **EAS Build (reserva).** O serviço de build do Expo tem plano gratuito com cota mensal; fica como reserva se o build local ou no CI der problema.

### 13.2 Chave de assinatura e login Google

1. Gerar a chave uma vez, fora do repositório.
2. Guardar a chave e a senha em dois lugares: nos segredos do GitHub e num gerenciador de senhas seu.
3. Cadastrar no Google Cloud um cliente OAuth Android com o nome do pacote e a impressão SHA-1 da chave de release, e outro com a de depuração. Sem isso, o login Google falha no aparelho, e o erro não diz o motivo.
4. Quando for para a Play Store, ativar a assinatura gerenciada pelo Google e cadastrar a nova SHA-1 que ela fornecer.

### 13.3 Ambientes

| Ambiente | App | Worker | Limite de gasto |
| --- | --- | --- | --- |
| Desenvolvimento | Build de depuração, nome "Treino (dev)", banco próprio | Worker de desenvolvimento, KV próprio | R$ 5 por mês |
| Produção | APK de release | Worker de produção | R$ 25 por mês |

Os dois apps têm identificadores de pacote diferentes, então convivem no mesmo celular sem que um teste apague seus treinos reais. A soma dos limites fecha nos R$ 30 do seu teto.

### 13.4 Aparelho

O Poco M5s com MIUI 14 deve rodar Android 12 ou 13; confira em Configurações, Sobre o telefone. As duas versões são atendidas pelo Expo. Para instalar o APK, é preciso permitir a instalação de apps desconhecidos para o navegador ou gerenciador de arquivos usado.

### 13.5 Comandos

Os comandos são scripts do `package.json`, para que você e os três agentes usem sempre os mesmos. O SP01 confirma cada um no projeto real.

```bash
npm ci                         # instalar e preparar (dependências travadas pelo package-lock)
npm run android                # rodar local: build de depuração no celular (expo run:android)
npm test                       # suíte inteira, sem interação nem rede (jest --ci)
npx jest caminho/arquivo.test.ts  # um arquivo de teste
npm run ci                     # CI completo: formatação, lint, tipos, camadas, testes, npm audit, gitleaks
npm run build:apk              # deploy do app: prebuild e APK de release assinado
npm run deploy:worker          # deploy do Worker (wrangler deploy)
npx prettier --write .         # formatador
```

O app usa build de depuração (`expo run:android`) em vez do Expo Go, porque o login Google e o SQLite com as configurações da seção 7 precisam de módulos nativos que o Expo Go não inclui.

### 13.6 Variáveis de ambiente

Só os nomes e para que servem; os valores nunca entram no repositório.

| Nome | Onde fica | Para que serve | Segredo? |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_WORKER_URL` | `.env` do app | Endereço do Worker de IA | Não: vai dentro do APK |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | `.env` do app | ID do cliente OAuth que o login usa para emitir o token de identidade | Não: vai dentro do APK |
| `IA_API_KEY` | Segredo do Worker | Chave do fornecedor de IA | Sim |
| `IA_FORNECEDOR` e `IA_MODELO` | Configuração do Worker | Qual adaptador e qual modelo usar | Não |
| `GOOGLE_CLIENT_ID` | Configuração do Worker | Destinatário esperado no token de identidade | Não |
| `CONTA_AUTORIZADA` | Segredo do Worker | Identificador da única conta Google aceita | Sim |
| `LIMITE_MENSAL_BRL` | Configuração do Worker | Teto de gasto do ambiente (25 em produção, 5 em desenvolvimento) | Não |
| `GASTO_IA` | Ligação KV do Worker | Contadores de gasto por mês | Não |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | Segredos do GitHub | Assinar o APK no CI | Sim |
| `CLOUDFLARE_API_TOKEN` | Segredo do GitHub | Publicar o Worker pelo CI | Sim |

Toda variável com prefixo `EXPO_PUBLIC_` é embutida no APK e pode ser lida por quem o extrair. Por isso nenhum segredo pode usar esse prefixo, e o gitleaks no CI procura chaves no código.

## 14. Custos estimados

Tudo, exceto a IA, cabe em planos gratuitos, então o teto de R$ 30 por mês fica praticamente inteiro para a IA. Os valores abaixo são aproximados, vindos de conhecimento geral e não de páginas de preço conferidas; o spike SP03 confirma os da IA antes de qualquer gasto.

| Item | Plano | Custo mensal | Observação |
| --- | --- | --- | --- |
| Cloudflare Workers e KV | Gratuito | R$ 0 | Limites diários muito acima de um usuário |
| Google Drive | Sua conta | R$ 0 | Poucos megabytes dentro dos 15 GB gratuitos |
| Login Google (OAuth) | Gratuito | R$ 0 | Sem custo para este uso |
| GitHub privado e Actions | Gratuito | R$ 0 | Minutos gratuitos mensais bastam para lint, testes e alguns builds |
| Play Store | Taxa única de cadastro de desenvolvedor | R$ 0 no MVP | Paga uma vez, só quando publicar na loja |
| IA | Pago por uso | Até R$ 25 (produção) e R$ 5 (desenvolvimento) | Bloqueado pelo Worker ao atingir o limite |

**Quanto rende a IA.** Uma avaliação de 4 semanas deve enviar algo como 20 mil tokens e receber 2 mil. Nos modelos econômicos, isso fica na ordem de centavos de real por comando, o que daria de algumas centenas a mais de mil comandos por mês dentro de R$ 25. A estimativa é grosseira: o preço por token varia muito entre modelos, e a compra em dólar tem câmbio e IOF. O SP03 mede o custo real por tipo de comando e ajusta a tabela de preços usada pelo contador do Worker.

O cadastro de cobrança no fornecedor de IA exige cartão internacional. Vale configurar também o limite de gasto no painel do próprio fornecedor, como segunda trava além do Worker.

## 15. Riscos técnicos e spikes

Cinco pontos desta arquitetura dependem de algo que só se sabe testando, e cada um vira um spike antes da história que depende dele. Spike é código descartável numa branch própria; a resposta vai para as notas de domínio do CLAUDE.md, e a implementação volta como história com TDD.

### 15.1 Spikes

| Código | Pergunta | Critério de saída | Antes de |
| --- | --- | --- | --- |
| SP01 | O esqueleto Expo, SQLite, Drizzle e login Google funciona num APK de release no Poco M5s? | APK instalado, migração aplicada, login concluído; versões fixadas | BL01 |
| SP02 | Quanto pesa e quanto demora uma cópia completa para o Drive? | Tamanho e tempo com 2 anos de histórico gerado; abaixo de 20 MB mantém a cópia completa | Backup (RF17) |
| SP03 | Qual fornecedor de IA entrega fidelidade, português e leitura de foto pelo menor custo? | Comandos de referência rodados em três modelos; custo por comando medido; termos de dados conferidos | Comandos de IA (RF11, RF12) |
| SP04 | O app abre em até 3 s e a semana em até 2 s com 6.000 séries no aparelho? | Tempos medidos no Poco M5s | Telas de análise (RF09, RF20) |
| SP05 | A versão gratuita do SheetJS grava as listas suspensas do modelo XLSX? | Arquivo aberto no Excel e no Google Planilhas com as listas funcionando | Modelo de importação (RF13) |

O SP05 existe porque, até onde sei, a gravação de validação de dados (as listas suspensas) não está na edição gratuita do SheetJS. Se isso se confirmar, as opções são gerar o XLSX do modelo por outra biblioteca ou levar as listas para a aba de Instruções.

### 15.2 Riscos técnicos

| Código | Risco | Impacto | Resposta |
| --- | --- | --- | --- |
| RT01 | Perder a chave de assinatura do APK | Alto: atualizar exige desinstalar e restaurar do backup | Chave em dois lugares (13.2) |
| RT02 | MIUI encerrar o app no meio da gravação ou do backup | Alto se perder série; baixo para backup | Transação por série; backup como pendência gravada (8.2) |
| RT03 | Agentes violarem a regra de camadas | Médio: o núcleo deixa de ser testável sem interface | eslint-plugin-boundaries bloqueia no CI |
| RT04 | Dublê falso divergir do adaptador real | Médio: testes verdes com app quebrado | Suítes de contrato rodando nos dois (12.1) |
| RT05 | Mudança de preço ou termos do fornecedor de IA | Médio | Adaptador trocável no Worker; limite de gasto em dois lugares |
| RT06 | Atualização do Expo quebrar módulos nativos | Médio | Versões fixadas; atualizar só entre versões, com o N6 completo |
| RT07 | Token do Google expirar no meio de um comando ou backup | Baixo | Renovação silenciosa e uma nova tentativa antes de mostrar erro |

## 16. Pendências e próximos passos

As três decisões propostas aqui foram confirmadas em 4 de novembro de 2026, e nada mais impede começar pelo SP01.

### 16.1 Confirmadas

- [x] Guardar duas cópias de backup em vez de uma (seção 2.3)
- [x] No drop-set, recordes e 1RM usam só a primeira etapa, e o RIR é o da última (seção 7.2)
- [x] Nomes de código em português (seção 6)

### 16.2 Próximos passos

1. Atualizar a especificação com as lacunas resolvidas na seção 2.2, a etapa de drop-set, a sessão sem ficha e a RES07 sem o iPhone (só Android e web).
2. Completar no CLAUDE.md a stack, as pastas, os comandos, o teto de custo e as variáveis de ambiente.
3. Criar o repositório privado e o projeto no Google Cloud (cliente OAuth) e na Cloudflare.
4. Rodar o SP01 e fixar as versões.
5. Escrever o BACKLOG.md a partir da seção 26 da especificação, começando por BL01 (modelo de dados versionado).

<!-- Template do framework de vibe coding v0.6, 2026-11-07 -->
# App de Treino com IA (NutriFit)

Nome do app: NutriFit (provisório, pode mudar). Pacotes Android: `com.ehbds.nutrifit` (release) e `com.ehbds.nutrifit.dev` (desenvolvimento, nome "NutriFit (dev)").

App Android de uso pessoal para registrar treinos de musculação série a série e usar IA, somente sob comando, para avaliar, criar e adaptar fichas. Não é app de nutrição, rede social nem produto para várias pessoas.
Stack: TypeScript estrito; React Native com Expo (gerenciado, com prebuild) e Expo Router; SQLite (expo-sqlite) com Drizzle ORM; sem jobs em segundo plano (backup como pendência gravada); APK assinado pelo GitHub Actions e Worker no Cloudflare. Versões fixadas no spike SP01.
Guia único para qualquer agente de código (Claude Code, Codex, Gemini CLI). As histórias ficam no BACKLOG.md. Aqui fica o que muda pouco; mantenha este arquivo abaixo de 200 linhas e sem instruções de uma ferramenta específica (essas ficam no CLAUDE.md ou na configuração da ferramenta).
Fontes: docs/especificacao.md ("Especificação de Requisitos: App de Treino com IA", 2026-10-29) e docs/arquitetura.md ("Arquitetura: App de Treino com IA", 2026-11-04). Seção com número decimal (12.3, 13.8) é da especificação; seção de número inteiro é deste arquivo, salvo quando o texto diz "da especificação" ou "da arquitetura". Os códigos RF, RB, RNF, SEG, RES, SL e CC são da especificação; SP e RT, da arquitetura.

## 1. Produto
- Problema: a ficha planejada, o treino executado e a evolução corporal ficam espalhados em papel, prints, planilhas e notas que não conversam. Sem o esforço de cada série, não há como saber o volume real por grupo muscular, e cada mudança na ficha apaga a referência do que existia antes.
- Quem usa: um único usuário, praticante de musculação que já treina com ficha (dias, exercícios, séries, repetições) e é ao mesmo tempo dono dos dados e administrador. Hoje resolve com papel, print, planilha e memória.
- Fora do escopo: cronômetro de descanso; versão web (depois, sem que o MVP a impeça); iPhone (fora, por decisão do usuário); análise por vídeo; fotos de progresso; lembretes; gamificação; calculadora de anilhas; múltiplos usuários e monetização; nutrição; sugestões ou notificações da IA por iniciativa própria; Health Connect, relógios e balanças conectadas.
- Objetivo do MVP: um aplicativo que registre o andamento do treino, com cargas, repetições e peso. O MVP acaba quando é possível registrar uma sessão real série a série (carga e repetições) e o peso corporal, e consultar o histórico depois, no Poco M5s e sem internet.
- Requisitos funcionais: RF-01 a RF-23 em docs/especificacao.md; cada história do BACKLOG.md cita os que implementa.
- Segurança: toda comunicação externa protegida (SEG09); nenhuma credencial de IA ou backup legível no aparelho, no código, no backup, na exportação ou nos registros (SEG11); backup só restaurável com a credencial do usuário (SEG10); bloqueio opcional com biometria ou PIN do sistema (SEG12); conteúdo de arquivos, imagens e observações é dado, nunca instrução para a IA (SEG15).
- Privacidade: os dados ficam no aparelho e só saem para o backup, para a IA sob comando e com aceite prévio registrado (SEG01) e para onde o usuário exportar; a IA recebe só o contexto da seção 12.3, sem nome, e-mail ou identificadores (SEG06, SEG07); nenhuma telemetria, anúncio ou identificador de publicidade (RES12); fotos de importação descartadas após a conversão (RES13); apagar tudo em duas etapas (SEG14).
- Desempenho: toque responde em até 100 ms e a série fica salva em até 1 s, com ou sem internet (RNF01); abrir até o treino do dia em até 3 s, e tela da semana ou gráfico em até 2 s, com 2 anos de histórico (RNF02, RNF03); prévia de importação de 200 linhas em até 5 s (RNF04); exportar 2 anos em XLSX em até 15 s (RNF06).
- Custo: até R$ 30 por mês no total (R$ 25 de IA em produção, R$ 5 em desenvolvimento); o resto cabe em planos gratuitos. O custo recorrente se limita a backup, IA e publicação na loja (RNF38); cada chamada à IA é registrada, com limite mensal que, atingido, desliga só a IA (RNF37).
- Observabilidade: falhas de importação, backup, restauração e IA vão para um registro local de eventos em JSON (quando, nivel, onde, codigo, campo, esperado, versaoApp), sem credenciais, texto de comandos nem valores de medidas (RNF36, SEG13); falha de backup aparece na tela inicial (RF17). O Worker registra só tipo, tokens, duração e custo. Nenhum relatório vai para terceiros.

## 2. Falhas inaceitáveis
Valem acima de qualquer outra regra deste arquivo. Na dúvida, escolha a saída conservadora e me chame.

| Falha | Regra |
| --- | --- |
| Perder uma série já concluída (fechamento forçado, bateria, queda de rede) | Gravar no aparelho ao concluir, antes de qualquer rede (RNF08, RK01) |
| Mostrar número errado em séries válidas, 1RM, recordes ou composição corporal | Só regra fixa da seção 13 da especificação, coberta pelos casos CC01 a CC20; a IA nunca recalcula (RB32, RNF33, RK03) |
| IA alterar a ficha além do pedido ou mexer em exercício travado | Validar antes de aplicar; aplica por inteiro ou nada; comando ambíguo vira pergunta, sem alteração (RB05, RB29, RNF09, RK04) |
| Apagar ou alterar versão de ficha, sessão registrada ou histórico | Nada é apagado; desfazer cria versão nova; ficha ou exercício com histórico só é arquivado (RB02, RB03, RB04) |
| Importação ou restauração substituir ou corromper dados sem o usuário saber | Nada é gravado antes da confirmação; restaurar sobre dados existentes exige confirmação explícita; falha no meio deixa tudo como estava (RB34, RF18, RNF09, RK02) |
| Dado de saúde ou credencial sair do aparelho sem o usuário saber | Sem aceite registrado, nenhuma chamada à IA; enviar só o contexto da seção 12.3; credencial nunca no aparelho, nos registros ou na exportação (SEG01, SEG07, SEG11, RK05) |

## 3. Arquitetura
Hexagonal: o domínio no centro, sem importar nada de fora; a aplicação declara portas; adaptadores as implementam; só a composição liga tudo.
```
app/src/dominio/       # entidades, objetos de valor e regras puras (série válida, 1RM, Marinha)
app/src/aplicacao/     # casos de uso (um por arquivo, método executar) e portas (interfaces)
app/src/adaptadores/   # sqlite, google-drive, ia, arquivos, sistema
app/src/interface/     # telas, componentes, estado de tela (Zustand), textos/
app/src/composicao/    # liga cada porta ao seu adaptador; único lugar que conhece todos
app/app/               # rotas do Expo Router, finas
app/testes/dubles/     # falsos em memória (RepositorioDeFichasEmMemoria, IAFalsa, RelogioFixo)
app/testes/casos-de-referencia/  # CC01 a CC20 e a ficha de referência
worker/src/            # rota de IA, autenticação, limite de gasto, adaptador de fornecedor
compartilhado/contrato-ia/       # esquemas Zod usados pelo app e pelo Worker
```
- Camadas: domínio importa só domínio; aplicação importa domínio; adaptadores importam aplicação e domínio; interface importa aplicação e tipos do domínio, nunca adaptadores. O eslint-plugin-boundaries barra o resto no CI.
- Fronteiras: o SQLite do aparelho é a fonte da verdade e funciona sem internet. Saem do aparelho: o Worker de IA por HTTPS, autenticado pelo token de identidade do Google (INT01); a pasta oculta do app no Google Drive, permissão drive.appdata (INT02); arquivos, compartilhamento e câmera do sistema (INT03 a INT05).
- Decisões:
  - React Native + Expo em TypeScript → multiplataforma na linguagem que o usuário revisa; Flutter exigiria Dart, Kotlin nativo impediria a web.
  - Android no MVP e web depois, sem iPhone → decisão do usuário (RES06, RES07 revisada).
  - Chave da IA só no Worker; o app se autentica com o token do Google → nenhum segredo no APK (SEG11).
  - Fornecedor de IA trocável por configuração do Worker, só plano pago que não treina com os dados → RES19, SEG17; escolha final no SP03.
  - Backup: cópia completa do banco no Drive, duas cópias guardadas, proteção padrão do Google → mais simples que incremental; Google como operador aceito (SL17, SL24).
  - Carga em gramas e circunferências em milímetros, inteiros → sem erro de arredondamento nos recordes.
  - Identificadores UUID v7 gerados no aparelho → base para a web sem colisão.
  - Números calculados pelo app, nunca pela IA → valores confiáveis e testáveis (RB32).
  - Modelo de dados versionado (drizzle-kit), cópia do banco antes de migrar → migração sem perda (BL01, RNF13, RNF32).
- Prefira o padrão do framework e a opção mais simples que funcione.

Modelo de dados (diagrama ER em docs/modelo-de-dados.md, gerado do esquema; vínculos da seção 18.6 da especificação):
- Ficha → Versão da ficha → Rotina → Item → Série planejada; versões só recebem inserção
- Sessão → Exercício da sessão → Série executada → Etapa de drop-set; sessão aceita ficha e versão vazias (treino livre)
- Demais entidades e o que é único ou obrigatório: completar na US-001, a partir do esquema

## 4. Comandos
```bash
npm ci                            # instalar e preparar
npm run android                   # rodar local: build de depuração no celular (não usar Expo Go)
npm test                          # suíte inteira, sem interação nem rede
npx jest caminho/arquivo.test.ts  # um arquivo de teste
npm run ci                        # CI completo: formatação, lint, tipos, camadas, testes, npm audit, gitleaks
npm run build:apk                 # deploy do app: APK de release assinado
npm run deploy:worker             # deploy do Worker
```

## 5. Convenções e estilo de código
Do projeto:
- Caso de uso → uma classe por arquivo, portas no construtor, um método `executar` → app/src/aplicacao/casos-de-uso/ (exemplo definido na primeira história)
- Objeto de valor → todo número com regra (Rir 0 a 5, Carga em gramas, MetaDeSerie) nasce validado; valor inválido não se constrói
- Porta nova → interface em aplicacao/portas, falso em testes/dubles e suíte de contrato que roda nos dois
- Alteração composta (importação, ação da IA, restauração) → sempre pela UnidadeDeTrabalho, numa transação
- Nomes de código em português, com as palavras da especificação; termos técnicos sem tradução comum ficam em inglês.
- Regras de cálculo ficam em funções puras, testáveis sem interface (RNF33).
- Cálculos em kg e cm; lb e arredondamento só na exibição (seção 13.1 da especificação).
- O formato canônico da ficha (seção 11 da especificação, versão 1) é o único usado por modelo, importação e exportação (RB38).
- Todo texto exibido ao usuário fica em português do Brasil, em um único lugar (RES23, RNF35).
- Use o que o framework já oferece antes de criar o seu.

Estilo (ajuste ou apague o que não servir):
- Funções de 4 a 20 linhas; arquivos com menos de 500. Divida por responsabilidade.
- Nomes específicos e únicos; evite `data`, `handler`, `Manager`.
- Sem duplicação: extraia a lógica comum.
- Retorno antecipado em vez de ifs aninhados; no máximo 2 níveis de indentação.
- Mensagem de erro na tela diz o valor recebido e o formato esperado; o registro de falhas guarda só campo e regra, nunca o valor (SEG13).
- Dependências entram por parâmetro ou construtor; biblioteca externa fica atrás de uma interface do projeto.
- Comentário explica o porquê, não o quê. Não apague seus comentários ao refatorar.
- Formatador padrão da linguagem (`npx prettier --write .`); nenhuma discussão de estilo além dele.
- Log estruturado em JSON para depuração; texto simples só para quem usa.

## 6. Fluxo por história
Toda história passa pela skill `historia` (Red, minha aprovação, Green, Refactor, CI, meu aceite, commit). Valem sempre, dentro ou fora dela:
- Nenhum código de produção antes de um teste vermelho que eu aprovei.
- Não altere testes aprovados sem me pedir.
- Uma branch por história (nome `us-xxx`), criada antes de qualquer mudança e a partir do que já existe, sem apagar nem refazer o projeto. Um commit por história. Problema fora do escopo vira história nova no BACKLOG.md, não correção agora.
- Pare e me chame se precisar mudar a arquitetura, criar entidade ou relação nova, escrever migração que apague ou transforme dado existente, adicionar dependência, tocar numa falha inaceitável, se a solução estiver ficando complicada, ou se a história depender de algo que ninguém sabe ainda (nesse caso, proponha um spike).

## 7. Política de testes
| Camada | Quando roda | Bloqueia | Se falhar |
| --- | --- | --- | --- |
| Testes da história | a cada passo | o commit | é o trabalho da história |
| CI completo | antes de todo commit | o commit | corrigir; causa fora do escopo vira história |
| Integração com dados reais | antes de cada deploy | o deploy | cada falha vira história; estrutural vira épico |
| Auditoria de segurança e cobertura, por agentes de dois fornecedores | ao fechar cada épico | o próximo deploy, se houver achado grave de segurança | cada achado vira história |
| Verificação em produção | após cada deploy | nada | história de prioridade alta |

Neste projeto, "deploy" é uma tag de versão do APK ou a publicação do Worker. Integração com dados reais = N5 (comandos de referência na IA real) e N6 (sessão real no Poco M5s, modo avião, fechamento forçado, restauração). Verificação em produção = abrir o APK instalado, registrar uma série, ver o backup e rodar um comando de IA.

- Todo bug ganha teste de regressão.
- Dublê é um falso em memória que implementa a porta, não um mock solto; a suíte de contrato da porta roda contra o falso e contra o adaptador real. Mock do Jest só para módulos de plataforma (câmera, biometria).
- Os casos CC01 a CC20 (seção 13.8 da especificação) são testes fixos de resultado conhecido.
- Testes de desempenho usam 2 anos de histórico, cerca de 6.000 séries (seção 14.1).
- Serviço externo nos testes é uma classe fake com nome próprio, e a resposta simulada copia uma resposta real observada.
- Nunca engula erro (catch vazio, retorno vazio sem log): registre o detalhe técnico e avise.
- Cobertura de testes é sinal: acompanhe, mas nunca bloqueie commit ou deploy por ela.

## 8. Nunca faça
- Expor segredo no código, no log ou na saída do terminal. Não rode `env`, `printenv` nem `cat .env`; para conferir uma chave, mostre só o prefixo e o tamanho. Se um segredo vazar, me avise para trocá-lo.
- Editar ou reordenar uma migração já aplicada. Mudança no esquema é sempre uma migração nova.
- Adicionar dependência sem justificar.
- Refatorar o que não faz parte da história.
- Pular lint ou testes, ou mudar um teste só para ele passar.
- Deixar a IA calcular séries válidas, 1RM, recordes ou composição corporal → ela só interpreta os valores do app (RB32).
- Enviar à IA identificador do usuário ou dado além do listado na seção 12.3 → privacidade e minimização (SEG06, SEG07).
- Guardar fotos de importação no app ou no backup → o MVP não armazena imagens do usuário (RES13).
- Adicionar telemetria, anúncios ou relatório de falhas para terceiros → os dados são só do usuário (RES12).
- Fazer o registro de treino depender de internet → ele precisa funcionar dentro da academia (RES08).
- Importar adaptador, React, Expo ou Drizzle no domínio ou na aplicação → o núcleo deixa de ser testável sem interface.
- Pôr segredo em variável `EXPO_PUBLIC_` → ela é embutida no APK e pode ser lida por quem o extrair.
- Depender de tarefa em segundo plano → a MIUI do aparelho de teste encerra processos; use pendência gravada no banco.
- Atualizar, apagar ou sobrescrever versão de ficha → versões só recebem inserção (RB02).

## 9. Checklist antes do commit
- [ ] Todo critério de aceite tem teste, e o teste nasceu vermelho
- [ ] CI completo verde
- [ ] Nenhum erro engolido; toda falha gera log e aviso
- [ ] Entradas externas validadas; nenhum segredo no código, no log ou na saída
- [ ] Nada alterado fora do escopo da história
- [ ] Comportamento mudou? README e este arquivo atualizados
- [ ] Esquema mudou? Migração nova, testada em banco vazio e em banco com dados, e diagrama ER em docs/modelo-de-dados.md regenerado
- [ ] Obstáculo novo registrado na seção 10; descoberta sobre o domínio, na seção 11

## 10. Obstáculos conhecidos
<!-- Cresce durante o projeto. Formato: regra → por quê (o que quebrou e quando) -->
- Compilar o APK só no GitHub Actions → o ambiente do agente não tem Java nem Android SDK (SP01, 2026-11-10)
- O token do GitHub do agente precisa do escopo `workflow` → sem ele o push de `.github/workflows/` é recusado (SP01)
- `app/AGENTS.md` veio do template do Expo (`npx expo install`, consultar a documentação da versão); manter e fundir o útil aqui na US-001; ignorar a recomendação de EAS → o build é no GitHub Actions (SP01)
- Migrações do Drizzle no Expo exigem `babel-plugin-inline-import` e a extensão `sql` no `metro.config.js` → sem os dois o app não lê os `.sql` (SP01)
- Login Google exige cliente OAuth Android com o pacote e o SHA-1 do keystore de release; `DEVELOPER_ERROR` indica pacote ou SHA-1 diferentes (SP01)
- Fixar `react-dom` na mesma versão do `react` (19.3.0) → o par do Expo Router puxa a 19.3.1 e o `npm install` falha com ERESOLVE (US-041a)

## 11. Notas de domínio
Spike = experimento descartável para responder uma pergunta: branch spike/[tema], sem testes, nunca entra na main. A resposta fica aqui; o código é descartado, e a implementação volta como história, com TDD.
<!-- Preenchida no C0 e a cada spike. Formato: pergunta → resposta → como descobrimos (pesquisa ou spike) -->
- Quais versões ficam fixadas? → Expo SDK 58 (expo 58.0.23), React Native 0.88.1, React 19.3.0, TypeScript 6.0.3, expo-sqlite 58.0.15, expo-secure-store 58.0.2, expo-dev-client 58.0.18, @react-native-google-signin/google-signin 17.0.0, drizzle-orm 0.45.4, drizzle-kit 0.31.11, babel-plugin-inline-import 3.0.0 (justificativa: ler migrações `.sql`); pacote `com.ehbds.nutrifit`; atualizar só entre versões e com o N6 completo (RT06) → SP01, APK de release instalado, gravação no SQLite e login Google funcionando
- Quando uma série é válida? → série de trabalho por repetições com RIR até o limiar (padrão 3, configurável); aquecimento, tempo, cardio e séries sem RIR ficam fora → especificação, RB12 e seção 13.2
- Como contar séries por grupo? → fracionado (padrão): direto 1, indireto 0,5; total: 1 e 1; direto: 1 e 0; unilateral conta uma vez; semana de segunda a domingo → pesquisa (meta-regressão de Pelland e colegas), seção 13.3
- Como estimar o 1RM? → Brzycki: carga × 36 ÷ (37 − n), com n = repetições + RIR, só para n de 1 a 10; RIR 5 gera limite inferior "≥" → pesquisa (Mayhew e colegas, 1995), seção 13.4
- Como calcular o percentual de gordura? → Marinha (Hodgdon e Beckett), versão em polegadas: converter cm ÷ 2,54 antes, log10. Masculino: 86,010 × log10(cintura − pescoço) − 70,041 × log10(altura) + 36,76. Feminino: 163,205 × log10(cintura + quadril − pescoço) − 97,684 × log10(altura) − 78,387. Cintura precisa ser maior que pescoço no masculino; margem de 3 a 4 pontos → pesquisa, seção 13.6
- Como ler a relação cintura-estatura? → cintura ÷ altura, duas casas; abaixo de 0,40 sem rótulo, 0,40 a 0,49 sem risco aumentado, 0,50 a 0,59 risco aumentado, 0,60 ou mais risco maior, pelo valor exibido → pesquisa (NICE NG246), seção 13.6
- Quais limites a IA respeita? → aumento de carga até 10% sobre a maior dos últimos 30 dias; até 30 séries fracionadas por grupo na semana; sem histórico, carga em branco; duas propostas rejeitadas encerram o comando → confirmado pelo usuário (SL08), seção 12.5
- Como registrar drop-set? → cada etapa guarda carga e repetições; a série conta uma vez nas válidas; RIR é o da última etapa; recordes e 1RM usam só a primeira etapa → decisão do usuário (SL16), arquitetura 7.2
- Treino livre existe? → sim, sessão sem ficha nem versão → decisão do usuário (SL18)
- Composição corporal → relação cintura-estatura é o método principal padrão → confirmado (SL11)
- Conversões → 1 kg = 2,20462 lb; 1 pol = 2,54 cm (só na fórmula da Marinha) → seção 13.7

## 12. Variáveis de ambiente
- `EXPO_PUBLIC_WORKER_URL` → endereço do Worker de IA (público, vai no APK)
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` → cliente OAuth que emite o token de identidade (público)
- `IA_API_KEY` → chave do fornecedor de IA (segredo do Worker)
- `IA_FORNECEDOR`, `IA_MODELO` → adaptador e modelo de IA (configuração do Worker)
- `GOOGLE_CLIENT_ID` → destinatário esperado no token de identidade (configuração do Worker)
- `CONTA_AUTORIZADA` → única conta Google aceita pelo Worker (segredo do Worker)
- `LIMITE_MENSAL_BRL` → teto de gasto de IA do ambiente (configuração do Worker)
- `GASTO_IA` → ligação KV com os contadores de gasto (Worker)
- `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` → assinatura do APK (segredos do GitHub)
- `CLOUDFLARE_API_TOKEN` → publicar o Worker pelo CI (segredo do GitHub)
<!-- Só o nome e para que serve; nunca o valor -->

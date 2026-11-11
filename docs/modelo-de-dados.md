# Modelo de dados

<!-- Gerado por app/scripts/gerar-modelo-de-dados.js a partir do esquema. Não edite à mão:
     rode `npm run modelo-de-dados` em app/ depois de gerar uma migração. -->

Vínculo `||` é obrigatório e `|o` é opcional. PK é a chave primária, FK aponta para outra
tabela e UK é único. Valores calculados (seção 18.6 da especificação) não são guardados.

```mermaid
erDiagram
  acao_ia {
    text id PK
    text comando
    text criada_em
    text tipo
    text resultado
    text versao_criada_id FK "opcional"
    text resumo "opcional"
    integer desfeita
  }
  copia_backup {
    text id PK
    text criada_em
    text resultado
    text conteudo "opcional"
  }
  etapa_drop_set {
    text id PK
    text serie_executada_id FK
    integer posicao
    integer carga_gramas
    integer repeticoes
  }
  exercicio {
    text id PK
    text nome
    text situacao
    text origem
    integer unilateral
    text equipamento "opcional"
  }
  exercicio_grupo {
    text id PK
    text exercicio_id FK
    text grupo_id FK
    text papel
  }
  exercicio_sessao {
    text id PK
    text sessao_id FK
    text exercicio_id FK
    text item_origem_id FK "opcional"
    integer posicao
    text observacoes "opcional"
  }
  exercicio_sinonimo {
    text id PK
    text exercicio_id FK
    text texto
  }
  ficha {
    text id PK
    text nome
    text situacao
    text origem
    text criada_em
  }
  grupo_muscular {
    text id PK
    text nome
  }
  item {
    text id PK
    text rotina_id FK
    text exercicio_id FK
    integer posicao
    text grupo_sequencia "opcional"
    integer unilateral
    integer travado
    text observacoes "opcional"
  }
  medicao_corporal {
    text id PK
    text data
    integer peso_gramas "opcional"
    integer cintura_mm "opcional"
    integer pescoco_mm "opcional"
    integer quadril_mm "opcional"
    text removida_em "opcional"
  }
  meta_semanal {
    text id PK
    text grupo_id FK
    integer valor_centesimos
  }
  perfil {
    text id PK
    integer unico
    text objetivo "opcional"
    text objetivo_outro "opcional"
    text nivel "opcional"
    text limitacoes "opcional"
    text equipamentos "opcional"
    text sexo "opcional"
    integer altura_mm "opcional"
    text unidade_carga "opcional"
    integer limiar_rir "opcional"
    text metodo_contagem "opcional"
    text metodo_composicao "opcional"
    integer bloqueio_ativo "opcional"
    integer bloqueio_espera_segundos "opcional"
  }
  rotina {
    text id PK
    text versao_id FK
    text nome
    integer dia_semana "opcional"
    integer posicao
  }
  serie_executada {
    text id PK
    text exercicio_sessao_id FK
    integer posicao
    text tipo
    integer carga_gramas "opcional"
    integer repeticoes "opcional"
    integer repeticoes_outro_lado "opcional"
    integer segundos "opcional"
    integer segundos_outro_lado "opcional"
    integer rir "opcional"
    text tecnica "opcional"
    text concluida_em
    text removida_em "opcional"
  }
  serie_planejada {
    text id PK
    text item_id FK
    integer posicao
    text meta_tipo
    integer meta_minimo "opcional"
    integer meta_maximo "opcional"
    integer meta_segundos "opcional"
    integer carga_gramas "opcional"
    text tecnica "opcional"
    integer descanso_segundos "opcional"
  }
  sessao {
    text id PK
    text inicio
    text fim "opcional"
    text ficha_id FK "opcional"
    text versao_id FK "opcional"
    text rotina_id FK "opcional"
    text situacao
    text observacao "opcional"
  }
  versao_ficha {
    text id PK
    text ficha_id FK
    integer numero
    text autor
    text criada_em
    text motivo "opcional"
    text resumo "opcional"
  }
  versao_ficha |o--o{ acao_ia : "versao_criada_id"
  serie_executada ||--o{ etapa_drop_set : "serie_executada_id"
  exercicio ||--o{ exercicio_grupo : "exercicio_id"
  grupo_muscular ||--o{ exercicio_grupo : "grupo_id"
  sessao ||--o{ exercicio_sessao : "sessao_id"
  exercicio ||--o{ exercicio_sessao : "exercicio_id"
  item |o--o{ exercicio_sessao : "item_origem_id"
  exercicio ||--o{ exercicio_sinonimo : "exercicio_id"
  rotina ||--o{ item : "rotina_id"
  exercicio ||--o{ item : "exercicio_id"
  grupo_muscular ||--o{ meta_semanal : "grupo_id"
  versao_ficha ||--o{ rotina : "versao_id"
  exercicio_sessao ||--o{ serie_executada : "exercicio_sessao_id"
  item ||--o{ serie_planejada : "item_id"
  ficha |o--o{ sessao : "ficha_id"
  versao_ficha |o--o{ sessao : "versao_id"
  rotina |o--o{ sessao : "rotina_id"
  ficha ||--o{ versao_ficha : "ficha_id"
```

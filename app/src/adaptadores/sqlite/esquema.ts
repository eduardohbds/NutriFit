// Esquema do banco local (Drizzle). Tabelas da seção 18.2 da especificação com os ajustes da
// arquitetura 7.2. Carga em gramas, circunferências em milímetros, datas ISO 8601 UTC em texto.
// Valores calculados (seção 18.6) nunca viram coluna.
import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  sqliteTable,
  text,
  unique,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';

const id = () => text('id').primaryKey();
const booleano = (nome: string) => integer(nome, { mode: 'boolean' }).notNull().default(false);

// CHECK que aceita nulo: só recusa valor preenchido e negativo.
const naoNegativo = (nome: string, coluna: AnySQLiteColumn) =>
  check(nome, sql`${coluna} IS NULL OR ${coluna} >= 0`);

export const perfil = sqliteTable(
  'perfil',
  {
    id: id(),
    // Coluna fixa em 1 e única: garante um só perfil por instalação.
    unico: integer('unico').notNull().default(1).unique(),
    objetivo: text('objetivo'),
    objetivoOutro: text('objetivo_outro'),
    nivel: text('nivel'),
    limitacoes: text('limitacoes'),
    equipamentos: text('equipamentos', { mode: 'json' }).$type<string[]>(),
    sexo: text('sexo'),
    alturaMm: integer('altura_mm'),
    unidadeCarga: text('unidade_carga'),
    limiarRir: integer('limiar_rir'),
    metodoContagem: text('metodo_contagem'),
    metodoComposicao: text('metodo_composicao'),
    bloqueioAtivo: integer('bloqueio_ativo', { mode: 'boolean' }),
    bloqueioEsperaSegundos: integer('bloqueio_espera_segundos'),
  },
  (t) => [check('perfil_unico', sql`${t.unico} = 1`), naoNegativo('perfil_altura', t.alturaMm)],
);

export const grupoMuscular = sqliteTable('grupo_muscular', {
  id: id(),
  nome: text('nome').notNull().unique(),
});

export const metaSemanal = sqliteTable(
  'meta_semanal',
  {
    id: id(),
    grupoId: text('grupo_id')
      .notNull()
      .unique()
      .references(() => grupoMuscular.id),
    // Centésimos inteiros: 10,5 séries vira 1050, sem decimal no banco.
    valorCentesimos: integer('valor_centesimos').notNull(),
  },
  (t) => [check('meta_semanal_valor', sql`${t.valorCentesimos} >= 0`)],
);

export const exercicio = sqliteTable('exercicio', {
  id: id(),
  // Nome não é único: duplicados existem até serem mesclados (US-006).
  nome: text('nome').notNull(),
  situacao: text('situacao').notNull(),
  origem: text('origem').notNull(),
  unilateral: booleano('unilateral'),
  equipamento: text('equipamento'),
});

export const exercicioSinonimo = sqliteTable(
  'exercicio_sinonimo',
  {
    id: id(),
    exercicioId: text('exercicio_id')
      .notNull()
      .references(() => exercicio.id),
    texto: text('texto').notNull(),
  },
  (t) => [unique('exercicio_sinonimo_unico').on(t.exercicioId, t.texto)],
);

export const exercicioGrupo = sqliteTable(
  'exercicio_grupo',
  {
    id: id(),
    exercicioId: text('exercicio_id')
      .notNull()
      .references(() => exercicio.id),
    grupoId: text('grupo_id')
      .notNull()
      .references(() => grupoMuscular.id),
    papel: text('papel', { enum: ['direto', 'indireto'] }).notNull(),
  },
  (t) => [
    unique('exercicio_grupo_unico').on(t.exercicioId, t.grupoId),
    check('exercicio_grupo_papel', sql`${t.papel} IN ('direto', 'indireto')`),
  ],
);

// A versão atual da ficha é a de maior número; uma coluna aqui criaria vínculo circular.
export const ficha = sqliteTable(
  'ficha',
  {
    id: id(),
    nome: text('nome').notNull(),
    situacao: text('situacao').notNull(),
    origem: text('origem').notNull(),
    criadaEm: text('criada_em').notNull(),
  },
  (t) => [
    uniqueIndex('ficha_uma_ativa')
      .on(t.situacao)
      .where(sql`situacao = 'ativa'`),
  ],
);

export const versaoFicha = sqliteTable(
  'versao_ficha',
  {
    id: id(),
    fichaId: text('ficha_id')
      .notNull()
      .references(() => ficha.id),
    numero: integer('numero').notNull(),
    autor: text('autor').notNull(),
    criadaEm: text('criada_em').notNull(),
    motivo: text('motivo'),
    resumo: text('resumo'),
  },
  (t) => [unique('versao_ficha_numero').on(t.fichaId, t.numero)],
);

export const rotina = sqliteTable(
  'rotina',
  {
    id: id(),
    versaoId: text('versao_id')
      .notNull()
      .references(() => versaoFicha.id),
    nome: text('nome').notNull(),
    diaSemana: integer('dia_semana'),
    posicao: integer('posicao').notNull(),
  },
  (t) => [
    unique('rotina_posicao').on(t.versaoId, t.posicao),
    check('rotina_dia', sql`${t.diaSemana} IS NULL OR ${t.diaSemana} BETWEEN 1 AND 7`),
  ],
);

export const item = sqliteTable(
  'item',
  {
    id: id(),
    rotinaId: text('rotina_id')
      .notNull()
      .references(() => rotina.id),
    exercicioId: text('exercicio_id')
      .notNull()
      .references(() => exercicio.id),
    posicao: integer('posicao').notNull(),
    grupoSequencia: text('grupo_sequencia'),
    unilateral: booleano('unilateral'),
    travado: booleano('travado'),
    observacoes: text('observacoes'),
  },
  (t) => [unique('item_posicao').on(t.rotinaId, t.posicao)],
);

export const seriePlanejada = sqliteTable(
  'serie_planejada',
  {
    id: id(),
    itemId: text('item_id')
      .notNull()
      .references(() => item.id),
    posicao: integer('posicao').notNull(),
    metaTipo: text('meta_tipo').notNull(),
    metaMinimo: integer('meta_minimo'),
    metaMaximo: integer('meta_maximo'),
    metaSegundos: integer('meta_segundos'),
    cargaGramas: integer('carga_gramas'),
    tecnica: text('tecnica'),
    descansoSegundos: integer('descanso_segundos'),
  },
  (t) => [
    unique('serie_planejada_posicao').on(t.itemId, t.posicao),
    naoNegativo('serie_planejada_carga', t.cargaGramas),
    naoNegativo('serie_planejada_descanso', t.descansoSegundos),
  ],
);

// Ficha, versão e rotina vazias = treino livre (SL18); versão sem ficha não faz sentido.
export const sessao = sqliteTable(
  'sessao',
  {
    id: id(),
    inicio: text('inicio').notNull(),
    fim: text('fim'),
    fichaId: text('ficha_id').references(() => ficha.id),
    versaoId: text('versao_id').references(() => versaoFicha.id),
    rotinaId: text('rotina_id').references(() => rotina.id),
    situacao: text('situacao').notNull(),
    observacao: text('observacao'),
  },
  (t) => [check('sessao_versao_com_ficha', sql`${t.versaoId} IS NULL OR ${t.fichaId} IS NOT NULL`)],
);

export const exercicioSessao = sqliteTable('exercicio_sessao', {
  id: id(),
  sessaoId: text('sessao_id')
    .notNull()
    .references(() => sessao.id),
  exercicioId: text('exercicio_id')
    .notNull()
    .references(() => exercicio.id),
  // Vazio quando o exercício foi incluído só na sessão.
  itemOrigemId: text('item_origem_id').references(() => item.id),
  posicao: integer('posicao').notNull(),
  observacoes: text('observacoes'),
});

// Série removida ganha removida_em e sai dos cálculos, sem apagar o histórico.
export const serieExecutada = sqliteTable(
  'serie_executada',
  {
    id: id(),
    exercicioSessaoId: text('exercicio_sessao_id')
      .notNull()
      .references(() => exercicioSessao.id),
    posicao: integer('posicao').notNull(),
    tipo: text('tipo').notNull(),
    cargaGramas: integer('carga_gramas'),
    repeticoes: integer('repeticoes'),
    repeticoesOutroLado: integer('repeticoes_outro_lado'),
    segundos: integer('segundos'),
    segundosOutroLado: integer('segundos_outro_lado'),
    rir: integer('rir'),
    tecnica: text('tecnica'),
    concluidaEm: text('concluida_em').notNull(),
    removidaEm: text('removida_em'),
  },
  (t) => [
    naoNegativo('serie_executada_carga', t.cargaGramas),
    naoNegativo('serie_executada_repeticoes', t.repeticoes),
    naoNegativo('serie_executada_repeticoes_outro_lado', t.repeticoesOutroLado),
    naoNegativo('serie_executada_segundos', t.segundos),
    naoNegativo('serie_executada_segundos_outro_lado', t.segundosOutroLado),
    check('serie_executada_rir', sql`${t.rir} IS NULL OR ${t.rir} BETWEEN 0 AND 5`),
  ],
);

export const etapaDropSet = sqliteTable(
  'etapa_drop_set',
  {
    id: id(),
    serieExecutadaId: text('serie_executada_id')
      .notNull()
      .references(() => serieExecutada.id),
    posicao: integer('posicao').notNull(),
    cargaGramas: integer('carga_gramas').notNull(),
    repeticoes: integer('repeticoes').notNull(),
  },
  (t) => [
    unique('etapa_drop_set_posicao').on(t.serieExecutadaId, t.posicao),
    naoNegativo('etapa_drop_set_carga', t.cargaGramas),
    naoNegativo('etapa_drop_set_repeticoes', t.repeticoes),
  ],
);

export const medicaoCorporal = sqliteTable(
  'medicao_corporal',
  {
    id: id(),
    data: text('data').notNull(),
    pesoGramas: integer('peso_gramas'),
    cinturaMm: integer('cintura_mm'),
    pescocoMm: integer('pescoco_mm'),
    quadrilMm: integer('quadril_mm'),
    removidaEm: text('removida_em'),
  },
  (t) => [
    check(
      'medicao_corporal_alguma_medida',
      sql`COALESCE(${t.pesoGramas}, ${t.cinturaMm}, ${t.pescocoMm}, ${t.quadrilMm}) IS NOT NULL`,
    ),
    naoNegativo('medicao_corporal_peso', t.pesoGramas),
    naoNegativo('medicao_corporal_cintura', t.cinturaMm),
    naoNegativo('medicao_corporal_pescoco', t.pescocoMm),
    naoNegativo('medicao_corporal_quadril', t.quadrilMm),
  ],
);

export const acaoIa = sqliteTable('acao_ia', {
  id: id(),
  comando: text('comando').notNull(),
  criadaEm: text('criada_em').notNull(),
  tipo: text('tipo').notNull(),
  resultado: text('resultado').notNull(),
  versaoCriadaId: text('versao_criada_id').references(() => versaoFicha.id),
  resumo: text('resumo'),
  // Única alteração permitida depois de registrada (FL04).
  desfeita: booleano('desfeita'),
});

export const copiaBackup = sqliteTable('copia_backup', {
  id: id(),
  criadaEm: text('criada_em').notNull(),
  resultado: text('resultado').notNull(),
  // Totais copiados (fichas, versões, sessões, séries...), em JSON.
  conteudo: text('conteudo', { mode: 'json' }).$type<Record<string, number>>(),
});

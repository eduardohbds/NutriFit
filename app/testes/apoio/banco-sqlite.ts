import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';

import { GeradorUuidV7 } from '../../src/adaptadores/sistema/gerador-uuid-v7';

const pastaDeMigracoes = path.resolve(__dirname, '../../drizzle');

// SQLite real em memória com as migrações de produção aplicadas, para testar as regras do banco.
export function abrirBancoMigrado() {
  const banco = new Database(':memory:');
  banco.pragma('foreign_keys = ON');
  migrate(drizzle(banco), { migrationsFolder: pastaDeMigracoes });
  return banco;
}

type Banco = ReturnType<typeof abrirBancoMigrado>;
type Valores = Record<string, string | number | null>;

const gerador = new GeradorUuidV7();
const AGORA = '2026-11-10T16:45:00.000Z';

export function inserir(banco: Banco, tabela: string, valores: Valores): string {
  const linha = { id: gerador.gerar().valor, ...valores };
  const colunas = Object.keys(linha);
  const sql = `INSERT INTO ${tabela} (${colunas.join(', ')}) VALUES (${colunas.map((c) => `@${c}`).join(', ')})`;
  banco.prepare(sql).run(linha);
  return linha.id as string;
}

// Cadeia mínima válida da ficha até a série planejada, e da sessão até a série executada.
export function criarFichaComSerie(banco: Banco) {
  const ficha = inserir(banco, 'ficha', {
    nome: 'ABC',
    situacao: 'ativa',
    origem: 'manual',
    criada_em: AGORA,
  });
  const versao = inserir(banco, 'versao_ficha', {
    ficha_id: ficha,
    numero: 1,
    autor: 'usuario',
    criada_em: AGORA,
  });
  const rotina = inserir(banco, 'rotina', { versao_id: versao, nome: 'Treino A', posicao: 1 });
  const exercicio = inserir(banco, 'exercicio', {
    nome: 'Supino Reto',
    situacao: 'ativo',
    origem: 'inicial',
  });
  const item = inserir(banco, 'item', { rotina_id: rotina, exercicio_id: exercicio, posicao: 1 });
  inserir(banco, 'serie_planejada', {
    item_id: item,
    posicao: 1,
    meta_tipo: 'repeticoes',
    meta_minimo: 10,
  });
  return { ficha, versao, rotina, exercicio, item };
}

export function criarSessaoComSerie(banco: Banco, exercicio: string) {
  const sessao = inserir(banco, 'sessao', { inicio: AGORA, situacao: 'em_andamento' });
  const exercicioSessao = inserir(banco, 'exercicio_sessao', {
    sessao_id: sessao,
    exercicio_id: exercicio,
    posicao: 1,
  });
  const serie = inserir(banco, 'serie_executada', {
    exercicio_sessao_id: exercicioSessao,
    posicao: 1,
    tipo: 'trabalho',
    carga_gramas: 60000,
    repeticoes: 10,
    rir: 2,
    concluida_em: AGORA,
  });
  return { sessao, exercicioSessao, serie };
}

export const IDENTIFICADOR_INEXISTENTE = '00000000-0000-7000-8000-000000000000';
export { AGORA };

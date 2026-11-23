import { drizzle } from 'drizzle-orm/better-sqlite3';

import { RepositorioDeFichasSqlite } from '../../../src/adaptadores/sqlite/repositorio-de-fichas-sqlite';
import { ArquivarFicha } from '../../../src/aplicacao/casos-de-uso/arquivar-ficha';
import { ListarFichas } from '../../../src/aplicacao/casos-de-uso/listar-fichas';
import { Identificador } from '../../../src/dominio/identificador';
import { AGORA, abrirBancoMigrado, criarFichaComSerie, inserir } from '../../apoio/banco-sqlite';

// Ficha com versão e uma sessão registrada de ponta a ponta, no SQLite com as migrações reais.
function fichaComSessao() {
  const banco = abrirBancoMigrado();
  const { ficha, versao, exercicio } = criarFichaComSerie(banco);
  const sessao = inserir(banco, 'sessao', {
    inicio: AGORA,
    situacao: 'concluida',
    ficha_id: ficha,
    versao_id: versao,
  });
  const exercicioSessao = inserir(banco, 'exercicio_sessao', {
    sessao_id: sessao,
    exercicio_id: exercicio,
    posicao: 1,
  });
  inserir(banco, 'serie_executada', {
    exercicio_sessao_id: exercicioSessao,
    posicao: 1,
    tipo: 'trabalho',
    carga_gramas: 60000,
    repeticoes: 10,
    concluida_em: AGORA,
  });
  return { banco, ficha, sessao };
}

const contar = (banco: ReturnType<typeof abrirBancoMigrado>, tabela: string) =>
  (banco.prepare(`SELECT COUNT(*) AS total FROM ${tabela}`).get() as { total: number }).total;

describe('arquivar uma ficha com sessões, no SQLite (US-009a, RB04, FI-4)', () => {
  it('a ficha some das escolhas e as versões e as sessões continuam no histórico', async () => {
    const { banco, ficha, sessao } = fichaComSessao();
    const repositorio = new RepositorioDeFichasSqlite(drizzle(banco));

    await new ArquivarFicha(repositorio).executar(Identificador.de(ficha));

    expect(await new ListarFichas(repositorio).executar()).toEqual([]);
    const linha = banco.prepare('SELECT situacao FROM ficha WHERE id = ?').get(ficha);
    expect(linha).toEqual({ situacao: 'arquivada' });
    expect(contar(banco, 'versao_ficha')).toBe(1);
    expect(contar(banco, 'sessao')).toBe(1);
    expect(contar(banco, 'serie_executada')).toBe(1);
    const sessaoGuardada = banco.prepare('SELECT ficha_id FROM sessao WHERE id = ?').get(sessao);
    expect(sessaoGuardada).toEqual({ ficha_id: ficha });
  });

  it('ativar uma ficha troca a ativa no SQLite sem ferir o índice de uma só ativa', async () => {
    const { banco, ficha } = fichaComSessao();
    const outra = inserir(banco, 'ficha', {
      nome: 'Outra',
      situacao: 'inativa',
      origem: 'manual',
      criada_em: AGORA,
    });
    const repositorio = new RepositorioDeFichasSqlite(drizzle(banco));

    await repositorio.ativarFicha(Identificador.de(outra));

    const situacoes = banco.prepare('SELECT id, situacao FROM ficha ORDER BY rowid').all();
    expect(situacoes).toEqual([
      { id: ficha, situacao: 'inativa' },
      { id: outra, situacao: 'ativa' },
    ]);
  });
});

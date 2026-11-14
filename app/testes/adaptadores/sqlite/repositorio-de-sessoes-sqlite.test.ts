import { drizzle } from 'drizzle-orm/better-sqlite3';

import { RepositorioDeFichasSqlite } from '../../../src/adaptadores/sqlite/repositorio-de-fichas-sqlite';
import { RepositorioDeSessoesSqlite } from '../../../src/adaptadores/sqlite/repositorio-de-sessoes-sqlite';
import { Identificador } from '../../../src/dominio/identificador';
import { InstanteUtc } from '../../../src/dominio/instante-utc';
import { FabricaDeFichas } from '../../apoio/ficha-de-exemplo';
import { abrirBancoMigrado, inserir } from '../../apoio/banco-sqlite';
import { FabricaDeSessoes } from '../../apoio/sessao-de-exemplo';

// Colunas de valores informados pelo usuário; classificação, contagens, recordes e 1RM nunca
// viram coluna (seção 18.6). Se alguém acrescentar uma coluna derivada, este teste reprova.
const COLUNAS_INFORMADAS = [
  'id',
  'exercicio_sessao_id',
  'posicao',
  'tipo',
  'carga_gramas',
  'repeticoes',
  'repeticoes_outro_lado',
  'segundos',
  'segundos_outro_lado',
  'rir',
  'tecnica',
  'concluida_em',
  'removida_em',
];

describe('RepositorioDeSessoesSqlite: série corrigida sem valor derivado gravado', () => {
  async function corrigirUmaSerie() {
    const banco = abrirBancoMigrado();
    const exercicioId = Identificador.de(
      inserir(banco, 'exercicio', { nome: 'Supino Reto', situacao: 'ativo', origem: 'inicial' }),
    );
    const bancoDrizzle = drizzle(banco);
    const fichas = new RepositorioDeFichasSqlite(bancoDrizzle);
    const sessoes = new RepositorioDeSessoesSqlite(bancoDrizzle);
    const fabricaDeFichas = new FabricaDeFichas(exercicioId);
    const ficha = fabricaDeFichas.ficha();
    const versao = await fichas.criarFicha(
      ficha,
      fabricaDeFichas.versao({ series: 1, cargaEmQuilos: 60 }),
    );
    const fabrica = new FabricaDeSessoes(exercicioId);
    const sessao = fabrica.sessao({
      fichaId: ficha.id,
      versaoId: versao.id,
      rotinaId: versao.rotinas[0].id,
    });
    const exercicio = fabrica.exercicio();
    const original = fabrica.serie({ cargaEmQuilos: 60, repeticoes: 10, rir: 3 });
    const corrigida = fabrica.serie({ cargaEmQuilos: 62.5, repeticoes: 8, rir: 3 });
    await sessoes.iniciarSessao(sessao);
    await sessoes.adicionarExercicio(sessao.id, exercicio);
    await sessoes.registrarSerie(exercicio.id, original);
    await sessoes.corrigirSerie(original.id, corrigida, InstanteUtc.de('2026-11-12T09:10:00.000Z'));
    return { banco, original, corrigida };
  }

  it('a tabela de séries guarda só colunas de valores informados', async () => {
    const { banco } = await corrigirUmaSerie();
    const colunas = banco.pragma('table_info(serie_executada)') as { name: string }[];
    expect(colunas.map((c) => c.name).sort()).toEqual([...COLUNAS_INFORMADAS].sort());
  });

  it('a série original continua na linha, com os mesmos valores e só a marca de removida', async () => {
    const { banco, original } = await corrigirUmaSerie();
    const linha = banco
      .prepare('SELECT * FROM serie_executada WHERE id = ?')
      .get(original.id.valor) as Record<string, unknown>;
    expect(linha).toMatchObject({
      carga_gramas: 60000,
      repeticoes: 10,
      rir: 3,
      removida_em: '2026-11-12T09:10:00.000Z',
    });
    expect(banco.prepare('SELECT COUNT(*) AS n FROM serie_executada').get()).toEqual({ n: 2 });
  });
});

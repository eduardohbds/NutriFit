import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'fs';
import path from 'path';

import { RepositorioDeFichasSqlite } from '../../../src/adaptadores/sqlite/repositorio-de-fichas-sqlite';
import { RepositorioDeSessoesSqlite } from '../../../src/adaptadores/sqlite/repositorio-de-sessoes-sqlite';
import { RegistrarFalha } from '../../../src/aplicacao/casos-de-uso/registrar-falha';
import { RegistrarSerie } from '../../../src/aplicacao/casos-de-uso/registrar-serie';
import { Identificador } from '../../../src/dominio/identificador';
import { FabricaDeFichas } from '../../apoio/ficha-de-exemplo';
import {
  criarPastaTemporaria,
  pastaDeMigracoesDeProducao,
} from '../../apoio/banco-sqlite-em-arquivo';
import { inserir } from '../../apoio/banco-sqlite';
import { FabricaDeSessoes } from '../../apoio/sessao-de-exemplo';
import { RegistroDeFalhasEmMemoria } from '../../dubles/registro-de-falhas-em-memoria';
import { RelogioFixo } from '../../dubles/relogio-fixo';

// Banco real em arquivo, configurado como em produção (ConfigurarConexao): WAL, sincronização
// completa e chaves estrangeiras. Tem uma sessão com um exercício, pronta para receber séries.
async function prepararBancoEmArquivo() {
  const pasta = criarPastaTemporaria();
  const caminho = path.join(pasta, 'nutrifit.db');
  const banco = new Database(caminho);
  banco.pragma('journal_mode = wal');
  banco.pragma('synchronous = 2');
  banco.pragma('foreign_keys = ON');
  migrate(drizzle(banco), { migrationsFolder: pastaDeMigracoesDeProducao });
  const exercicioId = Identificador.de(
    inserir(banco, 'exercicio', { nome: 'Supino Reto', situacao: 'ativo', origem: 'inicial' }),
  );
  const bancoDrizzle = drizzle(banco);
  const sessoes = new RepositorioDeSessoesSqlite(bancoDrizzle);
  const fabricaDeFichas = new FabricaDeFichas(exercicioId);
  const ficha = fabricaDeFichas.ficha();
  const versao = await new RepositorioDeFichasSqlite(bancoDrizzle).criarFicha(
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
  await sessoes.iniciarSessao(sessao);
  await sessoes.adicionarExercicio(sessao.id, exercicio);
  const registro = new RegistroDeFalhasEmMemoria();
  const registrarSerie = new RegistrarSerie(
    sessoes,
    new RegistrarFalha(registro, new RelogioFixo(), '0.0.1'),
  );
  return { pasta, caminho, banco, sessoes, sessao, exercicio, fabrica, registrarSerie, registro };
}

function contarSeries(banco: Database.Database): number {
  return (banco.prepare('SELECT COUNT(*) AS n FROM serie_executada').get() as { n: number }).n;
}

describe('gravação durável da série em arquivo SQLite real (RNF08, CE61)', () => {
  it('a série confirmada está no disco quando o processo é encerrado logo depois, sem fechar o banco', async () => {
    const { pasta, caminho, sessao, exercicio, fabrica, registrarSerie } =
      await prepararBancoEmArquivo();
    const serie = fabrica.serie({ cargaEmQuilos: 60, repeticoes: 10, rir: 3 });

    await registrarSerie.executar({ exercicioDaSessaoId: exercicio.id, serie });

    // Imagem do disco no instante do encerramento: o arquivo principal e o -wal, sem checkpoint
    // nem fechamento. O banco original segue aberto, como um processo que morreu sem se despedir.
    const copia = path.join(pasta, 'depois-do-encerramento.db');
    fs.copyFileSync(caminho, copia);
    fs.copyFileSync(`${caminho}-wal`, `${copia}-wal`);
    const reaberto = new Database(copia);
    const guardada = await new RepositorioDeSessoesSqlite(drizzle(reaberto)).buscarSessao(
      sessao.id,
    );
    reaberto.close();

    expect(guardada?.exercicios[0].series).toEqual([serie]);
  });

  it('com o disco cheio, nada é gravado pela metade e a mesma série grava ao tentar de novo', async () => {
    const { banco, exercicio, fabrica, registrarSerie, registro } = await prepararBancoEmArquivo();
    // Uma técnica enorme exige páginas novas: com o limite no tamanho atual, o SQLite recusa (SQLITE_FULL).
    const serie = {
      ...fabrica.serie({ cargaEmQuilos: 60, repeticoes: 10, rir: 3 }),
      tecnica: 'x'.repeat(200_000),
    };
    const paginas = banco.pragma('page_count', { simple: true }) as number;
    banco.pragma(`max_page_count = ${paginas}`);

    const resultado = await registrarSerie.executar({ exercicioDaSessaoId: exercicio.id, serie });

    expect(resultado).toEqual({ gravada: false, motivo: 'sem_espaco' });
    expect(contarSeries(banco)).toBe(0);
    expect((await registro.lerLinhas()).map((l) => JSON.parse(l).codigo)).toEqual(['SEM_ESPACO']);

    banco.pragma('max_page_count = 1000000');
    expect(await registrarSerie.executar({ exercicioDaSessaoId: exercicio.id, serie })).toEqual({
      gravada: true,
    });
    expect(contarSeries(banco)).toBe(1);
  });
});

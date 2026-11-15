import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { RepositorioDoCatalogoSqlite } from '../../../src/adaptadores/sqlite/repositorio-do-catalogo-sqlite';
import { CATALOGO_INICIAL, ITENS_DA_FICHA_DT01 } from '../../casos-de-referencia/catalogo-inicial';
import { abrirBancoMigrado, criarSessaoComSerie, inserir } from '../../apoio/banco-sqlite';

const pastaDeProducao = path.resolve(__dirname, '../../../drizzle');

async function lerCatalogo(banco: ReturnType<typeof abrirBancoMigrado>) {
  return new RepositorioDoCatalogoSqlite(drizzle(banco)).listarExercicios();
}

describe('catálogo inicial gravado pela migração (seção 18.4)', () => {
  it('banco recém-migrado traz cada exercício da tabela com os grupos diretos e indiretos dela', async () => {
    const catalogo = await lerCatalogo(abrirBancoMigrado());
    const porNome = new Map(catalogo.map((e) => [e.nome, e]));

    for (const esperado of CATALOGO_INICIAL) {
      const lido = porNome.get(esperado.nome);
      expect({ nome: esperado.nome, existe: lido !== undefined }).toEqual({
        nome: esperado.nome,
        existe: true,
      });
      expect([...lido!.gruposDiretos].sort()).toEqual([...esperado.gruposDiretos].sort());
      expect([...lido!.gruposIndiretos].sort()).toEqual([...esperado.gruposIndiretos].sort());
      expect(lido!.unilateral).toBe(esperado.unilateral);
      expect(lido!.origem).toBe('inicial');
      expect(lido!.situacao).toBe('ativo');
    }
  });

  it('o supino reto tem peitoral direto e tríceps e ombro anterior indiretos; a remada curvada, costas e bíceps', async () => {
    const catalogo = await lerCatalogo(abrirBancoMigrado());
    const supino = catalogo.find((e) => e.nome === 'Supino Reto');
    const remada = catalogo.find((e) => e.nome === 'Remada Curvada');

    expect(supino?.gruposDiretos).toEqual(['Peitoral']);
    expect([...(supino?.gruposIndiretos ?? [])].sort()).toEqual(['Ombro anterior', 'Tríceps']);
    expect(remada?.gruposDiretos).toEqual(['Costas']);
    expect(remada?.gruposIndiretos).toEqual(['Bíceps']);
  });

  it('os 30 itens da ficha de referência (DT01) existem no catálogo ou têm equivalente (SL04)', async () => {
    const catalogo = await lerCatalogo(abrirBancoMigrado());
    const nomes = new Set(catalogo.map((e) => e.nome));

    expect(ITENS_DA_FICHA_DT01).toHaveLength(30);
    const faltando = ITENS_DA_FICHA_DT01.filter(
      (item) => !item.equivalentes.every((nome) => nomes.has(nome)),
    ).map((item) => item.nome);
    expect(faltando).toEqual([]);
  });

  it('a Rosca de Punho Inversa tem o sinônimo Reverse Wrist Curl, e Corrida e Esteira não têm grupos', async () => {
    const catalogo = await lerCatalogo(abrirBancoMigrado());

    expect(catalogo.find((e) => e.nome === 'Rosca de Punho Inversa')?.sinonimos).toEqual([
      'Reverse Wrist Curl',
    ]);
    for (const cardio of ['Corrida', 'Esteira']) {
      const e = catalogo.find((x) => x.nome === cardio);
      expect([e?.gruposDiretos, e?.gruposIndiretos]).toEqual([[], []]);
    }
  });

  it('todo aparelho recebe os mesmos identificadores, o que mantém backup e restauração coerentes', async () => {
    const ids = async () => (await lerCatalogo(abrirBancoMigrado())).map((e) => e.id.valor).sort();

    expect(await ids()).toEqual(await ids());
    expect((await ids()).length).toBe(CATALOGO_INICIAL.length);
  });

  it('banco da versão anterior com dados: a migração só acrescenta o catálogo e não altera nada', async () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'nutrifit-cat-'));
    try {
      // Pasta de migrações só até a 0001 (grupos), como num aparelho da v0.0.4.
      const anterior = path.join(pasta, 'anterior');
      fs.cpSync(pastaDeProducao, anterior, { recursive: true });
      const jornalCaminho = path.join(anterior, 'meta/_journal.json');
      const jornal = JSON.parse(fs.readFileSync(jornalCaminho, 'utf8'));
      jornal.entries = jornal.entries.slice(0, 2);
      fs.writeFileSync(jornalCaminho, JSON.stringify(jornal));

      const banco = new Database(':memory:');
      banco.pragma('foreign_keys = ON');
      migrate(drizzle(banco), { migrationsFolder: anterior });
      const proprio = inserir(banco, 'exercicio', {
        nome: 'Supino Reto',
        situacao: 'ativo',
        origem: 'usuario',
      });
      const { serie } = criarSessaoComSerie(banco, proprio);
      const antes = banco.prepare('SELECT * FROM serie_executada').all();

      migrate(drizzle(banco), { migrationsFolder: pastaDeProducao });

      expect(banco.prepare('SELECT * FROM serie_executada').all()).toEqual(antes);
      expect(banco.prepare('SELECT origem FROM exercicio WHERE id = ?').get(proprio)).toEqual({
        origem: 'usuario',
      });
      expect(serie).toBeDefined();
      expect((banco.prepare('SELECT COUNT(*) AS n FROM exercicio').get() as { n: number }).n).toBe(
        CATALOGO_INICIAL.length + 1,
      );
    } finally {
      fs.rmSync(pasta, { recursive: true, force: true });
    }
  });
});

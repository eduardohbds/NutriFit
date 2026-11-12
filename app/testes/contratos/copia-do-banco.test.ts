import fs from 'fs';
import path from 'path';

import { CopiaDoBancoEmArquivo } from '../../src/adaptadores/sistema/copia-do-banco-em-arquivo';
import { CopiaDoBancoEmDisco, criarPastaTemporaria } from '../apoio/banco-sqlite-em-arquivo';
import { arquivosEmMemoria } from '../apoio/expo-file-system-em-memoria';
import { BancoEmMemoria } from '../dubles/banco-em-memoria';
import { contratoDaCopiaDoBanco } from './copia-do-banco.contrato';

jest.mock('expo-file-system', () => require('../apoio/expo-file-system-em-memoria'));

beforeEach(() => {
  arquivosEmMemoria.clear();
  arquivosEmMemoria.set('file:///documentos/SQLite/nutrifit.db', 'inicial');
});

contratoDaCopiaDoBanco('falso em memória', async () => {
  const banco = new BancoEmMemoria();
  return {
    copia: banco.copia,
    lerBanco: async () => banco.conteudo,
    gravarBanco: async (conteudo) => {
      banco.conteudo = conteudo;
    },
  };
});

contratoDaCopiaDoBanco('cópia em disco (apoio dos testes de SQLite)', async () => {
  const pasta = criarPastaTemporaria();
  const caminho = path.join(pasta, 'nutrifit.db');
  fs.writeFileSync(caminho, 'inicial');
  return {
    copia: new CopiaDoBancoEmDisco(caminho, path.join(pasta, 'copia.db')),
    lerBanco: async () => fs.readFileSync(caminho, 'utf8'),
    gravarBanco: async (conteudo) => fs.writeFileSync(caminho, conteudo),
  };
});

const BANCO = 'file:///documentos/SQLite/nutrifit.db';
contratoDaCopiaDoBanco('expo-file-system', async () => ({
  copia: new CopiaDoBancoEmArquivo('nutrifit.db'),
  lerBanco: async () => arquivosEmMemoria.get(BANCO) ?? '',
  gravarBanco: async (conteudo) => {
    arquivosEmMemoria.set(BANCO, conteudo);
  },
}));

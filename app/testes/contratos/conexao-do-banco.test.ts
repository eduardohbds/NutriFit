import path from 'path';

import { ConexaoDoBancoSqlite, criarPastaTemporaria } from '../apoio/banco-sqlite-em-arquivo';
import { ConexaoEmMemoria } from '../dubles/conexao-em-memoria';
import { contratoDaConexaoDoBanco } from './conexao-do-banco.contrato';

// O falso não persiste o modo entre aberturas por si só; guarda-o no mapa, que sobrevive ao fechar.
contratoDaConexaoDoBanco('falso em memória', () => new ConexaoEmMemoria());
contratoDaConexaoDoBanco(
  'SQLite real em arquivo (better-sqlite3)',
  () => new ConexaoDoBancoSqlite(path.join(criarPastaTemporaria(), 'nutrifit.db')),
);

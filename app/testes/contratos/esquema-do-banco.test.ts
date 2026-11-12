import path from 'path';

import {
  criarPastaTemporaria,
  EsquemaDoBancoSqlite,
  pastaDeMigracoesDeProducao,
} from '../apoio/banco-sqlite-em-arquivo';
import { BancoEmMemoria } from '../dubles/banco-em-memoria';
import { contratoDoEsquemaDoBanco } from './esquema-do-banco.contrato';

contratoDoEsquemaDoBanco('falso em memória', () => new BancoEmMemoria().esquema);
contratoDoEsquemaDoBanco(
  'SQLite real em arquivo (better-sqlite3)',
  () =>
    new EsquemaDoBancoSqlite(
      path.join(criarPastaTemporaria(), 'nutrifit.db'),
      pastaDeMigracoesDeProducao,
    ),
);

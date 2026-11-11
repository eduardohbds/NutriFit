import { GeradorUuidV7 } from '../../src/adaptadores/sistema/gerador-uuid-v7';
import { GeradorDeIdentificadorSequencial } from '../dubles/gerador-de-identificador-sequencial';
import { contratoDoGeradorDeIdentificador } from './gerador-de-identificador.contrato';

contratoDoGeradorDeIdentificador('falso sequencial', () => new GeradorDeIdentificadorSequencial());
contratoDoGeradorDeIdentificador('UUID v7 do sistema', () => new GeradorUuidV7());

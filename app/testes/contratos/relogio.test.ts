import { RelogioDoSistema } from '../../src/adaptadores/sistema/relogio-do-sistema';
import { RelogioFixo } from '../dubles/relogio-fixo';
import { contratoDoRelogio } from './relogio.contrato';

contratoDoRelogio('relógio fixo', () => new RelogioFixo());
contratoDoRelogio('relógio do sistema', () => new RelogioDoSistema());

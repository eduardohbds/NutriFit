import { RegistroDeFalhasEmArquivo } from '../../src/adaptadores/sistema/registro-de-falhas-em-arquivo';
import { EventoDeFalha } from '../../src/dominio/evento-de-falha';
import { InstanteUtc } from '../../src/dominio/instante-utc';
import { arquivosEmMemoria } from '../apoio/expo-file-system-em-memoria';

jest.mock('expo-file-system', () => require('../apoio/expo-file-system-em-memoria'));

const ARQUIVO = 'file:///documentos/registro-de-falhas.jsonl';

describe('RegistroDeFalhasEmArquivo', () => {
  beforeEach(() => arquivosEmMemoria.clear());

  it('acrescenta uma linha JSON por falha num arquivo próprio, fora do banco e do backup', async () => {
    const evento = EventoDeFalha.criar({
      quando: InstanteUtc.de('2026-11-10T16:45:00.000Z'),
      nivel: 'erro',
      onde: 'Backup',
      codigo: 'BACKUP_SEM_REDE',
      versaoApp: '0.0.1',
    });
    await new RegistroDeFalhasEmArquivo().registrar(evento);
    await new RegistroDeFalhasEmArquivo().registrar(evento);
    expect(arquivosEmMemoria.get(ARQUIVO)).toBe(`${evento.paraJson()}\n${evento.paraJson()}\n`);
  });
});

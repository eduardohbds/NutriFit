import { RegistroDeFalhasEmArquivo } from '../../src/adaptadores/sistema/registro-de-falhas-em-arquivo';
import { arquivosEmMemoria } from '../apoio/expo-file-system-em-memoria';
import { RegistroDeFalhasEmMemoria } from '../dubles/registro-de-falhas-em-memoria';
import { contratoDoRegistroDeFalhas } from './registro-de-falhas.contrato';

jest.mock('expo-file-system', () => require('../apoio/expo-file-system-em-memoria'));

beforeEach(() => arquivosEmMemoria.clear());

contratoDoRegistroDeFalhas('falso em memória', () => new RegistroDeFalhasEmMemoria());
contratoDoRegistroDeFalhas('arquivo JSON Lines', () => new RegistroDeFalhasEmArquivo());

// Único lugar que conhece todos os adaptadores e os liga às portas (AGENTS.md seção 3).
import Constants from 'expo-constants';

import { ConexaoDoBancoExpo } from '../adaptadores/sqlite/conexao-do-banco-expo';
import { EsquemaDoBancoExpo } from '../adaptadores/sqlite/esquema-do-banco-expo';
import { CopiaDoBancoEmArquivo } from '../adaptadores/sistema/copia-do-banco-em-arquivo';
import { RegistroDeFalhasEmArquivo } from '../adaptadores/sistema/registro-de-falhas-em-arquivo';
import { RelogioDoSistema } from '../adaptadores/sistema/relogio-do-sistema';
import { AbrirBanco } from '../aplicacao/casos-de-uso/abrir-banco';
import { ConfigurarConexao } from '../aplicacao/casos-de-uso/configurar-conexao';
import { MigrarBanco } from '../aplicacao/casos-de-uso/migrar-banco';
import { RegistrarFalha } from '../aplicacao/casos-de-uso/registrar-falha';

const versaoApp = Constants.expoConfig?.version ?? '0.0.0';
const NOME_DO_BANCO = 'nutrifit.db';

export const registrarFalha = new RegistrarFalha(
  new RegistroDeFalhasEmArquivo(),
  new RelogioDoSistema(),
  versaoApp,
);

const conexao = new ConexaoDoBancoExpo(NOME_DO_BANCO);
const migrarBanco = new MigrarBanco(
  new CopiaDoBancoEmArquivo(NOME_DO_BANCO),
  new EsquemaDoBancoExpo(NOME_DO_BANCO),
  registrarFalha,
);

export const abrirBanco = new AbrirBanco(conexao, migrarBanco, new ConfigurarConexao(conexao));
